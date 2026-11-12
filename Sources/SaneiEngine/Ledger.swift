import SaneiCore

// The nominal ledger (§2.4, ADR 0003): every flow of money is a posting, in the unit of the account it lands in. Each
// government has accounts in its own currency (LCU) and FX reserves in dollars (USDn); the world market has one dollar
// account. Per account, the change of the balance since the month opened equals the sum of the month's postings, in
// its own unit; the world account is exactly 0 after each monthly close. The types keep the units apart: an LCU amount
// can only be posted to an LCU account, a USDn amount to a USDn account, and constant dollars (`Money`) not at all.
// stdlib only, through SaneiCore.

public enum CurrencyKind {}

/// Why money moved. The numbers are stored in saves: never renumber one.
public enum PostingCategory: UInt16, Sendable, CaseIterable {
    case tax = 1
    case spending = 2
    /// One leg of a currency exchange at the day's rate.
    case fx = 3
    /// A change of value from a rate or a price index, written as a posting.
    case revaluation = 4
    case trade = 5
    case transport = 6
    case aid = 7
    /// A currency moved its scale by 10^3: the balance rescaled, its rounding included.
    case redenomination = 8
    /// Money from nowhere, only with cheats on (§5.11).
    case cheat = 9
    case interest = 10
}

/// A government's accounts in its own currency.
public enum LocalAccount: UInt8, Sendable, CaseIterable {
    case treasury = 0
    case moneyBase = 1
    case domesticDebt = 2
}

/// The dollar accounts: a government's FX reserves, or the world market's.
public enum DollarAccount: Sendable, Equatable {
    case reserves(GovRef)
    case world
}

/// The currencies (§2.3): each an LCU in its own scale, with its exchange rate and price index kept as logarithms.
@frozen
public struct CurrencyTable: Sendable, Equatable {
    public static let capacity = 384
    /// One LCU unit is 10^k of the currency's own units.
    public internal(set) var scaleExponent: [UInt8]
    /// LCU units per USDn unit, as a logarithm.
    public internal(set) var rate: [LogQ]
    /// The price level, as a logarithm (1 in 2011).
    public internal(set) var priceIndex: [LogQ]
    public internal(set) var redenominations: [UInt16]

    public init() {
        scaleExponent = []
        rate = []
        priceIndex = []
        redenominations = []
        scaleExponent.reserveCapacity(Self.capacity)
        rate.reserveCapacity(Self.capacity)
        priceIndex.reserveCapacity(Self.capacity)
        redenominations.reserveCapacity(Self.capacity)
    }

    public var count: Int { rate.count }

    /// Adds a currency; nil at the cap.
    public mutating func add(scaleExponent k: UInt8, rate r: LogQ) -> Idx<CurrencyKind>? {
        guard rate.count < Self.capacity else { return nil }
        scaleExponent.append(k)
        rate.append(r)
        priceIndex.append(.zero)
        redenominations.append(0)
        return Idx(raw: UInt16(rate.count - 1))
    }
}

/// The balances, one row per government row (live or dissolved: a dissolved government's balances stay as they were),
/// and the world account.
@frozen
public struct LedgerTable: Sendable, Equatable {
    /// A balance past this, either way, makes its currency redenominate (§2.3). Three local accounts at most this
    /// much each still sum inside an Int64.
    public static let redenominationLimit: UInt64 = UInt64(1) << 60

    public internal(set) var currency: [Idx<CurrencyKind>]
    /// The local balances, three per government: [row * 3 + account].
    public internal(set) var local: [LCU]
    public internal(set) var reserves: [USDn]
    public internal(set) var world: USDn
    // the month so far, for the invariant: the opening balances and the sums posted since
    public internal(set) var localOpening: [LCU]
    public internal(set) var localPosted: [LCU]
    public internal(set) var reservesOpening: [USDn]
    public internal(set) var reservesPosted: [USDn]
    public internal(set) var worldOpening: USDn
    public internal(set) var worldPosted: USDn

    public init() {
        currency = []
        local = []
        reserves = []
        world = .zero
        localOpening = []
        localPosted = []
        reservesOpening = []
        reservesPosted = []
        worldOpening = .zero
        worldPosted = .zero
        let n = GovernmentTable.capacity
        currency.reserveCapacity(n)
        local.reserveCapacity(3 * n)
        reserves.reserveCapacity(n)
        localOpening.reserveCapacity(3 * n)
        localPosted.reserveCapacity(3 * n)
        reservesOpening.reserveCapacity(n)
        reservesPosted.reserveCapacity(n)
    }

    public func balance(_ row: Int, _ account: LocalAccount) -> LCU { local[row * 3 + Int(account.rawValue)] }

    /// Opens the accounts of a government row: new, or reused after a dissolved government (its old balances end
    /// with it). The opening balances are not postings: they are where the accounts start.
    mutating func open(row: Int, currency c: Idx<CurrencyKind>, treasury: LCU) {
        if row == currency.count {
            currency.append(c)
            for _ in 0..<3 {
                local.append(.zero)
                localOpening.append(.zero)
                localPosted.append(.zero)
            }
            reserves.append(.zero)
            reservesOpening.append(.zero)
            reservesPosted.append(.zero)
        } else {
            currency[row] = c
            for a in 0..<3 {
                local[row * 3 + a] = .zero
                localOpening[row * 3 + a] = .zero
                localPosted[row * 3 + a] = .zero
            }
            reserves[row] = .zero
            reservesOpening[row] = .zero
            reservesPosted[row] = .zero
        }
        local[row * 3] = treasury
        localOpening[row * 3] = treasury
    }
}

extension WorldState {
    /// Posts an amount in a government's own currency to one of its local accounts. A balance that passes 2^60 makes
    /// the currency redenominate at once.
    public mutating func post(_ g: GovRef, _ account: LocalAccount, _ category: PostingCategory, _ amount: LCU) {
        guard governments.isLive(g) else { return }
        let i = g.row.int * 3 + Int(account.rawValue)
        ledger.local[i] += amount
        ledger.localPosted[i] += amount
        if ledger.local[i].raw.magnitude > LedgerTable.redenominationLimit { redenominate(ledger.currency[g.row.int]) }
    }

    /// Posts an amount in dollars to a dollar account. Dollars never redenominate.
    public mutating func post(_ account: DollarAccount, _ category: PostingCategory, _ amount: USDn) {
        switch account {
        case let .reserves(g):
            guard governments.isLive(g) else { return }
            ledger.reserves[g.row.int] += amount
            ledger.reservesPosted[g.row.int] += amount
        case .world:
            ledger.world += amount
            ledger.worldPosted += amount
        }
    }

    /// Moves dollars from one dollar account to another: two postings that cancel, so no dollar is made or lost.
    /// Nothing moves when either side is a government that no longer exists.
    public mutating func transfer(_ amount: USDn, from: DollarAccount, to: DollarAccount, _ category: PostingCategory) {
        if case let .reserves(g) = from, !governments.isLive(g) { return }
        if case let .reserves(g) = to, !governments.isLive(g) { return }
        post(from, category, -amount)
        post(to, category, amount)
    }

    /// Changes a government's local currency into dollars (a positive amount) or dollars into local currency (a
    /// negative one) at the day's rate: two postings under `fx`, each exact in its own unit. Returns the dollars.
    @discardableResult
    public mutating func exchange(_ g: GovRef, local amount: LCU) -> USDn {
        guard governments.isLive(g) else { return .zero }
        let rate = currencies.rate[ledger.currency[g.row.int].int]
        let dollars = USDn(raw: (-rate).applied(to: amount.raw))
        post(g, .treasury, .fx, -amount)
        post(.reserves(g), .fx, dollars)
        return dollars
    }

    /// Moves a currency's scale by 10^3: every local balance of every government in that currency is divided by 1,000
    /// to the nearest unit, the change posted under `redenomination`, and the rate and the price index follow.
    mutating func redenominate(_ c: Idx<CurrencyKind>) {
        for row in 0..<ledger.currency.count where ledger.currency[row] == c {
            for a in 0..<3 {
                let i = row * 3 + a
                let old = ledger.local[i]
                let new = old.times(1, over: 1_000)
                ledger.local[i] = new
                ledger.localPosted[i] += new - old
            }
        }
        currencies.scaleExponent[c.int] &+= 3
        currencies.rate[c.int] += LogQ(ratio: 1, 1_000)
        currencies.priceIndex[c.int] += LogQ(ratio: 1, 1_000)
        currencies.redenominations[c.int] &+= 1
    }

    /// What the ledger's invariants say: an empty list when they hold. For tests, debug builds and replays.
    public func ledgerViolations() -> [String] {
        var out: [String] = []
        let l = ledger
        for i in 0..<l.local.count where l.local[i] - l.localOpening[i] != l.localPosted[i] {
            out.append("local account \(i): balance moved \(l.local[i] - l.localOpening[i]), postings \(l.localPosted[i])")
        }
        for i in 0..<l.reserves.count where l.reserves[i] - l.reservesOpening[i] != l.reservesPosted[i] {
            out.append("reserves \(i): balance moved \(l.reserves[i] - l.reservesOpening[i]), postings \(l.reservesPosted[i])")
        }
        if l.world - l.worldOpening != l.worldPosted { out.append("world account: moved \(l.world - l.worldOpening), postings \(l.worldPosted)") }
        return out
    }

    /// Closes the month: checks the invariants (the world account must be exactly 0), then opens the next month at
    /// the balances as they are. Returns what failed: empty when everything held.
    @discardableResult
    public mutating func closeMonth() -> [String] {
        var failed = ledgerViolations()
        if ledger.world != .zero { failed.append("world account not 0 at the close: \(ledger.world)") }
        for i in 0..<ledger.local.count {
            ledger.localOpening[i] = ledger.local[i]
            ledger.localPosted[i] = .zero
        }
        for i in 0..<ledger.reserves.count {
            ledger.reservesOpening[i] = ledger.reserves[i]
            ledger.reservesPosted[i] = .zero
        }
        ledger.worldOpening = ledger.world
        ledger.worldPosted = .zero
        return failed
    }
}
