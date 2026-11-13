import SaneiCore

/// `content.bin` (L2, §2.8): the content the phone reads without parsing anything. The layout:
///
///     magic "SANEICNT" (8 bytes), containerVersion u16 LE, flags u16 LE (0), payloadLength u32 LE,
///     the payload (a `SaveTree`: one chunk per table, its format version the content format),
///     SHA-256 of every byte before it (32 bytes): the file's hash, META's `rulesHash` (§7)
///
/// The bake writes it (`SaneiBake`, through `simcli bake`), byte for byte the same for the same content; the app reads
/// it once at launch from one buffer (a memory map on the device, T-044), nothing copied but the rows themselves.
public enum ContentFile {
    public static let magic: [UInt8] = Array("SANEICNT".utf8)
    public static let containerVersion: UInt16 = 1
    /// The content format: rises when a column is renamed, dropped or retyped (an added column keeps it, §7's rule).
    public static let format: UInt16 = 1
    /// The most bytes a file may hold: §2.8's 6 MB budget for `content.bin`, with half again as margin.
    public static let mostBytes = 9 << 20
    static let headerBytes = 8 + 2 + 2 + 4

    /// Why a file was refused.
    public enum Failure: Error, Sendable, Equatable {
        case notContent
        case newerContainer(UInt16)
        case newerFormat(UInt16)
        case truncated
        case damaged
        case malformed
        /// The rows break a rule of the validator (the first problem).
        case invalid(String)
    }

    // MARK: writing

    /// The file's bytes for `db`. The caller (the bake) has checked `db.problems()` is empty.
    public static func write(_ db: ContentDB) -> [UInt8] {
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
         .flags("definite", rows.map(\.definite)), text("withLi", rows.map(\.withLi)), text("withBi", rows.map(\.withBi))]
    }

    static func dates(_ n: String, _ v: [GameDate?]) -> [SaveColumn] {
        [.flags(n + "Set", v.map { $0 != nil }), .of(n, v.map { Int64($0?.days ?? 0) }, .i32, .zigzag)]
    }

    static func chunks(_ db: ContentDB) -> [SaveChunk] {
        [SaveChunk(tag: "CURR", columns: [text("id", db.currencies.map(\.id)), text("iso", db.currencies.map(\.iso)),
                                          .of("kind", db.currencies.map(\.kind.rawValue), .u8, .raw)]
                   + names(db.currencies.map(\.name)) + [text("evidence", db.currencies.map(\.evidence))]),
         SaveChunk(tag: "POLI", columns: [text("id", db.polities.map(\.id)), .of("kind", db.polities.map(\.kind.rawValue), .u8, .raw)]
                   + names(db.polities.map(\.name))
                   + [.of("colour", db.polities.map(\.colour), .u32, .raw), .of("currency", db.polities.map { UInt64($0.currency) }, .u16, .raw)]
                   + dates("from", db.polities.map(\.from)) + dates("until", db.polities.map(\.until))
                   + [text("evidence", db.polities.map(\.evidence))]),
         SaveChunk(tag: "ACTR", columns: [text("id", db.actors.map(\.id)), .of("polity", db.actors.map { UInt64($0.polity) }, .u16, .raw),
                                          .of("kind", db.actors.map(\.kind.rawValue), .u8, .raw)]
                   + names(db.actors.map(\.name)) + [text("evidence", db.actors.map(\.evidence))]),
         SaveChunk(tag: "GRUP", columns: [text("id", db.groups.map(\.id)), .of("dimension", db.groups.map(\.dimension.rawValue), .u8, .raw)]
                   + names(db.groups.map(\.name)) + [text("evidence", db.groups.map(\.evidence))])]
    }

    // MARK: reading

    /// The file's hash (its trailer), what META's `rulesHash` holds; nil when the file is too short to have one.
    public static func hash(_ bytes: [UInt8]) -> [UInt8]? {
        bytes.count >= headerBytes + 32 ? Array(bytes[(bytes.count - 32)...]) : nil
    }

    /// The content in `bytes`, checked: the magic, the size, the trailer, the header, every column, then every rule
    /// of the validator.
    public static func read(_ bytes: [UInt8]) -> Result<ContentDB, Failure> {
        guard bytes.count >= 8, Array(bytes[0..<8]) == magic else { return .failure(.notContent) }
        guard bytes.count >= headerBytes + 32 else { return .failure(.truncated) }
        guard bytes.count <= mostBytes else { return .failure(.malformed) }
        let body = bytes.count - 32
        guard SHA256.hash(bytes, 0..<body) == Array(bytes[body...]) else { return .failure(.damaged) }
        var r = ByteReader(bytes, offset: 8)
        guard let version = r.fixed(UInt16.self), let flags = r.fixed(UInt16.self), let length = r.fixed(UInt32.self) else {
            return .failure(.truncated)
        }
        guard version >= 1 else { return .failure(.notContent) }
        guard version <= containerVersion, flags == 0 else { return .failure(.newerContainer(version)) }
        guard Int(length) == body - headerBytes else { return .failure(.malformed) }
        guard let tree = SaveTree.read(bytes, headerBytes..<body) else { return .failure(.malformed) }
        guard tree.formatVersion <= format else { return .failure(.newerFormat(tree.formatVersion)) }
        guard tree.formatVersion == format, let db = decode(tree) else { return .failure(.malformed) }
        if let first = db.problems().first { return .failure(.invalid(first)) }
        return .success(db)
    }

    /// A table's columns, each read whole and checked for its row count.
    struct Table {
        let chunk: SaveChunk
        let rows: Int

        init?(_ tree: SaveTree, _ tag: String, cap: Int) {
            guard let c = tree.chunk(tag), let ids = c.column("id"), ids.count <= cap else { return nil }
            chunk = c
            rows = ids.count
        }

        func texts(_ n: String) -> [String]? {
            guard let col = chunk.column(n), col.count == rows,
                  let items = col.items(atMost: rows, itemLimit: NameRecord.mostBytes) else { return nil }
            var out: [String] = []
            out.reserveCapacity(rows)
            for b in items {
                let s = String(decoding: b, as: UTF8.self)
                guard s.utf8.elementsEqual(b) else { return nil }        // valid UTF-8 only
                out.append(s)
            }
            return out
        }

        func unsigned(_ n: String, _ t: SaveType) -> [UInt64]? {
            guard let col = chunk.column(n), col.count == rows, col.type == t else { return nil }
            return col.values(UInt64.self, as: t, atMost: rows)
        }

        func signed(_ n: String, _ t: SaveType) -> [Int64]? {
            guard let col = chunk.column(n), col.count == rows, col.type == t else { return nil }
            return col.values(Int64.self, as: t, atMost: rows)
        }

        func flags(_ n: String) -> [Bool]? {
            guard let col = chunk.column(n), col.count == rows else { return nil }
            return col.flags(atMost: rows)
        }

        func enums<E: RawRepresentable>(_ n: String, _: E.Type) -> [E]? where E.RawValue == UInt8 {
            guard let raw = unsigned(n, .u8) else { return nil }
            var out: [E] = []
            out.reserveCapacity(rows)
            for v in raw {
                guard let e = E(rawValue: UInt8(v)) else { return nil }
                out.append(e)
            }
            return out
        }

        func names() -> [NameRecord]? {
            guard let name = texts("name"), let short = texts("short"), let gender = enums("gender", Gender.self),
                  let number = enums("number", GrammaticalNumber.self), let definite = flags("definite"),
                  let li = texts("withLi"), let bi = texts("withBi") else { return nil }
            return (0..<rows).map {
                NameRecord(name: name[$0], short: short[$0], gender: gender[$0], number: number[$0], definite: definite[$0],
                           withLi: li[$0], withBi: bi[$0])
            }
        }

        func dates(_ n: String) -> [GameDate?]? {
            guard let set = flags(n + "Set"), let days = signed(n, .i32) else { return nil }
            return (0..<rows).map { set[$0] ? GameDate(days: Int32(days[$0])) : nil }
        }

        func indices(_ n: String) -> [Int]? { unsigned(n, .u16)?.map { Int($0) } }
    }

    static func decode(_ tree: SaveTree) -> ContentDB? {
        guard let ct = Table(tree, "CURR", cap: RegistryCaps.currencies), let cid = ct.texts("id"), let iso = ct.texts("iso"),
              let ckind = ct.enums("kind", CurrencyKind.self), let cname = ct.names(), let cev = ct.texts("evidence"),
              let pt = Table(tree, "POLI", cap: RegistryCaps.polities), let pid = pt.texts("id"), let pkind = pt.enums("kind", PolityKind.self),
              let pname = pt.names(), let colour = pt.unsigned("colour", .u32), let pcur = pt.indices("currency"),
              let from = pt.dates("from"), let until = pt.dates("until"), let pev = pt.texts("evidence"),
              let at = Table(tree, "ACTR", cap: RegistryCaps.actors), let aid = at.texts("id"), let apol = at.indices("polity"),
              let akind = at.enums("kind", ActorKind.self), let aname = at.names(), let aev = at.texts("evidence"),
              let rt = Table(tree, "GRUP", cap: RegistryCaps.groups), let rid = rt.texts("id"),
              let rdim = rt.enums("dimension", GroupDimension.self), let rname = rt.names(), let rev = rt.texts("evidence")
        else { return nil }
        return ContentDB(
            polities: (0..<pt.rows).map { PolityRow(id: pid[$0], kind: pkind[$0], name: pname[$0], colour: UInt32(colour[$0]),
                                                     currency: pcur[$0], from: from[$0], until: until[$0], evidence: pev[$0]) },
            actors: (0..<at.rows).map { ActorRow(id: aid[$0], polity: apol[$0], kind: akind[$0], name: aname[$0], evidence: aev[$0]) },
            groups: (0..<rt.rows).map { GroupRow(id: rid[$0], dimension: rdim[$0], name: rname[$0], evidence: rev[$0]) },
            currencies: (0..<ct.rows).map { CurrencyRow(id: cid[$0], iso: iso[$0], kind: ckind[$0], name: cname[$0], evidence: cev[$0]) })
    }
}
