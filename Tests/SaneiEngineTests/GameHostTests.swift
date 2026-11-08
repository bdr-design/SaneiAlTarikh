import Foundation
import XCTest
@testable import SaneiEngine
@testable import SaneiRuntime

final class GameHostTests: XCTestCase {
    static let simExecutor = DedicatedThreadExecutor(name: "test.sim", qos: .utility)

    func testDeterministic() async {
        let a = GameHost(executor: Self.simExecutor, cells: 1_024)
        let b = GameHost(executor: Self.simExecutor, cells: 1_024)
        let ha = await a.advance(days: 50)
        let hb = await b.advance(days: 25)
        let hb2 = await b.advance(days: 25)
        XCTAssertEqual(ha, hb2)
        XCTAssertNotEqual(hb, hb2)
        let day = await a.day
        XCTAssertEqual(day, 50)
    }

    func testDaysRunOnTheSimulationThread() async {
        let names = Names()
        let host = GameHost(executor: Self.simExecutor, cells: 256) { _ in names.add(Thread.current.name ?? "") }
        await host.advance(days: 10)
        XCTAssertEqual(names.all, Array(repeating: "test.sim", count: 10))
    }

    func testProbeGetsEveryDay() async {
        let names = Names()
        let host = GameHost(executor: Self.simExecutor, cells: 64) { ns in names.add(String(ns > 0 || ns == 0)) }
        await host.advance(days: 7)
        XCTAssertEqual(names.all.count, 7)
    }
}

/// A lock-protected list for the probes (they run on the simulation thread).
final class Names: @unchecked Sendable {
    private let lock = NSLock()
    private var items: [String] = []
    func add(_ s: String) { lock.lock(); items.append(s); lock.unlock() }
    var all: [String] { lock.lock(); defer { lock.unlock() }; return items }
}
