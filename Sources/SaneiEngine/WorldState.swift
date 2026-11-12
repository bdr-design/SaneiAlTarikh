import SaneiCore

// The simulation's state (§2.4): a value made of column tables, one array per column, so a day walks memory in order
// and a copy (a snapshot for a save, the AI's view) is a set of shared arrays until one side writes. Every table has a
// hard cap (L3). More column groups join these tables as their systems arrive in M1a; each is declared with a default
// for every row, so an old save loads into a new version. stdlib only, through SaneiCore.

/// The kind names of the dense tables (they hold nothing).
public enum PolityKind {}
public enum GovernmentKind {}
public enum ProvinceKind {}

/// The world's one row: the date, the game's seed and the counters every system shares.
@frozen
public struct WorldRow: Sendable, Equatable {
    /// The day the next step runs.
    public internal(set) var date: GameDate
    /// The game's seed (`DetRNG`).
    public internal(set) var seed: UInt64
    /// The calendar jobs run so far (§2.4 step 2), by kind: month starts, quarter starts, year starts.
    public internal(set) var monthStarts: UInt32
    public internal(set) var quarterStarts: UInt32
    public internal(set) var yearStarts: UInt32
    /// Monthly closes at which the ledger's invariants did not hold (0 in every game; §8 checks it).
    public internal(set) var ledgerFailures: UInt32
    /// Commands refused when their day came (their government ended meanwhile, say). Only the count is kept here; the
    /// record of which order was refused and why comes with the notification ring (M1c), which screen 26 reads.
    public internal(set) var refusedCommands: UInt32
    /// Postings refused: a flow from or to a government that has ended, a local transfer across two currencies, an
    /// exchange whose dollar leg rounds to 0. Money never vanishes silently: each refusal is counted here.
    public internal(set) var refusedPostings: UInt32
    /// Commands of the AI and events refused when submitted (late, full, a key taken, unwritable, an issuer that has
    /// ended): kept in the state so no effect is dropped without a trace. The player's refusals are shown to the player.
    public internal(set) var refusedSubmits: UInt32

    public init(date: GameDate, seed: UInt64) {
        self.date = date
        self.seed = seed
        monthStarts = 0
        quarterStarts = 0
        yearStarts = 0
        ledgerFailures = 0
        refusedCommands = 0
        refusedPostings = 0
        refusedSubmits = 0
    }
}

/// The polities (states): dense rows up to the cap, each with its serial. A polity's row is never reused, so a bare
/// index to one stays good; the cap is therefore for the whole game, not at one time.
@frozen
public struct PolityTable: Sendable, Equatable {
    /// L3's cap.
    public static let capacity = 384
    public internal(set) var exists: [Bool]
    public internal(set) var serial: [Serial]
    public internal(set) var counter: SerialCounter

    public init() {
        exists = []
        serial = []
        counter = SerialCounter()
        keepRoom()
    }

    /// Reserves every column to the cap. Called before each append as well: a column first written by subscript after
    /// a copy of the state was taken keeps only its count's room, and would otherwise grow past the cap in steps.
    mutating func keepRoom() {
        exists.reserveCapacity(Self.capacity)
        serial.reserveCapacity(Self.capacity)
    }

    public var count: Int { exists.count }

    /// Adds a polity; nil at the cap or when the serials have run out.
    public mutating func add() -> Idx<PolityKind>? {
        guard exists.count < Self.capacity, let s = counter.take() else { return nil }
        keepRoom()
        exists.append(true)
        serial.append(s)
        return Idx(raw: UInt16(exists.count - 1))
    }

    public func isLive(_ p: Idx<PolityKind>) -> Bool { p.int < exists.count && exists[p.int] }
}

/// A government, as its row and its serial: a reference that a dissolved government's successor in the same row does
/// not answer to.
@frozen
public struct GovRef: Sendable, Hashable {
    public var row: Idx<GovernmentKind>
    public var serial: Serial
    public init(row: Idx<GovernmentKind>, serial: Serial) {
        self.row = row
        self.serial = serial
    }
}

/// The governments (§2.4): dense rows up to the cap. A dissolved government's row is free for the next one, which gets
/// a new serial, so an old reference finds nothing (`GovRef`).
@frozen
public struct GovernmentTable: Sendable, Equatable {
    /// L3's cap.
    public static let capacity = 384
    /// Monthly slots are the days 1 to 28: every month has them.
    public static let slots: UInt8 = 28
    /// A month the government has not run in yet: lower than any month index.
    public static let never: Int32 = .min

    public internal(set) var exists: [Bool]
    public internal(set) var serial: [Serial]
    public internal(set) var polity: [Idx<PolityKind>]
    // scheduling (§2.4)
    public internal(set) var monthlySlot: [UInt8]
    /// The month index (year × 12 + month − 1) of the last monthly run.
    public internal(set) var lastMonthlyRun: [Int32]
    /// The year of the last yearly run.
    public internal(set) var lastYearlyRun: [Int32]
    public internal(set) var aiNextStrategic: [GameDate]
    // a thin fiscal set (the balances live in the ledger; the 9 budget lines come with M2)
    public internal(set) var taxRate: [BP]
    /// What a month's taxes are levied on, in the government's currency.
    public internal(set) var taxBase: [LCU]
    // what the thin systems count
    public internal(set) var monthlyRuns: [UInt32]
    public internal(set) var yearlyRuns: [UInt32]
    public internal(set) var strategicRuns: [UInt32]
    public internal(set) var counter: SerialCounter

    public init() {
        exists = []
        serial = []
        polity = []
        monthlySlot = []
        lastMonthlyRun = []
        lastYearlyRun = []
        aiNextStrategic = []
        taxRate = []
        taxBase = []
        monthlyRuns = []
        yearlyRuns = []
        strategicRuns = []
        counter = SerialCounter()
        keepRoom()
    }

    /// Reserves every column to the cap (also before each append: see `PolityTable.keepRoom`).
    mutating func keepRoom() {
        let n = Self.capacity
        exists.reserveCapacity(n)
        serial.reserveCapacity(n)
        polity.reserveCapacity(n)
        monthlySlot.reserveCapacity(n)
        lastMonthlyRun.reserveCapacity(n)
        lastYearlyRun.reserveCapacity(n)
        aiNextStrategic.reserveCapacity(n)
        taxRate.reserveCapacity(n)
        taxBase.reserveCapacity(n)
        monthlyRuns.reserveCapacity(n)
        yearlyRuns.reserveCapacity(n)
        strategicRuns.reserveCapacity(n)
    }

    /// Rows made so far, live or dissolved.
    public var rows: Int { exists.count }

    public func isLive(_ g: GovRef) -> Bool {
        g.row.int < exists.count && exists[g.row.int] && serial[g.row.int] == g.serial
    }

    public func ref(_ row: Int) -> GovRef { GovRef(row: Idx(raw: UInt16(row)), serial: serial[row]) }


    /// The slot rule for a new government (§2.4): the least-loaded slot whose day has not passed this month (today's
    /// counts: the monthly step comes after the commands); of two equally loaded, the earlier day. When none is left
    /// (the 29th to the 31st), the least-loaded slot overall, and the first run is next month.
    func slot(forNewOn date: GameDate) -> (slot: UInt8, firstRunNextMonth: Bool) {
        // the load of every slot in one pass over the rows, counted on the stack
        var load = (0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        withUnsafeMutableBytes(of: &load) { b in
            let counts = b.bindMemory(to: Int.self)
            for i in 0..<exists.count where exists[i] { counts[Int(monthlySlot[i]) - 1] += 1 }
        }
        let today = date.day
        let nextMonth = today > Int(Self.slots)
        let first = nextMonth ? 1 : today
        return withUnsafeBytes(of: &load) { b in
            let counts = b.bindMemory(to: Int.self)
            var best = first
            for d in first...Int(Self.slots) where counts[d - 1] < counts[best - 1] { best = d }
            return (UInt8(best), nextMonth)
        }
    }

    /// Makes a government in the first free row; nil at the cap (every row live) or when the serials have run out.
    mutating func create(polity p: Idx<PolityKind>, on date: GameDate, taxBase b: LCU, taxRate r: BP,
                         strategicPeriod: Int) -> GovRef? {
        var row = -1
        for i in 0..<exists.count where !exists[i] { row = i; break }
        if row < 0 {
            guard exists.count < Self.capacity else { return nil }
            row = exists.count
        }
        guard let s = counter.take() else { return nil }
        let (slot, nextMonth) = slot(forNewOn: date)
        let civil = date.civil
        let month = Int32(civil.year * 12 + civil.month - 1)
        // first strategic look: spread over the period by serial, so governments made together do not all come due
        let firstLook = date.adding(days: Int(s.raw % UInt32(Swift.max(1, strategicPeriod))))
        if row == exists.count {
            keepRoom()
            exists.append(true); serial.append(s); polity.append(p); monthlySlot.append(slot)
            lastMonthlyRun.append(nextMonth ? month : Self.never); lastYearlyRun.append(Self.never)
            aiNextStrategic.append(firstLook); taxRate.append(r); taxBase.append(b)
            monthlyRuns.append(0); yearlyRuns.append(0); strategicRuns.append(0)
        } else {
            exists[row] = true; serial[row] = s; polity[row] = p; monthlySlot[row] = slot
            lastMonthlyRun[row] = nextMonth ? month : Self.never; lastYearlyRun[row] = Self.never
            aiNextStrategic[row] = firstLook; taxRate[row] = r; taxBase[row] = b
            monthlyRuns[row] = 0; yearlyRuns[row] = 0; strategicRuns[row] = 0
        }
        return ref(row)
    }

    mutating func dissolve(_ g: GovRef) {
        exists[g.row.int] = false
    }

    /// Divides a row's tax base by 1,000 to the nearest unit: its currency redenominated.
    mutating func rescaleTaxBase(row: Int) {
        taxBase[row] = taxBase[row].times(1, over: 1_000)
    }

    /// True while a new serial can be given (a create or a succession).
    var canTakeSerial: Bool { counter.next < UInt32.max }

    /// A government's successor takes its place: the same row with a new serial, so references to the one that
    /// ended no longer reach it, and everything the row holds carries over (the slot, the calendar, the policies,
    /// the due date of the strategic look); only the counts of runs start again. Nil when the serials have run out.
    mutating func succeed(_ g: GovRef) -> GovRef? {
        guard let s = counter.take() else { return nil }
        let row = g.row.int
        serial[row] = s
        monthlyRuns[row] = 0; yearlyRuns[row] = 0; strategicRuns[row] = 0
        return ref(row)
    }
}

/// The provinces (§2.4), as far as the skeleton needs them: who holds each one and its people.
@frozen
public struct ProvinceTable: Sendable, Equatable {
    public static let capacity = 3_300
    public internal(set) var sovereign: [Idx<PolityKind>]
    public internal(set) var administrator: [Idx<GovernmentKind>]
    public internal(set) var population: [Pop32]

    public init() {
        sovereign = []
        administrator = []
        population = []
        keepRoom()
    }

    /// Reserves every column to the cap (also before each append: see `PolityTable.keepRoom`).
    mutating func keepRoom() {
        sovereign.reserveCapacity(Self.capacity)
        administrator.reserveCapacity(Self.capacity)
        population.reserveCapacity(Self.capacity)
    }

    public var count: Int { sovereign.count }

    /// Adds a province; nil at the cap.
    public mutating func add(sovereign s: Idx<PolityKind>, administrator a: Idx<GovernmentKind>, population p: Pop32) -> Idx<ProvinceKind>? {
        guard sovereign.count < Self.capacity else { return nil }
        keepRoom()
        sovereign.append(s)
        administrator.append(a)
        population.append(p)
        return Idx(raw: UInt16(sovereign.count - 1))
    }
}

/// The whole state of one game.
@frozen
public struct WorldState: Sendable, Equatable {
    public internal(set) var world: WorldRow
    public internal(set) var polities: PolityTable
    public internal(set) var governments: GovernmentTable
    public internal(set) var provinces: ProvinceTable
    public internal(set) var currencies: CurrencyTable
    public internal(set) var ledger: LedgerTable
    /// The commands waiting for their day (§2.4 lists the queue with the state: a save keeps it).
    public internal(set) var pending: [IssuedCommand]
    // The game's count of clamped results lives with the host, not here: it is not state that a save restores.

    public init(start: GameDate, seed: UInt64) {
        world = WorldRow(date: start, seed: seed)
        polities = PolityTable()
        governments = GovernmentTable()
        provinces = ProvinceTable()
        currencies = CurrencyTable()
        ledger = LedgerTable()
        pending = []
        pending.reserveCapacity(Simulation.queueCapacity)
    }

    /// Adds a polity, with its currency: a scenario's set-up, before the simulation starts (the lifecycle effects that
    /// make polities, independence and unification, come with content, T-042). A polity's row is never reused, so its
    /// currency's row is its own: both tables have the same cap.
    public mutating func addPolity() -> Idx<PolityKind>? {
        guard polities.count < PolityTable.capacity, currencies.count < CurrencyTable.capacity, let p = polities.add() else { return nil }
        _ = currencies.add(scaleExponent: 0, rate: .zero)
        return p
    }

    /// The currency a polity's governments use (currency unions come with M2).
    public func currency(of p: Idx<PolityKind>) -> Idx<CurrencyKind> { Idx(raw: p.raw) }

    /// Makes a government for a polity, with its accounts open: the treasury starts at `treasury`, the rest at 0.
    mutating func createGovernment(polity p: Idx<PolityKind>, treasury: LCU, taxBase: LCU, taxRate: BP, strategicPeriod: Int) -> GovRef? {
        guard let g = governments.create(polity: p, on: world.date, taxBase: taxBase, taxRate: taxRate, strategicPeriod: strategicPeriod) else {
            return nil
        }
        ledger.open(row: g.row.int, currency: currency(of: p), treasury: treasury)
        return g
    }

    /// The player's waiting orders given for `old` become `new`'s: the issuer and, for an order about `old` itself, its
    /// target. Their place in the queue moves with the issuer's new serial (an insertion pass, in place: no allocation).
    mutating func handOverPlayerOrders(from old: GovRef, to new: GovRef) {
        var changed = false
        for i in 0..<pending.count where pending[i].issuer == .player(old) {
            pending[i].issuer = .player(new)
            if case let .setTaxRate(target, rate) = pending[i].command, target == old {
                pending[i].command = .setTaxRate(government: new, rate: rate)
            }
            changed = true
        }
        guard changed else { return }
        for i in 1..<Swift.max(1, pending.count) {
            let c = pending[i]
            var j = i - 1
            while j >= 0 && IssuedCommand.precedes(c, pending[j]) {
                pending[j + 1] = pending[j]
                j -= 1
            }
            pending[j + 1] = c
        }
    }

    /// Adds a province (a scenario's set-up); nil when the polity or the government does not exist, or at the cap.
    public mutating func addProvince(sovereign s: Idx<PolityKind>, administrator a: GovRef, population p: Pop32) -> Idx<ProvinceKind>? {
        guard polities.isLive(s), governments.isLive(a) else { return nil }
        return provinces.add(sovereign: s, administrator: a.row, population: p)
    }

    /// The hash of every column (§8): equal states give equal hashes on every platform. Only for tests, debug builds
    /// and replays: a day never pays for it.
    public var hash: UInt64 {
        var h = StateHasher()
        h.combine(Int64(world.date.days))
        h.combine(world.seed)
        h.combine(world.monthStarts)
        h.combine(world.quarterStarts)
        h.combine(world.yearStarts)
        h.combine(world.ledgerFailures)
        h.combine(world.refusedCommands)
        h.combine(world.refusedPostings)
        h.combine(world.refusedSubmits)
        let p = polities
        h.combine(UInt64(p.count))
        for i in 0..<p.count {
            h.combine(p.exists[i])
            h.combine(p.serial[i].raw)
        }
        h.combine(p.counter.next)
        let g = governments
        h.combine(UInt64(g.rows))
        for i in 0..<g.rows {
            h.combine(g.exists[i])
            h.combine(g.serial[i].raw)
            h.combine(g.polity[i].raw)
            h.combine(g.monthlySlot[i])
            h.combine(g.lastMonthlyRun[i])
            h.combine(g.lastYearlyRun[i])
            h.combine(Int64(g.aiNextStrategic[i].days))
            h.combine(g.taxRate[i].raw)
            h.combine(g.taxBase[i].raw)
            h.combine(g.monthlyRuns[i])
            h.combine(g.yearlyRuns[i])
            h.combine(g.strategicRuns[i])
        }
        h.combine(g.counter.next)
        let v = provinces
        h.combine(UInt64(v.count))
        for i in 0..<v.count {
            h.combine(v.sovereign[i].raw)
            h.combine(v.administrator[i].raw)
            h.combine(v.population[i].raw)
        }
        let c = currencies
        h.combine(UInt64(c.count))
        for i in 0..<c.count {
            h.combine(c.scaleExponent[i])
            h.combine(c.rate[i].raw)
            h.combine(c.priceIndex[i].raw)
            h.combine(c.redenominations[i])
            h.combine(c.redenominationDue[i])
            h.combine(c.moneyBase[i].raw)
            h.combine(c.moneyBaseOpening[i].raw)
            h.combine(c.moneyBasePosted[i].raw)
        }
        let l = ledger
        h.combine(UInt64(l.currency.count))
        for i in 0..<l.currency.count {
            h.combine(l.currency[i].raw)
            h.combine(l.reserves[i].raw)
            h.combine(l.reservesOpening[i].raw)
            h.combine(l.reservesPosted[i].raw)
        }
        for i in 0..<l.local.count {
            h.combine(l.local[i].raw)
            h.combine(l.localOpening[i].raw)
            h.combine(l.localPosted[i].raw)
        }
        h.combine(l.world.raw)
        h.combine(l.worldOpening.raw)
        h.combine(l.worldPosted.raw)
        // the waiting commands, as their stored bytes
        h.combine(UInt64(pending.count))
        for c in pending {
            var w = ByteWriter()
            c.write(to: &w)
            h.combine(w.bytes)
        }
        return h.value
    }
}
