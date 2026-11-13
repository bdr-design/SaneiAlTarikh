import Foundation
import XCTest
import SaneiCore
@testable import SaneiEngine

/// One test per rule of the ledger, each built so that removing the rule makes it fail (the reviews planted faults).
final class LedgerRulesTests: XCTestCase {
    private let start = GameDate(year: 2011, month: 1, day: 1)!

    /// Three polities; polity 1 has two governments (Côte d'Ivoire's case), so a local transfer can cross governments.
    private func world() -> (WorldState, [GovRef]) {
        var w = WorldState(start: start, seed: 1)
        var refs: [GovRef] = []
        for k in 0..<3 {
            let p = w.addPolity()!
            refs.append(w.createGovernment(polity: p, treasury: LCU(raw: 1_000_000 * Int64(k + 1)), taxBase: .zero, taxRate: .zero, strategicPeriod: 30)!)
        }
        refs.append(w.createGovernment(polity: Idx(raw: 1), treasury: LCU(raw: 777), taxBase: .zero, taxRate: .zero, strategicPeriod: 30)!)
        w.currencies.rate[1] = LogQ(ratio: 5_950, 1)
        return (w, refs)
    }

    /// Every dollar and every unit of each currency, summed: what no transfer may change.
    private func totals(_ w: WorldState) -> (dollars: Int64, local: [Int64]) {
        var dollars = w.ledger.world.raw
        for r in w.ledger.reserves { dollars += r.raw }
        var local = [Int64](repeating: 0, count: w.currencies.count)
        for row in 0..<w.ledger.currency.count {
            for a in LocalAccount.allCases { local[w.ledger.currency[row].int] += w.ledger.balance(row, a).raw }
        }
        for c in 0..<w.currencies.count { local[c] += w.currencies.moneyBase[c].raw }
        return (dollars, local)
    }

    func testTransfersMoveValueAndNeverMakeIt() {
        var (w, g) = world()
        var r = DetRNG(seed: 21, key: 0, stream: 0, serial: 0)
        let before = totals(w)
        for _ in 0..<2_000 {
            let a = g[Int(r.below(4))], b = g[Int(r.below(4))]
            switch r.below(3) {
            case 0: w.transfer(from: (a, .treasury), to: (b, .domesticDebt), .aid, LCU(raw: Int64(r.below(10_000))))
            case 1: w.transfer(from: .reserves(a), to: .reserves(b), .trade, USDn(raw: Int64(r.below(500))))
            default: w.transfer(from: .reserves(a), to: .world, .trade, USDn(raw: Int64(r.below(500))))
            }
            let now = totals(w)
            XCTAssertEqual(now.dollars, before.dollars)
            XCTAssertEqual(now.local, before.local)
        }
        XCTAssertTrue(w.transfer(from: (g[1], .treasury), to: (g[3], .treasury), .aid, LCU(raw: 5)), "two governments of one currency")
    }

    /// Each kind of balance the checker reads is named when it does not add up.
    func testTheCheckerNamesEveryKindOfAccount() {
        let (w0, _) = world()
        var w = w0
        w.ledger.reserves[2] = USDn(raw: 9)
        XCTAssertTrue(w.ledgerViolations().contains { $0.contains("government row 2, reserves") })
        XCTAssertFalse(w.ledgerHolds())
        w = w0
        w.currencies.moneyBase[1] = LCU(raw: 9)
        XCTAssertTrue(w.ledgerViolations().contains { $0.contains("currency 1, money base") })
        XCTAssertFalse(w.ledgerHolds())
        w = w0
        w.ledger.world = USDn(raw: 9)
        XCTAssertTrue(w.ledgerViolations().contains { $0.contains("world account") })
        XCTAssertFalse(w.ledgerHolds())
        w = w0
        w.ledger.local[LedgerTable.index(3, .domesticDebt)] = LCU(raw: 9)
        XCTAssertTrue(w.ledgerViolations().contains { $0.contains("government row 3, domesticDebt") })
        XCTAssertTrue(w0.ledgerHolds())
    }

    /// Each overflow check refuses its own case: a balance, a month's sum, each kind of account, each leg. The set-up
    /// comes first; then the refused act must change nothing but the count.
    func testEveryOverflowIsRefusedNotClamped() {
        let (w0, g) = world()
        let big = Int64(1) << 62
        let t1 = LedgerTable.index(1, .treasury)
        func refused(_ why: String, line: UInt = #line, setup: (inout WorldState) -> Void = { _ in }, _ act: (inout WorldState) -> Bool) {
            var w = w0
            setup(&w)
            let ledger = w.ledger, currencies = w.currencies, counted = w.world.refusedPostings
            XCTAssertFalse(act(&w), why, line: line)
            XCTAssertEqual(w.ledger, ledger, why, line: line)
            XCTAssertEqual(w.currencies, currencies, why, line: line)
            XCTAssertEqual(w.world.refusedPostings, counted + 1, why, line: line)
        }
        let t0 = LedgerTable.index(0, .treasury)
        // a month's sum past the range while the balance is not: the month opened at −2^62
        refused("a local month's sum", setup: { w in
            w.ledger.local[t0] = LCU(raw: -big); w.ledger.localOpening[t0] = LCU(raw: -big); w.ledger.localPosted[t0] = .zero
            XCTAssertTrue(w.post(g[0], .treasury, .spending, LCU(raw: big + big / 2)))
        }) { $0.post(g[0], .treasury, .spending, LCU(raw: big)) }
        refused("a local balance") { $0.post(g[0], .treasury, .spending, LCU(raw: .max)) }
        refused("a reserves balance", setup: { $0.ledger.reserves[0] = USDn(raw: big); $0.ledger.reservesOpening[0] = USDn(raw: big) }) {
            $0.post(.reserves(g[0]), .trade, USDn(raw: .max))
        }
        refused("a reserves month's sum", setup: { w in
            w.ledger.reserves[0] = USDn(raw: -big); w.ledger.reservesOpening[0] = USDn(raw: -big)
            XCTAssertTrue(w.post(.reserves(g[0]), .trade, USDn(raw: big + big / 2)))
        }) { $0.post(.reserves(g[0]), .trade, USDn(raw: big)) }
        refused("the world account", setup: { $0.ledger.world = USDn(raw: big); $0.ledger.worldOpening = USDn(raw: big) }) {
            $0.post(.world, .trade, USDn(raw: .max))
        }
        refused("the world account's month's sum", setup: { w in
            w.ledger.world = USDn(raw: -big); w.ledger.worldOpening = USDn(raw: -big)
            XCTAssertTrue(w.post(.world, .trade, USDn(raw: big + big / 2)))
        }) { $0.post(.world, .trade, USDn(raw: big)) }
        refused("a money base", setup: { XCTAssertTrue($0.post(moneyBase: Idx(raw: 0), .spending, LCU(raw: .max))) }) {
            $0.post(moneyBase: Idx(raw: 0), .spending, LCU(raw: 1))
        }
        refused("a money base's month's sum", setup: { w in
            w.currencies.moneyBase[0] = LCU(raw: -big); w.currencies.moneyBaseOpening[0] = LCU(raw: -big)
            XCTAssertTrue(w.post(moneyBase: Idx(raw: 0), .spending, LCU(raw: big + big / 2)))
        }) { $0.post(moneyBase: Idx(raw: 0), .spending, LCU(raw: big)) }
        refused("no such currency") { $0.post(moneyBase: Idx(raw: 99), .spending, LCU(raw: 1)) }
        refused("Int64.min in a local transfer") { $0.transfer(from: (g[0], .domesticDebt), to: (g[0], .treasury), .aid, LCU(raw: .min)) }
        refused("Int64.min in a dollar transfer") { $0.transfer(from: .world, to: .reserves(g[0]), .trade, USDn(raw: .min)) }
        refused("the receiving leg of a local transfer", setup: { $0.ledger.local[t1] = LCU(raw: .max - 5); $0.ledger.localOpening[t1] = LCU(raw: .max - 5) }) {
            $0.transfer(from: (g[3], .treasury), to: (g[1], .treasury), .aid, LCU(raw: 10))
        }
        refused("the paying leg of a local transfer", setup: { $0.ledger.local[t1] = LCU(raw: .min + 5); $0.ledger.localOpening[t1] = LCU(raw: .min + 5) }) {
            $0.transfer(from: (g[1], .treasury), to: (g[3], .treasury), .aid, LCU(raw: 10))
        }
        refused("the receiving leg of a dollar transfer", setup: { $0.ledger.reserves[0] = USDn(raw: .max - 5); $0.ledger.reservesOpening[0] = USDn(raw: .max - 5) }) {
            $0.transfer(from: .world, to: .reserves(g[0]), .trade, USDn(raw: 10))
        }
        refused("the paying leg of a dollar transfer", setup: { $0.ledger.world = USDn(raw: .min + 5); $0.ledger.worldOpening = USDn(raw: .min + 5) }) {
            $0.transfer(from: .world, to: .reserves(g[0]), .trade, USDn(raw: 10))
        }
        // an exchange too big for the dollar leg is refused before it is worked out: no clamp is made or counted
        var x = w0
        x.currencies.rate[1] = LogQ(ratio: 1, 1_000_000)
        let c = SaturationCounter()
        let got = Saturation.counting(into: c) { x.exchange(g[1], local: LCU(raw: 1 << 50)) }
        XCTAssertNil(got)
        XCTAssertEqual(c.count, 0)
        XCTAssertEqual(x.world.refusedPostings, 1)
    }

    /// Every LCU amount of the passing currency is rescaled, and nothing of any other: both local accounts of every row
    /// (a dissolved one too), the money base, the tax bases, the waiting creates in it; the rate and the price index.
    func testARedenominationRescalesEveryAmountAndOnlyItsCurrencys() {
        var (w, g) = world()
        // a dissolved government in currency 1 keeps its balances, in the currency's scale
        let dissolved = g[3]
        XCTAssertTrue(Command.dissolveGovernment(government: dissolved).apply(to: &w, by: .event))
        w.governments.taxBase[1] = LCU(raw: 9_000_000)
        w.governments.taxBase[0] = LCU(raw: 9_000_000)
        w.pending.append(IssuedCommand(day: start.adding(days: 3), issuer: .event, sequence: 1,
                                       command: .createGovernment(polity: Idx(raw: 1), treasury: LCU(raw: 7_000_000), taxBase: .zero, taxRate: .zero)))
        w.pending.append(IssuedCommand(day: start.adding(days: 3), issuer: .event, sequence: 2,
                                       command: .createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 7_000_000), taxBase: .zero, taxRate: .zero)))
        let other = w.ledger.balance(0, .treasury)
        let index = w.currencies.priceIndex[1]
        // only the debt stands past 2^60
        let x = LCU(raw: (1 << 60) + 4_000)
        w.post(g[1], .domesticDebt, .spending, -x)
        w.redenominateDue()
        XCTAssertEqual(w.currencies.redenominations[1], 1, "the debt alone past 2^60 redenominates")
        XCTAssertEqual(w.ledger.balance(1, .domesticDebt), (-x).times(1, over: 1_000))
        XCTAssertEqual(w.ledger.balance(1, .treasury), LCU(raw: 2_000))
        XCTAssertEqual(w.ledger.balance(3, .treasury), LCU(raw: 1), "the dissolved row: 777 / 1,000 to the nearest")
        XCTAssertEqual(w.governments.taxBase[1], LCU(raw: 9_000))
        XCTAssertEqual(w.governments.taxBase[0], LCU(raw: 9_000_000), "another currency's tax base")
        XCTAssertEqual(w.ledger.balance(0, .treasury), other)
        XCTAssertEqual(w.currencies.priceIndex[1], index + LogQ(ratio: 1, 1_000))
        XCTAssertEqual(w.currencies.priceIndex[0], .zero)
        guard case let .createGovernment(_, t1, _, _) = w.pending[0].command, case let .createGovernment(_, t0, _, _) = w.pending[1].command
        else { return XCTFail() }
        XCTAssertEqual(t1, LCU(raw: 7_000))
        XCTAssertEqual(t0, LCU(raw: 7_000_000), "another currency's waiting create")
        XCTAssertTrue(w.ledgerHolds())
    }

    /// In the pipeline, a balance that passes 2^60 on its slot day redenominates at that day's end, before the next day.
    func testTheRedenominationComesAtTheEndOfTheDayItIsDue() {
        var w = WorldState(start: start, seed: 1)
        _ = w.addPolity()
        _ = w.createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 1 << 59), taxBase: LCU(raw: 1 << 60), taxRate: .one, strategicPeriod: 30)
        var sim = Simulation(state: w)
        let steps = Steps()
        sim.observe = { steps.add($0) }
        sim.step()                                                 // 1 January: the slot's taxes pass 2^60
        XCTAssertEqual(sim.state.currencies.redenominations[0], 1, "redenominated before the day ended")
        XCTAssertFalse(sim.state.currencies.redenominationDue[0])
        XCTAssertTrue(steps.all.contains(.monthly(sim.state.governments.ref(0))))
    }

    /// A month's close reports a ledger that does not add up, even with the world account at 0.
    func testAMonthsCloseReportsABrokenLedger() {
        var (w, _) = world()
        XCTAssertTrue(w.closeMonth(), "the control")
        w.ledger.reserves[2] = USDn(raw: 9)                    // a balance moved without a posting
        XCTAssertEqual(w.ledger.world, .zero)
        XCTAssertFalse(w.closeMonth())
    }

    /// A currency whose scale would pass the exponent's ceiling is not moved again; one step below it is.
    func testTheScalesCeiling() {
        for (exponent, moves) in [(UInt16.max - 3, true), (UInt16.max - 2, false)] {
            var (w, g) = world()
            w.currencies.scaleExponent[1] = exponent
            w.post(g[1], .domesticDebt, .spending, -LCU(raw: (1 << 60) + 4_000))
            w.redenominateDue()
            XCTAssertEqual(w.currencies.redenominations[1], moves ? 1 : 0, "exponent \(exponent)")
            XCTAssertFalse(w.currencies.redenominationDue[1])
        }
    }

    /// The scenario's set-up refuses a negative treasury or tax base, as the command does.
    func testSetUpRefusesNegativeAmounts() {
        var w = WorldState(start: start, seed: 1)
        let p = w.addPolity()!
        XCTAssertNil(w.createGovernment(polity: p, treasury: LCU(raw: -1), taxBase: .zero, taxRate: .zero, strategicPeriod: 30))
        XCTAssertNil(w.createGovernment(polity: p, treasury: .zero, taxBase: LCU(raw: -1), taxRate: .zero, strategicPeriod: 30))
        XCTAssertNotNil(w.createGovernment(polity: p, treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30))
    }

    /// A refused exchange leaves the ledger as it was: only the count moves.
    func testARefusedExchangeMovesOnlyTheCount() {
        var (w, g) = world()
        let ledger = w.ledger
        XCTAssertNil(w.exchange(g[1], local: LCU(raw: 2_974)))
        XCTAssertEqual(w.ledger, ledger)
        XCTAssertEqual(w.world.refusedPostings, 1)
    }
}

private final class Steps: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [DayStep] = []
    func add(_ s: DayStep) { lock.lock(); items.append(s); lock.unlock() }
    var all: [DayStep] { lock.lock(); defer { lock.unlock() }; return items }
}
