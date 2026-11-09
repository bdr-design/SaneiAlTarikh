import SaneiCore

/// The simulation engine's host (§2.4, ADR 0001). An actor whose executor comes from outside: the app gives it a
/// dedicated thread, so the simulation never runs on the main thread or as a long loop on the shared pool. No
/// Foundation here (§2.2): time is the standard library's ContinuousClock.
///
/// M0 holds a stand-in world (a block of cells advanced by integer arithmetic each day) so the threads, the meters and
/// determinism can be proved before the real systems arrive (M1a).
public actor GameHost {
    private let executor: any SerialExecutor
    public nonisolated var unownedExecutor: UnownedSerialExecutor { executor.asUnownedSerialExecutor() }

    public private(set) var day = 0
    /// True while `run` paces the clock: a second `run` returns at once (one clock, never twice the speed).
    public private(set) var running = false
    private var cells: [UInt64]
    /// Called on the simulation's own thread after each day with that day's duration in nanoseconds.
    private let dayProbe: @Sendable (UInt64) -> Void

    public init(executor: any SerialExecutor, cells: Int = 16_384, dayProbe: @escaping @Sendable (UInt64) -> Void = { _ in }) {
        self.executor = executor
        self.cells = (0..<cells).map { UInt64($0) &* 0x9E37_79B9_7F4A_7C15 }
        self.dayProbe = dayProbe
    }

    /// Advances `days` days. The hash is separate (`stateHash`): a day never pays for it.
    public func advance(days: Int) {
        let clock = ContinuousClock()
        for _ in 0..<days {
            let start = clock.now
            step()
            let d = start.duration(to: clock.now).components
            dayProbe(UInt64(d.seconds) &* 1_000_000_000 &+ UInt64(d.attoseconds / 1_000_000_000))
        }
    }

    /// Runs the clock until the calling task is cancelled: `daysPerWake` days, then a sleep on this actor's own thread
    /// until the next deadline (`period` apart, so the pace does not drift; a late wake never bursts to catch up).
    /// D-16's top speed is 30 days a second: 3 days every 100 ms, which also caps the snapshots at 10 a second (§2.4).
    public func run(daysPerWake: Int = 3, period: Duration = .milliseconds(100)) async {
        guard !running else { return }
        running = true
        defer { running = false }
        let clock = ContinuousClock()
        var next = clock.now
        while !Task.isCancelled {
            advance(days: daysPerWake)
            next = next.advanced(by: period)
            let now = clock.now
            if next < now { next = now }
            do { try await clock.sleep(until: next, tolerance: .milliseconds(5)) } catch { return }
        }
    }

    private func step() {
        day += 1
        let salt = UInt64(day)
        for i in cells.indices {
            cells[i] = cells[i] &* 6_364_136_223_846_793_005 &+ (salt | 1)
        }
    }

    /// FNV-1a over the cells: equal states give equal hashes on every platform.
    public var stateHash: UInt64 {
        var h: UInt64 = 14_695_981_039_346_656_037
        for c in cells { h = (h ^ c) &* 1_099_511_628_211 }
        return h
    }
}
