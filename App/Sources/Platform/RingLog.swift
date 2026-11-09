import Foundation
import SaneiCore

/// The ring-buffer log: the last 2,000 lines in memory (any thread may log: a lock and an append). Its file,
/// Documents/Logs/ring.log, is written by the I/O engine on its own thread (ADR 0001), never by the caller.
final class RingLog: @unchecked Sendable {
    static let shared = RingLog()
    private let lock = NSLock()
    private var lines = RingBuffer<String>(capacity: 2_000)
    private let started = DispatchTime.now().uptimeNanoseconds

    func log(_ message: String) {
        let t = Double(DispatchTime.now().uptimeNanoseconds &- started) / 1_000_000_000
        let line = String(format: "%9.3f ", t) + message
        lock.lock()
        lines.append(line)
        lock.unlock()
    }

    /// The lines from sequence number `start` on that are still held, the next sequence number, and how many lines from
    /// `start` on have already dropped out of the buffer.
    func lines(since start: Int) -> (lines: [String], next: Int, lost: Int) {
        lock.lock()
        defer { lock.unlock() }
        let r = lines.elements(since: start)
        return (r.elements, r.next, r.lost)
    }

    /// The lines, oldest first.
    func snapshot() -> [String] {
        lock.lock()
        defer { lock.unlock() }
        return lines.elements
    }

    /// Asks the I/O engine to add the lines logged since its last flush to the file, on its thread.
    func flush() async {
        await IOEngine.shared.flushLog()
    }
}
