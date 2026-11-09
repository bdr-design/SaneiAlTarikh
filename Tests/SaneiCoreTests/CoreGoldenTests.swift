import XCTest
@testable import SaneiCore

/// Every vector of the reference model (tools/checks/core_reference.py) reproduced exactly, and the same number of
/// saturations counted while doing it.
final class CoreGoldenTests: XCTestCase {
    private func counted(_ expected: UInt64, file: StaticString = #filePath, line: UInt = #line, _ body: () -> Void) {
        let c = SaturationCounter()
        Saturation.counting(into: c, body)
        XCTAssertEqual(c.count, expected, "saturations counted", file: file, line: line)
    }

    func testQ32AddAndSubtract() {
        counted(CoreGolden.q32AddSaturations) {
            for (a, b, r) in CoreGolden.q32Add { XCTAssertEqual((Q32(raw: a) + Q32(raw: b)).raw, r, "\(a) + \(b)") }
        }
        counted(CoreGolden.q32SubSaturations) {
            for (a, b, r) in CoreGolden.q32Sub { XCTAssertEqual((Q32(raw: a) - Q32(raw: b)).raw, r, "\(a) - \(b)") }
        }
    }

    func testQ32MultiplyAndDivide() {
        counted(CoreGolden.q32MulSaturations) {
            for (a, b, r) in CoreGolden.q32Mul { XCTAssertEqual((Q32(raw: a) * Q32(raw: b)).raw, r, "\(a) * \(b)") }
        }
        counted(CoreGolden.q32DivSaturations) {
            for (a, b, r) in CoreGolden.q32Div { XCTAssertEqual((Q32(raw: a) / Q32(raw: b)).raw, r, "\(a) / \(b)") }
        }
        counted(CoreGolden.q32RatioSaturations) {
            for (a, b, r) in CoreGolden.q32Ratio { XCTAssertEqual(Q32(ratio: a, b).raw, r, "ratio \(a), \(b)") }
        }
    }

    func testQ32AppliedRoundedAndWhole() {
        counted(CoreGolden.q32ApplySaturations) {
            for (q, a, r) in CoreGolden.q32Apply { XCTAssertEqual(Q32(raw: q).applied(to: a), r, "\(q) applied to \(a)") }
        }
        counted(CoreGolden.q32RoundSaturations) {
            for (q, down, near) in CoreGolden.q32Round {
                XCTAssertEqual(Q32(raw: q).floor, down, "floor \(q)")
                XCTAssertEqual(Q32(raw: q).rounded, near, "rounded \(q)")
            }
        }
        counted(CoreGolden.q32FromIntSaturations) {
            for (i, r) in CoreGolden.q32FromInt { XCTAssertEqual(Q32(i).raw, r, "whole \(i)") }
        }
    }

    func testBP() {
        counted(CoreGolden.bpOfSaturations) {
            for (b, a, r) in CoreGolden.bpOf { XCTAssertEqual(BP(raw: b).of(a), r, "\(b) bp of \(a)") }
        }
        counted(CoreGolden.bpArithSaturations) {
            for (a, b, sum, difference, product) in CoreGolden.bpArith {
                XCTAssertEqual((BP(raw: a) + BP(raw: b)).raw, sum, "\(a) + \(b)")
                XCTAssertEqual((BP(raw: a) - BP(raw: b)).raw, difference, "\(a) - \(b)")
                XCTAssertEqual((BP(raw: a) * BP(raw: b)).raw, product, "\(a) * \(b)")
            }
        }
        counted(CoreGolden.bpRatioSaturations) {
            for (a, b, r) in CoreGolden.bpRatio { XCTAssertEqual(BP(ratio: a, b).raw, r, "ratio \(a), \(b)") }
        }
        counted(CoreGolden.bpQ32Saturations) {
            for (b, q, back) in CoreGolden.bpQ32 {
                let asNumber = Q32(BP(raw: b))
                XCTAssertEqual(asNumber.raw, q, "\(b) bp as a number")
                XCTAssertEqual(BP(asNumber).raw, back, "\(b) bp there and back")
            }
        }
        counted(CoreGolden.qToBPSaturations) {
            for (q, r) in CoreGolden.qToBP { XCTAssertEqual(BP(Q32(raw: q)).raw, r, "\(q) in bp") }
        }
    }

    func testExp2Log2AndScale() {
        counted(CoreGolden.exp2Saturations) {
            for (y, r) in CoreGolden.exp2 { XCTAssertEqual(DMath.exp2(LogQ(raw: y)).raw, r, "exp2 \(y)") }
        }
        counted(CoreGolden.log2Saturations) {
            for (x, r) in CoreGolden.log2 { XCTAssertEqual(DMath.log2(Q32(raw: x)).raw, r, "log2 \(x)") }
        }
        counted(CoreGolden.scaleSaturations) {
            for (a, y, r) in CoreGolden.scale { XCTAssertEqual(DMath.scale(a, by: LogQ(raw: y)), r, "\(a) scaled by \(y)") }
        }
    }

    func testRootsAndLogistic() {
        counted(CoreGolden.isqrtSaturations) {
            for (n, r) in CoreGolden.isqrt { XCTAssertEqual(DMath.isqrt(n), r, "isqrt \(n)") }
        }
        counted(CoreGolden.q32SqrtSaturations) {
            for (q, r) in CoreGolden.q32Sqrt { XCTAssertEqual(Q32(raw: q).squareRoot().raw, r, "sqrt \(q)") }
        }
        counted(CoreGolden.logisticSaturations) {
            for (x, r) in CoreGolden.logistic { XCTAssertEqual(DMath.logistic(Q32(raw: x)).raw, r, "logistic \(x)") }
        }
    }

    func testDetRNG() {
        var published = DetRNG(state: 1_234_567)
        for expected in CoreGolden.rngSeq { XCTAssertEqual(published.next(), expected) }
        for (seed, key, stream, serial, first, second, third) in CoreGolden.rngKeyed {
            var g = DetRNG(seed: seed, key: key, stream: stream, serial: serial)
            XCTAssertEqual(g.next(), first, "seed \(seed) key \(key) stream \(stream) serial \(serial)")
            XCTAssertEqual(g.next(), second)
            XCTAssertEqual(g.next(), third)
        }
        var below = DetRNG(seed: 7, key: 7, stream: 7, serial: 7)
        for (n, r) in CoreGolden.rngBelow { XCTAssertEqual(below.below(n), r, "below \(n)") }
        var shares = DetRNG(seed: 9, key: 9, stream: 9, serial: 9)
        for r in CoreGolden.rngBP { XCTAssertEqual(shares.bp().raw, r) }
    }

    func testDates() {
        for (y, m, d, days, weekday) in CoreGolden.dates {
            guard let date = GameDate(year: Int(y), month: Int(m), day: Int(d)) else {
                XCTFail("\(y)-\(m)-\(d) is a real day")
                continue
            }
            XCTAssertEqual(date.days, days, "\(y)-\(m)-\(d)")
            XCTAssertEqual(date.weekday, Int(weekday), "weekday of \(y)-\(m)-\(d)")
            let c = GameDate(days: days).civil
            XCTAssertEqual(c.year, Int(y))
            XCTAssertEqual(c.month, Int(m))
            XCTAssertEqual(c.day, Int(d))
        }
    }
}
