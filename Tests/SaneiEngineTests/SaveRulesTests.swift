import Foundation
import XCTest
@testable import SaneiCore
@testable import SaneiEngine

/// One forged case per rule the loader keeps, each built so that only that rule refuses it (the other rules hold), so
/// removing the rule makes the test fail (the reviews planted faults).
final class SaveRulesTests: XCTestCase {
    private let base = SaveTests.busyWorld().state
    private lazy var tree = base.saveTree()

    private func ints(_ c: SaveColumn) -> [Int64] {
        if let v = c.values(Int64.self, as: c.type, atMost: 1 << 20), [.i8, .i16, .i32, .i64].contains(c.type) { return v }
        if c.type == .bool { return c.flags(atMost: 1 << 20)!.map { $0 ? 1 : 0 } }
        return c.values(UInt64.self, as: c.type, atMost: 1 << 20)!.map { Int64(bitPattern: $0) }
    }

    /// The column rebuilt with new values, keeping its type and encoding.
    private func column(_ c: SaveColumn, _ v: [Int64]) -> SaveColumn {
        if c.type == .bool { return .flags(c.name, v.map { $0 != 0 }) }
        if [.i8, .i16, .i32, .i64].contains(c.type) { return .of(c.name, v, c.type, c.encoding) }
        return .of(c.name, v.map { UInt64(bitPattern: $0) }, c.type, c.encoding)
    }

    private func change(_ t: inout SaveTree, _ tag: String, _ name: String, _ f: ([Int64]) -> [Int64]) {
        let c = t.chunk(tag)!.column(name)!
        t.dropColumn(name, from: tag)
        t.addColumn(column(c, f(ints(c))), to: tag)
    }

    /// Every column of a chunk given `n` rows: the first `keep` as they are, then copies of row `template`.
    private func rows(_ t: inout SaveTree, _ tag: String, _ n: Int, template: Int = 0, except: [String] = []) {
        for c in t.chunk(tag)!.columns where !except.contains(c.name) {
            change(&t, tag, c.name) { v in Array(v.prefix(n)) + [Int64](repeating: v[template], count: Swift.max(0, n - v.count)) }
        }
    }

    private func load(_ t: SaveTree) -> WorldState? {
        var r = SaveReport()
        return WorldState.load(t, report: &r)
    }

    private func refused(_ why: String, line: UInt = #line, _ f: (inout SaveTree) -> Void) {
        var t = tree
        f(&t)
        XCTAssertNil(load(t), why, line: line)
    }

    func testTheControlLoads() {
        XCTAssertEqual(load(tree), base)
    }

    func testThePolitiesRules() {
        refused("serials that do not rise") { t in self.change(&t, "POLI", "serial") { v in [v[1], v[0]] + v.dropFirst(2) } }
        refused("a serial the counter never gave") { t in self.change(&t, "SERL", "polities") { _ in [Int64(self.base.polities.count)] } }
        // 385 polities and currencies, all else consistent: only the cap refuses
        refused("past the cap") { t in
            let n = PolityTable.capacity + 1
            self.change(&t, "POLI", "exists") { _ in [Int64](repeating: 1, count: n) }
            self.change(&t, "POLI", "serial") { _ in (1...Int64(n)).map { $0 } }
            self.change(&t, "SERL", "polities") { _ in [Int64(n + 1)] }
            self.rows(&t, "CURR", n)
        }
    }

    func testTheGovernmentsRules() {
        let n = base.governments.rows
        refused("a yearly run ahead of the year") { t in self.change(&t, "GOVT", "lastYearlyRun") { v in [2_012] + v.dropFirst() } }
        refused("a monthly run before any month") { t in self.change(&t, "GOVT", "lastMonthlyRun") { v in [-5] + v.dropFirst() } }
        refused("a monthly run ahead of the month") { t in self.change(&t, "GOVT", "lastMonthlyRun") { v in [v.max()! + 1] + v.dropFirst() } }
        refused("a slot of 0") { t in self.change(&t, "GOVT", "monthlySlot") { v in [0] + v.dropFirst() } }
        refused("a rate below 0") { t in self.change(&t, "GOVT", "taxRate") { v in [-1] + v.dropFirst() } }
        refused("a tax base below 0") { t in self.change(&t, "GOVT", "taxBase") { v in [-1] + v.dropFirst() } }
        refused("a tax base past 2^60") { t in self.change(&t, "GOVT", "taxBase") { v in [(1 << 60) + 1] + v.dropFirst() } }
        refused("a look on a day outside the calendar") { t in self.change(&t, "GOVT", "aiNextStrategic") { v in [Int64(GameDate.min.days) - 1] + v.dropFirst() } }
        // a look 2^40 days ahead: no other rule reads it before the type's range (it would trap at Int32)
        refused("a value past its type") { t in self.change(&t, "GOVT", "aiNextStrategic") { v in [Int64(1) << 40] + v.dropFirst() } }
        // 385 governments, each consistent (unique serials, a polity, an empty ledger row): only the cap refuses
        refused("past the cap") { t in
            let m = GovernmentTable.capacity + 1
            self.rows(&t, "GOVT", m, template: 0, except: ["serial"])
            self.change(&t, "GOVT", "serial") { v in v + (1...Int64(m - n)).map { Int64(self.base.governments.counter.next) + $0 - 1 } }
            self.change(&t, "SERL", "governments") { _ in [Int64(self.base.governments.counter.next) + Int64(m - n)] }
            for c in t.chunk("LEDG")!.columns where c.name != "currency" {
                self.change(&t, "LEDG", c.name) { v in v + [Int64](repeating: 0, count: m - n) }
            }
            self.change(&t, "LEDG", "currency") { v in v + [Int64](repeating: v[0], count: m - n) }
        }
    }

    /// What a game ever saves: amounts within 2^60 (the day's end redenominates past it), rates and price indices
    /// within ±2^52. Each case keeps the ledger's sums (the opening moves with the balance), so only the bound refuses.
    func testTheAmountsAndRatesBounds() {
        let past = (Int64(1) << 60) + 1
        func shifted(_ t: inout SaveTree, _ tag: String, _ balance: String, _ opening: String, to x: Int64) {
            let b = ints(t.chunk(tag)!.column(balance)!), o = ints(t.chunk(tag)!.column(opening)!)
            change(&t, tag, opening) { v in [x] + v.dropFirst() }
            change(&t, tag, balance) { v in [x + (b[0] - o[0])] + v.dropFirst() }
        }
        var atBound = tree
        shifted(&atBound, "LEDG", "treasury", "treasuryOpening", to: (Int64(1) << 60) - 1_000_000)
        XCTAssertNotNil(load(atBound), "the control: within 2^60")
        refused("a treasury past 2^60") { t in shifted(&t, "LEDG", "treasury", "treasuryOpening", to: past) }
        refused("a debt past 2^60") { t in shifted(&t, "LEDG", "domesticDebt", "domesticDebtOpening", to: -past - 1_000_000) }
        refused("a money base past 2^60") { t in shifted(&t, "CURR", "moneyBase", "moneyBaseOpening", to: past) }
        refused("a rate past 2^52") { t in self.change(&t, "CURR", "rate") { v in [(Int64(1) << 52) + 1] + v.dropFirst() } }
        refused("a price index past 2^52") { t in self.change(&t, "CURR", "priceIndex") { v in [-(Int64(1) << 52) - 1] + v.dropFirst() } }
        var rate = tree
        change(&rate, "CURR", "rate") { v in [Int64(1) << 52] + v.dropFirst() }
        XCTAssertNotNil(load(rate), "a rate at 2^52 loads")
    }

    /// Each bound on its own: an account's balance, opening and month's sum set together (the sums kept), so one value
    /// at a time passes 2^60; exactly 2^60 either way loads; a currency past its ceiling takes any amount, one at the
    /// ceiling does not; the money base and its opening each on their own.
    func testEachLedgerBoundOnItsOwn() {
        let edge = Int64(1) << 60
        func account(_ t: inout SaveTree, _ name: String, balance b: Int64, opening o: Int64) {
            change(&t, "LEDG", name) { v in [b] + v.dropFirst() }
            change(&t, "LEDG", name + "Opening") { v in [o] + v.dropFirst() }
            change(&t, "LEDG", name + "Posted") { v in [b - o] + v.dropFirst() }
        }
        func moneyBase(_ t: inout SaveTree, _ b: Int64, _ o: Int64) {
            change(&t, "CURR", "moneyBase") { v in [b] + v.dropFirst() }
            change(&t, "CURR", "moneyBaseOpening") { v in [o] + v.dropFirst() }
            change(&t, "CURR", "moneyBasePosted") { v in [b - o] + v.dropFirst() }
        }
        for x in [edge, -edge] {
            var t = tree
            account(&t, "treasury", balance: x, opening: x)
            XCTAssertNotNil(load(t), "exactly \(x) loads")
        }
        refused("a balance past 2^60, its opening within") { t in account(&t, "treasury", balance: edge + 1, opening: 0) }
        refused("an opening past 2^60, its balance within") { t in account(&t, "treasury", balance: 0, opening: -edge - 1) }
        refused("a money base past 2^60, its opening within") { t in moneyBase(&t, edge + 1, 0) }
        refused("a money base's opening past 2^60, the base within") { t in moneyBase(&t, 0, edge + 1) }
        // the ceiling: the scale of the first ledger row's currency
        let currency = Int(ints(tree.chunk("LEDG")!.column("currency")!)[0])
        func scaled(_ t: inout SaveTree, _ e: Int64) {
            change(&t, "CURR", "scaleExponent") { v in var v = v; v[currency] = e; return v }
            account(&t, "treasury", balance: 2 * edge, opening: 2 * edge)
        }
        var past = tree
        scaled(&past, Int64(UInt16.max - 2))
        XCTAssertNotNil(load(past), "a currency past its ceiling takes 2^61")
        refused("a currency at its ceiling does not") { t in scaled(&t, Int64(UInt16.max - 3)) }
    }

    func testTheProvincesAndCountsRules() {
        refused("a sovereign polity out of range") { t in self.change(&t, "PROV", "sovereign") { v in [Int64(self.base.polities.count)] + v.dropFirst() } }
        refused("people below 0") { t in self.change(&t, "PROV", "population") { v in [-1] + v.dropFirst() } }
        refused("provinces past the cap") { t in self.rows(&t, "PROV", ProvinceTable.capacity + 1) }
        refused("fewer currencies than polities") { t in self.rows(&t, "CURR", self.base.currencies.count - 1) }
        refused("fewer ledger rows than governments") { t in self.rows(&t, "LEDG", self.base.governments.rows - 1) }
    }

    func testTheQueueRules() {
        func items(_ t: SaveTree) -> [[UInt8]] { t.chunk("CMDQ")!.column("commands")!.items(atMost: 600, itemLimit: 256)! }
        func bytes(_ c: IssuedCommand) -> [UInt8] { var w = ByteWriter(); c.write(to: &w); return w.bytes }
        func set(_ t: inout SaveTree, _ v: [[UInt8]]) { t.dropColumn("commands", from: "CMDQ"); t.addColumn(.items("commands", v), to: "CMDQ") }
        let last = base.pending.map { $0.day }.max()!.adding(days: 10)
        let g3 = base.governments.ref(3)
        let never = GovRef(row: Idx(raw: 2), serial: Serial(raw: 3_000))
        let ahead = GovRef(row: Idx(raw: 0), serial: Serial(raw: base.governments.serial[1].raw))   // given, but to row 1
        refused("a command for a day already run") { t in
            set(&t, [bytes(IssuedCommand(day: self.base.world.date.adding(days: -1), issuer: .event, sequence: 1,
                                         command: .dissolveGovernment(government: g3)))] + items(t))
        }
        refused("the player's room past 64") { t in
            set(&t, items(t) + (0..<65).map { k in bytes(IssuedCommand(day: last, issuer: .player(g3), sequence: UInt64(100 + k),
                                                                         command: .setTaxRate(government: g3, rate: .zero))) })
        }
        refused("trailing bytes after a command") { t in var v = items(t); v[0].append(0); set(&t, v) }
        refused("an item past 256 bytes") { t in set(&t, items(t) + [[UInt8](repeating: 1, count: 300)]) }
        refused("a player issuer whose serial is another row's (in order, so only that rule refuses)") { t in
            set(&t, items(t) + [bytes(IssuedCommand(day: last, issuer: .player(ahead), sequence: 1, command: .setTaxRate(government: g3, rate: .zero)))])
        }
        refused("a player's order naming a government never made") { t in
            set(&t, items(t) + [bytes(IssuedCommand(day: last, issuer: .player(g3), sequence: 1, command: .setTaxRate(government: never, rate: .zero)))])
        }
        // the control: the same kind of order, valid, loads
        var ok = tree
        set(&ok, items(ok) + [bytes(IssuedCommand(day: last, issuer: .player(g3), sequence: 1, command: .setTaxRate(government: g3, rate: .zero)))])
        XCTAssertNotNil(load(ok))
    }

    /// Each issuer's room exactly: full, it loads; one more is refused (the player's 64, the events' 64, the AI's 448);
    /// and an AI's order, as a player's, names only governments that were made.
    func testEachIssuersRoomExactly() {
        func items(_ t: SaveTree) -> [[UInt8]] { t.chunk("CMDQ")!.column("commands")!.items(atMost: 600, itemLimit: 256)! }
        func bytes(_ c: IssuedCommand) -> [UInt8] { var w = ByteWriter(); c.write(to: &w); return w.bytes }
        func set(_ t: inout SaveTree, _ v: [[UInt8]]) { t.dropColumn("commands", from: "CMDQ"); t.addColumn(.items("commands", v), to: "CMDQ") }
        let last = base.pending.map { $0.day }.max()!.adding(days: 10)
        let g3 = base.governments.ref(3)
        var held = (player: 0, event: 0, ai: 0)
        for c in base.pending {
            switch c.issuer {
            case .player: held.player += 1
            case .event: held.event += 1
            case .ai: held.ai += 1
            }
        }
        func with(_ issuer: Issuer, _ n: Int) -> SaveTree {
            var t = tree
            set(&t, items(t) + (0..<n).map { k in
                bytes(IssuedCommand(day: last, issuer: issuer, sequence: UInt64(1_000 + k), command: .setTaxRate(government: g3, rate: .zero)))
            })
            return t
        }
        for (issuer, room, now) in [(Issuer.player(g3), 64, held.player), (.event, 64, held.event), (.ai(g3), 448, held.ai)] {
            XCTAssertNotNil(load(with(issuer, room - now)), "\(issuer): its room full")
            XCTAssertNil(load(with(issuer, room - now + 1)), "\(issuer): one past its room")
        }
        // every room full at once: 576 items, the queue's bound, load (in the queue's order: player, event, AI)
        var full = tree
        var all = items(full)
        var sequence: UInt64 = 1_000
        for (issuer, n) in [(Issuer.player(g3), 64 - held.player), (.event, 64 - held.event), (.ai(g3), 448 - held.ai)] {
            for _ in 0..<n {
                all.append(bytes(IssuedCommand(day: last, issuer: issuer, sequence: sequence, command: .setTaxRate(government: g3, rate: .zero))))
                sequence += 1
            }
        }
        set(&full, all)
        XCTAssertEqual(all.count, 576)
        XCTAssertNotNil(load(full), "every room full")
        let never = GovRef(row: Idx(raw: 2), serial: Serial(raw: 3_000))
        refused("an AI's order naming a government never made") { t in
            set(&t, items(t) + [bytes(IssuedCommand(day: last, issuer: .ai(g3), sequence: 1, command: .setTaxRate(government: never, rate: .zero)))])
        }
        refused("a dissolve of a government never made") { t in
            set(&t, items(t) + [bytes(IssuedCommand(day: last, issuer: .ai(g3), sequence: 1, command: .dissolveGovernment(government: never)))])
        }
        refused("a succession of a government never made") { t in
            set(&t, items(t) + [bytes(IssuedCommand(day: last, issuer: .ai(g3), sequence: 1, command: .succeedGovernment(government: never)))])
        }
        refused("a dissolve handing its provinces to a government never made") { t in
            set(&t, items(t) + [bytes(IssuedCommand(day: last, issuer: .ai(g3), sequence: 1,
                                                    command: .dissolveGovernment(government: g3, provincesTo: never)))])
        }
        // format 1's queue holds 576 items, a later build's commands included (skipped here): 577 is refused by that
        // bound alone, as the known ones stay within their rooms
        func unknown(_ k: Int) -> [UInt8] {
            var w = ByteWriter()
            w.zigzag(Int64(last.days)); w.u8(1); w.varint(UInt64(5_000 + k)); w.fixed(UInt16(9_999), as: UInt16.self)
            return w.bytes
        }
        func padded(_ n: Int) -> SaveTree {
            var t = tree
            set(&t, items(t) + (0..<(n - items(t).count)).map(unknown))
            return t
        }
        var report = SaveReport()
        XCTAssertNotNil(WorldState.load(padded(576), report: &report), "576 items, the unknown ones skipped")
        XCTAssertEqual(report.skippedCommands, 576 - base.pending.count)
        XCTAssertNil(load(padded(577)))
    }

    /// The tree's own rules.
    func testTheTreesRules() throws {
        XCTAssertNil(SaveTree.read(SaveTree(formatVersion: 1, chunks: [SaveChunk(tag: "AAAA", columns: []), SaveChunk(tag: "AAAA", columns: [])]).write()),
                     "two chunks with one tag")
        let col = SaveColumn.of("x", [UInt8(1)], .u8, .raw)
        XCTAssertNil(SaveTree.read(SaveTree(formatVersion: 1, chunks: [SaveChunk(tag: "AAAA", columns: [col, col])]).write()), "one name twice")
        // a name with a space (the writer refuses to make one: the bytes are made by hand)
        var spaced = SaveTree(formatVersion: 1, chunks: [SaveChunk(tag: "AAAA", columns: [.of("a_b", [UInt8(1)], .u8, .raw)])]).write()
        let underscore = try XCTUnwrap(spaced.firstIndex(of: 0x5F))
        XCTAssertNotNil(SaveTree.read(spaced), "the control")
        spaced[underscore] = 0x20
        XCTAssertNil(SaveTree.read(spaced), "a name with a space")
        // a chunk whose length covers the next whole chunk: the tree's bytes end where they should, so only the chunk's
        // own end refuses it
        func twoChunks(firstLength: UInt64) -> [UInt8] {
            var w = ByteWriter()
            w.fixed(UInt16(1), as: UInt16.self); w.varint(2)
            w.bytes.append(contentsOf: Array("AAAA".utf8)); w.varint(firstLength); w.varint(0)
            w.bytes.append(contentsOf: Array("BBBB".utf8)); w.varint(1); w.varint(0)
            return w.bytes
        }
        XCTAssertEqual(SaveTree.read(twoChunks(firstLength: 1))?.chunks.map(\.tag), ["AAAA", "BBBB"], "the control")
        XCTAssertNil(SaveTree.read(twoChunks(firstLength: 7)), "a chunk's end past its columns")
        let good = SaveTree(formatVersion: 1, chunks: [SaveChunk(tag: "AAAA", columns: [col])]).write()
        XCTAssertNotNil(SaveTree.read(good))
        XCTAssertNil(SaveTree.read(good + [0]), "a byte after the last chunk")
        XCTAssertNil(SaveColumn(name: "x", type: .u8, encoding: .raw, count: 1, data: [1, 2]).values(UInt8.self, as: .u8, atMost: 4),
                     "values that end before the column's bytes do")
        XCTAssertNil(SaveColumn(name: "x", type: .bool, encoding: .raw, count: 1, data: [2]).flags(atMost: 4), "a flag of 2")
        // reading copies nothing: a column read from a file's bytes points into them
        let file = SaveCodec.write(base, meta: SaveMeta())!
        guard case let .success(o) = SaveFile.open(file), let t = SaveTree.read(o.payload, o.range) else { return XCTFail() }
        let fileStart = file.withUnsafeBufferPointer { UInt(bitPattern: $0.baseAddress) }
        let colStart = t.chunks[0].columns[0].buffer.withUnsafeBufferPointer { UInt(bitPattern: $0.baseAddress) }
        XCTAssertEqual(colStart, fileStart, "the column's bytes are the file's buffer")
    }

    /// The container's and META's rules.
    func testTheContainersAndMetasRules() {
        let s = base
        var m = SaveMeta(formatVersion: 1, date: s.world.date.days, seed: s.world.seed)
        let payload = s.saveTree().write()
        func reseal(_ b: inout [UInt8]) { b.replaceSubrange((b.count - 32)..., with: SHA256.hash(b, 0..<(b.count - 32))) }
        let good = SaveFile.write(meta: m, payload: payload)
        XCTAssertEqual(try SaveCodec.read(good).get().state, s, "the control")
        // META's tree format and its column disagree
        var metaTree = SaveTree(formatVersion: 2, chunks: [m.chunk])
        var w = ByteWriter()
        w.bytes.append(contentsOf: SaveFile.magic); w.fixed(UInt16(1), as: UInt16.self); w.u8(0); w.u8(0)
        let mb = metaTree.write()
        w.fixed(UInt32(mb.count), as: UInt32.self); w.bytes.append(contentsOf: mb)
        XCTAssertEqual(SaveFile.readMeta(w.bytes).failureValue, .badMeta, "META's tree is another format than META says")
        metaTree.formatVersion = 1
        // the payload's format is not META's
        var old = s.saveTree(); old.formatVersion = 0
        XCTAssertEqual(SaveCodec.read(SaveFile.write(meta: m, payload: old.write())).failureValue, .badPayload)
        // META's date and seed are the state's
        m.date += 1
        XCTAssertEqual(SaveCodec.read(SaveFile.write(meta: m, payload: payload)).failureValue, .badState)
        m.date -= 1; m.seed += 1
        XCTAssertEqual(SaveCodec.read(SaveFile.write(meta: m, payload: payload)).failureValue, .badState)
        m.seed -= 1
        // a player government whose serial was given to another row
        m.playerGovernment = GovRef(row: Idx(raw: 0), serial: s.governments.serial[1])
        XCTAssertEqual(SaveCodec.read(SaveFile.write(meta: m, payload: payload)).failureValue, .badMeta)
        m.playerGovernment = nil
        // raw and stored lengths differ with no compression
        var lengths = good
        let at = SaveFile.headerBytes + Int(UInt32(good[12]) | UInt32(good[13]) << 8 | UInt32(good[14]) << 16 | UInt32(good[15]) << 24)
        lengths[at] &+= 1
        reseal(&lengths)
        XCTAssertEqual(SaveCodec.read(lengths).failureValue, .badPayload)
        // a container version of 0
        var zero = good
        zero[8] = 0; zero[9] = 0
        reseal(&zero)
        XCTAssertEqual(SaveCodec.read(zero).failureValue, .notASave)
        // META's length past its cap
        var longMeta = good
        longMeta[12] = 0x71; longMeta[13] = 0x11; longMeta[14] = 0x01; longMeta[15] = 0
        reseal(&longMeta)
        XCTAssertNotNil(SaveCodec.read(longMeta).failureValue)
        XCTAssertEqual(SaveFile.readMeta(Array(longMeta.prefix(16)) + [UInt8](repeating: 0, count: 70_000)).failureValue, .badMeta)
        // a file past the bound is refused before it is hashed
        var huge = [UInt8](repeating: 0, count: SaveFile.mostPayloadBytes + SaveFile.mostMetaBytes + 100)
        huge.replaceSubrange(0..<8, with: SaveFile.magic)
        XCTAssertEqual(SaveCodec.read(huge).failureValue, .badPayload)
        // a hash of 31 bytes, a name that is not UTF-8
        var chunk = m.chunk
        chunk.columns = chunk.columns.map { $0.name == "rulesHash" ? .items("rulesHash", [[UInt8](repeating: 1, count: 31)]) : $0 }
        var r1 = SaveReport()
        XCTAssertNil(SaveMeta.read(chunk, report: &r1), "a hash of 31 bytes")
        chunk = m.chunk
        chunk.columns = chunk.columns.map { $0.name == "playerName" ? .items("playerName", [[0xFF, 0xFE]]) : $0 }
        var r2 = SaveReport()
        XCTAssertNil(SaveMeta.read(chunk, report: &r2), "a name that is not UTF-8")
    }

    /// The stored properties the Mirror test of `SaveTests` does not walk into: a field added to either fails here.
    func testTheSmallTypesSavedWholeHaveTheirFields() {
        XCTAssertEqual(Mirror(reflecting: SerialCounter()).children.count, 1, "SerialCounter: its next serial (SERL)")
        let c = IssuedCommand(day: GameDate(days: 0), issuer: .event, sequence: 1, command: .dissolveGovernment(government: GovRef(row: Idx(raw: 0), serial: Serial(raw: 1))))
        XCTAssertEqual(Mirror(reflecting: c).children.map { $0.label ?? "" }, ["day", "issuer", "sequence", "command"], "IssuedCommand: written whole by its codec")
    }
}
