// Money in the simulation (§2.3, §2.4's ledger, ADR 0019 to come): whole numbers in three units that never mix. The
// types are distinct, so adding a local-currency amount to a dollar amount does not compile. stdlib only.

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

    /// The amount times a level kept as a logarithm (a price index, an exchange rate), to the nearest unit.
    @inlinable public func times(_ level: LogQ) -> Self { Self(raw: level.applied(to: raw)) }
}

/// Local currency, in the currency's own scale (10^k local units): treasury, taxes, domestic debt, the money base,
/// wages, prices of non-traded goods. The ledger moves the scale (a redenomination) before a balance can overflow.
@frozen
public struct LCU: Amount {
    public var raw: Int64
    @inlinable public init(raw: Int64) { self.raw = raw }

    /// A balance beyond this, either way, makes its currency redenominate (§2.3: 2^60).
    @inlinable public static var redenominationLimit: UInt64 { UInt64(1) << 60 }
    @inlinable public var needsRedenomination: Bool { raw.magnitude > LCU.redenominationLimit }
}

/// Nominal US dollars, in units of $1,000: FX reserves, external debt, the world-market account, trade settlement.
@frozen
public struct USDn: Amount {
    public var raw: Int64
    @inlinable public init(raw: Int64) { self.raw = raw }
}

/// Constant 2011 US dollars, in units of $1,000: reports, comparisons, the score, «لماذا؟» values. Derived only: it is
/// never posted to a ledger account.
@frozen
public struct Money: Amount {
    public var raw: Int64
    @inlinable public init(raw: Int64) { self.raw = raw }

    /// Nominal dollars divided by the world USD deflator (a level, 1 in 2011).
    @inlinable
    public init(_ nominal: USDn, deflator: LogQ) {
        raw = (-deflator).applied(to: nominal.raw)
    }
}
