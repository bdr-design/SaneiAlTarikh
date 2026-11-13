import Foundation
import SaneiCore
import SaneiContent

/// The registries' files in `content/registry/` (§2.1, §4.4) and their schemas: the header of each file must be its
/// schema, column for column. A column added later keeps the content format; one renamed, dropped or retyped bumps it
/// (§7's rule, `ContentFile.format`).
public enum RegistrySchema {
    static let name = ["name", "short", "gender", "number", "human", "definite", "oblique", "withLi", "withBi"]
    public static let currencies = ["id", "iso", "reach"] + name + ["evidence"]
    public static let polities = ["id", "status"] + name + ["colour", "evidence"]
    public static let actors = ["id", "polity", "kind"] + name + ["evidence"]
    public static let groups = ["id", "dimension"] + name + ["evidence"]
    /// Each table's file, in the order the bake reads them.
    public static let files: [(table: String, file: String)] = [("currencies", "currency_registry.csv"),
        ("polities", "polity_registry.csv"), ("actors", "actor_registry.csv"), ("groups", "group_registry.csv")]
}

/// The registries read into a `ContentDB`, with where each row came from: every value parsed to its type, and every
/// rule of the validator refused with its file and line.
public struct Registries: Sendable {
    public var db: ContentDB
    /// Each table's rows' lines in their file, by position.
    public var lines: [String: [Int]]

    /// The words a CSV uses for the stored enums (the numbers are `tags.lock`'s; the words are the files').
    static let statuses: [String: PolityStatus] = ["state": .state, "deFacto": .deFacto, "candidate": .candidate]
    static let actorKinds: [String: ActorKind] = ["party": .party, "movement": .movement, "armed": .armed, "faction": .faction]
    static let dimensions: [String: GroupDimension] = ["ethnolinguistic": .ethnolinguistic, "religious": .religious]
    static let reaches: [String: CurrencyReach] = ["national": .national, "union": .union]
    static let genders: [String: Gender] = ["m": .masculine, "f": .feminine]
    static let numbers: [String: GrammaticalNumber] = ["singular": .singular, "dual": .dual, "plural": .plural]

    struct Row {
        let file: String
        let line: Int
        let value: (String) -> String

        func fail(_ m: String) -> BakeError { BakeError(file, line, m) }

        func word<E>(_ column: String, _ words: [String: E]) throws -> E {
            let v = value(column)
            guard let e = words[v] else { throw fail("\(column) «\(v)» is not one of \(words.keys.sorted().joined(separator: ", "))") }
            return e
        }

        func flag(_ column: String) throws -> Bool {
            let v = value(column)
            guard v == "0" || v == "1" else { throw fail("\(column) «\(v)» is not 0 or 1") }
            return v == "1"
        }

        /// A text as written, refused when it is not in Unicode's composed form (NFC): one name has one spelling, so
        /// one content has one `content.bin`.
        func text(_ column: String) throws -> String {
            let v = value(column)
            guard v.precomposedStringWithCanonicalMapping.utf8.elementsEqual(v.utf8) else {
                throw fail("\(column) «\(v)» is not in Unicode's composed form (NFC): save it composed")
            }
            return v
        }

        func name() throws -> NameRecord {
            NameRecord(name: try text("name"), short: try text("short"), gender: try word("gender", genders),
                       number: try word("number", numbers), human: try flag("human"), definite: try flag("definite"),
                       oblique: try text("oblique"), withLi: try text("withLi"), withBi: try text("withBi"))
        }

        func reference(_ column: String, in ids: [String: Int]) throws -> Int {
            let v = value(column)
            guard let k = ids[v] else { throw fail("\(column) «\(v)» names no row") }
            return k
        }

        func colour() throws -> UInt32 {
            let v = Array(value("colour").utf8)
            guard v.count == 7, v[0] == 0x23, v.dropFirst().allSatisfy({ ($0 >= 0x30 && $0 <= 0x39) || ($0 >= 0x41 && $0 <= 0x46) }),
                  let c = UInt32(String(decoding: v.dropFirst(), as: UTF8.self), radix: 16) else {
                throw fail("colour «\(value("colour"))» is not #RRGGBB in capitals")
            }
            return c
        }
    }

    static func rows(_ dir: URL, _ file: String, _ schema: [String]) throws -> [Row] {
        guard let data = FileManager.default.contents(atPath: dir.appendingPathComponent(file).path) else { throw BakeError(file, 0, "missing") }
        let csv = try CSV.parse(Array(data), file: file)
        return try csv.records(schema, file: file).map { Row(file: file, line: $0.line, value: $0.value) }
    }

    /// The registries in `dir`, every row parsed and every reference resolved; then the validator's rules, each refused
    /// with the file and line of its row.
    public static func load(_ dir: URL) throws -> Registries {
        let cr = try rows(dir, "currency_registry.csv", RegistrySchema.currencies)
        let currencies = try cr.map { r in
            CurrencyRow(id: r.value("id"), iso: r.value("iso"), reach: try r.word("reach", reaches), name: try r.name(), evidence: r.value("evidence"))
        }
        let pr = try rows(dir, "polity_registry.csv", RegistrySchema.polities)
        let polities = try pr.map { r in
            PolityRow(id: r.value("id"), status: try r.word("status", statuses), name: try r.name(), colour: try r.colour(),
                      evidence: r.value("evidence"))
        }
        // references by the first row of each ID (a repeated ID is the validator's, with its line)
        var polityAt: [String: Int] = [:]
        for (k, p) in polities.enumerated() where polityAt[p.id] == nil { polityAt[p.id] = k }
        let ar = try rows(dir, "actor_registry.csv", RegistrySchema.actors)
        let actors = try ar.map { r in
            ActorRow(id: r.value("id"), polity: try r.reference("polity", in: polityAt), kind: try r.word("kind", actorKinds),
                     name: try r.name(), evidence: r.value("evidence"))
        }
        let gr = try rows(dir, "group_registry.csv", RegistrySchema.groups)
        let groups = try gr.map { r in
            GroupRow(id: r.value("id"), dimension: try r.word("dimension", dimensions), name: try r.name(), evidence: r.value("evidence"))
        }
        let out = Registries(db: ContentDB(polities: polities, actors: actors, groups: groups, currencies: currencies),
                             lines: ["currencies": cr.map(\.line), "polities": pr.map(\.line), "actors": ar.map(\.line),
                                     "groups": gr.map(\.line)])
        if let first = out.db.problems().first { throw out.located(first) }
        return out
    }

    /// A problem of the validator as a `BakeError` with its row's file and line (line 0 for the table as a whole).
    public func located(_ p: ContentProblem) -> BakeError {
        let file = RegistrySchema.files.first { $0.table == p.table }?.file ?? p.table
        let line = p.row.flatMap { k in lines[p.table].flatMap { k < $0.count ? $0[k] : nil } } ?? 0
        return BakeError(file, line, p.message)
    }
}
