// The hash of a game's state (§8): two runs of the same game give equal hashes, on Linux x86 and on arm64, and a
// game saved, loaded and continued gives the hash of the game that never stopped. Whole numbers go in as 64-bit
// values, never as bytes of memory, so the machine's byte order and padding do not matter. Not for security: it
// tells two states apart when a run goes wrong, with 64 bits. It runs in tests, debug builds and replays; a played
// day never pays for it. stdlib only.

@frozen
public struct StateHasher: Sendable {
    public var state: UInt64

    @inlinable public init() { state = 0xCBF2_9CE4_8422_2325 }

    /// Mixes in one 64-bit value: the state and the value together through SplitMix64's output function. Every bit
    /// of a value reaches every bit of the state, so states that differ by a sign, by a top bit (a flag in a packed
    /// word) or by the order of two values hash apart. A plain multiply per value did not do that: a bit only moved
    /// up, and two changes of a top bit cancelled.
    @inlinable
    public mutating func combine(_ v: UInt64) {
        state = DetRNG.mix(state ^ v)
    }

    /// Mixes in a whole number of up to 64 bits (a signed one is sign-extended, so -1 is the same in every width, and
    /// the same word as a `UInt64` of all ones: a column never changes its type between two runs).
    @inlinable
    public mutating func combine<T: FixedWidthInteger>(_ v: T) {
        assert(T.bitWidth <= 64, "the hash takes 64-bit values")
        combine(UInt64(truncatingIfNeeded: v))
    }

    /// Mixes in a flag: 1 or 0.
    @inlinable
    public mutating func combine(_ flag: Bool) {
        combine(UInt64(flag ? 1 : 0))
    }

    /// Mixes in a column: its length, then its values in order. Anything of varying length goes in this way (a name
    /// as its UTF-8 bytes), so that where one ends and the next begins is part of the hash.
    @inlinable
    public mutating func combine<T: FixedWidthInteger>(_ column: [T]) {
        assert(T.bitWidth <= 64, "the hash takes 64-bit values")
        combine(UInt64(truncatingIfNeeded: column.count))
        for v in column { combine(UInt64(truncatingIfNeeded: v)) }
    }

    /// The hash so far.
    @inlinable public var value: UInt64 { state }
}
