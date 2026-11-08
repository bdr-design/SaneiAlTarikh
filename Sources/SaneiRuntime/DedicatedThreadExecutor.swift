import Foundation

/// A serial executor with a thread of its own (ADR 0001). An actor that returns this executor from `unownedExecutor`
/// runs all its work on that one thread, never on Swift's shared cooperative pool, whose threads are fixed at the core
/// count and kept for short parallel bursts. The thread sleeps on a condition while there is no work (no polling).
public final class DedicatedThreadExecutor: SerialExecutor, @unchecked Sendable {
    public let name: String
    private let condition = NSCondition()
    private var jobs: [UnownedJob] = []
    private var thread: Thread?

    /// Starts the thread at once; it lives as long as the executor (the engines' executors live for the app's life).
    public init(name: String, qos: QualityOfService) {
        self.name = name
        let t = Thread { [self] in self.loop() }
        t.name = name
        t.qualityOfService = qos
        t.stackSize = 1 << 20
        thread = t
        t.start()
    }

    private func loop() {
        let me = asUnownedSerialExecutor()
        while true {
            condition.lock()
            while jobs.isEmpty { condition.wait() }
            let batch = jobs
            jobs.removeAll(keepingCapacity: true)
            condition.unlock()
            for job in batch { job.runSynchronously(on: me) }
        }
    }

    public func enqueue(_ job: consuming ExecutorJob) {
        let unowned = UnownedJob(job)
        condition.lock()
        jobs.append(unowned)
        condition.signal()
        condition.unlock()
    }

    public func asUnownedSerialExecutor() -> UnownedSerialExecutor {
        UnownedSerialExecutor(ordinary: self)
    }

    /// True on this executor's own thread.
    public var isCurrent: Bool { Thread.current === thread }

    public func checkIsolated() {
        precondition(isCurrent, "not on the \(name) thread")
    }
}
