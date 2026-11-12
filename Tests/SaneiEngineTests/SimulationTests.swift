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
        // the scenario's set-up: the first 64 governments by the events of the first day, the rest before it starts
        // (an event's room is 64), so the commands' step is exercised and any number can be made
        let direct = Swift.max(0, n - Simulation.eventCapacity)
        for p in 0..<direct {
            _ = w.createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: 1_000), taxBase: LCU(raw: 10_000 + Int64(p)),
                                   taxRate: BP(raw: 2_000), strategicPeriod: Simulation.strategicPeriod)
        }
        var sim = Simulation(state: w)
        var seq: UInt64 = 0
        for p in direct..<n {
            seq += 1
            let queued = sim.submit(IssuedCommand(day: start, issuer: .event, sequence: seq,
                                                  command: .createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: 1_000),
                                                                             taxBase: LCU(raw: 10_000 + Int64(p)), taxRate: BP(raw: 2_000))))
            precondition(queued == .queued)
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
        // over 120 days, 200 governments with a 30-day period: everyone looked at 2 to 5 times
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
            .dissolveGovernment(government: live, provincesTo: GovRef(row: Idx(raw: 2), serial: Serial(raw: 3))),  // another polity's
        ]
        for c in rejected {
            var s = sim.state
            XCTAssertFalse(c.validate(s, by: .event), "\(c)")
            XCTAssertFalse(c.apply(to: &s, by: .event))
            XCTAssertEqual(s.hash, before.hash, "\(c) changed the state")
        }
        // and a dissolved government's reference stays dead after its row is reused
        var s = sim.state
        XCTAssertTrue(Command.dissolveGovernment(government: live).apply(to: &s, by: .event))
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 1), treasury: .zero, taxBase: .zero, taxRate: .zero).apply(to: &s, by: .event))
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
            .succeedGovernment(government: g),
        ]
        var w = ByteWriter()
        for c in all { c.write(to: &w) }
        var r = ByteReader(w.bytes)
        for c in all { XCTAssertEqual(Command.read(from: &r), c) }
        XCTAssertEqual(r.remaining, 0)
        // the stored numbers never change
        XCTAssertEqual(all.map { $0.tag }, [1, 1, 100, 101, 102])
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
        // and after them, on a January slot day with a look due: the monthly slot, the stagger, then the yearly run
        var later = world(1)
        later.advance(days: 365)                                   // the next day to run is 1 January 2012
        XCTAssertEqual(later.state.world.date, GameDate(year: 2012, month: 1, day: 1))
        later.state.governments.aiNextStrategic[0] = later.state.world.date
        let laterSteps = Steps()
        later.observe = { laterSteps.add($0) }
        later.step()
        let order = laterSteps.all.compactMap { step -> String? in
            switch step.1 {
            case .monthly: return "monthly"
            case .strategic: return "strategic"
            case .yearly: return "yearly"
            default: return nil
            }
        }
        XCTAssertEqual(order, ["monthly", "strategic", "yearly"])
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
        // the oldest due always runs first, so none waits for ever: 300 due at once have all had their look 20 days on
        sim.observe = nil
        sim.advance(days: 19)
        XCTAssertTrue((0..<300).allSatisfy { sim.state.governments.strategicRuns[$0] >= 1 }, "nobody skipped")
    }

    func testAnInvalidPlayerOrderIsRefusedWhenGivenAndOneCanBeCancelled() {
        var sim = world(2)
        sim.step()
        let g = sim.state.governments.ref(0)
        let today = sim.state.world.date
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: BP(raw: 50_000)))), .invalid)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .player(g), sequence: 2, command: .setTaxRate(government: g, rate: BP(raw: 500)))), .queued)
        XCTAssertTrue(sim.cancel(day: today, government: g, sequence: 2))
        XCTAssertFalse(sim.cancel(day: today, government: g, sequence: 2))
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
        // the AI filling its room never keeps out an event
        for k in 1000..<(1000 + Simulation.aiCapacity) {
            _ = sim.submit(IssuedCommand(day: today, issuer: .ai(g), sequence: UInt64(k), command: .setTaxRate(government: g, rate: .zero)))
        }
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .ai(g), sequence: 5_000, command: .setTaxRate(government: g, rate: .zero))), .full)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 1, command: .dissolveGovernment(government: g))), .queued)
        XCTAssertEqual(sim.pending.count, Simulation.playerCapacity + Simulation.aiCapacity + 1)
        // only the player's orders can be taken back
        XCTAssertFalse(sim.cancel(day: today, government: g, sequence: 999))
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
        XCTAssertTrue(Command.dissolveGovernment(government: mine).apply(to: &gone, by: .event))
        XCTAssertFalse(Command.setTaxRate(government: theirs, rate: .zero).validate(gone, by: .player(mine)))
    }

    /// A dissolved government's provinces go to its named successor, or to nobody: never to whoever takes its row next.
    func testADissolvedGovernmentsProvincesNeverPassToTheNextInItsRow() {
        var sim = world(3)
        sim.step()
        // Côte d'Ivoire, 2011: two governments of one polity
        sim.submit(IssuedCommand(day: sim.state.world.date, issuer: .event, sequence: 1,
                                 command: .createGovernment(polity: Idx(raw: 0), treasury: .zero, taxBase: .zero, taxRate: .zero)))
        sim.step()
        let gbagbo = sim.state.governments.ref(0)
        let ouattara = sim.state.governments.ref(3)
        let other = sim.state.governments.ref(2)
        XCTAssertEqual(sim.state.governments.polity[ouattara.row.int], Idx(raw: 0))
        let abidjan = sim.state.addProvince(sovereign: Idx(raw: 0), administrator: gbagbo, population: Pop32(raw: 4_700_000))!
        let north = sim.state.addProvince(sovereign: Idx(raw: 0), administrator: gbagbo, population: Pop32(raw: 1_000_000))!
        let elsewhere = sim.state.addProvince(sovereign: Idx(raw: 2), administrator: other, population: Pop32(raw: 9))!
        var s = sim.state
        XCTAssertTrue(Command.dissolveGovernment(government: gbagbo, provincesTo: ouattara).apply(to: &s, by: .event))
        XCTAssertEqual(s.provinces.administrator[abidjan.int], ouattara.row)
        XCTAssertEqual(s.provinces.administrator[north.int], ouattara.row)
        XCTAssertEqual(s.provinces.administrator[elsewhere.int], other.row)
        // a new government in the freed row administers nothing
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 2), treasury: .zero, taxBase: .zero, taxRate: .zero).apply(to: &s, by: .event))
        XCTAssertTrue(s.governments.exists[gbagbo.row.int])
        XCTAssertFalse(s.provinces.administrator.contains(gbagbo.row))
        // with no successor, nobody
        var t = sim.state
        XCTAssertTrue(Command.dissolveGovernment(government: gbagbo).apply(to: &t, by: .event))
        XCTAssertEqual(t.provinces.administrator[abidjan.int], Idx<GovernmentKind>.absent)
    }

    /// A government made into a reused row starts exactly as one made into a new row: nothing of the dissolved one stays.
    func testAReusedRowEqualsAFreshOne() {
        var sim = world(2)
        sim.advance(days: 40)
        var s = sim.state
        let old = s.governments.ref(0)
        XCTAssertTrue(Command.dissolveGovernment(government: old).apply(to: &s, by: .event))
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 5), taxBase: LCU(raw: 6), taxRate: BP(raw: 7)).apply(to: &s, by: .event))
        var fresh = WorldState(start: s.world.date, seed: 1)
        _ = fresh.addPolity()
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 5), taxBase: LCU(raw: 6), taxRate: BP(raw: 7)).apply(to: &fresh, by: .event))
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
        XCTAssertEqual(s.ledger.balance(r, .domesticDebt), .zero)
        XCTAssertEqual(s.ledger.reserves[r], .zero)
        XCTAssertNotEqual(g.serial[r], old.serial, "a new serial")
    }

    /// A successor takes its predecessor's place in one step: its provinces, its accounts, its slot and its calendar,
    /// so neither this month's run nor this year's is made twice; the references to the one that ended reach nothing.
    /// A government made in between (which a create-then-name design would have let take the row) changes nothing.
    func testASuccessorTakesThePlaceAndRepeatsNoRun() {
        var sim = world(2)
        sim.advance(days: 9)                                       // January's monthly and yearly runs are made
        let first = sim.state.governments.ref(0)
        let province = sim.state.addProvince(sovereign: Idx(raw: 0), administrator: first, population: Pop32(raw: 5))!
        let treasury = sim.state.ledger.balance(0, .treasury)
        let slot = sim.state.governments.monthlySlot[0]
        XCTAssertEqual(sim.state.governments.lastYearlyRun[0], 2011)
        let today = sim.state.world.date
        sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 1,
                                 command: .createGovernment(polity: Idx(raw: 1), treasury: .zero, taxBase: .zero, taxRate: .zero)))
        sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 2, command: .succeedGovernment(government: first)))
        sim.step()
        let next = sim.state.governments.ref(0)
        XCTAssertNotEqual(next.serial, first.serial)
        XCTAssertTrue(sim.state.governments.isLive(next))
        XCTAssertFalse(sim.state.governments.isLive(first), "the old reference reaches nothing")
        XCTAssertEqual(sim.state.provinces.administrator[province.int], next.row)
        XCTAssertEqual(sim.state.ledger.balance(0, .treasury), treasury)
        XCTAssertEqual(sim.state.governments.monthlySlot[0], slot)
        sim.advance(days: 21)                                      // to the end of January
        XCTAssertEqual(sim.state.governments.monthlyRuns[0], 0, "January's monthly run was made by the predecessor")
        XCTAssertEqual(sim.state.governments.yearlyRuns[0], 0, "and 2011's yearly run")
        XCTAssertTrue(sim.state.ledgerViolations().isEmpty)
        sim.advance(days: 28)                                      // February
        XCTAssertEqual(sim.state.governments.monthlyRuns[0], 1, "February's, once")
        // the old government can give nothing any more
        XCTAssertEqual(sim.submit(IssuedCommand(day: sim.state.world.date, issuer: .player(first), sequence: 1,
                                                command: .setTaxRate(government: first, rate: .zero))), .invalid)
    }

    /// A succession hands the player's waiting orders to the successor; a stale or made-up issuer is refused when it
    /// submits; the AI's and events' refusals at submit are counted in the state.
    func testASuccessionKeepsThePlayersOrdersAndStaleIssuersAreRefused() {
        var sim = world(3)
        sim.step()
        let mine = sim.state.governments.ref(1)
        let today = sim.state.world.date
        XCTAssertEqual(sim.submit(IssuedCommand(day: today.adding(days: 3), issuer: .player(mine), sequence: 1,
                                                command: .setTaxRate(government: mine, rate: BP(raw: 4_321)))), .queued)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today.adding(days: 1), issuer: .event, sequence: 1, command: .succeedGovernment(government: mine))), .queued)
        sim.advance(days: 4)
        let next = sim.state.governments.ref(1)
        XCTAssertNotEqual(next.serial, mine.serial)
        XCTAssertEqual(sim.state.governments.taxRate[1], BP(raw: 4_321), "the order went through, as the successor's")
        XCTAssertEqual(sim.state.world.refusedCommands, 0)
        // a made-up AI issuer cannot take the key of the real one
        let fake = GovRef(row: Idx(raw: 2), serial: Serial(raw: 99))
        let d = sim.state.world.date
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .ai(fake), sequence: 5, command: .setTaxRate(government: fake, rate: .zero))), .invalid)
        XCTAssertEqual(sim.state.world.refusedSubmits, 1)
        XCTAssertEqual(sim.submit(IssuedCommand(day: d.adding(days: -1), issuer: .event, sequence: 5, command: .dissolveGovernment(government: next))), .late)
        XCTAssertEqual(sim.state.world.refusedSubmits, 2)
        XCTAssertEqual(sim.submit(IssuedCommand(day: d, issuer: .player(next), sequence: 9, command: .setTaxRate(government: next, rate: BP(raw: 99_999)))), .invalid)
        XCTAssertEqual(sim.state.world.refusedSubmits, 2, "the player's refusals are shown to the player, not counted")
    }

    /// The queue is kept in the order commands are applied in, so the state, its hash and a save taken between days
    /// never depend on the order commands arrived in; a command the codec cannot read back is refused from anyone.
    func testTheQueueNeverDependsOnArrivalAndHoldsOnlyWhatItCanSave() {
        var sim = world(3)
        sim.step()
        let g = sim.state.governments.ref(1)
        let day = sim.state.world.date.adding(days: 2)
        let a = IssuedCommand(day: day, issuer: .ai(g), sequence: 4, command: .setTaxRate(government: g, rate: BP(raw: 100)))
        let b = IssuedCommand(day: day, issuer: .event, sequence: 9, command: .setTaxRate(government: g, rate: BP(raw: 200)))
        let c = IssuedCommand(day: day.adding(days: -1), issuer: .player(g), sequence: 1, command: .setTaxRate(government: g, rate: BP(raw: 300)))
        var one = sim, two = sim
        for x in [a, b, c] { XCTAssertEqual(one.submit(x), .queued) }
        for x in [c, a, b] { XCTAssertEqual(two.submit(x), .queued) }
        XCTAssertEqual(one.state, two.state)
        XCTAssertEqual(one.state.hash, two.state.hash)
        XCTAssertEqual(one.pending, [c, b, a])
        let none = GovRef(row: Idx(raw: 1), serial: Serial(raw: 0))
        let today = sim.state.world.date
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 1, command: .dissolveGovernment(government: none))), .unwritable)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 2,
                                                command: .dissolveGovernment(government: g, provincesTo: GovRef(row: Idx(raw: 0), serial: Serial(raw: 0))))), .unwritable)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .event, sequence: 3,
                                                command: .createGovernment(polity: .absent, treasury: .zero, taxBase: .zero, taxRate: .zero))), .unwritable)
        XCTAssertEqual(sim.submit(IssuedCommand(day: today, issuer: .ai(GovRef(row: .absent, serial: Serial(raw: 5))), sequence: 4,
                                                command: .setTaxRate(government: g, rate: .zero))), .unwritable)
        XCTAssertTrue(sim.pending.isEmpty)
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

    /// The day's clamps are counted by the host's long scope: the days run inside it, and a clamp a day's system
    /// makes by itself is counted. (The ledger never clamps, it refuses; the tax's own product does clamp when a base at
    /// the top of the range meets a rate set past 100% here by hand, which no command allows.)
    func testADaysClampsAreCountedInsideTheHostsScope() async {
        var w = WorldState(start: start, seed: 1)
        _ = w.addPolity()
        var sim = Simulation(state: w)
        sim.submit(IssuedCommand(day: start, issuer: .event, sequence: 1,
                                 command: .createGovernment(polity: Idx(raw: 0), treasury: LCU(raw: 10), taxBase: LCU(raw: 10), taxRate: .one)))
        sim.step()                                                 // the 1st: made, and its first monthly run
        sim.state.governments.taxBase[0] = LCU(raw: .max)
        sim.state.governments.taxRate[0] = BP(raw: 20_000)
        let outside = SaturationCounter()
        let inside = SaturationCounter()
        Saturation.counting(into: outside) { sim.advance(days: 2) }  // no slot day: nothing clamps
        await Saturation.countingAcrossAwaits(into: inside) {
            await Task.yield()
            sim.advance(days: 31)                                  // February's run, on its slot, clamps
        }
        XCTAssertEqual(outside.count, 0)
        XCTAssertGreaterThanOrEqual(inside.count, 1, "a clamp made by the day itself is counted by the host's scope")
        XCTAssertGreaterThanOrEqual(sim.state.world.refusedPostings, 1, "and the ledger refused the clamped amount")
    }

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
}

extension WorldState {
    /// A polity added in the middle of a test.
    mutating func addPolity_forTests() -> Idx<PolityKind> { addPolity()! }
}
