import SaneiCore

// The nominal ledger (§2.4, ADR 0003): every flow of money is a posting, in the unit of the account it lands in. Each
// government has accounts in its own currency (LCU) and FX reserves in dollars (USDn); each currency has its money
// base (§5.1); the world market has one dollar account. Per account, the change of the balance since the month opened
// equals the sum of the month's postings, in its own unit; the world account is exactly 0 after each monthly close.
//
// The types keep the units apart: an LCU amount can only be posted to an LCU account, a USDn amount to a USDn account,
// and constant dollars (`Money`) not at all. Two limits the types do not cover, so the ledger does: one currency's LCU
// from another's (a posting lands in the account's own currency, and a local transfer refuses two currencies), and a
// value rebuilt from another unit's `raw` (`LCU(raw: dollars.raw)`), which no code outside SaneiCore may write.
// Everything here that moves money is internal: the systems of this module post; nothing outside writes money.
// stdlib only.

public enum CurrencyKind {}

/// Why money moved. Every posting names one. The numbers are reserved for saves and never renumbered; the postings are
/// not stored by category yet (each one moves the balances and the month's sums): the sums per category come with the
/// budget's «لماذا؟» and the history (M2).
public enum PostingCategory: UInt16, Sendable, CaseIterable {
    case tax = 1
    case spending = 2
    /// One leg of a currency exchange at the day's rate.
    case fx = 3
    /// A change of value from a rate or a price index, written as a posting (with debt and reserves held in other
    /// currencies, M2).
    case revaluation = 4
    case trade = 5
    case transport = 6
    case aid = 7
    /// A currency moved its scale by 10^3: the whole change of each balance, its rounding included.
    case redenomination = 8
    /// Money from nowhere: reserved for the cheats (§5.11, M8). Nothing gates it yet.
    case cheat = 9
    case interest = 10
}

/// A government's accounts in its own currency. (The money base is the currency's, §5.1: `post(moneyBase:)`.)
public enum LocalAccount: UInt8, Sendable, CaseIterable {
    case treasury = 0
    case domesticDebt = 1
}

/// The dollar accounts: a government's FX reserves, or the world market's.
public enum DollarAccount: Sendable, Equatable {
    case reserves(GovRef)
    case world
}

/// The currencies (§2.3, §5.1): each an LCU in its own scale, with its exchange rate and price index kept as
/// logarithms, and its money base.
@frozen
public struct CurrencyTable: Sendable, Equatable {
    public static let capacity = 384
    /// One LCU unit is 10^k of the currency's own units (a UInt8: 85 redenominations, 10^255, are never reached).
    public internal(set) var scaleExponent: [UInt8]
    /// LCU units per USDn unit, as a logarithm.
    public internal(set) var rate: [LogQ]
    /// The price level, as a logarithm (1 in 2011).
    public internal(set) var priceIndex: [LogQ]
    public internal(set) var redenominations: [UInt16]
    /// True when one of the currency's balances has passed 2^60 today: it redenominates at the day's end.
    public internal(set) var redenominationDue: [Bool]
    /// The money base, in the currency's LCU, with the month's opening and postings.
    public internal(set) var moneyBase: [LCU]
    public internal(set) var moneyBaseOpening: [LCU]
    public internal(set) var moneyBasePosted: [LCU]

    public init() {
        scaleExponent = []
        rate = []
        priceIndex = []
        redenominations = []
        redenominationDue = []
        moneyBase = []
        moneyBaseOpening = []
        moneyBasePosted = []
        keepRoom()
    }

    /// Reserves every column to the cap (also before each append: see `PolityTable.keepRoom`).
    mutating func keepRoom() {
        scaleExponent.reserveCapacity(Self.capacity)
        rate.reserveCapacity(Self.capacity)
        priceIndex.reserveCapacity(Self.capacity)
        redenominations.reserveCapacity(Self.capacity)
        redenominationDue.reserveCapacity(Self.capacity)
        moneyBase.reserveCapacity(Self.capacity)
        moneyBaseOpening.reserveCapacity(Self.capacity)
        moneyBasePosted.reserveCapacity(Self.capacity)
    }

    public var count: Int { rate.count }

    func exists(_ c: Idx<CurrencyKind>) -> Bool { c.int < rate.count }

    /// Adds a currency; nil at the cap. Only `WorldState.addPolity` adds one, so a polity's currency is in its row
    /// (`WorldState.currency(of:)`); currency unions change that (M2).
    mutating func add(scaleExponent k: UInt8, rate r: LogQ) -> Idx<CurrencyKind>? {
        guard rate.count < Self.capacity else { return nil }
        keepRoom()
        scaleExponent.append(k)
        rate.append(r)
        priceIndex.append(.zero)
        redenominations.append(0)
        redenominationDue.append(false)
        moneyBase.append(.zero)
        moneyBaseOpening.append(.zero)
        moneyBasePosted.append(.zero)
        return Idx(raw: UInt16(rate.count - 1))
    }
}

/// The balances, one row per government row, and the world account. A dissolved government's balances stay, in their
/// currency's scale, until a new government takes the row: then they are dropped, unposted (the allocation of a
/// dissolved state's money and debts comes with the lifecycle effects and the stub packs, T-042). A successor keeps
/// the row (`succeedGovernment`), so its predecessor's balances are its own.
@frozen
public struct LedgerTable: Sendable, Equatable {
    public static let accountsPerRow = LocalAccount.allCases.count

    public internal(set) var currency: [Idx<CurrencyKind>]
    /// The local balances, two per government: [row * 2 + account].
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
        keepRoom()
    }

    /// Reserves every column to the cap (also before each append: see `PolityTable.keepRoom`).
    mutating func keepRoom() {
        let n = GovernmentTable.capacity
        let a = Self.accountsPerRow
        currency.reserveCapacity(n)
        local.reserveCapacity(a * n)
        reserves.reserveCapacity(n)
        localOpening.reserveCapacity(a * n)
        localPosted.reserveCapacity(a * n)
        reservesOpening.reserveCapacity(n)
        reservesPosted.reserveCapacity(n)
    }

    static func index(_ row: Int, _ account: LocalAccount) -> Int { row * accountsPerRow + Int(account.rawValue) }

    public func balance(_ row: Int, _ account: LocalAccount) -> LCU { local[Self.index(row, account)] }

    /// Opens the accounts of a government row: new, or reused after a dissolved government (its old balances are
    /// dropped). The starting treasury is not a posting: it is where the account starts, in the opening balance.
    mutating func open(row: Int, currency c: Idx<CurrencyKind>, treasury: LCU) {
        let a = Self.accountsPerRow
        if row == currency.count {
            keepRoom()
            currency.append(c)
            for _ in 0..<a {
                local.append(.zero)
                localOpening.append(.zero)
                localPosted.append(.zero)
            }
            reserves.append(.zero)
            reservesOpening.append(.zero)
            reservesPosted.append(.zero)
        } else {
            currency[row] = c
            for k in 0..<a {
                local[row * a + k] = .zero
                localOpening[row * a + k] = .zero
                localPosted[row * a + k] = .zero
            }
            reserves[row] = .zero
            reservesOpening[row] = .zero
            reservesPosted[row] = .zero
        }
        local[Self.index(row, .treasury)] = treasury
        localOpening[Self.index(row, .treasury)] = treasury
    }
}

extension WorldState {
    /// Posts an amount in a government's own currency to one of its accounts. False, nothing posted and the refusal
    /// counted (`world.refusedPostings`), when the government no longer exists: a flow from a government that has
    /// ended moves nothing. A balance past 2^60 marks its currency to redenominate at the day's end.
    @discardableResult
    mutating func post(_ g: GovRef, _ account: LocalAccount, _ category: PostingCategory, _ amount: LCU) -> Bool {
        guard governments.isLive(g) else { world.refusedPostings &+= 1; return false }
        let i = LedgerTable.index(g.row.int, account)
        ledger.local[i] += amount
        ledger.localPosted[i] += amount
        if ledger.local[i].needsRedenomination { currencies.redenominationDue[ledger.currency[g.row.int].int] = true }
        return true
    }

    /// Posts an amount to a currency's money base, in that currency's LCU. False, and counted, for no such currency.
    @discardableResult
    mutating func post(moneyBase c: Idx<CurrencyKind>, _ category: PostingCategory, _ amount: LCU) -> Bool {
        guard currencies.exists(c) else { world.refusedPostings &+= 1; return false }
        currencies.moneyBase[c.int] += amount
        currencies.moneyBasePosted[c.int] += amount
        if currencies.moneyBase[c.int].needsRedenomination { currencies.redenominationDue[c.int] = true }
        return true
    }

    /// Posts an amount in dollars to a dollar account. Dollars never redenominate (a dollar hyperinflation has no
    /// rule). False, and counted, for the reserves of a government that no longer exists.
    @discardableResult
    mutating func post(_ account: DollarAccount, _ category: PostingCategory, _ amount: USDn) -> Bool {
        switch account {
        case let .reserves(g):
            guard governments.isLive(g) else { world.refusedPostings &+= 1; return false }
            ledger.reserves[g.row.int] += amount
            ledger.reservesPosted[g.row.int] += amount
        case .world:
            ledger.world += amount
            ledger.worldPosted += amount
        }
        return true
    }

    /// Moves local currency between two governments' accounts (one government's two accounts included): two postings
    /// that cancel. Both sides are checked first, alive and in one currency; otherwise nothing moves, and false.
    @discardableResult
    mutating func transfer(from: (GovRef, LocalAccount), to: (GovRef, LocalAccount), _ category: PostingCategory, _ amount: LCU) -> Bool {
        guard governments.isLive(from.0), governments.isLive(to.0),
              ledger.currency[from.0.row.int] == ledger.currency[to.0.row.int] else { world.refusedPostings &+= 1; return false }
        post(from.0, from.1, category, -amount)
        post(to.0, to.1, category, amount)
        return true
    }

    /// Moves dollars from one dollar account to another: two postings that cancel, so no dollar is made or lost. Both
    /// sides are checked first; nothing moves, and false, when either is a government that no longer exists.
    @discardableResult
    mutating func transfer(from: DollarAccount, to: DollarAccount, _ category: PostingCategory, _ amount: USDn) -> Bool {
        if case let .reserves(g) = from, !governments.isLive(g) { world.refusedPostings &+= 1; return false }
        if case let .reserves(g) = to, !governments.isLive(g) { world.refusedPostings &+= 1; return false }
        post(from, category, -amount)
        post(to, category, amount)
        return true
    }

    /// Changes local currency from a government's treasury into dollars in its reserves (a positive amount), or
    /// dollars into local currency (a negative one), at the day's rate: two postings under `fx`, each exact in its own
    /// unit, and their values equal at the rate to within the rounding of the dollar leg. Returns the dollars posted
    /// to the reserves (negative when sold). Nil, and nothing moves, when the government no longer exists or when the
    /// dollar leg would round to 0 (so local currency is never given for nothing). No balance is checked: whether a
    /// treasury or the reserves may go below 0 is the economy's rule (M2). An exchange set by its dollar side, for an
    /// exact bill in dollars, comes with trade settlement (M2).
    @discardableResult
    mutating func exchange(_ g: GovRef, local amount: LCU) -> USDn? {
        guard governments.isLive(g) else { world.refusedPostings &+= 1; return nil }
        let rate = currencies.rate[ledger.currency[g.row.int].int]
        let dollars = USDn(raw: (-rate).applied(to: amount.raw))
        if dollars == .zero && amount != .zero { world.refusedPostings &+= 1; return nil }
        post(g, .treasury, .fx, -amount)
        post(.reserves(g), .fx, dollars)
        return dollars
    }

    /// Redenominates every currency marked today (the pipeline calls it at the day's end, after every posting of the
    /// day, so a flow of several postings is all in one scale; Int64 leaves 8 times 2^60 of room for the rest of the
    /// day).
    mutating func redenominateDue() {
        for c in 0..<currencies.count where currencies.redenominationDue[c] {
            redenominate(Idx(raw: UInt16(c)))
        }
    }

    /// Moves a currency's scale by 10^3: every LCU amount in that currency is divided by 1,000 to the nearest unit.
    /// That is every local balance of every government row in it (dissolved rows included), its money base, its
    /// governments' tax bases, and the LCU fields of the commands waiting to make a government in it; the change of
    /// each balance is posted under `redenomination` (the month's sums then span the change of scale: M2's inflation,
    /// its pass-through and the money base's growth must take the step out, by `scaleExponent`). The rate and the
    /// price index follow, by log2(1/1000) to within 4e-7, so values at the rate drift by about 3e-7 per
    /// redenomination. The count in `redenominations` is the log; a notification comes with the notification ring
    /// (M1b).
    mutating func redenominate(_ c: Idx<CurrencyKind>) {
        let a = LedgerTable.accountsPerRow
        for row in 0..<ledger.currency.count where ledger.currency[row] == c {
            for k in 0..<a {
                let i = row * a + k
                let old = ledger.local[i]
                let new = old.times(1, over: 1_000)
                ledger.local[i] = new
                ledger.localPosted[i] += new - old
            }
            governments.rescaleTaxBase(row: row)
        }
        let old = currencies.moneyBase[c.int]
        let new = old.times(1, over: 1_000)
        currencies.moneyBase[c.int] = new
        currencies.moneyBasePosted[c.int] += new - old
        for i in 0..<pending.count {
            if case let .createGovernment(p, treasury, taxBase, rate) = pending[i].command, currency(of: p) == c {
                pending[i].command = .createGovernment(polity: p, treasury: treasury.times(1, over: 1_000),
                                                       taxBase: taxBase.times(1, over: 1_000), taxRate: rate)
            }
        }
        currencies.scaleExponent[c.int] &+= 3
        currencies.rate[c.int] += LogQ(ratio: 1, 1_000)
        currencies.priceIndex[c.int] += LogQ(ratio: 1, 1_000)
        currencies.redenominations[c.int] &+= 1
        currencies.redenominationDue[c.int] = false
    }

    /// What the ledger's invariants say: an empty list when they hold. The monthly close asks it in every build (a
    /// walk of the columns once a month); tests, debug builds and replays may ask it at any time. A balance that
    /// clamped breaks its invariant on purpose: money past the range was lost, and the close counts it.
    public func ledgerViolations() -> [String] {
        var out: [String] = []
        let l = ledger
        let a = LedgerTable.accountsPerRow
        for i in 0..<l.local.count where l.local[i] - l.localOpening[i] != l.localPosted[i] {
            let account = LocalAccount(rawValue: UInt8(i % a))!
            out.append("government row \(i / a), \(account): balance moved \(l.local[i] - l.localOpening[i]), postings \(l.localPosted[i])")
        }
        for i in 0..<l.reserves.count where l.reserves[i] - l.reservesOpening[i] != l.reservesPosted[i] {
            out.append("government row \(i), reserves: balance moved \(l.reserves[i] - l.reservesOpening[i]), postings \(l.reservesPosted[i])")
        }
        let c = currencies
        for i in 0..<c.count where c.moneyBase[i] - c.moneyBaseOpening[i] != c.moneyBasePosted[i] {
            out.append("currency \(i), money base: moved \(c.moneyBase[i] - c.moneyBaseOpening[i]), postings \(c.moneyBasePosted[i])")
        }
        if l.world - l.worldOpening != l.worldPosted { out.append("world account: moved \(l.world - l.worldOpening), postings \(l.worldPosted)") }
        return out
    }

    /// Closes the month: checks the invariants (the world account must be exactly 0), then opens the next month at
    /// the balances as they are. Returns what failed: empty when everything held. A world account left owed fails
    /// every close until it is settled, so the count of failed closes is not a count of faults.
    mutating func closeMonth() -> [String] {
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
        for i in 0..<currencies.count {
            currencies.moneyBaseOpening[i] = currencies.moneyBase[i]
            currencies.moneyBasePosted[i] = .zero
        }
        ledger.worldOpening = ledger.world
        ledger.worldPosted = .zero
        return failed
    }
}
