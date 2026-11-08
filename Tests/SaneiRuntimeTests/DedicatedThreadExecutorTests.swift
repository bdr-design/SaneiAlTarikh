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
        XCTAssertEqual(s[.render]?.count, 1)
        XCTAssertTrue(m.drain().isEmpty, "a drain resets the meter")
    }

    func testMeasureReturnsTheResult() {
        let m = EngineMeter()
        let v = m.measure(.io) { 41 + 1 }
        XCTAssertEqual(v, 42)
        XCTAssertEqual(m.drain()[.io]?.count, 1)
    }

    func testSafeFromManyThreads() {
        let m = EngineMeter()
        DispatchQueue.concurrentPerform(iterations: 1_000) { _ in m.record(.main, nanoseconds: 1) }
        XCTAssertEqual(m.drain()[.main]?.count, 1_000)
    }
}
