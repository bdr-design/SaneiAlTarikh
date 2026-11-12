// Money and people in the simulation (§2.3, §2.4's ledger, ADR 0003): whole numbers, money in three kinds of
// unit. The types are distinct, so adding a local-currency amount to a dollar amount, or to people, does not compile.
// The compiler does not tell one currency's `LCU` from another's, nor a currency before and after a redenomination:
// the ledger must keep those apart. stdlib only.

/// A whole amount in one unit. Sums clamp and count (Saturation); amounts of different units cannot be combined.
public protocol Amount: Sendable, Hashable, Comparable {
    var raw: Int64 { get set }
    init(raw: Int64)
}

extension Amount {
    @inlinable public static var zero: Self { Self(raw: 0) }
    @inlinable public static func < (a: Self, b: Self) -> Bool { a.raw < b.raw }
    @inlinable public static func + (a: Self, b: Self) -> Self { Self(raw: FixedMath.add(a.raw, b.raw)) }
    @inlinable public static func - (a: Self, b: Self) -> Self { Self(raw: FixedMath.subtract(a.raw, b.raw)) }
    @inlinable public static prefix func - (a: Self) -> Self { Self(raw: FixedMath.negate(a.raw)) }
    @inlinable public static func += (a: inout Self, b: Self) { a = a + b }
    @inlinable public static func -= (a: inout Self, b: Self) { a = a - b }

    /// A share of the amount (a tax rate, a budget share), to the nearest unit.
    @inlinable public func times(_ share: BP) -> Self { Self(raw: share.of(raw)) }

    /// The amount times a factor, to the nearest unit.
    @inlinable public func times(_ factor: Q32) -> Self { Self(raw: factor.applied(to: raw)) }

    /// The amount times a level kept as a logarithm (a price index, a growth factor), in the same unit. Within 6e-8
    /// of the true product plus one unit; not exactly reversible (see `LogQ.applied`).
    @inlinable public func times(_ level: LogQ) -> Self { Self(raw: level.applied(to: raw)) }

    /// The amount a whole number of times (a wage times a headcount). Clamped and counted. The label keeps a count
    /// apart from a share: a share in basis points is `times(BP(raw: 2_500))`, never `times(count: 2_500)`.
    @inlinable
    public func times(count: Int64) -> Self {
        let (v, overflow) = raw.multipliedReportingOverflow(by: count)
        if !overflow { return Self(raw: v) }
        Saturation.record()
        return Self(raw: (raw < 0) != (count < 0) ? .min : .max)
    }

    /// The amount times n / d, exactly rounded at any size: the product is 128 bits wide, so 1/7 of 10^15 is right to
    /// the unit, where a `Q32` or `BP` factor has already been rounded. Clamped and counted when the result does not
    /// fit, and when d is zero (0 when the product is 0 too).
    @inlinable public func times(_ n: Int64, over d: Int64) -> Self { Self(raw: FixedMath.mulDiv(raw, n, d)) }

    /// The amount shared among a whole number, to the nearest unit (a total over a headcount). Dividing by zero is a
    /// counted clamp: 0 for an amount of 0, anything else the end of the range on the amount's side. The parts do not
    /// add up to the amount: where they must, use `ShareSplitter`.
    @inlinable public func divided(by count: Int64) -> Self { Self(raw: FixedMath.mulDiv(raw, 1, count)) }

    /// How many times `other` goes into this amount, as a number: the ratio of two amounts of one unit (debt to
    /// revenue). Dividing by zero is a counted clamp; for a ratio the model bounds, use `ratio(to:within:)`.
    @inlinable public func ratio(to other: Self) -> Q32 { Q32(ratio: raw, other.raw) }

    /// The same ratio held inside `bounds` and never counted; `undefined` is the ratio when both are 0 (see
    /// `Q32.init(ratio:_:within:undefined:)`).
    @inlinable
    public func ratio(to other: Self, within bounds: ClosedRange<Q32>, undefined: Q32 = .zero) -> Q32 {
        Q32(ratio: raw, other.raw, within: bounds, undefined: undefined)
    }

    /// This amount as a share of a total of the same unit, in basis points. Dividing by zero is a counted clamp; where
    /// a total of 0 is an ordinary day (a new government's budget, an emptied province), use `share(of:within:)`.
    @inlinable public func share(of total: Self) -> BP { BP(ratio: raw, total.raw) }

    /// The same share held inside `bounds` and never counted; `undefined` is the share when both are 0.
    @inlinable
    public func share(of total: Self, within bounds: ClosedRange<BP>, undefined: BP = .zero) -> BP {
        BP(ratio: raw, total.raw, within: bounds, undefined: undefined)
    }

    /// The size of the amount, without its sign (the opposite of the lowest amount is the highest, counted).
    @inlinable public var magnitude: Self { raw < 0 ? Self(raw: FixedMath.negate(raw)) : self }

    /// The amount held inside `bounds`: a bound the model sets. Not counted.
    @inlinable
    public func clamped(to bounds: ClosedRange<Self>) -> Self {
        Self(raw: Swift.min(Swift.max(raw, bounds.lowerBound.raw), bounds.upperBound.raw))
    }
}

/// Local currency, in the currency's own scale (10^k local units): treasury, taxes, domestic debt, the money base,
/// wages, prices of non-traded goods. The ledger moves the scale (a redenomination) before a balance can overflow.
@frozen
public struct LCU: Amount {
    public var raw: Int64
    @inlinable public init(raw: Int64) { self.raw = raw }
    @inlinable public static func == (a: LCU, b: LCU) -> Bool { a.raw == b.raw }

    /// A balance beyond this, either way, makes its currency redenominate (§2.3: 2^60).
    @inlinable public static var redenominationLimit: UInt64 { UInt64(1) << 60 }
    /// True for one amount beyond the limit. The ledger asks it of each balance it posts to; the aggregates that come
    /// with the economy (a budget's lines, nominal output, a union's money base: M2) must ask it of their sums, since
    /// nine lines each under the limit can still sum past the range.
    @inlinable public var needsRedenomination: Bool { raw.magnitude > LCU.redenominationLimit }
}

/// Nominal US dollars, in units of $1,000: FX reserves, external debt, the world-market account, trade settlement.
@frozen
public struct USDn: Amount {
    public var raw: Int64
    @inlinable public init(raw: Int64) { self.raw = raw }
    @inlinable public static func == (a: USDn, b: USDn) -> Bool { a.raw == b.raw }
}

/// Constant 2011 US dollars, in units of $1,000: reports, comparisons, the score, «لماذا؟» values. Derived only:
/// it must never be posted to a ledger account. The type alone does not stop that: the ledger's postings must take
/// `LCU` and `USDn` only.
@frozen
public struct Money: Amount {
    public var raw: Int64
    @inlinable public init(raw: Int64) { self.raw = raw }
    @inlinable public static func == (a: Money, b: Money) -> Bool { a.raw == b.raw }

    /// Nominal dollars divided by the world USD deflator (a level, 1 in 2011).
    @inlinable
    public init(_ nominal: USDn, deflator: LogQ) {
        raw = (-deflator).applied(to: nominal.raw)
    }
}

/// People, as one government counts them (§2.3): a whole number in an Int64. It adds, scales and splits like any
/// amount; a province or a cohort keeps its people in the narrower `Pop32`.
@frozen
public struct Pop: Amount {
    public var raw: Int64
    @inlinable public init(raw: Int64) { self.raw = raw }
    @inlinable public static func == (a: Pop, b: Pop) -> Bool { a.raw == b.raw }

    /// A province's or a cohort's people, widened. Always fits.
    @inlinable public init(_ narrow: Pop32) { raw = Int64(narrow.raw) }
}

/// People in one province or one cohort (§2.3): an Int32, about 2.1 billion at most. Half the bytes of `Pop` in the
/// largest columns. Sums clamp and count; a country's total is a `Pop`.
@frozen
public struct Pop32: Sendable, Hashable, Comparable {
    public var raw: Int32
    @inlinable public init(raw: Int32) { self.raw = raw }

    /// A count of people narrowed to a province's or a cohort's width (clamped and counted beyond it).
    @inlinable
    public init(_ wide: Pop) {
        raw = FixedMath.clamp32(wide.raw.magnitude, negative: wide.raw < 0)
    }

    @inlinable public static var zero: Pop32 { Pop32(raw: 0) }
    @inlinable public static func == (a: Pop32, b: Pop32) -> Bool { a.raw == b.raw }
    @inlinable public static func < (a: Pop32, b: Pop32) -> Bool { a.raw < b.raw }

    @inlinable
    public static func + (a: Pop32, b: Pop32) -> Pop32 {
        let v = Int64(a.raw) + Int64(b.raw)
        return Pop32(raw: FixedMath.clamp32(v.magnitude, negative: v < 0))
    }

    @inlinable
    public static func - (a: Pop32, b: Pop32) -> Pop32 {
        let v = Int64(a.raw) - Int64(b.raw)
        return Pop32(raw: FixedMath.clamp32(v.magnitude, negative: v < 0))
    }

    @inlinable public static func += (a: inout Pop32, b: Pop32) { a = a + b }
    @inlinable public static func -= (a: inout Pop32, b: Pop32) { a = a - b }
}
