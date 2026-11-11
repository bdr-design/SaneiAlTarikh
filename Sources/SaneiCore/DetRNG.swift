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
    /// 1 in 18,250), to within the bias of `below`. One draw, always, so a stream's later draws never shift. Never
    /// when n is 0 or below or d is 0 or below (a count that dipped below 0 is no chance, not a crash); always when n
    /// is d or more.
    @inlinable
    public mutating func chance(_ n: Int64, in d: Int64) -> Bool {
        let draw = below(d > 0 ? UInt64(d) : 0)
        return n > 0 && d > 0 && draw < UInt64(n)
    }

    /// True with probability `p`, a number from 0 to 1 in steps of 2^-32 (a hazard a model works out). One draw,
    /// always. Never at 0 or below, always from 1 up. A yearly probability P is not a daily one: the daily one is
    /// 1 - (1 - P)^(1/365), not P / 365, which is about 8% low for P = 0.17. The model that owns the hazard says which.
    @inlinable
    public mutating func chance(_ p: Q32) -> Bool {
        let draw = below(UInt64(1) << 32)
        return p.raw > 0 && draw < UInt64(p.raw)
    }

    /// Picks an index of `weights` with a chance in proportion to its weight, to within the bias of `below`: one draw,
    /// always (also when it picks nothing), so a stream's later draws never shift. Nil when there are no weights or
    /// none is above 0. A weight below 0 counts as 0, and is counted as a clamp: a weight is a size. If the weights'
    /// sum passes the range of a `UInt64` it is held there, counted: the weight at which it passes keeps only the
    /// part that fits, and the weights after it lose their chance.
    ///
    /// The result is an index of `weights` (for a slice, the slice's own index, not an offset from 0). `weight` is
    /// called once or twice per element and must give the same value each time. The weights are a random-access
    /// collection: never a set or a dictionary, whose order changes from one run to the next.
    @inlinable
    public mutating func pick<Weights: RandomAccessCollection>(_ weights: Weights, weight: (Weights.Element) -> Int64) -> Weights.Index? {
        var total: UInt64 = 0
        var full = false
        for w in weights {
            let v = weight(w)
            if v < 0 { Saturation.record() }
            if v <= 0 || full { continue }
            let (sum, overflow) = total.addingReportingOverflow(UInt64(v))
            if overflow {
                Saturation.record()
                total = .max
                full = true
            } else {
                total = sum
            }
        }
        var left = below(total)
        if total == 0 { return nil }
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

    /// Picks an index of `weights` with a chance in proportion to its weight (see the general form).
    @inlinable
    public mutating func pick(_ weights: [Int64]) -> Int? {
        pick(weights) { $0 }
    }

    /// Puts `items` in a random order, every order with the same chance to within the bias of `below`: one draw per
    /// item but the last (none for fewer than two items). Our own mapping, not the standard library's, which may
    /// change between Swift versions.
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
