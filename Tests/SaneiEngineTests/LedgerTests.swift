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
                switch r.below(4) {
                case 0: w.post(who, .treasury, .tax, LCU(raw: Int64(r.below(50_000))))
                case 1: w.post(who, .domesticDebt, .interest, LCU(raw: -Int64(r.below(9_000))))
                case 2: w.exchange(who, local: LCU(raw: Int64(r.below(100_000)) - 50_000))
                default:
                    // a sale on the world market: the world account pays, then is paid by the buyer
                    let amount = USDn(raw: Int64(r.below(400)))
                    w.transfer(amount, from: .world, to: .reserves(who), .trade)
                    w.transfer(amount, from: .reserves(g[Int(r.below(3))]), to: .world, .trade)
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
        XCTAssertEqual(dollars, USDn(raw: 1_000), "5,950,000 pounds is about $1,000,000: 1,000 units of $1,000")
        XCTAssertEqual(w.ledger.balance(1, .treasury), pounds - LCU(raw: 5_950_000))
        XCTAssertEqual(w.ledger.reserves[1], dollars)
        // back the other way, at the same rate
        let back = w.exchange(g[1], local: LCU(raw: -5_950_000))
        XCTAssertEqual(back, USDn(raw: -1_000))
        XCTAssertEqual(w.ledger.balance(1, .treasury), pounds)
        XCTAssertTrue(w.ledgerViolations().isEmpty)
        // a government that no longer exists: nothing moves
        var gone = w
        XCTAssertTrue(Command.dissolveGovernment(government: g[2]).apply(to: &gone, strategicPeriod: 30))
        let before = gone.hash
        XCTAssertEqual(gone.exchange(g[2], local: LCU(raw: 100)), .zero)
        gone.transfer(USDn(raw: 7), from: .world, to: .reserves(g[2]), .trade)
        gone.post(g[2], .treasury, .tax, LCU(raw: 9))
        XCTAssertEqual(gone.hash, before)
    }

    /// A balance past 2^60 makes its currency redenominate at once: only that currency moves, by 10^3, the rounding is
    /// posted, and every invariant still holds.
    func testARedenominationKeepsEveryInvariant() {
        var (w, g) = world()
        w.post(g[1], .moneyBase, .spending, LCU(raw: 123_456_789))
        let otherBefore = w.ledger.balance(0, .treasury)
        let rateBefore = w.currencies.rate[1]
        w.post(g[1], .treasury, .spending, LCU(raw: (1 << 60) + 1))
        XCTAssertEqual(w.currencies.redenominations[1], 1)
        XCTAssertEqual(w.currencies.scaleExponent[1], 3)
        XCTAssertEqual(w.currencies.redenominations[0], 0, "only the passing currency moves")
        XCTAssertEqual(w.ledger.balance(0, .treasury), otherBefore)
        XCTAssertEqual(w.ledger.balance(1, .moneyBase), LCU(raw: 123_457), "123,456,789 / 1,000 to the nearest")
        XCTAssertLessThanOrEqual(w.ledger.balance(1, .treasury).raw.magnitude, LedgerTable.redenominationLimit)
        XCTAssertEqual(w.currencies.rate[1], rateBefore + LogQ(ratio: 1, 1_000))
        XCTAssertTrue(w.ledgerViolations().isEmpty)
        XCTAssertEqual(w.closeMonth(), [])
        // dollars never redenominate
        w.post(.reserves(g[0]), .trade, USDn(raw: .max / 2))
        XCTAssertEqual(w.currencies.redenominations[0], 0)
    }

    /// The pipeline closes the month on day 1, after the calendar jobs, and taxes are posted, not written.
    func testThePipelineClosesEveryMonth() {
        var w = WorldState(start: start, seed: 1)
        for _ in 0..<50 { _ = w.addPolity() }
        var sim = Simulation(state: w)
        for p in 0..<50 {
            sim.submit(IssuedCommand(day: start, issuerRank: 100, sequence: UInt64(p),
                                     command: .createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: 10), taxBase: LCU(raw: 7_777), taxRate: BP(raw: 1_234))))
            if sim.pending.count == Simulation.pendingCapacity { sim.step() }
        }
        sim.advance(days: 800)
        XCTAssertEqual(sim.state.world.ledgerFailures, 0)
        XCTAssertTrue(sim.state.ledgerViolations().isEmpty)
        // the books opened again on this month's first day: only the governments whose slot has come since have posted
        let ran = sim.state.world.date.day - 1
        let revenue = LCU(raw: 7_777).times(BP(raw: 1_234))
        for row in 0..<50 {
            let slot = Int(sim.state.governments.monthlySlot[row])
            XCTAssertEqual(sim.state.ledger.localPosted[row * 3], slot <= ran ? revenue : .zero, "government \(row), slot \(slot)")
        }
    }

    /// The units are kept apart by type: these do not compile, so they are listed here, not run.
    /// `w.post(g, .treasury, .tax, USDn(raw: 1))`, `w.post(.world, .trade, LCU(raw: 1))`, and `Money` has no `post` at all.
    func testUnitsAreKeptApartByType() {
        let (w, _) = world()
        XCTAssertEqual(PostingCategory.allCases.map { $0.rawValue }, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], "the stored numbers never change")
        XCTAssertEqual(LocalAccount.allCases.map { $0.rawValue }, [0, 1, 2])
        XCTAssertEqual(w.currency(of: Idx(raw: 2)), Idx(raw: 2))
    }
}
