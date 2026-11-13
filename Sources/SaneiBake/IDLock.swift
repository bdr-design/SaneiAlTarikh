import Foundation
import SaneiContent

/// The ID lock `content/registry/ids.lock` (F4, §2.8): every ID ever issued, one per line as `<kind> <id>`, in the
/// order issued. It only grows: CI refuses a change that removes or alters a line (tools/checks/ids_lock.sh compares it
/// with the target branch's). Every registry ID is in it; an ID in it that a registry no longer holds must have an alias
/// in `aliases.json` (a removed ID points to the IDs that replace it, with population weights).
public struct IDLock: Sendable, Equatable {
    public static let kinds = ["polity", "actor", "group", "currency"]
    public var entries: [(kind: String, id: String)]

    public static func == (a: IDLock, b: IDLock) -> Bool {
        a.entries.count == b.entries.count && zip(a.entries, b.entries).allSatisfy { $0.kind == $1.kind && $0.id == $1.id }
    }

    public static func parse(_ data: [UInt8], file: String = "ids.lock") throws -> IDLock {
        let text = String(decoding: data, as: UTF8.self)
        guard text.utf8.elementsEqual(data), !data.contains(0x0D) else { throw BakeError(file, 0, "not UTF-8 with \\n line ends") }
        var lines = text.split(separator: "\n", omittingEmptySubsequences: false)
        if lines.last == "" { lines.removeLast() }
        var entries: [(String, String)] = []
        var seen = Set<String>()
        for (k, l) in lines.enumerated() {
            let parts = l.split(separator: " ", omittingEmptySubsequences: false)
            guard parts.count == 2, kinds.contains(String(parts[0])), ContentID.isWellFormed(String(parts[1])) else {
                throw BakeError(file, k + 1, "«\(l)» is not `<kind> <id>` with a known kind and a well-formed ID")
            }
            guard seen.insert(l.description).inserted else { throw BakeError(file, k + 1, "«\(l)» twice") }
            entries.append((String(parts[0]), String(parts[1])))
        }
        return IDLock(entries: entries)
    }

    /// The registries' IDs by kind, as the lock names them.
    public static func ids(of db: ContentDB) -> [(kind: String, id: String)] {
        db.polities.map { ("polity", $0.id) } + db.actors.map { ("actor", $0.id) } + db.groups.map { ("group", $0.id) }
            + db.currencies.map { ("currency", $0.id) }
    }

    /// The problems between the lock, the registries and the aliases: a registry ID missing from the lock, and a locked
    /// ID that no registry holds and no alias replaces.
    public func problems(_ db: ContentDB, _ aliases: Aliases) -> [String] {
        var locked = Set<String>()
        for e in entries { locked.insert(e.kind + " " + e.id) }
        var held = Set<String>()
        var out: [String] = []
        for e in Self.ids(of: db) {
            held.insert(e.kind + " " + e.id)
            if !locked.contains(e.kind + " " + e.id) { out.append("ids.lock: \(e.kind) \(e.id) is not locked: add it at the end") }
        }
        for e in entries where !held.contains(e.kind + " " + e.id) && aliases.replacement(e.kind, e.id) == nil {
            out.append("ids.lock: \(e.kind) \(e.id) is locked but no registry holds it and no alias replaces it")
        }
        // an alias replaces an ID no registry holds any more, with IDs a registry holds
        for a in aliases.aliases {
            if held.contains(a.kind + " " + a.from) { out.append("aliases.json: \(a.kind) \(a.from) is still in its registry") }
            if !locked.contains(a.kind + " " + a.from) { out.append("aliases.json: \(a.kind) \(a.from) was never issued (not in ids.lock)") }
            for t in a.to where !held.contains(a.kind + " " + t.id) {
                out.append("aliases.json: \(a.kind) \(a.from) points to \(t.id), which no registry holds")
            }
        }
        return out
    }
}

/// `aliases.json` (F4, §7): a removed ID and the IDs that replace it, each with a weight (a population share in
/// basis points, summing to 10,000), so a save or a scenario that names the old ID can be remapped (`remapIDs`).
///
///     {"format": 1, "aliases": [{"kind": "polity", "from": "old", "to": [{"id": "new", "weight": 10000}]}]}
public struct Aliases: Sendable, Equatable {
    public struct Target: Sendable, Equatable {
        public var id: String
        public var weight: Int
    }
    public struct Alias: Sendable, Equatable {
        public var kind: String
        public var from: String
        public var to: [Target]
    }
    public var aliases: [Alias]

    public func replacement(_ kind: String, _ id: String) -> [Target]? {
        aliases.first { $0.kind == kind && $0.from == id }?.to
    }

    /// Strict: exactly these keys, these types (numbers whole, never a boolean or a fraction: decoded by
    /// `JSONDecoder`), a known kind, well-formed IDs, weights above 0 summing to 10,000, an ID replaced at most once.
    public static func parse(_ data: [UInt8], file: String = "aliases.json") throws -> Aliases {
        func fail(_ m: String) -> BakeError { BakeError(file, 0, m) }
        struct FileT: Decodable { var format: Int; var aliases: [AliasT] }
        struct AliasT: Decodable { var kind: String; var from: String; var to: [TargetT] }
        struct TargetT: Decodable { var id: String; var weight: Int }
        // the keys, exactly: `JSONDecoder` alone would let an unknown key through
        guard let root = try? JSONSerialization.jsonObject(with: Data(data)) as? [String: Any], Set(root.keys) == ["format", "aliases"],
              let list = root["aliases"] as? [Any] else { throw fail("an object with the keys «format» and «aliases»") }
        for (k, item) in list.enumerated() {
            guard let a = item as? [String: Any], Set(a.keys) == ["kind", "from", "to"], let to = a["to"] as? [Any],
                  to.allSatisfy({ ($0 as? [String: Any]).map { Set($0.keys) == ["id", "weight"] } ?? false }) else {
                throw fail("alias \(k + 1): the keys are «kind», «from» and «to», each target «id» and «weight»")
            }
        }
        let decoded: FileT
        do { decoded = try JSONDecoder().decode(FileT.self, from: Data(data)) } catch { throw fail("a value of the wrong type: \(error)") }
        guard decoded.format == 1 else { throw fail("format \(decoded.format): this version reads format 1") }
        var out: [Alias] = []
        for (k, a) in decoded.aliases.enumerated() {
            guard IDLock.kinds.contains(a.kind), ContentID.isWellFormed(a.from), !a.to.isEmpty else {
                throw fail("alias \(k + 1): a known kind, a well-formed ID and at least one target")
            }
            for t in a.to where !ContentID.isWellFormed(t.id) || t.id == a.from || t.weight <= 0 {
                throw fail("alias \(k + 1): the target «\(t.id)» needs a well-formed ID other than «\(a.from)» and a weight above 0")
            }
            guard a.to.reduce(0, { $0 + $1.weight }) == 10_000 else { throw fail("alias \(k + 1): the weights sum to 10,000") }
            guard !out.contains(where: { $0.kind == a.kind && $0.from == a.from }) else { throw fail("alias \(k + 1): \(a.kind) \(a.from) twice") }
            out.append(Alias(kind: a.kind, from: a.from, to: a.to.map { Target(id: $0.id, weight: $0.weight) }))
        }
        return Aliases(aliases: out)
    }
}
