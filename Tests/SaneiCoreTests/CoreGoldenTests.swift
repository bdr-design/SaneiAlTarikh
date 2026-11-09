import XCTest
@testable import SaneiCore

/// Every row of the reference model (tools/checks/core_reference.py) reproduced exactly, with the clamps the reference
/// counted for that row and no others. The reference's own check fails when a family is not read here.
final class CoreGoldenTests: XCTestCase {
    /// Runs `row` on each row of a family under one counter. `row` returns the clamps the reference counted for it
    /// (the row's last number); the counter must have moved by exactly that much.
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

    func testQ32AddSubtractAndNegate() {
        each(CoreGolden.q32Add) { a, b, r, n in
            XCTAssertEqual((Q32(raw: a) + Q32(raw: b)).raw, r, "\(a) + \(b)")
            return n
        }
        each(CoreGolden.q32Sub) { a, b, r, n in
            XCTAssertEqual((Q32(raw: a) - Q32(raw: b)).raw, r, "\(a) - \(b)")
            return n
        }
        each(CoreGolden.q32Neg) { a, r, n in
            XCTAssertEqual((-Q32(raw: a)).raw, r, "-(\(a))")
            return n
        }
        // the assigning forms are the same operations
        each(CoreGolden.q32Add) { a, b, r, n in
            var x = Q32(raw: a)
            x += Q32(raw: b)
            XCTAssertEqual(x.raw, r, "\(a) += \(b)")
            return n
        }
        each(CoreGolden.q32Sub) { a, b, r, n in
            var x = Q32(raw: a)
            x -= Q32(raw: b)
            XCTAssertEqual(x.raw, r, "\(a) -= \(b)")
            return n
        }
    }

    /// Logarithms and money add, subtract and negate by the same rows: the same 64-bit sums, clamped the same way.
    func testLogQAndMoneyShareTheSums() {
        each(CoreGolden.q32Add) { a, b, r, n in
            XCTAssertEqual((LogQ(raw: a) + LogQ(raw: b)).raw, r, "log \(a) + \(b)")
            return n
        }
        each(CoreGolden.q32Sub) { a, b, r, n in
            XCTAssertEqual((LogQ(raw: a) - LogQ(raw: b)).raw, r, "log \(a) - \(b)")
            return n
        }
        each(CoreGolden.q32Neg) { a, r, n in
            XCTAssertEqual((-LogQ(raw: a)).raw, r, "log -(\(a))")
            return n
        }
        each(CoreGolden.q32Add) { a, b, r, n in
            var x = LogQ(raw: a)
            x += LogQ(raw: b)
            XCTAssertEqual(x.raw, r, "log \(a) += \(b)")
            return n
        }
        each(CoreGolden.q32Sub) { a, b, r, n in
            var x = LogQ(raw: a)
            x -= LogQ(raw: b)
            XCTAssertEqual(x.raw, r, "log \(a) -= \(b)")
            return n
        }
        each(CoreGolden.q32Add) { a, b, r, n in
            var x = LCU(raw: a)
            x += LCU(raw: b)
            XCTAssertEqual(x.raw, r, "money \(a) += \(b)")
            XCTAssertEqual((USDn(raw: a) + USDn(raw: b)).raw, r, "dollars \(a) + \(b)")
            return 2 * n
        }
        each(CoreGolden.q32Sub) { a, b, r, n in
            var x = USDn(raw: a)
            x -= USDn(raw: b)
            XCTAssertEqual(x.raw, r, "dollars \(a) -= \(b)")
            XCTAssertEqual((Money(raw: a) - Money(raw: b)).raw, r, "money \(a) - \(b)")
            return 2 * n
        }
        each(CoreGolden.q32Neg) { a, r, n in
            XCTAssertEqual((-LCU(raw: a)).raw, r, "money -(\(a))")
            return n
        }
    }

    func testQ32MultiplyAndDivide() {
        each(CoreGolden.q32Mul) { a, b, r, n in
            XCTAssertEqual((Q32(raw: a) * Q32(raw: b)).raw, r, "\(a) * \(b)")
            return n
        }
        each(CoreGolden.q32Mul) { a, b, r, n in
            var x = Q32(raw: a)
            x *= Q32(raw: b)
            XCTAssertEqual(x.raw, r, "\(a) *= \(b)")
            return n
        }
        each(CoreGolden.q32Div) { a, b, r, n in
            XCTAssertEqual((Q32(raw: a) / Q32(raw: b)).raw, r, "\(a) / \(b)")
            return n
        }
        each(CoreGolden.q32Ratio) { a, b, r, n in
            XCTAssertEqual(Q32(ratio: a, b).raw, r, "ratio \(a), \(b)")
            return n
        }
    }

    func testQ32AppliedRoundedAndWhole() {
        each(CoreGolden.q32Apply) { q, a, r, n in
            XCTAssertEqual(Q32(raw: q).applied(to: a), r, "\(q) applied to \(a)")
            return n
        }
        // money times a factor is the same product
        each(CoreGolden.q32Apply) { q, a, r, n in
            XCTAssertEqual(LCU(raw: a).times(Q32(raw: q)).raw, r, "\(a) times \(q)")
            return n
        }
        each(CoreGolden.q32Round) { q, down, near, n in
            XCTAssertEqual(Q32(raw: q).floor, down, "floor \(q)")
            XCTAssertEqual(Q32(raw: q).rounded, near, "rounded \(q)")
            return n
        }
        each(CoreGolden.q32FromInt) { i, r, n in
            XCTAssertEqual(Q32(i).raw, r, "whole \(i)")
            return n
        }
    }

    func testBPShares() {
        each(CoreGolden.bpOf) { b, a, r, n in
            XCTAssertEqual(BP(raw: b).of(a), r, "\(b) bp of \(a)")
            return n
        }
        // money times a share is the same product
        each(CoreGolden.bpOf) { b, a, r, n in
            XCTAssertEqual(USDn(raw: a).times(BP(raw: b)).raw, r, "\(a) times \(b) bp")
            return n
        }
        each(CoreGolden.bpRatio) { a, b, r, n in
            XCTAssertEqual(BP(ratio: a, b).raw, r, "ratio \(a), \(b)")
            return n
        }
        each(CoreGolden.bpToQ32) { b, q, n in
            XCTAssertEqual(Q32(BP(raw: b)).raw, q, "\(b) bp as a number")
            return n
        }
        each(CoreGolden.qToBP) { q, r, n in
            XCTAssertEqual(BP(Q32(raw: q)).raw, r, "\(q) in bp")
            return n
        }
    }

    func testBPArithmetic() {
        each(CoreGolden.bpAdd) { a, b, r, n in
            XCTAssertEqual((BP(raw: a) + BP(raw: b)).raw, r, "\(a) + \(b)")
            return n
        }
        each(CoreGolden.bpAdd) { a, b, r, n in
            var x = BP(raw: a)
            x += BP(raw: b)
            XCTAssertEqual(x.raw, r, "\(a) += \(b)")
            return n
        }
        each(CoreGolden.bpSub) { a, b, r, n in
            XCTAssertEqual((BP(raw: a) - BP(raw: b)).raw, r, "\(a) - \(b)")
            return n
        }
        each(CoreGolden.bpSub) { a, b, r, n in
            var x = BP(raw: a)
            x -= BP(raw: b)
            XCTAssertEqual(x.raw, r, "\(a) -= \(b)")
            return n
        }
        each(CoreGolden.bpMul) { a, b, r, n in
            XCTAssertEqual((BP(raw: a) * BP(raw: b)).raw, r, "\(a) * \(b)")
            return n
        }
        each(CoreGolden.bpNeg) { a, r, n in
            XCTAssertEqual((-BP(raw: a)).raw, r, "-(\(a))")
            return n
        }
    }

    func testExp2Log2AndScale() {
        each(CoreGolden.exp2) { y, r, n in
            XCTAssertEqual(DMath.exp2(LogQ(raw: y)).raw, r, "exp2 \(y)")
            return n
        }
        each(CoreGolden.exp2) { y, r, n in
            XCTAssertEqual(LogQ(raw: y).level.raw, r, "the level of \(y)")
            return n
        }
        each(CoreGolden.log2) { x, r, n in
            XCTAssertEqual(DMath.log2(Q32(raw: x)).raw, r, "log2 \(x)")
            return n
        }
        each(CoreGolden.log2) { x, r, n in
            XCTAssertEqual(LogQ(Q32(raw: x)).raw, r, "the logarithm of \(x)")
            return n
        }
        each(CoreGolden.scale) { a, y, r, n in
            XCTAssertEqual(DMath.scale(a, by: LogQ(raw: y)), r, "\(a) scaled by \(y)")
            return n
        }
        each(CoreGolden.scale) { a, y, r, n in
            XCTAssertEqual(LogQ(raw: y).applied(to: a), r, "\(y) applied to \(a)")
            XCTAssertEqual(LCU(raw: a).times(LogQ(raw: y)).raw, r, "\(a) times the level \(y)")
            return 2 * n
        }
    }

    func testRootsAndLogistic() {
        each(CoreGolden.isqrt) { v, r, n in
            XCTAssertEqual(DMath.isqrt(v), r, "isqrt \(v)")
            return n
        }
        each(CoreGolden.q32Sqrt) { q, r, n in
            XCTAssertEqual(Q32(raw: q).squareRoot().raw, r, "sqrt \(q)")
            return n
        }
        each(CoreGolden.logistic) { x, r, n in
            XCTAssertEqual(DMath.logistic(Q32(raw: x)).raw, r, "logistic \(x)")
            return n
        }
    }

    func testDetRNG() {
        // SplitMix64's published sequence for the state 1234567
        var published = DetRNG(state: 1_234_567)
        each(CoreGolden.rngSeq) { value, n in
            XCTAssertEqual(published.next(), value)
            return n
        }
        each(CoreGolden.rngKeyed) { seed, key, stream, serial, first, second, third, n in
            var g = DetRNG(seed: seed, key: key, stream: stream, serial: serial)
            XCTAssertEqual(g.next(), first, "seed \(seed) key \(key) stream \(stream) serial \(serial)")
            XCTAssertEqual(g.next(), second)
            XCTAssertEqual(g.next(), third)
            return n
        }
        var below = DetRNG(seed: 7, key: 7, stream: 7, serial: 7)
        each(CoreGolden.rngBelow) { limit, r, n in
            XCTAssertEqual(below.below(limit), r, "below \(limit)")
            return n
        }
        var shares = DetRNG(seed: 9, key: 9, stream: 9, serial: 9)
        each(CoreGolden.rngBP) { r, n in
            XCTAssertEqual(shares.bp().raw, r)
            return n
        }
        var chances = DetRNG(seed: 5, key: 5, stream: 5, serial: 5)
        each(CoreGolden.rngChance) { p, hit, n in
            XCTAssertEqual(chances.chance(BP(raw: p)), hit == 1, "a chance of \(p) bp")
            return n
        }
    }

    func testDates() {
        each(CoreGolden.dates) { y, m, d, days, weekday, n in
            guard let date = GameDate(year: Int(y), month: Int(m), day: Int(d)) else {
                XCTFail("\(y)-\(m)-\(d) is a real day")
                return n
            }
            XCTAssertEqual(date.days, days, "\(y)-\(m)-\(d)")
            XCTAssertEqual(date.weekday, Int(weekday), "weekday of \(y)-\(m)-\(d)")
            let c = GameDate(days: days).civil
            XCTAssertEqual(c.year, Int(y))
            XCTAssertEqual(c.month, Int(m))
            XCTAssertEqual(c.day, Int(d))
            return n
        }
        each(CoreGolden.monthFacts) { y, m, length, leap, n in
            XCTAssertEqual(GameDate.daysIn(month: Int(m), year: Int(y)), Int(length), "days in \(y)-\(m)")
            XCTAssertEqual(GameDate.isLeap(year: Int(y)), leap == 1, "leap \(y)")
            return n
        }
    }

    func testDateSteps() {
        each(CoreGolden.dateAddDays) { z, step, r, n in
            XCTAssertEqual(GameDate(days: z).adding(days: Int(step)).days, r, "day \(z) + \(step) days")
            return n
        }
        each(CoreGolden.dateAddMonths) { z, step, r, n in
            XCTAssertEqual(GameDate(days: z).adding(months: Int(step)).days, r, "day \(z) + \(step) months")
            return n
        }
        each(CoreGolden.startOfMonth) { z, r, n in
            XCTAssertEqual(GameDate(days: z).startOfMonth.days, r, "the month of day \(z)")
            return n
        }
    }

    func testConstantDollars() {
        each(CoreGolden.moneyDeflated) { nominal, deflator, r, n in
            XCTAssertEqual(Money(USDn(raw: nominal), deflator: LogQ(raw: deflator)).raw, r, "\(nominal) over \(deflator)")
            return n
        }
    }
}
