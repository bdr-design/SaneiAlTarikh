import Foundation
import XCTest
import SaneiCore
@testable import SaneiEngine

final class SaveTests: XCTestCase {
    private func hex(_ b: [UInt8]) -> String { b.map { String(format: "%02x", $0) }.joined() }

    /// SHA-256 against the published vectors (FIPS 180-4 examples) and Python's hashlib at the padding edges.
    func testSHA256MatchesThePublishedVectors() {
        XCTAssertEqual(hex(SHA256.hash([])), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        XCTAssertEqual(hex(SHA256.hash(Array("abc".utf8))), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        XCTAssertEqual(hex(SHA256.hash(Array("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq".utf8))),
                       "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1")
        XCTAssertEqual(hex(SHA256.hash([UInt8](repeating: 0x61, count: 1_000_000))),
                       "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0")
        let edges: [(Int, String)] = [
            (55, "e7313d333c272e639f790978283f9eb392e843d0f29b7016828bb1daa4aac70b"),
            (56, "4324d65f3c103567f5589c710bc08f8523f929a9272e3af36fc968e52abc6c27"),
            (63, "81c80242132f230c3bd41b3e63bbcff16107339549214a99614ff26664625055"),
            (64, "39e3d7b6b5d075d37d053ad89b24b41bef4f3c29760c84447cab3f3be1882241"),
            (119, "9ce7368e4daf32341631b492e80359dc9f594b48453cd0dd5bf0b19279cc177e"),
            (120, "7836b787757e95e58b3ca5aec90b1b004e8deba1e50e9675af9cabf1a13a04b5"),
        ]
        for (n, digest) in edges {
            XCTAssertEqual(hex(SHA256.hash((0..<n).map { UInt8(($0 * 7 + 3) % 256) })), digest, "\(n) bytes")
        }
        let padded = [UInt8](repeating: 9, count: 5) + Array("abc".utf8) + [7, 7]
        XCTAssertEqual(SHA256.hash(padded, 5..<8), SHA256.hash(Array("abc".utf8)))
    }

    /// A busy world: dissolved and reused rows, a succession, provinces, money of every kind, a redenomination, a failed
    /// close, and waiting commands of every kind and issuer.
    static func busyWorld() -> Simulation {
        let start = GameDate(year: 2011, month: 1, day: 1)!
        var w = WorldState(start: start, seed: 77)
        for _ in 0..<6 { _ = w.addPolity() }
        var sim = Simulation(state: w)
        for p in 0..<6 {
            sim.submit(IssuedCommand(day: start, issuer: .event, sequence: UInt64(p),
                                     command: .createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: 5_000 * Int64(p + 1)),
                                                                taxBase: LCU(raw: 90_000), taxRate: BP(raw: 1_500))))
        }
        sim.step()
        for k in 0..<4 {
            _ = sim.state.addProvince(sovereign: Idx(raw: UInt16(k)), administrator: sim.state.governments.ref(k), population: Pop32(raw: Int32(1_000 * k + 7)))
        }
        sim.advance(days: 40)
        let today = sim.state.world.date
        sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 1, command: .dissolveGovernment(government: sim.state.governments.ref(5))))
        sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 2, command: .succeedGovernment(government: sim.state.governments.ref(1))))
        sim.step()
        sim.submit(IssuedCommand(day: sim.state.world.date, issuer: .event, sequence: 3,
                                 command: .createGovernment(polity: Idx(raw: 4), treasury: LCU(raw: 3), taxBase: LCU(raw: 4), taxRate: BP(raw: 5))))
        sim.step()
        let g0 = sim.state.governments.ref(0), g2 = sim.state.governments.ref(2)
        sim.state.currencies.rate[0] = LogQ(ratio: 5_950, 1)
        sim.state.exchange(g0, local: LCU(raw: 59_500_000))
        sim.state.transfer(from: .reserves(g0), to: .world, .trade, USDn(raw: 3))
        sim.state.post(moneyBase: Idx(raw: 3), .spending, LCU(raw: 12_345))
        sim.state.post(g2, .treasury, .cheat, LCU(raw: (1 << 60) + 9))
        sim.step()
        sim.advance(days: 20)                                      // a close fails: the world account is owed 3
        // distinct counts in every counter, so a test sees two columns' names swapped: three commands refused on their
        // day, five postings refused, six submits refused; and a quarter start
        let g4 = sim.state.governments.ref(4)
        for k in 0..<4 {
            sim.submit(IssuedCommand(day: sim.state.world.date, issuer: .event, sequence: UInt64(50 + k), command: .dissolveGovernment(government: g4)))
        }
        sim.step()
        for _ in 0..<5 { sim.state.post(g4, .treasury, .spending, LCU(raw: 1)) }
        for k in 0..<6 {
            sim.submit(IssuedCommand(day: sim.state.world.date.adding(days: -1), issuer: .event, sequence: UInt64(60 + k),
                                     command: .dissolveGovernment(government: g0)))
        }
        sim.advance(days: 26)                                      // to the 2nd of April: a quarter has started
        let d = sim.state.world.date.adding(days: 3)
        let g3 = sim.state.governments.ref(3)
        sim.submit(IssuedCommand(day: d, issuer: .player(g3), sequence: 1, command: .setTaxRate(government: g3, rate: BP(raw: 2_000))))
        sim.submit(IssuedCommand(day: d, issuer: .ai(g0), sequence: 1, command: .setTaxRate(government: g0, rate: BP(raw: 900))))
        sim.submit(IssuedCommand(day: d, issuer: .event, sequence: 1, command: .createGovernment(polity: Idx(raw: 2), treasury: LCU(raw: 8_000), taxBase: LCU(raw: 1), taxRate: .zero)))
        sim.submit(IssuedCommand(day: d.adding(days: 1), issuer: .event, sequence: 2, command: .dissolveGovernment(government: g3, provincesTo: nil)))
        sim.submit(IssuedCommand(day: d.adding(days: 2), issuer: .event, sequence: 3, command: .succeedGovernment(government: g0)))
        return sim
    }

    private func meta(_ s: WorldState) -> SaveMeta {
        var m = SaveMeta(gameVersion: "0.1", build: "test", scenarioId: "s2011", playerName: "مصر", playtime: 3_600)
        m.playerGovernment = s.governments.ref(3)
        return m
    }

    func testAStateSavedAndLoadedIsTheSameAndGoesOnTheSame() throws {
        let sim = Self.busyWorld()
        XCTAssertGreaterThan(sim.state.world.ledgerFailures, 0)
        XCTAssertEqual(sim.state.currencies.redenominations[2], 1)
        XCTAssertEqual(sim.pending.count, 5)
        let bytes = SaveCodec.write(sim.state, meta: meta(sim.state))
        let loaded = try SaveCodec.read(bytes).get()
        XCTAssertEqual(loaded.state, sim.state)
        XCTAssertEqual(loaded.state.hash, sim.state.hash)
        XCTAssertEqual(loaded.meta.date, sim.state.world.date.days, "META's date is the state's")
        XCTAssertEqual(loaded.meta.playerGovernment, sim.state.governments.ref(3))
        XCTAssertEqual(loaded.meta.playerName, "مصر")
        XCTAssertEqual(loaded.report, SaveReport())
        var a = sim, b = Simulation(state: loaded.state)
        a.advance(days: 400)
        b.advance(days: 400)
        XCTAssertEqual(a.state, b.state)
        // META alone, even when the payload is damaged
        var damaged = bytes
        damaged[damaged.count - 40] ^= 0xFF
        XCTAssertEqual(try SaveFile.readMeta(damaged).get().meta, loaded.meta)
        XCTAssertEqual(SaveCodec.read(damaged).failureValue, .damaged)
        // a header byte damaged reads as damaged, never as a newer version
        var header = bytes
        header[9] ^= 0x40
        XCTAssertEqual(SaveCodec.read(header).failureValue, .damaged)
    }

    /// What the writer writes, the reader reads: a long name is cut at a character, a hash of the wrong size left out,
    /// and the state's own date and seed always go in META.
    func testEverySaveTheWriterMakesReadsBack() throws {
        let sim = Self.busyWorld()
        var m = meta(sim.state)
        m.playerName = String(repeating: "م", count: 200)
        m.rulesHash = [1, 2, 3]
        m.date = 5
        m.seed = 6
        let loaded = try SaveCodec.read(SaveCodec.write(sim.state, meta: m)).get()
        XCTAssertLessThanOrEqual(loaded.meta.playerName.utf8.count, SaveMeta.mostTextBytes)
        XCTAssertTrue(loaded.meta.playerName.allSatisfy { $0 == "م" })
        XCTAssertEqual(loaded.meta.rulesHash, [])
        XCTAssertEqual(loaded.meta.seed, 77)
    }

    /// An unknown chunk, an unknown column, an unknown META column and a command of an unknown tag or issuer kind are
    /// skipped and reported; a missing column takes its default; a missing key refuses the save.
    func testUnknownPartsAreSkippedAndMissingOnesDefaulted() {
        let sim = Self.busyWorld()
        var tree = sim.state.saveTree()
        tree.addChunk(SaveChunk(tag: "ZZZZ", columns: [.of("future", [UInt64(1)], .u8, .raw)]))
        tree.addColumn(.of("future", [Int64](repeating: 4, count: sim.state.governments.rows), .i64, .zigzag), to: "GOVT")
        tree.dropColumn("strategicRuns", from: "GOVT")
        var items = tree.chunk("CMDQ")!.column("commands")!.items(atMost: 600, itemLimit: 256)!
        var future = ByteWriter()
        future.zigzag(Int64(sim.state.world.date.adding(days: 9).days))
        future.u8(1)
        future.varint(99)
        future.fixed(UInt16(4_000), as: UInt16.self)
        future.bytes.append(contentsOf: [1, 2, 3])
        items.append(future.bytes)
        var otherIssuer = ByteWriter()
        otherIssuer.zigzag(Int64(sim.state.world.date.adding(days: 9).days))
        otherIssuer.u8(7)
        otherIssuer.bytes.append(contentsOf: [9, 9, 9])
        items.append(otherIssuer.bytes)
        tree.dropColumn("commands", from: "CMDQ")
        tree.addColumn(.items("commands", items), to: "CMDQ")
        var report = SaveReport()
        guard let loaded = WorldState.load(tree, report: &report) else { return XCTFail("refused") }
        XCTAssertEqual(Set(report.skipped), ["ZZZZ", "GOVT.future"])
        XCTAssertEqual(report.defaulted, ["GOVT.strategicRuns"])
        XCTAssertEqual(report.skippedCommands, 2)
        XCTAssertEqual(loaded.governments.strategicRuns, [UInt32](repeating: 0, count: sim.state.governments.rows))
        XCTAssertEqual(loaded.pending, sim.state.pending)
        // a key is in every save
        for (tag, key) in [("GOVT", "serial"), ("WRLD", "date"), ("LEDG", "currency"), ("SERL", "governments")] {
            var t = sim.state.saveTree()
            t.dropColumn(key, from: tag)
            var r = SaveReport()
            XCTAssertNil(WorldState.load(t, report: &r), "\(tag).\(key) is a key")
        }
        // META: an unknown column is reported, a missing one defaulted
        var metaTree = SaveTree(formatVersion: 1, chunks: [SaveMeta(formatVersion: 1, playerName: "x").chunk])
        metaTree.addColumn(.of("future", [UInt64(1)], .u8, .raw), to: "META")
        metaTree.dropColumn("playtime", from: "META")
        var metaReport = SaveReport()
        let m = SaveMeta.read(metaTree.chunks[0], report: &metaReport)
        XCTAssertEqual(m?.playerName, "x")
        XCTAssertEqual(metaReport.skipped, ["META.future"])
        XCTAssertEqual(metaReport.defaulted, ["META.playtime"])
    }

    /// A length that a column's last byte starts and the next column's bytes would finish is refused, never read on:
    /// through the saves list (no trailer check) and through a full read of a sealed file.
    func testAnItemLengthNeverReadsIntoTheNextColumn() {
        // META: gameVersion's one item has a length byte 0x81, and a column named "z" follows
        var metaChunk = SaveMeta(formatVersion: 1).chunk
        metaChunk.columns = metaChunk.columns.map { $0.name == "gameVersion" ? SaveColumn(name: "gameVersion", type: .items, encoding: .raw, count: 1, data: [0x81]) : $0 }
        metaChunk.columns.append(SaveColumn(name: "z", type: .u8, encoding: .raw, count: 1, data: [7]))
        let metaBytes = SaveTree(formatVersion: 1, chunks: [metaChunk]).write()
        var w = ByteWriter()
        w.bytes.append(contentsOf: SaveFile.magic)
        w.fixed(UInt16(1), as: UInt16.self)
        w.u8(0)
        w.u8(0)
        w.fixed(UInt32(metaBytes.count), as: UInt32.self)
        w.bytes.append(contentsOf: metaBytes)
        XCTAssertEqual(SaveFile.readMeta(w.bytes).failureValue, .badMeta)
        // the queue: the same shape in CMDQ, in a sealed file
        let s = Self.busyWorld().state
        var tree = s.saveTree()
        tree.dropColumn("commands", from: "CMDQ")
        tree.addColumn(SaveColumn(name: "commands", type: .items, encoding: .raw, count: 1, data: [0x81]), to: "CMDQ")
        tree.addColumn(SaveColumn(name: "z", type: .u8, encoding: .raw, count: 1, data: [7]), to: "CMDQ")
        var m = meta(s)
        m.formatVersion = 1
        m.date = s.world.date.days
        m.seed = s.world.seed
        XCTAssertEqual(SaveCodec.read(SaveFile.write(meta: m, payload: tree.write())).failureValue, .badState)
    }

    /// Submit and load ask one rule of the governments a command names, so every state submit allows saves and loads.
    func testWhatSubmitAllowsAlwaysSaves() throws {
        var sim = Self.busyWorld()
        let d = sim.state.world.date.adding(days: 1)
        let row0 = sim.state.governments.ref(0)
        let madeUp = GovRef(row: row0.row, serial: Serial(raw: row0.serial.raw + 1))     // a serial given, but to another row
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .ai(madeUp), sequence: 9, command: .setTaxRate(government: madeUp, rate: .zero))), .invalid)
        let never = GovRef(row: Idx(raw: 50), serial: Serial(raw: 4_000_000))
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .ai(row0), sequence: 9, command: .setTaxRate(government: never, rate: .zero))), .invalid)
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .ai(row0), sequence: 10, command: .setTaxRate(government: row0, rate: .zero))), .queued)
        XCTAssertEqual(try SaveCodec.read(SaveCodec.write(sim.state, meta: meta(sim.state))).get().state, sim.state)
    }

    /// META's own report reaches the full read's report.
    func testAFullReadKeepsMetasReport() throws {
        let s = Self.busyWorld().state
        var metaTree = SaveTree(formatVersion: 1, chunks: [SaveMeta(formatVersion: 1, date: s.world.date.days, seed: s.world.seed).chunk])
        metaTree.addColumn(.of("future", [UInt64(1)], .u8, .raw), to: "META")
        metaTree.dropColumn("playtime", from: "META")
        // the file built by hand with the changed META
        let metaBytes = metaTree.write()
        var w = ByteWriter()
        w.bytes.append(contentsOf: SaveFile.magic)
        w.fixed(UInt16(1), as: UInt16.self)
        w.u8(0)
        w.u8(0)
        w.fixed(UInt32(metaBytes.count), as: UInt32.self)
        w.bytes.append(contentsOf: metaBytes)
        let payload = s.saveTree().write()
        w.fixed(UInt64(payload.count), as: UInt64.self)
        w.fixed(UInt64(payload.count), as: UInt64.self)
        w.bytes.append(contentsOf: payload)
        w.bytes.append(contentsOf: SHA256.hash(w.bytes))
        let read = try SaveCodec.read(w.bytes).get()
        XCTAssertEqual(read.report.skipped, ["META.future"])
        XCTAssertEqual(read.report.defaulted, ["META.playtime"])
    }

    /// Every column the engine writes has an entry in `SaveDefaults`, every entry is written, and every stored property
    /// of the state and its tables is written: a column added to the state without a save column fails here.
    func testEveryStoredValueIsSavedWithADefault() {
        let s = Self.busyWorld().state
        let tree = s.saveTree()
        var written: [String] = []
        for chunk in tree.chunks {
            for column in chunk.columns {
                written.append("\(chunk.tag).\(column.name)")
                XCTAssertTrue(SaveDefaults.entry(chunk.tag, column.name) != nil, "\(chunk.tag).\(column.name) is not in SaveDefaults")
            }
        }
        XCTAssertEqual(Set(SaveDefaults.all.map { "\($0.chunk).\($0.column)" }), Set(written))
        let accounts = LocalAccount.allCases.map { $0.saveName }
        let map: [String: [String]] = [
            "polities.counter": ["SERL.polities"], "governments.counter": ["SERL.governments"],
            "ledger.local": accounts.map { "LEDG.\($0)" }, "ledger.localOpening": accounts.map { "LEDG.\($0)Opening" },
            "ledger.localPosted": accounts.map { "LEDG.\($0)Posted" },
            "ledger.world": ["WRLD.worldAccount"], "ledger.worldOpening": ["WRLD.worldAccountOpening"], "ledger.worldPosted": ["WRLD.worldAccountPosted"],
            "pending": ["CMDQ.commands"],
        ]
        let chunkOf = ["world": "WRLD", "polities": "POLI", "governments": "GOVT", "provinces": "PROV", "currencies": "CURR", "ledger": "LEDG"]
        for top in Mirror(reflecting: s).children {
            guard let name = top.label else { continue }
            if let cols = map[name] { cols.forEach { XCTAssertTrue(written.contains($0), $0) }; continue }
            guard let tag = chunkOf[name] else { XCTFail("the state's \(name) has no chunk"); continue }
            for field in Mirror(reflecting: top.value).children {
                guard let f = field.label else { continue }
                if let cols = map["\(name).\(f)"] { cols.forEach { XCTAssertTrue(written.contains($0), $0) }; continue }
                XCTAssertTrue(written.contains("\(tag).\(f)"), "\(name).\(f) is not saved")
            }
        }
    }

    /// Every rule the running game keeps is checked on load: a forged value is refused.
    func testForgedValuesAreRefused() {
        let base = Self.busyWorld().state
        let tree = base.saveTree()
        func refused(_ change: (inout SaveTree) -> Void, _ why: String, line: UInt = #line) {
            var t = tree
            change(&t)
            var report = SaveReport()
            XCTAssertNil(WorldState.load(t, report: &report), why, line: line)
        }
        func replace(_ t: inout SaveTree, _ tag: String, _ col: SaveColumn) {
            t.dropColumn(col.name, from: tag)
            t.addColumn(col, to: tag)
        }
        func commands(_ t: SaveTree) -> [[UInt8]] { t.chunk("CMDQ")!.column("commands")!.items(atMost: 600, itemLimit: 256)! }
        func command(_ c: IssuedCommand) -> [UInt8] { var w = ByteWriter(); c.write(to: &w); return w.bytes }
        let g = base.governments
        let n = g.rows
        let day = base.world.date.adding(days: 5)
        refused({ replace(&$0, "SERL", .of("governments", [UInt64(3)], .u32, .raw)) }, "serials past the counter")
        refused({ replace(&$0, "GOVT", .of("monthlySlot", [UInt8](repeating: 29, count: n), .u8, .raw)) }, "a slot past 28")
        refused({ replace(&$0, "GOVT", .of("taxRate", [Int64](repeating: 10_001, count: n), .i32, .zigzag)) }, "a rate past 100%")
        refused({ replace(&$0, "GOVT", .of("polity", [UInt64](repeating: 300, count: n), .u16, .varintDelta)) }, "a polity out of range")
        refused({ replace(&$0, "GOVT", .of("serial", g.serial.map { _ in UInt64(1) }, .u32, .varintDelta)) }, "one serial twice")
        refused({ replace(&$0, "GOVT", .of("lastMonthlyRun", [Int64](repeating: Int64(Int32.max), count: n), .i32, .zigzag)) }, "a run in the future")
        // a look further ahead than this build's period is a rule's value: brought within the rule, not refused
        var far = tree
        replace(&far, "GOVT", .of("aiNextStrategic", [Int64](repeating: Int64(GameDate.max.days), count: n), .i32, .zigzag))
        var farReport = SaveReport()
        XCTAssertEqual(WorldState.load(far, report: &farReport)?.governments.aiNextStrategic.first,
                       base.world.date.adding(days: Simulation.strategicPeriod - 1), "the latest a look can be: a period less a day")
        refused({ replace(&$0, "PROV", .of("administrator", [UInt64(200), 0, 0, 0], .u16, .varintDelta)) }, "a province held by no such row")
        // row 3 marked dissolved while it still holds province 3 (and nothing else changed)
        var alive = [Bool](repeating: true, count: n)
        alive[3] = false
        var report = SaveReport()
        var t3 = tree
        replace(&t3, "PROV", .of("administrator", [UInt64(0), 1, 2, 0], .u16, .varintDelta))
        XCTAssertNotNil(WorldState.load(t3, report: &report), "the control: provinces 0 to 3 held by rows 0, 1, 2 and 0")
        refused({ replace(&$0, "GOVT", .flags("exists", alive)) }, "a province held by a dissolved row")
        refused({ replace(&$0, "LEDG", .of("currency", [UInt64](repeating: 0, count: n), .u16, .varintDelta)) }, "accounts in another currency")
        refused({ replace(&$0, "LEDG", .of("treasury", [Int64](repeating: 999_999, count: n), .i64, .zigzag)) }, "a balance its postings do not explain")
        refused({ replace(&$0, "CURR", .flags("redenominationDue", [Bool](repeating: true, count: base.currencies.count))) }, "a mark left after a day")
        refused({ replace(&$0, "GOVT", .of("taxBase", [Int64](repeating: 1, count: n - 1), .i64, .zigzag)) }, "a column short of rows")
        refused({ replace(&$0, "GOVT", .of("taxBase", [UInt64](repeating: 1, count: n), .u64, .raw)) }, "a column of another type")
        refused({ t in
            var items = commands(t)
            items.swapAt(0, items.count - 1)
            replace(&t, "CMDQ", .items("commands", items))
        }, "the queue out of order")
        refused({ t in
            var items = commands(t)
            items.append(items[items.count - 1])
            replace(&t, "CMDQ", .items("commands", items))
        }, "one key twice")
        refused({ t in
            let fake = GovRef(row: Idx(raw: 60_000), serial: Serial(raw: 4_000_000))
            replace(&t, "CMDQ", .items("commands", commands(t) + [command(IssuedCommand(day: day, issuer: .ai(fake), sequence: 1,
                                                                                         command: .setTaxRate(government: fake, rate: .zero)))]))
        }, "an AI issuer never made")
        refused({ t in
            let ahead = GovRef(row: Idx(raw: 0), serial: Serial(raw: g.serial[0].raw + 1))
            replace(&t, "CMDQ", .items("commands", commands(t) + [command(IssuedCommand(day: day, issuer: .player(ahead), sequence: 1,
                                                                                         command: .setTaxRate(government: ahead, rate: .zero)))]))
        }, "a player issuer past its row's serial")
        refused({ replace(&$0, "WRLD", .of("date", [Int64(Int32.max)], .i32, .zigzag)) }, "a date past the calendar")
        refused({ $0.formatVersion = 2 }, "a format from a later version")
        // META's player must be a government the game made
        var m = meta(base)
        m.playerGovernment = GovRef(row: Idx(raw: 9_000), serial: Serial(raw: 77_777))
        XCTAssertNil(try SaveCodec.read(SaveCodec.write(base, meta: m)).get().meta.playerGovernment, "left out by the writer")
        m.formatVersion = WorldState.saveFormat
        m.date = base.world.date.days
        m.seed = base.world.seed
        var forged = SaveFile.write(meta: m, payload: base.saveTree().write())
        XCTAssertEqual(SaveCodec.read(forged).failureValue, .badMeta, "and refused when a file names it")
        forged.removeAll()
        // a flag this version does not know refuses the file
        var flagged = SaveCodec.write(base, meta: meta(base))
        flagged[11] = 1
        flagged.replaceSubrange((flagged.count - 32)..., with: SHA256.hash(flagged, 0..<(flagged.count - 32)))
        XCTAssertEqual(SaveCodec.read(flagged).failureValue, .newerContainer(1))
    }

    /// Damage to the tree, sealed again with a correct SHA-256 (a forged file), is refused or loads a state the game
    /// could keep: it saves and loads equal again, and runs 30 days. Never a crash.
    func testForgedFilesNeverCrashAndWhatLoadsHolds() {
        let sim = Self.busyWorld()
        let raw = sim.state.saveTree().write()
        guard case let .success(read) = SaveFile.readMeta(SaveCodec.write(sim.state, meta: meta(sim.state))) else { return XCTFail() }
        let goodMeta = read.meta
        var r = DetRNG(seed: 4, key: 0, stream: 0, serial: 0)
        var loaded = 0
        for _ in 0..<1_500 {
            var b = raw
            for _ in 0..<(1 + Int(r.below(3))) {
                switch r.below(3) {
                case 0: b[Int(r.below(UInt64(b.count)))] ^= UInt8(truncatingIfNeeded: 1 + r.below(255))
                case 1: b.removeLast(Int(r.below(UInt64(b.count))))
                default: b.insert(UInt8(truncatingIfNeeded: r.below(256)), at: Int(r.below(UInt64(b.count + 1))))
                }
                if b.isEmpty { b = [0] }
            }
            let file = SaveFile.write(meta: goodMeta, payload: b)
            guard case let .success(x) = SaveCodec.read(file) else { continue }
            loaded += 1
            guard case let .success(y) = SaveCodec.read(SaveCodec.write(x.state, meta: x.meta)) else { XCTFail("what loads saves again"); continue }
            XCTAssertEqual(y.state, x.state)
            var go = Simulation(state: x.state)
            go.advance(days: 30)
        }
        XCTAssertLessThan(loaded, 1_500)
        XCTAssertEqual(SaveCodec.read(Array(SaveCodec.write(sim.state, meta: goodMeta).prefix(10))).failureValue, .truncated)
        XCTAssertEqual(SaveCodec.read(Array("NOTASAVE and more bytes".utf8)).failureValue, .notASave)
    }

    /// A compressed file needs its decompressor; with it, the file loads as the plain one.
    func testCompressionIsThePlatformsAndRefusedWithout() throws {
        struct Reverse: SaveCompressor {
            var compression: SaveCompression { .rawDeflate }
            func compress(_ bytes: [UInt8], appendingTo out: inout [UInt8]) -> Bool { out.append(contentsOf: bytes.reversed()); return true }
            func decompress(_ bytes: ArraySlice<UInt8>, rawLength: Int) -> [UInt8]? { bytes.count == rawLength ? bytes.reversed() : nil }
        }
        struct Failing: SaveCompressor {
            var compression: SaveCompression { .rawDeflate }
            func compress(_ bytes: [UInt8], appendingTo out: inout [UInt8]) -> Bool { false }
            func decompress(_ bytes: ArraySlice<UInt8>, rawLength: Int) -> [UInt8]? { nil }
        }
        let sim = Self.busyWorld()
        let bytes = SaveCodec.write(sim.state, meta: meta(sim.state), compressor: Reverse())
        XCTAssertEqual(SaveCodec.read(bytes).failureValue, .compressionUnavailable(1))
        XCTAssertEqual(try SaveCodec.read(bytes, decompressor: Reverse()).get().state, sim.state)
        // a compressor that fails leaves the payload stored as it is: the file still reads, without one
        let plain = SaveCodec.write(sim.state, meta: meta(sim.state), compressor: Failing())
        XCTAssertEqual(try SaveCodec.read(plain).get().state, sim.state)
        XCTAssertEqual(plain, SaveCodec.write(sim.state, meta: meta(sim.state)))
        // the saves list learns how much of a file to read from its first 16 bytes
        let prefix = try SaveFile.metaPrefixLength(Array(bytes.prefix(16))).get()
        XCTAssertEqual(try SaveFile.readMeta(Array(bytes.prefix(prefix))).get().meta.playerName, "مصر")
    }

    /// Migrations are column-level steps: a made-up format-0 tree, whose tax rates were called «rate», becomes format 1.
    func testAMigrationStepWorksOnColumns() {
        let s = Self.busyWorld().state
        var tree = s.saveTree()
        tree.formatVersion = 0
        XCTAssertTrue(tree.renameColumn("taxRate", to: "rate", in: "GOVT"))
        var old = tree
        XCTAssertFalse(SaveMigrations.current.migrate(&old), "no step from 0 in this version")
        let steps = SaveMigrations(steps: [0: { $0.renameColumn("rate", to: "taxRate", in: "GOVT") }])
        XCTAssertTrue(steps.migrate(&tree))
        XCTAssertEqual(tree.formatVersion, 1)
        var report = SaveReport()
        XCTAssertEqual(WorldState.load(tree, report: &report), s)
    }

    /// The columns a later build adds to format 1 (which keeps the format, §7): the golden save lacks them, and loads
    /// them with their defaults. Each one added goes here; nothing else may be defaulted.
    static let addedSinceFormat1Golden: [String] = []

    /// The golden save of format 1, written once and never rewritten (its SHA-256 is pinned below): it loads with only
    /// the columns added since defaulted, holds the values written below, and every column it has, META's included, is
    /// written back to the same bytes (columns added since are allowed). Every counter and META field holds a value of
    /// its own, so two columns' names swapped show. A new format adds its own golden save beside this one; this file
    /// then loads through the migrations. No rule of the day is tested here: only what the file holds.
    func testTheGoldenSaveOfFormat1Loads() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Golden/format1.sanei")
        var goldenMeta = SaveMeta(gameVersion: "0.1", build: "golden", scenarioId: "test", mapVersion: 3,
                                  rulesHash: [UInt8](repeating: 1, count: 32), scenarioHash: [UInt8](repeating: 2, count: 32),
                                  playerName: "مصر", playtime: 3_600, preset: 1, difficulty: 2, cheatsUsed: true)
        if ProcessInfo.processInfo.environment["SANEI_WRITE_GOLDEN"] == "1" && !FileManager.default.fileExists(atPath: url.path) {
            let s = Self.busyWorld().state
            goldenMeta.playerGovernment = s.governments.ref(3)
            try Data(SaveCodec.write(s, meta: goldenMeta)).write(to: url)
        }
        let bytes = [UInt8](try Data(contentsOf: url))
        XCTAssertEqual(hex(SHA256.hash(bytes)), Self.format1GoldenSHA256, "the golden save is never rewritten")
        let loaded = try SaveCodec.read(bytes).get()
        XCTAssertEqual(loaded.report.skipped, [])
        XCTAssertEqual(loaded.report.skippedCommands, 0)
        XCTAssertEqual(loaded.report.defaulted, Self.addedSinceFormat1Golden)
        let s = loaded.state
        let w = s.world
        XCTAssertEqual(w.date, GameDate(year: 2011, month: 4, day: 2))
        XCTAssertEqual(w.seed, 77)
        XCTAssertEqual([w.monthStarts, w.quarterStarts, w.yearStarts, w.refusedCommands, w.refusedPostings, w.refusedSubmits],
                       Self.goldenCounters)
        XCTAssertEqual(Set(Self.goldenCounters).count, Self.goldenCounters.count, "every counter holds a value of its own")
        XCTAssertEqual(s.governments.rows, 6)
        XCTAssertEqual(s.governments.serial.map { $0.raw }, [1, 7, 3, 4, 5, 8])
        XCTAssertEqual(s.currencies.redenominations, [0, 0, 1, 0, 0, 0])
        XCTAssertEqual(s.ledger.world, USDn(raw: 3))
        XCTAssertEqual(s.pending.map { $0.command.tag }, [1, 100, 1, 101, 102])
        XCTAssertEqual(loaded.meta.build, "golden")
        XCTAssertEqual([UInt64(loaded.meta.mapVersion), loaded.meta.playtime, UInt64(loaded.meta.preset), UInt64(loaded.meta.difficulty)], [3, 3_600, 1, 2])
        XCTAssertTrue(loaded.meta.cheatsUsed)
        XCTAssertEqual(loaded.meta.rulesHash, [UInt8](repeating: 1, count: 32))
        guard case let .success(opened) = SaveFile.open(bytes), let golden = SaveTree.read(opened.payload, opened.range) else { return XCTFail() }
        let now = s.saveTree()
        for chunk in golden.chunks {
            for column in chunk.columns {
                XCTAssertEqual(now.chunk(chunk.tag)?.column(column.name), column, "\(chunk.tag).\(column.name) is written as format 1 wrote it")
            }
        }
        // META's columns too: each is written as format 1 wrote it
        let metaEnd = try SaveFile.metaPrefixLength(Array(bytes.prefix(16))).get()
        guard let goldenMetaTree = SaveTree.read(bytes, 16..<metaEnd) else { return XCTFail() }
        let nowMeta = loaded.meta.chunk
        for column in goldenMetaTree.chunks[0].columns {
            XCTAssertEqual(nowMeta.column(column.name), column, "META.\(column.name) is written as format 1 wrote it")
        }
    }

    static let format1GoldenSHA256 = "3acc629e49f80bbfaf196fba03bbbdd6d9f43908da33841b6c8b87b9d7a53135"
    static let goldenCounters: [UInt32] = [4, 2, 1, 3, 5, 6]

    /// Every stored number is in tags.lock and every number there is the code's (the versions: the current one is the
    /// highest locked); no group repeats a number. Names are not compared: a renamed case keeps its number.
    func testTheStoredNumbersAreTheLockedOnes() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
            .appendingPathComponent("tags.lock")
        let text = try String(contentsOf: url, encoding: .utf8)
        var locked: [String: [UInt64]] = [:]
        for line in text.split(separator: "\n") where !line.hasPrefix("#") && !line.isEmpty {
            let f = line.split(separator: " ")
            XCTAssertEqual(f.count, 3, "\(line)")
            locked[String(f[0]), default: []].append(UInt64(f[2])!)
        }
        let g = GovRef(row: Idx(raw: 0), serial: Serial(raw: 1))
        let code: [String: [UInt64]] = [
            "Command": CommandKind.allCases.map { UInt64($0.rawValue) },
            "Issuer": [Issuer.player(g), .event, .ai(g)].map { UInt64($0.rank) },
            "PostingCategory": PostingCategory.allCases.map { UInt64($0.rawValue) },
            "LocalAccount": LocalAccount.allCases.map { UInt64($0.rawValue) },
            "SaveType": SaveType.allCases.map { UInt64($0.rawValue) },
            "ColumnEncoding": [ColumnEncoding.raw, .varintDelta, .zigzag].map { UInt64($0.rawValue) },
            "Compression": SaveCompression.allCases.map { UInt64($0.rawValue) },
        ]
        for (group, numbers) in code.sorted(by: { $0.key < $1.key }) {
            XCTAssertEqual(Set(numbers).count, numbers.count, "\(group) repeats a number")
            XCTAssertEqual(Set(numbers), Set(locked[group] ?? []), "\(group)")
        }
        for (group, current) in [("Container", UInt64(SaveFile.containerVersion)), ("Format", UInt64(WorldState.saveFormat))] {
            XCTAssertEqual(locked[group]?.max(), current, "\(group): the current version is the highest locked")
        }
        XCTAssertEqual(Set(locked.keys), Set(code.keys).union(["Container", "Format"]))
        // the loader knows every kind, and every kind's tag is its own
        XCTAssertEqual(Command.knownTags, CommandKind.allCases.map { $0.rawValue })
        XCTAssertEqual(Command.setTaxRate(government: g, rate: .zero).tag, 1)
        XCTAssertEqual(Command.succeedGovernment(government: g).tag, 102)
    }
}

extension Result {
    var failureValue: Failure? {
        if case let .failure(e) = self { return e }
        return nil
    }
}
