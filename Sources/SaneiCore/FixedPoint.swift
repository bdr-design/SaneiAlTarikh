// The simulation's numbers (§2.3, L5): integers only. `Q32` is binary fixed point, `BP` a ratio in basis points, `LogQ`
// a level kept as a base-2 logarithm. Results round to the nearest value, ties away from zero, so that -(a * b) equals
// (-a) * b; a result outside the range is clamped and counted (Saturation). No division in a multiply. stdlib only.
// tools/checks/core_reference.py holds the same arithmetic a second time; its vectors lock every operation here.

/// The integer steps the fixed-point types share: full-width products and quotients on magnitudes, with the sign put
/// back at the end.
@usableFromInline
enum FixedMath {
    /// A magnitude and a sign as an Int64, clamped and counted.
    @inlinable
    static func clamp(_ m: UInt64, negative: Bool) -> Int64 {
        if negative {
            if m <= UInt64(1) << 63 { return Int64(truncatingIfNeeded: 0 &- m) }
            Saturation.record()
            return .min
        }
        if m <= UInt64(Int64.max) { return Int64(truncatingIfNeeded: m) }
        Saturation.record()
        return .max
    }

    /// A magnitude and a sign as an Int32, clamped and counted.
    @inlinable
    static func clamp32(_ m: UInt64, negative: Bool) -> Int32 {
        if negative {
            if m <= UInt64(1) << 31 { return Int32(truncatingIfNeeded: 0 &- m) }
            Saturation.record()
            return .min
        }
        if m <= UInt64(Int32.max) { return Int32(truncatingIfNeeded: m) }
        Saturation.record()
        return .max
    }

    @inlinable
    static func add(_ a: Int64, _ b: Int64) -> Int64 {
        let (v, overflow) = a.addingReportingOverflow(b)
        if !overflow { return v }
        Saturation.record()
        return a < 0 ? .min : .max
    }

    @inlinable
    static func subtract(_ a: Int64, _ b: Int64) -> Int64 {
        let (v, overflow) = a.subtractingReportingOverflow(b)
        if !overflow { return v }
        Saturation.record()
        return a < 0 ? .min : .max
    }

    @inlinable
    static func negate(_ a: Int64) -> Int64 {
        if a != .min { return -a }
        Saturation.record()
        return .max
    }

    /// x * y / 2^32.
    @inlinable
    static func mulShift32(_ x: Int64, _ y: Int64) -> Int64 {
        let p = x.magnitude.multipliedFullWidth(by: y.magnitude)
        let (low, carry) = p.low.addingReportingOverflow(UInt64(1) << 31)
        let high = carry ? p.high &+ 1 : p.high
        let negative = (x < 0) != (y < 0)
        if high >> 32 != 0 {
            Saturation.record()
            return negative ? .min : .max
        }
        return clamp((high << 32) | (low >> 32), negative: negative)
    }

    /// x * 2^32 / y. Dividing by zero is counted: 0 / 0 gives 0, anything else the end of the range on x's side.
    @inlinable
    static func divShift32(_ x: Int64, _ y: Int64) -> Int64 {
        if y == 0 {
            Saturation.record()
            return x == 0 ? 0 : (x < 0 ? .min : .max)
        }
        let mx = x.magnitude
        return divide(high: mx >> 32, low: mx << 32, by: y.magnitude, negative: (x < 0) != (y < 0))
    }

    /// (high * 2^64 + low) / d for d > 0, to the nearest whole; nil when that does not fit in 64 bits.
    @inlinable
    static func quotient(high: UInt64, low: UInt64, by d: UInt64) -> UInt64? {
        if high >= d { return nil }
        let (q, r) = d.dividingFullWidth((high: high, low: low))
        if r < d &- r { return q }
        let (up, overflow) = q.addingReportingOverflow(1)
        return overflow ? nil : up
    }

    /// (high * 2^64 + low) / d for d > 0, as an Int64.
    @inlinable
    static func divide(high: UInt64, low: UInt64, by d: UInt64, negative: Bool) -> Int64 {
        guard let q = quotient(high: high, low: low, by: d) else {
            Saturation.record()
            return negative ? .min : .max
        }
        return clamp(q, negative: negative)
    }
}

/// A number with 32 binary places in an Int64: about ±2.1 billion, in steps of 2^-32. Growth, productivity,
/// elasticities.
@frozen
public struct Q32: Sendable, Hashable, Comparable {
    public var raw: Int64

    @inlinable public init(raw: Int64) { self.raw = raw }

    /// A whole number.
    @inlinable
    public init(_ whole: Int64) {
        if whole > Int64(Int32.max) {
            Saturation.record()
            raw = .max
        } else if whole < Int64(Int32.min) {
            Saturation.record()
            raw = .min
        } else {
            raw = whole << 32
        }
    }

    /// The ratio of two whole numbers, n / d.
    @inlinable public init(ratio n: Int64, _ d: Int64) { raw = FixedMath.divShift32(n, d) }

    /// A ratio in basis points as a number (10,000 bp = 1).
    @inlinable
    public init(_ bp: BP) {
        let q = ((UInt64(bp.raw.magnitude) << 32) + 5_000) / 10_000
        raw = bp.raw < 0 ? -Int64(truncatingIfNeeded: q) : Int64(truncatingIfNeeded: q)
    }

    @inlinable public static var zero: Q32 { Q32(raw: 0) }
    @inlinable public static var one: Q32 { Q32(raw: 1 << 32) }
    @inlinable public static var max: Q32 { Q32(raw: .max) }
    @inlinable public static var min: Q32 { Q32(raw: .min) }

    @inlinable public static func < (a: Q32, b: Q32) -> Bool { a.raw < b.raw }
    @inlinable public static func + (a: Q32, b: Q32) -> Q32 { Q32(raw: FixedMath.add(a.raw, b.raw)) }
    @inlinable public static func - (a: Q32, b: Q32) -> Q32 { Q32(raw: FixedMath.subtract(a.raw, b.raw)) }
    @inlinable public static prefix func - (a: Q32) -> Q32 { Q32(raw: FixedMath.negate(a.raw)) }
    @inlinable public static func * (a: Q32, b: Q32) -> Q32 { Q32(raw: FixedMath.mulShift32(a.raw, b.raw)) }
    @inlinable public static func / (a: Q32, b: Q32) -> Q32 { Q32(raw: FixedMath.divShift32(a.raw, b.raw)) }
    @inlinable public static func += (a: inout Q32, b: Q32) { a = a + b }
    @inlinable public static func -= (a: inout Q32, b: Q32) { a = a - b }
    @inlinable public static func *= (a: inout Q32, b: Q32) { a = a * b }

    /// A whole amount times this factor, to the nearest whole.
    @inlinable public func applied(to amount: Int64) -> Int64 { FixedMath.mulShift32(raw, amount) }

    /// The whole part, rounding down.
    @inlinable public var floor: Int64 { raw >> 32 }

    /// The nearest whole number.
    @inlinable
    public var rounded: Int64 {
        let q = Int64(truncatingIfNeeded: (raw.magnitude + (UInt64(1) << 31)) >> 32)
        return raw < 0 ? -q : q
    }

    /// The square root (0, counted, for a negative number). Never above the true root; within 2^-30 of it, relative.
    @inlinable public func squareRoot() -> Q32 { DMath.sqrt(self) }
}

/// A ratio in basis points in an Int32: 1 bp = 1/10,000, so 10,000 is the whole. Shares, rates, unrest, party support.
@frozen
public struct BP: Sendable, Hashable, Comparable {
    public var raw: Int32

    @inlinable public init(raw: Int32) { self.raw = raw }

    /// The ratio of two whole numbers, n / d, in basis points.
    @inlinable
    public init(ratio n: Int64, _ d: Int64) {
        let negative = (n < 0) != (d < 0)
        if d == 0 {
            Saturation.record()
            raw = n == 0 ? 0 : (n < 0 ? .min : .max)
            return
        }
        let p = n.magnitude.multipliedFullWidth(by: 10_000)
        guard let q = FixedMath.quotient(high: p.high, low: p.low, by: d.magnitude) else {
            Saturation.record()
            raw = negative ? .min : .max
            return
        }
        raw = FixedMath.clamp32(q, negative: negative)
    }

    /// A number as a ratio in basis points (1 = 10,000 bp).
    @inlinable
    public init(_ q: Q32) {
        let p = q.raw.magnitude.multipliedFullWidth(by: 10_000)
        let (low, carry) = p.low.addingReportingOverflow(UInt64(1) << 31)
        let high = carry ? p.high &+ 1 : p.high
        raw = FixedMath.clamp32((high << 32) | (low >> 32), negative: q.raw < 0)
    }

    @inlinable public static var zero: BP { BP(raw: 0) }
    /// The whole: 100%.
    @inlinable public static var one: BP { BP(raw: 10_000) }

    @inlinable public static func < (a: BP, b: BP) -> Bool { a.raw < b.raw }

    @inlinable
    public static func + (a: BP, b: BP) -> BP {
        let v = Int64(a.raw) + Int64(b.raw)
        return BP(raw: FixedMath.clamp32(v.magnitude, negative: v < 0))
    }

    @inlinable
    public static func - (a: BP, b: BP) -> BP {
        let v = Int64(a.raw) - Int64(b.raw)
        return BP(raw: FixedMath.clamp32(v.magnitude, negative: v < 0))
    }

    @inlinable
    public static prefix func - (a: BP) -> BP {
        let v = -Int64(a.raw)
        return BP(raw: FixedMath.clamp32(v.magnitude, negative: v < 0))
    }

    /// A share of a share: 50% of 50% is 25%.
    @inlinable
    public static func * (a: BP, b: BP) -> BP {
        let v = Int64(a.raw) * Int64(b.raw)
        return BP(raw: FixedMath.clamp32((v.magnitude + 5_000) / 10_000, negative: v < 0))
    }

    @inlinable public static func += (a: inout BP, b: BP) { a = a + b }
    @inlinable public static func -= (a: inout BP, b: BP) { a = a - b }

    /// This share of a whole amount, to the nearest whole. The product is 128 bits wide and the division by the
    /// constant 10,000 is two multiply-and-shift steps, never a 128-bit division.
    @inlinable
    public func of(_ amount: Int64) -> Int64 {
        let p = amount.magnitude.multipliedFullWidth(by: UInt64(raw.magnitude))     // below 2^94
        let (low, carry) = p.low.addingReportingOverflow(5_000)
        let high = carry ? p.high &+ 1 : p.high
        let t1 = (high << 32) | (low >> 32)
        let q1 = t1 / 10_000
        let t0 = ((t1 % 10_000) << 32) | (low & 0xFFFF_FFFF)
        let negative = (amount < 0) != (raw < 0)
        if q1 >> 32 != 0 {
            Saturation.record()
            return negative ? .min : .max
        }
        return FixedMath.clamp((q1 << 32) | (t0 / 10_000), negative: negative)
    }
}

/// A level kept as its base-2 logarithm, with 32 binary places: price levels, exchange rates, the USD deflator.
/// Multiplying levels is adding logs, so a level can grow for centuries without leaving the range.
@frozen
public struct LogQ: Sendable, Hashable, Comparable {
    public var raw: Int64

    @inlinable public init(raw: Int64) { self.raw = raw }

    /// The logarithm of a level (the bottom of the range, counted, when the level is not positive).
    @inlinable public init(_ level: Q32) { self = DMath.log2(level) }

    /// The level 1.
    @inlinable public static var zero: LogQ { LogQ(raw: 0) }

    @inlinable public static func < (a: LogQ, b: LogQ) -> Bool { a.raw < b.raw }
    @inlinable public static func + (a: LogQ, b: LogQ) -> LogQ { LogQ(raw: FixedMath.add(a.raw, b.raw)) }
    @inlinable public static func - (a: LogQ, b: LogQ) -> LogQ { LogQ(raw: FixedMath.subtract(a.raw, b.raw)) }
    @inlinable public static prefix func - (a: LogQ) -> LogQ { LogQ(raw: FixedMath.negate(a.raw)) }
    @inlinable public static func += (a: inout LogQ, b: LogQ) { a = a + b }
    @inlinable public static func -= (a: inout LogQ, b: LogQ) { a = a - b }

    /// The level itself (clamped and counted from 2^31 up).
    @inlinable public var level: Q32 { DMath.exp2(self) }

    /// A whole amount times the level, to the nearest whole: the way a price index or an exchange rate is applied.
    @inlinable public func applied(to amount: Int64) -> Int64 { DMath.scale(amount, by: self) }
}
