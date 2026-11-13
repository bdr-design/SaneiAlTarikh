import SaneiCore

// A game's save (§7): the state's tree in SaneiCore's container. The engine fills the META fields that are the state's
// (the format, the date, the seed) itself, so a file it writes from a state between days reads back; reading migrates
// an older tree to the current format and loads it with every value checked. stdlib only.
//
// The format policy (§7, F6; stated here and in §7 only). The format version (`WorldState.saveFormat`) rises when a
// change alters how a released format's columns are read or written: a column renamed, dropped, re-typed or
// re-encoded, units or IDs remapped, a chunk split, a command's fields changed (a step then rewrites the CMDQ items).
// Each rise brings a migration step (`SaveMigrations`; a drop's step may be empty), so that every golden save, migrated
// to the current format, holds exactly the columns the current version writes. A column or chunk only added keeps the
// format: an older save lacks it and takes its default, and an older version skips it, reported, as long as its type
// and encoding are ones format 1 knows and the tree stays within its caps (64 chunks, 96 columns, names of 64 bytes);
// a column of a new type or encoding, or past a cap, is not skippable by an older reader, so it rises the format too.
// A format past the reader's own is refused as newer, from META once the file is whole, before its tree is read. Every format has its
// golden save, written once and never rewritten (Tests/SaneiEngineTests/Golden).

extension SaveMeta {
    /// The player's government as the engine names it.
    public var playerGovernment: GovRef? {
        get { playerSerial == 0 ? nil : GovRef(row: Idx(raw: playerRow), serial: Serial(raw: playerSerial)) }
        set {
            playerRow = newValue?.row.raw ?? 0
            playerSerial = newValue?.serial.raw ?? 0
        }
    }
}

/// A game's save file: writing and reading it.
public enum SaveCodec {
    /// The file's bytes. The format, the date and the seed in META are the state's, whatever `meta` says, and a player's
    /// government the state never made is left out, so every file this writes from a state between days reads back. Make the bytes on the I/O
    /// thread (`sanei.io`, ADR 0001, `threadSpread`) from a copy of the state (a copy is free until a column is written):
    /// never on the simulation's (§3.5).
    /// Nil for a state no read would load, so the platform keeps the last good save and logs it (T-043), never a crash
    /// on the I/O thread and never a file that replaces a good save and cannot load: a state that still holds a
    /// redenomination mark (a save is taken between days, as the host does, when every mark is cleared; a state posted
    /// to outside a day and not stepped since may hold one), and a state whose tree passes `SaveFile.mostPayloadBytes`
    /// (a state at the caps makes about 50 KB; §3.5 budgets 8 MB).
    public static func write(_ state: WorldState, meta: SaveMeta, compressor: (any SaveCompressor)? = nil) -> [UInt8]? {
        guard !state.currencies.redenominationDue.contains(true) else { return nil }
        var m = meta
        m.formatVersion = WorldState.saveFormat
        m.date = state.world.date.days
        m.seed = state.world.seed
        // a player's government the state never made is left out, so the file reads back
        if let p = m.playerGovernment, !state.governments.wasMade(p) { m.playerGovernment = nil }
        if m.playerSerial == 0 { m.playerRow = 0 }
        let payload = state.saveTree().write()
        guard payload.count <= SaveFile.mostPayloadBytes else { return nil }    // unreachable at today's caps (about 50 KB)
        return SaveFile.write(meta: m, payload: payload, compressor: compressor)
    }

    /// The whole file: checked, decompressed, migrated to the current format and loaded with every value checked. Read on
    /// the I/O thread, with the simulation paused and the old state released first (§7, §3.3's load spike).
    public static func read(_ bytes: [UInt8], decompressor: (any SaveCompressor)? = nil)
        -> Result<(state: WorldState, meta: SaveMeta, report: SaveReport), SaveError> {
        read(bytes, decompressor: decompressor, migrations: .current)
    }

    /// `read` with other migration steps (the tests' made-up formats).
    static func read(_ bytes: [UInt8], decompressor: (any SaveCompressor)?, migrations: SaveMigrations)
        -> Result<(state: WorldState, meta: SaveMeta, report: SaveReport), SaveError> {
        let opened: (meta: SaveMeta, metaReport: SaveReport, payload: [UInt8], range: Range<Int>)
        switch SaveFile.open(bytes, decompressor: decompressor) {
        case let .failure(e): return .failure(e)
        case let .success(o): opened = o
        }
        // a newer format is told from META (the file whole, its trailer checked), before the payload's tree is read: a
        // later format's tree may hold what this reader refuses
        if opened.meta.formatVersion > WorldState.saveFormat { return .failure(.newerFormat(opened.meta.formatVersion)) }
        guard var tree = SaveTree.read(opened.payload, opened.range), tree.formatVersion == opened.meta.formatVersion else {
            return .failure(.badPayload)
        }
        let from = tree.formatVersion
        if !migrations.migrate(&tree) { return .failure(.noMigration(from)) }
        var report = opened.metaReport
        guard let state = WorldState.load(tree, report: &report), state.world.date.days == opened.meta.date,
              state.world.seed == opened.meta.seed else { return .failure(.badState) }
        // the player's government, when there is one, is one the game made
        if let p = opened.meta.playerGovernment, !state.governments.wasMade(p) { return .failure(.badMeta) }
        return .success((state, opened.meta, report))
    }
}

/// The steps from each older format to the next (§7): column-level operations on the tree, never old Swift types.
/// Format 1 is the first. The operations on the tree are `addColumn`, `renameColumn`, `dropColumn` and `addChunk`;
/// `remapIDs` comes with the save's content IDs (T-048), `splitChunk` with the column groups (T-047), `splitProvince`
/// with map v2's alias migration (M1b) and `convertUnits` with the first unit to change (M2).
public struct SaveMigrations: Sendable {
    /// `steps[n]` takes a tree of format n to n + 1.
    var steps: [UInt16: @Sendable (inout SaveTree) -> Bool]

    init(steps: [UInt16: @Sendable (inout SaveTree) -> Bool]) { self.steps = steps }

    /// This version's steps (none yet: format 1 is the first).
    public static let current = SaveMigrations(steps: [:])

    /// Migrates a tree to the current format; false when a step is missing or fails.
    func migrate(_ tree: inout SaveTree) -> Bool {
        while tree.formatVersion < WorldState.saveFormat {
            guard let step = steps[tree.formatVersion], step(&tree) else { return false }
            tree.formatVersion += 1
        }
        return tree.formatVersion == WorldState.saveFormat
    }
}
