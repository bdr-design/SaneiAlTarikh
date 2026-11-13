import SaneiCore

// The registries (§4.4, F4): every polity, actor, group and currency the content knows, each with a stable string ID
// that is never reused or removed (a removed ID needs an alias, `aliases.json`). A registry holds what is true of a row
// in every scenario; what is a fact of one start (whether a polity exists, its governments and their currencies, an
// actor's roles) is the scenario's (T-048). The rows are in registry order, the order they were added; the engine's
// tables refer to them by position while the content and the save refer to them by ID. Every stored number below is
// registered in `tags.lock`. stdlib only.

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

/// A name and the fields the Arabic templates need (§5.9). `name` is the full (official) name, shown where a title is
/// wanted; every other field is of the short form, the one shown everywhere else (§3.10): its gender, its number,
/// whether it names people (a plural of people agrees in the plural, «تظاهر العرب»; any other plural as a feminine
/// singular, «أعلنت الولايات المتحدة»), whether it takes the article ال, its oblique form (after a noun or as an
/// object: «دعم المسيحيين»; the short form itself when it does not change), and its forms after ل and ب («للعراق»,
/// «لمصر»; «بالعراق», «بمصر»). The fields are per locale; this is the Arabic one.
public struct NameRecord: Sendable, Equatable {
    public var name: String
    public var short: String
    public var gender: Gender
    public var number: GrammaticalNumber
    public var human: Bool
    public var definite: Bool
    public var oblique: String
    public var withLi: String
    public var withBi: String

    public init(name: String, short: String, gender: Gender, number: GrammaticalNumber, human: Bool, definite: Bool,
                oblique: String, withLi: String, withBi: String) {
        self.name = name
        self.short = short
        self.gender = gender
        self.number = number
        self.human = human
        self.definite = definite
        self.oblique = oblique
        self.withLi = withLi
        self.withBi = withBi
    }
}

/// What a polity is when it exists (§4.4); whether it exists at a start is the scenario's (T-048).
public enum PolityStatus: UInt8, Sendable, CaseIterable {
    case state = 1
    case deFacto = 2
    case candidate = 3
}

/// What an actor is (§5.3): a party, a movement, a faction or an armed group. The roles it holds at a start (party,
/// armed, controller, government) are the scenario's, in the actor table every column group declares (T-047, T-048).
public enum ActorKind: UInt8, Sendable, CaseIterable {
    case party = 1
    case movement = 2
    case armed = 3
    case faction = 4
}

/// A group's dimension (§4.4): ethno-linguistic or religious.
public enum GroupDimension: UInt8, Sendable, CaseIterable {
    case ethnolinguistic = 1
    case religious = 2
}

/// A currency's reach (§5.1): one polity's own, or a union's.
public enum CurrencyReach: UInt8, Sendable, CaseIterable {
    case national = 1
    case union = 2
}

/// A polity: a state, a de facto state, or a candidate that exists only after an effect makes it.
public struct PolityRow: Sendable, Equatable {
    public var id: String
    public var status: PolityStatus
    public var name: NameRecord
    /// The map colour when no other rule colours it, 0xRRGGBB.
    public var colour: UInt32
    /// Where its facts come from (`content/evidence/`, the evidence gate: T-048).
    public var evidence: String

    public init(id: String, status: PolityStatus, name: NameRecord, colour: UInt32, evidence: String) {
        self.id = id
        self.status = status
        self.name = name
        self.colour = colour
        self.evidence = evidence
    }
}

/// A political actor (§4.4): its ID is `act.<polity>.<slug>`, the polity its own row's.
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

/// A currency (§5.1). Which government uses it, and from when, is the scenario's (T-048).
public struct CurrencyRow: Sendable, Equatable {
    public var id: String
    /// The ISO 4217 code, three capital letters.
    public var iso: String
    public var reach: CurrencyReach
    public var name: NameRecord
    public var evidence: String

    public init(id: String, iso: String, reach: CurrencyReach, name: NameRecord, evidence: String) {
        self.id = id
        self.iso = iso
        self.reach = reach
        self.name = name
        self.evidence = evidence
    }
}

/// The caps of the registries. Polities and actors as L3 gives them, less the room L3 keeps for rows made during play
/// (polities: a registry of 320 of the 384; actors: 1,984 of the 2,048, the same 64 kept for runtime actors). Groups and
/// currencies have no figure in the design: T-042's.
public enum RegistryCaps {
    public static let polities = 320
    public static let actors = 1_984
    public static let groups = 1_024
    public static let currencies = 320
}

/// The ID rules: lower-case ASCII letters, digits, `.`, `_` and `-`, starting with a letter, at most 64 bytes; never
/// the runtime prefix `dyn:` (the colon is not allowed), so a registry ID never collides with a runtime one (F4). A
/// polity's ID has no `.` and at most `mostPolityBytes` bytes, so its default government's ID (`<polity>.gov`) is
/// well formed and never a polity's; an actor's ID is `act.<polity>.<slug>`.
public enum ContentID {
    public static let mostBytes = 64
    public static let mostPolityBytes = 32

    public static func isWellFormed(_ id: String) -> Bool {
        let b = id.utf8
        guard let first = b.first, b.count <= mostBytes, first >= 0x61, first <= 0x7A else { return false }
        return b.allSatisfy { ($0 >= 0x61 && $0 <= 0x7A) || ($0 >= 0x30 && $0 <= 0x39) || $0 == 0x2E || $0 == 0x5F || $0 == 0x2D }
    }

    /// A polity's ID: well formed, no `.`, at most `mostPolityBytes` bytes.
    public static func isPolityID(_ id: String) -> Bool {
        isWellFormed(id) && id.utf8.count <= mostPolityBytes && !id.utf8.contains(0x2E)
    }

    /// True when `id` is `act.<polity>.<slug>` with a slug that is not empty.
    public static func isActorID(_ id: String, of polity: String) -> Bool {
        let prefix = "act." + polity + "."
        return isWellFormed(id) && id.utf8.starts(with: prefix.utf8) && id.utf8.count > prefix.utf8.count
    }

    /// True when `id` is a government's: `<polity>.<slug>` of the given polity, with a slug that is not empty and has no
    /// dot (`sdn.gov`, `civ.gbagbo`).
    public static func isGovernmentID(_ id: String, of polity: String) -> Bool {
        let prefix = polity + "."
        return isWellFormed(id) && id.utf8.starts(with: prefix.utf8) && id.utf8.count > prefix.utf8.count
            && !id.utf8.dropFirst(prefix.utf8.count).contains(0x2E)
    }

    /// The ID of a polity's default government (§4.4: one per polity, `sdn.gov`). A scenario may give the polity other
    /// governments (`civ.ouattara`, `civ.gbagbo`: rival and exile governments, and which holds the UN seat, D-29) and
    /// leave this one unused; no other government's slug is `gov` (T-048).
    public static func defaultGovernment(of polity: String) -> String { polity + ".gov" }

    /// The ID of a polity, government or actor made during play (§4.4), from its serial.
    public static func runtime(_ serial: Serial) -> String { "dyn:" + String(serial.raw) }
}
