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
            sim.submit(IssuedCommand(day: start, issuerRank: 100, sequence: seq,
                                     command: .createGovernment(polity: Idx(raw: UInt16(p)), treasury: LCU(raw: 1_000),
                                                                taxBase: LCU(raw: 10_000 + Int64(p)), taxRate: BP(raw: 2_000))))
            if sim.pending.count == Simulation.pendingCapacity { sim.step() }
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
                    sim.submit(IssuedCommand(day: today, issuerRank: 100, sequence: seq, command: .dissolveGovernment(government: ref)))
                    dissolvedOn[ref.serial.raw] = today
                    seq += 1
                    sim.submit(IssuedCommand(day: today, issuerRank: 100, sequence: seq,
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
        sim.submit(IssuedCommand(day: sim.state.world.date, issuerRank: 100, sequence: 9_999,
                                 command: .createGovernment(polity: p, treasury: .zero, taxBase: .zero, taxRate: .zero)))
        sim.step()
        let row = sim.state.governments.rows - 1
        XCTAssertEqual(sim.state.governments.lastMonthlyRun[row], Int32(month(GameDate(year: 2011, month: 1, day: 30)!)))
        // made on the 3rd: the least-loaded slot from the 3rd on, the earliest of equals
        while sim.state.world.date.day != 3 { sim.step() }
        let q = sim.state.addPolity_forTests()
        sim.submit(IssuedCommand(day: sim.state.world.date, issuerRank: 100, sequence: 10_000,
                                 command: .createGovernment(polity: q, treasury: .zero, taxBase: .zero, taxRate: .zero)))
        sim.step()
        let newSlot = sim.state.governments.monthlySlot[sim.state.governments.rows - 1]
        XCTAssertGreaterThanOrEqual(newSlot, 3)
        XCTAssertNotEqual(newSlot, sim.state.governments.monthlySlot[row], "the 29th's government took one slot; this one takes another")
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
            commands.append(IssuedCommand(day: start.adding(days: Int(g.below(3))), issuerRank: UInt16(g.below(3)), sequence: UInt64(k),
                                          command: .setTaxRate(government: GovRef(row: Idx(raw: UInt16(row)), serial: Serial(raw: UInt32(row + 1))),
                                                               rate: BP(raw: Int32(g.below(10_001))))))
        }
        var hashes = Set<UInt64>()
        for round in 0..<6 {
            var sim = base
            var order = commands
            var r = DetRNG(seed: UInt64(round), key: 0, stream: 1, serial: 0)
            r.shuffle(&order)
            sim.advance(days: 0)
            for c in order where !sim.submit(c) { sim.step() }
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
        ]
        for c in rejected {
            var s = sim.state
            XCTAssertFalse(c.validate(s), "\(c)")
            XCTAssertFalse(c.apply(to: &s, strategicPeriod: Simulation.strategicPeriod))
            XCTAssertEqual(s.hash, before.hash, "\(c) changed the state")
        }
        // and a dissolved government's reference stays dead after its row is reused
        var s = sim.state
        XCTAssertTrue(Command.dissolveGovernment(government: live).apply(to: &s, strategicPeriod: 30))
        XCTAssertTrue(Command.createGovernment(polity: Idx(raw: 1), treasury: .zero, taxBase: .zero, taxRate: .zero).apply(to: &s, strategicPeriod: 30))
        XCTAssertTrue(s.governments.exists[live.row.int], "the row is reused")
        XCTAssertFalse(s.governments.isLive(live), "the old reference finds nothing")
        XCTAssertFalse(Command.setTaxRate(government: live, rate: .zero).validate(s))
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
        XCTAssertEqual(sim.state.governments.treasury[0], LCU(raw: 1_000 + 12 * 2_000))
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
            case .monthly: return "monthly"
            case .yearly: return "yearly"
            case .strategic: return "strategic"
            }
        }
        XCTAssertEqual(Array(kinds.prefix(4)), ["commands", "month", "quarter", "year"])
        XCTAssertTrue(kinds.contains("monthly"), "the government made today ran in today's slot")
    }
}

extension WorldState {
    /// A polity added in the middle of a test.
    mutating func addPolity_forTests() -> Idx<PolityKind> { addPolity()! }
}
