// Sums that must close (§2.4: the world account is exactly 0 after each monthly close; §8: party support per province
// sums to 10,000 bp; R4: province sums equal country totals exactly). Rounding each part to the nearest value cannot
// do that: six shares of 1/6 in basis points are 10,002. A split gives every part its share rounded down, then hands
// the units left over, one each, to the parts that lost most by the rounding (the largest remainder). The parts
// always add up to the whole, each is within one unit of its exact share, and the result depends on nothing but the
// inputs. For monthly work on tens to hundreds of parts: one 128-bit division a part and a sort of the remainders,
// not a thing to call per province per day. stdlib only.

/// Splits a whole among parts in proportion to weights. It keeps its working room between calls, so a system makes
/// one, and no call allocates once the room fits the longest list (`init(capacity:)`). A value: not shared between
/// threads.
@frozen
public struct ShareSplitter: Sendable {
    @usableFromInline var floors: [UInt64]
    @usableFromInline var remainders: [UInt64]
    @usableFromInline var sorted: [UInt64]

    /// A splitter with room for lists of `capacity` parts (longer lists make it grow, once).
    @inlinable
    public init(capacity: Int = 0) {
        floors = []
        remainders = []
        sorted = []
        let room = Swift.max(0, capacity)
        floors.reserveCapacity(room)
        remainders.reserveCapacity(room)
        sorted.reserveCapacity(room)
    }

    /// Splits `whole` in proportion to `weights` and puts the parts in `parts`, in the weights' order (what `parts`
    /// held is dropped; its room is kept). The general form: `weight` reads a weight from an element, `part` makes a
    /// part from a whole number, so a column of any type can be split into a column of any type without a copy.
    ///
    /// The rule:
    /// - Each part is its exact share rounded toward zero. The units left over go one each to the largest remainders;
    ///   of two equal remainders, the earlier part comes first. So the parts add up to `whole` exactly, and each is
    ///   within one unit of its exact share.
    /// - A whole below 0 splits as its opposite does, with every part's sign turned.
    /// - A weight below 0 counts as 0, and is counted as a clamp: a weight is a size.
    /// - When no weight is above 0, nobody has a claim and the parts are equal.
    /// - With no parts there is nowhere to put the whole: `parts` is empty, counted when the whole is not 0.
    /// - If the weights' sum passes the range of a `UInt64`, every weight is halved until it fits, counted once: the
    ///   parts still add up, and the shares are as exact as the halved weights.
    @inlinable
    public mutating func split<Weights: Collection, Part>(_ whole: Int64, by weights: Weights, into parts: inout [Part],
                                                          weight: (Weights.Element) -> Int64, part: (Int64) -> Part) {
        parts.removeAll(keepingCapacity: true)
        floors.removeAll(keepingCapacity: true)
        remainders.removeAll(keepingCapacity: true)
        let count = weights.count
        if count == 0 {
            if whole != 0 { Saturation.record() }
            return
        }
        // the sum of the weights
        var total: UInt64 = 0
        var overflow = false
        for w in weights {
            let v = weight(w)
            if v < 0 {
                Saturation.record()
                continue
            }
            let (sum, carried) = total.addingReportingOverflow(UInt64(v))
            total = sum
            overflow = overflow || carried
        }
        var shift: UInt64 = 0
        if overflow {
            Saturation.record()
            repeat {
                shift += 1
                total = 0
                overflow = false
                for w in weights {
                    let v = weight(w)
                    if v <= 0 { continue }
                    let (sum, carried) = total.addingReportingOverflow(UInt64(v) >> shift)
                    total = sum
                    overflow = overflow || carried
                }
            } while overflow
        }
        let equal = total == 0
        if equal { total = UInt64(count) }
        // every part's share rounded down, and what the rounding took from it
        let size = whole.magnitude
        var given: UInt64 = 0
        for w in weights {
            let v = weight(w)
            let share: UInt64 = equal ? 1 : (v > 0 ? UInt64(v) >> shift : 0)
            // size * share / total: the high half of the product is below `total`, because share <= total
            let (q, r) = total.dividingFullWidth(size.multipliedFullWidth(by: share))
            floors.append(q)
            remainders.append(r)
            given += q
        }
        // the units left over, fewer than the parts: to the largest remainders, the earlier part first among equals
        var left = size - given
        var threshold = UInt64.max
        var atThreshold: UInt64 = 0
        if left > 0 {
            sorted.removeAll(keepingCapacity: true)
            sorted.append(contentsOf: remainders)
            ShareSplitter.sortRising(&sorted)
            threshold = sorted[count - Int(truncatingIfNeeded: left)]
            var above: UInt64 = 0
            for r in remainders where r > threshold { above += 1 }
            atThreshold = left - above
        }
        let negative = whole < 0
        for i in 0..<count {
            var q = floors[i]
            if left > 0 {
                let r = remainders[i]
                if r > threshold {
                    q += 1
                    left -= 1
                } else if r == threshold && atThreshold > 0 {
                    q += 1
                    left -= 1
                    atThreshold -= 1
                }
            }
            parts.append(part(Int64(truncatingIfNeeded: negative ? 0 &- q : q)))
        }
    }

    /// Whole numbers split by whole-number weights.
    @inlinable
    public mutating func split(_ whole: Int64, by weights: [Int64], into parts: inout [Int64]) {
        split(whole, by: weights, into: &parts, weight: { $0 }, part: { $0 })
    }

    /// An amount (money in one unit, or people) split by whole-number weights.
    @inlinable
    public mutating func split<A: Amount>(_ whole: A, by weights: [Int64], into parts: inout [A]) {
        split(whole.raw, by: weights, into: &parts, weight: { $0 }, part: { A(raw: $0) })
    }

    /// A ratio in basis points split by whole-number weights: shares that add up to the whole (10,000 bp of party
    /// support over the parties' votes).
    @inlinable
    public mutating func split(_ whole: BP, by weights: [Int64], into parts: inout [BP]) {
        split(Int64(whole.raw), by: weights, into: &parts, weight: { $0 }, part: { BP(raw: Int32(truncatingIfNeeded: $0)) })
    }

    /// Sorts in place, rising, with no working room of its own (a heap sort: the standard library's sort allocates).
    @inlinable
    static func sortRising(_ a: inout [UInt64]) {
        let n = a.count
        if n < 2 { return }
        var start = n / 2
        while start > 0 {
            start -= 1
            siftDown(&a, from: start, end: n)
        }
        var end = n
        while end > 1 {
            end -= 1
            a.swapAt(0, end)
            siftDown(&a, from: 0, end: end)
        }
    }

    @inlinable
    static func siftDown(_ a: inout [UInt64], from start: Int, end: Int) {
        var root = start
        while true {
            var child = 2 * root + 1
            if child >= end { return }
            if child + 1 < end && a[child] < a[child + 1] { child += 1 }
            if a[root] >= a[child] { return }
            a.swapAt(root, child)
            root = child
        }
    }
}
