// The simulation's numbers (§2.3, L5): integers only. `Q32` is binary fixed point, `BP` a ratio in basis points, `LogQ`
// a level kept as a base-2 logarithm. Results round to the nearest value, ties away from zero, so that -(a * b) equals
// (-a) * b; a result outside the range is clamped and counted (Saturation). A multiply is a 128-bit product and a
// shift; only a true division divides. stdlib only.
// tools/checks/core_reference.py holds the same arithmetic a second time; its rows lock the operations here.
//
// Rounding cannot make parts add up to a whole (six shares of 1/6 are 10,002 bp): where sums must close, use the
// exact split (T-038), never a share of each part.

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

    /// (high * 2^64 + low) / d, to the nearest whole; nil when that does not fit in 64 bits, and when d is 0.
    @inlinable
    static func quotient(high: UInt64, low: UInt64, by d: UInt64) -> UInt64? {
        if d == 0 { return nil }
        if high == 0 {
            // the dividend fits in 64 bits: one hardware division, not the 128-bit routine. q + 1 cannot wrap: a
            // quotient of 2^64 - 1 needs d = 1, and then nothing is left over
            let q = low / d
            let r = low % d
            return r < d &- r ? q : q &+ 1
        }
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

    /// a * n / d to the nearest whole, ties away from zero: the product is 128 bits wide, so nothing is lost before
    /// the division. Clamped and counted when the result does not fit, and when d is zero: 0 when the product is 0
    /// too, anything else the end of the range on the product's side.
    @inlinable
    static func mulDiv(_ a: Int64, _ n: Int64, _ d: Int64) -> Int64 {
        let p = a.magnitude.multipliedFullWidth(by: n.magnitude)
        let productNegative = (a < 0) != (n < 0)
        if d == 0 {
            Saturation.record()
            return p.high == 0 && p.low == 0 ? 0 : (productNegative ? .min : .max)
        }
        return divide(high: p.high, low: p.low, by: d.magnitude, negative: productNegative != (d < 0))
    }

    /// A magnitude and a sign as an Int64, held at the ends of the range and not counted: for a result its caller
    /// bounds anyway.
    @inlinable
    static func held(_ m: UInt64, negative: Bool) -> Int64 {
        if negative { return m <= UInt64(1) << 63 ? Int64(truncatingIfNeeded: 0 &- m) : .min }
        return m <= UInt64(Int64.max) ? Int64(truncatingIfNeeded: m) : .max
    }
}

/// A number with 32 binary places in an Int64: about ±2.1 billion, in steps of 2^-32. Growth, productivity,
/// elasticities.
@frozen
public struct Q32: Sendable, Hashable, Comparable {
    public var raw: Int64

    /// The stored bits: `1 << 32` is the number 1.
    @inlinable public init(raw: Int64) { self.raw = raw }

    /// A whole number (clamped and counted beyond the range: below -2^31, or from 2^31 up).
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

    /// The ratio of two whole numbers, n / d. Dividing by zero is a counted clamp: 0 / 0 is 0, anything else the end
    /// of the range on n's side.
    @inlinable public init(ratio n: Int64, _ d: Int64) { raw = FixedMath.divShift32(n, d) }

    /// n / d held inside `bounds`, and never counted. For a ratio the model bounds anyway (a gap between demand and
    /// supply held to ±8%), where a divisor of zero is an ordinary day, not a fault: the game's count of clamps stays
    /// 0. With d = 0: the upper bound when n is above 0, the lower when it is below, and 0, held inside the bounds,
    /// when n is 0 too.
    @inlinable
    public init(ratio n: Int64, _ d: Int64, within bounds: ClosedRange<Q32>) {
        var v: Int64
        if d == 0 {
            v = n == 0 ? 0 : (n < 0 ? .min : .max)
        } else {
            let negative = (n < 0) != (d < 0)
            let m = n.magnitude
            if let q = FixedMath.quotient(high: m >> 32, low: m << 32, by: d.magnitude) {
                v = FixedMath.held(q, negative: negative)
            } else {
                v = negative ? .min : .max
            }
        }
        raw = Swift.min(Swift.max(v, bounds.lowerBound.raw), bounds.upperBound.raw)
    }

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

    @inlinable public static func == (a: Q32, b: Q32) -> Bool { a.raw == b.raw }
    @inlinable public static func < (a: Q32, b: Q32) -> Bool { a.raw < b.raw }
    @inlinable public static func + (a: Q32, b: Q32) -> Q32 { Q32(raw: FixedMath.add(a.raw, b.raw)) }
    @inlinable public static func - (a: Q32, b: Q32) -> Q32 { Q32(raw: FixedMath.subtract(a.raw, b.raw)) }
    @inlinable public static prefix func - (a: Q32) -> Q32 { Q32(raw: FixedMath.negate(a.raw)) }
    @inlinable public static func * (a: Q32, b: Q32) -> Q32 { Q32(raw: FixedMath.mulShift32(a.raw, b.raw)) }
    /// Dividing by zero is a counted clamp: 0 / 0 is 0, anything else the end of the range on a's side.
    @inlinable public static func / (a: Q32, b: Q32) -> Q32 { Q32(raw: FixedMath.divShift32(a.raw, b.raw)) }
    @inlinable public static func += (a: inout Q32, b: Q32) { a = a + b }
    @inlinable public static func -= (a: inout Q32, b: Q32) { a = a - b }
    @inlinable public static func *= (a: inout Q32, b: Q32) { a = a * b }

    /// A whole amount times this factor, to the nearest whole.
    @inlinable public func applied(to amount: Int64) -> Int64 { FixedMath.mulShift32(raw, amount) }

    /// The whole part as an Int64, rounding down (-1.5 gives -2).
    @inlinable public var floor: Int64 { raw >> 32 }

    /// The nearest whole number as an Int64, ties away from zero.
    @inlinable
    public var rounded: Int64 {
        let q = Int64(truncatingIfNeeded: (raw.magnitude + (UInt64(1) << 31)) >> 32)
        return raw < 0 ? -q : q
    }

    /// The square root (0, counted, for a negative number). Never above the true root; within one step (2^-32) of it
    /// below 1, and within 2^-30 of it, relative, from 1 up.
    @inlinable public func squareRoot() -> Q32 { DMath.sqrt(self) }

    /// The size of the number, without its sign (the opposite of the lowest number is the highest, counted).
    @inlinable public var magnitude: Q32 { raw < 0 ? Q32(raw: FixedMath.negate(raw)) : self }

    /// The number held inside `bounds`: a bound the model sets. Not counted.
    @inlinable
    public func clamped(to bounds: ClosedRange<Q32>) -> Q32 {
        Q32(raw: Swift.min(Swift.max(raw, bounds.lowerBound.raw), bounds.upperBound.raw))
    }
}

/// A ratio in basis points in an Int32: 1 bp = 1/10,000, so 10,000 is the whole. Shares, rates, unrest, party support.
@frozen
public struct BP: Sendable, Hashable, Comparable {
    public var raw: Int32

    /// The stored bits: 10,000 is the whole.
    @inlinable public init(raw: Int32) { self.raw = raw }

    /// The ratio of two whole numbers, n / d, in basis points (clamped and counted beyond ±214,748.3647, and when d
    /// is zero: 0 / 0 is 0, anything else the end of the range on n's side).
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

    /// n / d in basis points held inside `bounds`, and never counted (see `Q32.init(ratio:_:within:)`). With d = 0:
    /// the upper bound when n is above 0, the lower when it is below, and 0, held inside the bounds, when n is 0 too.
    @inlinable
    public init(ratio n: Int64, _ d: Int64, within bounds: ClosedRange<BP>) {
        var v: Int64
        if d == 0 {
            v = n == 0 ? 0 : (n < 0 ? .min : .max)
        } else {
            let negative = (n < 0) != (d < 0)
            let p = n.magnitude.multipliedFullWidth(by: 10_000)
            if let q = FixedMath.quotient(high: p.high, low: p.low, by: d.magnitude) {
                v = FixedMath.held(q, negative: negative)
            } else {
                v = negative ? .min : .max
            }
        }
        raw = Int32(truncatingIfNeeded: Swift.min(Swift.max(v, Int64(bounds.lowerBound.raw)), Int64(bounds.upperBound.raw)))
    }

    /// A number as a ratio in basis points (1 = 10,000 bp; clamped and counted beyond ±214,748.3647).
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

    @inlinable public static func == (a: BP, b: BP) -> Bool { a.raw == b.raw }
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

    /// This share of a bare whole number, to the nearest whole, exactly rounded. For money use `Amount.times`, which
    /// keeps the unit. The product is 128 bits wide; the division is by the constant 10,000, in two 64-bit steps, never
    /// a 128-bit division (an optimised build turns a division by a constant into a multiply and a shift).
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

    /// The ratio held inside `bounds`: a bound the model sets. Not counted.
    @inlinable
    public func clamped(to bounds: ClosedRange<BP>) -> BP {
        BP(raw: Swift.min(Swift.max(raw, bounds.lowerBound.raw), bounds.upperBound.raw))
    }
}

/// A level kept as its base-2 logarithm, with 32 binary places: price levels, exchange rates, the USD deflator.
/// Multiplying levels is adding logs, so a level can grow for centuries without leaving the range.
@frozen
public struct LogQ: Sendable, Hashable, Comparable {
    public var raw: Int64

    /// The stored bits: `1 << 32` is the logarithm 1, the level 2.
    @inlinable public init(raw: Int64) { self.raw = raw }

    /// The logarithm of a level, within 2e-7 (the bottom of the range, counted, when the level is not positive). A
    /// level below 1 has few bits as a `Q32` (1/20,500 is already 2e-6 off): build a small level from two whole
    /// numbers, `LogQ(ratio: 1, 20_500)`. A level within about 0.17 of the top of `Q32`'s range rounds to the
    /// logarithm 31, whose own level no longer fits.
    @inlinable public init(level: Q32) { self = DMath.log2(level) }

    /// The logarithm with this value: `LogQ(exponent: Q32(3))` is the level 2^3 = 8. Nothing is computed: the label
    /// says the number is already a logarithm, where `init(level:)` takes one.
    @inlinable public init(exponent: Q32) { raw = exponent.raw }

    /// The logarithm of n / d for two whole numbers above 0, of any size (a price index from two totals, a small
    /// rate): within 4e-7. Counted when either is not above 0: the bottom of the range when n is not, the top when
    /// only d is not.
    @inlinable public init(ratio n: Int64, _ d: Int64) { self = DMath.log2(ratio: n, d) }

    /// The logarithm as a plain number: the power of 2 the level is.
    @inlinable public var exponent: Q32 { Q32(raw: raw) }

    /// The logarithm 0: the level 1.
    @inlinable public static var zero: LogQ { LogQ(raw: 0) }

    @inlinable public static func == (a: LogQ, b: LogQ) -> Bool { a.raw == b.raw }
    @inlinable public static func < (a: LogQ, b: LogQ) -> Bool { a.raw < b.raw }
    @inlinable public static func + (a: LogQ, b: LogQ) -> LogQ { LogQ(raw: FixedMath.add(a.raw, b.raw)) }
    @inlinable public static func - (a: LogQ, b: LogQ) -> LogQ { LogQ(raw: FixedMath.subtract(a.raw, b.raw)) }
    @inlinable public static prefix func - (a: LogQ) -> LogQ { LogQ(raw: FixedMath.negate(a.raw)) }
    @inlinable public static func += (a: inout LogQ, b: LogQ) { a = a + b }
    @inlinable public static func -= (a: inout LogQ, b: LogQ) { a = a - b }

    /// The level raised to a power: an elasticity applied to a level, or a decay. Level 8 to the power 1/3 is
    /// `LogQ(exponent: Q32(3)) * Q32(ratio: 1, 3)`, the level 2. Clamped and counted like any product.
    @inlinable public static func * (a: LogQ, b: Q32) -> LogQ { LogQ(raw: FixedMath.mulShift32(a.raw, b.raw)) }

    /// The logarithm held inside `bounds`: a bound the model sets. Not counted.
    @inlinable
    public func clamped(to bounds: ClosedRange<LogQ>) -> LogQ {
        LogQ(raw: Swift.min(Swift.max(raw, bounds.lowerBound.raw), bounds.upperBound.raw))
    }

    /// The level itself as a `Q32`: clamped and counted from 2^31 up, coarse below 1 (a `Q32` has few bits there) and
    /// 0 below 2^-33. For showing a level, or a factor near 1. To apply a level to money use `applied(to:)` or
    /// `Amount.times`, never `amount.times(level.level)`.
    @inlinable public var level: Q32 { DMath.exp2(self) }

    /// A bare whole number times the level: the way a price index or an exchange rate is applied, at any size of
    /// level. Within 6e-8 of the true product plus one unit: the level comes from a table, so this is not
    /// exactly rounded and going there and back does not return the same number. For money use `Amount.times`.
    @inlinable public func applied(to amount: Int64) -> Int64 { DMath.scale(amount, by: self) }
}
