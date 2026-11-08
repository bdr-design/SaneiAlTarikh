import Foundation
import SaneiRuntime

/// The platform I/O engine (ADR 0001): every file the app writes goes through this actor, on the `sanei.io` thread, so
/// the main thread never waits on the disk. Each operation is metered under `.io`.
actor IOEngine {
    static let shared = IOEngine()
    nonisolated var unownedExecutor: UnownedSerialExecutor { Engines.io.asUnownedSerialExecutor() }

    /// Makes Documents/Saves, Diagnostics and Logs; true when all exist.
    func prepareFolders() -> Bool {
        EngineMeter.shared.measure(.io) {
            do {
                _ = try Storage.savesFolder()
                _ = try Storage.diagnosticsFolder()
                _ = try Storage.logsFolder()
                return true
            } catch {
                RingLog.shared.log("folders failed: \(error)")
                return false
            }
        }
    }

    /// Writes the ring log's lines to Documents/Logs/ring.log (atomically).
    @discardableResult
    func writeLog(_ lines: [String]) -> URL? {
        EngineMeter.shared.measure(.io) {
            do {
                let url = try Storage.logsFolder().appendingPathComponent("ring.log")
                try (lines.joined(separator: "\n") + "\n").write(to: url, atomically: true, encoding: .utf8)
                return url
            } catch {
                return nil
            }
        }
    }

    /// Writes rows as Documents/Diagnostics/<name> (atomically).
    func writeCSV(_ rows: [String], name: String) throws -> URL {
        try EngineMeter.shared.measure(.io) {
            let url = try Storage.diagnosticsFolder().appendingPathComponent(name)
            try (rows.joined(separator: "\n") + "\n").write(to: url, atomically: true, encoding: .utf8)
            return url
        }
    }

    /// Keeps a MetricKit payload as JSON in Documents/Diagnostics/metrickit.
    func saveMetricPayload(_ data: Data, name: String) {
        EngineMeter.shared.measure(.io) {
            do {
                let dir = try Storage.diagnosticsFolder().appendingPathComponent("metrickit", isDirectory: true)
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
                let stamp = Int(Date().timeIntervalSince1970)
                try data.write(to: dir.appendingPathComponent("\(name)-\(stamp)-\(UInt32.random(in: 0...UInt32.max)).json"), options: .atomic)
                RingLog.shared.log("metrickit \(name) payload saved")
            } catch {
                RingLog.shared.log("metrickit save failed: \(error)")
            }
        }
    }

    /// One folder Documents/Diagnostics/export-<time>/ with the ring log, every recorder CSV, the MetricKit payloads and
    /// the device summary; returns its files for the share sheet (also visible in Files).
    func exportDiagnostics(deviceSummary: String, logLines: [String]) throws -> [URL] {
        try EngineMeter.shared.measure(.io) {
            let fm = FileManager.default
            let diag = try Storage.diagnosticsFolder()
            let out = diag.appendingPathComponent("export-\(Stamp.now())", isDirectory: true)
            try fm.createDirectory(at: out, withIntermediateDirectories: true)
            try (logLines.joined(separator: "\n") + "\n").write(to: out.appendingPathComponent("ring.log"), atomically: true, encoding: .utf8)
            for url in try fm.contentsOfDirectory(at: diag, includingPropertiesForKeys: nil)
            where url.lastPathComponent.hasPrefix("recorder-") && url.pathExtension == "csv" {
                try fm.copyItem(at: url, to: out.appendingPathComponent(url.lastPathComponent))
            }
            let mk = diag.appendingPathComponent("metrickit", isDirectory: true)
            if let payloads = try? fm.contentsOfDirectory(at: mk, includingPropertiesForKeys: nil) {
                for url in payloads where url.pathExtension == "json" {
                    try fm.copyItem(at: url, to: out.appendingPathComponent(url.lastPathComponent))
                }
            }
            try (deviceSummary + "\n").write(to: out.appendingPathComponent("device.txt"), atomically: true, encoding: .utf8)
            return try fm.contentsOfDirectory(at: out, includingPropertiesForKeys: nil)
                .sorted { $0.lastPathComponent < $1.lastPathComponent }
        }
    }
}

/// A file-name time stamp in Western digits.
enum Stamp {
    static func now() -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyyMMdd-HHmmss"
        return f.string(from: Date())
    }
}
