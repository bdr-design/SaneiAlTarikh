import Foundation
import SaneiCore
import SaneiContent

/// The registries' files in `content/registry/` (§2.1, §4.4) and their schemas: the header of each file must be its
/// schema, column for column. A column added later keeps the content format; one renamed, dropped or retyped bumps it
/// (§7's rule, `ContentFile.format`).
public enum RegistrySchema {
    static let name = ["name", "short", "gender", "number", "definite", "withLi", "withBi"]
    public static let currencies = ["id", "iso", "kind"] + name + ["evidence"]
    public static let polities = ["id", "kind"] + name + ["colour", "currency", "from", "until", "evidence"]
    public static let actors = ["id", "polity", "kind"] + name + ["evidence"]
    public static let groups = ["id", "dimension"] + name + ["evidence"]
    public static let files = ["currency_registry.csv", "polity_registry.csv",
                               "actor_registry.csv", "group_registry.csv"]
}

/// Reading the registries into a `ContentDB`, every value parsed to its type or refused with its file and line.
public enum Registries {
    /// The words a CSV uses for the stored enums (the numbers are `tags.lock`'s; the words are the files').
    static let polityKinds: [String: PolityKind] = ["state": .state, "deFacto": .deFacto, "candidate": .candidate]
    static let actorKinds: [String: ActorKind] = ["party": .party, "movement": .movement, "armed": .armed, "institution": .institution]
    static let dimensions: [String: GroupDimension] = ["ethnolinguistic": .ethnolinguistic, "religious": .religious]
    static let currencyKinds: [String: CurrencyKind] = ["national": .national, "union": .union]
    static let genders: [String: Gender] = ["m": .masculine, "f": .feminine]
    static let numbers: [String: GrammaticalNumber] = ["singular": .singular, "dual": .dual, "plural": .plural]

    struct Row {
        let file: String
        let line: Int
        let value: (String) -> String

        func word<E>(_ column: String, _ words: [String: E]) throws -> E {
            let v = value(column)
            guard let e = words[v] else {
                throw BakeError(file, line, "\(column) «\(v)» is not one of \(words.keys.sorted().joined(separator: ", "))")
            }
            return e
        }

        func name() throws -> NameRecord {
            let definite = value("definite")
            guard definite == "0" || definite == "1" else { throw BakeError(file, line, "definite «\(definite)» is not 0 or 1") }
            return NameRecord(name: value("name"), short: value("short"), gender: try word("gender", genders),
                              number: try word("number", numbers), definite: definite == "1",
                              withLi: value("withLi"), withBi: value("withBi"))
        }

        func id() throws -> String {
            let v = value("id")
            guard ContentID.isWellFormed(v) else { throw BakeError(file, line, "the ID «\(v)» is not well formed") }
            return v
        }

        func reference(_ column: String, in ids: [String: Int]) throws -> Int {
            let v = value(column)
            guard let k = ids[v] else { throw BakeError(file, line, "\(column) «\(v)» names no row") }
            return k
        }

        func date(_ column: String) throws -> GameDate? {
            let v = value(column)
            if v.isEmpty { return nil }
            let parts = v.split(separator: "-", omittingEmptySubsequences: false)
            guard parts.count == 3, parts[0].count == 4, parts[1].count == 2, parts[2].count == 2,
                  let y = Int(parts[0]), let m = Int(parts[1]), let d = Int(parts[2]),
                  let g = GameDate(year: y, month: m, day: d), g.isSupported else {
                throw BakeError(file, line, "\(column) «\(v)» is not a day YYYY-MM-DD in the calendar")
            }
            return g
        }

        func colour() throws -> UInt32 {
            let v = value("colour")
            guard v.count == 7, v.first == "#", let c = UInt32(v.dropFirst(), radix: 16),
                  v.dropFirst().allSatisfy({ $0.isHexDigit && ($0.isNumber || $0.isUppercase) }) else {
                throw BakeError(file, line, "colour «\(v)» is not #RRGGBB in capitals")
            }
            return c
        }
    }

    static func rows(_ dir: URL, _ file: String, _ schema: [String]) throws -> [Row] {
        let url = dir.appendingPathComponent(file)
        guard let data = FileManager.default.contents(atPath: url.path) else { throw BakeError(file, 0, "missing") }
        let csv = try CSV.parse(Array(data), file: file)
        return try csv.records(schema, file: file).map { Row(file: file, line: $0.line, value: $0.value) }
    }

    /// The positions of `ids`, refusing a repeated one.
    static func positions(_ rows: [Row], _ ids: [String]) throws -> [String: Int] {
        var out: [String: Int] = [:]
        for (k, id) in ids.enumerated() {
            if out[id] != nil { throw BakeError(rows[k].file, rows[k].line, "the ID «\(id)» is used twice") }
            out[id] = k
        }
        return out
    }

    /// The registries in `dir`, every row parsed and every reference resolved; then the validator's rules.
    public static func load(_ dir: URL) throws -> ContentDB {
        let cr = try rows(dir, "currency_registry.csv", RegistrySchema.currencies)
        let currencies = try cr.map { r in
            CurrencyRow(id: try r.id(), iso: r.value("iso"), kind: try r.word("kind", currencyKinds), name: try r.name(),
                        evidence: r.value("evidence"))
        }
        let currencyAt = try positions(cr, currencies.map(\.id))
        let pr = try rows(dir, "polity_registry.csv", RegistrySchema.polities)
        let polities = try pr.map { r in
            PolityRow(id: try r.id(), kind: try r.word("kind", polityKinds), name: try r.name(), colour: try r.colour(),
                      currency: try r.reference("currency", in: currencyAt), from: try r.date("from"), until: try r.date("until"),
                      evidence: r.value("evidence"))
        }
        let polityAt = try positions(pr, polities.map(\.id))
        let ar = try rows(dir, "actor_registry.csv", RegistrySchema.actors)
        let actors = try ar.map { r in
            ActorRow(id: try r.id(), polity: try r.reference("polity", in: polityAt), kind: try r.word("kind", actorKinds),
                     name: try r.name(), evidence: r.value("evidence"))
        }
        _ = try positions(ar, actors.map(\.id))
        let rr = try rows(dir, "group_registry.csv", RegistrySchema.groups)
        let groups = try rr.map { r in
            GroupRow(id: try r.id(), dimension: try r.word("dimension", dimensions), name: try r.name(), evidence: r.value("evidence"))
        }
        _ = try positions(rr, groups.map(\.id))
        let db = ContentDB(polities: polities, actors: actors, groups: groups, currencies: currencies)
        if let first = db.problems().first { throw BakeError("content/registry", 0, first) }
        return db
    }
}
