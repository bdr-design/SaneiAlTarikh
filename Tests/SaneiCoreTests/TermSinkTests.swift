import XCTest
@testable import SaneiCore

final class TermSinkTests: XCTestCase {
    /// A derived value written once, the way every «لماذا؟» value is (R9): the caller chooses the sink.
    private func value<S: TermSink>(_ terms: [S.Value], into sink: inout S) {
        for (i, t) in terms.enumerated() { sink.add(TermID(raw: UInt16(i + 1)), t) }
    }

    func testTheSumAndTheListAgreeForAnyNumberOfTerms() {
        var g = DetRNG(seed: 11, key: 0, stream: 0, serial: 0)
        for count in 0...30 {
            let terms = (0..<count).map { _ in Q32(raw: Int64(truncatingIfNeeded: g.next() >> 24) - (1 << 39)) }
            var sum = SumSink<Q32>()
            value(terms, into: &sum)
            var list = TermBuffer12<Q32>()
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
        let list = TermBuffer12<Q32>()
        XCTAssertEqual(list.rowCount, 0)
        XCTAssertNil(list.row(0))
        XCTAssertEqual(list.total, .zero)
        XCTAssertEqual(SumSink<Q32>().total, .zero)
    }

    func testATotalThatLeavesTheRangeIsCountedInBothSinks() {
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            var sum = SumSink<Q32>()
            var list = TermBuffer12<Q32>()
            value([.max, .one], into: &sum)
            value([.max, .one], into: &list)
            XCTAssertEqual(sum.total, .max)
            XCTAssertEqual(list.total, .max)
        }
        XCTAssertEqual(c.count, 2)
    }

    func testMoneyIsExplainedInItsOwnUnit() {
        // the United States' federal revenue in 2011, about $2.3 trillion, in units of $1,000: more than a Q32 holds
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            let terms = [USDn(raw: 1_091_000_000), USDn(raw: 819_000_000), USDn(raw: 181_000_000), USDn(raw: 212_000_000)]
            var sum = SumSink<USDn>()
            value(terms, into: &sum)
            var list = TermBuffer12<USDn>()
            value(terms, into: &list)
            XCTAssertEqual(sum.total, USDn(raw: 2_303_000_000))
            XCTAssertEqual(list.total, sum.total)
            XCTAssertEqual(list.term(1)?.value, USDn(raw: 819_000_000))
            var local = TermBuffer12<LCU>()
            local.add(TermID(raw: 3), LCU(raw: -5))
            XCTAssertEqual(local.row(0)?.value, LCU(raw: -5))
            XCTAssertEqual(local.total, LCU(raw: -5))
        }
        XCTAssertEqual(c.count, 0, "nothing clamps")
    }
}
