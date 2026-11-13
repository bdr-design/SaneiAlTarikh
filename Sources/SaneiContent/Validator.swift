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
/// it reads with the rules on the rows that the bake checks before it writes; the source files' own rules, the CSV and
/// JSON forms, text in NFC, the ID lock and the aliases, are the bake's alone).
extension ContentDB {
    /// The longest text a name field holds, in UTF-8 bytes.
    public static let mostTextBytes = 256

    /// True for a name's text: not empty, at most `mostTextBytes` bytes, no space at either end, no mark at its start,
    /// and no character that changes how the text around it shows or that shows nothing: a control, a line or
    /// paragraph separator, every format character (a bidi embedding, override, isolate or mark, a zero-width space, a
    /// soft hyphen, a word joiner, a byte-order mark, an annotation mark), every other character Unicode lets a
    /// renderer ignore (a filler, a variation selector, the grapheme joiner) and every private-use code point
    /// (`hiddenRanges`), the blank braille pattern and the 66 noncharacters (U+FDD0 to U+FDEF, and the last two of
    /// every plane: never characters, by Unicode's own rule); but the joiners Arabic needs (U+200C, U+200D), which may stand
    /// anywhere but at an end; and no character Unicode assigned after `unicodeVersion` (or not at all).
    ///
    /// The bake and the phone must judge a name alike, whatever Unicode their systems carry. So the hidden characters
    /// are Unicode 15.0's, written out (a test checks the list against the toolchain's tables), and only two stable
    /// facts are looked up: a character's age (fixed once it is assigned; a character newer than the system is unknown
    /// to it and refused, on an older system too) and whether the first is a mark (a mark that later becomes a letter,
    /// or the reverse, would change only that one rule).
    static func isNameText(_ t: String) -> Bool {
        guard !t.isEmpty, t.utf8.count <= mostTextBytes, let first = t.unicodeScalars.first, let last = t.unicodeScalars.last,
              !isSpace(first.value), !isSpace(last.value), !isJoiner(first.value), !isJoiner(last.value) else { return false }
        if !isPlain(first.value) {
            switch first.properties.generalCategory {
            case .nonspacingMark, .spacingMark, .enclosingMark: return false
            default: break
            }
        }
        for s in t.unicodeScalars {
            let v = s.value
            if isPlain(v) || v == 0x20 || isArabicMark(v) { continue }
            if v < 0x20 || (v >= 0x7F && v <= 0x9F) || v == 0x2028 || v == 0x2029 || v == 0x2800 { return false }
            if (v >= 0xFDD0 && v <= 0xFDEF) || v & 0xFFFE == 0xFFFE { return false }   // the noncharacters
            if isJoiner(v) { continue }
            if isHidden(v) { return false }
            guard let age = s.properties.age, age.major < unicodeVersion.major
                    || (age.major == unicodeVersion.major && age.minor <= unicodeVersion.minor) else { return false }
        }
        return true
    }

    /// Unicode 15.0's format characters, other default-ignorable code points and private-use code points, the joiners
    /// apart, as ranges in rising order (made from the pinned toolchain's tables; `testTheHiddenListIsUnicode15s`).
    static let hiddenRanges: [(UInt32, UInt32)] = [
        (0xAD, 0xAD), (0x34F, 0x34F), (0x600, 0x605), (0x61C, 0x61C), (0x6DD, 0x6DD), (0x70F, 0x70F), (0x890, 0x891),
        (0x8E2, 0x8E2), (0x115F, 0x1160), (0x17B4, 0x17B5), (0x180B, 0x180F), (0x200B, 0x200B), (0x200E, 0x200F),
        (0x202A, 0x202E), (0x2060, 0x206F), (0x3164, 0x3164), (0xE000, 0xF8FF), (0xFE00, 0xFE0F), (0xFEFF, 0xFEFF),
        (0xFFA0, 0xFFA0), (0xFFF0, 0xFFFB), (0x110BD, 0x110BD), (0x110CD, 0x110CD), (0x13430, 0x1343F),
        (0x1BCA0, 0x1BCA3), (0x1D173, 0x1D17A), (0xE0000, 0xE0FFF), (0xF0000, 0xFFFFD), (0x100000, 0x10FFFD),
    ]

    /// True when `v` is in `hiddenRanges`.
    static func isHidden(_ v: UInt32) -> Bool {
        for (lo, hi) in hiddenRanges {
            if v < lo { return false }
            if v <= hi { return true }
        }
        return false
    }

    /// The newest Unicode a name's character may come from: that of the Swift runtime in the oldest system the game
    /// runs on. On Apple's systems that runtime is the system's own, not the toolchain's: iOS 17.0 and macOS 14.0 are
    /// taken to carry Swift 5.9's, whose tables are Unicode 15.0 (a later 17.x or 14.x carries 5.10's, 15.0 as well;
    /// the pinned Linux toolchain, Swift 6.0.3, is 15.0 too, and Swift 6.1 is 16.0). Which Unicode each Apple runtime
    /// carries is from no measurement of ours: T-043 checks iOS 17.0's on its simulator; macOS 14.0's stays unchecked. Raised only with the minimum
    /// system (Package.swift, App/project.yml, §3.10), with `hiddenRanges` made again from that version's tables.
    public static let unicodeVersion = (major: 15, minor: 0)

    /// The Arabic marks (the harakat, U+064B to U+0652, and the superscript alef, U+0670): marks of Unicode 1.1, none
    /// a format or ignorable character, so a name may hold them after a letter without a lookup.
    @inline(__always) static func isArabicMark(_ v: UInt32) -> Bool { (v >= 0x064B && v <= 0x0652) || v == 0x0670 }

    /// The joiners Arabic needs: U+200C (zero-width non-joiner) and U+200D (zero-width joiner).
    @inline(__always) static func isJoiner(_ v: UInt32) -> Bool { v == 0x200C || v == 0x200D }

    /// A scalar no rule of a name's text is about: printable ASCII and the Arabic letters and digits (U+0621 to U+064A,
    /// U+0660 to U+0669), so the common case looks no property up.
    @inline(__always) static func isPlain(_ v: UInt32) -> Bool {
        (v >= 0x21 && v <= 0x7E) || (v >= 0x0621 && v <= 0x064A) || (v >= 0x0660 && v <= 0x0669)
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
                add(table, k, "\(field) is empty, past \(Self.mostTextBytes) bytes, spaced at an end, starts with a mark or a joiner, "
                    + "ends with a joiner, or holds a control, an invisible or ignorable character, or a private-use, unassigned or "
                    + "noncharacter code point, or one past Unicode \(Self.unicodeVersion.major).\(Self.unicodeVersion.minor)")
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
