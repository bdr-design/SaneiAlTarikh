// How the simulation names its things (§2.3, §2.4). A row of a dense table (a province, a government) is named by its
// index, typed so that a province index cannot be used on governments. A thing that comes and goes (a formation, a
// war, a project) is named by a serial that is never reused: a stale reference finds nothing instead of finding
// whatever took the slot. stdlib only.

/// A serial number from a saved counter per kind of thing. Never reused; later things have higher serials, so serial
/// order is creation order and is the same after a save and a load.
@frozen
public struct Serial: Sendable, Hashable, Comparable {
    public var raw: UInt32
    @inlinable public init(raw: UInt32) { self.raw = raw }
    @inlinable public static func < (a: Serial, b: Serial) -> Bool { a.raw < b.raw }
}

/// The index of a row in the dense table of `Tag`s (the tag is only a name for the kind: it holds nothing).
@frozen
public struct Idx<Tag>: Sendable, Hashable, Comparable {
    public var raw: UInt16
    @inlinable public init(raw: UInt16) { self.raw = raw }

    /// An index into a table of `count` rows; nil when it is out of the table or the table is beyond 65,535 rows.
    @inlinable
    public init?(_ i: Int, in count: Int) {
        guard i >= 0, i < count, count <= Int(UInt16.max) else { return nil }
        raw = UInt16(truncatingIfNeeded: i)
    }

    /// «No row»: the last value, which no table reaches.
    @inlinable public static var none: Idx<Tag> { Idx(raw: .max) }
    @inlinable public var isNone: Bool { raw == .max }
    @inlinable public var int: Int { Int(raw) }
    @inlinable public static func < (a: Idx<Tag>, b: Idx<Tag>) -> Bool { a.raw < b.raw }
}

/// A reference to a thing in the handle table of `Tag`s: its serial, typed by kind.
@frozen
public struct Handle<Tag>: Sendable, Hashable, Comparable {
    public var serial: Serial
    @inlinable public init(_ serial: Serial) { self.serial = serial }
    @inlinable public static func < (a: Handle<Tag>, b: Handle<Tag>) -> Bool { a.serial < b.serial }
}
