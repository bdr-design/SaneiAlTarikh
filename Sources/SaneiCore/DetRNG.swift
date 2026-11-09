// The simulation's random numbers (§2.3): SplitMix64, seeded from counters, never from a clock or the system's
// generator. A draw depends only on (the game's seed, a key, a stream, a serial): the key is the day or, for fog of
// war, the intelligence epoch; each purpose has its own stream; the serial is the entity's. So the order in which
// systems or threads run never changes a result, and no generator is saved between days. stdlib only.

/// A deterministic generator. It is deliberately not a `RandomNumberGenerator`: the standard library does not promise
/// that `random(in:using:)` or `shuffled(using:)` map bits to values the same way in every Swift version, so the
/// mappings here are our own, locked by golden values.
///
/// A generator is a value: a copy repeats the draws of the original. Make one where it is used, draw, and drop it.
@frozen
public struct DetRNG: Sendable {
    @usableFromInline var state: UInt64

    /// A raw SplitMix64 state (the published sequence for a seed starts here). Not public: a generator made this way
    /// skips the game's seed.
    @inlinable init(state: UInt64) { self.state = state }

    /// The generator of one (seed, key, stream, serial). Each coordinate is mixed in on its own: were the seed and the
    /// key added first, the game with seed 2012 would roll on each day what the game with seed 2011 rolls on the next.
    @inlinable
    public init(seed: UInt64, key: Int64, stream: UInt32, serial: UInt32) {
        let game = DetRNG.mix(seed &+ DetRNG.gamma)
        let day = DetRNG.mix(game &+ DetRNG.gamma &+ UInt64(bitPattern: key))
        state = DetRNG.mix(day &+ DetRNG.gamma &+ ((UInt64(stream) << 32) | UInt64(serial)))
    }

    /// SplitMix64's increment (the golden ratio's bits).
    @inlinable public static var gamma: UInt64 { 0x9E37_79B9_7F4A_7C15 }

    /// SplitMix64's output function.
    @inlinable
    public static func mix(_ v: UInt64) -> UInt64 {
        var z = v
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    /// The next 64 bits.
    @inlinable
    public mutating func next() -> UInt64 {
        state &+= DetRNG.gamma
        return DetRNG.mix(state)
    }

    /// A number in 0..<n (0 when n is 0), from one draw: the high half of draw * n. No rejection loop, so every call
    /// uses exactly one draw; the bias is below n / 2^64.
    @inlinable
    public mutating func below(_ n: UInt64) -> UInt64 {
        next().multipliedFullWidth(by: n).high
    }

    /// A ratio in 0..<10,000 bp.
    @inlinable
    public mutating func bp() -> BP {
        BP(raw: Int32(truncatingIfNeeded: below(10_000)))
    }

    /// True with probability `p` (always from 100% up, never at 0 or below). One draw. The grain is 1 bp: a chance
    /// that is not a whole number of basis points is not this function's to take.
    @inlinable
    public mutating func chance(_ p: BP) -> Bool {
        bp() < p
    }
}
