// The simulation's random numbers (§2.3): SplitMix64, seeded from counters, never from a clock or the system's
// generator. A draw depends only on (the game's seed, a key, a stream, a serial): the key is the day or, for fog of
// war, the intelligence epoch; each system has its own stream; the serial is the entity's. So the order in which
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

    /// The generator of one (seed, key, stream, serial). Each coordinate is mixed in on its own. If the seed and the
    /// key were added first, the game with seed 2012 would roll on each day what the game with seed 2011 rolls on
    /// the next.
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
    /// that is not a whole number of basis points needs another function.
    @inlinable
    public mutating func chance(_ p: BP) -> Bool {
        bp() < p
    }

    /// True with probability n / d, for chances finer than a basis point (a once-in-50-years daily hazard is
    /// 1 in 18,250). One draw, always. Never when n is 0 or d is 0; always when n is d or more.
    @inlinable
    public mutating func chance(_ n: UInt64, in d: UInt64) -> Bool {
        let draw = below(d)
        return d != 0 && draw < n
    }

    /// Picks one of the weights' positions with a chance in proportion to its weight: one draw. Nil, with no draw,
    /// when there are no weights or none is above 0. A weight below 0 counts as 0. If the weights' sum passes the
    /// range of a `UInt64` it is held there, counted, and the last weights lose their chance.
    @inlinable
    public mutating func pick<Weights: Collection>(_ weights: Weights, weight: (Weights.Element) -> Int64) -> Weights.Index? {
        var total: UInt64 = 0
        for w in weights {
            let v = weight(w)
            if v <= 0 { continue }
            let (sum, overflow) = total.addingReportingOverflow(UInt64(v))
            if overflow {
                Saturation.record()
                total = .max
                break
            }
            total = sum
        }
        if total == 0 { return nil }
        var left = below(total)
        var i = weights.startIndex
        while i != weights.endIndex {
            let v = weight(weights[i])
            if v > 0 {
                if left < UInt64(v) { return i }
                left -= UInt64(v)
            }
            weights.formIndex(after: &i)
        }
        return nil                                                  // not reached: the draw is below the sum
    }

    /// Picks a position of `weights` with a chance in proportion to its weight (see the general form).
    @inlinable
    public mutating func pick(_ weights: [Int64]) -> Int? {
        pick(weights) { $0 }
    }

    /// Puts `items` in a random order, every order with the same chance: one draw per item but the last (none for
    /// fewer than two items). Our own mapping, not the standard library's, which may change between Swift versions.
    @inlinable
    public mutating func shuffle<Items: MutableCollection & RandomAccessCollection>(_ items: inout Items) {
        var n = items.count
        while n > 1 {
            let j = Int(truncatingIfNeeded: below(UInt64(n)))
            n -= 1
            items.swapAt(items.index(items.startIndex, offsetBy: n), items.index(items.startIndex, offsetBy: j))
        }
    }
}
