import Foundation
import XCTest
import SaneiCore
@testable import SaneiEngine

/// What a day did, collected from the observer (tests run one simulation at a time per recorder).
private final class Steps: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [(GameDate, DayStep)] = []
    var date = GameDate(days: 0)
    func add(_ s: DayStep) { lock.lock(); items.append((date, s)); lock.unlock() }
    var all: [(GameDate, DayStep)] { lock.lock(); defer { lock.unlock() }; return items }
}

final class SimulationTests: XCTestCase {
    private let start = GameDate(year: 2011, month: 1, day: 1)!

    /// A world of `n` polities, each with a government made on the first day.
    private func world(_ n: Int, seed: UInt64 = 2011) -> Simulation {
        var w = WorldState(start: start, seed: seed)
        for _ in 0..<n { _ = w.addPolity() }
        var sim = Simulation(state: w)
        var seq: UInt64 = 0
        for p in 0..<n {
            seq += 1
            sim.submit(IssuedCommand(day: start, issuer: .event, sequence: seq,
                                     command: .createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: 1_000),
                                                                taxBase: LCU(raw: 10_000 + Int64(p)), taxRate: BP(raw: 2_000))))
            if sim.pending.count == Simulation.othersCapacity { sim.step() }
        }
        return sim
    }

    private func month(_ d: GameDate) -> Int { d.year * 12 + d.month - 1 }

    func testTwoRunsAndACopyGiveTheSameHash() {
        var a = world(60)
        var b = world(60)
        a.advance(days: 400)
        b.advance(days: 200)
        var copy = b
        let middle = b.state.hash
        b.advance(days: 200)
        copy.advance(days: 200)
        XCTAssertEqual(a.state.hash, b.state.hash)
        XCTAssertEqual(copy.state.hash, b.state.hash, "a copy continued is the same game")
        XCTAssertNotEqual(middle, b.state.hash)
        XCTAssertEqual(a.state, b.state)
        var other = world(60, seed: 2012)
        other.advance(days: 400)
        XCTAssertNotEqual(other.state.hash, a.state.hash, "the seed is part of the state")
    }

    /// Every government runs its monthly systems exactly once in every month it exists, whatever day it was made,
    /// including the 29th to the 31st, and governments made into a dissolved one's row.
    func testExactlyOneMonthlyRunPerGovernmentPerMonth() {
        var sim = world(40)
        let steps = Steps()
        sim.observe = { steps.add($0) }
        var g = DetRNG(seed: 5, key: 0, stream: 0, serial: 0)
        var seq: UInt64 = 1_000
        var dissolvedOn: [UInt32: GameDate] = [:]
        var createdOn: [UInt32: GameDate] = [:]
        for _ in 0..<(3 * 365) {
            let today = sim.state.world.date
            steps.date = today
            // now and then a government ends and another begins, on any day of the month
            if g.chance(1, in: 6) {
                let live = (0..<sim.state.governments.rows).filter { sim.state.governments.exists[$0] }
                if let row = live.isEmpty ? nil : live[Int(g.below(UInt64(live.count)))] {
                    let ref = sim.state.governments.ref(row)
                    seq += 1
                    sim.submit(IssuedCommand(day: today, issuer: .event, sequence: seq, command: .dissolveGovernment(government: ref)))
                    dissolvedOn[ref.serial.raw] = today
                    seq += 1
                    sim.submit(IssuedCommand(day: today, issuer: .event, sequence: seq,
                                             command: .createGovernment(polity: sim.state.governments.polity[row], treasury: .zero,
                                                                        taxBase: LCU(raw: 500), taxRate: BP(raw: 1_000))))
                    createdOn[sim.state.governments.counter.next] = today
                }
            }
            sim.step()
        }
        let end = sim.state.world.date
        var runs: [UInt32: [Int: Int]] = [:]
        for (date, step) in steps.all {
            if case let .monthly(ref) = step { runs[ref.serial.raw, default: [:]][month(date), default: 0] += 1 }
        }
        XCTAssertFalse(runs.isEmpty)
        for (serial, months) in runs {
            for (m, n) in months { XCTAssertEqual(n, 1, "government \(serial) ran \(n) times in month \(m)") }
            // a government still alive at the end ran in every full month from its first one
            if dissolvedOn[serial] == nil {
                let made = createdOn[serial] ?? start
                let first = month(made) + (made.day > Int(GovernmentTable.slots) ? 1 : 0)
                let last = month(end) - 1
                if first <= last {
                    for m in first...last { XCTAssertEqual(months[m], 1, "government \(serial) missed month \(m)") }
                }
            }
        }
        // the yearly run: once a year, in January
        var yearly: [UInt32: [Int: Int]] = [:]
        for (date, step) in steps.all {
            if case let .yearly(ref) = step {
                XCTAssertEqual(date.month, 1, "a yearly run outside January")
                yearly[ref.serial.raw, default: [:]][date.year, default: 0] += 1
            }
        }
        for (serial, years) in yearly { for (y, n) in years { XCTAssertEqual(n, 1, "government \(serial), year \(y)") } }
        // the first governments, made on 1 January 2011 and never dissolved: three Januaries each
        for serial in UInt32(1)...40 where dissolvedOn[serial] == nil {
            XCTAssertEqual(yearly[serial]?.keys.sorted(), [2011, 2012, 2013], "government \(serial)")
        }
    }

    func testTheSlotRuleForANewGovernment() {
        var sim = world(28)
        sim.step()
        // 28 governments on the first day: one in each slot
        let slots = (0..<28).map { sim.state.governments.monthlySlot[$0] }
        XCTAssertEqual(slots.sorted(), (1...28).map { UInt8($0) })
        // made on the 30th: no slot is left this month, so the first run is next month
        while sim.state.world.date.day != 30 { sim.step() }
        let p = sim.state.addPolity_forTests()
        sim.submit(IssuedCommand(day: sim.state.world.date, issuer: .event, sequence: 9_999,
                                 command: .createGovernment(polity: p, treasury: .zero, taxBase: .zero, taxRate: .zero)))
        sim.step()
        let row = sim.state.governments.rows - 1
        XCTAssertEqual(sim.state.governments.lastMonthlyRun[row], Int32(month(GameDate(year: 2011, month: 1, day: 30)!)))
        // made on the 3rd: the least-loaded slot from the 3rd on, the earliest of equals
        while sim.state.world.date.day != 3 { sim.step() }
        let q = sim.state.addPolity_forTests()
        sim.submit(IssuedCommand(day: sim.state.world.date, issuer: .event, sequence: 10_000,
                                 command: .createGovernment(polity: q, treasury: .zero, taxBase: .zero, taxRate: .zero)))
        sim.step()
        let newSlot = sim.state.governments.monthlySlot[sim.state.governments.rows - 1]
        XCTAssertGreaterThanOrEqual(newSlot, 3)
        XCTAssertEqual(newSlot, 3, "the least-loaded slot from the 3rd on, the earliest of equals (slot 1 now holds two)")
    }

    func testTheStaggerRunsAtMostFifteenADay() {
        var sim = world(200)
        let steps = Steps()
        sim.observe = { steps.add($0) }
        for _ in 0..<120 {
            steps.date = sim.state.world.date
            sim.step()
        }
        var perDay: [Int32: Int] = [:]
        for (date, step) in steps.all { if case .strategic = step { perDay[date.days, default: 0] += 1 } }
        XCTAssertLessThanOrEqual(perDay.values.max() ?? 0, Simulation.strategicPerDay)
        // over 120 days, 200 governments with a 30-day period: everyone looked at, nobody twice within 30 days
        let runs = (0..<200).map { sim.state.governments.strategicRuns[$0] }
        XCTAssertTrue(runs.allSatisfy { $0 >= 2 }, "every government had its turns: \(runs.min() ?? 0)")
        XCTAssertTrue(runs.allSatisfy { $0 <= 5 })
    }

    func testCommandsInAnyOrderGiveTheSameDay() {
        let base = world(10)
        var g = DetRNG(seed: 9, key: 0, stream: 0, serial: 0)
        var commands: [IssuedCommand] = []
        for k in 0..<40 {
            let row = Int(g.below(10))
            let target = GovRef(row: Idx(raw: UInt16(row)), serial: Serial(raw: UInt32(row + 1)))
            let issuer: Issuer = [Issuer.event, .player(target), .ai(target)][Int(g.below(3))]
            commands.append(IssuedCommand(day: start.adding(days: 1 + Int(g.below(3))), issuer: issuer, sequence: UInt64(k),
                                          command: .setTaxRate(government: target, rate: BP(raw: Int32(g.below(10_001))))))
        }
        var hashes = Set<UInt64>()
        for round in 0..<6 {
            var sim = base
            var order = commands
            var r = DetRNG(seed: UInt64(round), key: 0, stream: 1, serial: 0)
            r.shuffle(&order)
            sim.step() // the governments exist: the player's orders are checked when given
            for c in order { XCTAssertEqual(sim.submit(c), .queued) }
            sim.advance(days: 5)
            hashes.insert(sim.state.hash)
        }
        XCTAssertEqual(hashes.count, 1, "the order of arrival never changes the result")
    }

    func testARejectedCommandChangesNothing() {
        var sim = world(3)
        sim.step()
        let before = sim.state
        let live = sim.state.governments.ref(1)
        let stale = GovRef(row: live.row, serial: Serial(raw: 999))
        let rejected: [Command] = [
            .setTaxRate(government: stale, rate: BP(raw: 1_000)),
            .setTaxRate(government: live, rate: BP(raw: 10_001)),
            .setTaxRate(government: live, rate: BP(raw: -1)),
            .createGovernment(polity: Idx(raw: 77), treasury: .zero, taxBase: .zero, taxRate: .zero),
            .createGovernment(polity: Idx(raw: 0), treasury: .zero, taxBase: LCU(raw: -5), taxRate: .zero),
            .dissolveGovernment(government: stale),
            .dissolveGovernment(government: GovRef(row: Idx(raw: 300), serial: Serial(raw: 1))),
            .dissolveGovernment(government: live, provincesTo: live),
            .dissolveGovernment(government: live, provincesTo: stale),
        ]
        for c in rejected {
            var s = sim.state
            XCTAssertFalse(c.validate(s, by: .event), "\(c)")
            XCTAssertFalse(c.apply(to: &s, by: .event, strategicPeriod: Simulation.strategicPeriod))
            XCTAssertEqual(s.hash, before.hash, "\(c) changed the state")
        }
        // and a dissolved government's reference stays dead after its row is reused
        var s = sim.state
        XCTAssertTrue(Command.dissolveGovernment(government: live).apply(to: &s, by: .event, strategicPeriod: 30))
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 1), treasury: .zero, taxBase: .zero, taxRate: .zero).apply(to: &s, by: .event, strategicPeriod: 30))
        XCTAssertTrue(s.governments.exists[live.row.int], "the row is reused")
        XCTAssertFalse(s.governments.isLive(live), "the old reference finds nothing")
        XCTAssertFalse(Command.setTaxRate(government: live, rate: .zero).validate(s, by: .event))
    }

    func testEveryCommandSurvivesItsCodec() {
        let g = GovRef(row: Idx(raw: 383), serial: Serial(raw: 4_000_000_000))
        let all: [Command] = [
            .setTaxRate(government: g, rate: BP(raw: 10_000)),
            .setTaxRate(government: GovRef(row: Idx(raw: 0), serial: Serial(raw: 1)), rate: .zero),
            .createGovernment(polity: Idx(raw: 383), treasury: LCU(raw: .min), taxBase: LCU(raw: .max), taxRate: BP(raw: 2_500)),
            .dissolveGovernment(government: g),
        ]
        var w = ByteWriter()
        for c in all { c.write(to: &w) }
        var r = ByteReader(w.bytes)
        for c in all { XCTAssertEqual(Command.read(from: &r), c) }
        XCTAssertEqual(r.remaining, 0)
        // the stored numbers never change
        XCTAssertEqual(all.map { $0.tag }, [1, 1, 100, 101])
        // an unknown number, or bytes cut short: nil, and the reader stays
        var unknown = ByteReader([7, 0, 1, 2])
        XCTAssertNil(Command.read(from: &unknown))
        XCTAssertEqual(unknown.offset, 0)
        for cut in 0..<w.bytes.count {
            var short = ByteReader(Array(w.bytes.prefix(cut)))
            var read = 0
            while Command.read(from: &short) != nil { read += 1 }
            XCTAssertLessThan(read, all.count, "a cut stream never reads every command")
            XCTAssertLessThanOrEqual(short.offset, cut)
        }
    }

    func testTaxesFillTheTreasuryOnceAMonth() {
        var sim = world(1)
        sim.advance(days: 365)
        // 12 months of 20% of 10,000
        XCTAssertEqual(sim.state.ledger.balance(0, .treasury), LCU(raw: 1_000 + 12 * 2_000))
        XCTAssertTrue(sim.state.ledgerViolations().isEmpty)
        XCTAssertEqual(sim.state.world.ledgerFailures, 0)
        XCTAssertEqual(sim.state.governments.monthlyRuns[0], 12)
        XCTAssertEqual(sim.state.world.monthStarts, 12)
        XCTAssertEqual(sim.state.world.quarterStarts, 4)
        XCTAssertEqual(sim.state.world.yearStarts, 1)
    }

    /// §2.4's order within a day: the commands come first, then the calendar, then the monthly slot.
    func testTheStepsOfADayInOrder() {
        var sim = world(1)
        let steps = Steps()
        sim.observe = { steps.add($0) }
        steps.date = start
        sim.step()
        let kinds = steps.all.map { step -> String in
            switch step.1 {
            case .commands: return "commands"
            case .monthStart: return "month"
            case .quarterStart: return "quarter"
            case .yearStart: return "year"
            case .refused: return "refused"
            case .monthClose: return "close"
            case .monthly: return "monthly"
            case .yearly: return "yearly"
            case .strategic: return "strategic"
            }
        }
        XCTAssertEqual(Array(kinds.prefix(5)), ["commands", "month", "quarter", "year", "close"])
        XCTAssertTrue(kinds.contains("monthly"), "the government made today ran in today's slot")
    }
}

extension SimulationTests {
    /// 300 governments due on one day: 15 run, in (due date, serial) order; the rest the next days.
    func testTheStaggerCapBindsInOrder() {
        var sim = world(300)
        sim.step()
        let today = sim.state.world.date
        for i in 0..<300 { sim.state.governments.aiNextStrategic[i] = today.adding(days: -(i % 3)) }
        let steps = Steps()
        sim.observe = { steps.add($0) }
        sim.step()
        var ran: [UInt32] = []
        for s in steps.all {
            if case let .strategic(g) = s.1 { ran.append(g.serial.raw) }
        }
        XCTAssertEqual(ran.count, Simulation.strategicPerDay)
        // the earliest due first (those due two days ago: rows 2, 5, 8, …), by serial within a date
        var expected: [UInt32] = []
        var row = 2
        while expected.count < 15 {
            expected.append(UInt32(row + 1))
            row += 3
        }
        XCTAssertEqual(ran, expected)
    }

    func testAnInvalidPlayerOrderIsRefusedWhenGivenAndOneCanBeCancelled() {
        var sim = world(2)
        sim.step()
        let g = sim.state.governments.ref(0)
        let today = sim.state.world.date
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: BP(raw: 50_000)))), .invalid)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .player(g), sequence: 2, command: .setTaxRate(government: g, rate: BP(raw: 500)))), .queued)
        XCTAssertTrue(sim.cancel(day: today, issuer: .player(g), sequence: 2))
        XCTAssertFalse(sim.cancel(day: today, issuer: .player(g), sequence: 2))
        XCTAssertTrue(sim.pending.isEmpty)
        XCTAssertNil(sim.state.addProvince(sovereign: Idx(raw: 77), administrator: g, population: Pop32(raw: 1)), "no such polity")
    }

    func testSubmitRefusesLateDuplicateAndFull() {
        var sim = world(2)
        sim.step()
        let g = sim.state.governments.ref(0)
        let today = sim.state.world.date
        XCTAssertEqual(sim.submit(IssuedCommand(day: today.adding(days: -1), issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: .zero))), .late)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: .zero))), .queued)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: .one))), .duplicateKey)
        // the same sequence from another issuer is another key
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .ai(g), sequence: 1, command: .setTaxRate(government: g, rate: .one))), .queued)
        for k in 2...Simulation.playerCapacity {
            XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .player(g), sequence: UInt64(k), command: .setTaxRate(government: g, rate: .zero))), .queued)
        }
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .player(g), sequence: 999, command: .setTaxRate(government: g, rate: .zero))), .full)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .ai(g), sequence: 999, command: .setTaxRate(government: g, rate: .zero))), .queued,
                       "the player's room is full, the AI's is not")
        // the queue is part of the state: two states that differ only in a waiting command hash apart
        var other = world(2)
        other.step()
        XCTAssertNotEqual(sim.state.hash, other.state.hash)
    }

    func testEachIssuerMayGiveOnlyItsOwnCommands() {
        var sim = world(2)
        sim.step()
        let mine = sim.state.governments.ref(0)
        let theirs = sim.state.governments.ref(1)
        let s = sim.state
        XCTAssertTrue(Command.setTaxRate(government: mine, rate: .zero).validate(s, by: .player(mine)))
        XCTAssertTrue(Command.setTaxRate(government: mine, rate: .zero).validate(s, by: .ai(mine)))
        XCTAssertFalse(Command.setTaxRate(government: theirs, rate: .zero).validate(s, by: .player(mine)), "not another government's tax")
        XCTAssertFalse(Command.setTaxRate(government: theirs, rate: .zero).validate(s, by: .ai(mine)))
        XCTAssertFalse(Command.dissolveGovernment(government: theirs).validate(s, by: .player(mine)), "lifecycle effects come from events")
        XCTAssertFalse(Command.createGovernment(polity: Idx(raw: 0), treasury: .zero, taxBase: .zero, taxRate: .zero).validate(s, by: .ai(mine)))
        XCTAssertTrue(Command.dissolveGovernment(government: theirs).validate(s, by: .event))
        // an issuer whose government has ended gives nothing
        var gone = s
        XCTAssertTrue(Command.dissolveGovernment(government: mine).apply(to: &gone, by: .event, strategicPeriod: 30))
        XCTAssertFalse(Command.setTaxRate(government: theirs, rate: .zero).validate(gone, by: .player(mine)))
    }

    /// A dissolved government's provinces go to its named successor, or to nobody: never to whoever takes its row next.
    func testADissolvedGovernmentsProvincesNeverPassToTheNextInItsRow() {
        var sim = world(3)
        sim.step()
        let gbagbo = sim.state.governments.ref(0)
        let ouattara = sim.state.governments.ref(1)
        let other = sim.state.governments.ref(2)
        let abidjan = sim.state.addProvince(sovereign: Idx(raw: 0), administrator: gbagbo, population: Pop32(raw: 4_700_000))!
        let north = sim.state.addProvince(sovereign: Idx(raw: 0), administrator: gbagbo, population: Pop32(raw: 1_000_000))!
        let elsewhere = sim.state.addProvince(sovereign: Idx(raw: 2), administrator: other, population: Pop32(raw: 9))!
        var s = sim.state
        XCTAssertTrue(Command.dissolveGovernment(government: gbagbo, provincesTo: ouattara).apply(to: &s, by: .event, strategicPeriod: 30))
        XCTAssertEqual(s.provinces.administrator[abidjan.int], ouattara.row)
        XCTAssertEqual(s.provinces.administrator[north.int], ouattara.row)
        XCTAssertEqual(s.provinces.administrator[elsewhere.int], other.row)
        // a new government in the freed row administers nothing
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 2), treasury: .zero, taxBase: .zero, taxRate: .zero).apply(to: &s, by: .event, strategicPeriod: 30))
        XCTAssertTrue(s.governments.exists[gbagbo.row.int])
        XCTAssertFalse(s.provinces.administrator.contains(gbagbo.row))
        // with no successor, nobody
        var t = sim.state
        XCTAssertTrue(Command.dissolveGovernment(government: gbagbo).apply(to: &t, by: .event, strategicPeriod: 30))
        XCTAssertEqual(t.provinces.administrator[abidjan.int], Idx<GovernmentKind>.absent)
    }

    /// A government made into a reused row starts exactly as one made into a new row: nothing of the dissolved one stays.
    func testAReusedRowEqualsAFreshOne() {
        var sim = world(2)
        sim.advance(days: 40)
        var s = sim.state
        let old = s.governments.ref(0)
        XCTAssertTrue(Command.dissolveGovernment(government: old).apply(to: &s, by: .event, strategicPeriod: 30))
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 5), taxBase: LCU(raw: 6), taxRate: BP(raw: 7)).apply(to: &s, by: .event, strategicPeriod: 30))
        var fresh = WorldState(start: s.world.date, seed: 1)
        _ = fresh.addPolity()
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 5), taxBase: LCU(raw: 6), taxRate: BP(raw: 7)).apply(to: &fresh, by: .event, strategicPeriod: 30))
        let g = s.governments, f = fresh.governments
        let r = old.row.int
        XCTAssertEqual(g.polity[r], f.polity[0])
        XCTAssertEqual(g.lastMonthlyRun[r], f.lastMonthlyRun[0])
        XCTAssertEqual(g.lastYearlyRun[r], f.lastYearlyRun[0])
        XCTAssertEqual(g.taxRate[r], f.taxRate[0])
        XCTAssertEqual(g.taxBase[r], f.taxBase[0])
        XCTAssertEqual(g.monthlyRuns[r], 0)
        XCTAssertEqual(g.yearlyRuns[r], 0)
        XCTAssertEqual(g.strategicRuns[r], 0)
        XCTAssertEqual(s.ledger.balance(r, .treasury), LCU(raw: 5))
        XCTAssertEqual(s.ledger.balance(r, .moneyBase), .zero)
        XCTAssertEqual(s.ledger.reserves[r], .zero)
        XCTAssertNotEqual(g.serial[r], old.serial, "a new serial")
    }

    /// A successor takes over its predecessor's yearly calendar, so the year's yearly run is not made twice.
    func testASuccessorDoesNotRepeatTheYearlyRun() {
        var sim = world(1)
        sim.advance(days: 3)
        let first = sim.state.governments.ref(0)
        XCTAssertEqual(sim.state.governments.lastYearlyRun[0], 2011)
        sim.submit(IssuedCommand(day: sim.state.world.date, issuer: .event, sequence: 1, command: .dissolveGovernment(government: first)))
        sim.submit(IssuedCommand(day: sim.state.world.date, issuer: .event, sequence: 2,
                                 command: .createGovernment(polity: Idx(raw: 0), treasury: .zero, taxBase: .zero, taxRate: .zero, successorOf: first)))
        sim.advance(days: 30)
        XCTAssertEqual(sim.state.governments.lastYearlyRun[0], 2011)
        XCTAssertEqual(sim.state.governments.yearlyRuns[0], 0, "the predecessor already ran 2011's")
    }

    /// A command refused when its day comes is counted, and the observer sees it.
    func testARefusedCommandIsCounted() {
        var sim = world(2)
        sim.step()
        let g = sim.state.governments.ref(1)
        let steps = Steps()
        sim.observe = { steps.add($0) }
        let today = sim.state.world.date
        sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 1, command: .dissolveGovernment(government: g)))
        sim.submit(IssuedCommand(day: today, issuer: .ai(g), sequence: 1, command: .setTaxRate(government: g, rate: .zero)))
        sim.step()
        XCTAssertEqual(sim.state.world.refusedCommands, 1)
        XCTAssertTrue(steps.all.contains { if case .refused = $0.1 { return true } else { return false } })
    }

    /// The day's clamps are counted by the host's long scope: the days run inside it, and a clamp made by a system is
    /// counted once.
    func testADaysClampsAreCountedInsideTheHostsScope() async {
        var sim = world(1)
        sim.step()
        let g = sim.state.governments.ref(0)
        sim.state.post(g, .treasury, .spending, LCU(raw: (1 << 60) - sim.state.ledger.balance(0, .treasury).raw))
        let c = SaturationCounter()
        await Saturation.countingAcrossAwaits(into: c) {
            sim.state.post(g, .treasury, .tax, LCU(raw: .max))
            await Task.yield()
            sim.advance(days: 1)
        }
        XCTAssertGreaterThanOrEqual(c.count, 1, "the clamp of a posting past the range is counted")
    }

    func testIssuedCommandsSurviveTheirCodec() {
        let g = GovRef(row: Idx(raw: 7), serial: Serial(raw: 9))
        let all = [
            IssuedCommand(day: start, issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: BP(raw: 1))),
            IssuedCommand(day: start.adding(days: 40), issuer: .event, sequence: .max, command: .dissolveGovernment(government: g, provincesTo: GovRef(row: Idx(raw: 1), serial: Serial(raw: 2)))),
            IssuedCommand(day: GameDate(days: -43_829), issuer: .ai(g), sequence: 0, command: .createGovernment(polity: Idx(raw: 3), treasury: .zero, taxBase: .zero, taxRate: .zero, successorOf: g)),
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
}

extension WorldState {
    /// A polity added in the middle of a test.
    mutating func addPolity_forTests() -> Idx<PolityKind> { addPolity()! }
}
