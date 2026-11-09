// The hash of a game's state (§8): two runs of the same game give equal hashes, on Linux x86 and on iOS arm64, and a
// game saved, loaded and continued gives the hash of the game that never stopped. Whole numbers go in as 64-bit
// values, never as bytes of memory, so the machine's byte order and padding do not matter. Not for security: for
// telling two states apart. stdlib only.

@frozen
public struct StateHasher: Sendable {
    public var state: UInt64

    @inlinable public init() { state = 0xCBF2_9CE4_8422_2325 }

    /// Mixes in one 64-bit value (the FNV-1a step on a whole word).
    @inlinable
    public mutating func combine(_ v: UInt64) {
        state = (state ^ v) &* 0x0000_0100_0000_01B3
    }

    /// Mixes in a whole number of any width (a signed one is sign-extended, so -1 is the same in every width).
    @inlinable
    public mutating func combine<T: FixedWidthInteger>(_ v: T) {
        combine(UInt64(truncatingIfNeeded: v))
    }

    /// Mixes in a column: its length, then its values in order.
    @inlinable
    public mutating func combine<T: FixedWidthInteger>(_ column: [T]) {
        combine(UInt64(truncatingIfNeeded: column.count))
        for v in column { combine(UInt64(truncatingIfNeeded: v)) }
    }

    /// The hash so far (the state through SplitMix64's output function, so that nearby states give far hashes).
    @inlinable public var value: UInt64 { DetRNG.mix(state) }
}
