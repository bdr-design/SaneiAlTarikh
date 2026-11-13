import XCTest
@testable import SaneiCore
@testable import SaneiEngine

/// The save's writer and its loader agree on the ledger's bounds (the fix verification of 2026-11-13): over states set
/// at and around every bound, a state is written exactly when its tree loads, and what is written reads back equal.
final class SaveBoundsTests: XCTestCase {
    private let start = GameDate(year: 2011, month: 1, day: 1)!

    private struct Mix {
        var s: UInt64
        mutating func next() -> UInt64 {
            s &+= 0x9E37_79B9_7F4A_7C15
            var z = s
            z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
            z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
            return z ^ (z >> 31)
        }
        mutating func pick<T>(_ xs: [T]) -> T { xs[Int(next() % UInt64(xs.count))] }
    }

    /// Three polities and four governments: one dissolved (its balances stay), and a second in the first polity, so
    /// row 3's currency is not row 3's number.
    private func world() -> WorldState {
        var w = WorldState(start: start, seed: 1)
        var refs: [GovRef] = []
        for k in 0..<3 {
            let p = w.addPolity()!
            refs.append(w.createGovernment(polity: p, treasury: LCU(raw: 1_000 * Int64(k + 1)), taxBase: .zero, taxRate: .zero, strategicPeriod: 30)!)
        }
        _ = w.createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 5), taxBase: .zero, taxRate: .zero, strategicPeriod: 30)
        w.governments.dissolve(refs[2])
        XCTAssertEqual(w.ledger.currency.count, 4)
        XCTAssertEqual(w.ledger.currency[3], Idx(raw: 0))
        return w
    }

    private func meta(_ w: WorldState) -> SaveMeta { SaveMeta(formatVersion: 1, date: w.world.date.days, seed: w.world.seed) }

    private func loads(_ w: WorldState) -> Bool {
        var report = SaveReport()
        return WorldState.load(w.saveTree(), report: &report) != nil
    }

    func testTheWriterAndTheLoaderAgreeOnTheLedgersBounds() {
        let e = Int64(1) << 60, l = Int64(1) << 52
        let amounts: [Int64] = [0, 12_345, -98_765, e, -e, e - 1, e + 1, -e - 1, 2 * e, -2 * e, .max - 1, .min + 1]
        let logs: [Int64] = [0, 7 << 32, l, -l, l + 1, -l - 1, .max, .min]
        let scales: [UInt16] = [0, 3, 65_529, 65_532, 65_533, 65_535]
        var rng = Mix(s: 2011)
        var written = 0, refused = 0
        for _ in 0..<4_000 {
            var w = world()
            for _ in 0..<(1 + Int(rng.next() % 3)) {
                switch rng.next() % 6 {
                case 0, 1:                                         // an account: balance, opening and the month's sum kept
                    let i = Int(rng.next() % UInt64(w.ledger.local.count))
                    let b = rng.pick(amounts), o = rng.next() % 2 == 0 ? w.ledger.localOpening[i].raw : rng.pick(amounts)
                    let (p, over) = b.subtractingReportingOverflow(o)
                    if over { continue }
                    w.ledger.local[i] = LCU(raw: b); w.ledger.localOpening[i] = LCU(raw: o); w.ledger.localPosted[i] = LCU(raw: p)
                case 2:                                            // a money base
                    let c = Int(rng.next() % UInt64(w.currencies.moneyBase.count))
                    let b = rng.pick(amounts), o = rng.pick(amounts)
                    let (p, over) = b.subtractingReportingOverflow(o)
                    if over { continue }
                    w.currencies.moneyBase[c] = LCU(raw: b); w.currencies.moneyBaseOpening[c] = LCU(raw: o); w.currencies.moneyBasePosted[c] = LCU(raw: p)
                case 3: w.currencies.scaleExponent[Int(rng.next() % UInt64(w.currencies.scaleExponent.count))] = rng.pick(scales)
                case 4: w.currencies.rate[Int(rng.next() % UInt64(w.currencies.rate.count))] = LogQ(raw: rng.pick(logs))
                default: w.currencies.priceIndex[Int(rng.next() % UInt64(w.currencies.priceIndex.count))] = LogQ(raw: rng.pick(logs))
                }
            }
            let file = SaveCodec.write(w, meta: meta(w))
            XCTAssertEqual(file != nil, loads(w), "the writer refuses exactly what the loader refuses")
            if let file {
                written += 1
                guard case let .success(back) = SaveCodec.read(file) else { return XCTFail("written but not read") }
                XCTAssertEqual(back.state, w)
            } else { refused += 1 }
        }
        XCTAssertGreaterThan(written, 500)
        XCTAssertGreaterThan(refused, 500)
    }

    /// The ceiling each way, on an account and on a money base: past 65,532 a currency no longer redenominates and
    /// takes any amount; at 65,532 it still does, and 2^61 is refused.
    func testTheCeilingOnAccountsAndMoneyBases() {
        let big = Int64(1) << 61
        for (scale, taken) in [(UInt16(65_533), true), (UInt16(65_532), false)] {
            var w = world()
            w.currencies.scaleExponent[0] = scale
            w.currencies.moneyBase[0] = LCU(raw: big)
            w.currencies.moneyBaseOpening[0] = LCU(raw: big)
            w.currencies.moneyBasePosted[0] = .zero
            XCTAssertEqual(loads(w), taken, "a money base of 2^61 at the scale \(scale)")
            XCTAssertEqual(SaveCodec.write(w, meta: meta(w)) != nil, taken)
            var v = world()
            v.currencies.scaleExponent[0] = scale
            let i = LedgerTable.index(3, .treasury)                // row 3, in currency 0
            v.ledger.local[i] = LCU(raw: big)
            v.ledger.localOpening[i] = LCU(raw: big)
            v.ledger.localPosted[i] = .zero
            XCTAssertEqual(loads(v), taken, "a treasury of 2^61 at the scale \(scale)")
            XCTAssertEqual(SaveCodec.write(v, meta: meta(v)) != nil, taken)
        }
    }
}
