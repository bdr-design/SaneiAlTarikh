import XCTest
@testable import SaneiCore

final class RingBufferTests: XCTestCase {
    func testKeepsOrderUntilFull() {
        var r = RingBuffer<Int>(capacity: 3)
        XCTAssertTrue(r.isEmpty)
        XCTAssertNil(r.append(1))
        XCTAssertNil(r.append(2))
        XCTAssertEqual(r.elements, [1, 2])
        XCTAssertFalse(r.isFull)
        XCTAssertNil(r.append(3))
        XCTAssertTrue(r.isFull)
        XCTAssertEqual(r.elements, [1, 2, 3])
    }

    func testDropsTheOldestWhenFull() {
        var r = RingBuffer<String>(capacity: 2)
        r.append("a"); r.append("b")
        XCTAssertEqual(r.append("c"), "a")
        XCTAssertEqual(r.append("d"), "b")
        XCTAssertEqual(r.elements, ["c", "d"])
        XCTAssertEqual(r.count, 2)
    }

    func testWrapsManyTimes() {
        var r = RingBuffer<Int>(capacity: 5)
        for i in 0..<1_003 { r.append(i) }
        XCTAssertEqual(r.elements, [998, 999, 1_000, 1_001, 1_002])
    }

    func testRemoveAllKeepsCapacity() {
        var r = RingBuffer<Int>(capacity: 4)
        for i in 0..<6 { r.append(i) }
        r.removeAll()
        XCTAssertTrue(r.isEmpty)
        XCTAssertEqual(r.capacity, 4)
        r.append(7)
        XCTAssertEqual(r.elements, [7])
    }

    func testCapacityOne() {
        var r = RingBuffer<Int>(capacity: 1)
        XCTAssertNil(r.append(1))
        XCTAssertEqual(r.append(2), 1)
        XCTAssertEqual(r.elements, [2])
    }

    func testSequenceBeforeTheBufferWraps() {
        var r = RingBuffer<Int>(capacity: 4)
        XCTAssertEqual(r.elements(since: 0).elements, [])
        XCTAssertEqual(r.elements(since: 0).next, 0)
        r.append(10); r.append(11); r.append(12)
        let a = r.elements(since: 0)
        XCTAssertEqual(a.elements, [10, 11, 12]); XCTAssertEqual(a.next, 3); XCTAssertEqual(a.lost, 0)
        let b = r.elements(since: 2)
        XCTAssertEqual(b.elements, [12]); XCTAssertEqual(b.next, 3); XCTAssertEqual(b.lost, 0)
        let c = r.elements(since: 3)
        XCTAssertEqual(c.elements, []); XCTAssertEqual(c.next, 3); XCTAssertEqual(c.lost, 0)
    }

    func testSequenceAfterTheBufferWraps() {
        var r = RingBuffer<Int>(capacity: 3)
        for v in 0..<10 { r.append(v) }              // holds 7, 8, 9 (sequence numbers 7, 8, 9)
        let a = r.elements(since: 0)
        XCTAssertEqual(a.elements, [7, 8, 9]); XCTAssertEqual(a.next, 10); XCTAssertEqual(a.lost, 7)
        let b = r.elements(since: 5)
        XCTAssertEqual(b.elements, [7, 8, 9]); XCTAssertEqual(b.lost, 2)
        let c = r.elements(since: 8)
        XCTAssertEqual(c.elements, [8, 9]); XCTAssertEqual(c.lost, 0)
        let d = r.elements(since: 12)               // beyond the end: nothing, nothing lost
        XCTAssertEqual(d.elements, []); XCTAssertEqual(d.next, 10); XCTAssertEqual(d.lost, 0)
    }

    func testSequenceSurvivesRemoveAll() {
        var r = RingBuffer<Int>(capacity: 3)
        r.append(1); r.append(2)
        r.removeAll()
        XCTAssertEqual(r.appendedTotal, 2)
        r.append(3)
        let a = r.elements(since: 1)
        XCTAssertEqual(a.elements, [3]); XCTAssertEqual(a.next, 3); XCTAssertEqual(a.lost, 1)
    }
}
