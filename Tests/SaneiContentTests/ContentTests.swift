import Foundation
import XCTest
@testable import SaneiCore
@testable import SaneiContent
@testable import SaneiBake

/// The content foundation (T-042): the repository's registries bake and read back; each rule of the CSV reader, the
/// rows, the validator, the ID lock and the aliases refuses its own case (the others hold), so removing a rule fails a
/// test.
final class ContentTests: XCTestCase {
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    static let content = root.appendingPathComponent("content")
    static let registry = content.appendingPathComponent("registry")

    /// A copy of the repository's content in a new folder, with `change` applied to one file's text.
    func copy(_ file: String? = nil, _ change: (String) -> String = { $0 }) throws -> URL {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("content-\(UUID().uuidString)")
        let reg = dir.appendingPathComponent("registry")
        try FileManager.default.createDirectory(at: reg, withIntermediateDirectories: true)
        for name in try FileManager.default.contentsOfDirectory(atPath: Self.registry.path) {
            var text = try String(contentsOf: Self.registry.appendingPathComponent(name), encoding: .utf8)
            if name == file { text = change(text) }
            try Data(text.utf8).write(to: reg.appendingPathComponent(name))
        }
        addTeardownBlock { try? FileManager.default.removeItem(at: dir) }
        return dir
    }

    func refused(_ dir: URL, file: String, line: Int? = nil, _ why: String, _ at: UInt = #line) {
        do {
            _ = try Bake.validate(dir)
            XCTFail("\(why): not refused", line: at)
        } catch let e as BakeError {
            XCTAssertEqual(e.file, file, "\(why): \(e)", line: at)
            if let line { XCTAssertEqual(e.line, line, "\(why): \(e)", line: at) }
        } catch { XCTFail("\(why): \(error)", line: at) }
    }

    // MARK: the repository's content

    func testTheRepositorysContentValidatesAndBakesTheSameTwice() throws {
        let db = try Bake.validate(Self.content)
        XCTAssertEqual(db.polities.map(\.id), ["sdn", "ssd", "civ", "lby", "egy", "irq", "usa"])
        let a = try Bake.contentFile(Self.content), b = try Bake.contentFile(Self.content)
        XCTAssertEqual(a, b)
        XCTAssertEqual(try ContentFile.read(a).get(), db)
        XCTAssertEqual(ContentFile.hash(a), SHA256.hash(a, 0..<(a.count - 32)))
        // South Sudan exists from its independence; its default government's ID
        let ssd = try XCTUnwrap(db.polity("ssd"))
        XCTAssertEqual(db.polities[ssd].from, GameDate(year: 2011, month: 7, day: 9))
        XCTAssertEqual(ContentID.defaultGovernment(of: "sdn"), "sdn.gov")
        XCTAssertEqual(db.currencies[db.polities[db.polity("civ")!].currency].kind, .union)
    }

    func testEveryIDIsFoundAtItsRowAndNoOtherIs() throws {
        let db = try Bake.validate(Self.content)
        for (k, p) in db.polities.enumerated() { XCTAssertEqual(db.polity(p.id), k) }
        for (k, a) in db.actors.enumerated() { XCTAssertEqual(db.actor(a.id), k) }
        for (k, g) in db.groups.enumerated() { XCTAssertEqual(db.group(g.id), k) }
        for (k, c) in db.currencies.enumerated() { XCTAssertEqual(db.currency(c.id), k) }
        for absent in ["", "sd", "sdnx", "zzz", "aaa", "cur.sdg"] { XCTAssertNil(db.polity(absent), absent) }
        XCTAssertNil(db.currency("sdn"))
        XCTAssertEqual(ContentID.runtime(Serial(raw: 7)), "dyn:7")
        XCTAssertFalse(ContentID.isWellFormed(ContentID.runtime(Serial(raw: 7))), "a runtime ID is never a registry ID")
    }

    // MARK: content.bin

    func testADamagedOrForeignFileIsRefused() throws {
        let good = try Bake.contentFile(Self.content)
        func reseal(_ b: inout [UInt8]) { b.replaceSubrange((b.count - 32)..., with: SHA256.hash(b, 0..<(b.count - 32))) }
        XCTAssertEqual(ContentFile.read(Array("NOTCONTENT and more".utf8)).failureValue, .notContent)
        XCTAssertEqual(ContentFile.read(Array(good.prefix(20))).failureValue, .truncated)
        var flipped = good
        flipped[30] ^= 1
        XCTAssertEqual(ContentFile.read(flipped).failureValue, .damaged)
        var zero = good
        zero[8] = 0
        reseal(&zero)
        XCTAssertEqual(ContentFile.read(zero).failureValue, .notContent)
        var newer = good
        newer[8] = 2
        reseal(&newer)
        XCTAssertEqual(ContentFile.read(newer).failureValue, .newerContainer(2))
        var flags = good
        flags[10] = 1
        reseal(&flags)
        XCTAssertEqual(ContentFile.read(flags).failureValue, .newerContainer(1))
        var length = good
        length[12] &+= 1
        reseal(&length)
        XCTAssertEqual(ContentFile.read(length).failureValue, .malformed)
        // a payload of a later format
        let db = try ContentFile.read(good).get()
        var later = SaveTree(formatVersion: ContentFile.format + 1, chunks: ContentFile.chunks(db)).write()
        var w = ByteWriter()
        w.bytes = Array(good.prefix(ContentFile.headerBytes - 4))
        w.fixed(UInt32(later.count), as: UInt32.self)
        w.bytes.append(contentsOf: later)
        w.bytes.append(contentsOf: SHA256.hash(w.bytes))
        XCTAssertEqual(ContentFile.read(w.bytes).failureValue, .newerFormat(ContentFile.format + 1))
        // a table missing: malformed
        later = SaveTree(formatVersion: ContentFile.format, chunks: Array(ContentFile.chunks(db).dropLast())).write()
        w.bytes = Array(good.prefix(ContentFile.headerBytes - 4))
        w.fixed(UInt32(later.count), as: UInt32.self)
        w.bytes.append(contentsOf: later)
        w.bytes.append(contentsOf: SHA256.hash(w.bytes))
        XCTAssertEqual(ContentFile.read(w.bytes).failureValue, .malformed)
        // rows that break a rule of the validator, sealed: refused by the validator on reading
        var polities = db.polities
        polities[0].currency = 99
        let bad = ContentDB(polities: polities, actors: db.actors, groups: db.groups, currencies: db.currencies)
        XCTAssertEqual(ContentFile.read(ContentFile.write(bad)).failureValue, .invalid("polities sdn: no such currency"))
        // past the size bound
        var huge = [UInt8](repeating: 0, count: ContentFile.mostBytes + 1)
        huge.replaceSubrange(0..<8, with: ContentFile.magic)
        XCTAssertEqual(ContentFile.read(huge).failureValue, .malformed)
    }

    // MARK: the CSV reader

    func testEachCSVRuleRefusesItsCase() throws {
        func parse(_ s: String) throws -> CSV { try CSV.parse(Array(s.utf8), file: "f.csv") }
        func refused(_ bytes: [UInt8], line: Int, _ why: String, _ at: UInt = #line) {
            XCTAssertThrowsError(try CSV.parse(bytes, file: "f.csv"), why, line: at) { e in
                XCTAssertEqual((e as? BakeError)?.line, line, "\(why): \(e)", line: at)
            }
        }
        // the control: quotes, a quote inside, a comma inside, an empty field, Arabic, a final empty field
        let ok = try parse("a,b,c\n\"x, \"\"y\"\"\",,مصر\n1,2,\n")
        XCTAssertEqual(ok.rows.map(\.fields), [["x, \"y\"", "", "مصر"], ["1", "2", ""]])
        XCTAssertEqual(ok.rows.map(\.line), [2, 3])
        XCTAssertEqual(try parse("a\nx").rows.count, 1, "no final line break")
        refused([0xEF, 0xBB, 0xBF] + Array("a\nx\n".utf8), line: 1, "a byte-order mark")
        refused(Array("a\n".utf8) + [0xFF, 0x0A], line: 0, "not UTF-8")
        refused(Array("a\r\nx\r\n".utf8), line: 0, "a carriage return")
        refused([], line: 0, "empty")
        refused(Array("a,,b\n".utf8), line: 1, "an empty column name")
        refused(Array("a,a\n".utf8), line: 1, "a column twice")
        refused(Array("a\nx\n\ny\n".utf8), line: 3, "an empty line")
        refused(Array("a,b\nx\n".utf8), line: 2, "too few fields")
        refused(Array("a,b\nx,y,z\n".utf8), line: 2, "too many fields")
        refused(Array("a\n\"x\n".utf8), line: 2, "a quote never closed")
        refused(Array("a\n\"x\"y\n".utf8), line: 2, "text after a closing quote")
        refused(Array("a\nx\"y\n".utf8), line: 2, "a quote inside an unquoted field")
        refused(Array("a,b\n x,y\n".utf8), line: 2, "a space before a value")
        refused(Array("a,b\nx,y \n".utf8), line: 2, "a space after a value")
        XCTAssertThrowsError(try parse("a,b\nx,y\n").records(["b", "a"], file: "f.csv"), "a header not the schema")
    }

    // MARK: the rows

    func testEachRowRuleRefusesItsCase() throws {
        XCTAssertNoThrow(try Bake.validate(try copy()), "the control")
        let p = "polity_registry.csv", c = "currency_registry.csv", a = "actor_registry.csv", g = "group_registry.csv"
        func swap(_ old: String, _ new: String) -> (String) -> String { { $0.replacingOccurrences(of: old, with: new) } }
        refused(try copy(p, swap("sdn,state,", "sdn,kingdom,")), file: p, line: 2, "a word not in the list")
        refused(try copy(p, swap("للسودان,بالسودان,#C8A15A", "للسودان,بالسودان,#c8a15a")), file: p, line: 2, "a colour in small letters")
        refused(try copy(p, swap("#C8A15A", "#C8A15")), file: p, line: 2, "a colour of five digits")
        refused(try copy(p, swap("السودان,m,singular,1,للسودان", "السودان,x,singular,1,للسودان")), file: p, line: 2, "a gender not m or f")
        refused(try copy(p, swap("السودان,m,singular,1,للسودان", "السودان,m,singular,2,للسودان")), file: p, line: 2, "definite not 0 or 1")
        refused(try copy(p, swap("cur.sdg,,,src.unterm", "cur.zzz,,,src.unterm")), file: p, line: 2, "a currency no row has")
        refused(try copy(p, swap("cur.ssp,2011-07-09", "cur.ssp,2011-7-9")), file: p, line: 3, "a day not YYYY-MM-DD")
        refused(try copy(p, swap("cur.ssp,2011-07-09", "cur.ssp,2011-02-30")), file: p, line: 3, "a day not in the calendar")
        refused(try copy(p, swap("\nsdn,", "\nSdn,")), file: p, line: 2, "an ID not well formed")
        refused(try copy(p, swap("\nssd,", "\nsdn,")), file: p, line: 3, "an ID twice")
        refused(try copy(c, swap("cur.ssp,SSP,national", "cur.ssp,SSP,federal")), file: c, line: 3, "a currency kind not in the list")
        refused(try copy(a, swap("act.sdn.ncp,sdn,", "act.sdn.ncp,xxx,")), file: a, line: 2, "an actor's polity no row has")
        refused(try copy(a, swap("act.sdn.ncp,sdn,party", "act.sdn.ncp,sdn,club")), file: a, line: 2, "an actor kind not in the list")
        refused(try copy(g, swap("grp.arab,ethnolinguistic", "grp.arab,tribal")), file: g, line: 2, "a dimension not in the list")
        refused(try copy(p, swap("id,kind,", "id,type,")), file: p, line: 1, "a header not the schema")
        refused(try copy(p, swap("\n", "\r\n")), file: p, line: 0, "a carriage return in a registry")
    }

    // MARK: the validator

    func testEachValidatorRuleRefusesItsCase() throws {
        let base = try Bake.validate(Self.content)
        XCTAssertEqual(base.problems(), [])
        struct Tables { var polities: [PolityRow]; var actors: [ActorRow]; var groups: [GroupRow]; var currencies: [CurrencyRow] }
        func refused(_ why: String, _ expect: String, _ at: UInt = #line, _ f: (inout Tables) -> Void) {
            var t = Tables(polities: base.polities, actors: base.actors, groups: base.groups, currencies: base.currencies)
            f(&t)
            let rebuilt = ContentDB(polities: t.polities, actors: t.actors, groups: t.groups, currencies: t.currencies)
            XCTAssertEqual(rebuilt.problems(), [expect], why, line: at)
        }
        refused("an ID twice", "polities: the ID sdn is used twice") { $0.polities[1].id = "sdn" }
        refused("an ID not well formed", "polities: the ID «Sdn» is not well formed") { $0.polities[0].id = "Sdn" }
        refused("an empty name", "polities sdn: an empty name") { $0.polities[0].name.name = "" }
        refused("an empty ل form", "actors act.sdn.ncp: an empty withLi") { $0.actors[0].name.withLi = "" }
        refused("a name past 256 bytes", "groups grp.arab: short past 256 bytes") { $0.groups[0].name.short = String(repeating: "م", count: 129) }
        refused("a currency out of range", "polities sdn: no such currency") { $0.polities[0].currency = 7 }
        refused("a currency below 0", "polities sdn: no such currency") { $0.polities[0].currency = -1 }
        refused("a colour past 24 bits", "polities sdn: a colour past 0xFFFFFF") { $0.polities[0].colour = 0x1_00_00_00 }
        refused("a first day outside the calendar", "polities sdn: a first day outside the calendar") { $0.polities[0].from = GameDate(days: -50_000) }
        refused("a last day outside the calendar", "polities sdn: a last day outside the calendar") { $0.polities[0].until = GameDate(days: 90_000) }
        refused("a last day before the first", "polities ssd: its last day before its first") { $0.polities[1].until = GameDate(year: 2011, month: 7, day: 8) }
        refused("an actor's polity out of range", "actors act.sdn.ncp: no such polity") { $0.actors[0].polity = 7 }
        refused("an ISO code in small letters", "currencies cur.sdg: the ISO code «sdg» is not three capital letters") { $0.currencies[0].iso = "sdg" }
        refused("an ISO code of four letters", "currencies cur.sdg: the ISO code «SDGX» is not three capital letters") { $0.currencies[0].iso = "SDGX" }
        refused("no evidence", "currencies cur.usd: no evidence") { $0.currencies[6].evidence = "" }
        refused("evidence past 256 bytes", "groups grp.dinka: evidence past 256 bytes") { $0.groups[1].evidence = String(repeating: "e", count: 257) }
        // the caps
        let many = (0...RegistryCaps.polities).map { k in var p = base.polities[0]; p.id = "p\(k)"; return p }
        let capped = ContentDB(polities: many, actors: [], groups: [], currencies: base.currencies)
        XCTAssertEqual(capped.problems(), ["polities: 321 rows, past the cap of 320"])
        // the last day on the first is allowed
        var oneDay = base.polities
        oneDay[1].until = oneDay[1].from
        XCTAssertEqual(ContentDB(polities: oneDay, actors: base.actors, groups: base.groups, currencies: base.currencies).problems(), [])
    }

    // MARK: the ID lock and the aliases

    func testTheIDLockOnlyGrowsAndCoversEveryID() throws {
        let lock = "ids.lock", p = "polity_registry.csv", al = "aliases.json"
        refused(try copy(lock) { $0.replacingOccurrences(of: "polity usa\n", with: "") }, file: "content/registry", line: 0, "a registry ID not locked")
        // a polity removed from its registry with no alias
        let removed: (String) -> String = { $0.replacingOccurrences(of: "usa,state,الولايات المتحدة الأمريكية,الولايات المتحدة,f,plural,1,للولايات المتحدة,بالولايات المتحدة,#3B6EA5,cur.usd,,,src.unterm\n", with: "") }
        refused(try copy(p, removed), file: "content/registry", line: 0, "a locked ID no registry holds and no alias replaces")
        // with an alias it holds
        let dir = try copy(p, removed)
        try Data(#"{"format": 1, "aliases": [{"kind": "polity", "from": "usa", "to": [{"id": "egy", "weight": 10000}]}]}"#.utf8)
            .write(to: dir.appendingPathComponent("registry").appendingPathComponent(al))
        XCTAssertNoThrow(try Bake.validate(dir))
        // an alias of an ID still held, one never issued, one to an ID no registry holds
        let held = #"{"format": 1, "aliases": [{"kind": "polity", "from": "sdn", "to": [{"id": "egy", "weight": 10000}]}]}"#
        refused(try copy(al) { _ in held }, file: "content/registry", line: 0, "an alias of an ID still held")
        let never = #"{"format": 1, "aliases": [{"kind": "polity", "from": "zzz", "to": [{"id": "egy", "weight": 10000}]}]}"#
        refused(try copy(al) { _ in never }, file: "content/registry", line: 0, "an alias of an ID never issued")
        let dir2 = try copy(p, removed)
        try Data(#"{"format": 1, "aliases": [{"kind": "polity", "from": "usa", "to": [{"id": "can", "weight": 10000}]}]}"#.utf8)
            .write(to: dir2.appendingPathComponent("registry").appendingPathComponent(al))
        refused(dir2, file: "content/registry", line: 0, "an alias to an ID no registry holds")
        // the lock's own lines
        refused(try copy(lock) { $0 + "kingdom abc\n" }, file: "ids.lock", line: 25, "a kind not known")
        refused(try copy(lock) { $0 + "polity sdn\n" }, file: "ids.lock", line: 25, "a line twice")
        refused(try copy(lock) { $0 + "polity Bad\n" }, file: "ids.lock", line: 25, "an ID not well formed")
        refused(try copy(lock) { $0 + "polity  zzz\n" }, file: "ids.lock", line: 25, "two spaces")
    }

    func testAliasesAreReadStrictly() throws {
        func refused(_ json: String, _ why: String, _ at: UInt = #line) {
            XCTAssertThrowsError(try Aliases.parse(Array(json.utf8)), why, line: at)
        }
        let ok = try Aliases.parse(Array(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 4000}, {"id": "c", "weight": 6000}]}]}"#.utf8))
        XCTAssertEqual(ok.replacement("polity", "a")?.map(\.weight), [4000, 6000])
        refused(#"{"format": 1, "aliases": [], "extra": 0}"#, "an unknown key at the top")
        refused(#"{"format": 2, "aliases": []}"#, "a later format")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 10000}], "note": ""}]}"#, "an unknown key in an alias")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 10000, "x": 1}]}]}"#, "an unknown key in a target")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": true}]}]}"#, "a weight that is a boolean")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 9999.5}]}]}"#, "a weight with a fraction")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 9999}]}]}"#, "weights not summing to 10,000")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 0}, {"id": "c", "weight": 10000}]}]}"#, "a weight of 0")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "a", "weight": 10000}]}]}"#, "an ID replaced by itself")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": []}]}"#, "no target")
        refused(#"{"format": 1, "aliases": [{"kind": "nation", "from": "a", "to": [{"id": "b", "weight": 10000}]}]}"#, "a kind not known")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "A", "to": [{"id": "b", "weight": 10000}]}]}"#, "an ID not well formed")
        let twice = #"{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 10000}]}"#
        refused(#"{"format": 1, "aliases": [\#(twice), \#(twice)]}"#, "an ID replaced twice")
        refused("[]", "not an object")
    }
}

extension Result {
    var failureValue: Failure? {
        if case let .failure(e) = self { return e }
        return nil
    }
}
