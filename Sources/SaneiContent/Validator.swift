import SaneiCore

/// A rule the content breaks: the table, the row's position in it (nil for the table as a whole) and what is wrong.
/// The bake turns the position into the file and line the row came from.
public struct ContentProblem: Sendable, Equatable, CustomStringConvertible {
    public var table: String
    public var row: Int?
    public var message: String

    public init(table: String, row: Int?, message: String) {
        self.table = table
        self.row = row
        self.message = message
    }

    public var description: String { row.map { "\(table) row \($0): \(message)" } ?? "\(table): \(message)" }
}

/// The validator's rules on the registries (§2.2: the validator lives here, so the reader of `content.bin` checks what
/// it reads with the same rules the bake checks before it writes).
extension ContentDB {
    /// The longest text a name field holds, in UTF-8 bytes.
    public static let mostTextBytes = 256

    /// True for a name's text: not empty, at most `mostTextBytes` bytes, no space at either end, and no character that
    /// changes how the text around it shows (a control, a line or paragraph separator, a bidi embedding, override or
    /// isolate, a byte-order mark); the joiners Arabic needs (U+200C, U+200D) are allowed.
    static func isNameText(_ t: String) -> Bool {
        guard !t.isEmpty, t.utf8.count <= mostTextBytes, let first = t.unicodeScalars.first, let last = t.unicodeScalars.last,
              !isSpace(first.value), !isSpace(last.value) else { return false }
        for s in t.unicodeScalars {
            let v = s.value
            if v < 0x20 || (v >= 0x7F && v <= 0x9F) || v == 0x2028 || v == 0x2029 || v == 0xFEFF { return false }
            if (v >= 0x202A && v <= 0x202E) || (v >= 0x2066 && v <= 0x2069) || v == 0x200E || v == 0x200F || v == 0x061C { return false }
        }
        return true
    }

    /// A space by Unicode's White_Space property, the controls apart (they are refused anywhere in a name): the list
    /// written out, as looking the property up cost two thirds of the rule's time.
    static func isSpace(_ v: UInt32) -> Bool {
        v == 0x20 || v == 0xA0 || v == 0x1680 || (v >= 0x2000 && v <= 0x200A) || v == 0x202F || v == 0x205F || v == 0x3000
    }

    /// Every rule a registry keeps; empty when the content holds.
    public func problems() -> [ContentProblem] {
        var out: [ContentProblem] = []
        func add(_ table: String, _ row: Int?, _ m: String) { out.append(ContentProblem(table: table, row: row, message: m)) }
        func caps(_ table: String, _ n: Int, _ cap: Int) { if n > cap { add(table, nil, "\(n) rows, past the cap of \(cap)") } }
        caps("polities", polities.count, RegistryCaps.polities)
        caps("actors", actors.count, RegistryCaps.actors)
        caps("groups", groups.count, RegistryCaps.groups)
        caps("currencies", currencies.count, RegistryCaps.currencies)
        if polities.isEmpty { add("polities", nil, "no polity: content needs at least one") }
        if currencies.isEmpty { add("currencies", nil, "no currency: content needs at least one") }
        for (table, order, ids) in [("polities", polityOrder, polityIDs), ("actors", actorOrder, actorIDs),
                                    ("groups", groupOrder, groupIDs), ("currencies", currencyOrder, currencyIDs)] {
            if let k = Self.repeated(order, ids) { add(table, k, "the ID \(ids[k]) is used twice") }
        }
        func name(_ table: String, _ k: Int, _ n: NameRecord) {
            for (field, t) in [("name", n.name), ("short", n.short), ("oblique", n.oblique), ("withLi", n.withLi), ("withBi", n.withBi)]
            where !Self.isNameText(t) {
                add(table, k, "\(field) is empty, past \(Self.mostTextBytes) bytes, spaced at an end, or holds a control or direction mark")
            }
            if n.human && n.number == .singular { add(table, k, "human is for plural names of people; this one is singular") }
        }
        func evidence(_ table: String, _ k: Int, _ e: String) {
            if !ContentID.isWellFormed(e) { add(table, k, "the evidence «\(e)» is not an evidence ID (the ID rule)") }
        }
        for (k, p) in polities.enumerated() {
            if !ContentID.isPolityID(p.id) {
                add("polities", k, "the ID «\(p.id)» is not a polity's (the ID rule, no dot, at most \(ContentID.mostPolityBytes) bytes)")
            }
            name("polities", k, p.name)
            if p.colour > 0xFF_FF_FF { add("polities", k, "a colour past 0xFFFFFF") }
            evidence("polities", k, p.evidence)
        }
        for (k, a) in actors.enumerated() {
            if a.polity < 0 || a.polity >= polities.count {
                add("actors", k, "no such polity")
            } else if !ContentID.isActorID(a.id, of: polities[a.polity].id) {
                add("actors", k, "the ID «\(a.id)» is not act.\(polities[a.polity].id).<slug>")
            }
            name("actors", k, a.name)
            evidence("actors", k, a.evidence)
        }
        for (k, g) in groups.enumerated() {
            if !ContentID.isWellFormed(g.id) { add("groups", k, "the ID «\(g.id)» is not well formed") }
            name("groups", k, g.name)
            evidence("groups", k, g.evidence)
        }
        // a code used before: the rows ordered by (code, position), each after the first of its run
        var isoUsed = [Bool](repeating: false, count: currencies.count)
        let isoOrder = (0..<currencies.count).sorted {
            let o = Self.order(currencies[$0].iso, currencies[$1].iso)
            return o != 0 ? o < 0 : $0 < $1
        }
        for k in isoOrder.indices.dropFirst() where Self.order(currencies[isoOrder[k]].iso, currencies[isoOrder[k - 1]].iso) == 0 {
            isoUsed[isoOrder[k]] = true
        }
        for (k, c) in currencies.enumerated() {
            if !ContentID.isWellFormed(c.id) { add("currencies", k, "the ID «\(c.id)» is not well formed") }
            name("currencies", k, c.name)
            if !(c.iso.utf8.count == 3 && c.iso.utf8.allSatisfy { $0 >= 0x41 && $0 <= 0x5A }) {
                add("currencies", k, "the ISO code «\(c.iso)» is not three capital letters")
            } else if isoUsed[k] {
                add("currencies", k, "the ISO code \(c.iso) is another currency's")
            }
            evidence("currencies", k, c.evidence)
        }
        return out
    }
}
