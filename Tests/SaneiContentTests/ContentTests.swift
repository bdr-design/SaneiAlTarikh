import Foundation
import XCTest
@testable import SaneiCore
@testable import SaneiContent
@testable import SaneiBake

/// The content foundation (T-042): the repository's registries bake to their pinned bytes and read back; each rule of
/// the CSV reader, the JSON reader, the rows, the validator, the ID lock and the aliases refuses its own case with its
/// file, line and rule (the others hold), so removing a rule fails a test.
final class ContentTests: XCTestCase {
    static let root = URL(fileURLWithPath: #filePath).deletingLastPathComponent().deletingLastPathComponent().deletingLastPathComponent()
    static let content = root.appendingPathComponent("content")
    static let registry = content.appendingPathComponent("registry")

    /// The SHA-256 of the repository's `content.bin`: every build, Linux and Apple, debug and optimised, must make these
    /// bytes. Changed only on purpose, with the content.
    static let pinnedContentSHA256 = "b83fbbdfa84266cf9668249432aac7f44d883067dda6a2fc4013ed1b52b50034"

    func hex(_ b: [UInt8]) -> String { b.map { String(format: "%02x", $0) }.joined() }

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

    /// Refused by the bake, with this file and line, and a message holding `rule`.
    func refused(_ dir: URL, file: String, line: Int, _ rule: String, _ at: UInt = #line) {
        do {
            _ = try Bake.validate(dir)
            XCTFail("«\(rule)»: not refused", line: at)
        } catch let e as BakeError {
            XCTAssertEqual(e.file, file, "\(e)", line: at)
            XCTAssertEqual(e.line, line, "\(e)", line: at)
            XCTAssertTrue(e.message.contains(rule), "«\(rule)» not in «\(e.message)»", line: at)
        } catch { XCTFail("\(error)", line: at) }
    }

    func swap(_ old: String, _ new: String) -> (String) -> String {
        { s in
            XCTAssertTrue(s.contains(old), "«\(old)» is not in the file")
            return s.replacingOccurrences(of: old, with: new)
        }
    }

    // MARK: the repository's content

    func testTheRepositorysContentBakesToItsPinnedBytes() throws {
        let db = try Bake.validate(Self.content)
        XCTAssertEqual(db.polities.map(\.id), ["sdn", "ssd", "civ", "lby", "egy", "irq", "usa"])
        let bytes = try Bake.contentFile(Self.content)
        XCTAssertEqual(hex(SHA256.hash(bytes)), Self.pinnedContentSHA256, "content.bin's bytes changed: pin them again only on purpose")
        let loaded = try ContentFile.read(bytes).get()
        XCTAssertEqual(loaded.db, db)
        XCTAssertEqual(loaded.rulesHash, SHA256.hash(bytes, 0..<(bytes.count - 32)))
        XCTAssertEqual(ContentFile.write(loaded.db), bytes, "read back and written again: the same bytes")
        XCTAssertEqual(ContentID.defaultGovernment(of: "sdn"), "sdn.gov")
        // the grammar of the short form: a plural that is not of people agrees as a feminine singular
        let usa = db.polities[try XCTUnwrap(db.polityRow(id: "usa"))].name
        XCTAssertEqual([usa.gender == .feminine, usa.number == .plural, usa.human], [true, true, false])
        XCTAssertEqual(db.groups[try XCTUnwrap(db.groupRow(id: "grp.christian"))].name.oblique, "المسيحيين")
        XCTAssertEqual(db.currencies[try XCTUnwrap(db.currencyRow(id: "cur.xof"))].reach, .union)
    }

    func testEveryIDIsFoundAtItsRowAndNoOtherIs() throws {
        let db = try Bake.validate(Self.content)
        for (k, p) in db.polities.enumerated() { XCTAssertEqual(db.polityRow(id: p.id), k) }
        for (k, a) in db.actors.enumerated() { XCTAssertEqual(db.actorRow(id: a.id), k) }
        for (k, g) in db.groups.enumerated() { XCTAssertEqual(db.groupRow(id: g.id), k) }
        for (k, c) in db.currencies.enumerated() { XCTAssertEqual(db.currencyRow(id: c.id), k) }
        for absent in ["", "sd", "sdnx", "zzz", "aaa", "cur.sdg"] { XCTAssertNil(db.polityRow(id: absent), absent) }
        XCTAssertNil(db.currencyRow(id: "sdn"))
        XCTAssertEqual(ContentID.runtime(Serial(raw: 7)), "dyn:7")
        XCTAssertFalse(ContentID.isWellFormed(ContentID.runtime(Serial(raw: 7))), "a runtime ID is never a registry ID")
        XCTAssertTrue(ContentID.isWellFormed(ContentID.defaultGovernment(of: String(repeating: "a", count: ContentID.mostPolityBytes))))
    }

    // MARK: content.bin

    func reseal(_ b: inout [UInt8]) { b.replaceSubrange((b.count - 32)..., with: SHA256.hash(b, 0..<(b.count - 32))) }

    /// A file made from these chunks, sealed.
    func file(_ chunks: [SaveChunk], format: UInt16 = ContentFile.format) -> [UInt8] {
        let payload = SaveTree(formatVersion: format, chunks: chunks).write()
        var w = ByteWriter()
        w.bytes.append(contentsOf: ContentFile.magic)
        w.fixed(ContentFile.containerVersion, as: UInt16.self)
        w.fixed(UInt16(0), as: UInt16.self)
        w.fixed(UInt32(payload.count), as: UInt32.self)
        w.bytes.append(contentsOf: payload)
        w.bytes.append(contentsOf: SHA256.hash(w.bytes))
        return w.bytes
    }

    func testADamagedOrForeignFileIsRefused() throws {
        let good = try Bake.contentFile(Self.content)
        let db = try ContentFile.read(good).get().db
        XCTAssertNotNil(try? ContentFile.read(file(ContentFile.chunks(db))).get(), "the control")
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
        XCTAssertEqual(ContentFile.read(file(ContentFile.chunks(db), format: ContentFile.format + 1)).failureValue, .newerFormat(ContentFile.format + 1))
        XCTAssertEqual(ContentFile.read(file(Array(ContentFile.chunks(db).dropLast()))).failureValue, .malformed, "a table missing")
        var huge = [UInt8](repeating: 0, count: ContentFile.mostBytes + 1)
        huge.replaceSubrange(0..<8, with: ContentFile.magic)
        XCTAssertEqual(ContentFile.read(huge).failureValue, .malformed)
        // rows that break a rule of the validator, sealed: refused by the validator on reading
        var chunks = ContentFile.chunks(db)
        let at = chunks.firstIndex { $0.tag == "CURR" }!
        chunks[at].columns = chunks[at].columns.map { $0.name == "iso" ? ContentFile.text("iso", db.currencies.map { _ in "SDG" }) : $0 }
        guard case let .invalid(p)? = ContentFile.read(file(chunks)).failureValue else { return XCTFail("not refused by the validator") }
        XCTAssertEqual(p.table, "currencies")
        XCTAssertTrue(p.message.contains("another currency's"))
    }

    /// Every number column read with the type and encoding the writer gives it: another encoding, a value past the
    /// column's type, or another type is refused, never a trap (forged files, sealed).
    func testEveryColumnMustBeTheWritersTypeAndEncoding() throws {
        let db = try Bake.validate(Self.content)
        func with(_ tag: String, _ column: SaveColumn) -> [UInt8] {
            var chunks = ContentFile.chunks(db)
            let at = chunks.firstIndex { $0.tag == tag }!
            chunks[at].columns = chunks[at].columns.map { $0.name == column.name ? column : $0 }
            return file(chunks)
        }
        let p = db.polities.count, a = db.actors.count, c = db.currencies.count
        let cases: [(String, SaveColumn)] = [
            ("POLI", .of("colour", [UInt64](repeating: 0x123456, count: p), .u32, .zigzag)),
            ("POLI", .of("colour", [Int64](repeating: Int64.max, count: p), .u32, .zigzag)),
            ("POLI", .of("colour", [UInt64](repeating: 1, count: p), .u64, .raw)),
            ("POLI", .of("status", [Int64](repeating: 300, count: p), .u8, .zigzag)),
            ("ACTR", .of("polity", [Int64](repeating: -5, count: a), .u16, .varintDelta)),
            ("ACTR", .of("polity", [Int64](repeating: 1, count: a), .u16, .zigzag)),
            ("CURR", .of("reach", [Int64](repeating: -1, count: c), .u8, .zigzag)),
            ("CURR", .of("gender", [UInt64](repeating: 1, count: c), .u16, .raw)),
            ("CURR", .of("human", [UInt64](repeating: 0, count: c), .u8, .raw)),
            ("CURR", .of("iso", [UInt64](repeating: 0, count: c), .u8, .raw)),
        ]
        for (tag, col) in cases { XCTAssertEqual(ContentFile.read(with(tag, col)).failureValue, .malformed, "\(tag).\(col.name) \(col.type) \(col.encoding)") }
        // the writer's own column at the edge of its type reads (and then the validator speaks)
        XCTAssertNotNil(try? ContentFile.read(with("POLI", .of("colour", [UInt64](repeating: 0xFFFFFF, count: p), .u32, .raw))).get())
    }

    // MARK: the CSV reader

    func testEachCSVRuleRefusesItsCase() throws {
        func parse(_ s: String) throws -> CSV { try CSV.parse(Array(s.utf8), file: "f.csv") }
        func refused(_ bytes: [UInt8], line: Int, _ rule: String, _ at: UInt = #line) {
            XCTAssertThrowsError(try CSV.parse(bytes, file: "f.csv"), rule, line: at) { e in
                guard let b = e as? BakeError else { return XCTFail("\(e)", line: at) }
                XCTAssertEqual(b.line, line, "\(b)", line: at)
                XCTAssertTrue(b.message.contains(rule), "«\(rule)» not in «\(b.message)»", line: at)
            }
        }
        // the control: quotes, a quote inside, a comma inside, an empty field, Arabic, a final empty field
        let ok = try parse("a,b,c\n\"x, \"\"y\"\"\",,مصر\n1,2,\n")
        XCTAssertEqual(ok.rows.map(\.fields), [["x, \"y\"", "", "مصر"], ["1", "2", ""]])
        XCTAssertEqual(ok.rows.map(\.line), [2, 3])
        XCTAssertEqual(try parse("a\nx").rows.count, 1, "no final line break")
        // split on bytes: a comma before a combining mark or a joiner still splits
        XCTAssertEqual(try parse("a,b,c\nx,\u{064E}y,\u{200C}z\n").rows[0].fields, ["x", "\u{064E}y", "\u{200C}z"])
        refused([0xEF, 0xBB, 0xBF] + Array("a\nx\n".utf8), line: 1, "byte-order mark")
        refused(Array("a\n".utf8) + [0xFF, 0x0A], line: 0, "not valid UTF-8")
        refused(Array("a\r\nx\r\n".utf8), line: 0, "carriage return")
        refused([], line: 0, "empty")
        refused(Array("a,,b\n".utf8), line: 1, "an empty column name")
        refused(Array("a,a\n".utf8), line: 1, "twice")
        refused(Array("a\nx\n\ny\n".utf8), line: 3, "an empty line")
        refused(Array("a,b\nx\n".utf8), line: 2, "1 fields, the header has 2")
        refused(Array("a,b\nx,y,z\n".utf8), line: 2, "3 fields, the header has 2")
        refused(Array("a\n\"x\n".utf8), line: 2, "a quote never closed")
        refused(Array("a\n\"x\"y\n".utf8), line: 2, "text after a closing quote")
        refused(Array("a\nx\"y\n".utf8), line: 2, "a quote inside an unquoted field")
        refused(Array("a,b\n x,y\n".utf8), line: 2, "a space around")
        refused(Array("a,b\nx,y\u{00A0}\n".utf8), line: 2, "a space around")
        XCTAssertThrowsError(try parse("a,b\nx,y\n").records(["b", "a"], file: "f.csv"), "a header not the schema")
    }

    // MARK: the JSON reader

    func testTheJSONReaderIsStrict() throws {
        func refused(_ s: String, _ rule: String, _ at: UInt = #line) {
            XCTAssertThrowsError(try JSON.parse(Array(s.utf8), file: "f.json"), rule, line: at) { e in
                XCTAssertTrue((e as? BakeError)?.message.contains(rule) == true, "«\(rule)»: \(e)", line: at)
            }
        }
        XCTAssertEqual(try JSON.parse(Array(#"{"a": [1, -2, "x\n", true, null], "b": {}}"#.utf8), file: "f"),
                       .object([("a", .array([.integer(1), .integer(-2), .string("x\n"), .bool(true), .null])), ("b", .object([]))]))
        refused(#"{"a": 1, "a": 2}"#, "twice")
        refused(#"{"a": 1.0}"#, "fraction or an exponent")
        refused(#"{"a": 1e4}"#, "fraction or an exponent")
        refused(#"{"a": 01}"#, "leading zero")
        refused(#"{"a": 1234567890123456789}"#, "past 18 digits")
        refused("\u{FEFF}{}", "byte-order mark")
        refused("{} x", "text after the value")
        refused(#"{"a": "x"#, "never closed")
        refused("{\"a\": \"x\u{01}\"}", "control character")
        refused(String(repeating: "[", count: 70) + String(repeating: "]", count: 70), "nested past 64")
        refused(#"{"a": 'x'}"#, "not a value")
    }

    // MARK: the rows

    func testEachRowRuleRefusesItsCase() throws {
        XCTAssertNoThrow(try Bake.validate(try copy()), "the control")
        let p = "polity_registry.csv", c = "currency_registry.csv", a = "actor_registry.csv", g = "group_registry.csv"
        refused(try copy(p, swap("sdn,state,", "sdn,kingdom,")), file: p, line: 2, "status «kingdom» is not one of")
        refused(try copy(p, swap("#A8743C", "#a8743c")), file: p, line: 2, "is not #RRGGBB in capitals")
        refused(try copy(p, swap("#A8743C", "#A8743")), file: p, line: 2, "is not #RRGGBB in capitals")
        refused(try copy(p, swap("السودان,m,singular,0,1,السودان", "السودان,x,singular,0,1,السودان")), file: p, line: 2, "gender «x» is not one of")
        refused(try copy(p, swap("السودان,m,singular,0,1,السودان", "السودان,m,singular,0,2,السودان")), file: p, line: 2, "definite «2» is not 0 or 1")
        refused(try copy(p, swap("السودان,m,singular,0,1,السودان", "السودان,m,singular,2,1,السودان")), file: p, line: 2, "human «2» is not 0 or 1")
        refused(try copy(p, swap("مصر,f,singular,0,0,مصر", "مصر,f,trial,0,0,مصر")), file: p, line: 6, "number «trial» is not one of")
        refused(try copy(c, swap("cur.ssp,SSP,national", "cur.ssp,SSP,federal")), file: c, line: 3, "reach «federal» is not one of")
        refused(try copy(a, swap("act.sdn.ncp,sdn,", "act.sdn.ncp,xxx,")), file: a, line: 2, "polity «xxx» names no row")
        refused(try copy(a, swap("act.sdn.ncp,sdn,party", "act.sdn.ncp,sdn,club")), file: a, line: 2, "kind «club» is not one of")
        refused(try copy(g, swap("grp.arab,ethnolinguistic", "grp.arab,tribal")), file: g, line: 2, "dimension «tribal» is not one of")
        refused(try copy(p, swap("id,status,", "id,kind,")), file: p, line: 1, "the schema is")
        refused(try copy(p, swap("\n", "\r\n")), file: p, line: 0, "carriage return")
        // a decomposed spelling (أ as ا and a combining hamza) is refused: one name, one spelling, one content.bin
        refused(try copy(c, swap("الدولار الأمريكي,", "الدولار ال\u{0627}\u{0654}مريكي,")), file: c, line: 8, "composed form (NFC)")
    }

    // MARK: the validator, each rule with its row's file and line

    func testEachValidatorRuleRefusesItsCaseWithItsLine() throws {
        let p = "polity_registry.csv", c = "currency_registry.csv", a = "actor_registry.csv", g = "group_registry.csv"
        refused(try copy(p, swap("\nssd,", "\nsdn,")), file: p, line: 3, "is used twice")
        // (usa: no actor names it, so only the polity's own rule speaks)
        refused(try copy(p, swap("\nusa,", "\nUsa,")), file: p, line: 8, "is not a polity's")
        refused(try copy(p, swap("\nusa,", "\nus.a,")), file: p, line: 8, "is not a polity's")
        refused(try copy(p, swap("\nusa,", "\n" + String(repeating: "u", count: 33) + ",")), file: p, line: 8, "is not a polity's")
        refused(try copy(p, swap("جمهورية السودان,", "\" جمهورية السودان\",")), file: p, line: 2, "name is empty, past")
        refused(try copy(p, swap("جمهورية السودان,", "\"جمهورية\u{202E}السودان\",")), file: p, line: 2, "name is empty, past")
        refused(try copy(p, swap("جمهورية السودان,", "\"جمهورية\u{2028}السودان\",")), file: p, line: 2, "name is empty, past")
        refused(try copy(a, swap("للمؤتمر الوطني,", "\"\",")), file: a, line: 2, "withLi is empty, past")
        refused(try copy(g, swap("المسيحيين,للمسيحيين", String(repeating: "م", count: 129) + ",للمسيحيين")), file: g, line: 5, "oblique is empty, past")
        refused(try copy(a, swap("المؤتمر الوطني,m,singular,0", "المؤتمر الوطني,m,singular,1")), file: a, line: 2, "human is for plural names")
        refused(try copy(a, swap("act.sdn.ncp,sdn,", "act.egy.ncp,sdn,")), file: a, line: 2, "is not act.sdn.<slug>")
        refused(try copy(a, swap("act.sdn.ncp,sdn,", "ncp,sdn,")), file: a, line: 2, "is not act.sdn.<slug>")
        refused(try copy(c, swap("cur.ssp,SSP,", "cur.ssp,SDG,")), file: c, line: 3, "is another currency's")
        refused(try copy(c, swap("cur.ssp,SSP,", "cur.ssp,ssp,")), file: c, line: 3, "is not three capital letters")
        refused(try copy(c, swap("cur.ssp,SSP,", "cur.ssp,SSPX,")), file: c, line: 3, "is not three capital letters")
        refused(try copy(c, swap(",بالدولار,src.iso4217", ",بالدولار,\"any text here\"")), file: c, line: 8, "is not an evidence ID")
        refused(try copy(g, swap("grp.arab,", "grp.Arab,")), file: g, line: 2, "is not well formed")
        // the caps and an empty table, as the table's whole
        let base = try Bake.validate(Self.content)
        let many = (0...RegistryCaps.polities).map { k in PolityRow(id: "p\(k)", status: .state, name: base.polities[0].name, colour: 0, evidence: "src.x") }
        XCTAssertEqual(ContentDB(polities: many, actors: [], groups: [], currencies: base.currencies).problems().map(\.message),
                       ["321 rows, past the cap of 320"])
        XCTAssertEqual(RegistryCaps.actors, 2_048 - 64, "L3's 2,048 actors, less the 64 kept for runtime actors")
        XCTAssertEqual(ContentDB(polities: base.polities, actors: [], groups: [], currencies: []).problems().map(\.message),
                       ["no currency: content needs at least one"])
    }

    // MARK: the ID lock and the aliases

    func testTheIDLockCoversEveryIDAndOnlyGrows() throws {
        let lock = "ids.lock", p = "polity_registry.csv", al = "aliases.json"
        refused(try copy(lock, swap("polity usa\n", "")), file: p, line: 8, "is not in ids.lock")
        let usa = "usa,state,الولايات المتحدة الأمريكية,الولايات المتحدة,f,plural,0,1,الولايات المتحدة,للولايات المتحدة,بالولايات المتحدة,#3B6EA5,src.unterm\n"
        refused(try copy(p, swap(usa, "")), file: lock, line: 14, "no registry holds it and no alias replaces it")
        // with an alias it holds
        let dir = try copy(p, swap(usa, ""))
        try Data(#"{"format": 1, "aliases": [{"kind": "polity", "from": "usa", "to": [{"id": "egy", "weight": 10000}]}]}"#.utf8)
            .write(to: dir.appendingPathComponent("registry").appendingPathComponent(al))
        XCTAssertNoThrow(try Bake.validate(dir))
        refused(try copy(al) { _ in "{\"format\": 1, \"aliases\": [\n{\"kind\": \"polity\", \"from\": \"sdn\", \"to\": [{\"id\": \"egy\", \"weight\": 10000}]}]}" },
                file: al, line: 2, "is still in its registry")
        refused(try copy(al) { _ in #"{"format": 1, "aliases": [{"kind": "polity", "from": "zzz", "to": [{"id": "egy", "weight": 10000}]}]}"# },
                file: al, line: 1, "was never issued")
        let dir2 = try copy(p, swap(usa, ""))
        try Data(#"{"format": 1, "aliases": [{"kind": "polity", "from": "usa", "to": [{"id": "can", "weight": 10000}]}]}"#.utf8)
            .write(to: dir2.appendingPathComponent("registry").appendingPathComponent(al))
        refused(dir2, file: al, line: 1, "which no registry holds")
        // the lock's own lines
        refused(try copy(lock) { $0 + "kingdom abc\n" }, file: lock, line: 27, "known kind")
        refused(try copy(lock) { $0 + "polity sdn\n" }, file: lock, line: 27, "twice")
        refused(try copy(lock) { $0 + "polity Bad\n" }, file: lock, line: 27, "well-formed ID")
        refused(try copy(lock) { $0 + "polity  zzz\n" }, file: lock, line: 27, "known kind")
        refused(try copy(lock) { String($0.dropLast()) }, file: lock, line: 0, "its line break")
        XCTAssertNoThrow(try Bake.validate(try copy(lock) { $0 + "government sdn.gov\n" }), "a government ID locked ahead of its scenario")
    }

    func testAliasesAreReadStrictly() throws {
        func refused(_ json: String, _ rule: String, _ at: UInt = #line) {
            XCTAssertThrowsError(try Aliases.parse(Array(json.utf8)), rule, line: at) { e in
                XCTAssertTrue((e as? BakeError)?.message.contains(rule) == true, "«\(rule)»: \(e)", line: at)
            }
        }
        let ok = try Aliases.parse(Array(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 4000}, {"id": "c", "weight": 6000}]}]}"#.utf8))
        XCTAssertEqual(ok.replacement("polity", "a")?.map(\.weight), [4000, 6000])
        refused(#"{"format": 1, "aliases": [], "extra": 0}"#, "the keys «format» (1) and «aliases»")
        refused(#"{"format": 2, "aliases": []}"#, "the keys «format» (1) and «aliases»")
        refused(#"{"format": 1, "aliases": [], "aliases": []}"#, "twice")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 10000}], "note": ""}]}"#, "the keys are «kind», «from» and «to»")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 10000, "x": 1}]}]}"#, "each target is")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": true}]}]}"#, "each target is")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 10000.0}]}]}"#, "fraction or an exponent")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 9999}]}]}"#, "sum to 10,000")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 0}, {"id": "c", "weight": 10000}]}]}"#, "from 1 to 10,000")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 999999999999999999}, {"id": "c", "weight": 999999999999999999}]}]}"#, "from 1 to 10,000")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 5000}, {"id": "b", "weight": 5000}]}]}"#, "twice")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": [{"id": "a", "weight": 10000}]}]}"#, "other than «a»")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "a", "to": []}]}"#, "at least one target")
        refused(#"{"format": 1, "aliases": [{"kind": "nation", "from": "a", "to": [{"id": "b", "weight": 10000}]}]}"#, "a known kind")
        refused(#"{"format": 1, "aliases": [{"kind": "government", "from": "a", "to": [{"id": "b", "weight": 10000}]}]}"#, "a known kind")
        refused(#"{"format": 1, "aliases": [{"kind": "polity", "from": "A", "to": [{"id": "b", "weight": 10000}]}]}"#, "well-formed ID")
        let twice = #"{"kind": "polity", "from": "a", "to": [{"id": "b", "weight": 10000}]}"#
        refused(#"{"format": 1, "aliases": [\#(twice), \#(twice)]}"#, "replaced twice")
        refused("[]", "the keys «format» (1) and «aliases»")
    }

    /// The cheaper forms the heaviness review asked for keep the rules: text decoded straight from the file's buffer
    /// (valid UTF-8 only, within its limit), the spaces at a name's ends listed out, one walk to order two IDs, and the
    /// bake's budget.
    func testTheCheaperFormsKeepTheRules() {
        let ok = SaveColumn.items("t", [Array("دولار".utf8), [], Array("abc".utf8)])
        XCTAssertEqual(ok.strings(atMost: 3, itemLimit: 10), ["دولار", "", "abc"])
        XCTAssertNil(ok.strings(atMost: 2, itemLimit: 10), "more items than allowed")
        XCTAssertNil(ok.strings(atMost: 3, itemLimit: 9), "an item past its limit")
        for bad: [UInt8] in [[0xFF], [0xC3], [0xED, 0xA0, 0x80], [0xC0, 0x80]] {
            XCTAssertNil(SaveColumn.items("t", [Array("a".utf8), bad]).strings(atMost: 2, itemLimit: 10), "not UTF-8: \(bad)")
        }
        XCTAssertNil(SaveColumn.of("t", [UInt8(1)], .u8, .raw).strings(atMost: 1, itemLimit: 10), "not an items column")
        // every White_Space scalar but the controls is a space at an end; nothing else is
        for v in UInt32(0x20)...UInt32(0x3000) {
            guard let s = Unicode.Scalar(v), v >= 0x20, !(v >= 0x7F && v <= 0x9F), v != 0x2028, v != 0x2029 else { continue }
            XCTAssertEqual(ContentDB.isSpace(v), s.properties.isWhitespace, "U+\(String(v, radix: 16))")
        }
        for t in ["\u{A0}دولة", "دولة\u{3000}", "\u{2007}دولة", "دولة\u{202F}", " دولة"] { XCTAssertFalse(ContentDB.isNameText(t), t) }
        XCTAssertTrue(ContentDB.isNameText("دولة\u{200C}نامية"))
        // one walk orders as the bytes do
        let ids = ["", "a", "ab", "b", "act.sdn.splm", "act.sdn.splm_n", "cur.sdg", "cur.ssp", "سودان", "a\u{0}", "\u{7F}", "é", "e\u{301}"]
        for a in ids {
            for b in ids {
                let want = a.utf8.elementsEqual(b.utf8) ? 0 : (a.utf8.lexicographicallyPrecedes(b.utf8) ? -1 : 1)
                XCTAssertEqual(ContentDB.order(a, b).signum(), want, "\(a) against \(b)")
            }
        }
        XCTAssertNil(Bake.budgetProblem(ContentFile.budgetBytes))
        XCTAssertNotNil(Bake.budgetProblem(ContentFile.budgetBytes + 1))
        XCTAssertEqual(ContentFile.budgetBytes, 6 << 20)
        XCTAssertLessThan(ContentFile.budgetBytes, ContentFile.mostBytes)
    }
}

extension Result {
    var failureValue: Failure? {
        if case let .failure(e) = self { return e }
        return nil
    }
}
