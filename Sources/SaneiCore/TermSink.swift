// «لماذا؟»: every derived value is written once, as a function that adds its terms into a sink (R9, §2.3). The
// simulation passes a sink that only sums; the «لماذا؟» sheet passes one that keeps the terms. The same function gives
// both, so the explanation can never drift from the value. Neither sink allocates. stdlib only.

/// The stable number of a term (a row of a «لماذا؟» sheet). Stored in saves (the campaign log): never renumbered.
@frozen
public struct TermID: Sendable, Hashable {
    public var raw: UInt16
    @inlinable public init(raw: UInt16) { self.raw = raw }
    /// «أخرى»: what the terms past the twelfth add up to.
    @inlinable public static var other: TermID { TermID(raw: .max) }
}

public protocol TermSink {
    mutating func add(_ id: TermID, _ value: Q32)
}

/// The simulation's sink: the total and nothing else.
@frozen
public struct SumSink: TermSink, Sendable {
    public var total: Q32
    @inlinable public init() { total = .zero }
    @inlinable public mutating func add(_ id: TermID, _ value: Q32) { total += value }
}

/// The «لماذا؟» sink: the first twelve terms, held inline, and the total. A thirteenth term and those after it fold
/// into one «أخرى» amount, so the total always equals what `SumSink` gives for the same value.
@frozen
public struct TermBuffer12: TermSink, Sendable {
    public typealias IDs = (UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16)
    public typealias Values = (Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64)

    public var ids: IDs
    public var values: Values
    /// How many of the twelve slots are used.
    public var count: UInt8
    /// The sum of the terms that did not get a slot.
    public var other: Q32
    /// True once a term has been folded into `other`.
    public var hasOther: Bool
    public var total: Q32

    public init() {
        ids = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        values = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        count = 0
        other = .zero
        hasOther = false
        total = .zero
    }

    public mutating func add(_ id: TermID, _ value: Q32) {
        total += value
        if count < 12 {
            let slot = Int(count)
            withUnsafeMutableBytes(of: &ids) { $0.storeBytes(of: id.raw, toByteOffset: slot * 2, as: UInt16.self) }
            withUnsafeMutableBytes(of: &values) { $0.storeBytes(of: value.raw, toByteOffset: slot * 8, as: Int64.self) }
            count += 1
        } else {
            other += value
            hasOther = true
        }
    }

    /// The term in a slot (0..<count), in the order the terms were added; nil past the last one.
    public func term(_ slot: Int) -> (id: TermID, value: Q32)? {
        guard slot >= 0, slot < Int(count) else { return nil }
        let id = withUnsafeBytes(of: ids) { $0.load(fromByteOffset: slot * 2, as: UInt16.self) }
        let value = withUnsafeBytes(of: values) { $0.load(fromByteOffset: slot * 8, as: Int64.self) }
        return (TermID(raw: id), Q32(raw: value))
    }

    /// The rows a sheet shows: the kept terms, then «أخرى» when anything was folded.
    public var rowCount: Int { Int(count) + (hasOther ? 1 : 0) }

    public func row(_ i: Int) -> (id: TermID, value: Q32)? {
        if let t = term(i) { return t }
        return hasOther && i == Int(count) ? (TermID.other, other) : nil
    }
}
