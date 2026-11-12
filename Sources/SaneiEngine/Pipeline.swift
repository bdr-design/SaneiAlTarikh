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
    /// is refused now, with this reason, not dropped on its day. Also any issuer naming a government never made.
    case invalid
    /// The command names what the codec cannot write and read back as it is (a serial of 0, a row of 65,535): from
    /// any issuer, so a save or a replay never holds a command it cannot read.
    case unwritable
}

/// A game being simulated: its state (the waiting commands included) and the working room a day needs.
///
/// The game's count of clamped results is not opened here: the host opens one long counting scope around its run of
/// days (`Saturation.countingAcrossAwaits`, ADR 0002) and the days run inside it. A day run outside every scope still
/// clamps, uncounted.
public struct Simulation: Sendable {
    /// How many days apart a government's strategic looks are: a target under the daily cap (§5.10; difficulty sets
    /// it in M7, and it becomes saved state then). The one source of the period: the stagger and new governments both
    /// read it.
    public static let strategicPeriod = 30
    /// The most governments the strategic AI looks at in a day (§2.4).
    public static let strategicPerDay = 15
    /// The player's orders waiting at once (§3.9: 64 while paused).
    public static let playerCapacity = 64
    /// The events' commands waiting at once (L3): their own room, so an event's effect is never refused because the
    /// AI's commands filled the queue.
    public static let eventCapacity = 64
    /// The AI's commands waiting at once (L3: about 15 strategic looks a day, each a few commands, landing 2 days
    /// later).
    public static let aiCapacity = 448
    /// The whole queue's room: 576.
    public static var queueCapacity: Int { playerCapacity + eventCapacity + aiCapacity }

    public internal(set) var state: WorldState
    /// The working room of the stagger: governments due, as (due, serial, row).
    var due: [(GameDate, UInt32, Int)]
    /// Called at each step, for tests (nil in the game: no cost).
    var observe: (@Sendable (DayStep) -> Void)?

    public init(state: WorldState) {
        self.state = state
        due = []
        due.reserveCapacity(GovernmentTable.capacity)
        observe = nil
    }

    /// The commands waiting for their day.
    public var pending: [IssuedCommand] { state.pending }

    /// Queues a command for its day, at its place in the order commands are applied in: the queue is always in that
    /// order, so the state (and its hash, and a save) never depends on the order commands arrived in, while each
    /// issuer stays within its room (once a room is full, the first to arrive keep their places).
    ///
    /// The host runs a day only once every AI result due on it has been submitted (§2.4's fixed landing day): a
    /// command for a day already run is refused as `.late`, and from the AI or an event that is the host's fault.
    @discardableResult
    public mutating func submit(_ c: IssuedCommand) -> SubmitResult {
        let result = place(c)
        if result != .queued && c.issuer.rank != 0 { state.world.refusedSubmits &+= 1 }
        return result
    }

    mutating func place(_ c: IssuedCommand) -> SubmitResult {
        if c.day < state.world.date { return .late }
        if let g = c.issuer.government, !Command.isWritable(g) { return .unwritable }
        if !c.command.isWritable { return .unwritable }
        // an issuer must name a government that was ever made: a serial the counter has not given, or a row past the
        // table, is refused now (no arrival time changes that). Whether the government still lives is checked on the
        // command's day, so an AI result refused because its government ended meanwhile is refused the same way
        // however early or late it arrived (§2.4: the result never depends on how fast the AI ran).
        if let g = c.issuer.government, !state.governments.counter.hasGiven(g.serial) || g.row.int >= state.governments.rows { return .invalid }
        // the place in order, by halving (the queue is always in order); a command with the same key would sit there
        var lo = 0, hi = state.pending.count
        while lo < hi {
            let mid = (lo + hi) / 2
            if IssuedCommand.precedes(state.pending[mid], c) { lo = mid + 1 } else { hi = mid }
        }
        let place = lo
        if place < state.pending.count && IssuedCommand.sameKey(state.pending[place], c) { return .duplicateKey }
        // the issuer's room: one pass over the ranks only
        let rank = c.issuer.rank
        var same = 0
        for p in state.pending where p.issuer.rank == rank { same += 1 }
        let room: Int
        switch c.issuer {
        case .player: room = Self.playerCapacity
        case .event: room = Self.eventCapacity
        case .ai: room = Self.aiCapacity
        }
        if same >= room { return .full }
        // the player's orders are checked when given; the AI's and events' when their day comes, as the world may
        // have changed by then (a government made by an earlier command that day)
        if c.issuer.rank == 0 && !c.command.validate(state, by: c.issuer) { return .invalid }
        state.pending.reserveCapacity(Self.queueCapacity)   // the room, kept across a held copy
        state.pending.insert(c, at: place)
        return .queued
    }

    /// Takes back one of the player's waiting orders (screen 26): the one given for `government` with this day and
    /// sequence. False when none waits. The AI's and events' commands cannot be taken back.
    @discardableResult
    public mutating func cancel(day: GameDate, government: GovRef, sequence: UInt64) -> Bool {
        guard let i = state.pending.firstIndex(where: { $0.day == day && $0.issuer == .player(government) && $0.sequence == sequence })
        else { return false }
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
        // monthly close, after the world market and the transport payout (to come, M2), which settle through the
        // world account
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
            if !state.closeMonth() { state.world.ledgerFailures &+= 1 }   // a failed close, counted once
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

        // 13, 14: operational AI, notifications, history (to come); then the currencies marked today redenominate,
        // after every posting of the day
        state.redenominateDue()
        state.world.date = date.adding(days: 1)
    }

    /// Applies, in order, every waiting command whose day has come, and keeps the rest. A command refused when its day
    /// comes (its government ended meanwhile, say) is counted and shown to the observer. The queue is kept in order
    /// by `submit` (and by the loader, which refuses a save whose queue is not), so the due ones are its front.
    mutating func applyCommands(upTo date: GameDate) {
        if state.pending.isEmpty { return }
        var applied = 0
        while applied < state.pending.count && state.pending[applied].day <= date {
            let c = state.pending[applied]
            if !c.command.apply(to: &state, by: c.issuer) {
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
