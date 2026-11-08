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
        let run = Task { await host.run(daysPerWake: 3, period: .milliseconds(20)) }
        try? await Task.sleep(for: .milliseconds(200))
        run.cancel()
        await run.value
        let day = await host.day
        XCTAssertGreaterThanOrEqual(day, 3)
        XCTAssertEqual(day % 3, 0)
        XCTAssertLessThan(day, 3 * 40, "the run sleeps between wakes")
        XCTAssertEqual(Set(names.all), ["test.sim"])
        try? await Task.sleep(for: .milliseconds(60))
        let after = await host.day
        XCTAssertEqual(after, day, "no day after the cancel")
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
