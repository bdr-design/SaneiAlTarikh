import Foundation
import SaneiContent

/// The ID lock `content/registry/ids.lock` (F4, §2.8): every ID ever issued, one per line as `<kind> <id>`, in the
/// order issued, each line ending in a line break. It only grows: CI refuses a change that removes or alters a line
/// (tools/checks/ids_lock.sh compares it with the target branch's and with the commit's before the push). Every registry
/// ID is in it; an ID in it that a registry no longer holds must have an alias in `aliases.json` (a removed ID points
/// to the IDs that replace it, with population weights). The kinds: the registries' four, and `government` for the
/// scenarios' government IDs (T-048).
public struct IDLock: Sendable, Equatable {
    public static let kinds = ["polity", "actor", "group", "currency", "government"]
    public var entries: [(kind: String, id: String)]

    public static func == (a: IDLock, b: IDLock) -> Bool {
        a.entries.count == b.entries.count && zip(a.entries, b.entries).allSatisfy { $0.kind == $1.kind && $0.id == $1.id }
    }

    public static func parse(_ data: [UInt8], file: String = "ids.lock") throws -> IDLock {
        guard String(decoding: data, as: UTF8.self).utf8.elementsEqual(data), !data.contains(0x0D) else {
            throw BakeError(file, 0, "not UTF-8 with \\n line ends")
        }
        guard data.isEmpty || data.last == 0x0A else { throw BakeError(file, 0, "the last line needs its line break") }
        var lines = data.split(separator: 0x0A, omittingEmptySubsequences: false)
        lines.removeLast()
        var entries: [(String, String)] = []
        for (k, l) in lines.enumerated() {
            let parts = l.split(separator: 0x20, omittingEmptySubsequences: false).map { String(decoding: $0, as: UTF8.self) }
            guard parts.count == 2, kinds.contains(parts[0]), ContentID.isWellFormed(parts[1]) else {
                throw BakeError(file, k + 1, "«\(String(decoding: l, as: UTF8.self))» is not `<kind> <id>` with a known kind and a well-formed ID")
            }
            guard !entries.contains(where: { $0.0 == parts[0] && $0.1 == parts[1] }) else {
                throw BakeError(file, k + 1, "«\(parts[0]) \(parts[1])» twice")
            }
            entries.append((parts[0], parts[1]))
        }
        return IDLock(entries: entries)
    }

    /// The registries' IDs by kind, with their table and position.
    static func ids(of db: ContentDB) -> [(kind: String, id: String, table: String, row: Int)] {
        db.polities.enumerated().map { ("polity", $1.id, "polities", $0) } + db.actors.enumerated().map { ("actor", $1.id, "actors", $0) }
            + db.groups.enumerated().map { ("group", $1.id, "groups", $0) }
            + db.currencies.enumerated().map { ("currency", $1.id, "currencies", $0) }
    }

    /// The first problem between the lock, the registries and the aliases, with its file and line: a registry ID missing
    /// from the lock (the registry's row), a locked government whose ID is not `<polity>.<slug>` of a polity the
    /// registries hold or replace, a locked ID that no registry holds and no alias replaces (the lock's line), an
    /// alias of an ID still held, never issued, or pointing to an ID no registry holds (the alias's line).
    public func firstProblem(_ reg: Registries, _ aliases: Aliases) -> BakeError? {
        var held = Set<String>()
        for e in Self.ids(of: reg.db) { held.insert(e.kind + " " + e.id) }
        var locked = Set<String>()
        for e in entries { locked.insert(e.kind + " " + e.id) }
        for e in Self.ids(of: reg.db) where !locked.contains(e.kind + " " + e.id) {
            return reg.located(ContentProblem(table: e.table, row: e.row, message: "\(e.kind) \(e.id) is not in ids.lock: add it at the end"))
        }
        for (k, e) in entries.enumerated() where e.kind == "government" {
            // a government's ID names its polity: one a registry holds, or one an alias replaces
            let polity = String(e.id.prefix { $0 != "." })
            guard ContentID.isGovernmentID(e.id, of: polity),
                  held.contains("polity " + polity) || aliases.replacement("polity", polity) != nil else {
                return BakeError("ids.lock", k + 1, "government \(e.id) is not <polity>.<slug> of a polity the registries hold or replace")
            }
        }
        for (k, e) in entries.enumerated() where e.kind != "government" && !held.contains(e.kind + " " + e.id) && aliases.replacement(e.kind, e.id) == nil {
            return BakeError("ids.lock", k + 1, "\(e.kind) \(e.id) is locked but no registry holds it and no alias replaces it")
        }
        for a in aliases.aliases {
            if held.contains(a.kind + " " + a.from) { return BakeError("aliases.json", a.line, "\(a.kind) \(a.from) is still in its registry") }
            if !locked.contains(a.kind + " " + a.from) { return BakeError("aliases.json", a.line, "\(a.kind) \(a.from) was never issued (not in ids.lock)") }
            for t in a.to where !held.contains(a.kind + " " + t.id) {
                return BakeError("aliases.json", a.line, "\(a.kind) \(a.from) points to \(t.id), which no registry holds")
            }
        }
        return nil
    }
}

/// `aliases.json` (F4, §7): a removed ID and the IDs that replace it, each with a weight (a population share in
/// basis points, summing to 10,000), so a save or a scenario that names the old ID can be remapped (`remapIDs`, T-048).
///
///     {"format": 1, "aliases": [{"kind": "polity", "from": "old", "to": [{"id": "new", "weight": 10000}]}]}
public struct Aliases: Sendable, Equatable {
    public struct Target: Sendable, Equatable {
        public var id: String
        public var weight: Int64
    }
    public struct Alias: Sendable, Equatable {
        public var kind: String
        public var from: String
        public var to: [Target]
        /// The line of the file the alias starts on (for messages).
        public var line: Int
    }
    public var aliases: [Alias]

    public func replacement(_ kind: String, _ id: String) -> [Target]? {
        aliases.first { $0.kind == kind && $0.from == id }?.to
    }

    /// Strict (`JSON`, one reader): exactly these keys, these types, a known kind other than `government` (aliases of
    /// governments come with T-048), well-formed IDs, each target once and other than the alias's own, weights from 1
    /// to 10,000 summing to 10,000, an ID replaced at most once, and `\n` line ends only (as the CSV files and the
    /// lock).
    public static func parse(_ data: [UInt8], file: String = "aliases.json") throws -> Aliases {
        // \n line ends only, as the CSV files and the lock
        guard !data.contains(0x0D) else { throw BakeError(file, 0, "a carriage return: save with \\n line ends") }
        var starts: [(depth: Int, line: Int)] = []
        let root = try JSON.parse(data, file: file, valueStarts: &starts)
        func fail(_ m: String) -> BakeError { BakeError(file, 0, m) }
        guard root.keys.sorted() == ["aliases", "format"], case .integer(1)? = root["format"], case let .array(list)? = root["aliases"] else {
            throw fail("an object with the keys «format» (1) and «aliases» (a list)")
        }
        // each alias's line, for messages: where its item starts (the list's items are the values two levels down)
        let fromLines = starts.filter { $0.depth == 2 }.map(\.line)
        var out: [Alias] = []
        for (k, item) in list.enumerated() {
            let line = k < fromLines.count ? fromLines[k] : 0
            func bad(_ m: String) -> BakeError { BakeError(file, line, "alias \(k + 1): \(m)") }
            guard item.keys.sorted() == ["from", "kind", "to"], case let .string(kind)? = item["kind"], case let .string(from)? = item["from"],
                  case let .array(to)? = item["to"] else { throw bad("the keys are «kind», «from» and «to», with strings and a list") }
            guard IDLock.kinds.contains(kind), kind != "government", ContentID.isWellFormed(from), !to.isEmpty else {
                throw bad("a known kind, a well-formed ID and at least one target")
            }
            var targets: [Target] = []
            for t in to {
                guard t.keys.sorted() == ["id", "weight"], case let .string(id)? = t["id"], case let .integer(w)? = t["weight"] else {
                    throw bad("each target is {«id»: a string, «weight»: a whole number}")
                }
                guard ContentID.isWellFormed(id), id != from, w >= 1, w <= 10_000 else {
                    throw bad("the target «\(id)» needs a well-formed ID other than «\(from)» and a weight from 1 to 10,000")
                }
                guard !targets.contains(where: { $0.id == id }) else { throw bad("the target «\(id)» twice") }
                targets.append(Target(id: id, weight: w))
            }
            guard targets.reduce(0, { $0 + $1.weight }) == 10_000 else { throw bad("the weights sum to 10,000") }
            guard !out.contains(where: { $0.kind == kind && $0.from == from }) else { throw bad("\(kind) \(from) replaced twice") }
            out.append(Alias(kind: kind, from: from, to: targets, line: line))
        }
        return Aliases(aliases: out)
    }
}
