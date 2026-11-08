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
    private var cells: [UInt64]
    /// Called on the simulation's own thread after each day with that day's duration in nanoseconds.
    private let dayProbe: @Sendable (UInt64) -> Void

    public init(executor: any SerialExecutor, cells: Int = 16_384, dayProbe: @escaping @Sendable (UInt64) -> Void = { _ in }) {
        self.executor = executor
        self.cells = (0..<cells).map { UInt64($0) &* 0x9E37_79B9_7F4A_7C15 }
        self.dayProbe = dayProbe
    }

    /// Advances `days` days and returns the world's hash.
    @discardableResult
    public func advance(days: Int) -> UInt64 {
        let clock = ContinuousClock()
        for _ in 0..<days {
            let start = clock.now
            step()
            let d = start.duration(to: clock.now).components
            dayProbe(UInt64(d.seconds) &* 1_000_000_000 &+ UInt64(d.attoseconds / 1_000_000_000))
        }
        return stateHash
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
