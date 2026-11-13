import Foundation
import XCTest
import SaneiCore
@testable import SaneiEngine

/// What a day did, collected from the observer.
private final class Recorder: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [(GameDate, DayStep)] = []
    var date = GameDate(days: 0)
    func add(_ s: DayStep) { lock.lock(); items.append((date, s)); lock.unlock() }
    var all: [(GameDate, DayStep)] { lock.lock(); defer { lock.unlock() }; return items }
}

/// The skeleton's rules the T-039 mutation review found untested (2026-11-13): each test passes on the code and fails
/// on its planted fault.
final class SkeletonRulesTests: XCTestCase {
    private let start = GameDate(year: 2011, month: 1, day: 1)!

    /// `n` polities, each with a government made directly before the start.
    private func world(_ n: Int) -> WorldState {
        var w = WorldState(start: start, seed: 2011)
        for p in 0..<n {
            _ = w.addPolity()
            _ = w.createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: 1_000), taxBase: LCU(raw: 10_000), taxRate: BP(raw: 2_000),
                                   strategicPeriod: Simulation.strategicPeriod)
        }
        return w
    }

    private func run(_ sim: inout Simulation, days: Int, _ rec: Recorder) {
        sim.observe = { rec.add($0) }
        for _ in 0..<days {
            rec.date = sim.state.world.date
            sim.step()
        }
    }

    // MARK: the state hash covers every column

    func testTheHashCoversEveryColumn() {
        var w = world(6)
        _ = w.addProvince(sovereign: Idx(raw: 0), administrator: w.governments.ref(0), population: Pop32(raw: 1_000))
        var sim = Simulation(state: w)
        sim.advance(days: 40)
        _ = sim.submit(IssuedCommand(day: sim.state.world.date.adding(days: 3), issuer: .event, sequence: 1,
                                     command: .setTaxRate(government: sim.state.governments.ref(1), rate: BP(raw: 3_000))))
        let base = sim.state
        let changes: [(String, (inout WorldState) -> Void)] = [
            ("date", { $0.world.date = $0.world.date.adding(days: 1) }),
            ("seed", { $0.world.seed &+= 1 }),
            ("monthStarts", { $0.world.monthStarts &+= 1 }),
            ("quarterStarts", { $0.world.quarterStarts &+= 1 }),
            ("yearStarts", { $0.world.yearStarts &+= 1 }),
            ("ledgerFailures", { $0.world.ledgerFailures &+= 1 }),
            ("refusedCommands", { $0.world.refusedCommands &+= 1 }),
            ("refusedPostings", { $0.world.refusedPostings &+= 1 }),
            ("refusedSubmits", { $0.world.refusedSubmits &+= 1 }),
            ("polity exists", { $0.polities.exists[2].toggle() }),
            ("polity serial", { $0.polities.serial[2] = Serial(raw: $0.polities.serial[2].raw &+ 100) }),
            ("polity counter", { _ = $0.polities.counter.take() }),
            ("government exists", { $0.governments.exists[2].toggle() }),
            ("government serial", { $0.governments.serial[2] = Serial(raw: $0.governments.serial[2].raw &+ 100) }),
            ("government polity", { $0.governments.polity[2] = Idx(raw: 3) }),
            ("government slot", { $0.governments.monthlySlot[2] &+= 1 }),
            ("lastMonthlyRun", { $0.governments.lastMonthlyRun[2] &+= 1 }),
            ("lastYearlyRun", { $0.governments.lastYearlyRun[2] &+= 1 }),
            ("aiNextStrategic", { $0.governments.aiNextStrategic[2] = $0.governments.aiNextStrategic[2].adding(days: 1) }),
            ("taxRate", { $0.governments.taxRate[2] = BP(raw: 1) }),
            ("taxBase", { $0.governments.taxBase[2] = LCU(raw: 1) }),
            ("monthlyRuns", { $0.governments.monthlyRuns[2] &+= 1 }),
            ("yearlyRuns", { $0.governments.yearlyRuns[2] &+= 1 }),
            ("strategicRuns", { $0.governments.strategicRuns[2] &+= 1 }),
            ("government counter", { _ = $0.governments.counter.take() }),
            ("province sovereign", { $0.provinces.sovereign[0] = Idx(raw: 1) }),
            ("province administrator", { $0.provinces.administrator[0] = Idx(raw: 1) }),
            ("province population", { $0.provinces.population[0] = Pop32(raw: 7) }),
            ("scaleExponent", { $0.currencies.scaleExponent[2] &+= 3 }),
            ("rate", { $0.currencies.rate[2] = LogQ(raw: 5) }),
            ("priceIndex", { $0.currencies.priceIndex[2] = LogQ(raw: 5) }),
            ("redenominations", { $0.currencies.redenominations[2] &+= 1 }),
            ("redenominationDue", { $0.currencies.redenominationDue[2].toggle() }),
            ("moneyBase", { $0.currencies.moneyBase[2] = LCU(raw: 9) }),
            ("moneyBaseOpening", { $0.currencies.moneyBaseOpening[2] = LCU(raw: 9) }),
            ("moneyBasePosted", { $0.currencies.moneyBasePosted[2] = LCU(raw: 9) }),
            ("ledger currency", { $0.ledger.currency[2] = Idx(raw: 3) }),
            ("reserves", { $0.ledger.reserves[2] = USDn(raw: 9) }),
            ("reservesOpening", { $0.ledger.reservesOpening[2] = USDn(raw: 9) }),
            ("reservesPosted", { $0.ledger.reservesPosted[2] = USDn(raw: 9) }),
            ("local", { $0.ledger.local[3] = LCU(raw: 9) }),
            ("localOpening", { $0.ledger.localOpening[3] = LCU(raw: 9) }),
            ("localPosted", { $0.ledger.localPosted[3] = LCU(raw: 9) }),
            ("world", { $0.ledger.world = USDn(raw: 9) }),
            ("worldOpening", { $0.ledger.worldOpening = USDn(raw: 9) }),
            ("worldPosted", { $0.ledger.worldPosted = USDn(raw: 9) }),
            ("pending", { $0.pending[0].sequence &+= 1 }),
        ]
        var seen: [UInt64] = [base.hash]
        for (name, change) in changes {
            var s = base
            change(&s)
            XCTAssertNotEqual(s.hash, base.hash, "\(name) is not in the hash")
            XCTAssertFalse(seen.dropFirst().contains(s.hash), "\(name) hashes like another change")
            seen.append(s.hash)
        }
    }

    // MARK: the calendar, the slots and the stagger

    /// Every government alive runs in every month from its first, slot 28 included; the yearly run comes on its own
    /// monthly slot day in January and is counted; a dissolved government runs no more, nor gets a look.
    func testEverySlotRunsAndTheDissolvedRunNoMore() {
        var sim = Simulation(state: world(28))
        let rec = Recorder()
        let dissolved = sim.state.governments.ref(0)
        _ = sim.submit(IssuedCommand(day: start.adding(days: 100), issuer: .event, sequence: 1, command: .dissolveGovernment(government: dissolved)))
        run(&sim, days: 2 * 365, rec)
        let s = sim.state
        XCTAssertEqual(Set((0..<s.governments.rows).map { s.governments.monthlySlot[$0] }).count, 28, "28 governments, 28 slots")
        var monthly: [UInt32: Set<Int>] = [:]
        var monthlyDays: [UInt32: Set<Int32>] = [:]
        for (d, step) in rec.all {
            switch step {
            case let .monthly(g):
                monthly[g.serial.raw, default: []].insert(d.year * 12 + d.month - 1)
                monthlyDays[g.serial.raw, default: []].insert(d.days)
                if g == dissolved { XCTAssertLessThan(d, start.adding(days: 100), "a dissolved government ran") }
            case let .yearly(g):
                XCTAssertTrue(monthlyDays[g.serial.raw]?.contains(d.days) == true, "a yearly run off its slot day")
            case let .strategic(g):
                if g == dissolved { XCTAssertLessThan(d, start.adding(days: 100), "a dissolved government had a look") }
            default: break
            }
        }
        let months = Set(24_132..<(24_132 + 24))           // January 2011 to December 2012
        for row in 1..<28 {
            let g = s.governments.ref(row)
            XCTAssertEqual(monthly[g.serial.raw], months, "government \(row) (slot \(s.governments.monthlySlot[row])) missed a month")
            XCTAssertEqual(s.governments.yearlyRuns[row], 2, "two Januaries, counted")
        }
    }

    /// The slot rule counts only live governments: a dissolved one's slot is free again.
    func testTheSlotLoadCountsOnlyTheLive() {
        var w = world(28)
        let row = (0..<28).first { w.governments.monthlySlot[$0] == 17 }!
        w.governments.dissolve(w.governments.ref(row))
        XCTAssertEqual(w.governments.slot(forNewOn: start).slot, 17)
    }

    /// A reused row starts a fresh look, spread by serial; governments made together are spread over the period; a
    /// government past the cap is not made.
    func testLooksAreSpreadAndTheCapHolds() {
        var w = world(200)
        var perDay: [Int32: Int] = [:]
        for i in 0..<w.governments.rows { perDay[w.governments.aiNextStrategic[i].days, default: 0] += 1 }
        XCTAssertLessThanOrEqual(perDay.values.max()!, (200 + Simulation.strategicPeriod - 1) / Simulation.strategicPeriod)
        for i in 0..<w.governments.rows {
            let s = w.governments.serial[i].raw
            XCTAssertEqual(w.governments.aiNextStrategic[i], start.adding(days: Int(s % UInt32(Simulation.strategicPeriod))))
        }
        // a reused row
        let old = w.governments.ref(5)
        w.governments.aiNextStrategic[5] = start.adding(days: 400)
        w.governments.dissolve(old)
        let new = try! XCTUnwrap(w.createGovernment(polity: Idx(raw: 5), treasury: .zero, taxBase: .zero, taxRate: .zero,
                                                    strategicPeriod: Simulation.strategicPeriod))
        XCTAssertEqual(new.row, old.row)
        XCTAssertEqual(w.governments.aiNextStrategic[5], start.adding(days: Int(new.serial.raw % UInt32(Simulation.strategicPeriod))))
        // the cap
        var full = world(GovernmentTable.capacity)
        XCTAssertEqual(full.governments.rows, GovernmentTable.capacity)
        XCTAssertNil(full.createGovernment(polity: Idx(raw: 0), treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30))
        XCTAssertNil(full.addPolity(), "past the polities' cap")
        var provinces = world(1)
        for _ in 0..<ProvinceTable.capacity {
            XCTAssertNotNil(provinces.addProvince(sovereign: Idx(raw: 0), administrator: provinces.governments.ref(0), population: Pop32(raw: 1)))
        }
        XCTAssertNil(provinces.addProvince(sovereign: Idx(raw: 0), administrator: provinces.governments.ref(0), population: Pop32(raw: 1)),
                     "past the provinces' cap")
    }

    /// The stagger: the next look one period from the day it runs; ties on a due date go by serial, not row.
    func testTheStaggersNextLookAndTies() {
        var w = world(20)
        // two governments due the same past day, whose serial order is not their row order
        for i in 0..<20 { w.governments.aiNextStrategic[i] = start.adding(days: 500) }
        let a = w.governments.ref(3), b = w.governments.ref(4)
        w.governments.dissolve(a)
        let reused = w.createGovernment(polity: Idx(raw: 3), treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30)!
        XCTAssertEqual(reused.row, a.row)
        XCTAssertGreaterThan(reused.serial.raw, b.serial.raw, "row 3 now holds a later serial than row 4")
        w.governments.aiNextStrategic[3] = start.adding(days: -2)
        w.governments.aiNextStrategic[4] = start.adding(days: -2)
        for i in [0, 1, 2] + Array(5..<20) { w.governments.aiNextStrategic[i] = start.adding(days: -2) }
        // 20 due, 15 a day: the 15 lowest serials run, row 4 before row 3
        var sim = Simulation(state: w)
        let rec = Recorder()
        run(&sim, days: 1, rec)
        let looked = rec.all.compactMap { step -> GovRef? in if case let .strategic(g) = step.1 { return g }; return nil }
        XCTAssertEqual(looked.count, Simulation.strategicPerDay)
        let order = (0..<20).map { sim.state.governments.ref($0) }.sorted { $0.serial.raw < $1.serial.raw }
        XCTAssertEqual(looked, Array(order.prefix(Simulation.strategicPerDay)))
        for g in looked {
            XCTAssertEqual(sim.state.governments.aiNextStrategic[g.row.int], start.adding(days: Simulation.strategicPeriod),
                           "the next look one period from today, not from its due date")
        }
        XCTAssertEqual(Simulation.strategicPeriod, 30)
    }

    // MARK: the queue

    /// The rooms are 64, 64 and 448, each filled to the brim and one more refused; the queue holds the issuers' orders
    /// by (day, rank, issuer serial, issuer row, sequence).
    func testTheRoomsAndTheOrderOfTheQueue() {
        XCTAssertEqual([Simulation.playerCapacity, Simulation.eventCapacity, Simulation.aiCapacity], [64, 64, 448])
        XCTAssertEqual(Simulation.queueCapacity, 576)
        var sim = Simulation(state: world(8))
        let d = start.adding(days: 3)
        let g = sim.state.governments.ref(0)
        for k in 0..<64 {
            XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .event, sequence: UInt64(k), command: .setTaxRate(government: g, rate: .zero))), .queued)
        }
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .event, sequence: 99, command: .setTaxRate(government: g, rate: .zero))), .full)
        // two AI issuers on one day: the queue orders them by serial, whatever order they arrive in
        let a = sim.state.governments.ref(2), b = sim.state.governments.ref(1)
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .ai(a), sequence: 1, command: .setTaxRate(government: a, rate: .zero))), .queued)
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .ai(b), sequence: 1, command: .setTaxRate(government: b, rate: .zero))), .queued)
        let ais = sim.state.pending.filter { if case .ai = $0.issuer { return true }; return false }.map { $0.issuer.government! }
        XCTAssertEqual(ais, [b, a].sorted { $0.serial.raw < $1.serial.raw })
        // the row is part of the key: an older serial of another row, made, queues beside the live one
        var w = world(4)
        let old = w.governments.ref(1)
        w.governments.dissolve(old)
        let renewed = w.createGovernment(polity: Idx(raw: 1), treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30)!
        var s2 = Simulation(state: w)
        let key = IssuedCommand.precedes(IssuedCommand(day: d, issuer: .ai(GovRef(row: Idx(raw: 0), serial: renewed.serial)), sequence: 1,
                                                       command: .setTaxRate(government: renewed, rate: .zero)),
                                         IssuedCommand(day: d, issuer: .ai(renewed), sequence: 1, command: .setTaxRate(government: renewed, rate: .zero)))
        XCTAssertTrue(key, "one serial, two rows: the row decides")
        XCTAssertEqual(s2.submit(IssuedCommand(day: d, issuer: .ai(renewed), sequence: 1, command: .setTaxRate(government: renewed, rate: .zero))), .queued)
        // cancel takes the player's order of its day only
        let p = s2.state.governments.ref(2)
        XCTAssertEqual(s2.submit(IssuedCommand(day: d, issuer: .player(p), sequence: 7, command: .setTaxRate(government: p, rate: .zero))), .queued)
        XCTAssertEqual(s2.submit(IssuedCommand(day: d.adding(days: 1), issuer: .player(p), sequence: 7, command: .setTaxRate(government: p, rate: .zero))), .queued)
        XCTAssertTrue(s2.cancel(day: d.adding(days: 1), government: p, sequence: 7))
        XCTAssertEqual(s2.state.pending.filter { $0.issuer == .player(p) }.map(\.day), [d])
    }

    // MARK: who may give what

    func testWhoMayGiveEachCommand() {
        var w = world(4)
        let g = w.governments.ref(0), h = w.governments.ref(1)
        XCTAssertTrue(Command.setTaxRate(government: g, rate: BP(raw: 3_000)).validate(w, by: .event), "an event sets a rate")
        XCTAssertTrue(Command.setTaxRate(government: g, rate: .one).validate(w, by: .player(g)), "100% is a rate")
        XCTAssertTrue(Command.setTaxRate(government: g, rate: .zero).validate(w, by: .player(g)), "0% is a rate")
        XCTAssertTrue(Command.succeedGovernment(government: g).validate(w, by: .event), "an event gives a succession")
        XCTAssertFalse(Command.succeedGovernment(government: g).validate(w, by: .player(g)), "a player cannot replace its government")
        XCTAssertFalse(Command.succeedGovernment(government: g).validate(w, by: .ai(g)), "nor the AI")
        // a stale reference never re-serials the row's live occupant
        w.governments.dissolve(h)
        let next = w.createGovernment(polity: Idx(raw: 1), treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30)!
        XCTAssertEqual(next.row, h.row)
        let before = w
        XCTAssertFalse(Command.succeedGovernment(government: h).apply(to: &w, by: .event))
        XCTAssertEqual(w, before, "nothing changed")
    }

    /// A succession hands over the player's orders only, and keeps the queue in its order.
    func testASuccessionHandsOverThePlayersOrdersOnly() {
        var sim = Simulation(state: world(6))
        let d = start.adding(days: 5)
        let g = sim.state.governments.ref(1), p = sim.state.governments.ref(4)
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .ai(g), sequence: 1, command: .setTaxRate(government: g, rate: .zero))), .queued)
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .player(g), sequence: 2, command: .setTaxRate(government: g, rate: .one))), .queued)
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .player(p), sequence: 3, command: .setTaxRate(government: p, rate: .one))), .queued)
        XCTAssertTrue(Command.succeedGovernment(government: g).apply(to: &sim.state, by: .event))
        let successor = sim.state.governments.ref(1)
        XCTAssertTrue(sim.state.pending.contains { $0.issuer == .ai(g) }, "the AI's command stays with the old government (refused on its day)")
        XCTAssertTrue(sim.state.pending.contains { $0.issuer == .player(successor) })
        XCTAssertEqual(sim.state.governments.strategicRuns[1], 0)
        for k in 1..<sim.state.pending.count { XCTAssertTrue(IssuedCommand.precedes(sim.state.pending[k - 1], sim.state.pending[k]), "the queue in order") }
    }

    /// Every column keeps the cap's room across a held copy and an append (no column grows past its cap in steps), and a
    /// province is never given to a government that ended.
    func testTheRoomIsKeptAndTheSetUpRefusesAnEndedGovernment() {
        var w = world(3)
        let held = w
        _ = w.addPolity()
        _ = w.createGovernment(polity: Idx(raw: 3), treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30)
        _ = w.addProvince(sovereign: Idx(raw: 0), administrator: w.governments.ref(0), population: Pop32(raw: 1))
        XCTAssertGreaterThanOrEqual(w.polities.exists.capacity, PolityTable.capacity)
        XCTAssertGreaterThanOrEqual(w.polities.serial.capacity, PolityTable.capacity)
        for c in [w.governments.exists.capacity, w.governments.serial.capacity, w.governments.polity.capacity, w.governments.monthlySlot.capacity,
                  w.governments.taxBase.capacity, w.governments.aiNextStrategic.capacity, w.governments.strategicRuns.capacity] {
            XCTAssertGreaterThanOrEqual(c, GovernmentTable.capacity)
        }
        XCTAssertGreaterThanOrEqual(w.provinces.administrator.capacity, ProvinceTable.capacity)
        XCTAssertGreaterThanOrEqual(w.pending.capacity, Simulation.queueCapacity)
        XCTAssertEqual(held.governments.rows, 3, "the held copy is unchanged")
        let ended = w.governments.ref(1)
        w.governments.dissolve(ended)
        XCTAssertNil(w.addProvince(sovereign: Idx(raw: 1), administrator: ended, population: Pop32(raw: 1)))
    }

    /// A succession starts every count of runs again, the strategic one included (checked once each count has run).
    func testASuccessionStartsEveryCountAgain() {
        var sim = Simulation(state: world(4))
        sim.advance(days: 400)
        let g = sim.state.governments.ref(1)
        XCTAssertGreaterThan(sim.state.governments.monthlyRuns[1], 0)
        XCTAssertGreaterThan(sim.state.governments.yearlyRuns[1], 0)
        XCTAssertGreaterThan(sim.state.governments.strategicRuns[1], 0)
        XCTAssertTrue(Command.succeedGovernment(government: g).apply(to: &sim.state, by: .event))
        XCTAssertEqual([sim.state.governments.monthlyRuns[1], sim.state.governments.yearlyRuns[1], sim.state.governments.strategicRuns[1]],
                       [0, 0, 0])
    }

    /// The cap's room comes back with every append, even to a column that lost it: a copy written by subscript keeps only
    /// its count's room (a dissolution and a re-used row do that after a held copy), and here each column is also made
    /// to lose it outright. The queue keeps its room across a held copy and a take-back, the stagger's working room is
    /// reserved when the simulation is made, and no table passes its cap.
    func testTheRoomComesBackWithEveryAppend() {
        // governments: a held copy, a dissolution and its row re-used (written by subscript), then an append
        var w = world(3)
        var held = w
        w.governments.dissolve(w.governments.ref(0))
        _ = w.createGovernment(polity: Idx(raw: 0), treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30)
        _ = w.addPolity()
        _ = w.createGovernment(polity: Idx(raw: 3), treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30)
        func governmentRoom(_ t: GovernmentTable, _ m: String) {
            for c in [t.exists.capacity, t.serial.capacity, t.polity.capacity, t.monthlySlot.capacity, t.lastMonthlyRun.capacity,
                      t.lastYearlyRun.capacity, t.aiNextStrategic.capacity, t.taxRate.capacity, t.taxBase.capacity,
                      t.monthlyRuns.capacity, t.yearlyRuns.capacity, t.strategicRuns.capacity] {
                XCTAssertGreaterThanOrEqual(c, GovernmentTable.capacity, m)
            }
        }
        governmentRoom(w.governments, "after a re-used row and an append")
        // every column made to lose its room, then one append each
        w = world(3)
        held = w
        w.polities.exists = w.polities.exists.map { $0 }
        w.polities.serial = w.polities.serial.map { $0 }
        _ = w.addPolity()
        XCTAssertGreaterThanOrEqual(w.polities.exists.capacity, PolityTable.capacity)
        XCTAssertGreaterThanOrEqual(w.polities.serial.capacity, PolityTable.capacity)
        var t = w.governments
        t.exists = t.exists.map { $0 }; t.serial = t.serial.map { $0 }; t.polity = t.polity.map { $0 }
        t.monthlySlot = t.monthlySlot.map { $0 }; t.lastMonthlyRun = t.lastMonthlyRun.map { $0 }; t.lastYearlyRun = t.lastYearlyRun.map { $0 }
        t.aiNextStrategic = t.aiNextStrategic.map { $0 }; t.taxRate = t.taxRate.map { $0 }; t.taxBase = t.taxBase.map { $0 }
        t.monthlyRuns = t.monthlyRuns.map { $0 }; t.yearlyRuns = t.yearlyRuns.map { $0 }; t.strategicRuns = t.strategicRuns.map { $0 }
        w.governments = t
        _ = w.createGovernment(polity: Idx(raw: 3), treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30)
        governmentRoom(w.governments, "after columns that lost their room and an append")
        _ = w.addProvince(sovereign: Idx(raw: 0), administrator: w.governments.ref(0), population: Pop32(raw: 1))
        w.provinces.sovereign = w.provinces.sovereign.map { $0 }
        w.provinces.administrator = w.provinces.administrator.map { $0 }
        w.provinces.population = w.provinces.population.map { $0 }
        _ = w.addProvince(sovereign: Idx(raw: 1), administrator: w.governments.ref(1), population: Pop32(raw: 2))
        for c in [w.provinces.sovereign.capacity, w.provinces.administrator.capacity, w.provinces.population.capacity] {
            XCTAssertGreaterThanOrEqual(c, ProvinceTable.capacity)
        }
        XCTAssertEqual(held.polities.count, 3, "the held copy is unchanged")
        // the queue: a held copy, a take-back (written after the copy), then a new order
        var sim = Simulation(state: world(3))
        XCTAssertGreaterThanOrEqual(sim.due.capacity, GovernmentTable.capacity, "the stagger's room, reserved when made")
        let d = start.adding(days: 3), g = sim.state.governments.ref(0)
        for k in 0..<3 {
            XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .player(g), sequence: UInt64(k), command: .setTaxRate(government: g, rate: .zero))), .queued)
        }
        let heldSim = sim
        XCTAssertTrue(sim.cancel(day: d, government: g, sequence: 1))
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .player(g), sequence: 9, command: .setTaxRate(government: g, rate: .zero))), .queued)
        XCTAssertGreaterThanOrEqual(sim.state.pending.capacity, Simulation.queueCapacity)
        XCTAssertEqual(heldSim.pending.count, 3)
        // no table passes its cap
        var full = WorldState(start: start, seed: 1)
        for _ in 0..<PolityTable.capacity { XCTAssertNotNil(full.addPolity()) }
        XCTAssertNil(full.addPolity(), "the polities' cap")
        XCTAssertEqual(full.polities.count, PolityTable.capacity)
        var table = PolityTable()                                   // the table's own cap, under the world's
        for _ in 0..<PolityTable.capacity { XCTAssertNotNil(table.add()) }
        XCTAssertNil(table.add(), "the polity table's own cap")
        XCTAssertEqual(table.count, PolityTable.capacity)
    }

    /// Every issued command reads back from its codec, and a command of an unknown tag is refused, the reader unmoved.
    func testIssuedCommandsSurviveTheirCodec() {
        let g = GovRef(row: Idx(raw: 7), serial: Serial(raw: 9))
        let all = [
            IssuedCommand(day: start, issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: BP(raw: 1))),
            IssuedCommand(day: start.adding(days: 40), issuer: .event, sequence: .max, command: .dissolveGovernment(government: g, provincesTo: GovRef(row: Idx(raw: 1), serial: Serial(raw: 2)))),
            IssuedCommand(day: GameDate(days: -43_829), issuer: .ai(g), sequence: 0, command: .createGovernment(polity: Idx(raw: 3), treasury: .zero, taxBase: .zero, taxRate: .zero)),
            IssuedCommand(day: start.adding(days: 3), issuer: .event, sequence: 2, command: .succeedGovernment(government: g)),
        ]
        var w = ByteWriter()
        for c in all { c.write(to: &w) }
        var r = ByteReader(w.bytes)
        for c in all { XCTAssertEqual(IssuedCommand.read(from: &r), c) }
        XCTAssertEqual(r.remaining, 0)
        var bad = ByteReader([0, 9])
        XCTAssertNil(IssuedCommand.read(from: &bad))
        XCTAssertEqual(bad.offset, 0)
    }

    /// The guards that keep each run once: a row that says it ran this month (or year) does not run again on its slot
    /// day; a successor keeps its predecessor's calendar; the observer hears of commands only on a day some were due.
    func testTheOnceGuardsAndTheCalendarCarriedOver() {
        var sim = Simulation(state: world(3))
        let rec = Recorder()
        run(&sim, days: 1, rec)                                    // 1 January: the close, slot 1's runs
        // the next slot day of government 1, with its row saying it already ran this month and this year
        let civil = sim.state.world.date.civil                    // 2 January: government 1's slot, in January
        XCTAssertEqual([Int(sim.state.governments.monthlySlot[1]), civil.day, civil.month], [2, 2, 1])
        sim.state.governments.lastMonthlyRun[1] = Int32(civil.year * 12 + civil.month - 1)
        sim.state.governments.lastYearlyRun[1] = Int32(civil.year)
        let before = rec.all.count
        run(&sim, days: 1, rec)
        let ref = sim.state.governments.ref(1)
        XCTAssertFalse(rec.all[before...].contains { $0.1 == .monthly(ref) || $0.1 == .yearly(ref) }, "a row that ran runs no more")
        XCTAssertTrue(rec.all[before...].contains { if case .monthly = $0.1 { return false }; return true }, "the day ran")
        // a succession keeps the calendar: the month's and the year's runs (row 1's say it ran), the slot and the next look
        let row = 1
        let calendar = { (s: Simulation) in
            [Int64(s.state.governments.lastMonthlyRun[row]), Int64(s.state.governments.lastYearlyRun[row]),
             Int64(s.state.governments.monthlySlot[row]), Int64(s.state.governments.aiNextStrategic[row].days)]
        }
        let kept = calendar(sim)
        XCTAssertFalse(kept.prefix(2).contains(Int64(GovernmentTable.never)), "the row has a month and a year to keep")
        XCTAssertTrue(Command.succeedGovernment(government: sim.state.governments.ref(row)).apply(to: &sim.state, by: .event))
        XCTAssertEqual(calendar(sim), kept)
        // commands heard of only on a day some are due
        let g = sim.state.governments.ref(0)
        let later = sim.state.world.date.adding(days: 3)
        XCTAssertEqual(sim.submit(IssuedCommand(day: later, issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: .zero))), .queued)
        let mark = rec.all.count
        run(&sim, days: 1, rec)
        XCTAssertFalse(rec.all[mark...].contains { $0.1 == .commands }, "nothing due today: nothing to hear")
        run(&sim, days: 3, rec)
        XCTAssertTrue(rec.all[mark...].contains { $0.1 == .commands })
    }

    /// The making of a government is checked when given: its amounts, its rate and the room for its row.
    func testAGovernmentsMakingIsCheckedWhenGiven() {
        var w = world(2)
        _ = w.addPolity()
        let p = Idx<PolityKind>(raw: 2)
        XCTAssertTrue(Command.createGovernment(polity: p, treasury: .zero, taxBase: .zero, taxRate: .one).validate(w, by: .event))
        XCTAssertFalse(Command.createGovernment(polity: p, treasury: LCU(raw: -1), taxBase: .zero, taxRate: .zero).validate(w, by: .event))
        XCTAssertFalse(Command.createGovernment(polity: p, treasury: .zero, taxBase: LCU(raw: -1), taxRate: .zero).validate(w, by: .event))
        XCTAssertFalse(Command.createGovernment(polity: p, treasury: .zero, taxBase: .zero, taxRate: BP(raw: 10_001)).validate(w, by: .event))
        XCTAssertFalse(Command.createGovernment(polity: p, treasury: .zero, taxBase: .zero, taxRate: BP(raw: -1)).validate(w, by: .event))
        // every row live at the cap: no room; a dissolved row makes room again
        var full = WorldState(start: start, seed: 3)
        for _ in 0..<GovernmentTable.capacity {
            let q = full.addPolity()!
            XCTAssertNotNil(full.createGovernment(polity: q, treasury: .zero, taxBase: .zero, taxRate: .zero, strategicPeriod: 30))
        }
        let make = Command.createGovernment(polity: Idx(raw: 0), treasury: .zero, taxBase: .zero, taxRate: .zero)
        XCTAssertFalse(make.validate(full, by: .event), "no room at the cap")
        full.governments.dissolve(full.governments.ref(5))
        XCTAssertTrue(make.validate(full, by: .event), "a dissolved row is room")
    }
}
