// Overflow never wraps and never traps in the simulation (§2.3): every fixed-point result that leaves its range is
// clamped to the nearest end, and counted. The count belongs to one game: «a saturation counter must stay at 0 in games
// without cheats» (§2.3; §8 checks it after every tick). stdlib only (§2.2).

/// One game's count of clamped results. The engine makes one per world and reads it after each tick.
///
/// It is deliberately not `Sendable`: the compiler then refuses to let two tasks hold it (a use after it was handed
/// to another task, or a capture by a child task, does not compile), so two threads cannot write the same counter by
/// accident. A parallel burst must give each child task a count of its own (`Saturation.counted` inside the child)
/// and add them up in serial order when the burst ends.
public final class SaturationCounter {
    public var count: UInt64 = 0
    public init() {}
}

public enum Saturation {
    /// What the task-local holds: the counter of the scope that is computing. Unchecked: the compiler cannot see
    /// that a counter stays on one thread at a time. A scope is the only way to make one, and the scopes' rules
    /// (below) are what keeps it so; breaking them is a data race on the count.
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

    /// Runs `body` with `c` counting the clamps it makes. This scope is synchronous: it cannot hold an `await`.
    /// A scope inside another counts for itself only: the outer counter does not see the inner scope's clamps.
    ///
    /// Opening a scope is not free: it makes one small allocation, freed when the scope ends (two on a thread that
    /// runs no task; measured on Linux). So a tick must not open one per phase: the simulation's loop opens one long
    /// scope around a whole run of ticks (`countingAcrossAwaits`), and this short form is for a single call from
    /// outside the loop and for tests.
    ///
    /// The rules:
    /// - Start no task of any kind inside the body: not a `Task { }`, and not a child added to a task group that was
    ///   made outside (`group.addTask`). Either one copies the scope, outlives it, and writes this counter from
    ///   another thread.
    /// - Do not open a scope in the body of a task group (`withTaskGroup { … }`), where the parent merges its
    ///   children: the runtimes before Swift 6, iOS 17's among them, stop the program there. A child opens its own.
    public static func counting<R>(into c: SaturationCounter, _ body: () throws -> R) rethrows -> R {
        try $binding.withValue(Binding(counter: c), operation: body)
    }

    /// The long scope: `body` may await, and the scope follows its task across every suspension. One allocation when
    /// it opens, none while it lasts, so the simulation's loop opens one around a whole run of ticks. `body` runs on
    /// the caller's actor.
    ///
    /// Child tasks started inside inherit the scope. Every child of a parallel burst must therefore count its own
    /// clamps (`counted` around the child's whole body), or two threads would write this counter: the engine must
    /// start its bursts through one helper that does so, and must start no other task inside (no `Task { }`, no
    /// `addTask` and no `async let` outside that helper).
    public static func countingAcrossAwaits<R>(into c: SaturationCounter, isolation: isolated (any Actor)? = #isolation,
                                               _ body: () async throws -> R) async rethrows -> R {
        try await $binding.withValue(Binding(counter: c), operation: body, isolation: isolation)
    }

    /// Runs `body` and returns its result with the clamps it made: the form for a child of a parallel burst (the
    /// count travels back in the child's result) and for tests. It makes a counter and opens a scope: two small
    /// allocations.
    public static func counted<R>(_ body: () throws -> R) rethrows -> (result: R, clamps: UInt64) {
        let c = SaturationCounter()
        let result = try counting(into: c, body)
        return (result, c.count)
    }
}
