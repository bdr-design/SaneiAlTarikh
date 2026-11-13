import SaneiCore

/// `content.bin` (L2): the content the phone reads without parsing anything. The layout:
///
///     magic "SANEICNT" (8 bytes), containerVersion u16 LE, flags u16 LE (0), payloadLength u32 LE,
///     the payload (a `SaveTree`: one chunk per table, its format version the content format),
///     SHA-256 of every byte before it (32 bytes): the file's hash, META's `rulesHash` (§7)
///
/// The bake writes it (`SaneiBake`, through `simcli bake`), byte for byte the same for the same content, and reads it
/// back to check it gives the same bytes again. The app reads it once at launch (T-044) from one buffer: the columns are
/// read where they lie, and the rows are decoded out of them once (every text copied into its row). Each column must be
/// of the type and encoding the writer gives it, so one content has one file and one `rulesHash`.
public enum ContentFile {
    public static let magic: [UInt8] = Array("SANEICNT".utf8)
    public static let containerVersion: UInt16 = 1
    /// The content format: rises when a column is renamed, dropped or retyped (an added column keeps it, §7's rule).
    public static let format: UInt16 = 1
    /// §3.6's budget for `content.bin`: the bake refuses a file past it.
    public static let budgetBytes = 6 << 20
    /// The most bytes the reader takes: the budget with half again as margin.
    public static let mostBytes = 9 << 20
    static let headerBytes = 8 + 2 + 2 + 4

    /// Why a file was refused.
    public enum Failure: Error, Sendable, Equatable {
        /// No magic, or a container version of 0.
        case notContent
        /// A container version past this one's, or this version's own with a flag it does not know.
        case newerContainer(UInt16)
        /// A content format past this version's.
        case newerFormat(UInt16)
        /// Shorter than a header and a trailer.
        case truncated
        /// The trailer is not the hash of the bytes before it.
        case damaged
        /// Past `mostBytes`, a payload length that is not the bytes', an older format, a table or column missing,
        /// added or out of the writer's order, or a column of another type, encoding, length or value range than the
        /// writer gives it.
        case malformed
        /// The rows break a rule of the validator (the first problem).
        case invalid(ContentProblem)
    }

    /// What a read gives: the content and the file's hash (META's `rulesHash`, §7).
    public struct Loaded: Sendable {
        public var db: ContentDB
        public var rulesHash: [UInt8]
    }

    // MARK: writing

    /// The file's bytes for `db`. Traps (a programmer's error) on content the validator refuses: the bake checks first.
    public static func write(_ db: ContentDB) -> [UInt8] {
        precondition(db.problems().isEmpty, "content.bin is written only from content that keeps every rule")
        let payload = SaveTree(formatVersion: format, chunks: chunks(db)).write()
        var w = ByteWriter(capacity: headerBytes + payload.count + 32)
        w.bytes.append(contentsOf: magic)
        w.fixed(containerVersion, as: UInt16.self)
        w.fixed(UInt16(0), as: UInt16.self)
        w.fixed(UInt32(payload.count), as: UInt32.self)
        w.bytes.append(contentsOf: payload)
        w.bytes.append(contentsOf: SHA256.hash(w.bytes))
        return w.bytes
    }

    static func text(_ n: String, _ v: [String]) -> SaveColumn { .items(n, v.map { Array($0.utf8) }) }

    static func names(_ rows: [NameRecord]) -> [SaveColumn] {
        [text("name", rows.map(\.name)), text("short", rows.map(\.short)),
         .of("gender", rows.map(\.gender.rawValue), .u8, .raw), .of("number", rows.map(\.number.rawValue), .u8, .raw),
         .flags("human", rows.map(\.human)), .flags("definite", rows.map(\.definite)), text("oblique", rows.map(\.oblique)),
         text("withLi", rows.map(\.withLi)), text("withBi", rows.map(\.withBi))]
    }

    static func chunks(_ db: ContentDB) -> [SaveChunk] {
        [SaveChunk(tag: "CURR", columns: [text("id", db.currencies.map(\.id)), text("iso", db.currencies.map(\.iso)),
                                          .of("reach", db.currencies.map(\.reach.rawValue), .u8, .raw)]
                   + names(db.currencies.map(\.name)) + [text("evidence", db.currencies.map(\.evidence))]),
         SaveChunk(tag: "POLI", columns: [text("id", db.polities.map(\.id)), .of("status", db.polities.map(\.status.rawValue), .u8, .raw)]
                   + names(db.polities.map(\.name))
                   + [.of("colour", db.polities.map(\.colour), .u32, .raw), text("evidence", db.polities.map(\.evidence))]),
         SaveChunk(tag: "ACTR", columns: [text("id", db.actors.map(\.id)), .of("polity", db.actors.map { UInt16($0.polity) }, .u16, .raw),
                                          .of("kind", db.actors.map(\.kind.rawValue), .u8, .raw)]
                   + names(db.actors.map(\.name)) + [text("evidence", db.actors.map(\.evidence))]),
         SaveChunk(tag: "GRUP", columns: [text("id", db.groups.map(\.id)), .of("dimension", db.groups.map(\.dimension.rawValue), .u8, .raw)]
                   + names(db.groups.map(\.name)) + [text("evidence", db.groups.map(\.evidence))])]
    }

    // MARK: reading

    /// The content in `bytes`, checked: the magic, the size, the trailer, the header, the writer's tables and columns in
    /// its order, every column (its type, encoding and length the writer's), then every rule of the validator. The
    /// rules only the bake checks are the source files' own: the CSV and JSON forms, text in NFC, the ID lock and the
    /// aliases.
    public static func read(_ bytes: [UInt8]) -> Result<Loaded, Failure> {
        guard bytes.count >= 8, Array(bytes[0..<8]) == magic else { return .failure(.notContent) }
        guard bytes.count >= headerBytes + 32 else { return .failure(.truncated) }
        guard bytes.count <= mostBytes else { return .failure(.malformed) }
        let body = bytes.count - 32
        let hash = Array(bytes[body...])
        guard SHA256.hash(bytes, 0..<body) == hash else { return .failure(.damaged) }
        var r = ByteReader(bytes, offset: 8)
        guard let version = r.fixed(UInt16.self), let flags = r.fixed(UInt16.self), let length = r.fixed(UInt32.self) else {
            return .failure(.truncated)
        }
        guard version >= 1 else { return .failure(.notContent) }
        guard version <= containerVersion, flags == 0 else { return .failure(.newerContainer(version)) }
        guard Int(length) == body - headerBytes else { return .failure(.malformed) }
        guard let tree = SaveTree.read(bytes, headerBytes..<body) else { return .failure(.malformed) }
        guard tree.formatVersion <= format else { return .failure(.newerFormat(tree.formatVersion)) }
        guard tree.formatVersion == format, hasTheWritersLayout(tree), let db = decode(tree) else { return .failure(.malformed) }
        if let first = db.problems().first { return .failure(.invalid(first)) }
        return .success(Loaded(db: db, rulesHash: hash))
    }

    /// A table's columns, each read whole with the writer's type and encoding, and its row count.
    struct Table {
        let chunk: SaveChunk
        let rows: Int

        init?(_ tree: SaveTree, _ tag: String, cap: Int) {
            guard let c = tree.chunk(tag), let ids = c.column("id"), ids.count <= cap else { return nil }
            chunk = c
            rows = ids.count
        }

        func column(_ n: String, _ type: SaveType) -> SaveColumn? {
            guard let col = chunk.column(n), col.count == rows, col.type == type, col.encoding == .raw else { return nil }
            return col
        }

        func texts(_ n: String) -> [String]? { column(n, .items)?.strings(atMost: rows, itemLimit: ContentDB.mostTextBytes) }

        func flags(_ n: String) -> [Bool]? { column(n, .bool)?.flags(atMost: rows) }

        func enums<E: RawRepresentable>(_ n: String, _: E.Type) -> [E]? where E.RawValue == UInt8 {
            guard let raw = column(n, .u8)?.values(UInt8.self, as: .u8, atMost: rows) else { return nil }
            var out: [E] = []
            out.reserveCapacity(rows)
            for v in raw {
                guard let e = E(rawValue: v) else { return nil }
                out.append(e)
            }
            return out
        }

        func names() -> [NameRecord]? {
            guard let name = texts("name"), let short = texts("short"), let gender = enums("gender", Gender.self),
                  let number = enums("number", GrammaticalNumber.self), let human = flags("human"), let definite = flags("definite"),
                  let oblique = texts("oblique"), let li = texts("withLi"), let bi = texts("withBi") else { return nil }
            return (0..<rows).map {
                NameRecord(name: name[$0], short: short[$0], gender: gender[$0], number: number[$0], human: human[$0],
                           definite: definite[$0], oblique: oblique[$0], withLi: li[$0], withBi: bi[$0])
            }
        }
    }

    /// The tables and columns the writer gives, in its order: what an empty content writes.
    static let layout: [(tag: String, columns: [String])] = chunks(ContentDB(polities: [], actors: [], groups: [], currencies: []))
        .map { ($0.tag, $0.columns.map(\.name)) }

    /// True when the tree holds exactly the writer's tables and columns, in its order, and nothing else: with every
    /// column read with the writer's type and encoding, and every length and number in its shortest form (the column
    /// codec's rule), the bytes of an accepted file are the bytes its content writes, so one content has one file and
    /// one `rulesHash`.
    static func hasTheWritersLayout(_ tree: SaveTree) -> Bool {
        guard tree.chunks.count == layout.count else { return false }
        for (chunk, want) in zip(tree.chunks, layout) {
            guard chunk.tag == want.tag, chunk.columns.count == want.columns.count,
                  zip(chunk.columns, want.columns).allSatisfy({ $0.name == $1 }) else { return false }
        }
        return true
    }

    static func decode(_ tree: SaveTree) -> ContentDB? {
        guard let ct = Table(tree, "CURR", cap: RegistryCaps.currencies), let cid = ct.texts("id"), let iso = ct.texts("iso"),
              let reach = ct.enums("reach", CurrencyReach.self), let cname = ct.names(), let cev = ct.texts("evidence"),
              let pt = Table(tree, "POLI", cap: RegistryCaps.polities), let pid = pt.texts("id"),
              let status = pt.enums("status", PolityStatus.self), let pname = pt.names(),
              let colour = pt.column("colour", .u32)?.values(UInt32.self, as: .u32, atMost: pt.rows), let pev = pt.texts("evidence"),
              let at = Table(tree, "ACTR", cap: RegistryCaps.actors), let aid = at.texts("id"),
              let apol = at.column("polity", .u16)?.values(UInt16.self, as: .u16, atMost: at.rows),
              let akind = at.enums("kind", ActorKind.self), let aname = at.names(), let aev = at.texts("evidence"),
              let gt = Table(tree, "GRUP", cap: RegistryCaps.groups), let gid = gt.texts("id"),
              let gdim = gt.enums("dimension", GroupDimension.self), let gname = gt.names(), let gev = gt.texts("evidence")
        else { return nil }
        return ContentDB(
            polities: (0..<pt.rows).map { PolityRow(id: pid[$0], status: status[$0], name: pname[$0], colour: colour[$0], evidence: pev[$0]) },
            actors: (0..<at.rows).map { ActorRow(id: aid[$0], polity: Int(apol[$0]), kind: akind[$0], name: aname[$0], evidence: aev[$0]) },
            groups: (0..<gt.rows).map { GroupRow(id: gid[$0], dimension: gdim[$0], name: gname[$0], evidence: gev[$0]) },
            currencies: (0..<ct.rows).map { CurrencyRow(id: cid[$0], iso: iso[$0], reach: reach[$0], name: cname[$0], evidence: cev[$0]) })
    }
}
