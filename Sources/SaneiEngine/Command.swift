import SaneiCore

// What changes the world from outside a day's systems (§2.4): the player's orders, the AI's, and the lifecycle effects
// that only events, peace deals and negotiation reach. Every command is checked before it is applied, so a rejected one
// changes nothing; each case has a stable number, stored in saves and replays: never renumber one. Written through the
// column codec, never through synthesised Codable. stdlib only, through SaneiCore.

/// One command.
public enum Command: Sendable, Equatable {
    /// A government sets its tax rate (0 to 100%).
    case setTaxRate(government: GovRef, rate: BP)
    /// A lifecycle effect: a new government for a polity (events only).
    case createGovernment(polity: Idx<PolityKind>, treasury: LCU, taxBase: LCU, taxRate: BP)
    /// A lifecycle effect: a government ends (events, peace deals).
    case dissolveGovernment(government: GovRef)

    /// The stored number of each case. Never renumber one; a new case takes a new number.
    public var tag: UInt16 {
        switch self {
        case .setTaxRate: return 1
        case .createGovernment: return 100
        case .dissolveGovernment: return 101
        }
    }

    /// True when the command can be applied to `state` as it is.
    public func validate(_ state: WorldState) -> Bool {
        switch self {
        case let .setTaxRate(g, rate):
            return state.governments.isLive(g) && rate >= .zero && rate <= .one
        case let .createGovernment(p, _, taxBase, rate):
            guard state.polities.isLive(p), taxBase >= .zero, rate >= .zero, rate <= .one else { return false }
            let t = state.governments
            return t.rows < GovernmentTable.capacity || t.exists.contains(false)
        case let .dissolveGovernment(g):
            return state.governments.isLive(g)
        }
    }

    /// Applies the command when it is valid; false, and nothing changes, when it is not.
    @discardableResult
    public func apply(to state: inout WorldState, strategicPeriod: Int) -> Bool {
        guard validate(state) else { return false }
        switch self {
        case let .setTaxRate(g, rate):
            state.governments.taxRate[g.row.int] = rate
        case let .createGovernment(p, treasury, taxBase, rate):
            return state.governments.create(polity: p, on: state.world.date, treasury: treasury, taxBase: taxBase,
                                            taxRate: rate, strategicPeriod: strategicPeriod) != nil
        case let .dissolveGovernment(g):
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
        case let .createGovernment(p, treasury, taxBase, rate):
            w.varint(UInt64(p.raw))
            w.zigzag(treasury.raw)
            w.zigzag(taxBase.raw)
            w.zigzag(Int64(rate.raw))
        case let .dissolveGovernment(g):
            Command.write(g, to: &w)
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
            if let p = c.varint(), p < UInt64(UInt16.max), let t = c.zigzag(), let b = c.zigzag(), let rate = readBP(&c) {
                command = .createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: t), taxBase: LCU(raw: b), taxRate: rate)
            } else { command = nil }
        case 101:
            if let g = readGov(&c) { command = .dissolveGovernment(government: g) } else { command = nil }
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

    static func readGov(_ r: inout ByteReader) -> GovRef? {
        guard let row = r.varint(), row < UInt64(UInt16.max), let s = r.varint(), s <= UInt64(UInt32.max) else { return nil }
        return GovRef(row: Idx(raw: UInt16(row)), serial: Serial(raw: UInt32(s)))
    }

    static func readBP(_ r: inout ByteReader) -> BP? {
        guard let v = r.zigzag(), v >= Int64(Int32.min), v <= Int64(Int32.max) else { return nil }
        return BP(raw: Int32(v))
    }
}

/// A command with when and by whom it was given: the order a day applies commands in is (day, issuerRank, sequence)
/// (§2.4), so the result never depends on the order they arrived in.
@frozen
public struct IssuedCommand: Sendable, Equatable {
    /// The day it takes effect: applied at the start of that day (or the first day after, if it came late).
    public var day: GameDate
    /// Who gave it: 0 for the player; the AI and events after.
    public var issuerRank: UInt16
    /// A number the issuer gives, rising: it breaks ties within a day and a rank.
    public var sequence: UInt64
    public var command: Command

    public init(day: GameDate, issuerRank: UInt16, sequence: UInt64, command: Command) {
        self.day = day
        self.issuerRank = issuerRank
        self.sequence = sequence
        self.command = command
    }

    /// The order commands are applied in.
    public static func precedes(_ a: IssuedCommand, _ b: IssuedCommand) -> Bool {
        if a.day != b.day { return a.day < b.day }
        if a.issuerRank != b.issuerRank { return a.issuerRank < b.issuerRank }
        return a.sequence < b.sequence
    }
}
