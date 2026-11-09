import XCTest
@testable import SaneiCore

private enum Province {}
private enum Formation {}

final class HandleTableTests: XCTestCase {
    func testIndicesAndHandlesAreTypedNames() {
        XCTAssertEqual(Idx<Province>(5, in: 10)?.int, 5)
        XCTAssertNil(Idx<Province>(10, in: 10))
        XCTAssertNil(Idx<Province>(-1, in: 10))
        XCTAssertNil(Idx<Province>(0, in: 0))
        XCTAssertNil(Idx<Province>(0, in: 65_536), "a table that large has no room for «no row»")
        XCTAssertEqual(Idx<Province>(65_534, in: 65_535)?.raw, 65_534)
        XCTAssertTrue(Idx<Province>.none.isNone)
        XCTAssertFalse(Idx<Province>(raw: 0).isNone)
        XCTAssertTrue(Idx<Province>(raw: 1) < Idx<Province>(raw: 2))
        XCTAssertTrue(Handle<Formation>(Serial(raw: 1)) < Handle<Formation>(Serial(raw: 2)))
        XCTAssertEqual(Handle<Formation>(Serial(raw: 7)).serial.raw, 7)
    }

    func testRowsStayInCreationOrder() throws {
        var t = HandleTable<String>(capacity: 4)
        XCTAssertTrue(t.isEmpty)
        let a = try XCTUnwrap(t.insert("a"))
        let b = try XCTUnwrap(t.insert("b"))
        let c = try XCTUnwrap(t.insert("c"))
        XCTAssertEqual([a.raw, b.raw, c.raw], [1, 2, 3])
        XCTAssertEqual(t.rows, ["a", "b", "c"])
        XCTAssertEqual(t[b], "b")
        XCTAssertEqual(t.remove(b), "b")
        XCTAssertNil(t[b], "a removed thing is not found again")
        XCTAssertNil(t.remove(b))
        XCTAssertFalse(t.contains(b))
        let d = try XCTUnwrap(t.insert("d"))
        XCTAssertEqual(d.raw, 4, "a serial is never used twice")
        XCTAssertEqual(t.rows, ["a", "c", "d"])
        XCTAssertEqual(t.serials, [a, c, d])
        XCTAssertTrue(t.update(c) { $0 += "!" })
        XCTAssertFalse(t.update(b) { $0 += "?" })
        t.update(at: 0) { $0 = "A" }
        XCTAssertEqual(t.rows, ["A", "c!", "d"])
        XCTAssertNil(t[Serial(raw: 0)])
        XCTAssertNil(t[Serial(raw: 99)])
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
        XCTAssertEqual(t.insert(40)?.raw, 3)
        var none = HandleTable<Int>(capacity: 0)
        XCTAssertNil(none.insert(1))
        var negative = HandleTable<Int>(capacity: -5)
        XCTAssertEqual(negative.capacity, 0)
        XCTAssertNil(negative.insert(1))
    }

    func testASaveGivesTheSameTableBack() throws {
        var g = DetRNG(seed: 3, key: 0, stream: 0, serial: 0)
        var t = HandleTable<Int>(capacity: 200)
        var live: [Serial] = []
        // a busy life: things made and removed in a mixed order
        for step in 0..<2_000 {
            if live.isEmpty || (g.below(3) > 0 && !t.isFull) {
                if let s = t.insert(step) { live.append(s) }
            } else {
                let i = Int(g.below(UInt64(live.count)))
                XCTAssertNotNil(t.remove(live.remove(at: i)))
            }
        }
        XCTAssertEqual(t.serials, t.serials.sorted(), "always in serial order")
        XCTAssertEqual(t.count, live.count)
        for s in live { XCTAssertNotNil(t.index(of: s)) }
        // saved in any order, loaded: the same rows in the same order, and the same next serial
        var saved = zip(t.serials, t.rows).map { (serial: $0, row: $1) }
        for i in stride(from: saved.count - 1, to: 0, by: -1) { saved.swapAt(i, Int(g.below(UInt64(i + 1)))) }
        let loaded = try XCTUnwrap(HandleTable(capacity: 200, saved: saved, nextSerial: t.nextSerial))
        XCTAssertEqual(loaded.serials, t.serials)
        XCTAssertEqual(loaded.rows, t.rows)
        XCTAssertEqual(loaded.nextSerial, t.nextSerial)
        var continued = loaded
        XCTAssertEqual(continued.insert(-1)?.raw, t.nextSerial)
    }

    func testAnInconsistentSaveIsRefused() {
        let one = (serial: Serial(raw: 1), row: 1)
        let two = (serial: Serial(raw: 2), row: 2)
        XCTAssertNotNil(HandleTable(capacity: 2, saved: [two, one], nextSerial: 3))
        XCTAssertNotNil(HandleTable<Int>(capacity: 0, saved: [], nextSerial: 1))
        XCTAssertNil(HandleTable(capacity: 1, saved: [one, two], nextSerial: 3), "more rows than the cap")
        XCTAssertNil(HandleTable(capacity: 2, saved: [one, one], nextSerial: 3), "a serial twice")
        XCTAssertNil(HandleTable(capacity: 2, saved: [one, two], nextSerial: 2), "a serial at the counter")
        XCTAssertNil(HandleTable(capacity: 2, saved: [(serial: Serial(raw: 0), row: 0)], nextSerial: 3), "serial 0")
        XCTAssertNil(HandleTable<Int>(capacity: 2, saved: [], nextSerial: 0), "a counter of 0")
        XCTAssertNil(HandleTable<Int>(capacity: -1, saved: [], nextSerial: 1))
        // the serials run out: refused, never wrapped
        var last = HandleTable<Int>(capacity: 2, saved: [], nextSerial: .max)
        XCTAssertNil(last?.insert(1))
        XCTAssertEqual(last?.count, 0)
    }
}
