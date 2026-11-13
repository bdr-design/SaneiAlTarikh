// The file `<name>.sanei` (§7), as bytes:
//   header   magic "SANEISAV" (8), containerVersion u16 LE, compression u8 (0 none, 1 raw DEFLATE), flags u8 (0),
//            metaLength u32 LE (at most 65,536)
//   META     a tree (SaveTree's bytes) of one chunk `META`, uncompressed
//   payload  rawLength u64 LE, storedLength u64 LE, then the stored bytes (the tree, compressed or not)
//   trailer  SHA-256 of everything before it (32)
// In SaneiCore so the platform's saves list reads META with the engine's own reader, without the engine (§2.2), and
// the Linux tests check that reader. Compression is handed in (App/Platform: raw DEFLATE). stdlib only.

/// What a save says about itself, for the saves list (screen 23), read without the payload. Plain values only: the
/// player's government is its row and serial (a content ID comes with the start, T-048).
public struct SaveMeta: Sendable, Equatable {
    public var formatVersion: UInt16
    public var gameVersion: String
    public var build: String
    public var scenarioId: String
    public var mapVersion: UInt32
    /// SHA-256 of `content.bin` and of the scenario file (32 bytes each; empty until the start fills them, T-048).
    public var rulesHash: [UInt8]
    public var scenarioHash: [UInt8]
    /// The game date, as a day count (`GameDate.days`).
    public var date: Int32
    /// The player's government: its row and serial (serial 0: none).
    public var playerRow: UInt16
    public var playerSerial: UInt32
    public var playerName: String
    /// Seconds played.
    public var playtime: UInt64
    public var preset: UInt8
    public var difficulty: UInt8
    public var cheatsUsed: Bool
    public var seed: UInt64

    public init(formatVersion: UInt16 = 0, gameVersion: String = "", build: String = "", scenarioId: String = "", mapVersion: UInt32 = 0,
                rulesHash: [UInt8] = [], scenarioHash: [UInt8] = [], date: Int32 = 0, playerRow: UInt16 = 0, playerSerial: UInt32 = 0,
                playerName: String = "", playtime: UInt64 = 0, preset: UInt8 = 0, difficulty: UInt8 = 0, cheatsUsed: Bool = false, seed: UInt64 = 0) {
        self.formatVersion = formatVersion
        self.gameVersion = gameVersion
        self.build = build
        self.scenarioId = scenarioId
        self.mapVersion = mapVersion
        self.rulesHash = rulesHash
        self.scenarioHash = scenarioHash
        self.date = date
        self.playerRow = playerRow
        self.playerSerial = playerSerial
        self.playerName = playerName
        self.playtime = playtime
        self.preset = preset
        self.difficulty = difficulty
        self.cheatsUsed = cheatsUsed
        self.seed = seed
    }

    /// The most bytes of a text field (a name, a version).
    public static let mostTextBytes = 256
    /// The columns META knows. A missing one takes its default (here, the value of `SaveMeta()`), except
    /// `formatVersion`, which every META has; an unknown one is skipped and reported.
    public static let columns = ["formatVersion", "gameVersion", "build", "scenarioId", "mapVersion", "rulesHash", "scenarioHash", "date",
                                 "playerRow", "playerSerial", "playerName", "playtime", "preset", "difficulty", "cheatsUsed", "seed"]

    public var chunk: SaveChunk {
        func text(_ n: String, _ s: String) -> SaveColumn { .items(n, [Array(s.utf8)]) }
        return SaveChunk(tag: "META", columns: [
            .of("formatVersion", [formatVersion], .u16, .raw), text("gameVersion", gameVersion), text("build", build),
            text("scenarioId", scenarioId), .of("mapVersion", [mapVersion], .u32, .raw),
            .items("rulesHash", [rulesHash]), .items("scenarioHash", [scenarioHash]),
            .of("date", [Int64(date)], .i32, .zigzag), .of("playerRow", [playerRow], .u16, .raw), .of("playerSerial", [playerSerial], .u32, .raw),
            text("playerName", playerName), .of("playtime", [playtime], .u64, .raw), .of("preset", [preset], .u8, .raw),
            .of("difficulty", [difficulty], .u8, .raw), .flags("cheatsUsed", [cheatsUsed]), .of("seed", [seed], .u64, .raw),
        ])
    }

    /// META from its chunk; nil when a column is there but wrong, or `formatVersion` is missing.
    public static func read(_ c: SaveChunk, report: inout SaveReport) -> SaveMeta? {
        var m = SaveMeta()
        for col in c.columns where !columns.contains(col.name) { report.skipped.append("META.\(col.name)") }
        func present(_ n: String) -> SaveColumn? {
            guard let col = c.column(n) else { report.defaulted.append("META.\(n)"); return nil }
            return col
        }
        func u<T: FixedWidthInteger>(_ n: String, _ t: SaveType, _ into: inout T) -> Bool {
            guard let col = present(n) else { return true }
            guard let v = col.values(UInt64.self, as: t, atMost: 1), v.count == 1, v[0] <= UInt64(T.max) else { return false }
            into = T(v[0])
            return true
        }
        func text(_ n: String, _ into: inout String) -> Bool {
            guard let col = present(n) else { return true }
            // valid UTF-8 only (decoded, then compared byte for byte: on every OS the app supports)
            guard let b = col.items(atMost: 1, itemLimit: mostTextBytes), b.count == 1 else { return false }
            let s = String(decoding: b[0], as: UTF8.self)
            guard s.utf8.elementsEqual(b[0]) else { return false }
            into = s
            return true
        }
        func hash(_ n: String, _ into: inout [UInt8]) -> Bool {
            guard let col = present(n) else { return true }
            guard let b = col.items(atMost: 1, itemLimit: 32), b.count == 1, b[0].isEmpty || b[0].count == 32 else { return false }
            into = b[0]
            return true
        }
        guard c.tag == "META", c.column("formatVersion") != nil, u("formatVersion", .u16, &m.formatVersion),
              text("gameVersion", &m.gameVersion), text("build", &m.build), text("scenarioId", &m.scenarioId),
              u("mapVersion", .u32, &m.mapVersion), hash("rulesHash", &m.rulesHash), hash("scenarioHash", &m.scenarioHash),
              u("playerRow", .u16, &m.playerRow), u("playerSerial", .u32, &m.playerSerial), text("playerName", &m.playerName),
              u("playtime", .u64, &m.playtime), u("preset", .u8, &m.preset), u("difficulty", .u8, &m.difficulty),
              u("seed", .u64, &m.seed) else { return nil }
        if let col = present("date") {
            guard let v = col.values(Int64.self, as: .i32, atMost: 1), v.count == 1, v[0] >= Int64(Int32.min), v[0] <= Int64(Int32.max) else { return nil }
            m.date = Int32(v[0])
        }
        if m.playerSerial == 0 { m.playerRow = 0 }                // no player: the row means nothing
        if let col = present("cheatsUsed") {
            guard let f = col.flags(atMost: 1), f.count == 1 else { return nil }
            m.cheatsUsed = f[0]
        }
        return m
    }
}

/// The compressions a header names. The numbers are stored in saves and registered in `tags.lock`.
public enum SaveCompression: UInt8, Sendable, CaseIterable {
    case none = 0
    case rawDeflate = 1
}

/// A compressor the platform hands in (App/Platform: raw DEFLATE with Apple's Compression). It appends to the file's
/// one buffer in memory; the platform then writes that buffer to the file (T-043).
public protocol SaveCompressor: Sendable {
    /// The compression it makes (never `.none`; `SaveFile.write` traps on `.none`).
    var compression: SaveCompression { get }
    /// Appends the compressed bytes to `out`; false (and `out` as it was) when it cannot, and the file then stores the
    /// payload as it is. It should stop, and answer false, once it passes `SaveFile.mostCompressedBytes` (a file keeps no
    /// more), or once its bytes are no fewer than the payload's. It only appends: removing bytes from `out` traps.
    func compress(_ bytes: [UInt8], appendingTo out: inout [UInt8]) -> Bool
    /// The raw bytes, exactly `rawLength` of them; nil when the stored bytes do not make them.
    func decompress(_ bytes: ArraySlice<UInt8>, rawLength: Int) -> [UInt8]?
}

/// Why a file was refused. Screen 23 shows «من إصدار أحدث» for `newerContainer` and `newerFormat`, and «تالف» for the
/// rest (the platform logs which).
public enum SaveError: Error, Sendable, Equatable {
    /// Not a save: no magic (any function), or a container version of 0.
    case notASave
    /// A container this version does not read: its version (above `containerVersion`), or this version's own when the
    /// header sets a flag it does not know.
    case newerContainer(UInt16)
    /// Too short for its own lengths: a file under the smallest a save can be, or one whose lengths run past its end.
    /// A real save cut short usually reads as `damaged` (its trailer is no longer its hash).
    case truncated
    /// The trailer is not the hash of the bytes before it.
    case damaged
    /// Compressed, and no decompressor of its compression was handed in.
    case compressionUnavailable(UInt8)
    /// META is malformed, or names a player's government the state never made.
    case badMeta
    /// The payload's lengths, bounds, decompression or tree are malformed.
    case badPayload
    /// A save format past this version's (`SaveCodec.read`).
    case newerFormat(UInt16)
    /// An older format with no migration step to the current one (`SaveCodec.read`).
    case noMigration(UInt16)
    /// The tree is whole but its values break a rule the game keeps (`SaveCodec.read`).
    case badState
}

/// The container: writing and opening it, the payload left as bytes for the engine.
public enum SaveFile {
    public static let magic: [UInt8] = Array("SANEISAV".utf8)
    public static let containerVersion: UInt16 = 1
    /// The most bytes a payload may hold, raw and stored: §3.5's 8 MB raw for a save, with half again as margin. A file
    /// past it is refused before it is hashed, and a decompressor is asked for no more; with `mostCompressedBytes`, a
    /// load's peak at today's caps stays within §7's footprint plus 16 MB whatever the file says, in the optimised build: 14 MB of payload,
    /// META's 64 KB, the tree's index (at most 6,144 columns, about 1.1 MB), the report (about 0.1 MB) and the
    /// loader's working columns (about 0.3 MB), about 15.6 MB. Worked out again when the state grows (T-044).
    public static let mostPayloadBytes = 12 << 20
    /// The most stored bytes of a compressed payload: §3.5's 2 MB compressed for a save (checked after the hash); a
    /// compressor's bytes past it are stored as they are instead.
    public static let mostCompressedBytes = 2 << 20
    public static let mostMetaBytes = 1 << 16
    /// The header's bytes: the magic, the container version, the compression, the flags, META's length.
    public static let headerBytes = 8 + 2 + 1 + 1 + 4
    /// The most bytes a file may hold: what the platform checks before it reads one (T-043).
    public static let mostFileBytes = mostPayloadBytes + mostMetaBytes + headerBytes + 16 + 32

    /// The compression a file's header names; nil when the bytes are not a save's header.
    public static func compression(of bytes: [UInt8]) -> SaveCompression? {
        guard case .success = header(bytes) else { return nil }
        return SaveCompression(rawValue: bytes[10])
    }

    /// The bytes before META ends, from the header's first 16 bytes: what the saves list reads of each file
    /// (`readMeta` takes any prefix that covers META).
    public static func metaPrefixLength(_ first16: [UInt8]) -> Result<Int, SaveError> {
        switch header(first16) {
        case let .failure(e) where e != .truncated: return .failure(e)
        case .failure:
            // a prefix that ends inside META: `header` has checked META's length against its bound
            guard first16.count >= headerBytes else { return .failure(.truncated) }
            var r = ByteReader(first16, offset: headerBytes - 4)
            guard let length = r.fixed(UInt32.self) else { return .failure(.truncated) }
            return .success(headerBytes + Int(length))
        case let .success(h): return .success(headerBytes + h.metaLength)
        }
    }

    /// The file's bytes. With no compressor, one that fails, or compressed bytes past `mostCompressedBytes`, the payload
    /// is stored as it is (compression 0), so `open` keeps every file this writes. META is made readable on the way: a
    /// text past 256 bytes is cut at a UTF-8 character's boundary (by bytes, so every OS cuts it alike), and a hash that
    /// is not 32 bytes is left out. The payload is at most `mostPayloadBytes` (§3.5 budgets 8 MB; a state at the caps makes
    /// about 50 KB today).
    public static func write(meta: SaveMeta, payload: [UInt8], compressor: (any SaveCompressor)? = nil) -> [UInt8] {
        precondition(payload.count <= mostPayloadBytes, "a payload within the bound a read keeps")
        var meta = meta
        func cut(_ s: String) -> String {
            let b = Array(s.utf8)
            guard b.count > SaveMeta.mostTextBytes else { return s }
            var end = SaveMeta.mostTextBytes
            while end > 0 && b[end] & 0xC0 == 0x80 { end -= 1 }        // step back over continuation bytes
            return String(decoding: b[0..<end], as: UTF8.self)
        }
        meta.gameVersion = cut(meta.gameVersion); meta.build = cut(meta.build); meta.scenarioId = cut(meta.scenarioId)
        meta.playerName = cut(meta.playerName)
        if meta.rulesHash.count != 32 { meta.rulesHash = [] }
        if meta.scenarioHash.count != 32 { meta.scenarioHash = [] }
        let metaBytes = SaveTree(formatVersion: meta.formatVersion, chunks: [meta.chunk]).write()
        precondition(metaBytes.count <= mostMetaBytes, "META is small")
        precondition(compressor.map { $0.compression != .none } ?? true, "a compressor compresses")
        var w = ByteWriter(capacity: headerBytes + metaBytes.count + 16 + payload.count + 32)
        w.bytes.append(contentsOf: magic)
        w.fixed(containerVersion, as: UInt16.self)
        let codeAt = w.bytes.count
        w.u8(SaveCompression.none.rawValue)
        w.u8(0)
        w.fixed(UInt32(metaBytes.count), as: UInt32.self)
        w.bytes.append(contentsOf: metaBytes)
        w.fixed(UInt64(payload.count), as: UInt64.self)
        let storedAt = w.bytes.count
        w.fixed(UInt64(0), as: UInt64.self)
        let payloadAt = w.bytes.count
        let made = compressor?.compress(payload, appendingTo: &w.bytes) ?? false
        precondition(w.bytes.count >= payloadAt, "a compressor never shortens the bytes it is handed")
        if made, let c = compressor, w.bytes.count - payloadAt <= mostCompressedBytes {
            w.bytes[codeAt] = c.compression.rawValue
        } else {
            w.bytes.removeSubrange(payloadAt...)
            w.bytes.append(contentsOf: payload)
        }
        let stored = UInt64(w.bytes.count - payloadAt)
        for k in 0..<8 { w.bytes[storedAt + k] = UInt8(truncatingIfNeeded: stored >> UInt64(8 * k)) }
        w.bytes.append(contentsOf: SHA256.hash(w.bytes))
        return w.bytes
    }

    /// META, from the header and META alone (the saves list reads only this; the trailer is not checked).
    public static func readMeta(_ bytes: [UInt8]) -> Result<(meta: SaveMeta, report: SaveReport), SaveError> {
        switch header(bytes) {
        case let .failure(e): return .failure(e)
        case let .success(h):
            var report = SaveReport()
            guard let tree = SaveTree.read(bytes, headerBytes..<(headerBytes + h.metaLength)), tree.chunks.count == 1,
                  let meta = SaveMeta.read(tree.chunks[0], report: &report), tree.formatVersion == meta.formatVersion else { return .failure(.badMeta) }
            return .success((meta, report))
        }
    }

    /// What `check` found: META and its report, the compression, where the stored payload is, and its raw length.
    public struct Checked: Sendable {
        public var meta: SaveMeta
        public var metaReport: SaveReport
        public var compression: SaveCompression
        public var stored: Range<Int>
        public var rawLength: Int
    }

    /// The whole file checked without decompressing it (the magic, the size, the trailer, the header, META, the
    /// lengths): what the platform runs before it releases the old state (§3.3's load spike, screen 23).
    public static func check(_ bytes: [UInt8]) -> Result<Checked, SaveError> {
        // the magic, then the file's size bounded, then the trailer, before any other byte is believed: a damaged
        // header reads as damaged, never as a newer version
        guard bytes.count >= 8, Array(bytes[0..<8]) == magic else { return .failure(.notASave) }
        guard bytes.count >= headerBytes + 16 + 32 else { return .failure(.truncated) }
        guard bytes.count <= mostFileBytes else { return .failure(.badPayload) }
        let body = bytes.count - 32
        guard SHA256.hash(bytes, 0..<body) == Array(bytes[body...]) else { return .failure(.damaged) }
        let h: Header
        switch header(bytes) {
        case let .failure(e): return .failure(e)
        case let .success(x): h = x
        }
        guard bytes.count >= headerBytes + h.metaLength + 16 + 32 else { return .failure(.truncated) }
        let meta: (meta: SaveMeta, report: SaveReport)
        switch readMeta(bytes) {
        case let .failure(e): return .failure(e)
        case let .success(m): meta = m
        }
        var r = ByteReader(bytes, offset: headerBytes + h.metaLength)
        guard let rawLength = r.fixed(UInt64.self), let storedLength = r.fixed(UInt64.self),
              rawLength <= UInt64(mostPayloadBytes), storedLength == UInt64(body - r.offset)
        else { return .failure(.badPayload) }
        // the stored bytes are bounded too: by the raw length when stored as they are, by `mostCompressedBytes` when not
        if h.compression == 0 {
            guard rawLength == storedLength else { return .failure(.badPayload) }
        } else {
            guard storedLength <= UInt64(mostCompressedBytes) else { return .failure(.badPayload) }
        }
        guard let compression = SaveCompression(rawValue: h.compression) else { return .failure(.compressionUnavailable(h.compression)) }
        return .success(Checked(meta: meta.meta, metaReport: meta.report, compression: compression, stored: r.offset..<body,
                                rawLength: Int(rawLength)))
    }

    /// The whole file checked (`check`) and its payload: the file's own bytes and a range when it is stored as it is
    /// (nothing is copied), or the decompressed bytes.
    public static func open(_ bytes: [UInt8], decompressor: (any SaveCompressor)? = nil)
        -> Result<(meta: SaveMeta, metaReport: SaveReport, payload: [UInt8], range: Range<Int>), SaveError> {
        let c: Checked
        switch check(bytes) {
        case let .failure(e): return .failure(e)
        case let .success(x): c = x
        }
        if c.compression == .none { return .success((c.meta, c.metaReport, bytes, c.stored)) }
        guard let d = decompressor, d.compression == c.compression else { return .failure(.compressionUnavailable(c.compression.rawValue)) }
        guard let raw = d.decompress(bytes[c.stored], rawLength: c.rawLength), raw.count == c.rawLength else { return .failure(.badPayload) }
        return .success((c.meta, c.metaReport, raw, 0..<raw.count))
    }

    struct Header {
        var compression: UInt8
        var metaLength: Int
    }

    static func header(_ bytes: [UInt8]) -> Result<Header, SaveError> {
        guard bytes.count >= 8 else { return .failure(.notASave) }
        guard Array(bytes[0..<8]) == magic else { return .failure(.notASave) }
        guard bytes.count >= headerBytes else { return .failure(.truncated) }
        var r = ByteReader(bytes, offset: 8)
        guard let version = r.fixed(UInt16.self), let compression = r.u8(), let flags = r.u8(), let length = r.fixed(UInt32.self) else {
            return .failure(.truncated)
        }
        guard version >= 1 else { return .failure(.notASave) }
        guard version <= containerVersion else { return .failure(.newerContainer(version)) }
        guard flags == 0 else { return .failure(.newerContainer(version)) }        // a flag this version does not know
        let metaLength = Int(length)
        guard metaLength <= mostMetaBytes else { return .failure(.badMeta) }
        guard bytes.count >= headerBytes + metaLength else { return .failure(.truncated) }
        return .success(Header(compression: compression, metaLength: metaLength))
    }
}
