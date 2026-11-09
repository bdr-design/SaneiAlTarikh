// Table-based maths for the simulation (§2.3, L5): no floating point and no libm, whose last bit differs between
// platforms. `exp2` and `log2` read 1,025-entry tables (DMathTables.swift, generated and checked by
// tools/checks/core_reference.py) and interpolate linearly between two entries. Asserted there against 60-digit
// decimals: from the level 1 up, exp2 within 6e-8 of the true value (relative) and a round trip within 2e-7; below 1
// a `Q32` level has few bits and its own last step is the limit (`scale` keeps 6e-8 at any size); log2 within 2e-7
// (absolute) everywhere. The design asks for 1e-6. Whole powers of two are exact both ways. stdlib only.

public enum DMath {
    /// The exponent and the mantissa, in [1, 2) with 32 binary places, of 2^(y / 2^32).
    @inlinable
    static func mantissa(_ y: Int64) -> (n: Int64, m: UInt64) {
        let f = UInt64(truncatingIfNeeded: y) & 0xFFFF_FFFF
        let i = Int(truncatingIfNeeded: f >> 22)
        let e0 = exp2Table[i]
        let e1 = exp2Table[i + 1]
        return (y >> 32, e0 + (((e1 - e0) * (f & 0x3F_FFFF) + (UInt64(1) << 21)) >> 22))
    }

    /// The level of a logarithm, 2^y: clamped and counted from 2^31 up; below 1 the nearest step of 2^-32, so 0 below
    /// 2^-33 (not counted: a level that small is 0 to a `Q32`).
    @inlinable
    public static func exp2(_ y: LogQ) -> Q32 {
        let (n, m) = mantissa(y.raw)
        if n >= 31 {
            Saturation.record()
            return .max
        }
        if n >= 0 { return Q32(raw: Int64(truncatingIfNeeded: m << UInt64(n))) }
        if n <= -64 { return .zero }
        let s = UInt64(-n)
        return Q32(raw: Int64(truncatingIfNeeded: (m + (UInt64(1) << (s - 1))) >> s))
    }

    /// The base-2 logarithm of a level (the bottom of the range, counted, when the level is not positive).
    @inlinable
    public static func log2(_ x: Q32) -> LogQ {
        if x.raw <= 0 {
            Saturation.record()
            return LogQ(raw: .min)
        }
        let r = UInt64(truncatingIfNeeded: x.raw)
        let lz = r.leadingZeroBitCount                              // 1...63
        let u = r << UInt64(lz)                                     // the top bit set
        let i = Int(truncatingIfNeeded: (u >> 53) & 0x3FF)
        let l0 = log2Table[i]
        let l1 = log2Table[i + 1]
        let l = l0 + (((l1 - l0) * ((u >> 21) & 0xFFFF_FFFF) + (UInt64(1) << 31)) >> 32)
        return LogQ(raw: (Int64(31 - lz) << 32) + Int64(truncatingIfNeeded: l))
    }

    /// A whole amount times 2^y: a price index or an exchange rate applied to money. The level may be far outside
    /// `Q32`'s range; only the result must fit (clamped and counted when it does not). Within 6e-8 of the true
    /// product, relative, or one unit: the mantissa of 2^y comes from the table, so the result is the nearest whole of
    /// amount times the table's 2^y, not of the true product, and scaling by y and then by -y does not return the
    /// amount exactly.
    public static func scale(_ amount: Int64, by y: LogQ) -> Int64 {
        let (n, m) = mantissa(y.raw)
        let p = amount.magnitude.multipliedFullWidth(by: m)         // below 2^96
        let negative = amount < 0
        if p.high == 0 && p.low == 0 { return 0 }
        let s = 32 - n                                              // the product is shifted right by s
        if s >= 128 { return 0 }
        if s >= 1 {
            // (p + 2^(s - 1)) >> s
            var high = p.high
            var low = p.low
            if s <= 64 {
                let (sum, carry) = low.addingReportingOverflow(UInt64(1) << UInt64(s - 1))
                low = sum
                if carry { high &+= 1 }
            } else {
                high &+= UInt64(1) << UInt64(s - 65)
            }
            if s < 64 {
                if high >> UInt64(s) != 0 {
                    Saturation.record()
                    return negative ? .min : .max
                }
                return FixedMath.clamp((low >> UInt64(s)) | (high << UInt64(64 - s)), negative: negative)
            }
            return FixedMath.clamp(s == 64 ? high : high >> UInt64(s - 64), negative: negative)
        }
        // shifted left by -s
        let k = -s
        if p.high != 0 || k >= 64 || (k > 0 && p.low >> UInt64(64 - k) != 0) {
            Saturation.record()
            return negative ? .min : .max
        }
        return FixedMath.clamp(p.low << UInt64(k), negative: negative)
    }

    /// The whole square root, rounding down: the largest r with r * r <= n.
    @inlinable
    public static func isqrt(_ n: UInt64) -> UInt64 {
        if n < 2 { return n }
        // Newton's steps from a power of two at or above the root: they only go down, and stop at the root
        var x = UInt64(1) << UInt64((65 - n.leadingZeroBitCount) / 2)
        while true {
            let y = (x + n / x) >> 1
            if y >= x { return x }
            x = y
        }
    }

    /// The square root of a number (0, counted, for a negative one). Never above the true root; within one step
    /// (2^-32) of it below 1, and within 2^-30 of it, relative, from 1 up.
    public static func sqrt(_ x: Q32) -> Q32 {
        if x.raw < 0 {
            Saturation.record()
            return .zero
        }
        if x.raw == 0 { return .zero }
        let r = UInt64(truncatingIfNeeded: x.raw)
        // sqrt(r * 2^32) = sqrt(r << k) << ((32 - k) / 2), for the largest even k that keeps r << k in 64 bits
        let k = Swift.min(r.leadingZeroBitCount & ~1, 32)
        return Q32(raw: Int64(truncatingIfNeeded: isqrt(r << UInt64(k)) << UInt64((32 - k) / 2)))
    }

    /// The logistic curve 1 / (1 + e^-x), in [0, 1]. Exactly symmetric: logistic(x) + logistic(-x) is 1, and
    /// logistic(0) is one half. Within 2e-8 of the true value (absolute).
    public static func logistic(_ x: Q32) -> Q32 {
        let a = x.raw.magnitude
        var s: UInt64 = 0                                           // logistic(-|x|), at most one half
        if a < UInt64(46) << 32 {                                   // beyond 46 the curve is 0 or 1 to the last bit
            let p = a.multipliedFullWidth(by: log2e)                // |x| * log2(e): e^-|x| = 2^-(that)
            let (low, carry) = p.low.addingReportingOverflow(UInt64(1) << 31)
            let high = carry ? p.high &+ 1 : p.high
            let y = Int64(truncatingIfNeeded: (high << 32) | (low >> 32))
            let t = UInt64(truncatingIfNeeded: exp2(LogQ(raw: -y)).raw)     // e^-|x|, in [0, 1]
            // t / (1 + t): never fails, the divisor is above the dividend's high half
            s = FixedMath.quotient(high: t >> 32, low: t << 32, by: (UInt64(1) << 32) + t) ?? 0
        }
        let one = UInt64(1) << 32
        return Q32(raw: Int64(truncatingIfNeeded: x.raw >= 0 ? one - s : s))
    }
}
