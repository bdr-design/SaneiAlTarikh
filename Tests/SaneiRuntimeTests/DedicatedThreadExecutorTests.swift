import Foundation
import XCTest
@testable import SaneiRuntime

private actor Probe {
    static let executor = DedicatedThreadExecutor(name: "test.probe", qos: .utility)
    nonisolated var unownedExecutor: UnownedSerialExecutor { Self.executor.asUnownedSerialExecutor() }
    private var order: [Int] = []

    func threadName() -> String { Thread.current.name ?? "" }
    func onOwnThread() -> Bool { Self.executor.isCurrent && !Thread.isMainThread }
    func append(_ i: Int) { order.append(i) }
    func all() -> [Int] { order }
}

/// Its own executor, so a change of quality of service (and, on Apple's platforms, of the thread's name) touches no other test.
private actor QoSProbe {
    static let executor = DedicatedThreadExecutor(name: "test.qos", qos: .utility)
    nonisolated var unownedExecutor: UnownedSerialExecutor { Self.executor.asUnownedSerialExecutor() }
    private var order: [Int] = []
    func append(_ i: Int) { order.append(i) }
    func all() -> [Int] { order }
}

/// True for the first caller only.
private final class OnceFlag: @unchecked Sendable {
    private let lock = NSLock()
    private var used = false
    func take() -> Bool { lock.lock(); defer { lock.unlock() }; let first = !used; used = true; return first }
}

/// Counts how many pieces of work run at once (outside any actor, so it sees what the executor really does).
private final class Overlap: @unchecked Sendable {
    private let lock = NSLock()
    private var active = 0, worst = 0
    func enter() { lock.lock(); active += 1; worst = max(worst, active); lock.unlock() }
    func leave() { lock.lock(); active -= 1; lock.unlock() }
    var maxConcurrent: Int { lock.lock(); defer { lock.unlock() }; return worst }
}

/// Two actors on one executor: if the executor ever ran two jobs at once, their work would overlap.
private actor Busy {
    static let executor = DedicatedThreadExecutor(name: "test.busy", qos: .utility)
    nonisolated var unownedExecutor: UnownedSerialExecutor { Self.executor.asUnownedSerialExecutor() }
    let overlap: Overlap
    init(_ overlap: Overlap) { self.overlap = overlap }
    func work() {
        overlap.enter()
        Thread.sleep(forTimeInterval: 0.000_2)
        overlap.leave()
    }
}

final class DedicatedThreadExecutorTests: XCTestCase {
    func testActorRunsOnItsOwnNamedThread() async {
        let p = Probe()
        let name = await p.threadName()
        XCTAssertEqual(name, "test.probe")
        let own = await p.onOwnThread()
        XCTAssertTrue(own)
    }

    func testJobsRunInOrder() async {
        let p = Probe()
        for i in 0..<500 { await p.append(i) }
        let all = await p.all()
        XCTAssertEqual(all, Array(0..<500))
    }

    func testManyCallersFromThePoolAllComplete() async {
        let p = Probe()
        await withTaskGroup(of: Void.self) { g in
            for i in 0..<200 { g.addTask { await p.append(i) } }
        }
        let all = await p.all()
        XCTAssertEqual(Set(all), Set(0..<200))
        XCTAssertEqual(all.count, 200)
    }

    /// A change of quality of service never stops the thread: the jobs after it still run, in order.
    /// (The class itself is checked on the device: the thread's name carries it into the recorder's CSV.)
    func testSetQoSKeepsRunning() async {
        let p = QoSProbe()
        let work = Task {
            QoSProbe.executor.setQoS(.userInitiated)
            await p.append(1)
            QoSProbe.executor.setQoS(.utility)
            await p.append(2)
        }
        let done = await withCheckedContinuation { (c: CheckedContinuation<Bool, Never>) in
            let once = OnceFlag()
            Task { await work.value; if once.take() { c.resume(returning: true) } }
            Task { try? await Task.sleep(for: .seconds(5)); if once.take() { c.resume(returning: false) } }
        }
        XCTAssertTrue(done, "the executor stopped after a change of quality of service")
        let all = await p.all()
        XCTAssertEqual(Array(all.suffix(2)), [1, 2])
    }

    func testNeverRunsTwoJobsAtOnce() async {
        let overlap = Overlap()
        let a = Busy(overlap), b = Busy(overlap)
        await withTaskGroup(of: Void.self) { g in
            for i in 0..<300 { g.addTask { if i % 2 == 0 { await a.work() } else { await b.work() } } }
        }
        XCTAssertEqual(overlap.maxConcurrent, 1)
    }
}

final class EngineMeterTests: XCTestCase {
    func testRecordsAndDrains() {
        let m = EngineMeter()
        m.record(.sim, nanoseconds: 2_000_000, thread: "sanei.sim")
        m.record(.sim, nanoseconds: 4_000_000, thread: "sanei.sim")
        m.record(.render, nanoseconds: 1_000_000, thread: "sanei.render")
        let s = m.drain()
        XCTAssertEqual(s[.sim]?.count, 2)
        XCTAssertEqual(s[.sim]?.meanMs ?? 0, 3, accuracy: 1e-9)
        XCTAssertEqual(s[.sim]?.maxMs ?? 0, 4, accuracy: 1e-9)
        XCTAssertEqual(s[.sim]?.thread, "sanei.sim")
        XCTAssertEqual(s[.render]?.count, 1)
        XCTAssertEqual(s[.render]?.thread, "sanei.render", "an explicit thread wins, even on the main thread")
        XCTAssertTrue(m.drain().isEmpty, "a drain resets the meter")
    }

    /// The main thread is named "main"; another thread by its own name; a window keeps every thread it saw.
    func testThreadNamesPerWindow() {
        XCTAssertTrue(Thread.isMainThread, "XCTest runs a synchronous test on the main thread")
        let m = EngineMeter()
        m.record(.sim, nanoseconds: 1)
        let done = DispatchSemaphore(value: 0)
        let t = Thread {
            Thread.current.name = "test.other"
            m.record(.sim, nanoseconds: 1)
            m.record(.sim, nanoseconds: 1)
            done.signal()
        }
        t.start()
        done.wait()
        XCTAssertEqual(m.drain()[.sim]?.thread, "main+test.other")
    }

    /// A window keeps at most `maxThreads` names, the first ones seen, in order.
    func testThreadNamesAreCapped() {
        let m = EngineMeter()
        for i in 1...6 { m.record(.io, nanoseconds: 1, thread: "t\(i)") }
        XCTAssertEqual(m.drain()[.io]?.threads, ["t1", "t2", "t3", "t4"])
        XCTAssertEqual(EngineMeter.Sample.maxThreads, 4)
    }

    func testMeasureReturnsTheResultAndTimesIt() {
        let m = EngineMeter()
        let v = m.measure(.io) { () -> Int in
            Thread.sleep(forTimeInterval: 0.002)
            return 41 + 1
        }
        XCTAssertEqual(v, 42)
        let s = m.drain()[.io]
        XCTAssertEqual(s?.count, 1)
        XCTAssertGreaterThanOrEqual(s?.totalNanos ?? 0, 2_000_000)
    }

    func testSafeFromManyThreads() {
        let m = EngineMeter()
        DispatchQueue.concurrentPerform(iterations: 1_000) { _ in m.record(.main, nanoseconds: 1) }
        let s = m.drain()[.main]
        XCTAssertEqual(s?.count, 1_000)
        XCTAssertLessThanOrEqual(s?.threads.count ?? 0, EngineMeter.Sample.maxThreads)
    }
}
