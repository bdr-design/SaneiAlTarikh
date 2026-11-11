// Sums that must close (§2.4: the world account is exactly 0 after each monthly close; §8: party support per province
// sums to 10,000 bp; R4: province sums equal country totals exactly). Rounding each part to the nearest value cannot
// do that: six shares of 1/6 in basis points are 10,002. A split gives every part its share rounded down, then hands
// the units left over, one each, to the parts that lost most by the rounding: the largest remainder (Hare's method).
// The parts always add up to the whole, each is within one unit of its exact share, and the result depends on nothing
// but the inputs. Elections that count by highest averages (d'Hondt, Sainte-Laguë) need an allocator of their own:
// this is not it. stdlib only.

/// Splits a whole among parts in proportion to weights. It keeps its working room between calls: a list longer than
/// the room makes it grow once, to that length, and after that no call allocates (the caller's `parts` needs the room
/// too). A copy is independent of the original: its first call makes room of its own, so a system keeps one splitter
/// per worker, made before the loop, never one made or copied inside a task.
///
/// Cost (measured on x86-64, optimised, from another module): about 17 to 21 ns a part for 12 parts, 13 to 24 ns a
/// part for 100. For monthly work and for events, not for every province every day: 3,000 provinces of 12 parties is
/// about 1.5 ms.
@frozen
public struct ShareSplitter: Sendable {
    @usableFromInline var weights: [UInt64]
    @usableFromInline var floors: [UInt64]
    @usableFromInline var remainders: [UInt64]
    @usableFromInline var sorted: [UInt64]

    /// A splitter with room for lists of `capacity` parts.
    @inlinable
    public init(capacity: Int = 0) {
        weights = []
        floors = []
        remainders = []
        sorted = []
        reserve(Swift.max(0, capacity))
    }

    @inlinable
    mutating func reserve(_ count: Int) {
        weights.reserveCapacity(count)
        floors.reserveCapacity(count)
        remainders.reserveCapacity(count)
        sorted.reserveCapacity(count)
    }

    /// Splits `whole` in proportion to `weights` and puts the parts in `parts`, in the weights' order (what `parts`
    /// held is dropped; its room is kept). The general form: `weight` reads a weight from an element and is called
    /// once per element; `part` makes a part from a whole number and is called once per part, in order. The weights
    /// are any random-access collection (an array, a slice, a lazy map over an array): never a set or a dictionary,
    /// whose order changes from one run to the next.
    ///
    /// The rule:
    /// - Each part is its exact share rounded toward zero. The units left over go one each to the largest
    ///   remainders; of two equal remainders, to the larger weight; of two equal weights, to the earlier part. So the
    ///   parts add up to `whole` exactly, each is within one unit of its exact share, and a smaller weight never gets
    ///   more than a larger one.
    /// - A whole below 0 splits as its opposite does, with every part's sign turned.
    /// - A weight below 0 counts as 0, and is counted as a clamp: a weight is a size.
    /// - If the weights' sum passes the range of a `UInt64`, every weight is halved until it fits, counted once: the
    ///   parts still add up, and the shares are as exact as the halved weights.
    /// - With no parts there is nowhere to put the whole: `parts` is empty, counted when the whole is not 0.
    ///
    /// Returns false when no weight is above 0. Nobody then has a claim, and the whole is split as if every weight were
    /// 1, by the same rule (10 among three: 4, 3, 3). Whether that is right is the caller's call: fair for a remap of
    /// support, a fault for seats or money, which should count it or not split at all.
    @discardableResult
    @inlinable
    public mutating func split<Weights: RandomAccessCollection, Part>(_ whole: Int64, by weights: Weights, into parts: inout [Part],
                                                                    weight: (Weights.Element) -> Int64,
                                                                    part: (Int64) -> Part) -> Bool {
        parts.removeAll(keepingCapacity: true)
        self.weights.removeAll(keepingCapacity: true)
        floors.removeAll(keepingCapacity: true)
        remainders.removeAll(keepingCapacity: true)
        let count = weights.count
        if count == 0 {
            if whole != 0 { Saturation.record() }
            return false
        }
        reserve(count)
        parts.reserveCapacity(count)
        // each weight read once, and their sum
        var total: UInt64 = 0
        var overflow = false
        for w in weights {
            let v = weight(w)
            if v < 0 { Saturation.record() }
            let size = v > 0 ? UInt64(v) : 0
            self.weights.append(size)
            let (sum, carried) = total.addingReportingOverflow(size)
            total = sum
            overflow = overflow || carried
        }
        if overflow {
            Saturation.record()
            repeat {
                total = 0
                overflow = false
                for i in 0..<count {
                    self.weights[i] >>= 1
                    let (sum, carried) = total.addingReportingOverflow(self.weights[i])
                    total = sum
                    overflow = overflow || carried
                }
            } while overflow
        }
        let claimed = total != 0
        if !claimed {
            for i in 0..<count { self.weights[i] = 1 }
            total = UInt64(count)
        }
        // every part's share rounded down, and what the rounding took from it
        let size = whole.magnitude
        var given: UInt64 = 0
        for i in 0..<count {
            // size * share / total. The product's high half is below `total`: share <= total, and size <= 2^63, so the
            // high half is at most share / 2
            let p = size.multipliedFullWidth(by: self.weights[i])
            let q: UInt64
            let r: UInt64
            if p.high == 0 {
                q = p.low / total
                r = p.low % total
            } else {
                (q, r) = total.dividingFullWidth(p)
            }
            floors.append(q)
            remainders.append(r)
            given += q
        }
        // the units left over, fewer than the parts: to the largest remainders, then the larger weight, then the
        // earlier part
        var left = size - given
        var remainderLine = UInt64.max
        var weightLine = UInt64.max
        var atBothLines: UInt64 = 0
        if left > 0 {
            // the remainder of the last part that gets a unit
            sorted.removeAll(keepingCapacity: true)
            sorted.append(contentsOf: remainders)
            ShareSplitter.sortRising(&sorted)
            remainderLine = sorted[count - Int(truncatingIfNeeded: left)]
            var above: UInt64 = 0
            for r in remainders where r > remainderLine { above += 1 }
            let atRemainderLine = left - above
            // among the parts on that remainder, the weight of the last one that gets a unit
            sorted.removeAll(keepingCapacity: true)
            for i in 0..<count where remainders[i] == remainderLine { sorted.append(self.weights[i]) }
            ShareSplitter.sortRising(&sorted)
            weightLine = sorted[sorted.count - Int(truncatingIfNeeded: atRemainderLine)]
            var heavier: UInt64 = 0
            for i in 0..<count where remainders[i] == remainderLine && self.weights[i] > weightLine { heavier += 1 }
            atBothLines = atRemainderLine - heavier
        }
        let negative = whole < 0
        for i in 0..<count {
            var q = floors[i]
            if left > 0 {
                let r = remainders[i]
                if r > remainderLine || (r == remainderLine && self.weights[i] > weightLine) {
                    q += 1
                    left -= 1
                } else if r == remainderLine && self.weights[i] == weightLine && atBothLines > 0 {
                    q += 1
                    left -= 1
                    atBothLines -= 1
                }
            }
            parts.append(part(Int64(truncatingIfNeeded: negative ? 0 &- q : q)))
        }
        return claimed
    }

    /// Whole numbers split by whole-number weights.
    @discardableResult
    @inlinable
    public mutating func split(_ whole: Int64, by weights: [Int64], into parts: inout [Int64]) -> Bool {
        split(whole, by: weights, into: &parts, weight: { $0 }, part: { $0 })
    }

    /// An amount (money in one unit, or people) split by whole-number weights.
    @discardableResult
    @inlinable
    public mutating func split<A: Amount>(_ whole: A, by weights: [Int64], into parts: inout [A]) -> Bool {
        split(whole.raw, by: weights, into: &parts, weight: { $0 }, part: { A(raw: $0) })
    }

    /// A ratio in basis points split by whole-number weights: shares that add up to the whole (10,000 bp of party
    /// support over the parties' votes, «أخرى» as one more weight).
    @discardableResult
    @inlinable
    public mutating func split(_ whole: BP, by weights: [Int64], into parts: inout [BP]) -> Bool {
        split(Int64(whole.raw), by: weights, into: &parts, weight: { $0 }, part: { BP(raw: Int32(truncatingIfNeeded: $0)) })
    }

    /// A government's people split among its provinces or cohorts. A part beyond a `Pop32`'s range is clamped and
    /// counted, as narrowing always is: then the parts no longer add up, and the counter says so.
    @discardableResult
    @inlinable
    public mutating func split(_ whole: Pop, by weights: [Int64], into parts: inout [Pop32]) -> Bool {
        split(whole.raw, by: weights, into: &parts, weight: { $0 }, part: { Pop32(Pop(raw: $0)) })
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
