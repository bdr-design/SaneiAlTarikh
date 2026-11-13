// «لماذا؟»: every derived value is written once, as a function that adds its terms into a sink (R9, §2.3). The
// simulation passes a sink that only sums; the «لماذا؟» sheet passes one that keeps the terms. The same function
// gives both, so the two totals are the same additions in the same order and can never drift apart. Neither sink
// allocates. A sink is typed by the value it explains (a number, or money in one unit), so terms of different units
// cannot be added into one sheet. stdlib only.

/// The stable number of a term (a row of a «لماذا؟» sheet). Stored in saves (the campaign log): never renumbered.
/// A value function gives each of its terms a number of its own and adds each term once: a cause summed over
/// neighbours is added as one term, its sum. 65,535 is reserved for «أخرى»: no real term uses it.
@frozen
public struct TermID: Sendable, Hashable {
    public var raw: UInt16
    @inlinable public init(raw: UInt16) { self.raw = raw }
    /// «أخرى»: the terms a sheet has no row for, as one amount. Always 65,535.
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

/// Where a value function puts its terms. The total is the terms added in the order given, clamped and counted like
/// any other sum, so the order is part of the function.
public protocol TermSink {
    associatedtype Value: TermValue

    /// The value's starting level, when it has one (a stability target starts from a level and the causes move it).
    /// Given first and once. A sheet always shows it, first, whatever its size.
    mutating func base(_ id: TermID, _ value: Value)

    /// One cause: what it adds to the value, or takes from it.
    mutating func add(_ id: TermID, _ value: Value)
}

/// The simulation's sink: the total and nothing else.
@frozen
public struct SumSink<Value: TermValue>: TermSink, Sendable {
    public var total: Value
    @inlinable public init() { total = Value(raw: 0) }
    @inlinable public mutating func base(_ id: TermID, _ value: Value) { total = total + value }
    @inlinable public mutating func add(_ id: TermID, _ value: Value) { total = total + value }
}

/// The «لماذا؟» sink: at most twelve rows, held inline, and the total. The total always equals what `SumSink` gives
/// for the same value function, and counts the same clamps.
///
/// What a sheet shows (screen 17):
/// - A term of exactly 0 takes no row: it neither raises nor lowers.
/// - Up to twelve rows are kept as they are, in the order they were added, the starting level first.
/// - With more than twelve, eleven rows are kept and the rest are one row, «أخرى». The kept ones are the starting
///   level and the largest terms by size; of two terms of one size, the one with the lower `TermID` is kept. So what
///   is shown does not depend on the order the terms were added in.
/// - «أخرى» is a row whenever a term was left out, also when those terms cancel to 0: the sheet never hides that
///   something was left out.
/// - While nothing clamps, the rows add up to the total exactly. Past the range of an Int64 they cannot: the total
///   clamps as the simulation's does, and «أخرى» clamps by itself, without counting.
@frozen
public struct TermBuffer12<Value: TermValue>: TermSink, Sendable {
    public typealias IDs = (UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16, UInt16)
    public typealias Raws = (Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64, Int64)

    // the 8-byte fields first, so no room is lost between them: 144 bytes for a value of 8
    @usableFromInline var raws: Raws
    @usableFromInline var otherRaw: Int64
    @usableFromInline var sum: Value
    @usableFromInline var ids: IDs
    /// How many of the twelve slots are used: never above 12, and 11 once a term has been left out.
    @usableFromInline var used: UInt8
    /// 1 when slot 0 holds the starting level, which is never left out.
    @usableFromInline var pinned: UInt8
    /// True once a term has been left out into «أخرى».
    @usableFromInline var folded: Bool

    @inlinable
    public init() {
        raws = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        otherRaw = 0
        sum = Value(raw: 0)
        ids = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        used = 0
        pinned = 0
        folded = false
    }

    /// A sheet as a save holds it (the campaign log keeps each entry's «لماذا؟» as it was): the kept rows in order,
    /// whether the first is the starting level, the «أخرى» amount when terms were left out, and the total. Nil when it
    /// could not be a sheet this type makes: more than twelve rows, «أخرى» beside any number of rows but eleven, a
    /// starting level with no rows, a row numbered 65,535 (that is «أخرى»'s), or a cause of exactly 0 (it takes no row;
    /// a starting level of 0 does), or one term on two rows. The total is taken as saved, not checked against the rows:
    /// the additions may have clamped on the way, and then the rows do not add up to it.
    @inlinable
    public init?(saved rows: [(id: TermID, value: Value)], hasBase: Bool, other: Value?, total: Value) {
        guard rows.count <= 12, other == nil || rows.count == 11, !hasBase || !rows.isEmpty else { return nil }
        for (slot, row) in rows.enumerated() {
            if row.id == .other || (row.value.raw == 0 && !(hasBase && slot == 0)) { return nil }
            // a term once: a sheet never holds two rows of one term (the value function's contract)
            if rows[..<slot].contains(where: { $0.id == row.id }) { return nil }
        }
        self.init()
        for (slot, row) in rows.enumerated() { set(slot, id: row.id.raw, raw: row.value.raw) }
        used = UInt8(truncatingIfNeeded: rows.count)
        pinned = hasBase ? 1 : 0
        folded = other != nil
        otherRaw = other?.raw ?? 0
        sum = total
    }

    /// The kept rows, the starting level included: 0...12.
    @inlinable public var count: Int { Int(used) }
    /// True when the first row is the value's starting level.
    @inlinable public var hasBase: Bool { pinned != 0 }
    /// True once a term has been left out into «أخرى».
    @inlinable public var hasOther: Bool { folded }
    /// What the terms that were left out add up to (0 when none was).
    @inlinable public var other: Value { Value(raw: otherRaw) }
    /// The value: every term added in order, as `SumSink` adds them.
    @inlinable public var total: Value { sum }

    // The slots are two tuples read and written by position. Every caller keeps `slot` in 0..<12.
    @inlinable
    func id(at slot: Int) -> UInt16 {
        withUnsafeBytes(of: ids) { $0.load(fromByteOffset: slot * 2, as: UInt16.self) }
    }

    @inlinable
    func raw(at slot: Int) -> Int64 {
        withUnsafeBytes(of: raws) { $0.load(fromByteOffset: slot * 8, as: Int64.self) }
    }

    @inlinable
    mutating func set(_ slot: Int, id: UInt16, raw: Int64) {
        withUnsafeMutableBytes(of: &ids) { $0.storeBytes(of: id, toByteOffset: slot * 2, as: UInt16.self) }
        withUnsafeMutableBytes(of: &raws) { $0.storeBytes(of: raw, toByteOffset: slot * 8, as: Int64.self) }
    }

    /// Adds into «أخرى»: clamped, not counted. The simulation's sink has no such sum, so a clamp here must not raise
    /// the game's count.
    @inlinable
    mutating func leaveOut(_ raw: Int64) {
        let (v, overflow) = otherRaw.addingReportingOverflow(raw)
        otherRaw = overflow ? (otherRaw < 0 ? .min : .max) : v
        folded = true
    }

    /// The slot of the kept term that goes first when a row is needed: the smallest by size; of two of one size, the
    /// one with the higher number; of two with one number, the later. Never the starting level.
    @inlinable
    func smallestSlot() -> Int {
        var slot = Int(pinned)
        var size = raw(at: slot).magnitude
        var number = id(at: slot)
        var i = slot + 1
        while i < Int(used) {
            let s = raw(at: i).magnitude
            let n = id(at: i)
            if s < size || (s == size && n >= number) {
                slot = i
                size = s
                number = n
            }
            i += 1
        }
        return slot
    }

    /// Takes a slot's term out of the rows and into «أخرى»; the rows after it move up, so the order stays.
    @inlinable
    mutating func leaveOutSlot(_ slot: Int) {
        leaveOut(raw(at: slot))
        var i = slot
        while i + 1 < Int(used) {
            set(i, id: id(at: i + 1), raw: raw(at: i + 1))
            i += 1
        }
        used -= 1
    }

    @inlinable
    public mutating func base(_ id: TermID, _ value: Value) {
        precondition(id != .other, "65,535 is «أخرى»'s number: no term uses it")
        if used == 0 {
            sum = sum + value
            set(0, id: id.raw, raw: value.raw)
            used = 1
            pinned = 1
        } else {
            add(id, value)                                          // not given first: a term like any other
        }
    }

    @inlinable
    public mutating func add(_ id: TermID, _ value: Value) {
        precondition(id != .other, "65,535 is «أخرى»'s number: no term uses it")
        // a term once per value (the value function's contract; a saved sheet refuses one term on two rows), checked
        // in debug and test builds against the kept rows
        assert(!(0..<Int(used)).contains { self.id(at: $0) == id.raw }, "a term given twice to one sheet")
        sum = sum + value
        let raw = value.raw
        if raw == 0 { return }
        if !folded {
            if used < 12 {
                set(Int(used), id: id.raw, raw: raw)
                used += 1
                return
            }
            leaveOutSlot(smallestSlot())                            // a thirteenth term: eleven rows and «أخرى» from now on
        }
        // eleven rows are kept: the new term takes a row only if it outranks the smallest of them
        let slot = smallestSlot()
        let size = self.raw(at: slot).magnitude
        let number = self.id(at: slot)
        if raw.magnitude > size || (raw.magnitude == size && id.raw < number) {
            leaveOutSlot(slot)
            set(Int(used), id: id.raw, raw: raw)
            used += 1
        } else {
            leaveOut(raw)
        }
    }

    /// The kept row in a slot (0..<count), in the order the terms were added; nil outside.
    @inlinable
    public func term(_ slot: Int) -> (id: TermID, value: Value)? {
        guard slot >= 0, slot < Swift.min(Int(used), 12) else { return nil }
        return (TermID(raw: id(at: slot)), Value(raw: raw(at: slot)))
    }

    /// The rows a sheet shows: the kept rows, then «أخرى» when a term was left out. Never above 12.
    @inlinable public var rowCount: Int { Int(used) + (folded ? 1 : 0) }

    /// A row of the sheet (0..<rowCount): a kept row, or «أخرى» (`TermID.other`) as the last one; nil outside.
    @inlinable
    public func row(_ i: Int) -> (id: TermID, value: Value)? {
        if let t = term(i) { return t }
        return folded && i == Int(used) ? (TermID.other, other) : nil
    }
}
