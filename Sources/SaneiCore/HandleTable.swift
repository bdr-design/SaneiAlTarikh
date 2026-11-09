// The table of things that come and go (§2.4: formations, armies, fronts, wars, fleets, operations, projects,
// treaties). Rows are kept in serial order, which is creation order. Walking the table, breaking a tie and choosing a
// random row therefore give the same result in a running game and in the same game saved and loaded (§7), whatever
// was added and removed on the way. A table has a hard cap (L3): at the cap an insert is refused. The room for the
// cap is reserved once and kept, so a table never grows and an insert never allocates. stdlib only.
//
// How to use one without paying for it:
// - Walk by position (`for i in 0..<table.count`, or `updateEach`), never over `table.rows` while changing the table:
//   that walk holds the rows, so the first change would copy them all.
// - A change's closure must not touch the same table. Read what the change needs first (`let other = table[b]`), then
//   update; for row-to-row work over a walk, gather the changes and apply them after.
// - Remove many rows with `removeAll(where:)`, once a tick: `remove` moves every row after the one it takes.
// - A position is only good until the next insert or removal. A handle is good for ever.

/// Rows of `Row`, each with a serial, in serial order.
@frozen
public struct HandleTable<Row> {
    /// The most rows the table may hold (L3). It can only rise between versions: a save above the cap is refused.
    public let capacity: Int
    @usableFromInline var _serials: [Serial]
    @usableFromInline var _rows: [Row]
    @usableFromInline var _counter: SerialCounter

    /// An empty table. A negative cap is taken as 0: such a table refuses every insert.
    @inlinable
    public init(capacity: Int) {
        self.capacity = Swift.max(0, capacity)
        _serials = []
        _rows = []
        _counter = SerialCounter()
        _serials.reserveCapacity(self.capacity)
        _rows.reserveCapacity(self.capacity)
    }

    /// A table as a save holds it: the serials, the rows in the same order, and the counter. A save written by this
    /// game has them in rising serial order and they are taken as they are; any other order is put right, so the
    /// table is the same whatever order it was saved in. Nil when the save is not consistent: the two columns differ
    /// in length, more rows than the cap, a negative cap, a serial twice, a serial of 0, one at or past the counter,
    /// or a counter of 0.
    ///
    /// To load without a second copy of the rows, pass arrays that nothing else holds, already reserved to the cap.
    @inlinable
    public init?(capacity: Int, serials: [Serial], rows: [Row], nextSerial: UInt32) {
        guard capacity >= 0, serials.count == rows.count, rows.count <= capacity,
              let counter = SerialCounter(saved: nextSerial) else { return nil }
        var rising = true
        var last: UInt32 = 0
        for serial in serials {
            if serial.raw <= last {
                rising = false
                break
            }
            last = serial.raw
        }
        self.capacity = capacity
        _counter = counter
        if rising {
            guard last < nextSerial else { return nil }
            _serials = serials
            _rows = rows
        } else {
            // out of order, or not valid: sort the positions by serial and check each one again
            let order = serials.indices.sorted { serials[$0] < serials[$1] }
            var sortedSerials: [Serial] = []
            var sortedRows: [Row] = []
            sortedSerials.reserveCapacity(capacity)
            sortedRows.reserveCapacity(capacity)
            var previous: UInt32 = 0
            for i in order {
                let serial = serials[i]
                guard serial.raw > previous, serial.raw < nextSerial else { return nil }
                previous = serial.raw
                sortedSerials.append(serial)
                sortedRows.append(rows[i])
            }
            _serials = sortedSerials
            _rows = sortedRows
        }
        _serials.reserveCapacity(capacity)
        _rows.reserveCapacity(capacity)
    }

    /// The serials of the rows, rising.
    @inlinable public var serials: [Serial] { _serials }
    /// The rows, in the order of `serials`. Reading a row here copies nothing.
    @inlinable public var rows: [Row] { _rows }
    /// The counter the serials come from. Saved (`SERL`), so a serial is never given twice even after its row is gone.
    @inlinable public var counter: SerialCounter { _counter }
    /// The serial the next row gets.
    @inlinable public var nextSerial: UInt32 { _counter.next }

    @inlinable public var count: Int { _rows.count }
    @inlinable public var isEmpty: Bool { _rows.isEmpty }
    @inlinable public var isFull: Bool { _rows.count >= capacity }

    /// The handle of the row at a position (0..<count).
    @inlinable public func handle(at position: Int) -> Handle<Row> { Handle(_serials[position]) }

    /// Keeps the room up to the cap before a change. Free while the table alone holds its arrays. When something else
    /// shares them (a snapshot for a save), the copy this change must make is made with the cap's room, so a later
    /// insert still never allocates.
    @inlinable
    mutating func keepRoom() {
        _serials.reserveCapacity(capacity)
        _rows.reserveCapacity(capacity)
    }

    /// Adds a row and returns its handle; nil, and nothing changes, when the table is full or the serials have run
    /// out (after four billion rows of this kind).
    @inlinable
    public mutating func insert(_ row: Row) -> Handle<Row>? {
        guard _rows.count < capacity, let serial = _counter.take() else { return nil }
        keepRoom()
        _serials.append(serial)
        _rows.append(row)
        return Handle(serial)
    }

    /// The position of a serial's row; nil when it is not in the table. A binary search: at most 14 steps at 8,192
    /// rows.
    @inlinable
    func position(of serial: Serial) -> Int? {
        var lo = 0
        var hi = _serials.count
        while lo < hi {
            let mid = (lo + hi) / 2
            if _serials[mid] < serial { lo = mid + 1 } else { hi = mid }
        }
        return lo < _serials.count && _serials[lo] == serial ? lo : nil
    }

    /// The position of a handle's row; nil when it is not in the table (never made, or removed).
    @inlinable public func index(of handle: Handle<Row>) -> Int? { position(of: handle.serial) }

    @inlinable public func contains(_ handle: Handle<Row>) -> Bool { position(of: handle.serial) != nil }

    /// The row of a handle; nil when it is not in the table.
    @inlinable
    public subscript(handle: Handle<Row>) -> Row? {
        guard let i = position(of: handle.serial) else { return nil }
        return _rows[i]
    }

    /// Changes a handle's row in place; false, and nothing runs, when it is not in the table. `change` must not touch
    /// this table (see the top of the file).
    @discardableResult
    @inlinable
    public mutating func update(_ handle: Handle<Row>, _ change: (inout Row) -> Void) -> Bool {
        guard let i = position(of: handle.serial) else { return false }
        _rows.reserveCapacity(capacity)
        change(&_rows[i])
        return true
    }

    /// Changes the row at a position: the form for a walk, `for i in 0..<table.count`. A position outside 0..<count
    /// is a programmer's error and stops the program, as an array's index does. `change` must not touch this table.
    @inlinable
    public mutating func update(at position: Int, _ change: (inout Row) -> Void) {
        _rows.reserveCapacity(capacity)
        change(&_rows[position])
    }

    /// Walks every row in serial order and lets `change` alter it, in place. `change` must not touch this table.
    @inlinable
    public mutating func updateEach(_ change: (Handle<Row>, inout Row) -> Void) {
        _rows.reserveCapacity(capacity)
        for i in 0..<_rows.count { change(Handle(_serials[i]), &_rows[i]) }
    }

    /// Removes a handle's row and returns it; nil when it is not in the table. The rows after it keep their order, and
    /// every one of them moves: to remove more than a few in a day, use `removeAll(where:)`.
    @discardableResult
    @inlinable
    public mutating func remove(_ handle: Handle<Row>) -> Row? {
        guard let i = position(of: handle.serial) else { return nil }
        keepRoom()
        _serials.remove(at: i)
        return _rows.remove(at: i)
    }

    /// Removes every row the test picks, in one pass, and returns how many went. The rows that stay keep their order.
    /// `isGone` is asked once per row, in serial order, and must not touch this table.
    @discardableResult
    @inlinable
    public mutating func removeAll(where isGone: (Handle<Row>, Row) -> Bool) -> Int {
        let total = _rows.count
        var read = 0
        while read < total && !isGone(Handle(_serials[read]), _rows[read]) { read += 1 }
        if read == total { return 0 }                               // nothing goes: nothing is touched
        keepRoom()
        var kept = read
        read += 1
        while read < total {
            if !isGone(Handle(_serials[read]), _rows[read]) {
                _serials[kept] = _serials[read]
                _rows.swapAt(kept, read)
                kept += 1
            }
            read += 1
        }
        _serials.removeLast(total - kept)
        _rows.removeLast(total - kept)
        return total - kept
    }
}

extension HandleTable: Sendable where Row: Sendable {}
