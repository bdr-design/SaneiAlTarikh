import SaneiCore

// The file `<name>.sanei` (§7): a header, META (uncompressed, a self-describing table in the column codec, readable
// without the payload), the payload (its raw and stored lengths, then the tree, compressed or not), and a SHA-256 of
// everything before the trailer. The engine writes compression 0 (none); raw DEFLATE is the platform's (App/Platform
// hands a compressor in), and a file that needs one the reader lacks is refused with that reason. stdlib only.

/// What a save says about itself, for the saves list (screen 23), read without the payload.
public struct SaveMeta: Sendable, Equatable {
    public var formatVersion: UInt16
    public var gameVersion: String
    public var build: String
    public var scenarioId: String
    public var mapVersion: UInt32
    /// SHA-256 of `content.bin` and of the scenario file (32 bytes each; empty until content exists, T-042).
    public var rulesHash: [UInt8]
    public var scenarioHash: [UInt8]
    public var date: GameDate
    public var playerGovernment: GovRef?
    public var playerName: String
    /// Seconds played.
    public var playtime: UInt64
    public var preset: UInt8
    public var difficulty: UInt8
    public var cheatsUsed: Bool
    public var seed: UInt64

    public init(formatVersion: UInt16 = WorldState.saveFormat, gameVersion: String = "", build: String = "", scenarioId: String = "",
                mapVersion: UInt32 = 0, rulesHash: [UInt8] = [], scenarioHash: [UInt8] = [], date: GameDate, playerGovernment: GovRef? = nil,
                playerName: String = "", playtime: UInt64 = 0, preset: UInt8 = 0, difficulty: UInt8 = 0, cheatsUsed: Bool = false, seed: UInt64) {
        self.formatVersion = formatVersion
        self.gameVersion = gameVersion
        self.build = build
        self.scenarioId = scenarioId
        self.mapVersion = mapVersion
        self.rulesHash = rulesHash
        self.scenarioHash = scenarioHash
        self.date = date
        self.playerGovernment = playerGovernment
        self.playerName = playerName
        self.playtime = playtime
        self.preset = preset
        self.difficulty = difficulty
        self.cheatsUsed = cheatsUsed
        self.seed = seed
    }

    /// The most bytes of a text field (a name, a version) and of a hash.
    static let mostTextBytes = 256

    var chunk: SaveChunk {
        func text(_ n: String, _ s: String) -> SaveColumn { .items(n, [Array(s.utf8)]) }
        let g = playerGovernment
        return SaveChunk(tag: "META", columns: [
            .of("formatVersion", [UInt64(formatVersion)], .u16, .raw), text("gameVersion", gameVersion), text("build", build),
            text("scenarioId", scenarioId), .of("mapVersion", [UInt64(mapVersion)], .u32, .raw),
            .items("rulesHash", [rulesHash]), .items("scenarioHash", [scenarioHash]),
            .of("date", [Int64(date.days)], .i32, .zigzag),
            .of("playerRow", [UInt64(g?.row.raw ?? 0)], .u16, .raw), .of("playerSerial", [UInt64(g?.serial.raw ?? 0)], .u32, .raw),
            text("playerName", playerName), .of("playtime", [playtime], .u64, .raw), .of("preset", [preset], .u8, .raw),
            .of("difficulty", [difficulty], .u8, .raw), .flags("cheatsUsed", [cheatsUsed]), .of("seed", [seed], .u64, .raw),
        ])
    }

    init?(chunk c: SaveChunk) {
        func u(_ n: String, _ t: SaveType) -> UInt64? { c.column(n)?.values(UInt64.self, as: t, atMost: 1)?.first }
        func text(_ n: String) -> String? {
            guard let b = c.column(n)?.items(atMost: 1, itemLimit: Self.mostTextBytes)?.first else { return nil }
            return String(validating: b, as: UTF8.self)
        }
        func bytes(_ n: String) -> [UInt8]? {
            guard let b = c.column(n)?.items(atMost: 1, itemLimit: 32)?.first, b.isEmpty || b.count == 32 else { return nil }
            return b
        }
        guard c.tag == "META", let fv = u("formatVersion", .u16), fv <= UInt64(UInt16.max), let gv = text("gameVersion"), let b = text("build"),
              let sid = text("scenarioId"), let mv = u("mapVersion", .u32), mv <= UInt64(UInt32.max),
              let rh = bytes("rulesHash"), let sh = bytes("scenarioHash"),
              let d = c.column("date")?.values(Int64.self, as: .i32, atMost: 1)?.first, d >= Int64(Int32.min), d <= Int64(Int32.max),
              let pr = u("playerRow", .u16), pr <= UInt64(UInt16.max), let ps = u("playerSerial", .u32), ps <= UInt64(UInt32.max),
              let pn = text("playerName"), let pt = u("playtime", .u64), let pre = u("preset", .u8), pre <= 255,
              let dif = u("difficulty", .u8), dif <= 255, let ch = c.column("cheatsUsed")?.flags(atMost: 1)?.first,
              let seed = u("seed", .u64) else { return nil }
        self.init(formatVersion: UInt16(fv), gameVersion: gv, build: b, scenarioId: sid, mapVersion: UInt32(mv), rulesHash: rh, scenarioHash: sh,
                  date: GameDate(days: Int32(d)),
                  playerGovernment: ps == 0 ? nil : GovRef(row: Idx(raw: UInt16(pr)), serial: Serial(raw: UInt32(ps))),
                  playerName: pn, playtime: pt, preset: UInt8(pre), difficulty: UInt8(dif), cheatsUsed: ch, seed: seed)
    }
}

/// A compressor the platform hands in (App/Platform: raw DEFLATE with Apple's Compression).
public protocol SaveCompressor: Sendable {
    /// The stored number of this compression in the header (1 for raw DEFLATE).
    var code: UInt8 { get }
    func compress(_ bytes: [UInt8]) -> [UInt8]
    /// The raw bytes, exactly `rawLength` of them; nil when the stored bytes do not make them.
    func decompress(_ bytes: [UInt8], rawLength: Int) -> [UInt8]?
}

/// Why a file was refused.
public enum SaveError: Error, Sendable, Equatable {
    case notASave
    case newerContainer(UInt16)
    case truncated
    case damaged
    case compressionUnavailable(UInt8)
    case badMeta
    case badPayload
    case newerFormat(UInt16)
    case noMigration(UInt16)
    case badState
}

/// A save file: writing and reading it.
public enum SaveCodec {
    public static let magic: [UInt8] = Array("SANEISAV".utf8)
    public static let containerVersion: UInt16 = 1
    /// The most bytes a payload may hold, raw: far above a 90-year save (≤8 MB of state, L3), so a forged length is
    /// refused before anything is allocated.
    public static let mostPayloadBytes = 64 << 20
    static let headerBytes = 8 + 2 + 1 + 1 + 4

    /// The file's bytes. With no compressor the payload is stored as it is (compression 0).
    public static func write(_ state: WorldState, meta: SaveMeta, compressor: (any SaveCompressor)? = nil) -> [UInt8] {
        let metaBytes = SaveTree(formatVersion: meta.formatVersion, chunks: [meta.chunk]).write()
        let raw = state.saveTree().write()
        let stored = compressor?.compress(raw) ?? raw
        var w = ByteWriter(capacity: headerBytes + metaBytes.count + 16 + stored.count + 32)
        w.bytes.append(contentsOf: magic)
        w.fixed(containerVersion, as: UInt16.self)
        w.u8(compressor?.code ?? 0)
        w.u8(0)                                                    // flags: none yet
        w.fixed(UInt32(metaBytes.count), as: UInt32.self)
        w.bytes.append(contentsOf: metaBytes)
        w.fixed(UInt64(raw.count), as: UInt64.self)
        w.fixed(UInt64(stored.count), as: UInt64.self)
        w.bytes.append(contentsOf: stored)
        w.bytes.append(contentsOf: SHA256.hash(w.bytes))
        return w.bytes
    }

    /// The header's fields and META, without touching the payload or the trailer (the saves list reads only this).
    public static func readMeta(_ bytes: [UInt8]) -> Result<SaveMeta, SaveError> {
        switch header(bytes) {
        case let .failure(e): return .failure(e)
        case let .success(h):
            guard let tree = SaveTree.read(Array(bytes[headerBytes..<(headerBytes + h.metaLength)])), tree.chunks.count == 1,
                  let meta = SaveMeta(chunk: tree.chunks[0]) else { return .failure(.badMeta) }
            return .success(meta)
        }
    }

    /// The whole file: the trailer checked, the payload decompressed, migrated to the current format and loaded with
    /// every value checked.
    public static func read(_ bytes: [UInt8], decompressor: (any SaveCompressor)? = nil)
        -> Result<(state: WorldState, meta: SaveMeta, report: SaveReport), SaveError> {
        let h: Header
        switch header(bytes) {
        case let .failure(e): return .failure(e)
        case let .success(x): h = x
        }
        guard bytes.count >= headerBytes + h.metaLength + 16 + 32 else { return .failure(.truncated) }
        let body = bytes.count - 32
        guard SHA256.hash(bytes, 0..<body) == Array(bytes[body...]) else { return .failure(.damaged) }
        let meta: SaveMeta
        switch readMeta(bytes) {
        case let .failure(e): return .failure(e)
        case let .success(m): meta = m
        }
        var r = ByteReader(bytes, offset: headerBytes + h.metaLength)
        guard let rawLength = r.fixed(UInt64.self), let storedLength = r.fixed(UInt64.self),
              rawLength <= UInt64(mostPayloadBytes), storedLength == UInt64(body - r.offset) else { return .failure(.badPayload) }
        let stored = Array(bytes[r.offset..<body])
        let raw: [UInt8]
        if h.compression == 0 {
            guard rawLength == storedLength else { return .failure(.badPayload) }
            raw = stored
        } else {
            guard let d = decompressor, d.code == h.compression else { return .failure(.compressionUnavailable(h.compression)) }
            guard let x = d.decompress(stored, rawLength: Int(rawLength)), x.count == Int(rawLength) else { return .failure(.badPayload) }
            raw = x
        }
        guard var tree = SaveTree.read(raw) else { return .failure(.badPayload) }
        guard tree.formatVersion == meta.formatVersion else { return .failure(.badPayload) }
        if tree.formatVersion > WorldState.saveFormat { return .failure(.newerFormat(tree.formatVersion)) }
        if !SaveMigrations.migrate(&tree) { return .failure(.noMigration(tree.formatVersion)) }
        var report = SaveReport()
        guard let state = WorldState.load(tree, report: &report) else { return .failure(.badState) }
        guard state.world.date == meta.date, state.world.seed == meta.seed else { return .failure(.badState) }
        return .success((state, meta, report))
    }

    struct Header {
        var compression: UInt8
        var metaLength: Int
    }

    static func header(_ bytes: [UInt8]) -> Result<Header, SaveError> {
        guard bytes.count >= headerBytes, Array(bytes[0..<8]) == magic else {
            return .failure(bytes.count >= 8 && Array(bytes[0..<8]) != magic ? .notASave : (bytes.count < 8 ? .notASave : .truncated))
        }
        var r = ByteReader(bytes, offset: 8)
        let version = r.fixed(UInt16.self)!
        guard version <= containerVersion, version >= 1 else { return .failure(.newerContainer(version)) }
        let compression = r.u8()!
        _ = r.u8()!
        let metaLength = Int(r.fixed(UInt32.self)!)
        guard metaLength <= 1 << 16, bytes.count >= headerBytes + metaLength else { return .failure(.truncated) }
        return .success(Header(compression: compression, metaLength: metaLength))
    }
}

/// The steps from each older format to the next (§7): column-level operations on the tree, never old Swift types.
/// Format 1 is the first; a step is added for each later format.
public enum SaveMigrations {
    /// `steps[n]` takes a tree of format n to n + 1.
    public static let steps: [UInt16: @Sendable (inout SaveTree) -> Bool] = [:]

    /// Migrates a tree to the current format; false when a step is missing or fails.
    public static func migrate(_ tree: inout SaveTree, steps: [UInt16: @Sendable (inout SaveTree) -> Bool] = SaveMigrations.steps) -> Bool {
        while tree.formatVersion < WorldState.saveFormat {
            guard let step = steps[tree.formatVersion], step(&tree) else { return false }
            tree.formatVersion += 1
        }
        return tree.formatVersion == WorldState.saveFormat
    }
}
