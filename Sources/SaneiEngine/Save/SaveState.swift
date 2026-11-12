import SaneiCore

// The state's chunks (§7): `WorldState` into a `SaveTree` and back. Every value read is checked against the rules the
// running game keeps (rows within caps, serials given by their counters and never twice, references in range, the
// waiting commands in order and within their rooms), so a bad or forged file is refused, never trusted, and a state
// that loads is one the game could have made. A missing column takes its default (`SaveDefaults`); an unknown chunk, an
// unknown column and a command of an unknown tag are skipped and reported. stdlib only.

/// What a load skipped or filled in, for the log.
public struct SaveReport: Sendable, Equatable {
    /// Chunks and columns this version does not know, as "TAG" and "TAG.column".
    public var skipped: [String] = []
    /// Columns the save lacks, filled with their defaults, as "TAG.column".
    public var defaulted: [String] = []
    /// Waiting commands of a tag this version does not know.
    public var skippedCommands = 0
    public init() {}
}

/// The default of every column the engine writes: a missing column takes it, for every row (§7). A test fails when a
/// written column has none.
public enum SaveDefaults {
    public static let all: [(chunk: String, column: String, value: Int64)] = [
        ("WRLD", "date", 0), ("WRLD", "seed", 0), ("WRLD", "monthStarts", 0), ("WRLD", "quarterStarts", 0), ("WRLD", "yearStarts", 0),
        ("WRLD", "ledgerFailures", 0), ("WRLD", "refusedCommands", 0), ("WRLD", "refusedPostings", 0), ("WRLD", "refusedSubmits", 0),
        ("SERL", "polities", 1), ("SERL", "governments", 1),
        ("POLI", "exists", 1), ("POLI", "serial", 0),
        ("GOVT", "exists", 0), ("GOVT", "serial", 0), ("GOVT", "polity", 0), ("GOVT", "monthlySlot", 1),
        ("GOVT", "lastMonthlyRun", Int64(GovernmentTable.never)), ("GOVT", "lastYearlyRun", Int64(GovernmentTable.never)),
        ("GOVT", "aiNextStrategic", 0), ("GOVT", "taxRate", 0), ("GOVT", "taxBase", 0),
        ("GOVT", "monthlyRuns", 0), ("GOVT", "yearlyRuns", 0), ("GOVT", "strategicRuns", 0),
        ("PROV", "sovereign", 0), ("PROV", "administrator", Int64(Idx<GovernmentKind>.absent.raw)), ("PROV", "population", 0),
        ("CURR", "scaleExponent", 0), ("CURR", "rate", 0), ("CURR", "priceIndex", 0), ("CURR", "redenominations", 0),
        ("CURR", "redenominationDue", 0), ("CURR", "moneyBase", 0), ("CURR", "moneyBaseOpening", 0), ("CURR", "moneyBasePosted", 0),
        ("LEDG", "currency", 0), ("LEDG", "local", 0), ("LEDG", "localOpening", 0), ("LEDG", "localPosted", 0),
        ("LEDG", "reserves", 0), ("LEDG", "reservesOpening", 0), ("LEDG", "reservesPosted", 0),
        ("LEDG", "world", 0), ("LEDG", "worldOpening", 0), ("LEDG", "worldPosted", 0),
        ("CMDQ", "commands", 0),
    ]

    public static func value(_ chunk: String, _ column: String) -> Int64? {
        all.first { $0.chunk == chunk && $0.column == column }?.value
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
        let ledg = SaveChunk(tag: "LEDG", columns: [
            .of("currency", l.currency.map { UInt64($0.raw) }, .u16, .varintDelta),
            .of("local", l.local.map { $0.raw }, .i64, .zigzag), .of("localOpening", l.localOpening.map { $0.raw }, .i64, .zigzag),
            .of("localPosted", l.localPosted.map { $0.raw }, .i64, .zigzag),
            .of("reserves", l.reserves.map { $0.raw }, .i64, .zigzag), .of("reservesOpening", l.reservesOpening.map { $0.raw }, .i64, .zigzag),
            .of("reservesPosted", l.reservesPosted.map { $0.raw }, .i64, .zigzag),
            one("world", l.world.raw, .i64), one("worldOpening", l.worldOpening.raw, .i64), one("worldPosted", l.worldPosted.raw, .i64),
        ])
        let cmdq = SaveChunk(tag: "CMDQ", columns: [.items("commands", pending.map { c in
            var w = ByteWriter()
            c.write(to: &w)
            return w.bytes
        })])
        return SaveTree(formatVersion: Self.saveFormat, chunks: [wrld, serl, poli, govt, prov, curr, ledg, cmdq])
    }

    /// A state from a tree of the current format (migrate older trees first: `SaveMigrations`). Nil when any value
    /// breaks a rule the running game keeps; `report` says what was skipped or defaulted.
    public static func load(_ tree: SaveTree, report: inout SaveReport) -> WorldState? {
        guard tree.formatVersion == saveFormat else { return nil }
        var l = Loader(tree: tree)
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
            report.defaulted.append("\(tag).\(name)")
            guard let d = SaveDefaults.value(tag, name) else { return nil }
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
              let rs = ints("WRLD", "refusedSubmits", .u32, rows: 1)
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
        s.polities.exists = pe.map { $0 == 1 }
        s.polities.serial = ps.map { Serial(raw: UInt32($0)) }
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
        // every serial given by the counter and never twice (a reused row has a new one)
        var seen = gs
        seen.sort()
        for i in 0..<ng {
            guard gc.hasGiven(Serial(raw: UInt32(gs[i]))), gp[i] < Int64(np), slot[i] >= 1, slot[i] <= Int64(GovernmentTable.slots),
                  tr[i] >= 0, tr[i] <= Int64(BP.one.raw), tb[i] >= 0, i == 0 || seen[i] > seen[i - 1],
                  GameDate(days: Int32(ai[i])).isSupported else { return nil }
        }
        var gt = GovernmentTable()
        gt.exists = ge.map { $0 == 1 }
        gt.serial = gs.map { Serial(raw: UInt32($0)) }
        gt.polity = gp.map { Idx(raw: UInt16($0)) }
        gt.monthlySlot = slot.map { UInt8($0) }
        gt.lastMonthlyRun = lm.map { Int32($0) }
        gt.lastYearlyRun = ly.map { Int32($0) }
        gt.aiNextStrategic = ai.map { GameDate(days: Int32($0)) }
        gt.taxRate = tr.map { BP(raw: Int32($0)) }
        gt.taxBase = tb.map { LCU(raw: $0) }
        gt.monthlyRuns = mr.map { UInt32($0) }
        gt.yearlyRuns = yr.map { UInt32($0) }
        gt.strategicRuns = sr.map { UInt32($0) }
        gt.counter = gc
        gt.keepRoom()
        s.governments = gt

        // the provinces
        let nv = rows("PROV", key: "sovereign")
        guard nv <= ProvinceTable.capacity, let so = ints("PROV", "sovereign", .u16, rows: nv),
              let ad = ints("PROV", "administrator", .u16, rows: nv), let po = ints("PROV", "population", .i32, rows: nv) else { return nil }
        for i in 0..<nv {
            guard so[i] < Int64(np), ad[i] < Int64(ng) || ad[i] == Int64(Idx<GovernmentKind>.absent.raw), po[i] >= 0 else { return nil }
        }
        var pt = ProvinceTable()
        pt.sovereign = so.map { Idx(raw: UInt16($0)) }
        pt.administrator = ad.map { Idx(raw: UInt16($0)) }
        pt.population = po.map { Pop32(raw: Int32($0)) }
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
        ct.scaleExponent = ke.map { UInt16($0) }
        ct.rate = ra.map { LogQ(raw: $0) }
        ct.priceIndex = pi.map { LogQ(raw: $0) }
        ct.redenominations = re.map { UInt16($0) }
        ct.redenominationDue = rd.map { $0 == 1 }
        ct.moneyBase = mb.map { LCU(raw: $0) }
        ct.moneyBaseOpening = mo.map { LCU(raw: $0) }
        ct.moneyBasePosted = mp.map { LCU(raw: $0) }
        ct.keepRoom()
        s.currencies = ct

        // the ledger: one row per government row
        let nl = rows("LEDG", key: "currency")
        let a = LedgerTable.accountsPerRow
        guard nl == ng, let cu = ints("LEDG", "currency", .u16, rows: nl),
              let lo = ints("LEDG", "local", .i64, rows: a * nl), let lop = ints("LEDG", "localOpening", .i64, rows: a * nl),
              let lps = ints("LEDG", "localPosted", .i64, rows: a * nl), let rs = ints("LEDG", "reserves", .i64, rows: nl),
              let rso = ints("LEDG", "reservesOpening", .i64, rows: nl), let rsp = ints("LEDG", "reservesPosted", .i64, rows: nl),
              let wa = ints("LEDG", "world", .i64, rows: 1), let wo = ints("LEDG", "worldOpening", .i64, rows: 1),
              let wp = ints("LEDG", "worldPosted", .i64, rows: 1) else { return nil }
        for i in 0..<nl {
            // a government's accounts are in its polity's currency
            guard cu[i] < Int64(nc), cu[i] == gp[i] else { return nil }
        }
        var lt = LedgerTable()
        lt.currency = cu.map { Idx(raw: UInt16($0)) }
        lt.local = lo.map { LCU(raw: $0) }
        lt.localOpening = lop.map { LCU(raw: $0) }
        lt.localPosted = lps.map { LCU(raw: $0) }
        lt.reserves = rs.map { USDn(raw: $0) }
        lt.reservesOpening = rso.map { USDn(raw: $0) }
        lt.reservesPosted = rsp.map { USDn(raw: $0) }
        lt.world = USDn(raw: wa[0]); lt.worldOpening = USDn(raw: wo[0]); lt.worldPosted = USDn(raw: wp[0])
        lt.keepRoom()
        s.ledger = lt

        // the waiting commands: each decodes whole, is dated today or later, and the queue is in order with no two
        // keys alike and each issuer within its room; a command of an unknown tag is skipped
        guard let items = commands() else { return nil }
        var rooms = (0, 0, 0)
        for c in items {
            guard c.day >= date, c.command.isWritable, c.issuer.government.map(Command.isWritable) ?? true else { return nil }
            if let last = s.pending.last, !IssuedCommand.precedes(last, c) { return nil }
            switch c.issuer {
            case .player: rooms.0 += 1
            case .event: rooms.1 += 1
            case .ai: rooms.2 += 1
            }
            s.pending.append(c)
        }
        guard rooms.0 <= Simulation.playerCapacity, rooms.1 <= Simulation.eventCapacity, rooms.2 <= Simulation.aiCapacity else { return nil }
        return s
    }

    /// The waiting commands; nil when one is malformed. A command whose tag this version does not know is skipped.
    mutating func commands() -> [IssuedCommand]? {
        guard let col = tree.chunk("CMDQ")?.column("commands") else {
            report.defaulted.append("CMDQ.commands")
            return []
        }
        guard let items = col.items(atMost: Simulation.queueCapacity, itemLimit: 256) else { return nil }
        var out: [IssuedCommand] = []
        out.reserveCapacity(items.count)
        for bytes in items {
            guard let tag = IssuedCommand.peekTag(bytes) else { return nil }
            guard Command.knownTags.contains(tag) else { report.skippedCommands += 1; continue }
            var r = ByteReader(bytes)
            guard let c = IssuedCommand.read(from: &r), r.remaining == 0 else { return nil }
            out.append(c)
        }
        return out
    }
}

extension Command {
    /// The tags this version can read.
    static let knownTags: [UInt16] = [1, 100, 101, 102]
}

extension IssuedCommand {
    /// The command's tag, read past the day, the issuer and the sequence; nil when those are malformed.
    static func peekTag(_ bytes: [UInt8]) -> UInt16? {
        var r = ByteReader(bytes)
        guard r.zigzag() != nil, let rank = r.u8() else { return nil }
        switch rank {
        case 0, 2: guard r.varint() != nil, r.varint() != nil else { return nil }
        case 1: break
        default: return nil
        }
        guard r.varint() != nil else { return nil }
        return r.fixed(UInt16.self)
    }
}
