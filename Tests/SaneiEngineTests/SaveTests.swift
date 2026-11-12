import Foundation
import XCTest
import SaneiCore
@testable import SaneiEngine

final class SaveTests: XCTestCase {
    private let start = GameDate(year: 2011, month: 1, day: 1)!

    private func hex(_ b: [UInt8]) -> String { b.map { String(format: "%02x", $0) }.joined() }

    /// SHA-256 against the published vectors (FIPS 180-4 examples), around the block edges.
    func testSHA256MatchesThePublishedVectors() {
        XCTAssertEqual(hex(SHA256.hash([])), "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855")
        XCTAssertEqual(hex(SHA256.hash(Array("abc".utf8))), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad")
        XCTAssertEqual(hex(SHA256.hash(Array("abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq".utf8))),
                       "248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1")
        XCTAssertEqual(hex(SHA256.hash(Array("abcdefghbcdefghicdefghijdefghijkefghijklfghijklmghijklmnhijklmnoijklmnopjklmnopqklmnopqrlmnopqrsmnopqrstnopqrstu".utf8))),
                       "cf5b16a778af8380036ce59e7b0492370b249b11e8f07a51afac45037afee9d1")
        XCTAssertEqual(hex(SHA256.hash([UInt8](repeating: 0x61, count: 1_000_000))),
                       "cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0")
        // a range of a larger buffer hashes as the bytes alone
        let padded = [UInt8](repeating: 9, count: 5) + Array("abc".utf8) + [7, 7]
        XCTAssertEqual(SHA256.hash(padded, 5..<8), SHA256.hash(Array("abc".utf8)))
    }

    /// A busy world: dissolved and reused rows, a succession, provinces, money of every kind, a redenomination, a failed
    /// close, and waiting commands of every kind and issuer.
    private func busyWorld() -> Simulation {
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
        // money: an exchange, a transfer, a money base, a redenomination in currency 2
        let g0 = sim.state.governments.ref(0), g2 = sim.state.governments.ref(2)
        sim.state.currencies.rate[0] = LogQ(ratio: 5_950, 1)
        sim.state.exchange(g0, local: LCU(raw: 59_500))
        sim.state.transfer(from: .reserves(g0), to: .world, .trade, USDn(raw: 3))
        sim.state.post(moneyBase: Idx(raw: 3), .spending, LCU(raw: 12_345))
        sim.state.post(g2, .treasury, .cheat, LCU(raw: (1 << 60) + 9))
        sim.step()
        sim.advance(days: 20)                                      // a close fails: the world account is owed 3
        // waiting commands of every kind, for later days
        let d = sim.state.world.date.adding(days: 3)
        let g3 = sim.state.governments.ref(3)
        sim.submit(IssuedCommand(day: d, issuer: .player(g3), sequence: 1, command: .setTaxRate(government: g3, rate: BP(raw: 2_000))))
        sim.submit(IssuedCommand(day: d, issuer: .ai(g0), sequence: 1, command: .setTaxRate(government: g0, rate: BP(raw: 900))))
        sim.submit(IssuedCommand(day: d, issuer: .event, sequence: 1, command: .createGovernment(polity: Idx(raw: 2), treasury: LCU(raw: 8_000), taxBase: LCU(raw: 1), taxRate: .zero)))
        sim.submit(IssuedCommand(day: d.adding(days: 1), issuer: .event, sequence: 2, command: .dissolveGovernment(government: g3, provincesTo: nil)))
        sim.submit(IssuedCommand(day: d.adding(days: 2), issuer: .event, sequence: 3, command: .succeedGovernment(government: g0)))
        return sim
    }

    func testAStateSavedAndLoadedIsTheSameAndGoesOnTheSame() throws {
        let sim = busyWorld()
        XCTAssertGreaterThan(sim.state.world.ledgerFailures, 0)
        XCTAssertEqual(sim.state.currencies.redenominations[2], 1)
        XCTAssertEqual(sim.pending.count, 5)
        let meta = SaveMeta(gameVersion: "0.1", build: "test", scenarioId: "s2011", date: sim.state.world.date,
                            playerGovernment: sim.state.governments.ref(3), playerName: "مصر", playtime: 3_600, seed: sim.state.world.seed)
        let bytes = SaveCodec.write(sim.state, meta: meta)
        guard case let .success(loaded) = SaveCodec.read(bytes) else { return XCTFail("refused") }
        XCTAssertEqual(loaded.state, sim.state)
        XCTAssertEqual(loaded.state.hash, sim.state.hash)
        XCTAssertEqual(loaded.meta, meta)
        XCTAssertEqual(loaded.report, SaveReport())
        // continued, the loaded game and the one that never stopped stay the same
        var a = sim, b = Simulation(state: loaded.state)
        a.advance(days: 400)
        b.advance(days: 400)
        XCTAssertEqual(a.state.hash, b.state.hash)
        XCTAssertEqual(a.state, b.state)
        // META alone, even when the payload is damaged
        var damaged = bytes
        damaged[damaged.count - 40] ^= 0xFF
        XCTAssertEqual(try SaveCodec.readMeta(damaged).get(), meta)
        XCTAssertEqual(SaveCodec.read(damaged).failureValue, .damaged)
    }

    /// An unknown chunk, an unknown column and a command of an unknown tag are skipped and reported; a missing column
    /// takes its default; every column the engine writes has one.
    func testUnknownPartsAreSkippedAndMissingOnesDefaulted() {
        let sim = busyWorld()
        var tree = sim.state.saveTree()
        for chunk in tree.chunks {
            for column in chunk.columns {
                XCTAssertNotNil(SaveDefaults.value(chunk.tag, column.name), "\(chunk.tag).\(column.name) has no default")
            }
        }
        XCTAssertEqual(SaveDefaults.all.count, tree.chunks.reduce(0) { $0 + $1.columns.count }, "no default without its column")
        tree.addChunk(SaveChunk(tag: "ZZZZ", columns: [.of("future", [UInt64(1)], .u8, .raw)]))
        tree.addColumn(.of("future", [Int64](repeating: 4, count: sim.state.governments.rows), .i64, .zigzag), to: "GOVT")
        tree.dropColumn("strategicRuns", from: "GOVT")
        // a command of a tag from a later version, with its length, among the known ones
        var items = tree.chunk("CMDQ")!.column("commands")!.items(atMost: 600, itemLimit: 256)!
        var future = ByteWriter()
        future.zigzag(Int64(sim.state.world.date.adding(days: 9).days))
        future.u8(1)
        future.varint(99)
        future.fixed(UInt16(4_000), as: UInt16.self)
        future.bytes.append(contentsOf: [1, 2, 3])
        items.append(future.bytes)
        tree.dropColumn("commands", from: "CMDQ")
        tree.addColumn(.items("commands", items), to: "CMDQ")
        var report = SaveReport()
        guard let loaded = WorldState.load(tree, report: &report) else { return XCTFail("refused") }
        XCTAssertEqual(report.skipped.count, 2)
        XCTAssertTrue(report.skipped.contains("ZZZZ"))
        XCTAssertTrue(report.skipped.contains("GOVT.future"))
        XCTAssertEqual(report.defaulted, ["GOVT.strategicRuns"])
        XCTAssertEqual(report.skippedCommands, 1)
        XCTAssertEqual(loaded.governments.strategicRuns, [UInt32](repeating: 0, count: sim.state.governments.rows))
        XCTAssertEqual(loaded.pending, sim.state.pending)
    }

    /// Every rule the running game keeps is checked on load: a forged value is refused.
    func testForgedValuesAreRefused() {
        let tree = busyWorld().state.saveTree()
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
        let g = busyWorld().state.governments
        refused({ replace(&$0, "SERL", .of("governments", [UInt64(3)], .u32, .raw)) }, "serials past the counter")
        refused({ replace(&$0, "GOVT", .of("monthlySlot", [UInt8](repeating: 29, count: g.rows), .u8, .raw)) }, "a slot past 28")
        refused({ replace(&$0, "GOVT", .of("taxRate", [Int64](repeating: 10_001, count: g.rows), .i32, .zigzag)) }, "a rate past 100%")
        refused({ replace(&$0, "GOVT", .of("polity", [UInt64](repeating: 300, count: g.rows), .u16, .varintDelta)) }, "a polity out of range")
        refused({ replace(&$0, "GOVT", .of("serial", g.serial.map { _ in UInt64(1) }, .u32, .varintDelta)) }, "one serial twice")
        refused({ replace(&$0, "PROV", .of("administrator", [UInt64(200), 0, 0, 0], .u16, .varintDelta)) }, "a province held by no such row")
        refused({ replace(&$0, "LEDG", .of("currency", [UInt64](repeating: 0, count: g.rows), .u16, .varintDelta)) }, "accounts in another currency")
        refused({ replace(&$0, "GOVT", .of("taxBase", [Int64](repeating: 1, count: g.rows - 1), .i64, .zigzag)) }, "a column short of rows")
        refused({ replace(&$0, "GOVT", .of("taxBase", [UInt64](repeating: 1, count: g.rows), .u64, .raw)) }, "a column of another type")
        refused({ t in
            var items = t.chunk("CMDQ")!.column("commands")!.items(atMost: 600, itemLimit: 256)!
            items.swapAt(0, items.count - 1)
            replace(&t, "CMDQ", .items("commands", items))
        }, "the queue out of order")
        refused({ t in
            var items = t.chunk("CMDQ")!.column("commands")!.items(atMost: 600, itemLimit: 256)!
            items.append(items[items.count - 1])
            replace(&t, "CMDQ", .items("commands", items))
        }, "one key twice")
        refused({ replace(&$0, "WRLD", .of("date", [Int64(Int32.max)], .i32, .zigzag)) }, "a date past the calendar")
        refused({ $0.formatVersion = 2 }, "a format from a later version")
    }

    /// Random damage to the file and to the tree is refused or loads a state the game could have made: never a crash.
    func testDamageNeverCrashes() {
        let sim = busyWorld()
        let meta = SaveMeta(date: sim.state.world.date, seed: sim.state.world.seed)
        let bytes = SaveCodec.write(sim.state, meta: meta)
        let raw = sim.state.saveTree().write()
        var r = DetRNG(seed: 4, key: 0, stream: 0, serial: 0)
        var loadedRaw = 0
        for round in 0..<3_000 {
            var b = round % 2 == 0 ? bytes : raw
            switch r.below(3) {
            case 0: b[Int(r.below(UInt64(b.count)))] ^= UInt8(truncatingIfNeeded: 1 + r.below(255))
            case 1: b.removeLast(Int(r.below(UInt64(b.count))))
            default: b.insert(UInt8(truncatingIfNeeded: r.below(256)), at: Int(r.below(UInt64(b.count))))
            }
            if round % 2 == 0 {
                if case .success = SaveCodec.read(b) { XCTFail("a damaged file passed its SHA-256") }
            } else if let t = SaveTree.read(b) {
                var report = SaveReport()
                if let s = WorldState.load(t, report: &report) {
                    loadedRaw += 1
                    // what loads, runs
                    var go = Simulation(state: s)
                    go.advance(days: 2)
                }
            }
        }
        XCTAssertLessThan(loadedRaw, 1_500)
        XCTAssertEqual(SaveCodec.read(Array(bytes.prefix(10))).failureValue, .truncated)
        XCTAssertEqual(SaveCodec.read(Array("NOTASAVE and more bytes".utf8)).failureValue, .notASave)
        var newer = bytes
        newer[8] = 9
        XCTAssertEqual(SaveCodec.readMeta(newer).failureValue, .newerContainer(9))
    }

    /// A compressed file needs its decompressor; with it, the file loads as the plain one.
    func testCompressionIsThePlatformsAndRefusedWithout() throws {
        struct Reverse: SaveCompressor {
            var code: UInt8 { 1 }
            func compress(_ bytes: [UInt8]) -> [UInt8] { bytes.reversed() }
            func decompress(_ bytes: [UInt8], rawLength: Int) -> [UInt8]? { bytes.count == rawLength ? bytes.reversed() : nil }
        }
        let sim = busyWorld()
        let meta = SaveMeta(date: sim.state.world.date, seed: sim.state.world.seed)
        let bytes = SaveCodec.write(sim.state, meta: meta, compressor: Reverse())
        XCTAssertEqual(SaveCodec.read(bytes).failureValue, .compressionUnavailable(1))
        XCTAssertEqual(try SaveCodec.read(bytes, decompressor: Reverse()).get().state, sim.state)
    }

    /// Migrations are column-level steps: a made-up format-0 tree, whose tax rates were called «rate», becomes format 1.
    func testAMigrationStepWorksOnColumns() {
        var tree = busyWorld().state.saveTree()
        tree.formatVersion = 0
        XCTAssertTrue(tree.renameColumn("taxRate", to: "rate", in: "GOVT"))
        var old = tree
        XCTAssertFalse(SaveMigrations.migrate(&old), "no step from 0 in this version")
        let steps: [UInt16: @Sendable (inout SaveTree) -> Bool] = [0: { $0.renameColumn("rate", to: "taxRate", in: "GOVT") }]
        XCTAssertTrue(SaveMigrations.migrate(&tree, steps: steps))
        XCTAssertEqual(tree.formatVersion, 1)
        var report = SaveReport()
        XCTAssertEqual(WorldState.load(tree, report: &report), busyWorld().state)
    }

    /// The golden save of format 1: it loads, and continues to its stated hash. A change of the format, or of what the
    /// days do, fails here until a new golden save is made on purpose (SANEI_WRITE_GOLDEN=1).
    func testTheGoldenSaveLoadsAndContinues() throws {
        let url = URL(fileURLWithPath: #filePath).deletingLastPathComponent().appendingPathComponent("Golden/format1.sanei")
        let sim = busyWorld()
        if ProcessInfo.processInfo.environment["SANEI_WRITE_GOLDEN"] == "1" {
            let meta = SaveMeta(gameVersion: "0.1", build: "golden", scenarioId: "test", date: sim.state.world.date, seed: sim.state.world.seed)
            try Data(SaveCodec.write(sim.state, meta: meta)).write(to: url)
        }
        let bytes = [UInt8](try Data(contentsOf: url))
        let loaded = try SaveCodec.read(bytes).get()
        XCTAssertEqual(loaded.state, sim.state, "the golden save is the busy world")
        var go = Simulation(state: loaded.state)
        go.advance(days: 365)
        XCTAssertEqual(go.state.hash, Self.goldenHashAfterAYear, "\(go.state.hash)")
    }

    static let goldenHashAfterAYear: UInt64 = 3_700_397_353_109_222_118

    func testWritingSizesItsOutputOnce() {
        let sim = busyWorld()
        let meta = SaveMeta(date: sim.state.world.date, seed: sim.state.world.seed)
        let bytes = SaveCodec.write(sim.state, meta: meta)
        XCTAssertLessThan(bytes.count, 4_096, "a small world is a small file")
    }
}

extension Result {
    var failureValue: Failure? {
        if case let .failure(e) = self { return e }
        return nil
    }
}
