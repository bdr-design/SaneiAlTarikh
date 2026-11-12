import XCTest
import SaneiCore
@testable import SaneiEngine

final class LedgerTests: XCTestCase {
    private let start = GameDate(year: 2011, month: 1, day: 1)!

    /// Three governments with their accounts open, each in its own currency.
    private func world() -> (WorldState, [GovRef]) {
        var w = WorldState(start: start, seed: 1)
        var refs: [GovRef] = []
        for k in 0..<3 {
            let p = w.addPolity()!
            refs.append(w.createGovernment(polity: p, treasury: LCU(raw: 1_000_000 * Int64(k + 1)), taxBase: .zero, taxRate: .zero,
                                           strategicPeriod: 30)!)
        }
        // the Egyptian pound in 2011: about 5.95 to the dollar (LCU units of 1 pound, USDn units of $1,000: 5,950 to one)
        w.currencies.rate[1] = LogQ(ratio: 5_950, 1)
        return (w, refs)
    }

    /// Per account, the balance's change equals the month's postings in its own unit; the world account ends each month
    /// at 0 when trade is settled through it.
    func testEveryAccountConservesAndTheWorldAccountCloses() {
        var (w, g) = world()
        var r = DetRNG(seed: 3, key: 0, stream: 0, serial: 0)
        for month in 0..<24 {
            for _ in 0..<200 {
                let who = g[Int(r.below(3))]
                switch r.below(6) {
                case 0: w.post(who, .treasury, .tax, LCU(raw: Int64(r.below(50_000))))
                case 1: w.post(who, .domesticDebt, .interest, LCU(raw: -Int64(r.below(9_000))))
                case 2: w.exchange(who, local: LCU(raw: Int64(r.below(100_000)) - 50_000))
                case 3: w.post(moneyBase: Idx(raw: UInt16(r.below(3))), .spending, LCU(raw: Int64(r.below(70_000))))
                case 4: w.transfer(from: (who, .treasury), to: (who, .domesticDebt), .spending, LCU(raw: Int64(r.below(5_000))))
                default:
                    // a sale on the world market: the world account pays, then is paid by the buyer
                    let amount = USDn(raw: Int64(r.below(400)))
                    w.transfer(from: .world, to: .reserves(who), .trade, amount)
                    w.transfer(from: .reserves(g[Int(r.below(3))]), to: .world, .trade, amount)
                }
                XCTAssertTrue(w.ledgerViolations().isEmpty, "month \(month)")
            }
            XCTAssertEqual(w.ledger.world, .zero)
            XCTAssertEqual(w.closeMonth(), [], "month \(month)")
        }
        // a month that leaves the world account owed is caught at the close
        w.post(.world, .trade, USDn(raw: 5))
        XCTAssertEqual(w.closeMonth().count, 1)
    }

    func testAnExchangeIsExactInEachUnit() {
        var (w, g) = world()
        let pounds = w.ledger.balance(1, .treasury)
        let dollars = w.exchange(g[1], local: LCU(raw: 5_950_000))
        XCTAssertEqual(dollars, USDn(raw: 999), "5,950,000 pounds is $1,000,000, 1,000 units of $1,000, less the market's unit")
        XCTAssertEqual(w.ledger.balance(1, .treasury), pounds - LCU(raw: 5_950_000))
        XCTAssertEqual(w.ledger.reserves[1], USDn(raw: 999))
        // back the other way: the sale gives a unit more, so the round trip costs the government, never the market
        XCTAssertEqual(w.exchange(g[1], local: LCU(raw: -5_950_000)), USDn(raw: -1_001))
        XCTAssertEqual(w.ledger.balance(1, .treasury), pounds)
        XCTAssertEqual(w.ledger.reserves[1], USDn(raw: -2))
        XCTAssertTrue(w.ledgerViolations().isEmpty)
        // at every size, a buy gets at most its value at the rate and a sale gives at least its value: rounding never
        // makes money (5,950 pounds to one unit of $1,000)
        var r = DetRNG(seed: 11, key: 0, stream: 0, serial: 0)
        // at three rates: 5,950 pounds to a unit, 7 to a unit, and a unit for 3 (a strong currency)
        for (num, den) in [(Int64(5_950), Int64(1)), (7, 1), (1, 3)] {
            w.currencies.rate[1] = LogQ(ratio: num, den)
            for k in 0..<4_000 {
                let size = Int64(r.below(UInt64(1) << UInt64(20 + k % 40)))
                let amount = LCU(raw: k % 2 == 0 ? size + 6_000 : -size - 1)
                guard let d = w.exchange(g[1], local: amount) else { continue }
                // the value at the rate num/den: amount × den / num, compared without overflow by dividing
                let a = amount.raw.magnitude
                let floorValue = a / UInt64(num) * UInt64(den) + (a % UInt64(num)) * UInt64(den) / UInt64(num)
                if amount.raw > 0 {
                    XCTAssertLessThanOrEqual(UInt64(d.raw), floorValue, "a buy of \(amount.raw) at \(num)/\(den) gets at most its value")
                } else {
                    XCTAssertGreaterThanOrEqual(d.raw.magnitude, floorValue, "a sale of \(amount.raw) at \(num)/\(den) gives at least its value")
                }
            }
        }
        w.currencies.rate[1] = LogQ(ratio: 5_950, 1)
        XCTAssertTrue(w.ledgerViolations().isEmpty)
        w = world().0
        // a dollar leg that would round to 0 gives nothing for something: refused, counted
        let before = w.hash
        XCTAssertNil(w.exchange(g[1], local: LCU(raw: 2_974)))
        XCTAssertEqual(w.world.refusedPostings, 1)
        XCTAssertNotEqual(w.hash, before, "only the count moved")
        // a government that no longer exists: nothing moves, and each refusal is counted
        var gone = w
        XCTAssertTrue(Command.dissolveGovernment(government: g[2]).apply(to: &gone, by: .event))
        let balances = gone.ledger
        XCTAssertNil(gone.exchange(g[2], local: LCU(raw: 100)))
        XCTAssertFalse(gone.transfer(from: .world, to: .reserves(g[2]), .trade, USDn(raw: 7)))
        XCTAssertFalse(gone.post(g[2], .treasury, .tax, LCU(raw: 9)))
        XCTAssertFalse(gone.transfer(from: (g[0], .treasury), to: (g[2], .treasury), .aid, LCU(raw: 400)))
        XCTAssertEqual(gone.ledger, balances)
        XCTAssertEqual(gone.world.refusedPostings, 5)
        // and two currencies are never mixed in one local transfer
        XCTAssertFalse(w.transfer(from: (g[0], .treasury), to: (g[1], .treasury), .aid, LCU(raw: 400)))
    }

    /// A balance past 2^60 marks its currency; at the day's end every LCU amount in that currency is divided by 1,000:
    /// the balances, the money base, the tax bases and the commands waiting to make a government in it. Only that
    /// currency moves, the change is posted, and every invariant still holds.
    func testARedenominationRescalesEveryAmountInItsCurrency() {
        var (w, g) = world()
        w.governments.taxBase[1] = LCU(raw: 1_000_000_000)
        w.post(moneyBase: Idx(raw: 1), .spending, LCU(raw: 123_456_789))
        w.post(g[1], .domesticDebt, .spending, LCU(raw: -5_000_000))
        w.pending.append(IssuedCommand(day: start.adding(days: 3), issuer: .event, sequence: 1,
                                       command: .createGovernment(polity: Idx(raw: 1), treasury: LCU(raw: 7_000_000), taxBase: LCU(raw: 9_499), taxRate: .zero)))
        let otherBefore = w.ledger.balance(0, .treasury)
        let rateBefore = w.currencies.rate[1]
        // a flow of two legs: the first passes 2^60, the second is still in the same scale
        let x = LCU(raw: (1 << 60) + 5)
        w.post(g[1], .treasury, .spending, x)
        XCTAssertTrue(w.currencies.redenominationDue[1])
        XCTAssertEqual(w.currencies.redenominations[1], 0, "not in the middle of a flow")
        w.post(g[1], .domesticDebt, .spending, -x)
        w.redenominateDue()
        XCTAssertEqual(w.currencies.redenominations[1], 1)
        XCTAssertFalse(w.currencies.redenominationDue[1])
        XCTAssertEqual(w.currencies.scaleExponent[1], 3)
        XCTAssertEqual(w.currencies.redenominations[0], 0, "only the passing currency moves")
        XCTAssertEqual(w.ledger.balance(0, .treasury), otherBefore)
        XCTAssertEqual(w.currencies.moneyBase[1], LCU(raw: 123_457), "123,456,789 / 1,000 to the nearest")
        XCTAssertEqual(w.governments.taxBase[1], LCU(raw: 1_000_000))
        XCTAssertEqual(w.ledger.balance(1, .treasury), LCU(raw: 2_000 + (x.raw + 500) / 1_000), "(2,000,000 + x) / 1,000 to the nearest")
        guard case let .createGovernment(_, treasury, taxBase, _) = w.pending[0].command else { return XCTFail() }
        XCTAssertEqual(treasury, LCU(raw: 7_000))
        XCTAssertEqual(taxBase, LCU(raw: 9))
        XCTAssertEqual(w.currencies.rate[1], rateBefore + LogQ(ratio: 1, 1_000))
        XCTAssertTrue(w.ledgerViolations().isEmpty)
        XCTAssertEqual(w.closeMonth(), [])
        // dollars never redenominate
        w.post(.reserves(g[0]), .trade, USDn(raw: .max / 2))
        w.redenominateDue()
        XCTAssertEqual(w.currencies.redenominations[0], 0)
    }

    /// The pipeline closes the month on day 1, after the calendar jobs; taxes are posted, not written; a currency that
    /// passes 2^60 redenominates at the day's end and the next taxes come in the new scale.
    func testThePipelineClosesEveryMonthAndRedenominatesAtTheDaysEnd() {
        var w = WorldState(start: start, seed: 1)
        for _ in 0..<50 { _ = w.addPolity() }
        var sim = Simulation(state: w)
        for p in 0..<50 {
            sim.submit(IssuedCommand(day: start, issuer: .event, sequence: UInt64(p),
                                     command: .createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: 10), taxBase: LCU(raw: 7_777), taxRate: BP(raw: 1_234))))
        }
        sim.advance(days: 800)
        XCTAssertEqual(sim.state.world.ledgerFailures, 0)
        XCTAssertTrue(sim.state.ledgerViolations().isEmpty)
        // the books opened again on this month's first day: only the governments whose slot has come since have posted
        let ran = sim.state.world.date.day - 1
        let revenue = LCU(raw: 7_777).times(BP(raw: 1_234))
        for row in 0..<50 {
            let slot = Int(sim.state.governments.monthlySlot[row])
            XCTAssertEqual(sim.state.ledger.localPosted[LedgerTable.index(row, .treasury)], slot <= ran ? revenue : .zero,
                           "government \(row), slot \(slot)")
        }
        // a hyperinflation: government 0's tax base is huge, its treasury passes 2^60 on its slot day
        let g = sim.state.governments.ref(0)
        sim.state.governments.taxBase[0] = LCU(raw: Int64(1) << 61)
        sim.state.governments.taxRate[0] = .one
        sim.advance(days: 31)
        XCTAssertEqual(sim.state.currencies.redenominations[0], 1)
        XCTAssertEqual(sim.state.governments.taxBase[0], LCU(raw: (Int64(1) << 61) / 1_000 + 1), "2^61 / 1,000 to the nearest")
        XCTAssertTrue(sim.state.governments.isLive(g))
        sim.advance(days: 62)
        XCTAssertEqual(sim.state.currencies.redenominations[0], 1, "the next taxes are in the new scale: no second one")
        XCTAssertEqual(sim.state.world.ledgerFailures, 0)
    }

    /// No posting clamps: one that would pass the range is refused and counted, so the invariant sees every posting; a
    /// starting amount past 2^60 is refused; a flow that passes 2^60 and comes back the same day leaves the currency as
    /// it is.
    func testNothingClampsAndOnlyAStandingBalanceRedenominates() {
        var (w, g) = world()
        XCTAssertTrue(w.post(moneyBase: Idx(raw: 0), .cheat, LCU(raw: .max)))
        XCTAssertFalse(w.post(moneyBase: Idx(raw: 0), .cheat, LCU(raw: 1_000)), "it would clamp")
        XCTAssertEqual(w.world.refusedPostings, 1)
        XCTAssertTrue(w.ledgerViolations().isEmpty)
        XCTAssertFalse(w.transfer(from: .world, to: .world, .trade, USDn(raw: .min)))
        XCTAssertFalse(w.exchange(g[0], local: LCU(raw: .min)) != nil)
        w.redenominateDue()
        XCTAssertEqual(w.currencies.redenominations[0], 1, "the money base stood past 2^60 at the day's end")
        // a flow past 2^60 and back the same day
        let before = w.ledger.balance(1, .treasury)
        w.post(g[1], .treasury, .spending, LCU(raw: (1 << 60) + 1))
        w.post(g[1], .treasury, .spending, LCU(raw: -((1 << 60) + 1)))
        w.redenominateDue()
        XCTAssertEqual(w.currencies.redenominations[1], 0)
        XCTAssertEqual(w.ledger.balance(1, .treasury), before)
        XCTAssertFalse(w.currencies.redenominationDue[1])
        // a starting treasury or tax base past 2^60 is refused
        let big = LCU(raw: (1 << 60) + 1)
        XCTAssertFalse(Command.createGovernment(polity: Idx(raw: 0), treasury: big, taxBase: .zero, taxRate: .zero).validate(w, by: .event))
        XCTAssertFalse(Command.createGovernment(polity: Idx(raw: 0), treasury: .zero, taxBase: big, taxRate: .one).validate(w, by: .event))
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 1 << 60), taxBase: LCU(raw: 1 << 60), taxRate: .one).validate(w, by: .event))
    }

    /// The stored numbers never change: each by its name. And the accounts are where the design puts them: the money
    /// base is the currency's (§5.1).
    func testTheStoredNumbersAndTheAccounts() {
        let (w, _) = world()
        let numbers: [(PostingCategory, UInt16)] = [(.tax, 1), (.spending, 2), (.fx, 3), (.revaluation, 4), (.trade, 5), (.transport, 6),
                                                    (.aid, 7), (.redenomination, 8), (.cheat, 9), (.interest, 10)]
        for (c, n) in numbers { XCTAssertEqual(c.rawValue, n, "\(c)") }
        XCTAssertEqual(PostingCategory.allCases.count, numbers.count)
        XCTAssertEqual(LocalAccount.treasury.rawValue, 0)
        XCTAssertEqual(LocalAccount.domesticDebt.rawValue, 1)
        XCTAssertEqual(w.currencies.moneyBase.count, 3)
        XCTAssertEqual(w.currency(of: Idx(raw: 2)), Idx(raw: 2))
    }
}
