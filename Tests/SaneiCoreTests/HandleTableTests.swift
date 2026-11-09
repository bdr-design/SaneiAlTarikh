import XCTest
@testable import SaneiCore

private enum Province {}
private enum Formation {}
/// A tag that is not `Sendable`: a name's tag holds nothing, so the name is `Sendable` all the same.
private final class NotSendable { var x = 0 }

final class HandleTableTests: XCTestCase {
    private func needsSendable<T: Sendable>(_: T.Type) {}

    func testIndicesAndHandlesAreTypedNames() {
        XCTAssertEqual(Idx<Province>(0, in: 10)?.raw, 0, "the first row")
        XCTAssertEqual(Idx<Province>(5, in: 10)?.int, 5)
        XCTAssertNil(Idx<Province>(10, in: 10))
        XCTAssertNil(Idx<Province>(-1, in: 10))
        XCTAssertNil(Idx<Province>(0, in: 0))
        XCTAssertNil(Idx<Province>(0, in: 65_536), "a table that large has no room for «no row»")
        XCTAssertEqual(Idx<Province>(65_534, in: 65_535)?.raw, 65_534)
        XCTAssertTrue(Idx<Province>.absent.isAbsent)
        XCTAssertEqual(Idx<Province>.absent.raw, 65_535)
        XCTAssertFalse(Idx<Province>(raw: 0).isAbsent)
        XCTAssertTrue(Idx<Province>(raw: 1) < Idx<Province>(raw: 2))
        XCTAssertFalse(Idx<Province>(raw: 2) < Idx<Province>(raw: 2))
        XCTAssertTrue(Handle<Formation>(Serial(raw: 1)) < Handle<Formation>(Serial(raw: 2)))
        XCTAssertFalse(Handle<Formation>(Serial(raw: 2)) < Handle<Formation>(Serial(raw: 2)))
        XCTAssertEqual(Handle<Formation>(Serial(raw: 7)).serial.raw, 7)
        XCTAssertTrue(Handle<Formation>.absent.isAbsent)
        XCTAssertEqual(Handle<Formation>.absent.serial, Serial.absent)
        XCTAssertEqual(Serial.absent.raw, 0)
        XCTAssertFalse(Serial(raw: 1).isAbsent)
        XCTAssertFalse(Serial(raw: 3) < Serial(raw: 3))
        // a name is as small as its number, and a tag adds nothing
        XCTAssertEqual(MemoryLayout<Idx<Province>>.size, 2)
        XCTAssertEqual(MemoryLayout<Handle<Formation>>.size, 4)
        needsSendable(Idx<NotSendable>.self)
        needsSendable(Handle<NotSendable>.self)
    }

    func testTheCounterNeverGivesASerialTwice() {
        var counter = SerialCounter()
        XCTAssertEqual(counter.next, 1)
        XCTAssertFalse(counter.hasGiven(Serial(raw: 1)))
        XCTAssertEqual(counter.take()?.raw, 1)
        XCTAssertEqual(counter.take()?.raw, 2)
        XCTAssertEqual(counter.next, 3)
        XCTAssertTrue(counter.hasGiven(Serial(raw: 1)))
        XCTAssertTrue(counter.hasGiven(Serial(raw: 2)))
        XCTAssertFalse(counter.hasGiven(Serial(raw: 3)), "not given yet")
        XCTAssertFalse(counter.hasGiven(.absent), "0 is never given")
        XCTAssertNil(SerialCounter(saved: 0))
        XCTAssertEqual(SerialCounter(saved: 3), counter)
        // the serials run out: refused, never wrapped
        var late = SerialCounter(saved: .max - 1)
        XCTAssertEqual(late?.take()?.raw, .max - 1)
        XCTAssertNil(late?.take())
        XCTAssertNil(late?.take())
        XCTAssertEqual(late?.next, .max)
    }

    func testRowsStayInCreationOrder() throws {
        var t = HandleTable<String>(capacity: 4)
        XCTAssertTrue(t.isEmpty)
        let a = try XCTUnwrap(t.insert("a"))
        let b = try XCTUnwrap(t.insert("b"))
        let c = try XCTUnwrap(t.insert("c"))
        XCTAssertEqual([a.serial.raw, b.serial.raw, c.serial.raw], [1, 2, 3])
        XCTAssertEqual(t.rows, ["a", "b", "c"])
        XCTAssertEqual(t[b], "b")
        XCTAssertTrue(t.contains(a))
        XCTAssertTrue(t.contains(b))
        XCTAssertEqual(t.index(of: c), 2)
        XCTAssertEqual(t.handle(at: 2), c)
        XCTAssertEqual(t.remove(b), "b")
        XCTAssertNil(t[b], "a removed thing is not found again")
        XCTAssertNil(t.remove(b))
        XCTAssertFalse(t.contains(b))
        XCTAssertNil(t.index(of: b))
        let d = try XCTUnwrap(t.insert("d"))
        XCTAssertEqual(d.serial.raw, 4, "a serial is never used twice")
        XCTAssertEqual(t.rows, ["a", "c", "d"])
        XCTAssertEqual(t.serials, [a.serial, c.serial, d.serial])
        XCTAssertTrue(t.update(c) { $0 += "!" })
        XCTAssertFalse(t.update(b) { $0 += "?" })
        t.update(at: 0) { $0 = "A" }
        XCTAssertEqual(t.rows, ["A", "c!", "d"])
        var seen: [UInt32] = []
        t.updateEach { handle, row in
            seen.append(handle.serial.raw)
            row += "."
        }
        XCTAssertEqual(seen, [1, 3, 4], "a walk is in serial order")
        XCTAssertEqual(t.rows, ["A.", "c!.", "d."])
        XCTAssertNil(t[.absent])
        XCTAssertFalse(t.contains(.absent))
        XCTAssertNil(t[Handle(Serial(raw: 99))])
        XCTAssertEqual(t.counter.next, 5)
    }

    func testTheCapRefusesAndNothingChanges() throws {
        var t = HandleTable<Int>(capacity: 2)
        _ = try XCTUnwrap(t.insert(10))
        let second = try XCTUnwrap(t.insert(20))
        XCTAssertTrue(t.isFull)
        XCTAssertNil(t.insert(30))
        XCTAssertEqual(t.count, 2)
        XCTAssertEqual(t.nextSerial, 3, "a refused insert takes no serial")
        t.remove(second)
        XCTAssertEqual(t.insert(40)?.serial.raw, 3)
        var none = HandleTable<Int>(capacity: 0)
        XCTAssertNil(none.insert(1))
        XCTAssertEqual(none.nextSerial, 1)
        var negative = HandleTable<Int>(capacity: -5)
        XCTAssertEqual(negative.capacity, 0)
        XCTAssertNil(negative.insert(1))
    }

    func testASaveGivesTheSameTableBack() throws {
        var g = DetRNG(seed: 3, key: 0, stream: 0, serial: 0)
        var t = HandleTable<Int>(capacity: 200)
        var live: [Handle<Int>] = []
        var given: [UInt32] = []
        // a busy life: things made and removed in a mixed order
        for step in 0..<2_000 {
            if live.isEmpty || (g.below(3) > 0 && !t.isFull) {
                if let h = t.insert(step) {
                    live.append(h)
                    given.append(h.serial.raw)
                }
            } else {
                let i = Int(g.below(UInt64(live.count)))
                XCTAssertNotNil(t.remove(live.remove(at: i)))
            }
        }
        XCTAssertEqual(given, Array(1...UInt32(given.count)), "every serial is the one after the last, whatever was removed")
        XCTAssertEqual(t.serials, t.serials.sorted(), "always in serial order")
        XCTAssertEqual(t.count, live.count)
        for h in live { XCTAssertNotNil(t.index(of: h)) }
        // some rows are gone when the save is taken, the newest among them: the counter is ahead of every row
        let newest = try XCTUnwrap(live.popLast())
        XCTAssertNotNil(t.remove(newest))
        XCTAssertGreaterThan(t.nextSerial, try XCTUnwrap(t.serials.last).raw + 1)
        // saved as the game writes it, and loaded: the same table
        let loaded = try XCTUnwrap(HandleTable(capacity: 200, serials: t.serials, rows: t.rows, nextSerial: t.nextSerial))
        XCTAssertEqual(loaded.serials, t.serials)
        XCTAssertEqual(loaded.rows, t.rows)
        XCTAssertEqual(loaded.counter, t.counter)
        // saved in any other order, and loaded: still the same table
        var order = Array(0..<t.count)
        for i in stride(from: order.count - 1, to: 0, by: -1) { order.swapAt(i, Int(g.below(UInt64(i + 1)))) }
        XCTAssertNotEqual(order, Array(0..<t.count))
        let mixed = try XCTUnwrap(HandleTable(capacity: 200, serials: order.map { t.serials[$0] }, rows: order.map { t.rows[$0] },
                                              nextSerial: t.nextSerial))
        XCTAssertEqual(mixed.serials, t.serials)
        XCTAssertEqual(mixed.rows, t.rows)
        XCTAssertEqual(mixed.nextSerial, t.nextSerial)
        // the loaded game goes on as the running one would
        var continued = mixed
        var running = t
        while !running.isFull {
            XCTAssertEqual(continued.insert(-1), running.insert(-1))
        }
        XCTAssertTrue(continued.isFull)
        XCTAssertNil(continued.insert(-2))
        XCTAssertNil(running.insert(-2))
        let oldest = running.handle(at: 0)
        XCTAssertEqual(continued.remove(oldest), running.remove(oldest))
        XCTAssertEqual(continued.insert(-3), running.insert(-3))
        XCTAssertEqual(continued.serials, running.serials)
        XCTAssertEqual(continued.rows, running.rows)
        XCTAssertEqual(continued.nextSerial, running.nextSerial)
    }

    /// The counter is saved, not worked out from the rows: after the newest thing is gone, the next one still gets a
    /// new serial.
    func testTheCounterIsSavedNotRebuilt() throws {
        var t = HandleTable<Int>(capacity: 8)
        _ = t.insert(1)
        _ = t.insert(2)
        let third = try XCTUnwrap(t.insert(3))
        t.remove(third)
        var loaded = try XCTUnwrap(HandleTable(capacity: 8, serials: t.serials, rows: t.rows, nextSerial: t.nextSerial))
        XCTAssertEqual(loaded.insert(4)?.serial.raw, 4, "3 was given once and is never given again")
        XCTAssertNil(loaded[third])
    }

    func testAnInconsistentSaveIsRefused() {
        let one = Serial(raw: 1)
        let two = Serial(raw: 2)
        XCTAssertNotNil(HandleTable(capacity: 2, serials: [one, two], rows: [1, 2], nextSerial: 3))
        XCTAssertEqual(HandleTable(capacity: 2, serials: [two, one], rows: [2, 1], nextSerial: 3)?.rows, [1, 2])
        XCTAssertNotNil(HandleTable<Int>(capacity: 0, serials: [], rows: [], nextSerial: 1))
        XCTAssertNil(HandleTable(capacity: 1, serials: [one, two], rows: [1, 2], nextSerial: 3), "more rows than the cap")
        XCTAssertNil(HandleTable(capacity: 2, serials: [one, one], rows: [1, 1], nextSerial: 3), "a serial twice")
        XCTAssertNil(HandleTable(capacity: 2, serials: [one, two], rows: [1, 2], nextSerial: 2), "a serial at the counter")
        XCTAssertNil(HandleTable(capacity: 2, serials: [two, one], rows: [2, 1], nextSerial: 2), "the same, out of order")
        XCTAssertNil(HandleTable(capacity: 2, serials: [.absent], rows: [0], nextSerial: 3), "serial 0")
        XCTAssertNil(HandleTable(capacity: 2, serials: [one, .absent], rows: [1, 0], nextSerial: 3), "serial 0, later")
        XCTAssertNil(HandleTable(capacity: 2, serials: [one, two], rows: [1], nextSerial: 3), "a row is missing")
        XCTAssertNil(HandleTable(capacity: 2, serials: [one], rows: [1, 2], nextSerial: 3), "a serial is missing")
        XCTAssertNil(HandleTable<Int>(capacity: 2, serials: [], rows: [], nextSerial: 0), "a counter of 0")
        XCTAssertNil(HandleTable<Int>(capacity: -1, serials: [], rows: [], nextSerial: 1))
        // the serials run out: refused, never wrapped
        var last = HandleTable<Int>(capacity: 2, serials: [], rows: [], nextSerial: .max)
        XCTAssertNil(last?.insert(1))
        XCTAssertEqual(last?.count, 0)
        var almost = HandleTable<Int>(capacity: 2, serials: [], rows: [], nextSerial: .max - 1)
        XCTAssertEqual(almost?.insert(1)?.serial.raw, .max - 1)
        XCTAssertNil(almost?.insert(2))
        XCTAssertEqual(almost?.count, 1)
    }

    func testManyRowsGoInOnePass() throws {
        var t = HandleTable<Int>(capacity: 100)
        for i in 0..<100 { _ = t.insert(i) }
        var asked: [Int] = []
        // nothing goes: nothing changes
        XCTAssertEqual(t.removeAll { _, row in
            asked.append(row)
            return false
        }, 0)
        XCTAssertEqual(asked, Array(0..<100), "each row is asked once, in serial order")
        XCTAssertEqual(t.count, 100)
        // every fourth row goes, as a disbanded army's formations would
        asked = []
        let gone = t.removeAll { handle, row in
            asked.append(row)
            XCTAssertEqual(Int(handle.serial.raw), row + 1)
            return row % 4 == 0
        }
        XCTAssertEqual(gone, 25)
        XCTAssertEqual(asked, Array(0..<100))
        XCTAssertEqual(t.rows, (0..<100).filter { $0 % 4 != 0 }, "the rest keep their order")
        XCTAssertEqual(t.serials.map { Int($0.raw) }, (1...100).filter { ($0 - 1) % 4 != 0 })
        XCTAssertNil(t[Handle(Serial(raw: 1))])
        XCTAssertEqual(t[Handle(Serial(raw: 2))], 1)
        XCTAssertEqual(t.nextSerial, 101)
        // the first and the last go
        XCTAssertEqual(t.removeAll { _, row in row == 1 || row == 99 }, 2)
        XCTAssertEqual(t.rows.first, 2)
        XCTAssertEqual(t.rows.last, 98)
        // all go
        XCTAssertEqual(t.removeAll { _, _ in true }, 73)
        XCTAssertTrue(t.isEmpty)
        XCTAssertEqual(t.removeAll { _, _ in true }, 0)
        XCTAssertEqual(t.insert(7)?.serial.raw, 101)
    }

    /// Ten rows in a table of 64, a snapshot taken, then a change. Both come back, so the snapshot shares the rows
    /// for the whole of the change.
    private func afterASnapshot(_ change: (inout HandleTable<Int>) -> Void) -> (table: HandleTable<Int>, snapshot: HandleTable<Int>) {
        var t = HandleTable<Int>(capacity: 64)
        for i in 0..<10 { _ = t.insert(i) }
        let snapshot = t
        change(&t)
        return (t, snapshot)
    }

    /// A snapshot (a save being written) shares the table's rows. The first change after it must copy them; the copy
    /// keeps the room up to the cap, so a later insert still does not grow the table.
    func testTheRoomIsKeptWhenASnapshotSharesTheRows() throws {
        let changes: [(name: String, change: (inout HandleTable<Int>) -> Void)] = [
            ("update at a position", { $0.update(at: 0) { $0 = -1 } }),
            ("update by handle", { t in t.update(t.handle(at: 3)) { $0 = -1 } }),
            ("a walk", { $0.updateEach { _, row in row += 1 } }),
            ("remove", { t in t.remove(t.handle(at: 0)) }),
            ("remove many", { $0.removeAll { _, row in row < 5 } }),
            ("insert", { _ = $0.insert(10) }),
        ]
        for (name, change) in changes {
            let (table, snapshot) = afterASnapshot(change)
            XCTAssertGreaterThanOrEqual(table.rows.capacity, 64, name)
            XCTAssertGreaterThanOrEqual(table.serials.capacity, 64, name)
            XCTAssertEqual(snapshot.rows, Array(0..<10), "the snapshot is not changed: \(name)")
            XCTAssertEqual(snapshot.serials.map { $0.raw }, Array(1...10), name)
            XCTAssertNotEqual(table.rows, snapshot.rows, name)
        }
        // a loaded table has the cap's room too, whether its columns came in order or not
        let inOrder = try XCTUnwrap(HandleTable(capacity: 64, serials: [Serial(raw: 1), Serial(raw: 2)], rows: [1, 2], nextSerial: 3))
        XCTAssertGreaterThanOrEqual(inOrder.rows.capacity, 64)
        XCTAssertGreaterThanOrEqual(inOrder.serials.capacity, 64)
        let mixed = try XCTUnwrap(HandleTable(capacity: 64, serials: [Serial(raw: 2), Serial(raw: 1)], rows: [2, 1], nextSerial: 3))
        XCTAssertGreaterThanOrEqual(mixed.rows.capacity, 64)
        XCTAssertGreaterThanOrEqual(mixed.serials.capacity, 64)
    }
}
