import SaneiCore

// One day of the simulation, in §2.4's order. The skeleton runs the steps that decide when things happen: the commands,
// the calendar jobs and the monthly close, the monthly slot (exactly one run per government per month), the strategic
// stagger, and the yearly run in each government's January slot. The systems that fill these steps arrive with their
// tasks; thin ones stand in now (taxes posted to the treasury, and counters). A day allocates nothing once the
// simulation is made, while no copy of the state is held; with a copy held (a save, the AI's view), the first write to
// each column copies it. stdlib only, through SaneiCore.

/// The steps of a day that a test can watch (`Simulation.observe`).
public enum DayStep: Sendable, Equatable {
    case commands
    case refused(IssuedCommand)
    case monthStart, quarterStart, yearStart, monthClose
    case monthly(GovRef)
    case yearly(GovRef)
    case strategic(GovRef)
}

/// What `submit` did with a command.
public enum SubmitResult: Sendable, Equatable {
    case queued
    /// Its day has already run: the AI's results must land on their fixed day, never a day late.
    case late
    /// The issuer's room is full: the player's 64 orders while paused (§3.9), or the room of the AI and events.
    case full
    /// A command with the same (day, issuer, sequence) is already waiting: each issuer numbers its own commands.
    case duplicateKey
    /// The player's order cannot be carried out as things stand (a government that has ended, a rate past 100%): it
    /// is refused now, with this reason, not dropped on its day.
    case invalid
}

/// A game being simulated: its state (the waiting commands included) and the working room a day needs.
///
/// The game's count of clamped results is not opened here: the host opens one long counting scope around its run of
/// days (`Saturation.countingAcrossAwaits`, ADR 0002) and the days run inside it. A day run outside every scope still
/// clamps, uncounted.
public struct Simulation: Sendable {
    /// How many days apart a government's strategic looks are (difficulty sets it, §5.10: it becomes saved state then).
    public static let strategicPeriod = 30
    /// The most governments the strategic AI looks at in a day (§2.4).
    public static let strategicPerDay = 15
    /// The player's orders waiting at once (§3.9: 64 while paused).
    public static let playerCapacity = 64
    /// The AI's and events' commands waiting at once (about 15 strategic looks a day, each a few commands, landing
    /// 2 days later, plus events).
    public static let othersCapacity = 512

    public internal(set) var state: WorldState
    /// The working room of the stagger: governments due, as (due, serial, row).
    var due: [(GameDate, UInt32, Int)]
    /// Called at each step, for tests (nil in the game: no cost).
    public var observe: (@Sendable (DayStep) -> Void)?

    public init(state: WorldState) {
        self.state = state
        due = []
        due.reserveCapacity(GovernmentTable.capacity)
        observe = nil
    }

    /// The commands waiting for their day.
    public var pending: [IssuedCommand] { state.pending }

    /// Queues a command for its day.
    @discardableResult
    public mutating func submit(_ c: IssuedCommand) -> SubmitResult {
        if c.day < state.world.date { return .late }
        var players = 0
        for p in state.pending {
            if IssuedCommand.sameKey(p, c) { return .duplicateKey }
            if p.issuer.rank == 0 { players += 1 }
        }
        let others = state.pending.count - players
        if c.issuer.rank == 0 ? players >= Self.playerCapacity : others >= Self.othersCapacity { return .full }
        // the player's orders are checked when given; the AI's and events' when their day comes, as the world may
        // have changed by then (a government made by an earlier command that day)
        if c.issuer.rank == 0 && !c.command.validate(state, by: c.issuer) { return .invalid }
        state.pending.append(c)
        return .queued
    }

    /// Takes back a waiting command (screen 26): the one with this day, issuer and sequence. False when none waits.
    @discardableResult
    public mutating func cancel(day: GameDate, issuer: Issuer, sequence: UInt64) -> Bool {
        let key = IssuedCommand(day: day, issuer: issuer, sequence: sequence, command: .setTaxRate(government: GovRef(row: .absent, serial: .absent), rate: .zero))
        guard let i = state.pending.firstIndex(where: { IssuedCommand.sameKey($0, key) }) else { return false }
        state.pending.remove(at: i)
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

        // 1. commands due today, in (day, rank, issuer, sequence) order
        applyCommands(upTo: date)

        // 2. the calendar jobs (their systems come with M2 and M6; the counters show they ran, and when), then the
        // monthly close, after the world market and the transport payout, which settle through the world account
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
            if !state.closeMonth().isEmpty { state.world.ledgerFailures &+= 1 }
            observe?(.monthClose)
        }

        // 3 to 9: dated events, diplomacy, fronts, movement, combat, espionage, construction, the daily ledger (to come)

        // 10. the monthly slot (guarded, so exactly once a month). A government made today by a command still has
        // today's slot to come; one made later in the day (by step 10's conditional events, to come) must be given a
        // slot from tomorrow on.
        let slot = UInt8(truncatingIfNeeded: civil.day)
        let slotDay = civil.day <= Int(GovernmentTable.slots)
        if slotDay {
            for i in 0..<state.governments.rows where state.governments.exists[i] && state.governments.monthlySlot[i] == slot
                && state.governments.lastMonthlyRun[i] != monthIndex {
                monthly(i)
                state.governments.lastMonthlyRun[i] = monthIndex
                observe?(.monthly(state.governments.ref(i)))
            }
        }

        // 11. the strategic stagger: at most 15 a day, by (due date, serial)
        stagger(on: date)

        // 12. the yearly run, in each government's January slot (guarded, so exactly once a year)
        if slotDay && civil.month == 1 {
            for i in 0..<state.governments.rows where state.governments.exists[i] && state.governments.monthlySlot[i] == slot
                && state.governments.lastYearlyRun[i] != year {
                yearly(i)
                state.governments.lastYearlyRun[i] = year
                observe?(.yearly(state.governments.ref(i)))
            }
        }

        // 13, 14: operational AI, notifications, history (to come)
        state.world.date = date.adding(days: 1)
    }

    /// Applies, in order, every waiting command whose day has come, and keeps the rest. A command refused when its day
    /// comes (its government ended meanwhile, say) is counted and shown to the observer.
    mutating func applyCommands(upTo date: GameDate) {
        if state.pending.isEmpty { return }
        // an insertion sort: the queue is short, and the standard library's sort may allocate
        for i in 1..<Swift.max(1, state.pending.count) {
            let c = state.pending[i]
            var j = i - 1
            while j >= 0 && IssuedCommand.precedes(c, state.pending[j]) {
                state.pending[j + 1] = state.pending[j]
                j -= 1
            }
            state.pending[j + 1] = c
        }
        var applied = 0
        while applied < state.pending.count && state.pending[applied].day <= date {
            let c = state.pending[applied]
            if !c.command.apply(to: &state, by: c.issuer, strategicPeriod: Self.strategicPeriod) {
                state.world.refusedCommands &+= 1
                observe?(.refused(c))
            }
            applied += 1
        }
        if applied > 0 {
            observe?(.commands)
            state.pending.removeFirst(applied)
        }
    }

    /// The monthly systems of one government (thin: taxes posted to the treasury, and a count). A government made this
    /// month starts its flows at its first run; the design's «this month's flows initialised pro rata» comes with the
    /// daily ledger (M2), when a month has flows to share.
    mutating func monthly(_ i: Int) {
        let revenue = state.governments.taxBase[i].times(state.governments.taxRate[i])
        state.post(state.governments.ref(i), .treasury, .tax, revenue)
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
        // the 15 earliest by (due date, serial): a partial selection
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
