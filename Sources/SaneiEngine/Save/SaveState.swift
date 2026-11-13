import SaneiCore

// The state's chunks (§7): `WorldState` into a `SaveTree` and back. Every value read is checked against the rules the
// running game keeps (rows within caps, serials given by their counters and never twice, references in range, runs
// not ahead of the date, the ledger's invariants, the waiting commands in order and within their rooms), so a bad or
// forged file is refused, never trusted, and a state that loads keeps every rule the game checks. A missing column
// takes its default (`SaveDefaults`), except the required columns; an unknown chunk, an unknown column and a
// command of an unknown tag or issuer rank are skipped and reported. Each table is one chunk with one row count (the world row's
// values, the world account's included, are in `WRLD`); a value per account is a column per account, by its stored
// name, so an account added later is a column added. stdlib only.

/// Every column the engine writes, with its default: a missing column takes it, for every row (§7). `nil` marks a column
/// every save has (a date, a serial, a table's row-defining column, a column with no meaningful default): a save
/// without it is refused. A test fails when a
/// written column is not here, or a stored property of the state is not written.
enum SaveDefaults {
    static let all: [(chunk: String, column: String, value: Int64?)] = {
        var a: [(chunk: String, column: String, value: Int64?)] = [
            ("WRLD", "date", nil), ("WRLD", "seed", nil), ("WRLD", "monthStarts", 0), ("WRLD", "quarterStarts", 0), ("WRLD", "yearStarts", 0),
            ("WRLD", "ledgerFailures", 0), ("WRLD", "refusedCommands", 0), ("WRLD", "refusedPostings", 0), ("WRLD", "refusedSubmits", 0),
            ("WRLD", "worldAccount", 0), ("WRLD", "worldAccountOpening", 0), ("WRLD", "worldAccountPosted", 0),
            ("SERL", "polities", nil), ("SERL", "governments", nil),
            ("POLI", "exists", 1), ("POLI", "serial", nil),
            ("GOVT", "exists", 0), ("GOVT", "serial", nil), ("GOVT", "polity", nil), ("GOVT", "monthlySlot", 1),
            ("GOVT", "lastMonthlyRun", Int64(GovernmentTable.never)), ("GOVT", "lastYearlyRun", Int64(GovernmentTable.never)),
            ("GOVT", "aiNextStrategic", nil), ("GOVT", "taxRate", 0), ("GOVT", "taxBase", 0),
            ("GOVT", "monthlyRuns", 0), ("GOVT", "yearlyRuns", 0), ("GOVT", "strategicRuns", 0),
            ("PROV", "sovereign", nil), ("PROV", "administrator", Int64(Idx<GovernmentKind>.absent.raw)), ("PROV", "population", 0),
            ("CURR", "scaleExponent", 0), ("CURR", "rate", nil), ("CURR", "priceIndex", 0), ("CURR", "redenominations", 0),
            ("CURR", "redenominationDue", 0), ("CURR", "moneyBase", 0), ("CURR", "moneyBaseOpening", 0), ("CURR", "moneyBasePosted", 0),
            ("LEDG", "currency", nil), ("LEDG", "reserves", 0), ("LEDG", "reservesOpening", 0), ("LEDG", "reservesPosted", 0),
            ("CMDQ", "commands", 0),
        ]
        for account in LocalAccount.allCases {
            for suffix in ["", "Opening", "Posted"] { a.append(("LEDG", account.saveName + suffix, 0)) }
        }
        return a
    }()

    /// The column's entry: nil when the engine does not write it; `.some(nil)` for a required column.
    static func entry(_ chunk: String, _ column: String) -> Int64?? {
        guard let e = all.first(where: { $0.chunk == chunk && $0.column == column }) else { return nil }
        return .some(e.value)
    }
}

extension LocalAccount {
    /// The account's stored name in a save: never changed when the Swift case is renamed.
    var saveName: String {
        switch self {
        case .treasury: return "treasury"
        case .domesticDebt: return "domesticDebt"
        }
    }
}

extension WorldState {
    /// The current format of the state's chunks.
    public static let saveFormat: UInt16 = 1

    /// The state as a tree of the current format.
    public func saveTree() -> SaveTree {
        let g = governments, l = ledger, c = currencies, v = provinces
        func one<T: FixedWidthInteger>(_ n: String, _ x: T, _ t: SaveType) -> SaveColumn { .of(n, [x], t, .zigzag) }
        let wrld = SaveChunk(tag: "WRLD", columns: [
            one("date", Int64(world.date.days), .i32), one("seed", Int64(bitPattern: world.seed), .u64),
            one("monthStarts", Int64(world.monthStarts), .u32), one("quarterStarts", Int64(world.quarterStarts), .u32),
            one("yearStarts", Int64(world.yearStarts), .u32), one("ledgerFailures", Int64(world.ledgerFailures), .u32),
            one("refusedCommands", Int64(world.refusedCommands), .u32), one("refusedPostings", Int64(world.refusedPostings), .u32),
            one("refusedSubmits", Int64(world.refusedSubmits), .u32),
            one("worldAccount", l.world.raw, .i64), one("worldAccountOpening", l.worldOpening.raw, .i64),
            one("worldAccountPosted", l.worldPosted.raw, .i64),
        ])
        let serl = SaveChunk(tag: "SERL", columns: [
            .of("polities", [UInt64(polities.counter.next)], .u32, .raw), .of("governments", [UInt64(g.counter.next)], .u32, .raw),
        ])
        let poli = SaveChunk(tag: "POLI", columns: [
            .flags("exists", polities.exists), .of("serial", polities.serial.map { UInt64($0.raw) }, .u32, .varintDelta),
        ])
        let govt = SaveChunk(tag: "GOVT", columns: [
            .flags("exists", g.exists), .of("serial", g.serial.map { UInt64($0.raw) }, .u32, .varintDelta),
            .of("polity", g.polity.map { UInt64($0.raw) }, .u16, .varintDelta), .of("monthlySlot", g.monthlySlot, .u8, .raw),
            .of("lastMonthlyRun", g.lastMonthlyRun.map { Int64($0) }, .i32, .zigzag),
            .of("lastYearlyRun", g.lastYearlyRun.map { Int64($0) }, .i32, .zigzag),
            .of("aiNextStrategic", g.aiNextStrategic.map { Int64($0.days) }, .i32, .zigzag),
            .of("taxRate", g.taxRate.map { Int64($0.raw) }, .i32, .zigzag), .of("taxBase", g.taxBase.map { $0.raw }, .i64, .zigzag),
            .of("monthlyRuns", g.monthlyRuns.map { UInt64($0) }, .u32, .varintDelta),
            .of("yearlyRuns", g.yearlyRuns.map { UInt64($0) }, .u32, .varintDelta),
            .of("strategicRuns", g.strategicRuns.map { UInt64($0) }, .u32, .varintDelta),
        ])
        let prov = SaveChunk(tag: "PROV", columns: [
            .of("sovereign", v.sovereign.map { UInt64($0.raw) }, .u16, .varintDelta),
            .of("administrator", v.administrator.map { UInt64($0.raw) }, .u16, .varintDelta),
            .of("population", v.population.map { Int64($0.raw) }, .i32, .zigzag),
        ])
        let curr = SaveChunk(tag: "CURR", columns: [
            .of("scaleExponent", c.scaleExponent.map { UInt64($0) }, .u16, .varintDelta), .of("rate", c.rate.map { $0.raw }, .i64, .zigzag),
            .of("priceIndex", c.priceIndex.map { $0.raw }, .i64, .zigzag),
            .of("redenominations", c.redenominations.map { UInt64($0) }, .u16, .varintDelta), .flags("redenominationDue", c.redenominationDue),
            .of("moneyBase", c.moneyBase.map { $0.raw }, .i64, .zigzag), .of("moneyBaseOpening", c.moneyBaseOpening.map { $0.raw }, .i64, .zigzag),
            .of("moneyBasePosted", c.moneyBasePosted.map { $0.raw }, .i64, .zigzag),
        ])
        var ledgColumns: [SaveColumn] = [
            .of("currency", l.currency.map { UInt64($0.raw) }, .u16, .varintDelta),
            .of("reserves", l.reserves.map { $0.raw }, .i64, .zigzag), .of("reservesOpening", l.reservesOpening.map { $0.raw }, .i64, .zigzag),
            .of("reservesPosted", l.reservesPosted.map { $0.raw }, .i64, .zigzag),
        ]
        let a = LedgerTable.accountsPerRow
        for account in LocalAccount.allCases {
            let k = Int(account.rawValue)
            func column(_ values: [LCU]) -> [Int64] { stride(from: k, to: values.count, by: a).map { values[$0].raw } }
            ledgColumns.append(.of(account.saveName, column(l.local), .i64, .zigzag))
            ledgColumns.append(.of(account.saveName + "Opening", column(l.localOpening), .i64, .zigzag))
            ledgColumns.append(.of(account.saveName + "Posted", column(l.localPosted), .i64, .zigzag))
        }
        let ledg = SaveChunk(tag: "LEDG", columns: ledgColumns)
        // every command with its length, into one writer (one scratch writer for each command's bytes, reused)
        var items = ByteWriter(capacity: pending.count * 48)
        var one = ByteWriter(capacity: 64)
        for c in pending {
            one.removeAll()
            c.write(to: &one)
            items.varint(UInt64(one.bytes.count))
            items.bytes.append(contentsOf: one.bytes)
        }
        let cmdq = SaveChunk(tag: "CMDQ", columns: [SaveColumn(name: "commands", type: .items, encoding: .raw, count: pending.count, data: items.bytes)])
        return SaveTree(formatVersion: Self.saveFormat, chunks: [wrld, serl, poli, govt, prov, curr, ledg, cmdq])
    }

    /// A state from a tree of the current format (migrate older trees first: `SaveMigrations`). Nil when any value
    /// breaks a rule the running game keeps; `report` says what was skipped or defaulted.
    public static func load(_ tree: SaveTree, report: inout SaveReport) -> WorldState? {
        guard tree.formatVersion == saveFormat else { return nil }
        var l = Loader(tree: tree)
        l.report = report                                          // what META's read already reported stays
        let state = l.state()
        report = l.report
        return state
    }
}

/// Reads one tree into a state, checking as it goes.
struct Loader {
    let tree: SaveTree
    var report = SaveReport()
    static let known: [String: [String]] = {
        var k: [String: [String]] = [:]
        for d in SaveDefaults.all { k[d.chunk, default: []].append(d.column) }
        return k
    }()

    init(tree: SaveTree) { self.tree = tree }

    /// The column's values as Int64, `rows` of them: the stored ones (of the stored type, exactly `rows`), or the
    /// default for every row when the column is missing. Nil when the column is there but wrong.
    mutating func ints(_ tag: String, _ name: String, _ type: SaveType, rows: Int) -> [Int64]? {
        guard let col = tree.chunk(tag)?.column(name) else {
            // a required column is in every save; any other column takes its default
            guard let entry = SaveDefaults.entry(tag, name), let d = entry else { return nil }
            report.defaulted.append("\(tag).\(name)")
            return [Int64](repeating: d, count: rows)
        }
        guard col.count == rows else { return nil }
        let (lo, hi) = Self.range(type)
        switch type {
        case .u8, .u16, .u32, .u64:
            guard let v = col.values(UInt64.self, as: type, atMost: rows) else { return nil }
            var out: [Int64] = []
            out.reserveCapacity(rows)
            for x in v {
                guard type == .u64 || x <= UInt64(hi) else { return nil }
                out.append(Int64(bitPattern: x))
            }
            return out
        case .i8, .i16, .i32, .i64:
            guard let v = col.values(Int64.self, as: type, atMost: rows), v.allSatisfy({ $0 >= lo && $0 <= hi }) else { return nil }
            return v
        case .bool:
            guard let f = col.flags(atMost: rows) else { return nil }
            return f.map { $0 ? 1 : 0 }
        case .items:
            return nil
        }
    }

    /// The values as the table's column, reserved to the cap at once (so the table keeps its room with no second copy).
    func filled<V, X>(_ values: [V], _ cap: Int, _ f: (V) -> X) -> [X] {
        var out: [X] = []
        out.reserveCapacity(Swift.max(cap, values.count))
        for v in values { out.append(f(v)) }
        return out
    }

    static func range(_ t: SaveType) -> (Int64, Int64) {
        switch t {
        case .u8: return (0, Int64(UInt8.max))
        case .u16: return (0, Int64(UInt16.max))
        case .u32: return (0, Int64(UInt32.max))
        case .i8: return (Int64(Int8.min), Int64(Int8.max))
        case .i16: return (Int64(Int16.min), Int64(Int16.max))
        case .i32: return (Int64(Int32.min), Int64(Int32.max))
        default: return (.min, .max)
        }
    }

    /// The number of rows of a table: its key column's count (0 when the table's chunk or key is missing).
    func rows(_ tag: String, key: String) -> Int { tree.chunk(tag)?.column(key)?.count ?? 0 }

    mutating func noteUnknown() {
        for c in tree.chunks {
            guard let cols = Self.known[c.tag] else { report.skipped.append(c.tag); continue }
            for col in c.columns where !cols.contains(col.name) { report.skipped.append("\(c.tag).\(col.name)") }
        }
    }

    mutating func state() -> WorldState? {
        noteUnknown()
        // the world row
        guard let w = ints("WRLD", "date", .i32, rows: 1), let seed = ints("WRLD", "seed", .u64, rows: 1),
              let ms = ints("WRLD", "monthStarts", .u32, rows: 1), let qs = ints("WRLD", "quarterStarts", .u32, rows: 1),
              let ys = ints("WRLD", "yearStarts", .u32, rows: 1), let lf = ints("WRLD", "ledgerFailures", .u32, rows: 1),
              let rc = ints("WRLD", "refusedCommands", .u32, rows: 1), let rp = ints("WRLD", "refusedPostings", .u32, rows: 1),
              let rs = ints("WRLD", "refusedSubmits", .u32, rows: 1), let wa = ints("WRLD", "worldAccount", .i64, rows: 1),
              let wo = ints("WRLD", "worldAccountOpening", .i64, rows: 1), let wp = ints("WRLD", "worldAccountPosted", .i64, rows: 1)
        else { return nil }
        let date = GameDate(days: Int32(w[0]))
        guard date.isSupported else { return nil }
        var s = WorldState(start: date, seed: UInt64(bitPattern: seed[0]))
        s.world.monthStarts = UInt32(ms[0]); s.world.quarterStarts = UInt32(qs[0]); s.world.yearStarts = UInt32(ys[0])
        s.world.ledgerFailures = UInt32(lf[0]); s.world.refusedCommands = UInt32(rc[0]); s.world.refusedPostings = UInt32(rp[0])
        s.world.refusedSubmits = UInt32(rs[0])

        // the serial counters
        guard let pn = ints("SERL", "polities", .u32, rows: 1), let gn = ints("SERL", "governments", .u32, rows: 1),
              let pc = SerialCounter(saved: UInt32(pn[0])), let gc = SerialCounter(saved: UInt32(gn[0])) else { return nil }

        // the polities: rows never reused, so serials rise with the rows
        let np = rows("POLI", key: "serial")
        guard np <= PolityTable.capacity, let pe = ints("POLI", "exists", .bool, rows: np), let ps = ints("POLI", "serial", .u32, rows: np) else { return nil }
        for i in 0..<np {
            guard pc.hasGiven(Serial(raw: UInt32(ps[i]))), i == 0 || ps[i] > ps[i - 1] else { return nil }
        }
        s.polities.exists = filled(pe, PolityTable.capacity) { $0 == 1 }
        s.polities.serial = filled(ps, PolityTable.capacity) { Serial(raw: UInt32($0)) }
        s.polities.counter = pc
        s.polities.keepRoom()

        // the governments
        let ng = rows("GOVT", key: "serial")
        guard ng <= GovernmentTable.capacity,
              let ge = ints("GOVT", "exists", .bool, rows: ng), let gs = ints("GOVT", "serial", .u32, rows: ng),
              let gp = ints("GOVT", "polity", .u16, rows: ng), let slot = ints("GOVT", "monthlySlot", .u8, rows: ng),
              let lm = ints("GOVT", "lastMonthlyRun", .i32, rows: ng), let ly = ints("GOVT", "lastYearlyRun", .i32, rows: ng),
              let ai = ints("GOVT", "aiNextStrategic", .i32, rows: ng), let tr = ints("GOVT", "taxRate", .i32, rows: ng),
              let tb = ints("GOVT", "taxBase", .i64, rows: ng), let mr = ints("GOVT", "monthlyRuns", .u32, rows: ng),
              let yr = ints("GOVT", "yearlyRuns", .u32, rows: ng), let sr = ints("GOVT", "strategicRuns", .u32, rows: ng)
        else { return nil }
        // every serial given by the counter and never twice (a reused row has a new one); no run ahead of the date
        var seen = gs
        seen.sort()
        let civil = date.civil
        let month = Int64(civil.year * 12 + civil.month - 1), year = Int64(civil.year)
        let never = Int64(GovernmentTable.never)
        for i in 0..<ng {
            guard lm[i] == never || (lm[i] >= 0 && lm[i] <= month), ly[i] == never || (ly[i] >= 0 && ly[i] <= year),
                  GameDate(days: Int32(ai[i])).isSupported else { return nil }
            guard gc.hasGiven(Serial(raw: UInt32(gs[i]))), gp[i] < Int64(np), slot[i] >= 1, slot[i] <= 28 /* format 1: 28 slots */,
                  tr[i] >= 0, tr[i] <= Int64(BP.one.raw), tb[i] >= 0, !LCU(raw: tb[i]).needsRedenomination, i == 0 || seen[i] > seen[i - 1]
            else { return nil }
        }
        var gt = GovernmentTable()
        gt.exists = filled(ge, GovernmentTable.capacity) { $0 == 1 }
        gt.serial = filled(gs, GovernmentTable.capacity) { Serial(raw: UInt32($0)) }
        gt.polity = filled(gp, GovernmentTable.capacity) { Idx(raw: UInt16($0)) }
        gt.monthlySlot = filled(slot, GovernmentTable.capacity) { UInt8($0) }
        gt.lastMonthlyRun = filled(lm, GovernmentTable.capacity) { Int32($0) }
        gt.lastYearlyRun = filled(ly, GovernmentTable.capacity) { Int32($0) }
        // a look further ahead than this build's period allows (a save from a slower difficulty, a rule since changed)
        // comes back within it: a rule's value is brought into the rule, never a reason to refuse the save
        let latest = Int64(date.days) + Int64(Simulation.strategicPeriod) - 1
        gt.aiNextStrategic = filled(ai, GovernmentTable.capacity) { GameDate(days: Int32(Swift.min($0, latest))) }
        gt.taxRate = filled(tr, GovernmentTable.capacity) { BP(raw: Int32($0)) }
        gt.taxBase = filled(tb, GovernmentTable.capacity) { LCU(raw: $0) }
        gt.monthlyRuns = filled(mr, GovernmentTable.capacity) { UInt32($0) }
        gt.yearlyRuns = filled(yr, GovernmentTable.capacity) { UInt32($0) }
        gt.strategicRuns = filled(sr, GovernmentTable.capacity) { UInt32($0) }
        gt.counter = gc
        gt.keepRoom()
        s.governments = gt

        // the provinces
        let nv = rows("PROV", key: "sovereign")
        guard nv <= ProvinceTable.capacity, let so = ints("PROV", "sovereign", .u16, rows: nv),
              let ad = ints("PROV", "administrator", .u16, rows: nv), let po = ints("PROV", "population", .i32, rows: nv) else { return nil }
        for i in 0..<nv {
            // held by a live government, or by nobody: a dissolved government's provinces always pass on
            guard so[i] < Int64(np), (ad[i] < Int64(ng) && ge[Int(ad[i])] == 1) || ad[i] == Int64(Idx<GovernmentKind>.absent.raw), po[i] >= 0
            else { return nil }
        }
        var pt = ProvinceTable()
        pt.sovereign = filled(so, ProvinceTable.capacity) { Idx(raw: UInt16($0)) }
        pt.administrator = filled(ad, ProvinceTable.capacity) { Idx(raw: UInt16($0)) }
        pt.population = filled(po, ProvinceTable.capacity) { Pop32(raw: Int32($0)) }
        pt.keepRoom()
        s.provinces = pt

        // the currencies: one per polity, in its row
        let nc = rows("CURR", key: "rate")
        guard nc == np, let ke = ints("CURR", "scaleExponent", .u16, rows: nc), let ra = ints("CURR", "rate", .i64, rows: nc),
              let pi = ints("CURR", "priceIndex", .i64, rows: nc), let re = ints("CURR", "redenominations", .u16, rows: nc),
              let rd = ints("CURR", "redenominationDue", .bool, rows: nc), let mb = ints("CURR", "moneyBase", .i64, rows: nc),
              let mo = ints("CURR", "moneyBaseOpening", .i64, rows: nc), let mp = ints("CURR", "moneyBasePosted", .i64, rows: nc)
        else { return nil }
        var ct = CurrencyTable()
        ct.scaleExponent = filled(ke, CurrencyTable.capacity) { UInt16($0) }
        ct.rate = filled(ra, CurrencyTable.capacity) { LogQ(raw: $0) }
        ct.priceIndex = filled(pi, CurrencyTable.capacity) { LogQ(raw: $0) }
        ct.redenominations = filled(re, CurrencyTable.capacity) { UInt16($0) }
        guard rd.allSatisfy({ $0 == 0 }) else { return nil }      // marks are cleared at every day's end, before a save
        ct.redenominationDue = filled(rd, CurrencyTable.capacity) { $0 == 1 }
        ct.moneyBase = filled(mb, CurrencyTable.capacity) { LCU(raw: $0) }
        ct.moneyBaseOpening = filled(mo, CurrencyTable.capacity) { LCU(raw: $0) }
        ct.moneyBasePosted = filled(mp, CurrencyTable.capacity) { LCU(raw: $0) }
        ct.keepRoom()
        s.currencies = ct

        // the ledger: one row per government row
        let nl = rows("LEDG", key: "currency")
        let a = LedgerTable.accountsPerRow
        guard nl == ng, let cu = ints("LEDG", "currency", .u16, rows: nl), let rsv = ints("LEDG", "reserves", .i64, rows: nl),
              let rso = ints("LEDG", "reservesOpening", .i64, rows: nl), let rsp = ints("LEDG", "reservesPosted", .i64, rows: nl) else { return nil }
        var lo = [Int64](repeating: 0, count: a * nl), lop = lo, lps = lo
        for account in LocalAccount.allCases {
            let k = Int(account.rawValue)
            guard let b = ints("LEDG", account.saveName, .i64, rows: nl), let o = ints("LEDG", account.saveName + "Opening", .i64, rows: nl),
                  let p = ints("LEDG", account.saveName + "Posted", .i64, rows: nl) else { return nil }
            for row in 0..<nl {
                lo[row * a + k] = b[row]; lop[row * a + k] = o[row]; lps[row * a + k] = p[row]
            }
        }
        for i in 0..<nl {
            // a government's accounts are in its polity's currency
            guard cu[i] < Int64(nc), cu[i] == gp[i] else { return nil }
        }
        var lt = LedgerTable()
        lt.currency = filled(cu, GovernmentTable.capacity) { Idx(raw: UInt16($0)) }
        lt.local = filled(lo, LedgerTable.accountsPerRow * GovernmentTable.capacity) { LCU(raw: $0) }
        lt.localOpening = filled(lop, LedgerTable.accountsPerRow * GovernmentTable.capacity) { LCU(raw: $0) }
        lt.localPosted = filled(lps, LedgerTable.accountsPerRow * GovernmentTable.capacity) { LCU(raw: $0) }
        lt.reserves = filled(rsv, GovernmentTable.capacity) { USDn(raw: $0) }
        lt.reservesOpening = filled(rso, GovernmentTable.capacity) { USDn(raw: $0) }
        lt.reservesPosted = filled(rsp, GovernmentTable.capacity) { USDn(raw: $0) }
        lt.world = USDn(raw: wa[0]); lt.worldOpening = USDn(raw: wo[0]); lt.worldPosted = USDn(raw: wp[0])
        lt.keepRoom()
        s.ledger = lt

        // the ledger's invariants hold, as at the end of every day the game runs
        guard s.ledgerHolds() else { return nil }

        // the waiting commands: each decodes whole, is dated today or later, and the queue is in order with no two
        // keys alike and each issuer within its room; a command of an unknown tag is skipped
        guard let items = commands() else { return nil }
        var rooms = (0, 0, 0)
        // the player's and the AI's governments were made: the row exists, the serial was given, and not after the row's
        // own (an event may name a government an earlier command will make, by the serial the counter will give)
        func made(_ g: GovRef) -> Bool { s.governments.wasMade(g) }   // the rule submit asks
        for c in items {
            let named = c.issuer == .event || c.command.namesOnly(made)
            guard c.day >= date, c.command.isWritable, c.issuer.government.map(made) ?? true, named else { return nil }
            if let last = s.pending.last, !IssuedCommand.precedes(last, c) { return nil }
            switch c.issuer {
            case .player: rooms.0 += 1
            case .event: rooms.1 += 1
            case .ai: rooms.2 += 1
            }
            s.pending.append(c)
        }
        // format 1's rooms (L3), fixed with the format: a later build's rooms do not refuse an older save
        guard rooms.0 <= 64, rooms.1 <= 64, rooms.2 <= 448 else { return nil }
        return s
    }

    /// The waiting commands; nil when one is malformed. A command whose tag this version does not know is skipped.
    mutating func commands() -> [IssuedCommand]? {
        guard let col = tree.chunk("CMDQ")?.column("commands") else {
            report.defaulted.append("CMDQ.commands")
            return []
        }
        guard let items = col.items(atMost: 576 /* format 1: the rooms' sum, L3 */, itemLimit: 256) else { return nil }
        var out: [IssuedCommand] = []
        out.reserveCapacity(items.count)
        for bytes in items {
            guard let peeked = IssuedCommand.peekTag(bytes) else { return nil }
            guard let tag = peeked, Command.knownTags.contains(tag) else { report.skippedCommands += 1; continue }
            var r = ByteReader(bytes)
            guard let c = IssuedCommand.read(from: &r), r.remaining == 0 else { return nil }
            out.append(c)
        }
        return out
    }
}

extension Command {
    /// The tags this version can read: every kind's.
    static let knownTags: [UInt16] = CommandKind.allCases.map { $0.rawValue }

    /// True when every government the command names passes `test` (no allocation: a submit asks it).
    func namesOnly(_ test: (GovRef) -> Bool) -> Bool {
        switch self {
        case let .setTaxRate(g, _): return test(g)
        case .createGovernment: return true
        case let .dissolveGovernment(g, to): return test(g) && (to.map(test) ?? true)
        case let .succeedGovernment(g): return test(g)
        }
    }
}

extension IssuedCommand {
    /// The command's tag, read past the day, the issuer and the sequence: nil when those are malformed; `.some(nil)` for
    /// an issuer of a rank this version does not know (a later version's kind of issuer: the command is skipped, like an
    /// unknown tag).
    static func peekTag(_ bytes: [UInt8]) -> UInt16?? {
        var r = ByteReader(bytes)
        guard r.zigzag() != nil, let rank = r.u8() else { return nil }
        switch rank {
        case 0, 2: guard r.varint() != nil, r.varint() != nil else { return nil }
        case 1: break
        default: return .some(nil)
        }
        guard r.varint() != nil, let tag = r.fixed(UInt16.self) else { return nil }
        return .some(tag)
    }
}
