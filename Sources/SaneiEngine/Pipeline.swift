import SaneiCore

// One day of the simulation, in §2.4's order. The skeleton runs the steps that decide when things happen: the commands,
// the calendar jobs, the monthly slot (exactly one run per government per month), the yearly run in each government's
// January slot, and the strategic stagger. The systems that fill these steps arrive with their tasks; two thin ones
// stand in now (taxes into the treasury, and counters). Nothing here allocates per day once the simulation is made.
// stdlib only, through SaneiCore.

/// The steps of a day that a test can watch (`Simulation.observe`).
public enum DayStep: Sendable, Equatable {
    case commands
    case monthStart, quarterStart, yearStart
    case monthly(GovRef)
    case yearly(GovRef)
    case strategic(GovRef)
}

/// A game being simulated: its state, the commands waiting for their day, and the working room a day needs.
public struct Simulation: Sendable {
    /// How many days apart a government's strategic looks are (difficulty sets it in §5.10; one value until then).
    public static let strategicPeriod = 30
    /// The most governments the strategic AI looks at in a day (§2.4).
    public static let strategicPerDay = 15
    /// The most commands waiting at once (§3.9: 64 while paused).
    public static let pendingCapacity = 64

    public internal(set) var state: WorldState
    /// Commands not yet applied, in arrival order.
    public private(set) var pending: [IssuedCommand]
    /// The working room of the stagger: governments due, as (due, serial, row).
    var due: [(GameDate, UInt32, Int)]
    /// Called at each step, for tests (nil in the game: no cost).
    public var observe: (@Sendable (DayStep) -> Void)?

    public init(state: WorldState) {
        self.state = state
        pending = []
        pending.reserveCapacity(Self.pendingCapacity)
        due = []
        due.reserveCapacity(GovernmentTable.capacity)
        observe = nil
    }

    /// Queues a command for its day; false when the queue is full (the caller tells the player).
    @discardableResult
    public mutating func submit(_ c: IssuedCommand) -> Bool {
        guard pending.count < Self.pendingCapacity else { return false }
        pending.append(c)
        return true
    }

    /// Runs `days` days.
    public mutating func advance(days: Int) {
        for _ in 0..<days { step() }
    }

    /// Runs one day: the date the world holds, then the date moves on.
    public mutating func step() {
        let date = state.world.date
        let civil = date.civil
        let monthIndex = Int32(civil.year * 12 + civil.month - 1)
        let year = Int32(civil.year)

        // 1. commands due today, in (day, issuerRank, sequence) order
        applyCommands(upTo: date)

        // 2. the calendar jobs (their systems come with M2 and M6; the counters show they ran, and when)
        if civil.day == 1 {
            state.world.monthStarts &+= 1
            observe?(.monthStart)
            if (civil.month - 1) % 3 == 0 {
                state.world.quarterStarts &+= 1
                observe?(.quarterStart)
            }
            if civil.month == 1 {
                state.world.yearStarts &+= 1
                observe?(.yearStart)
            }
        }

        // 3 to 9: dated events, diplomacy, fronts, movement, combat, espionage, construction, the daily ledger (to come)

        // 10. the monthly slot, and 12. the yearly run in the January slot (both guarded, so exactly once)
        if civil.day <= Int(GovernmentTable.slots) {
            let slot = UInt8(civil.day)
            for i in 0..<state.governments.rows where state.governments.exists[i] && state.governments.monthlySlot[i] == slot {
                if state.governments.lastMonthlyRun[i] != monthIndex {
                    monthly(i)
                    state.governments.lastMonthlyRun[i] = monthIndex
                    observe?(.monthly(state.governments.ref(i)))
                }
                if civil.month == 1 && state.governments.lastYearlyRun[i] != year {
                    yearly(i)
                    state.governments.lastYearlyRun[i] = year
                    observe?(.yearly(state.governments.ref(i)))
                }
            }
        }

        // 11. the strategic stagger: at most 15 a day, by (due date, serial)
        stagger(on: date)

        // 13, 14: operational AI, notifications, history (to come)
        state.world.date = date.adding(days: 1)
    }

    /// Applies, in order, every pending command whose day has come, and keeps the rest.
    mutating func applyCommands(upTo date: GameDate) {
        if pending.isEmpty { return }
        // an insertion sort: the queue is short, and the standard library's sort may allocate
        for i in 1..<Swift.max(1, pending.count) {
            let c = pending[i]
            var j = i - 1
            while j >= 0 && IssuedCommand.precedes(c, pending[j]) {
                pending[j + 1] = pending[j]
                j -= 1
            }
            pending[j + 1] = c
        }
        var applied = 0
        while applied < pending.count && pending[applied].day <= date {
            pending[applied].command.apply(to: &state, strategicPeriod: Self.strategicPeriod)
            applied += 1
        }
        if applied > 0 {
            observe?(.commands)
            pending.removeFirst(applied)
        }
    }

    /// The monthly systems of one government (thin: taxes into the treasury, and a count).
    mutating func monthly(_ i: Int) {
        // read into locals first: a copy of the table held across a write would make the write copy the column
        let revenue = state.governments.taxBase[i].times(state.governments.taxRate[i])
        state.governments.treasury[i] += revenue
        state.governments.monthlyRuns[i] &+= 1
    }

    /// The yearly systems of one government (thin: a count).
    mutating func yearly(_ i: Int) {
        state.governments.yearlyRuns[i] &+= 1
    }

    /// The strategic AI's turn for the governments due (thin: a count, and the next look one period later).
    mutating func stagger(on date: GameDate) {
        due.removeAll(keepingCapacity: true)
        for i in 0..<state.governments.rows where state.governments.exists[i] && state.governments.aiNextStrategic[i] <= date {
            due.append((state.governments.aiNextStrategic[i], state.governments.serial[i].raw, i))
        }
        if due.isEmpty { return }
        // the 15 earliest by (due date, serial): a partial insertion sort
        let take = Swift.min(Self.strategicPerDay, due.count)
        for k in 0..<take {
            var best = k
            for m in (k + 1)..<due.count where (due[m].0, due[m].1) < (due[best].0, due[best].1) { best = m }
            due.swapAt(k, best)
        }
        for k in 0..<take {
            let i = due[k].2
            state.governments.strategicRuns[i] &+= 1
            state.governments.aiNextStrategic[i] = date.adding(days: Self.strategicPeriod)
            observe?(.strategic(state.governments.ref(i)))
        }
    }
}
