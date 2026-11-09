// Overflow never wraps and never traps in the simulation (§2.3): every fixed-point result that leaves its range is
// clamped to the nearest end, and counted. The count belongs to one game: «a saturation counter must stay at 0 in games
// without cheats» (§8). stdlib only (§2.2).

/// One game's count of clamped results. The engine makes one per world and reads it after each tick.
///
/// A counter is bound to one task at a time (`Saturation.counting`). A parallel burst gives each child task a counter
/// of its own and adds them up in serial order when the burst ends, so two threads never write the same counter. That
/// rule is what makes the unchecked conformance sound.
public final class SaturationCounter: @unchecked Sendable {
    public var count: UInt64 = 0
    public init() {}
}

public enum Saturation {
    /// The counter of the game computing on this task; nil outside a game (tests of plain values, formatting), where
    /// a clamp is still a clamp but nobody counts it.
    @TaskLocal public static var counter: SaturationCounter? = nil

    /// Called on the cold path of every clamp: never inlined, so the hot path carries only the overflow check.
    @inline(never)
    public static func record() {
        counter?.count &+= 1
    }

    /// Runs `body` with `c` counting the clamps it makes.
    public static func counting<R>(into c: SaturationCounter, _ body: () throws -> R) rethrows -> R {
        try $counter.withValue(c, operation: body)
    }
}
