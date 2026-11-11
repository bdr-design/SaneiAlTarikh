import XCTest
@testable import SaneiCore

/// T-038: sums that close, exact n / d, bounded ratios, the logarithm of a ratio, finer chances, choices, people. Every
/// row of the reference's families (tools/checks/core_reference.py) reproduced with its own clamp count, then the
/// properties that hold for any input.
final class SharesTests: XCTestCase {
    /// As in CoreGoldenTests: one counter per family; each row's clamps must be exactly the row's last number.
    private func each<Row>(_ rows: [Row], file: StaticString = #filePath, line: UInt = #line, _ row: (Row) -> UInt64) {
        XCTAssertGreaterThanOrEqual(rows.count, 5, "a family has rows", file: file, line: line)
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            for r in rows {
                let before = c.count
                let expected = row(r)
                XCTAssertEqual(c.count - before, expected, "clamps counted for \(r)", file: file, line: line)
            }
        }
    }

    func testExactProportionalShares() {
        each(CoreGolden.mulDiv) { a, n, d, r, clamps in
            XCTAssertEqual(LCU(raw: a).times(n, over: d).raw, r, "\(a) × \(n) / \(d)")
            return clamps
        }
        each(CoreGolden.amountTimesCount) { a, n, r, clamps in
            XCTAssertEqual(USDn(raw: a).times(n).raw, r, "\(a) × \(n)")
            return clamps
        }
        each(CoreGolden.amountDividedBy) { a, n, r, clamps in
            XCTAssertEqual(Money(raw: a).divided(by: n).raw, r, "\(a) / \(n)")
            return clamps
        }
        // the example the card gives: a seventh of 10^15 is right to the unit, where a Q32 factor is 99,784 units off
        XCTAssertEqual(LCU(raw: 1_000_000_000_000_000).times(1, over: 7).raw, 142_857_142_857_143)
        XCTAssertNotEqual(LCU(raw: 1_000_000_000_000_000).times(Q32(ratio: 1, 7)).raw, 142_857_142_857_143)
    }

    func testBoundedRatiosNeverCount() {
        each(CoreGolden.q32RatioWithin) { n, d, lo, hi, r, clamps in
            XCTAssertEqual(Q32(ratio: n, d, within: Q32(raw: lo)...Q32(raw: hi)).raw, r, "\(n) / \(d) in \(lo)...\(hi)")
            return clamps
        }
        each(CoreGolden.bpRatioWithin) { n, d, lo, hi, r, clamps in
            XCTAssertEqual(BP(ratio: n, d, within: BP(raw: lo)...BP(raw: hi)).raw, r, "\(n) / \(d) in \(lo)...\(hi)")
            return clamps
        }
        // §5.1's case: no supply at all is an ordinary day, held at +8%, and the game's count stays 0
        let eight = Q32(ratio: -8, 100)...Q32(ratio: 8, 100)
        let gap = Saturation.counted { Q32(ratio: 5, 0, within: eight) }
        XCTAssertEqual(gap.result, Q32(ratio: 8, 100))
        XCTAssertEqual(gap.clamps, 0)
        // through two amounts of one unit
        XCTAssertEqual(LCU(raw: 50).ratio(to: LCU(raw: 0), within: eight), Q32(ratio: 8, 100))
        XCTAssertEqual(LCU(raw: 3).ratio(to: LCU(raw: 2)), Q32(ratio: 3, 2))
        XCTAssertEqual(USDn(raw: 1).share(of: USDn(raw: 3)), BP(raw: 3_333))
    }

    func testLogarithmsOfRatiosAndPowers() {
        each(CoreGolden.logRatio) { n, d, r, clamps in
            XCTAssertEqual(LogQ(ratio: n, d).raw, r, "log2 of \(n) / \(d)")
            XCTAssertEqual(DMath.log2(ratio: n, d).raw, r)
            return 2 * clamps
        }
        // a small level from two whole numbers keeps its accuracy, where a Q32 level has few bits
        let small = LogQ(ratio: 1, 20_500)
        XCTAssertEqual(small.applied(to: 20_500_000_000), 1_000_000)
        // the exponent bridge: nothing is computed, and the label says which way
        XCTAssertEqual(LogQ(exponent: Q32(3)).applied(to: 5), 40)
        XCTAssertEqual(LogQ(exponent: Q32(3)).exponent, Q32(3))
        XCTAssertEqual(LogQ(level: Q32(8)), LogQ(exponent: Q32(3)))
        // a level to a power is the logarithm times the power: the products of the Q32 rows
        each(CoreGolden.q32Mul) { a, b, r, clamps in
            XCTAssertEqual((LogQ(raw: a) * Q32(raw: b)).raw, r, "log \(a) × \(b)")
            return clamps
        }
        XCTAssertEqual((LogQ(exponent: Q32(3)) * Q32(ratio: 1, 3)).applied(to: 1_000), 2_000, "the cube root of 8")
    }

    func testSplitsCloseExactly() {
        var splitter = ShareSplitter(capacity: 300)
        var parts: [Int64] = []
        each(CoreGolden.splits) { whole, weights, expected, clamps in
            splitter.split(whole, by: weights, into: &parts)
            XCTAssertEqual(parts, expected, "\(whole) by \(weights)")
            return clamps
        }
        var shares: [BP] = []
        each(CoreGolden.splitsBP) { whole, weights, expected, clamps in
            splitter.split(BP(raw: whole), by: weights, into: &shares)
            XCTAssertEqual(shares.map { $0.raw }, expected, "\(whole) bp by \(weights)")
            return clamps
        }
        // the card's examples: six sixths of 10,000 bp, four quarters of 10, 225 equal shares of 300,000,000
        splitter.split(10_000, by: [1, 1, 1, 1, 1, 1], into: &parts)
        XCTAssertEqual(parts.reduce(0, +), 10_000)
        splitter.split(300_000_000, by: [Int64](repeating: 1, count: 225), into: &parts)
        XCTAssertEqual(parts.reduce(0, +), 300_000_000)
        // money and people keep their unit
        var money: [LCU] = []
        splitter.split(LCU(raw: -7), by: [3, 1], into: &money)
        XCTAssertEqual(money, [LCU(raw: -5), LCU(raw: -2)])
        var people: [Pop] = []
        splitter.split(Pop(raw: 82_000_000), by: [5, 3, 2], into: &people)
        XCTAssertEqual(people.map { $0.raw }, [41_000_000, 24_600_000, 16_400_000])
    }

    /// For any whole and any weights: the parts add up exactly, each is within one unit of its exact share and on the
    /// whole's side, and the same inputs always give the same parts.
    func testSplitPropertiesForAnyInput() {
        var g = DetRNG(seed: 38, key: 0, stream: 0, serial: 0)
        var splitter = ShareSplitter()
        var parts: [Int64] = []
        var again: [Int64] = []
        for round in 0..<3_000 {
            let count = 1 + Int(g.below(40))
            let bits = 1 + g.below(40)
            let weights = (0..<count).map { _ in Int64(g.below(UInt64(1) << bits)) - (g.below(10) == 0 ? 3 : 0) }
            let whole = Int64(bitPattern: g.next()) >> Int64(g.below(63))
            _ = Saturation.counted { splitter.split(whole, by: weights, into: &parts) }
            XCTAssertEqual(parts.count, count)
            // the parts add up: as Int128-free arithmetic, by halves
            var sum: (high: Int64, low: UInt64) = (0, 0)
            for p in parts {
                let (low, carry) = sum.low.addingReportingOverflow(UInt64(bitPattern: p))
                sum = (sum.high + (p < 0 ? -1 : 0) + (carry ? 1 : 0), low)
            }
            XCTAssertEqual(sum.low, UInt64(bitPattern: whole), "round \(round)")
            XCTAssertEqual(sum.high, whole < 0 ? -1 : 0, "round \(round)")
            for p in parts { XCTAssertTrue(p == 0 || (p < 0) == (whole < 0), "a part on the whole's side, round \(round)") }
            // within one unit of the exact share: |part| * total and |whole| * weight differ by less than total
            let ws = weights.map { UInt64(Swift.max($0, 0)) }
            let total = ws.reduce(0, +)
            if total > 0 {
                for (p, w) in zip(parts, ws) {
                    let exact = whole.magnitude.multipliedFullWidth(by: w)
                    let mine = p.magnitude.multipliedFullWidth(by: total)
                    let (dl, borrow) = mine.low.subtractingReportingOverflow(exact.low)
                    let dh = mine.high &- exact.high &- (borrow ? 1 : 0)
                    let off = Int64(bitPattern: dh) < 0 ? (high: ~dh &+ (dl == 0 ? 1 : 0), low: 0 &- dl) : (high: dh, low: dl)
                    XCTAssertTrue(off.high == 0 && off.low < total, "within one unit, round \(round)")
                }
            }
            splitter.split(whole, by: weights, into: &again)
            XCTAssertEqual(parts, again)
        }
    }

    func testFinerChancesChoicesAndShuffles() {
        var chances = DetRNG(seed: 4, key: 4, stream: 4, serial: 4)
        each(CoreGolden.rngChanceIn) { n, d, hit, clamps in
            XCTAssertEqual(chances.chance(n, in: d), hit == 1, "\(n) in \(d)")
            return clamps
        }
        var picks = DetRNG(seed: 6, key: 6, stream: 6, serial: 6)
        each(CoreGolden.rngPick) { weights, expected, clamps in
            XCTAssertEqual(picks.pick(weights) ?? -1, Int(expected), "\(weights)")
            return clamps
        }
        var shuffles = DetRNG(seed: 8, key: 8, stream: 8, serial: 8)
        each(CoreGolden.rngShuffle) { n, expected, clamps in
            var items = Array(Int32(0)..<n)
            shuffles.shuffle(&items)
            XCTAssertEqual(items, expected, "\(n) items")
            return clamps
        }
        // a once-in-50-years daily hazard: about 1 hit in 18,250 draws
        var g = DetRNG(seed: 1, key: 0, stream: 0, serial: 0)
        var hits = 0
        for _ in 0..<1_825_000 where g.chance(1, in: 18_250) { hits += 1 }
        XCTAssertTrue((80...120).contains(hits), "\(hits) hits of an expected 100")
        // a choice in proportion to the weights
        var counts = [0, 0, 0]
        for _ in 0..<60_000 { counts[g.pick([1, 2, 3]) ?? 0] += 1 }
        XCTAssertTrue((9_000...11_000).contains(counts[0]) && (19_000...21_000).contains(counts[1]), "\(counts)")
        XCTAssertNil(g.pick([]))
        XCTAssertNil(g.pick([0, -4]))
    }

    func testPeople() {
        each(CoreGolden.popNarrowed) { wide, narrow, clamps in
            XCTAssertEqual(Pop32(Pop(raw: wide)).raw, narrow, "\(wide) people")
            return clamps
        }
        XCTAssertEqual(Pop(Pop32(raw: -5)).raw, -5)
        var province = Pop32(raw: 2_000_000_000)
        let c = Saturation.counted { province += Pop32(raw: 500_000_000) }
        XCTAssertEqual(province.raw, Int32.max)
        XCTAssertEqual(c.clamps, 1)
        XCTAssertEqual(Pop(raw: 82_000_000).times(3, over: 4), Pop(raw: 61_500_000))
    }

    func testMagnitudesAndModelBounds() {
        XCTAssertEqual(LCU(raw: -5).magnitude, LCU(raw: 5))
        XCTAssertEqual(Q32(-2).magnitude, Q32(2))
        let c = Saturation.counted { (LCU(raw: .min).magnitude, Q32.min.magnitude) }
        XCTAssertEqual(c.result.0.raw, .max)
        XCTAssertEqual(c.result.1, .max)
        XCTAssertEqual(c.clamps, 2, "the opposite of the lowest is the highest, counted")
        let held = Saturation.counted {
            (Q32(5).clamped(to: Q32(0)...Q32(1)), BP(raw: -3).clamped(to: BP.zero...BP.one),
             LCU(raw: 9).clamped(to: LCU(raw: 0)...LCU(raw: 4)), LogQ(raw: 7).clamped(to: LogQ.zero...LogQ.zero))
        }
        XCTAssertEqual(held.result.0, Q32(1))
        XCTAssertEqual(held.result.1, BP.zero)
        XCTAssertEqual(held.result.2, LCU(raw: 4))
        XCTAssertEqual(held.result.3, LogQ.zero)
        XCTAssertEqual(held.clamps, 0, "a bound the model sets is not counted")
    }
}
