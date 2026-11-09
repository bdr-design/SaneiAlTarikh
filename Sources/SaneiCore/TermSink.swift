// «لماذا؟»: every derived value is written once, as a function that adds its terms into a sink (R9, §2.3). The
// simulation passes a sink that only sums; the «لماذا؟» sheet passes one that keeps the terms. The same function gives
// both, so the explanation can never drift from the value. Neither sink allocates. A sink is typed by the value it
// explains (a number, or money in one unit), so terms of different units cannot be added into one sheet. stdlib only.

/// The stable number of a term (a row of a «لماذا؟» sheet). Stored in saves (the campaign log): never renumbered.
@frozen
public struct TermID: Sendable, Hashable {
    public var raw: UInt16
    @inlinable public init(raw: UInt16) { self.raw = raw }
    /// «أخرى»: what the terms past the twelfth add up to.
    @inlinable public static var other: TermID { TermID(raw: .max) }
}

/// A value a «لماذا؟» sheet can explain: a number (`Q32`) or an amount of money in one unit. One Int64 that adds with
/// clamping. Money needs its own unit here: a country's revenue in units of $1,000 does not fit in a `Q32`.
public protocol TermValue: Sendable, Equatable {
    var raw: Int64 { get }
    init(raw: Int64)
    static func + (a: Self, b: Self) -> Self
}

extension Q32: TermValue {}
extension LCU: TermValue {}
extension USDn: TermValue {}
extension Money: TermValue {}

public protocol TermSink {
    associatedtype Value: TermValue
    mutating func add(_ id: TermID, _ value: Value)
}

/// The simulation's sink: the total and nothing else.
@frozen
public struct SumSink<Value: TermValue>: TermSink, Sendable {
    public var total: Value
    @inlinable public init() { total = Value(raw: 0) }
    @inlinable public mutating func add(_ id: TermID, _ value: Value) { total = total + value }
}

/// The «لماذا؟» sink: the first twelve terms, held inline, and the total. A thirteenth term and those after it fold
/// into one «أخرى» amount, so the total always equals what `SumSink` gives for the same value.
@frozen
public struct TermBuffer12<Value: TermValue>: TermSink, Sendable {
    public typealias IDs = (UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16)
    public typealias Raws = (Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64)

    public var ids: IDs
    public var raws: Raws
    /// How many of the twelve slots are used.
    public var count: UInt8
    /// The sum of the terms that did not get a slot.
    public var other: Value
    /// True once a term has been folded into `other`.
    public var hasOther: Bool
    public var total: Value

    public init() {
        ids = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        raws = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        count = 0
        other = Value(raw: 0)
        hasOther = false
        total = Value(raw: 0)
    }

    public mutating func add(_ id: TermID, _ value: Value) {
        total = total + value
        if count < 12 {
            let slot = Int(count)
            let raw = value.raw
            withUnsafeMutableBytes(of: &ids) { $0.storeBytes(of: id.raw, toByteOffset: slot * 2, as: UInt16.self) }
            withUnsafeMutableBytes(of: &raws) { $0.storeBytes(of: raw, toByteOffset: slot * 8, as: Int64.self) }
            count += 1
        } else {
            other = other + value
            hasOther = true
        }
    }

    /// The term in a slot (0..<count), in the order the terms were added; nil past the last one.
    public func term(_ slot: Int) -> (id: TermID, value: Value)? {
        guard slot >= 0, slot < Int(count) else { return nil }
        let id = withUnsafeBytes(of: ids) { $0.load(fromByteOffset: slot * 2, as: UInt16.self) }
        let raw = withUnsafeBytes(of: raws) { $0.load(fromByteOffset: slot * 8, as: Int64.self) }
        return (TermID(raw: id), Value(raw: raw))
    }

    /// The rows a sheet shows: the kept terms, then «أخرى» when anything was folded.
    public var rowCount: Int { Int(count) + (hasOther ? 1 : 0) }

    public func row(_ i: Int) -> (id: TermID, value: Value)? {
        if let t = term(i) { return t }
        return hasOther && i == Int(count) ? (TermID.other, other) : nil
    }
}
