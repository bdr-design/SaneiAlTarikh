import SaneiCore

/// The validator's rules on the registries (§2.2: the validator lives here, so the reader of `content.bin` checks what
/// it reads with the same rules the bake checks before it writes). Each problem names its table and row's ID.
extension ContentDB {
    /// Every rule a registry keeps, as messages; empty when the content holds.
    public func problems() -> [String] {
        var out: [String] = []
        func caps(_ table: String, _ n: Int, _ cap: Int) { if n > cap { out.append("\(table): \(n) rows, past the cap of \(cap)") } }
        caps("polities", polities.count, RegistryCaps.polities)
        caps("actors", actors.count, RegistryCaps.actors)
        caps("groups", groups.count, RegistryCaps.groups)
        caps("currencies", currencies.count, RegistryCaps.currencies)
        if let (table, id) = repeatedID() { out.append("\(table): the ID \(id) is used twice") }
        func name(_ table: String, _ id: String, _ n: NameRecord) {
            for (field, text) in [("name", n.name), ("short", n.short), ("withLi", n.withLi), ("withBi", n.withBi)] {
                if text.isEmpty { out.append("\(table) \(id): an empty \(field)") }
                if text.utf8.count > NameRecord.mostBytes { out.append("\(table) \(id): \(field) past \(NameRecord.mostBytes) bytes") }
            }
        }
        func well(_ table: String, _ id: String) { if !ContentID.isWellFormed(id) { out.append("\(table): the ID «\(id)» is not well formed") } }
        for p in polities {
            well("polities", p.id)
            name("polities", p.id, p.name)
            if p.currency < 0 || p.currency >= currencies.count { out.append("polities \(p.id): no such currency") }
            if p.colour > 0xFF_FF_FF { out.append("polities \(p.id): a colour past 0xFFFFFF") }
            if let f = p.from, !f.isSupported { out.append("polities \(p.id): a first day outside the calendar") }
            if let u = p.until, !u.isSupported { out.append("polities \(p.id): a last day outside the calendar") }
            if let f = p.from, let u = p.until, u < f { out.append("polities \(p.id): its last day before its first") }
        }
        for a in actors {
            well("actors", a.id)
            name("actors", a.id, a.name)
            if a.polity < 0 || a.polity >= polities.count { out.append("actors \(a.id): no such polity") }
        }
        for g in groups {
            well("groups", g.id)
            name("groups", g.id, g.name)
        }
        for c in currencies {
            well("currencies", c.id)
            name("currencies", c.id, c.name)
            if !(c.iso.utf8.count == 3 && c.iso.utf8.allSatisfy { $0 >= 0x41 && $0 <= 0x5A }) {
                out.append("currencies \(c.id): the ISO code «\(c.iso)» is not three capital letters")
            }
        }
        func evidence(_ table: String, _ id: String, _ e: String) {
            if e.isEmpty { out.append("\(table) \(id): no evidence") }
            if e.utf8.count > NameRecord.mostBytes { out.append("\(table) \(id): evidence past \(NameRecord.mostBytes) bytes") }
        }
        for row in polities { evidence("polities", row.id, row.evidence) }
        for row in actors { evidence("actors", row.id, row.evidence) }
        for row in groups { evidence("groups", row.id, row.evidence) }
        for row in currencies { evidence("currencies", row.id, row.evidence) }
        return out
    }
}

extension NameRecord {
    /// The longest text a name field holds, in UTF-8 bytes.
    public static let mostBytes = 256
}
