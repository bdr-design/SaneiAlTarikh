import SaneiCore

// The registries (§4.4, F4): every polity, actor, group and currency the content knows, each with a
// stable string ID that is never reused or removed (a removed ID needs an alias, `aliases.json`). The rows are in
// registry order, the order they were added; the engine's tables refer to them by index while the content and the
// save refer to them by ID. Every stored number below is registered in `tags.lock`. stdlib only.

/// A grammatical gender, for the agreement selectors of the Arabic templates (§5.9).
public enum Gender: UInt8, Sendable, CaseIterable {
    case masculine = 1
    case feminine = 2
}

/// A grammatical number.
public enum GrammaticalNumber: UInt8, Sendable, CaseIterable {
    case singular = 1
    case dual = 2
    case plural = 3
}

/// A name with the fields the Arabic templates need (§5.9): the full name, a short form, gender, number, whether it
/// takes the article, and the forms after ل and ب («لمصر», «للعراق»; «بمصر», «بالعراق»). The fields are per locale;
/// this is the Arabic one.
public struct NameRecord: Sendable, Equatable {
    public var name: String
    public var short: String
    public var gender: Gender
    public var number: GrammaticalNumber
    public var definite: Bool
    public var withLi: String
    public var withBi: String

    public init(name: String, short: String, gender: Gender, number: GrammaticalNumber, definite: Bool, withLi: String,
                withBi: String) {
        self.name = name
        self.short = short
        self.gender = gender
        self.number = number
        self.definite = definite
        self.withLi = withLi
        self.withBi = withBi
    }
}

/// What a polity is (§4.4).
public enum PolityKind: UInt8, Sendable, CaseIterable {
    case state = 1
    case deFacto = 2
    case candidate = 3
}

/// What an actor is when the scenario starts (its roles come with M3's actor table).
public enum ActorKind: UInt8, Sendable, CaseIterable {
    case party = 1
    case movement = 2
    case armed = 3
    case institution = 4
}

/// A group's dimension (§4.4): ethno-linguistic or religious.
public enum GroupDimension: UInt8, Sendable, CaseIterable {
    case ethnolinguistic = 1
    case religious = 2
}

/// A currency's kind (§5.2): one polity's own, or a union's.
public enum CurrencyKind: UInt8, Sendable, CaseIterable {
    case national = 1
    case union = 2
}

/// A polity: a state, a de facto state, or a candidate that exists only after an effect makes it.
public struct PolityRow: Sendable, Equatable {
    public var id: String
    public var kind: PolityKind
    public var name: NameRecord
    /// The map colour when no other rule colours it, 0xRRGGBB.
    public var colour: UInt32
    /// The currency its default government uses, an index into the currencies.
    public var currency: Int
    /// The first and the last day it exists, nil for no bound (South Sudan from 2011-07-09).
    public var from: GameDate?
    public var until: GameDate?
    /// Where its facts come from (`content/evidence/`, the data pipeline).
    public var evidence: String

    public init(id: String, kind: PolityKind, name: NameRecord, colour: UInt32, currency: Int, from: GameDate?,
                until: GameDate?, evidence: String) {
        self.id = id
        self.kind = kind
        self.name = name
        self.colour = colour
        self.currency = currency
        self.from = from
        self.until = until
        self.evidence = evidence
    }
}

/// A political actor (§4.4: `act.<polity>.<slug>`).
public struct ActorRow: Sendable, Equatable {
    public var id: String
    public var polity: Int
    public var kind: ActorKind
    public var name: NameRecord
    public var evidence: String

    public init(id: String, polity: Int, kind: ActorKind, name: NameRecord, evidence: String) {
        self.id = id
        self.polity = polity
        self.kind = kind
        self.name = name
        self.evidence = evidence
    }
}

/// An ethno-linguistic or religious group.
public struct GroupRow: Sendable, Equatable {
    public var id: String
    public var dimension: GroupDimension
    public var name: NameRecord
    public var evidence: String

    public init(id: String, dimension: GroupDimension, name: NameRecord, evidence: String) {
        self.id = id
        self.dimension = dimension
        self.name = name
        self.evidence = evidence
    }
}

/// A currency (§5.2).
public struct CurrencyRow: Sendable, Equatable {
    public var id: String
    /// The ISO 4217 code, three capital letters.
    public var iso: String
    public var kind: CurrencyKind
    public var name: NameRecord
    public var evidence: String

    public init(id: String, iso: String, kind: CurrencyKind, name: NameRecord, evidence: String) {
        self.id = id
        self.iso = iso
        self.kind = kind
        self.name = name
        self.evidence = evidence
    }
}

/// The caps of the registries: polities as L3 gives them (a registry of 320, the rest of the 384 for rows made during
/// play); the others T-042's (no budget names them yet: §3.6's tables size them in later tasks).
public enum RegistryCaps {
    public static let polities = 320
    public static let actors = 4_096
    public static let groups = 1_024
    public static let currencies = 320
}

/// The ID rules: lower-case ASCII letters, digits, `.`, `_` and `-`, starting with a letter, at most 64 bytes; never
/// the runtime prefix `dyn:` (the colon is not allowed), so a registry ID never collides with a runtime one (F4).
public enum ContentID {
    public static let mostBytes = 64

    public static func isWellFormed(_ id: String) -> Bool {
        let b = id.utf8
        guard let first = b.first, b.count <= mostBytes, first >= 0x61, first <= 0x7A else { return false }
        return b.allSatisfy { ($0 >= 0x61 && $0 <= 0x7A) || ($0 >= 0x30 && $0 <= 0x39) || $0 == 0x2E || $0 == 0x5F || $0 == 0x2D }
    }

    /// The ID of a polity's default government (§4.4: one per polity, `sdn.gov`); rival and exile governments come
    /// with each scenario's `governments.csv` (T-048).
    public static func defaultGovernment(of polity: String) -> String { polity + ".gov" }

    /// The ID of a polity, government or actor made during play (§4.4), from its serial.
    public static func runtime(_ serial: Serial) -> String { "dyn:" + String(serial.raw) }
}
