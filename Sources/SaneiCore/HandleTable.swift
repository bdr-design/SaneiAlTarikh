// The table of things that come and go (§2.4: formations, armies, fronts, wars, fleets, operations, projects,
// treaties). Rows are kept in serial order, which is creation order. Walking the table, breaking a tie and choosing a
// random row therefore give the same result in a running game and in the same game saved and loaded (§7), whatever
// was added and removed on the way. A table has a hard cap (L3): at the cap an insert is refused, nothing grows.
// stdlib only.

/// Rows of `Row`, each with a serial, in serial order.
public struct HandleTable<Row> {
    /// The most rows the table may hold (L3).
    public let capacity: Int
    /// The serials of the rows, ascending.
    public private(set) var serials: [Serial]
    /// The rows, in the order of `serials`.
    public private(set) var rows: [Row]
    /// The serial the next row gets. Saved (`SERL`), so a serial is never used twice even after its row is gone.
    public private(set) var nextSerial: UInt32

    public init(capacity: Int) {
        self.capacity = Swift.max(0, capacity)
        serials = []
        rows = []
        nextSerial = 1
        serials.reserveCapacity(self.capacity)
        rows.reserveCapacity(self.capacity)
    }

    /// A table as a save holds it: the rows with their serials in any order, and the counter. Nil when the save is
    /// not consistent: more rows than the cap, a serial twice, a serial of 0, or one at or past the counter.
    public init?(capacity: Int, saved: [(serial: Serial, row: Row)], nextSerial: UInt32) {
        guard capacity >= 0, saved.count <= capacity, nextSerial >= 1 else { return nil }
        let ordered = saved.sorted { $0.serial < $1.serial }
        var last: UInt32 = 0
        for entry in ordered {
            guard entry.serial.raw > last, entry.serial.raw < nextSerial else { return nil }
            last = entry.serial.raw
        }
        self.capacity = capacity
        serials = ordered.map { $0.serial }
        rows = ordered.map { $0.row }
        self.nextSerial = nextSerial
        serials.reserveCapacity(capacity)
        rows.reserveCapacity(capacity)
    }

    public var count: Int { rows.count }
    public var isEmpty: Bool { rows.isEmpty }
    public var isFull: Bool { rows.count >= capacity }

    /// Adds a row and returns its serial; nil, and nothing changes, when the table is full or the serials have run
    /// out (after four billion rows of this kind).
    public mutating func insert(_ row: Row) -> Serial? {
        guard rows.count < capacity, nextSerial < UInt32.max else { return nil }
        let serial = Serial(raw: nextSerial)
        nextSerial += 1
        serials.append(serial)
        rows.append(row)
        return serial
    }

    /// The position of a serial's row; nil when it is not in the table (never made, or removed).
    public func index(of serial: Serial) -> Int? {
        var lo = 0
        var hi = serials.count
        while lo < hi {
            let mid = (lo + hi) / 2
            if serials[mid] < serial { lo = mid + 1 } else { hi = mid }
        }
        return lo < serials.count && serials[lo] == serial ? lo : nil
    }

    public func contains(_ serial: Serial) -> Bool { index(of: serial) != nil }

    /// The row of a serial; nil when it is not in the table.
    public subscript(serial: Serial) -> Row? {
        guard let i = index(of: serial) else { return nil }
        return rows[i]
    }

    /// Changes a serial's row in place; false, and nothing runs, when it is not in the table.
    @discardableResult
    public mutating func update(_ serial: Serial, _ change: (inout Row) -> Void) -> Bool {
        guard let i = index(of: serial) else { return false }
        change(&rows[i])
        return true
    }

    /// Changes the row at a position (while walking the table in order).
    public mutating func update(at position: Int, _ change: (inout Row) -> Void) {
        change(&rows[position])
    }

    /// Removes a serial's row and returns it; nil when it is not in the table. The rows after it keep their order.
    @discardableResult
    public mutating func remove(_ serial: Serial) -> Row? {
        guard let i = index(of: serial) else { return nil }
        serials.remove(at: i)
        return rows.remove(at: i)
    }
}

extension HandleTable: Sendable where Row: Sendable {}
