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

    /// The lines, oldest first.
    func snapshot() -> [String] {
        lock.lock()
        defer { lock.unlock() }
        return lines.elements
    }

    /// Hands the lines to the I/O engine, which writes the file on its thread.
    func flush() async {
        await IOEngine.shared.writeLog(snapshot())
    }
}
