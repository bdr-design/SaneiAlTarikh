import Foundation
import XCTest
@testable import SaneiCore
@testable import SaneiContent
@testable import SaneiBake

/// Each rule of the content at its edge (T-042's mutation review, 2026-11-13): the IDs' and texts' bounds exactly at
/// and one past them, every table's cap, a duplicate wherever it sorts, each field and each row rule on its own, the
/// reader's edges, the registries' lines, the JSON reader's depth and escapes, the lock's and the aliases' rules and
/// simcli's options. Each test passes on the code and fails on a planted fault.
final class ContentRulesTests: XCTestCase, ContentFixtures {
    // MARK: a small content built in code

    func name(_ t: String = "اسم", number: GrammaticalNumber = .singular, human: Bool = false) -> NameRecord {
        NameRecord(name: t, short: t, gender: .masculine, number: number, human: human, definite: false, oblique: t,
                   withLi: "ل" + t, withBi: "ب" + t)
    }

    /// Three capital letters for `k` (AAA, AAB, ...).
    func iso(_ k: Int) -> String {
        let a = Array("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        return String([a[k / 676 % 26], a[k / 26 % 26], a[k % 26]])
    }

    func content(polities: Int = 2, actors: Int = 2, groups: Int = 2, currencies: Int = 2) -> ContentDB {
        ContentDB(
            polities: (0..<polities).map { PolityRow(id: "p\($0)", status: .state, name: name(), colour: 0x102030, evidence: "src.x") },
            actors: (0..<actors).map { ActorRow(id: "act.p\($0 % polities).a\($0)", polity: $0 % polities, kind: .party, name: name(), evidence: "src.x") },
            groups: (0..<groups).map { GroupRow(id: "grp.g\($0)", dimension: .ethnolinguistic, name: name(number: .plural, human: true), evidence: "src.x") },
            currencies: (0..<currencies).map { CurrencyRow(id: "cur.c\($0)", iso: iso($0), reach: .national, name: name(), evidence: "src.x") })
    }

    func with(_ db: ContentDB, polities: [PolityRow]? = nil, actors: [ActorRow]? = nil, groups: [GroupRow]? = nil,
              currencies: [CurrencyRow]? = nil) -> ContentDB {
        ContentDB(polities: polities ?? db.polities, actors: actors ?? db.actors, groups: groups ?? db.groups,
                  currencies: currencies ?? db.currencies)
    }

    /// The validator refuses `db` with a problem in `table` (at `row` when given) whose message holds `rule`.
    func refused(_ db: ContentDB, _ table: String, row: Int? = nil, _ rule: String, _ at: UInt = #line) {
        let p = db.problems()
        XCTAssertTrue(p.contains { $0.table == table && (row == nil || $0.row == row) && $0.message.contains(rule) },
                      "«\(rule)» in \(table) \(row.map(String.init) ?? ""): \(p)", line: at)
    }

    func holds(_ db: ContentDB, _ why: String, _ at: UInt = #line) { XCTAssertEqual(db.problems(), [], why, line: at) }

    // MARK: the IDs

    func testTheIDRulesAtTheirEdges() {
        XCTAssertEqual([ContentID.mostBytes, ContentID.mostPolityBytes], [64, 32])
        XCTAssertEqual([RegistryCaps.polities, RegistryCaps.actors, RegistryCaps.groups, RegistryCaps.currencies], [320, 1_984, 1_024, 320])
        XCTAssertTrue(ContentID.isWellFormed(String(repeating: "a", count: 64)))
        XCTAssertFalse(ContentID.isWellFormed(String(repeating: "a", count: 65)))
        for ok in ["a", "z", "a-b", "a_b", "a.b", "a9", "z0-_.z"] { XCTAssertTrue(ContentID.isWellFormed(ok), ok) }
        for bad in ["", "1a", ".a", "_a", "-a", "A", "aB", "a b", "a/b", "a:b", "a{", "a`", "a@", "a[", "é"] {
            XCTAssertFalse(ContentID.isWellFormed(bad), bad)
        }
        XCTAssertTrue(ContentID.isPolityID(String(repeating: "p", count: 32)))
        XCTAssertFalse(ContentID.isPolityID(String(repeating: "p", count: 33)))
        XCTAssertFalse(ContentID.isPolityID("a.b"))
        XCTAssertTrue(ContentID.isActorID("act.sdn.x", of: "sdn"))
        for bad in ["act.sdn.", "act.sdn", "act.sdnx.y", "sdn.x", "act.ssd.x"] { XCTAssertFalse(ContentID.isActorID(bad, of: "sdn"), bad) }
        XCTAssertTrue(ContentID.isGovernmentID("sdn.gov", of: "sdn"))
        for bad in ["sdn.", "sdn", "sdn.a.b", "ssd.gov", "sdnx.gov"] { XCTAssertFalse(ContentID.isGovernmentID(bad, of: "sdn"), bad) }
        // a well-formed ID of each kind at its longest
        let p32 = String(repeating: "p", count: 32)
        let bare = content(actors: 0)
        holds(with(bare, polities: [PolityRow(id: p32, status: .state, name: name(), colour: 0, evidence: "src.x"), bare.polities[1]]),
              "a polity ID of 32 bytes")
        refused(with(bare, polities: [PolityRow(id: p32 + "p", status: .state, name: name(), colour: 0, evidence: "src.x"), bare.polities[1]]),
                "polities", row: 0, "is not a polity's")
    }

    // MARK: every table's cap, at it and one past it

    func testEveryTableHoldsItsCapAndNoMore() throws {
        let caps = content(polities: RegistryCaps.polities, actors: RegistryCaps.actors, groups: RegistryCaps.groups,
                           currencies: RegistryCaps.currencies)
        holds(caps, "every table at its cap")
        let back = try ContentFile.read(ContentFile.write(caps)).get().db
        XCTAssertEqual(back, caps, "a file at the caps reads back")
        let past: [(String, ContentDB)] = [
            ("polities", content(polities: RegistryCaps.polities + 1)),
            ("actors", content(actors: RegistryCaps.actors + 1)),
            ("groups", content(groups: RegistryCaps.groups + 1)),
            ("currencies", content(currencies: RegistryCaps.currencies + 1)),
        ]
        for (table, db) in past {
            refused(db, table, "past the cap")
            XCTAssertEqual(db.problems().filter { $0.message.contains("past the cap") }.count, 1, table)
            // a forged file one past a cap is refused by the reader before its rows are made
            XCTAssertEqual(ContentFile.read(file(ContentFile.chunks(db))).failureValue, .malformed, table)
        }
    }

    // MARK: a duplicate wherever it sorts

    func testADuplicateIsFoundWhereverItSorts() {
        let db = content(polities: 3, actors: 3, groups: 3, currencies: 3)
        // two rows, one ID (the smallest of the table)
        refused(with(db, groups: [db.groups[0], db.groups[0]]), "groups", row: 1, "is used twice")
        // the smallest ID twice among three: sorted to the first two places
        var g = db.groups
        g[2] = g[0]
        refused(with(db, groups: g), "groups", row: 2, "is used twice")
        var a = db.actors
        a[1] = ActorRow(id: a[0].id, polity: a[0].polity, kind: .party, name: name(), evidence: "src.x")
        refused(with(db, actors: a), "actors", row: 1, "is used twice")
        var c = db.currencies
        c[2] = CurrencyRow(id: c[1].id, iso: "ZZZ", reach: .national, name: name(), evidence: "src.x")
        refused(with(db, currencies: c), "currencies", row: 2, "is used twice")
        var p = db.polities
        p[1] = p[0]
        refused(with(db, polities: p), "polities", row: 1, "is used twice")
        XCTAssertEqual(ContentDB.repeated(ContentDB.sortedOrder(["b", "a", "a"]), ["b", "a", "a"]), 2)
        XCTAssertNil(ContentDB.repeated(ContentDB.sortedOrder(["b", "a"]), ["b", "a"]))
        XCTAssertEqual(ContentDB.repeated(ContentDB.sortedOrder(["a", "a"]), ["a", "a"]), 1)
    }

    func testEqualContentsAgreeOnEveryRow() {
        let db = content()
        XCTAssertEqual(db, content())
        var a = db.actors
        a[1].name.withBi = "بشيء"
        XCTAssertNotEqual(with(db, actors: a), db, "one actor's one form")
        var c = db.currencies
        c[0].reach = .union
        XCTAssertNotEqual(with(db, currencies: c), db, "one currency's reach")
        var g = db.groups
        g[1].evidence = "src.y"
        XCTAssertNotEqual(with(db, groups: g), db, "one group's evidence")
    }

    // MARK: the texts, each rule and each field on its own

    func testEachTextRuleAndFieldOnItsOwn() {
        let db = content()
        func polity(_ n: NameRecord) -> ContentDB { with(db, polities: [PolityRow(id: "p0", status: .state, name: n, colour: 0, evidence: "src.x"), db.polities[1]]) }
        let at256 = String(repeating: "ب", count: 128), at257 = at256 + "a"
        XCTAssertEqual([at256.utf8.count, at257.utf8.count], [256, 257])
        XCTAssertEqual(ContentDB.mostTextBytes, 256)
        func long(_ t: String) -> NameRecord {
            NameRecord(name: t, short: t, gender: .masculine, number: .singular, human: false, definite: false, oblique: t, withLi: "ل",
                       withBi: "ب")
        }
        holds(polity(long(at256)), "a text of exactly 256 bytes")
        refused(polity(long(at257)), "polities", row: 0, "past 256 bytes")
        refused(polity(name("اسم ")), "polities", row: 0, "spaced at an end")
        refused(polity(name(" اسم")), "polities", row: 0, "spaced at an end")
        for v: UInt32 in [0x01, 0x1F, 0x7F, 0x85, 0x9F, 0x2028, 0x2029, 0xFEFF, 0x202A, 0x202C, 0x202E, 0x2066, 0x2069, 0x200E, 0x200F, 0x061C] {
            refused(polity(name("ا" + String(Unicode.Scalar(v)!) + "ب")), "polities", row: 0, "a control, an invisible")
        }
        refused(polity(name("ا" + String(Unicode.Scalar(0xFDD0 as UInt32)!) + "ب")), "polities", row: 0, "unassigned or noncharacter code point")
        refused(polity(name("ا\u{E000}ب")), "polities", row: 0, "a private-use")
        refused(polity(name("\u{200D}اب")), "polities", row: 0, "starts with a mark or a joiner")
        refused(polity(name("اب\u{200C}")), "polities", row: 0, "ends with a joiner")
        refused(polity(name("ا\u{034F}ب")), "polities", row: 0, "an invisible or ignorable character")
        refused(polity(name("ا\u{FFFD}ب")), "polities", row: 0, "a replacement character")
        // U+0378, unassigned: refused by its age; the message names every rule of a name's text at once, so these lines
        // check each input is refused and that the message holds each rule's words
        refused(polity(name("ا" + String(Unicode.Scalar(0x0378 as UInt32)!) + "ب")), "polities", row: 0, "one past Unicode 15.0")
        holds(polity(name("ا\u{200C}ب")), "the zero-width non-joiner")
        holds(polity(name("ا\u{200D}ب")), "the zero-width joiner")
        // each field on its own, named in the problem
        let bad = "ا\u{200B}ب"
        var fields: [(String, NameRecord)] = []
        var n = name(); n.name = bad; fields.append(("name", n))
        n = name(); n.short = bad; fields.append(("short", n))
        n = name(); n.oblique = bad; fields.append(("oblique", n))
        n = name(); n.withLi = bad; fields.append(("withLi", n))
        n = name(); n.withBi = bad; fields.append(("withBi", n))
        for (field, record) in fields {
            let p = polity(record).problems()
            XCTAssertEqual(p.count, 1, field)
            XCTAssertTrue(p.first?.message.hasPrefix(field + " is empty") == true, "\(field): \(p)")
        }
    }

    /// The hidden characters written out are `unicodeVersion`'s (checked on the pinned toolchain, whose tables are
    /// 15.0): for every character of that version or older, and every private-use one, in the list exactly when it is
    /// a format, private-use or default-ignorable character other than the joiners; the ranges in rising order, apart.
    /// A character newer than the toolchain is not checked here: `isNameText` refuses it by its age.
    func testTheHiddenListIsUnicode15s() {
        let ranges = ContentDB.hiddenRanges
        for k in ranges.indices {
            XCTAssertLessThanOrEqual(ranges[k].0, ranges[k].1)
            if k > 0 { XCTAssertLessThan(ranges[k - 1].1 + 1, ranges[k].0, "apart: \(k)") }
        }
        var checked = 0
        for v in UInt32(0)...0x10FFFF {
            guard let s = Unicode.Scalar(v), let age = s.properties.age,
                  age.major < ContentDB.unicodeVersion.major
                    || (age.major == ContentDB.unicodeVersion.major && age.minor <= ContentDB.unicodeVersion.minor)
                    || s.properties.generalCategory == .privateUse else { continue }
            let hidden: Bool
            switch s.properties.generalCategory {
            case .format, .privateUse: hidden = true
            default: hidden = s.properties.isDefaultIgnorableCodePoint
            }
            let want = hidden && v != 0x200C && v != 0x200D
            if ContentDB.isHidden(v) != want { XCTFail("U+\(String(v, radix: 16)): \(want)") }
            checked += 1
        }
        XCTAssertGreaterThan(checked, 140_000)
    }

    // MARK: the rows, each rule on its own

    func testEachRowRuleOnItsOwn() throws {
        let db = content()
        holds(db, "the control")
        refused(with(db, polities: []), "polities", "no polity")
        refused(with(db, polities: [], actors: []), "polities", "no polity")
        refused(with(db, currencies: []), "currencies", "no currency")
        // evidence IDs, each table
        var p = db.polities
        p[1].evidence = "Not An ID"
        refused(with(db, polities: p), "polities", row: 1, "is not an evidence ID")
        var a = db.actors
        a[1].evidence = ""
        refused(with(db, actors: a), "actors", row: 1, "is not an evidence ID")
        var g = db.groups
        g[0].evidence = "src x"
        refused(with(db, groups: g), "groups", row: 0, "is not an evidence ID")
        var c = db.currencies
        c[1].evidence = "1src"
        refused(with(db, currencies: c), "currencies", row: 1, "is not an evidence ID")
        // a colour at the edge and past it
        p = db.polities
        p[0].colour = 0xFF_FF_FF
        holds(with(db, polities: p), "the colour 0xFFFFFF")
        p[0].colour = 0x100_0000
        refused(with(db, polities: p), "polities", row: 0, "a colour past 0xFFFFFF")
        // an actor's polity at and past the table's end: a problem, never a trap (from a forged file too)
        for bad in [db.polities.count, db.polities.count + 7, -1] {
            a = db.actors
            a[0].polity = bad
            refused(with(db, actors: a), "actors", row: 0, "no such polity")
        }
        a = db.actors
        a[0].polity = db.polities.count
        guard case let .invalid(problem)? = ContentFile.read(file(ContentFile.chunks(with(db, actors: a)))).failureValue else {
            return XCTFail("a forged actor's polity past the table")
        }
        XCTAssertEqual(problem.table, "actors")
        // the IDs of the groups and the currencies
        g = db.groups
        g[1] = GroupRow(id: "Grp.x", dimension: .ethnolinguistic, name: name(number: .plural, human: true), evidence: "src.x")
        refused(with(db, groups: g), "groups", row: 1, "is not well formed")
        c = db.currencies
        c[0] = CurrencyRow(id: "cur x", iso: "AAA", reach: .national, name: name(), evidence: "src.x")
        refused(with(db, currencies: c), "currencies", row: 0, "is not well formed")
        // ISO codes: three capitals, the ends of the alphabet in, the bytes around them out
        for ok in ["AAA", "ZZZ", "AZB"] {
            c = db.currencies
            c[0].iso = ok
            holds(with(db, currencies: c), ok)
        }
        // a code used twice wherever it sorts: the first two in the order, and the last two
        for code in ["AAA", "AAC"] {                                // AAA, AAB, AAC with the middle one changed
            c = content(currencies: 3).currencies
            c[1].iso = code
            refused(with(db, currencies: c), "currencies", "is another currency's")
        }
        for bad in ["AB@", "AB[", "ab1", "AB", "ABCD", "AÉB"] {
            c = db.currencies
            c[0].iso = bad
            refused(with(db, currencies: c), "currencies", row: 0, "is not three capital letters")
        }
        // human only on plurals and duals
        g = db.groups
        g[0].name = name(number: .dual, human: true)
        holds(with(db, groups: g), "a dual of people")
        g = db.groups
        g[0].name = name(number: .singular, human: true)
        refused(with(db, groups: g), "groups", row: 0, "human is for plural names")
    }

    // MARK: the reader's edges

    func testTheReadersEdges() throws {
        let db = content()
        let good = ContentFile.write(db)
        // the size: exactly the most bytes is read on to its trailer; one more is refused first
        var huge = ContentFile.magic + [UInt8](repeating: 0, count: ContentFile.mostBytes - 8)
        XCTAssertEqual(ContentFile.read(huge).failureValue, .damaged)
        huge.append(0)
        XCTAssertEqual(ContentFile.read(huge).failureValue, .malformed)
        // the smallest file: a header and a trailer
        let least = ContentFile.headerBytes + 32
        XCTAssertEqual(ContentFile.read(ContentFile.magic + [UInt8](repeating: 0, count: least - 9)).failureValue, .truncated)
        XCTAssertEqual(ContentFile.read(ContentFile.magic + [UInt8](repeating: 0, count: least - 8)).failureValue, .damaged)
        // every byte of the magic
        for k in 0..<8 {
            var magic = good
            magic[k] ^= 1
            XCTAssertEqual(ContentFile.read(magic).failureValue, .notContent, "magic byte \(k)")
        }
        // an older format
        XCTAssertEqual(ContentFile.read(file(ContentFile.chunks(db), format: 0)).failureValue, .malformed)
        // a column shorter than its table
        func replaced(_ tag: String, _ column: SaveColumn) -> [UInt8] {
            var chunks = ContentFile.chunks(db)
            let at = chunks.firstIndex { $0.tag == tag }!
            chunks[at].columns = chunks[at].columns.map { $0.name == column.name ? column : $0 }
            return file(chunks)
        }
        XCTAssertEqual(ContentFile.read(replaced("POLI", .of("colour", [UInt64(1)], .u32, .raw))).failureValue, .malformed, "a short column")
        XCTAssertEqual(ContentFile.read(replaced("GRUP", ContentFile.text("short", ["عرب"]))).failureValue, .malformed, "a short text column")
        // a raw value no case has
        XCTAssertEqual(ContentFile.read(replaced("POLI", .of("status", [UInt8](repeating: 200, count: 2), .u8, .raw))).failureValue, .malformed)
        XCTAssertEqual(ContentFile.read(replaced("CURR", .of("gender", [UInt8](repeating: 9, count: 2), .u8, .raw))).failureValue, .malformed)
        // a text at the bound reads; one past it, or not UTF-8, is refused by the reader
        let at256 = String(repeating: "ب", count: 128)
        var p = db.polities
        p[0].name.short = at256
        let longest = with(db, polities: p)
        XCTAssertEqual(try ContentFile.read(ContentFile.write(longest)).get().db, longest)
        XCTAssertEqual(ContentFile.read(replaced("POLI", ContentFile.text("short", [at256 + "a", "اسم"]))).failureValue, .malformed)
        var chunks = ContentFile.chunks(db)
        chunks[0].columns = chunks[0].columns.map { $0.name == "short" ? .items("short", [[0xD8], Array("اسم".utf8)]) : $0 }
        XCTAssertEqual(ContentFile.read(file(chunks)).failureValue, .malformed, "a broken UTF-8 text")
    }

    // MARK: the registries' files and lines

    func testTheRegistriesFilesAndLines() throws {
        let p = "polity_registry.csv", c = "currency_registry.csv"
        // NFC, not a compatibility form: a ligature that NFKC would split is kept
        XCTAssertNoThrow(try Bake.validate(try copy(p, swap("جمهورية السودان,", "جمهورية السودان \u{FEFB},"))))
        refused(try copy(p, swap("#A8743C", "#A8743C0")), file: p, line: 2, "is not #RRGGBB")
        refused(try copy(p, swap("#A8743C", "1A8743C")), file: p, line: 2, "is not #RRGGBB")
        refused(try copy(p, swap("#A8743C", "A8743C")), file: p, line: 2, "is not #RRGGBB")
        // a table-wide problem has no line
        refused(try copy(c) { String($0.prefix { $0 != "\n" }) + "\n" }, file: c, line: 0, "no currency")
        // each table's own lines: an eighth currency, past the polities' seven rows
        let extra = "cur.zzz,zzz,national,الزد,الزد,m,singular,0,1,الزد,للزد,بالزد,src.iso4217\n"
        refused(try copy(c) { $0 + extra }, file: c, line: 9, "is not three capital letters")
        // the first problem, not the last
        refused(try copy(c, swap("cur.ssp,SSP,", "cur.ssp,ssp,")) , file: c, line: 3, "is not three capital letters")
        let two = try copy(c) { $0.replacingOccurrences(of: "cur.ssp,SSP,", with: "cur.ssp,ssp,").replacingOccurrences(of: "cur.sdg,SDG,", with: "cur.sdg,sdg,") }
        refused(two, file: c, line: 2, "is not three capital letters")
    }

    // MARK: the JSON reader

    func testTheJSONReadersDepthEscapesAndLines() throws {
        func parse(_ s: String) throws -> JSON { try JSON.parse(Array(s.utf8), file: "f.json") }
        func refused(_ s: String, line: Int, _ rule: String, _ at: UInt = #line) {
            XCTAssertThrowsError(try parse(s), rule, line: at) { e in
                guard let b = e as? BakeError else { return XCTFail("\(e)", line: at) }
                XCTAssertEqual(b.line, line, "\(b)", line: at)
                XCTAssertTrue(b.message.contains(rule), "«\(rule)» not in «\(b.message)»", line: at)
            }
        }
        // 64 levels, the whole value the first: arrays and objects alike
        XCTAssertNoThrow(try parse(String(repeating: "[", count: 64) + String(repeating: "]", count: 64)))
        refused(String(repeating: "[", count: 65) + String(repeating: "]", count: 65), line: 1, "nested past 64")
        XCTAssertNoThrow(try parse(String(repeating: "{\"a\":", count: 63) + "{}" + String(repeating: "}", count: 63)))
        refused(String(repeating: "{\"a\":", count: 64) + "{}" + String(repeating: "}", count: 64), line: 1, "nested past 64")
        XCTAssertNoThrow(try parse(String(repeating: "[", count: 63) + "1" + String(repeating: "]", count: 63)))
        // escapes and controls
        XCTAssertEqual(try parse(#""a\tb\/c\\d\"e\nf""#), .string("a\tb/c\\d\"e\nf"))
        refused("\"a\u{1F}b\"", line: 1, "control character")
        refused("\"a\u{01}b\"", line: 1, "control character")
        XCTAssertEqual(try parse("\"a\u{20}b\""), .string("a b"))
        refused(#""a\ub""#, line: 1, "an escape this reader does not take")
        // the line a problem is on
        refused("{\n\"a\": 1,\n\"a\": 2}", line: 3, "twice")
        refused("[1,\n\n2,\n03]", line: 4, "leading zero")
        // the bytes
        XCTAssertThrowsError(try JSON.parse([0x22, 0xFF, 0x22], file: "f.json")) { e in
            XCTAssertTrue((e as? BakeError)?.message.contains("not valid UTF-8") == true, "\(e)")
        }
        // a carriage return is white space to the reader; aliases.json refuses it, as the CSV files and the lock do
        XCTAssertEqual(try parse("[1,\r\n2]"), .array([.integer(1), .integer(2)]))
        XCTAssertThrowsError(try Aliases.parse(Array("{\"format\": 1,\r\n\"aliases\": []}".utf8))) { e in
            XCTAssertTrue((e as? BakeError)?.message.contains("carriage return") == true, "\(e)")
        }
        // equality looks at values
        XCTAssertNotEqual(JSON.object([("a", .integer(1))]), .object([("a", .integer(2))]))
        XCTAssertNotEqual(JSON.object([("a", .integer(1))]), .object([("b", .integer(1))]))
        XCTAssertNotEqual(JSON.array([.integer(1)]), .array([.integer(1), .integer(1)]))
        XCTAssertNotEqual(JSON.string("a"), .string("b"))
        XCTAssertNotEqual(JSON.bool(true), .bool(false))
        XCTAssertNotEqual(JSON.null, .integer(0))
        XCTAssertEqual(JSON.object([("a", .array([.null]))]), .object([("a", .array([.null]))]))
    }

    // MARK: the lock and the aliases

    func testTheLocksAndTheAliasesRules() throws {
        XCTAssertThrowsError(try IDLock.parse(Array("polity sdn junk\n".utf8)), "three fields")
        XCTAssertThrowsError(try IDLock.parse(Array("polity\n".utf8)), "one field")
        let two = try IDLock.parse(Array("polity a\nactor a\ngroup a\n".utf8))
        XCTAssertEqual(two.entries.map(\.kind), ["polity", "actor", "group"], "one ID under two kinds is two entries")
        XCTAssertThrowsError(try IDLock.parse(Array("polity a\npolity a\n".utf8)), "the same entry twice")
        func refusedAlias(_ to: String, _ rule: String, _ at: UInt = #line) {
            let json = #"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [\#(to)]}]}"#
            XCTAssertThrowsError(try Aliases.parse(Array(json.utf8)), rule, line: at) { e in
                XCTAssertTrue((e as? BakeError)?.message.contains(rule) == true, "«\(rule)»: \(e)", line: at)
                XCTAssertEqual((e as? BakeError)?.line, 1, line: at)
            }
        }
        refusedAlias(#"{"id": "b", "weight": 6000}, {"id": "c", "weight": 6000}"#, "sum to 10,000")
        refusedAlias(#"{"id": "B", "weight": 10000}"#, "well-formed ID")
        refusedAlias(#"{"id": "", "weight": 10000}"#, "well-formed ID")
        let ok = try Aliases.parse(Array(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 10000}]}]}"#.utf8))
        XCTAssertNotNil(ok.replacement("polity", "a"))
        XCTAssertNil(ok.replacement("group", "a"), "an alias is of its kind")
        XCTAssertNil(ok.replacement("polity", "b"))
    }

    // MARK: simcli's options

    func testSimclisOptions() {
        func parsed(_ s: String) -> SimcliOptions? { try? SimcliOptions.parse(s.split(separator: " ").map(String.init)).get() }
        XCTAssertEqual(parsed("validate"), SimcliOptions(command: "validate", content: "content", out: nil))
        XCTAssertEqual(parsed("validate --content c"), SimcliOptions(command: "validate", content: "c", out: nil))
        XCTAssertEqual(parsed("bake --out o.bin --content c"), SimcliOptions(command: "bake", content: "c", out: "o.bin"))
        for bad in ["", "replay", "validate --out o", "validate --content", "validate --content a --content b", "bake",
                    "bake --content c", "bake --out o --out p", "bake --out --content", "bake --out o --content --x",
                    "validate x", "bake --out o extra"] {
            XCTAssertNil(parsed(bad), "«\(bad)» is refused")
        }
        guard case let .failure(e) = SimcliOptions.parse(["bake", "--out", "o", "--out", "p"]) else { return XCTFail() }
        XCTAssertTrue(e.message.contains("given twice") && e.message.contains(SimcliOptions.usage), e.message)
    }
}
