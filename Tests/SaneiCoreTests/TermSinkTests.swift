import XCTest
@testable import SaneiCore

final class TermSinkTests: XCTestCase {
    /// A derived value written once, the way every «لماذا؟» value is (R9): the caller chooses the sink.
    private func value<S: TermSink>(_ terms: [Q32], into sink: inout S) {
        for (i, t) in terms.enumerated() { sink.add(TermID(raw: UInt16(i + 1)), t) }
    }

    func testTheSumAndTheListAgreeForAnyNumberOfTerms() {
        var g = DetRNG(seed: 11, key: 0, stream: 0, serial: 0)
        for count in 0...30 {
            let terms = (0..<count).map { _ in Q32(raw: Int64(truncatingIfNeeded: g.next() >> 24) - (1 << 39)) }
            var sum = SumSink()
            value(terms, into: &sum)
            var list = TermBuffer12()
            value(terms, into: &list)
            XCTAssertEqual(list.total, sum.total, "\(count) terms")
            // the rows a sheet shows add up to the total
            var shown = Q32.zero
            for i in 0..<list.rowCount {
                if let row = list.row(i) { shown += row.value }
            }
            XCTAssertEqual(shown, sum.total, "\(count) terms")
            XCTAssertEqual(Int(list.count), Swift.min(count, 12))
            XCTAssertEqual(list.hasOther, count > 12)
            XCTAssertEqual(list.rowCount, Swift.min(count, 12) + (count > 12 ? 1 : 0))
            for i in 0..<Swift.min(count, 12) {
                XCTAssertEqual(list.term(i)?.id, TermID(raw: UInt16(i + 1)), "the terms keep their order")
                XCTAssertEqual(list.term(i)?.value, terms[i])
            }
            XCTAssertNil(list.term(Swift.min(count, 12)))
            XCTAssertNil(list.term(-1))
            XCTAssertNil(list.row(list.rowCount))
            if count > 12 {
                XCTAssertEqual(list.row(12)?.id, TermID.other)
                XCTAssertEqual(list.row(12)?.value, terms[12...].reduce(Q32.zero, +))
            }
        }
    }

    func testAnEmptySheet() {
        let list = TermBuffer12()
        XCTAssertEqual(list.rowCount, 0)
        XCTAssertNil(list.row(0))
        XCTAssertEqual(list.total, .zero)
        XCTAssertEqual(SumSink().total, .zero)
    }

    func testATotalThatLeavesTheRangeIsCountedInBothSinks() {
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            var sum = SumSink()
            var list = TermBuffer12()
            value([.max, .one], into: &sum)
            value([.max, .one], into: &list)
            XCTAssertEqual(sum.total, .max)
            XCTAssertEqual(list.total, .max)
        }
        XCTAssertEqual(c.count, 2)
    }
}
