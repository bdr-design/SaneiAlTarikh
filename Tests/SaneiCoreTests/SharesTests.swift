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
            XCTAssertEqual(USDn(raw: a).times(count: n).raw, r, "\(a) × \(n)")
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
        // 0 / 0 is the caller's: a price over its base, or a share of an empty budget
        each(CoreGolden.q32RatioUndefined) { n, d, lo, hi, u, r, clamps in
            XCTAssertEqual(Q32(ratio: n, d, within: Q32(raw: lo)...Q32(raw: hi), undefined: Q32(raw: u)).raw, r, "\(n) / \(d), 0 / 0 = \(u)")
            return clamps
        }
        each(CoreGolden.bpRatioUndefined) { n, d, lo, hi, u, r, clamps in
            XCTAssertEqual(BP(ratio: n, d, within: BP(raw: lo)...BP(raw: hi), undefined: BP(raw: u)).raw, r, "\(n) / \(d), 0 / 0 = \(u)")
            return clamps
        }
        let empty = Saturation.counted { (LCU.zero.share(of: .zero, within: BP.zero...BP.one), LCU.zero.ratio(to: .zero, within: Q32.zero...Q32(2), undefined: .one)) }
        XCTAssertEqual(empty.result.0, BP.zero)
        XCTAssertEqual(empty.result.1, Q32.one)
        XCTAssertEqual(empty.clamps, 0, "an empty budget is an ordinary day")
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
            XCTAssertEqual(LogQ(raw: a).raised(to: Q32(raw: b)).raw, r, "log \(a) raised to \(b)")
            return clamps
        }
        XCTAssertEqual(LogQ(exponent: Q32(3)).raised(to: Q32(ratio: 1, 3)).applied(to: 1_000), 2_000, "the cube root of 8")
        XCTAssertEqual(LogQ(exponent: Q32(3)).raised(to: Q32(ratio: 1, 3)).raw, (1 << 32) - 1, "about 2: one step below")
    }

    func testSplitsCloseExactly() {
        var splitter = ShareSplitter(capacity: 300)
        var parts: [Int64] = []
        each(CoreGolden.splits) { whole, weights, expected, claimed, clamps in
            XCTAssertEqual(splitter.split(whole, by: weights, into: &parts), claimed == 1, "\(whole) by \(weights): claimed")
            XCTAssertEqual(parts, expected, "\(whole) by \(weights)")
            return clamps
        }
        var shares: [BP] = []
        each(CoreGolden.splitsBP) { whole, weights, expected, claimed, clamps in
            XCTAssertEqual(splitter.split(BP(raw: whole), by: weights, into: &shares), claimed == 1)
            XCTAssertEqual(shares.map { $0.raw }, expected, "\(whole) bp by \(weights)")
            return clamps
        }
        var provinces: [Pop32] = []
        each(CoreGolden.splitsPop32) { whole, weights, expected, claimed, clamps in
            XCTAssertEqual(splitter.split(Pop(raw: whole), by: weights, into: &provinces), claimed == 1)
            XCTAssertEqual(provinces.map { $0.raw }, expected, "\(whole) people by \(weights)")
            return clamps
        }
        // a tie goes to the larger weight: the party with 30 votes, not the one with 10
        splitter.split(5, by: [10, 30, 60], into: &parts)
        XCTAssertEqual(parts, [0, 2, 3])
        // nobody has a claim: equal shares by the same rule, and the caller is told
        XCTAssertFalse(splitter.split(10, by: [0, 0, 0], into: &parts))
        XCTAssertEqual(parts, [4, 3, 3])
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

    /// The general form reads each weight once, so a weight that changes between reads cannot break the sum; it takes
    /// any random-access collection, a slice included; and a list longer than the room makes it grow once.
    func testTheGeneralFormReadsEachWeightOnce() {
        var splitter = ShareSplitter()
        var parts: [Int64] = []
        var reads = 0
        splitter.split(10, by: [1, 1, 1], into: &parts, weight: { _ in reads += 1; return Int64(reads) }, part: { $0 })
        XCTAssertEqual(reads, 3)
        XCTAssertEqual(parts.reduce(0, +), 10)
        XCTAssertEqual(parts, [2, 3, 5])
        let weights: [Int64] = [9, 9, 1, 2, 3, 9]
        splitter.split(60, by: weights[2..<5], into: &parts, weight: { $0 }, part: { $0 })
        XCTAssertEqual(parts, [10, 20, 30])
        var grown = ShareSplitter(capacity: 2)
        grown.split(1_000, by: [Int64](repeating: 1, count: 500), into: &parts)
        XCTAssertGreaterThanOrEqual(grown.floors.capacity, 500)
        XCTAssertGreaterThanOrEqual(grown.weights.capacity, 500)
        XCTAssertGreaterThanOrEqual(grown.sorted.capacity, 500)
        XCTAssertGreaterThanOrEqual(parts.capacity, 500)
    }

    func testFinerChancesChoicesAndShuffles() {
        var chances = DetRNG(seed: 4, key: 4, stream: 4, serial: 4)
        each(CoreGolden.rngChanceIn) { n, d, hit, clamps in
            XCTAssertEqual(chances.chance(n, in: d), hit == 1, "\(n) in \(d)")
            return clamps
        }
        var hazards = DetRNG(seed: 3, key: 3, stream: 3, serial: 3)
        each(CoreGolden.rngChanceQ32) { p, hit, clamps in
            XCTAssertEqual(hazards.chance(Q32(raw: p)), hit == 1, "a chance of \(p)")
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
        XCTAssertTrue((50...150).contains(hits), "\(hits) hits of an expected 100")
        // a choice in proportion to the weights
        var counts = [0, 0, 0]
        for _ in 0..<60_000 { counts[g.pick([1, 2, 3]) ?? 0] += 1 }
        XCTAssertTrue((9_000...11_000).contains(counts[0]) && (19_000...21_000).contains(counts[1]), "\(counts)")
        // every order of three items comes up, about equally
        var orders: [[Int]: Int] = [:]
        for _ in 0..<60_000 {
            var items = [0, 1, 2]
            g.shuffle(&items)
            orders[items, default: 0] += 1
        }
        XCTAssertEqual(orders.count, 6)
        for (order, n) in orders { XCTAssertTrue((9_000...11_000).contains(n), "\(order) came \(n) times of 60,000") }
        // a sum past 64 bits: held, counted, and the weight at which it passes keeps the part that fits
        let wide = Saturation.counted { g.pick([2, Int64.max, Int64.max]) }
        XCTAssertNotNil(wide.result)
        XCTAssertEqual(wide.clamps, 1)
        // nothing to pick: nil, and the one draw is still made, so the next draw is the same as after a pick
        var a = DetRNG(seed: 2, key: 0, stream: 0, serial: 0)
        var b = a
        XCTAssertNil(a.pick([]))
        _ = b.pick([1, 1])
        XCTAssertEqual(a.next(), b.next())
        let negative = Saturation.counted { g.pick([0, -4]) }
        XCTAssertNil(negative.result)
        XCTAssertEqual(negative.clamps, 1, "a weight below 0 is counted, as in a split")
        // a slice's own index
        let ws: [Int64] = [0, 0, 0, 5, 0]
        XCTAssertEqual(g.pick(ws[3...]) { $0 }, 3)
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
        XCTAssertEqual(LCU(raw: 1_000).times(count: 3), LCU(raw: 3_000))
        XCTAssertEqual(LCU(raw: 1_000).times(BP(raw: 2_500)), LCU(raw: 250), "a share is a BP, a count is labelled")
    }

    /// The helpers' other sides: each one's zero divisor, its far end, and both bounds.
    func testEveryHelperOnBothSides() {
        let byZero = Saturation.counted { (LCU(raw: 5).ratio(to: LCU(raw: 0)), USDn(raw: 1).share(of: .zero)) }
        XCTAssertEqual(byZero.result.0, Q32.max)
        XCTAssertEqual(byZero.result.1.raw, Int32.max)
        XCTAssertEqual(byZero.clamps, 2, "a plain ratio by 0 is counted")
        XCTAssertEqual(USDn(raw: 1).share(of: USDn(raw: 20_000)), BP(raw: 1), "1 in 20,000 is 0.5 bp, rounded away from 0")
        XCTAssertEqual(Money(raw: .min).divided(by: .min), Money(raw: 1))
        let bigByZero = Saturation.counted { LCU(raw: 1 << 32).times(1 << 32, over: 0) }
        XCTAssertEqual(bigByZero.result.raw, Int64.max, "a product whose low word is 0 is not a product of 0")
        XCTAssertEqual(bigByZero.clamps, 1)
        XCTAssertEqual(Pop32(raw: -1) + Pop32(raw: -1), Pop32(raw: -2))
        XCTAssertEqual(Pop32(raw: 5) - Pop32(raw: 3), Pop32(raw: 2))
        var province = Pop32(raw: 5)
        province -= Pop32(raw: 7)
        XCTAssertEqual(province, Pop32(raw: -2))
        let low = Saturation.counted { Pop32(raw: .min) - Pop32(raw: 1) }
        XCTAssertEqual(low.result.raw, Int32.min)
        XCTAssertEqual(low.clamps, 1)
        XCTAssertEqual(Q32(-5).clamped(to: Q32(0)...Q32(1)), Q32(0))
        XCTAssertEqual(BP(raw: 20_000).clamped(to: BP.zero...BP.one), BP.one)
        XCTAssertEqual(LogQ(raw: -7).clamped(to: LogQ.zero...LogQ.zero), LogQ.zero)
        XCTAssertEqual(LCU(raw: -1).clamped(to: LCU(raw: 0)...LCU(raw: 4)), LCU(raw: 0))
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
