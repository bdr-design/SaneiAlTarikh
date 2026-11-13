// A fixed-capacity ring buffer: appends overwrite the oldest element once full. Used by the app's ring log (M0) and
// later by the engine's histories (before then it becomes `@frozen` and `@inlinable`, as §2.2 asks of hot types, and
// its `removeAll` and `elements` stop allocating: T-047). stdlib only (§2.2: SaneiCore never imports Foundation).

/// A first-in, first-out buffer of at most `capacity` elements; when full, `append` drops the oldest.
public struct RingBuffer<Element> {
    public let capacity: Int
    private var storage: [Element?]
    private var head = 0          // index of the oldest element
    public private(set) var count = 0
    /// Every element ever appended (the sequence number the next one gets); `removeAll` keeps it.
    public private(set) var appendedTotal = 0

    public init(capacity: Int) {
        precondition(capacity > 0, "RingBuffer capacity must be positive")
        self.capacity = capacity
        self.storage = Array(repeating: nil, count: capacity)
    }

    public var isEmpty: Bool { count == 0 }
    public var isFull: Bool { count == capacity }

    /// Appends `element`; when the buffer is full, the oldest element is dropped and returned.
    @discardableResult
    public mutating func append(_ element: Element) -> Element? {
        appendedTotal += 1
        if count < capacity {
            storage[(head + count) % capacity] = element
            count += 1
            return nil
        }
        let dropped = storage[head]
        storage[head] = element
        head = (head + 1) % capacity
        return dropped
    }

    /// Removes every element (the capacity stays).
    public mutating func removeAll() {
        storage = Array(repeating: nil, count: capacity)
        head = 0
        count = 0
    }

    /// The elements whose sequence number is `start` or later, oldest first; the sequence number the next element will
    /// get; and how many from `start` on are no longer held (dropped by later appends or by `removeAll`).
    public func elements(since start: Int) -> (elements: [Element], next: Int, lost: Int) {
        let first = appendedTotal - count
        let from = min(max(0, start - first), count)
        var out: [Element] = []
        out.reserveCapacity(count - from)
        for i in from..<count {
            if let e = storage[(head + i) % capacity] { out.append(e) }
        }
        return (out, appendedTotal, max(0, first - max(0, start)))
    }

    /// The elements, oldest first.
    public var elements: [Element] {
        var out: [Element] = []
        out.reserveCapacity(count)
        for i in 0..<count {
            if let e = storage[(head + i) % capacity] { out.append(e) }
        }
        return out
    }
}

extension RingBuffer: Sendable where Element: Sendable {}
