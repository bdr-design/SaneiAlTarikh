import Foundation
import XCTest
@testable import SaneiEngine
@testable import SaneiRuntime

final class GameHostTests: XCTestCase {
    static let simExecutor = DedicatedThreadExecutor(name: "test.sim", qos: .utility)

    func testDeterministic() async {
        let a = GameHost(executor: Self.simExecutor, cells: 1_024)
        let b = GameHost(executor: Self.simExecutor, cells: 1_024)
        await a.advance(days: 50)
        await b.advance(days: 25)
        let hb = await b.stateHash
        await b.advance(days: 25)
        let ha = await a.stateHash, hb2 = await b.stateHash
        XCTAssertEqual(ha, hb2)
        XCTAssertNotEqual(hb, hb2)
        let day = await a.day
        XCTAssertEqual(day, 50)
    }

    /// The same world on every platform and every build: a change to the day's arithmetic shows here.
    func testGoldenHash() async {
        let a = GameHost(executor: Self.simExecutor, cells: 1_024)
        await a.advance(days: 25)
        let h25 = await a.stateHash
        await a.advance(days: 25)
        let h50 = await a.stateHash
        XCTAssertEqual(h25, 11_232_111_216_378_414_885)
        XCTAssertEqual(h50, 13_579_342_660_925_853_477)
    }

    func testDaysRunOnTheSimulationThread() async {
        let names = Names()
        let host = GameHost(executor: Self.simExecutor, cells: 256) { _ in names.add(Thread.current.name ?? "") }
        await host.advance(days: 10)
        XCTAssertEqual(names.all, Array(repeating: "test.sim", count: 10))
    }

    /// Every day reaches the probe, and the days' times add up to something real and no more than the wall time.
    func testProbeTimesEveryDay() async {
        let total = Total()
        let host = GameHost(executor: Self.simExecutor, cells: 4_096) { ns in total.add(ns) }
        let clock = ContinuousClock()
        let start = clock.now
        await host.advance(days: 20)
        let wall = start.duration(to: clock.now).components
        let wallNs = UInt64(wall.seconds) * 1_000_000_000 + UInt64(wall.attoseconds / 1_000_000_000)
        XCTAssertEqual(total.count, 20)
        XCTAssertGreaterThan(total.nanos, 0)
        XCTAssertLessThanOrEqual(total.nanos, wallNs)
    }

    /// The paced run advances whole wakes on the simulation's thread, sleeps between them, and stops when cancelled.
    func testRunPacesAndStops() async {
        let names = Names()
        let host = GameHost(executor: Self.simExecutor, cells: 64) { _ in names.add(Thread.current.name ?? "") }
        let clock = ContinuousClock()
        let start = clock.now
        let run = Task { await host.run(daysPerWake: 3, period: .milliseconds(20)) }
        try? await Task.sleep(for: .milliseconds(200))
        run.cancel()
        let e = start.duration(to: clock.now).components
        let elapsedMs = Int(e.seconds) * 1_000 + Int(e.attoseconds / 1_000_000_000_000_000)
        let stopped = await Self.finishes(run, within: .seconds(5))
        XCTAssertTrue(stopped, "the run did not stop on cancel")
        let day = await host.day
        XCTAssertGreaterThanOrEqual(day, 3)
        XCTAssertEqual(day % 3, 0)
        XCTAssertLessThanOrEqual(day, 3 * (elapsedMs / 20 + 2), "the run sleeps between wakes (\(elapsedMs) ms)")
        XCTAssertEqual(Set(names.all), ["test.sim"])
        let running = await host.running
        XCTAssertFalse(running)
    }

    /// One clock: a second run while the first paces returns at once, so the speed never doubles.
    func testSecondRunReturnsAtOnce() async {
        let host = GameHost(executor: Self.simExecutor, cells: 64)
        let first = Task { await host.run(daysPerWake: 3, period: .milliseconds(20)) }
        try? await Task.sleep(for: .milliseconds(50))
        let second = await Self.finishes(Task { await host.run(daysPerWake: 3, period: .milliseconds(20)) }, within: .seconds(2))
        XCTAssertTrue(second, "a second run did not return at once")
        first.cancel()
        let stopped = await Self.finishes(first, within: .seconds(5))
        XCTAssertTrue(stopped)
    }

    /// True when `task` ends within `limit`; false, never a hang, when it does not (the waits are unstructured, so a task
    /// that ignores its cancel cannot hold the test).
    static func finishes(_ task: Task<Void, Never>, within limit: Duration) async -> Bool {
        let once = Once()
        return await withCheckedContinuation { (c: CheckedContinuation<Bool, Never>) in
            Task { await task.value; once.resume(c, true) }
            Task { try? await Task.sleep(for: limit); once.resume(c, false) }
        }
    }
}

/// Resumes a continuation once, whichever side comes first.
final class Once: @unchecked Sendable {
    private let lock = NSLock()
    private var done = false
    func resume(_ c: CheckedContinuation<Bool, Never>, _ value: Bool) {
        lock.lock()
        let first = !done
        done = true
        lock.unlock()
        if first { c.resume(returning: value) }
    }
}

/// A lock-protected list for the probes (they run on the simulation thread).
final class Names: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [String] = []
    func add(_ s: String) { lock.lock(); items.append(s); lock.unlock() }
    var all: [String] { lock.lock(); defer { lock.unlock() }; return items }
}

/// A lock-protected sum of the probes' nanoseconds.
final class Total: @unchecked Sendable {
    private let lock = NSLock()
    private var n: UInt64 = 0, c = 0
    func add(_ ns: UInt64) { lock.lock(); n &+= ns; c += 1; lock.unlock() }
    var nanos: UInt64 { lock.lock(); defer { lock.unlock() }; return n }
    var count: Int { lock.lock(); defer { lock.unlock() }; return c }
}
