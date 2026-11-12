import XCTest
@testable import SaneiCore

final class TermSinkTests: XCTestCase {
    /// A derived value written once, the way every «لماذا؟» value is (R9): the caller chooses the sink.
    private func value<S: TermSink>(_ terms: [(id: TermID, value: S.Value)], base: S.Value? = nil, into sink: inout S) {
        if let base { sink.base(TermID(raw: 1_000), base) }
        for term in terms { sink.add(term.id, term.value) }
    }

    private func numbered(_ values: [Q32]) -> [(id: TermID, value: Q32)] {
        values.enumerated().map { (id: TermID(raw: UInt16($0.offset + 1)), value: $0.element) }
    }

    /// What the sheet must keep of `terms` when they are more than `room`: the largest by size, the lower number
    /// first among equals; in the order they were added.
    private func largest(_ terms: [(id: TermID, value: Q32)], room: Int) -> [(id: TermID, value: Q32)] {
        let ranked = terms.indices.sorted { a, b in
            let (x, y) = (terms[a], terms[b])
            if x.value.raw.magnitude != y.value.raw.magnitude { return x.value.raw.magnitude > y.value.raw.magnitude }
            return x.id.raw < y.id.raw
        }
        return ranked.prefix(room).sorted().map { terms[$0] }
    }

    private func rows(_ list: TermBuffer12<Q32>) -> [(id: TermID, value: Q32)] {
        (0..<list.rowCount).compactMap { list.row($0) }
    }

    private func assertSame(_ a: [(id: TermID, value: Q32)], _ b: [(id: TermID, value: Q32)], _ note: String,
                            file: StaticString = #filePath, line: UInt = #line) {
        XCTAssertEqual(a.map { $0.id }, b.map { $0.id }, note, file: file, line: line)
        XCTAssertEqual(a.map { $0.value }, b.map { $0.value }, note, file: file, line: line)
    }

    func testTheSumAndTheListAgreeForAnyNumberOfTerms() {
        var g = DetRNG(seed: 11, key: 0, stream: 0, serial: 0)
        for count in 0...30 {
            let terms = numbered((0..<count).map { _ in Q32(raw: Int64(truncatingIfNeeded: g.next() >> 24) - (1 << 39)) })
            XCTAssertFalse(terms.contains { $0.value == .zero })
            var sum = SumSink<Q32>()
            value(terms, into: &sum)
            var list = TermBuffer12<Q32>()
            value(terms, into: &list)
            XCTAssertEqual(list.total, sum.total, "\(count) terms")
            // the rows a sheet shows add up to the total, and are never more than twelve
            let shown = rows(list)
            XCTAssertEqual(shown.count, list.rowCount)
            XCTAssertEqual(shown.reduce(Q32.zero) { $0 + $1.value }, sum.total, "\(count) terms")
            XCTAssertLessThanOrEqual(list.rowCount, 12)
            XCTAssertNil(list.term(-1))
            XCTAssertNil(list.term(list.count))
            XCTAssertNil(list.row(list.rowCount))
            XCTAssertNil(list.row(-1))
            XCTAssertFalse(list.hasBase)
            if count <= 12 {
                // every term has its row, in the order it was added
                assertSame(shown, terms, "\(count) terms")
                XCTAssertEqual(list.count, count)
                XCTAssertFalse(list.hasOther)
                XCTAssertEqual(list.other, .zero)
            } else {
                // eleven rows and «أخرى»: the eleven largest, in the order they were added
                let kept = largest(terms, room: 11)
                assertSame(Array(shown.prefix(11)), kept, "\(count) terms")
                XCTAssertEqual(list.count, 11)
                XCTAssertTrue(list.hasOther)
                XCTAssertEqual(shown.last?.id, TermID.other)
                XCTAssertEqual(shown.last?.value, list.other)
                let keptIDs = Set(kept.map { $0.id })
                XCTAssertEqual(list.other, terms.filter { !keptIDs.contains($0.id) }.reduce(Q32.zero) { $0 + $1.value })
            }
        }
    }

    /// What a sheet shows does not depend on the order the terms were added in: the same rows are kept.
    func testTheKeptRowsDoNotDependOnTheOrder() {
        var g = DetRNG(seed: 12, key: 0, stream: 0, serial: 0)
        for round in 0..<200 {
            // few distinct sizes, both signs: many ties
            var terms = numbered((0..<20).map { _ in Q32(Int64(g.below(7)) - 3) }).filter { $0.value != .zero }
            var first = TermBuffer12<Q32>()
            value(terms, into: &first)
            for i in stride(from: terms.count - 1, to: 0, by: -1) { terms.swapAt(i, Int(g.below(UInt64(i + 1)))) }
            var second = TermBuffer12<Q32>()
            value(terms, into: &second)
            let a = rows(first).sorted { $0.id.raw < $1.id.raw }
            let b = rows(second).sorted { $0.id.raw < $1.id.raw }
            assertSame(a, b, "round \(round)")
            XCTAssertEqual(first.total, second.total)
            if terms.count > 12 {
                assertSame(Array(rows(second).prefix(11)), largest(terms, room: 11), "round \(round)")
            }
        }
    }

    func testATermOfZeroTakesNoRow() {
        var list = TermBuffer12<Q32>()
        var sum = SumSink<Q32>()
        let terms = numbered([Q32(5), .zero, Q32(-3), .zero, .zero, Q32(1)])
        value(terms, into: &list)
        value(terms, into: &sum)
        XCTAssertEqual(list.rowCount, 3)
        XCTAssertEqual(rows(list).map { $0.id.raw }, [1, 3, 6])
        XCTAssertEqual(list.total, Q32(3))
        XCTAssertEqual(sum.total, Q32(3))
        // fifteen terms of which seven are zero: eight rows, nothing left out
        var many = TermBuffer12<Q32>()
        value(numbered((1...15).map { $0 % 2 == 0 ? .zero : Q32(Int64($0)) }), into: &many)
        XCTAssertEqual(many.rowCount, 8)
        XCTAssertFalse(many.hasOther)
    }

    func testTheStartingLevelKeepsItsRowFirst() {
        // a starting level smaller than every term, and thirteen terms: it stays, ten terms stay, three are left out
        let terms = numbered((1...13).map { Q32(Int64($0) * 10) })
        var list = TermBuffer12<Q32>()
        var sum = SumSink<Q32>()
        value(terms, base: Q32(1), into: &list)
        value(terms, base: Q32(1), into: &sum)
        XCTAssertTrue(list.hasBase)
        XCTAssertEqual(list.rowCount, 12)
        XCTAssertEqual(list.row(0)?.id, TermID(raw: 1_000))
        XCTAssertEqual(list.row(0)?.value, Q32(1))
        XCTAssertEqual(rows(list).map { $0.id.raw }, [1_000, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, TermID.other.raw])
        XCTAssertEqual(list.other, Q32(10 + 20 + 30))
        XCTAssertEqual(list.total, sum.total)
        XCTAssertEqual(list.total, Q32(1 + 910))
        // a starting level of 0 is still the starting level
        var zero = TermBuffer12<Q32>()
        zero.base(TermID(raw: 1_000), .zero)
        zero.add(TermID(raw: 1), Q32(4))
        XCTAssertTrue(zero.hasBase)
        XCTAssertEqual(zero.rowCount, 2)
        XCTAssertEqual(zero.row(0)?.value, .zero)
        // given after a term, it is a term like any other
        var late = TermBuffer12<Q32>()
        late.add(TermID(raw: 1), Q32(4))
        late.base(TermID(raw: 1_000), Q32(50))
        XCTAssertFalse(late.hasBase)
        XCTAssertEqual(late.rowCount, 2)
        XCTAssertEqual(late.total, Q32(54))
        var lateSum = SumSink<Q32>()
        lateSum.add(TermID(raw: 1), Q32(4))
        lateSum.base(TermID(raw: 1_000), Q32(50))
        XCTAssertEqual(lateSum.total, Q32(54))
    }

    func testOtherIsARowEvenWhenItCancels() {
        // eleven large terms, then +5 and -5: both are left out, and «أخرى» says so with 0
        var list = TermBuffer12<Q32>()
        value(numbered((1...11).map { Q32(Int64(100 + $0)) } + [Q32(5), Q32(-5)]), into: &list)
        XCTAssertEqual(list.rowCount, 12)
        XCTAssertTrue(list.hasOther)
        XCTAssertEqual(list.row(11)?.id, TermID.other)
        XCTAssertEqual(list.row(11)?.value, .zero)
        XCTAssertEqual(list.count, 11)
        XCTAssertEqual(rows(list).prefix(11).map { $0.id.raw }, Array(1...11))
        // a late large term takes the row of the smallest kept one
        list.add(TermID(raw: 14), Q32(-500))
        XCTAssertEqual(rows(list).prefix(11).map { $0.id.raw }, Array(2...11) + [14])
        XCTAssertEqual(list.row(11)?.value, Q32(101))
        // of two terms of one size, the lower number stays
        list.add(TermID(raw: 1), Q32(-102))
        XCTAssertEqual(rows(list).prefix(11).map { $0.id.raw }, Array(3...11) + [14, 1], "1 outranks 2 at the size 102")
        list.add(TermID(raw: 20), Q32(102))
        XCTAssertEqual(rows(list).prefix(11).map { $0.id.raw }, Array(3...11) + [14, 1], "20 does not outrank 1 at the size 102")
        XCTAssertEqual(list.other, Q32(101 + 102 + 102))
        XCTAssertEqual(TermID.other.raw, 65_535, "the stored number of «أخرى» never changes")
    }

    func testAnEmptySheet() {
        let list = TermBuffer12<Q32>()
        XCTAssertEqual(list.rowCount, 0)
        XCTAssertEqual(list.count, 0)
        XCTAssertNil(list.row(0))
        XCTAssertNil(list.term(0))
        XCTAssertEqual(list.total, .zero)
        XCTAssertFalse(list.hasOther)
        XCTAssertFalse(list.hasBase)
        XCTAssertEqual(SumSink<Q32>().total, .zero)
    }

    /// The two sinks count the same clamps: the total's. «أخرى» is the sheet's own sum, so its clamp is not counted.
    func testBothSinksCountTheSameClamps() {
        let two = numbered([.max, .one])
        let (_, sumClamps) = Saturation.counted {
            var sum = SumSink<Q32>()
            value(two, into: &sum)
            XCTAssertEqual(sum.total, .max)
        }
        let (_, listClamps) = Saturation.counted {
            var list = TermBuffer12<Q32>()
            value(two, into: &list)
            XCTAssertEqual(list.total, .max)
        }
        XCTAssertEqual(sumClamps, 1)
        XCTAssertEqual(listClamps, 1)
        // fourteen terms at the top of the range: the total clamps thirteen times in each sink, and «أخرى» (three
        // terms left out) clamps twice more without being counted
        let top = numbered([Q32](repeating: .max, count: 14))
        let (sumTotal, sumTop) = Saturation.counted { () -> Q32 in
            var sum = SumSink<Q32>()
            value(top, into: &sum)
            return sum.total
        }
        let (list, listTop) = Saturation.counted { () -> TermBuffer12<Q32> in
            var list = TermBuffer12<Q32>()
            value(top, into: &list)
            return list
        }
        XCTAssertEqual(sumTop, 13)
        XCTAssertEqual(listTop, 13)
        XCTAssertEqual(list.total, sumTotal)
        XCTAssertEqual(list.other, .max)
        XCTAssertEqual(rows(list).prefix(11).map { $0.id.raw }, Array(1...11), "of equal terms, the lower numbers stay")
        // the other end
        var low = TermBuffer12<Q32>()
        value(numbered([Q32](repeating: .min, count: 14)), into: &low)
        XCTAssertEqual(low.other, .min)
        XCTAssertEqual(low.total, .min)
    }

    func testMoneyIsExplainedInItsOwnUnit() {
        // the United States' federal revenue in 2011, about $2.3 trillion, in units of $1,000: more than a Q32 holds
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            let terms = [USDn(raw: 1_091_000_000), USDn(raw: 819_000_000), USDn(raw: 181_000_000), USDn(raw: 212_000_000)]
            var sum = SumSink<USDn>()
            var list = TermBuffer12<USDn>()
            for (i, t) in terms.enumerated() {
                sum.add(TermID(raw: UInt16(i + 1)), t)
                list.add(TermID(raw: UInt16(i + 1)), t)
            }
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

    /// The campaign log keeps a sheet in a save: it comes back row for row, and a damaged one is refused.
    func testASavedSheetComesBackOrIsRefused() throws {
        var g = DetRNG(seed: 13, key: 0, stream: 0, serial: 0)
        for count in [0, 1, 5, 12, 13, 25] {
            for withBase in [false, true] {
                let terms = numbered((0..<count).map { _ in Q32(Int64(g.below(2_000)) - 1_000) })
                var list = TermBuffer12<Q32>()
                value(terms, base: withBase ? Q32(55) : nil, into: &list)
                let kept = (0..<list.count).compactMap { list.term($0) }
                let loaded = try XCTUnwrap(TermBuffer12<Q32>(saved: kept, hasBase: list.hasBase,
                                                             other: list.hasOther ? list.other : nil, total: list.total))
                assertSame(rows(loaded), rows(list), "\(count) terms")
                XCTAssertEqual(loaded.total, list.total)
                XCTAssertEqual(loaded.hasBase, list.hasBase)
                XCTAssertEqual(loaded.hasOther, list.hasOther)
                XCTAssertEqual(loaded.count, list.count)
                // and it goes on as the one that was never saved
                var a = loaded
                var b = list
                a.add(TermID(raw: 900), Q32(77))
                b.add(TermID(raw: 900), Q32(77))
                assertSame(rows(a), rows(b), "\(count) terms, one more")
                XCTAssertEqual(a.total, b.total)
            }
        }
        let row = (id: TermID(raw: 1), value: Q32(1))
        XCTAssertNotNil(TermBuffer12<Q32>(saved: [], hasBase: false, other: nil, total: .zero))
        XCTAssertNotNil(TermBuffer12<Q32>(saved: [(id: TermID, value: Q32)](repeating: row, count: 12), hasBase: true, other: nil, total: Q32(12)))
        XCTAssertNotNil(TermBuffer12<Q32>(saved: [(id: TermID, value: Q32)](repeating: row, count: 11), hasBase: false, other: .zero, total: Q32(11)))
        XCTAssertNil(TermBuffer12<Q32>(saved: [(id: TermID, value: Q32)](repeating: row, count: 13), hasBase: false, other: nil, total: Q32(13)),
                     "more rows than the sheet has")
        XCTAssertNil(TermBuffer12<Q32>(saved: [(id: TermID, value: Q32)](repeating: row, count: 200), hasBase: false, other: nil, total: .zero))
        XCTAssertNil(TermBuffer12<Q32>(saved: [(id: TermID, value: Q32)](repeating: row, count: 12), hasBase: false, other: Q32(1), total: Q32(13)),
                     "«أخرى» beside twelve rows would be thirteen")
        XCTAssertNil(TermBuffer12<Q32>(saved: [(id: TermID, value: Q32)](repeating: row, count: 10), hasBase: false, other: Q32(1), total: Q32(11)),
                     "a term is left out only when eleven are kept")
        XCTAssertNil(TermBuffer12<Q32>(saved: [], hasBase: true, other: nil, total: .zero), "a starting level with no rows")
        XCTAssertNil(TermBuffer12<Q32>(saved: [(id: TermID.other, value: Q32(1))], hasBase: false, other: nil, total: Q32(1)),
                     "65,535 is «أخرى»'s number")
        XCTAssertNil(TermBuffer12<Q32>(saved: [row, (id: TermID(raw: 2), value: .zero)], hasBase: false, other: nil, total: Q32(1)),
                     "a cause of 0 takes no row")
        XCTAssertNotNil(TermBuffer12<Q32>(saved: [(id: TermID(raw: 2), value: .zero), row], hasBase: true, other: nil, total: Q32(1)),
                        "a starting level of 0 keeps its row")
        XCTAssertNil(TermBuffer12<Q32>(saved: [row, (id: TermID(raw: 2), value: .zero)], hasBase: true, other: nil, total: Q32(1)),
                     "only the starting level may be 0")
    }

    /// The sizes the cost line states (docs/perf.md), and the layout the slots' byte offsets stand on.
    func testTheSheetIsHeldInline() {
        XCTAssertEqual(MemoryLayout<TermBuffer12<Q32>.IDs>.size, 24)
        XCTAssertEqual(MemoryLayout<TermBuffer12<Q32>.Raws>.size, 96)
        XCTAssertEqual(MemoryLayout<TermBuffer12<Q32>>.stride, 144)
        XCTAssertEqual(MemoryLayout<TermBuffer12<USDn>>.stride, 144)
        XCTAssertEqual(MemoryLayout<SumSink<Q32>>.size, 8)
    }
}
