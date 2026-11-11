import XCTest
@testable import SaneiCore

/// Properties of the fixed-point types that hold for any value: the vectors (CoreGoldenTests) fix single results, these
/// fix the rules.
final class FixedPointTests: XCTestCase {
    /// A stream of test values, the same on every run.
    private func values(_ count: Int, bits: UInt64, stream: UInt32) -> [Int64] {
        var g = DetRNG(seed: 2011, key: 0, stream: stream, serial: 0)
        // `bits` random bits, centred on zero
        return (0..<count).map { _ in Int64(truncatingIfNeeded: (g.next() >> (64 - bits)) &- (UInt64(1) << (bits - 1))) }
    }

    func testSaturationIsCountedOnlyInsideAScope() {
        // no scope: a clamp is still a clamp, and nobody counts it
        XCTAssertEqual((Q32.max + Q32.one).raw, Int64.max)
        XCTAssertFalse(Saturation.isCounting)
        let game = SaturationCounter()
        let other = SaturationCounter()
        Saturation.counting(into: game) {
            XCTAssertTrue(Saturation.isCounting)
            _ = Q32.max + Q32.one
            _ = Q32.min - Q32.one
            _ = -Q32.min
            _ = Q32.one / Q32.zero
            // a scope inside another counts for itself only
            Saturation.counting(into: other) { _ = Q32.max * Q32.max }
            _ = Q32.one + Q32.one                    // in range: not counted
        }
        XCTAssertEqual(game.count, 4)
        XCTAssertEqual(other.count, 1)
        XCTAssertFalse(Saturation.isCounting)
        XCTAssertEqual((-Q32.min).raw, Int64.max, "the opposite of the lowest number is the highest")
        // the form that hands the count back with the result
        let sum = Saturation.counted { Q32.max + Q32.max + Q32.one }
        XCTAssertEqual(sum.result, Q32.max)
        XCTAssertEqual(sum.clamps, 2)
        // it is a scope of its own: inside another scope, the outer counter does not see its clamps
        let outer = SaturationCounter()
        let inner = Saturation.counting(into: outer) { () -> UInt64 in
            _ = Q32.max + Q32.one
            return Saturation.counted {
                _ = Q32.max + Q32.one
                _ = Q32.min - Q32.one
            }.clamps
        }
        XCTAssertEqual(inner, 2)
        XCTAssertEqual(outer.count, 1)
        // a quotient by zero is «does not fit», never a trap (the callers answer zero themselves; this is the floor)
        XCTAssertNil(FixedMath.quotient(high: 0, low: 5, by: 0))
        XCTAssertNil(FixedMath.quotient(high: 1, low: 5, by: 0))
        XCTAssertNil(FixedMath.quotient(high: 0, low: 0, by: 0))
        // a scope that ends by an error has still counted, and is over
        struct Stop: Error {}
        let broken = SaturationCounter()
        XCTAssertThrowsError(try Saturation.counting(into: broken) {
            _ = Q32.max + Q32.one
            throw Stop()
        })
        XCTAssertEqual(broken.count, 1)
        XCTAssertFalse(Saturation.isCounting)
    }

    /// A parallel burst (ADR 0002): each child counts its own clamps and hands the count back in its result; the
    /// parent adds them up. No two tasks ever write one counter.
    func testEachChildOfABurstCountsItsOwn() async {
        let total = await withTaskGroup(of: UInt64.self, returning: UInt64.self) { group in
            for child in 0..<8 {
                group.addTask {
                    Saturation.counted {
                        // long enough for the children to run at the same time: a counter they shared would lose counts
                        for _ in 0..<(200_000 + child) { _ = Q32.max + Q32.one }
                    }.clamps
                }
            }
            var sum: UInt64 = 0
            for await clamps in group { sum += clamps }
            return sum
        }
        XCTAssertEqual(total, 1_600_028, "8 children, 200,000 to 200,007 clamps each")
        XCTAssertFalse(Saturation.isCounting)
        // a scope bound inside a task (the engine's case) counts the same way
        let c = SaturationCounter()
        Saturation.counting(into: c) { _ = Q32.max + Q32.one }
        XCTAssertEqual(c.count, 1)
    }

    /// The long scope (ADR 0002): one around a whole run of ticks. It follows its task across awaits, and a burst
    /// inside it works as the engine's must: every child counts its own clamps and the parent adds them up.
    func testTheLongScopeFollowsItsTask() async {
        let c = SaturationCounter()
        let fromChildren = await Saturation.countingAcrossAwaits(into: c) { () async -> UInt64 in
            _ = Q32.max + Q32.one
            await Task.yield()
            XCTAssertTrue(Saturation.isCounting)
            _ = Q32.max + Q32.one
            let burst = await withTaskGroup(of: UInt64.self, returning: UInt64.self) { group in
                for _ in 0..<4 {
                    group.addTask {
                        Saturation.counted {
                            for _ in 0..<50_000 { _ = Q32.max + Q32.one }
                        }.clamps
                    }
                }
                var sum: UInt64 = 0
                for await clamps in group { sum += clamps }
                return sum
            }
            XCTAssertTrue(Saturation.isCounting, "still inside after the burst")
            _ = Q32.max + Q32.one
            return burst
        }
        XCTAssertEqual(c.count, 3, "the scope's own clamps, before and after its awaits; none of the children's")
        XCTAssertEqual(fromChildren, 200_000)
        XCTAssertFalse(Saturation.isCounting)
        // an error ends it like any scope
        struct Stop: Error {}
        do {
            try await Saturation.countingAcrossAwaits(into: c) {
                _ = Q32.max + Q32.one
                await Task.yield()
                throw Stop()
            }
            XCTFail("the error must come out")
        } catch {}
        XCTAssertEqual(c.count, 4)
        XCTAssertFalse(Saturation.isCounting)
    }

    /// The silent cases the ADR names: a clamp outside every scope is not counted. A detached task starts outside;
    /// an actor's method called from outside a scope is outside (a scope cannot hold an `await`, so it never reaches
    /// across one). An unstructured `Task { }` started inside a scope copies the scope: the rule against it.
    func testWhoIsNotCounted() async {
        let c = SaturationCounter()
        let started = Saturation.counting(into: c) {
            (detached: Task.detached { Saturation.isCounting }, copied: Task { Saturation.isCounting })
        }
        let detachedCounts = await started.detached.value
        let copiedCounts = await started.copied.value
        XCTAssertFalse(detachedCounts, "a detached task starts outside every scope")
        XCTAssertTrue(copiedCounts, "an unstructured task copies the scope it was started in")
        let outside = Clamper()
        let seenInside = await outside.clampUnbound()
        XCTAssertFalse(seenInside, "an actor called from outside a scope is outside")
        let own = await outside.clampInItsOwnScope()
        XCTAssertEqual(own, 1, "an actor's method counts when it binds a scope itself")
        XCTAssertEqual(c.count, 0)
    }

    func testQ32Rules() {
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            let xs = values(400, bits: 44, stream: 1)
            let ys = values(400, bits: 40, stream: 2)
            for (x, y) in zip(xs, ys) {
                let a = Q32(raw: x)
                let b = Q32(raw: y)
                XCTAssertEqual(a * .one, a)
                XCTAssertEqual(a / .one, a)
                XCTAssertEqual(a * b, b * a)
                XCTAssertEqual(-(a * b), (-a) * b, "the sign never changes the size")
                XCTAssertEqual(-(a / (b + .one)), (-a) / (b + .one))
                XCTAssertEqual(a + b - b, a)
                XCTAssertEqual(a.applied(to: 1), a.rounded)
                XCTAssertEqual(Q32(a.floor) <= a, true)
            }
        }
        XCTAssertEqual(c.count, 0, "none of these leaves the range")
        // ties go away from zero: half of the smallest step is one step
        XCTAssertEqual((Q32(raw: 1) * Q32(raw: 1 << 31)).raw, 1)
        XCTAssertEqual((Q32(raw: -1) * Q32(raw: 1 << 31)).raw, -1)
        XCTAssertEqual((Q32(raw: 1) * Q32(raw: (1 << 31) - 1)).raw, 0)
        XCTAssertEqual(Q32(raw: 3 << 31).rounded, 2)           // 1.5
        XCTAssertEqual(Q32(raw: -(3 << 31)).rounded, -2)
        XCTAssertEqual(Q32(raw: -(3 << 31)).floor, -2)
        XCTAssertEqual(Q32(ratio: 1, 2).raw, 1 << 31)
        XCTAssertEqual(Q32(7).raw, 7 << 32)
        XCTAssertEqual(Q32.one, Q32(1))
        XCTAssertTrue(Q32(ratio: 1, 3) < Q32(ratio: 1, 2))
        XCTAssertFalse(Q32.one < Q32.one)
        XCTAssertTrue(Q32.min < Q32.max)
        XCTAssertTrue(LogQ(raw: -1) < LogQ.zero)
        XCTAssertFalse(LogQ.zero < LogQ.zero)
        XCTAssertTrue(BP(raw: -1) < BP.zero)
        XCTAssertFalse(BP.one < BP.one)
        XCTAssertTrue(GameDate.min < GameDate.max)
    }

    func testBPRules() {
        XCTAssertEqual((BP(raw: 5_000) * BP(raw: 5_000)).raw, 2_500)
        XCTAssertEqual(BP(ratio: 1, 3).raw, 3_333)
        XCTAssertEqual(BP(ratio: 2, 3).raw, 6_667)
        XCTAssertEqual(BP(ratio: -2, 3).raw, -6_667)
        XCTAssertEqual(BP.one.raw, 10_000)
        XCTAssertEqual(Q32(BP.one), Q32.one)
        XCTAssertEqual(BP(Q32.one), BP.one)
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            for x in values(400, bits: 64, stream: 3) + [Int64.max, Int64.min, 0, 1, -1] {
                XCTAssertEqual(BP.one.of(x), x, "the whole of an amount is the amount, at any size")
                XCTAssertEqual(BP.zero.of(x), 0)
                XCTAssertEqual(BP(raw: -10_000).of(x), x == .min ? .max : -x, "x = \(x)")
            }
            for x in values(400, bits: 60, stream: 4) {
                // a share and the rest make the whole, to within the rounding of each part
                let part = BP(raw: 3_700).of(x) + BP(raw: 6_300).of(x)
                XCTAssertLessThanOrEqual(abs(part - x), 1)
                XCTAssertEqual(BP(raw: 2_500).of(x), -BP(raw: 2_500).of(-x))
            }
        }
        XCTAssertEqual(c.count, 1, "only the opposite of the lowest amount leaves the range")
        XCTAssertEqual(BP(raw: 15).of(1_000), 2)               // 1.5 rounds away from zero
        XCTAssertEqual(BP(raw: 15).of(-1_000), -2)
        XCTAssertEqual(BP(raw: 14).of(1_000), 1)
    }

    func testLevelsAsLogarithms() {
        XCTAssertEqual(LogQ(level: Q32.one), LogQ.zero)
        XCTAssertEqual(LogQ.zero.level, Q32.one)
        let double = LogQ(raw: 1 << 32)
        XCTAssertEqual(double.level, Q32(2))
        XCTAssertEqual(double.applied(to: 1_000), 2_000)
        XCTAssertEqual((-double).applied(to: 1_000), 500)
        XCTAssertEqual((double + double + double).applied(to: 1), 8)
        // whole powers of two are exact both ways
        for k in -20...30 {
            let level = Q32(raw: Int64(1) << Int64(32 + k))
            XCTAssertEqual(LogQ(level: level).raw, Int64(k) << 32, "log2 of 2^\(k)")
            XCTAssertEqual(LogQ(raw: Int64(k) << 32).level, level, "2^\(k)")
        }
        // there and back within one part in a million (§2.3), and never out of order
        var previous = Int64.min
        var g = DetRNG(seed: 2011, key: 0, stream: 5, serial: 0)
        var samples = (0..<600).map { _ in Int64(truncatingIfNeeded: g.next() >> 2) | (1 << 32) }
        samples.sort()
        for x in samples {
            let log = DMath.log2(Q32(raw: x))
            XCTAssertGreaterThanOrEqual(log.raw, previous, "log2 keeps the order")
            previous = log.raw
            let back = DMath.exp2(log).raw
            let off = (back - x).magnitude.multipliedFullWidth(by: 1_000_000)
            XCTAssertTrue(off.high == 0 && off.low <= UInt64(x), "2^(log2 x) is within 1e-6 of x = \(x): \(back)")
        }
        // a level far beyond Q32 still scales money: 2^40 times 3, and back
        let huge = LogQ(raw: 40 << 32)
        XCTAssertEqual(huge.applied(to: 3), 3 << 40)
        XCTAssertEqual((-huge).applied(to: 3 << 40), 3)
        XCTAssertEqual(huge.level, Q32.max, "the level itself does not fit and clamps")
    }

    func testRootsAndTheLogisticCurve() {
        var g = DetRNG(seed: 2011, key: 0, stream: 6, serial: 0)
        for _ in 0..<2_000 {
            let n = g.next() >> (g.next() % 64)
            let r = DMath.isqrt(n)
            let below = r.multipliedFullWidth(by: r)
            XCTAssertTrue(below.high == 0 && below.low <= n, "isqrt(\(n)) squared is not above n")
            let above = (r + 1).multipliedFullWidth(by: r + 1)
            XCTAssertTrue(above.high > 0 || above.low > n, "isqrt(\(n)) + 1 squared is above n")
        }
        XCTAssertEqual(Q32(4).squareRoot(), Q32(2))
        XCTAssertEqual(Q32(ratio: 1, 4).squareRoot(), Q32(ratio: 1, 2))
        XCTAssertEqual(Q32(1_000_000).squareRoot(), Q32(1_000))
        XCTAssertEqual(DMath.logistic(.zero), Q32(ratio: 1, 2))
        XCTAssertEqual(DMath.logistic(Q32(100)), Q32.one)
        XCTAssertEqual(DMath.logistic(Q32(-100)), Q32.zero)
        var previous = Q32.zero
        for step in -400...400 {
            let x = Q32(ratio: Int64(step), 10)
            let y = DMath.logistic(x)
            XCTAssertEqual((y + DMath.logistic(-x)).raw, Q32.one.raw, "the curve is symmetric at \(step)")
            XCTAssertGreaterThanOrEqual(y, previous, "the curve never falls")
            previous = y
        }
    }

    func testMoneyKeepsItsUnit() {
        let treasury = LCU(raw: 1_000_000)
        XCTAssertEqual((treasury + LCU(raw: 500)).raw, 1_000_500)
        XCTAssertEqual((treasury - LCU(raw: 500)).raw, 999_500)
        XCTAssertEqual((-treasury).raw, -1_000_000)
        XCTAssertEqual(treasury.times(BP(raw: 2_250)).raw, 225_000)
        XCTAssertEqual(treasury.times(Q32(ratio: 3, 2)).raw, 1_500_000)
        XCTAssertEqual(treasury.times(LogQ(raw: 1 << 32)).raw, 2_000_000)
        XCTAssertTrue(LCU(raw: 5) < LCU(raw: 6))
        XCTAssertEqual(LCU.zero.raw, 0)
        var reserves = USDn(raw: 10)
        reserves += USDn(raw: 5)
        reserves -= USDn(raw: 1)
        XCTAssertEqual(reserves, USDn(raw: 14))
        // constant dollars: nominal dollars over the deflator
        XCTAssertEqual(Money(USDn(raw: 3_000), deflator: .zero).raw, 3_000)
        XCTAssertEqual(Money(USDn(raw: 3_000), deflator: LogQ(raw: 1 << 32)).raw, 1_500)
        XCTAssertFalse(LCU(raw: 1 << 60).needsRedenomination)
        XCTAssertTrue(LCU(raw: (1 << 60) + 1).needsRedenomination)
        XCTAssertTrue(LCU(raw: -(1 << 60) - 1).needsRedenomination)
        let c = SaturationCounter()
        Saturation.counting(into: c) { _ = LCU(raw: .max) + LCU(raw: 1) }
        XCTAssertEqual(c.count, 1)
    }

    /// The seed, the key, the stream and the serial are mixed in apart. The fault this guards: with the seed and the
    /// key added first, the game with seed 2012 rolled on each day what the game with seed 2011 rolled on the next.
    func testNoTwoGamesShareADay() {
        var firsts = Set<UInt64>()
        for seed in UInt64(2_000)..<2_040 {
            for key in Int64(14_960)..<15_000 {
                var g = DetRNG(seed: seed, key: key, stream: 3, serial: 77)
                firsts.insert(g.next())
            }
        }
        XCTAssertEqual(firsts.count, 40 * 40, "40 seeds on 40 days: every first draw is its own")
        var seedOne = DetRNG(seed: 1, key: 0, stream: 0, serial: 0)
        var keyOne = DetRNG(seed: 0, key: 1, stream: 0, serial: 0)
        XCTAssertNotEqual(seedOne.next(), keyOne.next())
        var streamOne = DetRNG(seed: 0, key: 0, stream: 1, serial: 0)
        var serialOne = DetRNG(seed: 0, key: 0, stream: 0, serial: 1)
        XCTAssertNotEqual(streamOne.next(), serialOne.next())
    }

    func testRandomDrawsDependOnlyOnTheirKeys() {
        var a = DetRNG(seed: 1, key: 14_975, stream: 2, serial: 3)
        var b = DetRNG(seed: 1, key: 14_975, stream: 2, serial: 3)
        var otherStream = DetRNG(seed: 1, key: 14_975, stream: 3, serial: 3)
        var otherDay = DetRNG(seed: 1, key: 14_976, stream: 2, serial: 3)
        var otherSeed = DetRNG(seed: 2, key: 14_975, stream: 2, serial: 3)
        var otherSerial = DetRNG(seed: 1, key: 14_975, stream: 2, serial: 4)
        let first = a.next()
        XCTAssertEqual(first, b.next())
        XCTAssertNotEqual(first, otherStream.next())
        XCTAssertNotEqual(first, otherDay.next())
        XCTAssertNotEqual(first, otherSeed.next())
        XCTAssertNotEqual(first, otherSerial.next())
        // a generator is a value: a copy repeats the draws of the original
        var copy = a
        XCTAssertEqual(a.next(), copy.next())
        XCTAssertEqual(a.below(1_000), copy.below(1_000))
        var g = DetRNG(seed: 99, key: 0, stream: 0, serial: 0)
        var buckets = [Int](repeating: 0, count: 10)
        for _ in 0..<10_000 {
            let v = g.below(10)
            XCTAssertLessThan(v, 10)
            buckets[Int(v)] += 1
        }
        for (i, n) in buckets.enumerated() { XCTAssertTrue((850...1_150).contains(n), "bucket \(i) has \(n) of 10,000") }
        XCTAssertEqual(g.below(0), 0)
        XCTAssertEqual(g.below(1), 0)
        var hits = 0
        for _ in 0..<10_000 {
            XCTAssertFalse(g.chance(BP.zero))
            XCTAssertTrue(g.chance(BP.one))
            if g.chance(BP(raw: 2_500)) { hits += 1 }
            let share = g.bp()
            XCTAssertTrue(share >= .zero && share < .one)
        }
        XCTAssertTrue((2_300...2_700).contains(hits), "a 25% chance hit \(hits) of 10,000")
    }
}

/// An actor that clamps: outside every scope when it is called from outside one.
private actor Clamper {
    func clampUnbound() -> Bool {
        _ = Q32.max + Q32.one
        return Saturation.isCounting
    }

    func clampInItsOwnScope() -> UInt64 {
        Saturation.counted { _ = Q32.max + Q32.one }.clamps
    }
}
