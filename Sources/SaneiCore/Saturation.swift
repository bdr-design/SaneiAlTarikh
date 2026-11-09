// Overflow never wraps and never traps in the simulation (§2.3): every fixed-point result that leaves its range is
// clamped to the nearest end, and counted. The count belongs to one game: «a saturation counter must stay at 0 in games
// without cheats» (§8). stdlib only (§2.2).

/// One game's count of clamped results. The engine makes one per world and reads it after each tick.
///
/// It is deliberately not `Sendable`: the compiler then refuses to hand it to another task or thread, so two threads
/// can never write the same counter. A parallel burst gives each child task a count of its own (`Saturation.counted`
/// inside the child) and adds them up in serial order when the burst ends.
public final class SaturationCounter {
    public var count: UInt64 = 0
    public init() {}
}

public enum Saturation {
    /// What the task-local holds: the counter of the scope that is computing. Unchecked, because the only way to make
    /// one is `counting`, whose scope is synchronous: it ends on the thread it began on.
    struct Binding: @unchecked Sendable {
        let counter: SaturationCounter
    }

    /// The scope computing on this task; nil outside every scope.
    @TaskLocal static var binding: Binding? = nil

    /// True while a scope on this task is counting. False means a clamp here is still a clamp, but nobody counts it:
    /// outside a game (tests of plain values, formatting), and also in a detached task or a caller that did not bind.
    public static var isCounting: Bool { binding != nil }

    /// Called on the cold path of every clamp: never inlined, so the hot path carries only the overflow check.
    @inline(never)
    public static func record() {
        binding?.counter.count &+= 1
    }

    /// Runs `body` with `c` counting the clamps it makes. The scope is synchronous, so it cannot hold an `await`: a
    /// tick binds around each of its serial phases, and each child of a parallel burst counts its own with `counted`.
    /// A scope inside another counts for itself only: the outer counter does not see the inner scope's clamps.
    ///
    /// Never start a `Task { }` inside the body: an unstructured task copies the binding and would write this
    /// counter from another thread (the engine has none; its bursts go through one helper).
    public static func counting<R>(into c: SaturationCounter, _ body: () throws -> R) rethrows -> R {
        try $binding.withValue(Binding(counter: c), operation: body)
    }

    /// Runs `body` and returns its result with the clamps it made: the form for a child of a parallel burst (the
    /// count travels back in the child's result) and for tests. It makes a counter, so it allocates: a tick's serial
    /// phases use `counting(into:)` with the world's own counter.
    public static func counted<R>(_ body: () throws -> R) rethrows -> (result: R, clamps: UInt64) {
        let c = SaturationCounter()
        let result = try counting(into: c, body)
        return (result, c.count)
    }
}
