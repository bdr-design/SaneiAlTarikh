import SaneiCore

// What changes the world from outside a day's systems (§2.4): the player's orders, the AI's, and the lifecycle effects
// that only events, peace deals and negotiation reach. Every command is checked against the state and against who gave
// it before it is applied, so a rejected one changes nothing; each case has a stable number, stored in saves and
// replays: never renumber one. Written through the column codec, never through synthesised Codable. stdlib only,
// through SaneiCore.

/// Who gave a command. The order of a day's commands is (day, rank, the issuer's serial, sequence): the player first,
/// then events (and the scenario's set-up), then the governments' AI, each AI by its government's serial.
public enum Issuer: Sendable, Hashable {
    /// The player, for the government they lead.
    case player(GovRef)
    /// An event, a peace deal or a negotiation, and the scenario's set-up: the only issuer of lifecycle effects.
    case event
    /// A government's AI, for that government.
    case ai(GovRef)

    public var rank: UInt16 {
        switch self {
        case .player: return 0
        case .event: return 1
        case .ai: return 2
        }
    }

    /// The serial of the government the issuer acts for (0 for events): with the rank, it keeps two issuers' commands
    /// with one sequence number in a fixed order.
    public var serial: UInt32 {
        switch self {
        case let .player(g), let .ai(g): return g.serial.raw
        case .event: return 0
        }
    }

    /// The government the issuer acts for (nil for events).
    public var government: GovRef? {
        switch self {
        case let .player(g), let .ai(g): return g
        case .event: return nil
        }
    }
}

/// One command.
public enum Command: Sendable, Equatable {
    /// A government sets its tax rate (0 to 100%). Given by that government (its player or its AI), or by an event.
    case setTaxRate(government: GovRef, rate: BP)
    /// A lifecycle effect, from events only: a new government for a polity. A successor (Côte d'Ivoire's next
    /// government, a revolution's) names the government it follows and takes over its yearly calendar, so a year's
    /// yearly run is not made twice.
    case createGovernment(polity: Idx<PolityKind>, treasury: LCU, taxBase: LCU, taxRate: BP, successorOf: GovRef? = nil)
    /// A lifecycle effect, from events only: a government ends. Its provinces go to `provincesTo`, or to nobody until
    /// an event gives them; its row is then free for a new government, which inherits nothing.
    case dissolveGovernment(government: GovRef, provincesTo: GovRef? = nil)

    /// The stored number of each case. Never renumber one; a new case takes a new number.
    public var tag: UInt16 {
        switch self {
        case .setTaxRate: return 1
        case .createGovernment: return 100
        case .dissolveGovernment: return 101
        }
    }

    /// True when the command can be applied to `state` as it is, given by `issuer`.
    public func validate(_ state: WorldState, by issuer: Issuer) -> Bool {
        if let acting = issuer.government, !state.governments.isLive(acting) { return false }
        switch self {
        case let .setTaxRate(g, rate):
            guard issuer == .event || issuer.government == g else { return false }
            return state.governments.isLive(g) && rate >= .zero && rate <= .one
        case let .createGovernment(p, _, taxBase, rate, _):
            guard issuer == .event, state.polities.isLive(p), taxBase >= .zero, rate >= .zero, rate <= .one else { return false }
            let t = state.governments
            return t.rows < GovernmentTable.capacity || t.exists.contains(false)
        case let .dissolveGovernment(g, to):
            guard issuer == .event, state.governments.isLive(g) else { return false }
            if let to { return to != g && state.governments.isLive(to) }
            return true
        }
    }

    /// Applies the command when it is valid; false, and nothing changes, when it is not.
    @discardableResult
    public func apply(to state: inout WorldState, by issuer: Issuer, strategicPeriod: Int) -> Bool {
        guard validate(state, by: issuer) else { return false }
        switch self {
        case let .setTaxRate(g, rate):
            state.governments.taxRate[g.row.int] = rate
        case let .createGovernment(p, treasury, taxBase, rate, predecessor):
            // read the predecessor's calendar before the new government may take its row
            var year: Int32?
            if let f = predecessor, f.row.int < state.governments.rows, state.governments.serial[f.row.int] == f.serial {
                year = state.governments.lastYearlyRun[f.row.int]
            }
            guard let g = state.createGovernment(polity: p, treasury: treasury, taxBase: taxBase, taxRate: rate,
                                                 strategicPeriod: strategicPeriod) else { return false }
            if let year { state.governments.lastYearlyRun[g.row.int] = year }
        case let .dissolveGovernment(g, to):
            let heir: Idx<GovernmentKind> = to?.row ?? .absent
            for i in 0..<state.provinces.count where state.provinces.administrator[i] == g.row {
                state.provinces.administrator[i] = heir
            }
            state.governments.dissolve(g)
        }
        return true
    }

    // MARK: the codec

    /// Writes the command: its tag (two bytes, low first), then its fields.
    public func write(to w: inout ByteWriter) {
        w.fixed(tag, as: UInt16.self)
        switch self {
        case let .setTaxRate(g, rate):
            Command.write(g, to: &w)
            w.zigzag(Int64(rate.raw))
        case let .createGovernment(p, treasury, taxBase, rate, predecessor):
            w.varint(UInt64(p.raw))
            w.zigzag(treasury.raw)
            w.zigzag(taxBase.raw)
            w.zigzag(Int64(rate.raw))
            Command.write(predecessor, to: &w)
        case let .dissolveGovernment(g, to):
            Command.write(g, to: &w)
            Command.write(to, to: &w)
        }
    }

    /// Reads one command; nil, with the reader where it was, for an unknown tag or bytes that do not make one.
    public static func read(from r: inout ByteReader) -> Command? {
        var c = r
        guard let tag = c.fixed(UInt16.self) else { return nil }
        let command: Command?
        switch tag {
        case 1:
            if let g = readGov(&c), let rate = readBP(&c) { command = .setTaxRate(government: g, rate: rate) } else { command = nil }
        case 100:
            if let p = c.varint(), p < UInt64(UInt16.max), let t = c.zigzag(), let b = c.zigzag(), let rate = readBP(&c),
               let predecessor = readOptionalGov(&c) {
                command = .createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: t), taxBase: LCU(raw: b), taxRate: rate,
                                            successorOf: predecessor)
            } else { command = nil }
        case 101:
            if let g = readGov(&c), let to = readOptionalGov(&c) { command = .dissolveGovernment(government: g, provincesTo: to) } else { command = nil }
        default:
            command = nil
        }
        if command != nil { r = c }
        return command
    }

    static func write(_ g: GovRef, to w: inout ByteWriter) {
        w.varint(UInt64(g.row.raw))
        w.varint(UInt64(g.serial.raw))
    }

    /// An optional government: the serial 0 (which no government has) stands for none.
    static func write(_ g: GovRef?, to w: inout ByteWriter) {
        if let g { write(g, to: &w) } else { w.varint(0); w.varint(0) }
    }

    static func readGov(_ r: inout ByteReader) -> GovRef? {
        guard let row = r.varint(), row < UInt64(UInt16.max), let s = r.varint(), s >= 1, s <= UInt64(UInt32.max) else { return nil }
        return GovRef(row: Idx(raw: UInt16(row)), serial: Serial(raw: UInt32(s)))
    }

    /// nil when the bytes are bad; .some(nil) for «none».
    static func readOptionalGov(_ r: inout ByteReader) -> GovRef?? {
        var c = r
        guard let row = c.varint(), let s = c.varint() else { return nil }
        if row == 0 && s == 0 { r = c; return .some(nil) }
        guard row < UInt64(UInt16.max), s >= 1, s <= UInt64(UInt32.max) else { return nil }
        r = c
        return .some(GovRef(row: Idx(raw: UInt16(row)), serial: Serial(raw: UInt32(s))))
    }

    static func readBP(_ r: inout ByteReader) -> BP? {
        guard let v = r.zigzag(), v >= Int64(Int32.min), v <= Int64(Int32.max) else { return nil }
        return BP(raw: Int32(v))
    }
}

/// A command with when and by whom it was given. A day applies its commands in (day, rank, the issuer's serial,
/// sequence) order (§2.4), so the result never depends on the order they arrived in; each issuer numbers its own
/// commands, rising, and a second command with a key already waiting is refused, so no two share one.
@frozen
public struct IssuedCommand: Sendable, Equatable {
    /// The day it takes effect: applied at the start of that day. A command for a day already run is refused when it
    /// is submitted: the AI's results land at a fixed day (§2.4), so a slow phone never plays a different game.
    public var day: GameDate
    public var issuer: Issuer
    /// The issuer's own number, rising: it orders an issuer's commands within a day.
    public var sequence: UInt64
    public var command: Command

    public init(day: GameDate, issuer: Issuer, sequence: UInt64, command: Command) {
        self.day = day
        self.issuer = issuer
        self.sequence = sequence
        self.command = command
    }

    /// The order commands are applied in.
    public static func precedes(_ a: IssuedCommand, _ b: IssuedCommand) -> Bool {
        if a.day != b.day { return a.day < b.day }
        if a.issuer.rank != b.issuer.rank { return a.issuer.rank < b.issuer.rank }
        if a.issuer.serial != b.issuer.serial { return a.issuer.serial < b.issuer.serial }
        return a.sequence < b.sequence
    }

    /// True when the two have one key: neither precedes the other.
    public static func sameKey(_ a: IssuedCommand, _ b: IssuedCommand) -> Bool { !precedes(a, b) && !precedes(b, a) }

    /// Writes the issued command: its day, its issuer (rank, then the government), its sequence, then the command.
    public func write(to w: inout ByteWriter) {
        w.zigzag(Int64(day.days))
        w.u8(UInt8(issuer.rank))
        if let g = issuer.government { Command.write(g, to: &w) }
        w.varint(sequence)
        command.write(to: &w)
    }

    /// Reads one issued command; nil, with the reader where it was, for bytes that do not make one.
    public static func read(from r: inout ByteReader) -> IssuedCommand? {
        var c = r
        guard let d = c.zigzag(), d >= Int64(Int32.min), d <= Int64(Int32.max), let rank = c.u8() else { return nil }
        let issuer: Issuer
        switch rank {
        case 0:
            guard let g = Command.readGov(&c) else { return nil }
            issuer = .player(g)
        case 1:
            issuer = .event
        case 2:
            guard let g = Command.readGov(&c) else { return nil }
            issuer = .ai(g)
        default:
            return nil
        }
        guard let sequence = c.varint(), let command = Command.read(from: &c) else { return nil }
        r = c
        return IssuedCommand(day: GameDate(days: Int32(d)), issuer: issuer, sequence: sequence, command: command)
    }
}
