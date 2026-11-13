import XCTest
@testable import SaneiCore

/// The edges the Core verification's planted faults got past (2026-11-13): each test passes on the code and fails on
/// its fault.
final class CoreEdgeTests: XCTestCase {
    /// A whole number is hashed as the 64-bit word it widens to: its sign and its high bits count (the engine hashes its
    /// dates and counters through this overload).
    func testAWholeNumberIsHashedAsItsWord() {
        func h<T: FixedWidthInteger>(_ v: T) -> UInt64 { var s = StateHasher(); s.combine(v); return s.value }
        func w(_ v: UInt64) -> UInt64 { var s = StateHasher(); s.combine(v); return s.value }
        for v: Int64 in [-1, 1, .min, .max, 1 << 40, -(1 << 40), 0x1_0000_0001, 0] {
            XCTAssertEqual(h(v), w(UInt64(bitPattern: v)), "\(v)")
        }
        XCTAssertNotEqual(h(Int64(-1)), h(Int64(1)), "the sign counts")
        XCTAssertNotEqual(h(Int64(0x1_0000_0001)), h(Int64(1)), "the high bits count")
        XCTAssertEqual(h(Int32(-1)), w(.max), "a signed value is sign-extended: -1 in every width")
        XCTAssertEqual(h(UInt32.max), w(0xFFFF_FFFF), "an unsigned one is not")
    }

    /// Ties on the 128-bit path of the division round away from 0, as on the fast path.
    func testDivisionTiesOnTheWidePathRoundAwayFromZero() {
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            XCTAssertEqual(Q32(raw: (1 << 32) + 1) / Q32(raw: 1 << 33), Q32(raw: (1 << 31) + 1))
            XCTAssertEqual(Q32(raw: -((1 << 32) + 1)) / Q32(raw: 1 << 33), Q32(raw: -((1 << 31) + 1)))
            XCTAssertEqual(LCU(raw: (1 << 62) + 1).times(8, over: 16), LCU(raw: (1 << 61) + 1))
            XCTAssertEqual(LCU(raw: -((1 << 62) + 1)).times(8, over: 16), LCU(raw: -((1 << 61) + 1)))
        }
        XCTAssertEqual(c.count, 0)
    }

    /// A ratio in basis points held inside its bounds is never counted, also when the quotient passes 2^63.
    func testABoundedRatioInBasisPointsIsNeverCounted() {
        let c = SaturationCounter()
        Saturation.counting(into: c) {
            XCTAssertEqual(BP(ratio: .max, 6_000, within: BP(raw: .min)...BP(raw: .max)), BP(raw: .max))
            XCTAssertEqual(BP(ratio: .min, 6_000, within: BP(raw: .min)...BP(raw: .max)), BP(raw: .min))
        }
        XCTAssertEqual(c.count, 0)
    }

    /// A chance is true exactly when its draw is below it: at the draw itself false, one above it true (so a chance of
    /// 0 is never true, whatever the draw).
    func testAChanceIsTrueExactlyBelowItsDraw() {
        for key in Int64(0)..<200 {
            let g = DetRNG(seed: 2011, key: key, stream: 3, serial: 7)
            var copy = g
            let b = copy.bp()
            var at = g, above = g
            XCTAssertFalse(at.chance(b), "at the draw")
            XCTAssertTrue(above.chance(BP(raw: b.raw + 1)), "one above the draw")
            // the finer chance: the draw is the top 32 bits of the next word
            var q = g
            let d = Int64(q.next() >> 32)
            var atQ = g, aboveQ = g
            XCTAssertFalse(atQ.chance(Q32(raw: d)), "at the 2^-32 draw")
            XCTAssertTrue(aboveQ.chance(Q32(raw: d + 1)), "one above it")
        }
    }

    /// A removal that takes nothing leaves a table that shares its rows with a snapshot sharing them (nothing copied).
    func testARemovalThatTakesNothingCopiesNothing() {
        var t = HandleTable<Int64>(capacity: 64)
        for k in 0..<10 { _ = t.insert(Int64(k)) }
        let snapshot = t
        let before = snapshot.rows.withUnsafeBufferPointer { UInt(bitPattern: $0.baseAddress) }
        XCTAssertEqual(t.removeAll { _, _ in false }, 0)
        XCTAssertEqual(t.rows.withUnsafeBufferPointer { UInt(bitPattern: $0.baseAddress) }, before)
    }

    /// A splitter that needs more room takes twice its old room, so a list that creeps up grows rarely.
    func testASplitterGrowsByDoubling() {
        var s = ShareSplitter(capacity: 300)
        var parts: [Int64] = []
        XCTAssertTrue(s.split(1_000, by: [Int64](repeating: 1, count: 400), into: &parts))
        XCTAssertGreaterThanOrEqual(s.weights.capacity, 600)
    }

    /// A saved sheet never holds one term on two rows.
    func testASavedSheetRefusesATermTwice() {
        let a = TermID(raw: 3), b = TermID(raw: 4)
        XCTAssertNotNil(TermBuffer12<Q32>(saved: [(a, Q32(raw: 5)), (b, Q32(raw: 6))], hasBase: false, other: nil, total: Q32(raw: 11)))
        XCTAssertNil(TermBuffer12<Q32>(saved: [(a, Q32(raw: 5)), (a, Q32(raw: 6))], hasBase: false, other: nil, total: Q32(raw: 11)))
        XCTAssertNil(TermBuffer12<Q32>(saved: [(a, Q32(raw: 5)), (b, Q32(raw: 6)), (a, Q32(raw: 7))], hasBase: false, other: nil,
                                       total: Q32(raw: 18)), "a term again two rows on")
    }
}
