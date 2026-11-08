import Foundation

/// The game's engines (ADR 0001). Each records its busy time into `EngineMeter`.
public enum Engine: String, CaseIterable, Sendable {
    case main, render, sim, io
}

/// Per-engine busy time, safe from any thread (a lock; a record is a few additions). The overlay and the recorder
/// drain it once a second (L14: «per-engine counters in the overlay and the recorder»).
public final class EngineMeter: @unchecked Sendable {
    public static let shared = EngineMeter()

    public struct Sample: Sendable, Equatable {
        public var count = 0
        public var totalNanos: UInt64 = 0
        public var maxNanos: UInt64 = 0
        /// The thread the engine last ran on, by name (proves the separation on the device).
        public var thread = ""
        public var meanMs: Double { count == 0 ? 0 : Double(totalNanos) / Double(count) / 1_000_000 }
        public var maxMs: Double { Double(maxNanos) / 1_000_000 }
        public init() {}
    }

    private let lock = NSLock()
    private var samples: [Engine: Sample] = [:]

    public init() {}

    public func record(_ engine: Engine, nanoseconds: UInt64, thread: String? = nil) {
        let name = thread ?? (Thread.current.name ?? "")
        lock.lock()
        var s = samples[engine] ?? Sample()
        s.count += 1
        s.totalNanos &+= nanoseconds
        s.maxNanos = max(s.maxNanos, nanoseconds)
        s.thread = Thread.isMainThread ? "main" : name
        samples[engine] = s
        lock.unlock()
    }

    /// Runs `body`, records its duration under `engine`, and returns its result.
    @discardableResult
    public func measure<T>(_ engine: Engine, _ body: () throws -> T) rethrows -> T {
        let start = DispatchTime.now().uptimeNanoseconds
        defer { record(engine, nanoseconds: DispatchTime.now().uptimeNanoseconds &- start) }
        return try body()
    }

    /// The samples since the last drain, then reset.
    public func drain() -> [Engine: Sample] {
        lock.lock()
        defer { samples.removeAll(keepingCapacity: true); lock.unlock() }
        return samples
    }
}
