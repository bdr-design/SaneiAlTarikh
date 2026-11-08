import Foundation

/// A serial executor with a thread of its own (ADR 0001). An actor that returns this executor from `unownedExecutor`
/// runs all its work on that one thread, never on Swift's shared cooperative pool, whose threads are fixed at the core
/// count and kept for short parallel bursts. The thread sleeps on a condition while there is no work (no polling).
public final class DedicatedThreadExecutor: SerialExecutor, @unchecked Sendable {
    public let name: String
    private let condition = NSCondition()
    /// Guarded by `condition`. The thread swaps it with its own batch, so a wake allocates nothing once both have grown.
    private var jobs: [UnownedJob] = []
    /// Set before the thread starts, only read afterwards.
    private var thread: Thread?
    /// Guarded by `condition`: a quality of service the thread applies to itself before its next jobs.
    private var pendingQoS: QualityOfService?

    /// Starts the thread at once; it lives as long as the executor (the engines' executors live for the app's life).
    public init(name: String, qos: QualityOfService) {
        self.name = name
        jobs.reserveCapacity(64)
        let t = Thread { [self] in self.loop() }
        t.name = name
        t.qualityOfService = qos
        t.stackSize = 1 << 20
        thread = t
        t.start()
    }

    private func loop() {
        // name the thread from inside it: on Linux a name set before start never reaches the OS thread
        Thread.current.name = name
        let me = asUnownedSerialExecutor()
        var batch: [UnownedJob] = []
        batch.reserveCapacity(64)
        while true {
            condition.lock()
            while jobs.isEmpty && pendingQoS == nil { condition.wait() }
            swap(&batch, &jobs)
            let qos = pendingQoS
            pendingQoS = nil
            condition.unlock()
            if let qos { Self.apply(qos) }
            for job in batch { Self.run(job, on: me) }
            batch.removeAll(keepingCapacity: true)
        }
    }

    /// One job, inside its own autorelease pool where there is one (Apple's platforms), so the objects a job's system
    /// calls autorelease are freed after the job, not piled up on a thread that never returns to a run loop.
    @inline(__always)
    private static func run(_ job: UnownedJob, on me: UnownedSerialExecutor) {
        #if canImport(ObjectiveC)
        autoreleasepool { job.runSynchronously(on: me) }
        #else
        job.runSynchronously(on: me)
        #endif
    }

    /// Changes the thread's quality of service (on Apple's platforms the thread sets its own class before its next jobs;
    /// elsewhere it is ignored). The simulation runs at utility and at user-initiated at its top speed (§2.4).
    public func setQoS(_ qos: QualityOfService) {
        condition.lock()
        pendingQoS = qos
        condition.signal()
        condition.unlock()
    }

    private static func apply(_ qos: QualityOfService) {
        #if canImport(Darwin)
        let cls: qos_class_t
        switch qos {
        case .userInteractive: cls = QOS_CLASS_USER_INTERACTIVE
        case .userInitiated: cls = QOS_CLASS_USER_INITIATED
        case .utility: cls = QOS_CLASS_UTILITY
        case .background: cls = QOS_CLASS_BACKGROUND
        default: cls = QOS_CLASS_DEFAULT
        }
        pthread_set_qos_class_self_np(cls, 0)
        #endif
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
