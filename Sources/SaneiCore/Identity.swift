// How the simulation names its things (§2.3, §2.4). A row of a dense table (a province, a government) is named by its
// index, typed so that a province index cannot be used on governments. A thing that comes and goes (a formation, a
// war, a project) is named by a handle: a serial that is never given twice, typed by the kind of thing, so a stale
// reference finds nothing instead of finding whatever took the slot, and a formation's handle cannot be used on the
// table of wars. stdlib only.

/// A serial number from a saved counter per kind of thing (`SerialCounter`). Later things have higher serials, so
/// serial order is creation order and is the same after a save and a load. 0 is never given out: it is «no thing».
/// A `Serial` made from a raw number is only a number; it is the counter that never gives one twice.
@frozen
public struct Serial: Sendable, Hashable, Comparable {
    public var raw: UInt32
    @inlinable public init(raw: UInt32) { self.raw = raw }

    /// «No thing»: 0, which no counter gives out. A column of references holds it where there is nothing to name.
    @inlinable public static var absent: Serial { Serial(raw: 0) }
    @inlinable public var isAbsent: Bool { raw == 0 }

    @inlinable public static func == (a: Serial, b: Serial) -> Bool { a.raw == b.raw }
    @inlinable public static func < (a: Serial, b: Serial) -> Bool { a.raw < b.raw }
}

/// The counter serials come from: one per kind of thing, saved with the game (`SERL`). It starts at 1 and counts up.
/// When the serials run out (after four billion things of one kind) it refuses; it never wraps and never goes back,
/// so a serial is never given twice, even after its thing is gone. Handle tables hold one; a dense kind whose things
/// also need serials (a runtime government's `dyn:` ID) holds one beside its columns.
@frozen
public struct SerialCounter: Sendable, Hashable {
    @usableFromInline var _next: UInt32

    /// A new kind of thing: the first serial is 1.
    @inlinable public init() { _next = 1 }

    /// A counter as a save holds it. Nil for 0, which no counter reaches.
    @inlinable
    public init?(saved next: UInt32) {
        guard next >= 1 else { return nil }
        _next = next
    }

    /// The serial the next thing gets (what a save stores).
    @inlinable public var next: UInt32 { _next }

    /// Gives the next serial; nil, and nothing changes, when the serials have run out.
    @inlinable
    public mutating func take() -> Serial? {
        guard _next < UInt32.max else { return nil }
        let serial = Serial(raw: _next)
        _next += 1
        return serial
    }

    /// True for a serial this counter has given out; its thing may be gone since. A loader asks it of every stored
    /// reference: a serial the counter has not reached yet would one day name a thing that does not exist now.
    @inlinable public func hasGiven(_ serial: Serial) -> Bool { serial.raw >= 1 && serial.raw < _next }
}

/// The index of a row in the dense table of `Tag`s (the tag is only a name for the kind: it holds nothing, and need
/// not be `Sendable`).
@frozen
public struct Idx<Tag>: Sendable, Hashable, Comparable {
    public var raw: UInt16

    /// Any index, as a save or a column holds it. Not checked against a table: a loader uses `init(_:in:)`.
    @inlinable public init(raw: UInt16) { self.raw = raw }

    /// An index into a table of `count` rows; nil when it is out of the table or the table is beyond 65,535 rows.
    @inlinable
    public init?(_ i: Int, in count: Int) {
        guard i >= 0, i < count, count <= Int(UInt16.max) else { return nil }
        raw = UInt16(truncatingIfNeeded: i)
    }

    /// «No row»: 65,535, which no table reaches (a table has at most 65,535 rows, numbered from 0). It is named
    /// `absent` and not `none`, because `.none` where an optional index is expected would mean nil.
    @inlinable public static var absent: Idx<Tag> { Idx(raw: .max) }
    @inlinable public var isAbsent: Bool { raw == .max }

    /// The index as an array position. Not for `absent`: 65,535 is past the end of every table.
    @inlinable public var int: Int { Int(raw) }

    @inlinable public static func == (a: Idx<Tag>, b: Idx<Tag>) -> Bool { a.raw == b.raw }
    @inlinable public static func < (a: Idx<Tag>, b: Idx<Tag>) -> Bool { a.raw < b.raw }
}

/// A reference to a thing in the handle table of `Tag`s (the table's row type): its serial, typed by kind.
/// `HandleTable<Formation>` gives and takes `Handle<Formation>` only. A handle whose thing is gone is still a valid
/// value: the table answers nil for it.
@frozen
public struct Handle<Tag>: Sendable, Hashable, Comparable {
    public var serial: Serial

    /// A handle from a stored serial. Typing it is the caller's statement that the serial is of this kind.
    @inlinable public init(_ serial: Serial) { self.serial = serial }

    /// «No thing»: the serial 0. Every table answers nil for it.
    @inlinable public static var absent: Handle<Tag> { Handle(Serial.absent) }
    @inlinable public var isAbsent: Bool { serial.isAbsent }

    @inlinable public static func == (a: Handle<Tag>, b: Handle<Tag>) -> Bool { a.serial == b.serial }
    @inlinable public static func < (a: Handle<Tag>, b: Handle<Tag>) -> Bool { a.serial < b.serial }
}
