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
}
