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
        /// Every thread the engine ran on in this window, by name, in the order first seen (at most `maxThreads`):
        /// proves the separation on the device, and shows it when an engine strays.
        public var threads: [String] = []
        /// The threads joined with "+" (one name when the engine stayed on its own thread).
        public var thread: String { threads.joined(separator: "+") }
        public var meanMs: Double { count == 0 ? 0 : Double(totalNanos) / Double(count) / 1_000_000 }
        public var maxMs: Double { Double(maxNanos) / 1_000_000 }
        public static let maxThreads = 4
        public init() {}
    }

    private let lock = NSLock()
    private var samples: [Engine: Sample] = [:]

    public init() {}

    /// Records one piece of work. `thread` names where it ran when the caller knows better; otherwise the current
    /// thread's name ("main" on the main thread, "unnamed" for a thread with no name).
    public func record(_ engine: Engine, nanoseconds: UInt64, thread: String? = nil) {
        let name = thread ?? (Thread.isMainThread ? "main" : (Thread.current.name.flatMap { $0.isEmpty ? nil : $0 } ?? "unnamed"))
        lock.lock()
        var s = samples[engine] ?? Sample()
        s.count += 1
        s.totalNanos &+= nanoseconds
        s.maxNanos = max(s.maxNanos, nanoseconds)
        if s.threads.count < Sample.maxThreads, !s.threads.contains(name) { s.threads.append(name) }
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
