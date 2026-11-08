import Foundation
import SaneiRuntime

/// The platform I/O engine (ADR 0001): every file the app writes goes through this actor, on the `sanei.io` thread, so
/// the main thread never waits on the disk. Each operation is metered under `.io`. What it keeps is bounded: the newest
/// `keepCSVs` recordings, `keepPayloads` MetricKit payloads and `keepExports` export folders.
actor IOEngine {
    static let shared = IOEngine()
    nonisolated var unownedExecutor: UnownedSerialExecutor { Engines.io.asUnownedSerialExecutor() }

    static let keepCSVs = 10, keepPayloads = 20, keepExports = 3
    static let logName = "ring.log", previousLogName = "ring-previous.log"

    /// Makes Documents/Saves, Diagnostics and Logs, and keeps the last session's log as ring-previous.log (the next
    /// flush would overwrite it; after a crash it is the log that matters). True when all exist.
    func prepareFolders() -> Bool {
        EngineMeter.shared.measure(.io) {
            do {
                _ = try Storage.savesFolder()
                _ = try Storage.diagnosticsFolder()
                let logs = try Storage.logsFolder()
                let fm = FileManager.default
                let current = logs.appendingPathComponent(Self.logName)
                let previous = logs.appendingPathComponent(Self.previousLogName)
                if fm.fileExists(atPath: current.path) {
                    // a failed rotation loses only the previous log, never the saves folder's state
                    do {
                        if fm.fileExists(atPath: previous.path) { try fm.removeItem(at: previous) }
                        try fm.moveItem(at: current, to: previous)
                    } catch {
                        RingLog.shared.log("ring log rotate failed: \(error)")
                    }
                }
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
                let url = try Storage.logsFolder().appendingPathComponent(Self.logName)
                try (lines.joined(separator: "\n") + "\n").write(to: url, atomically: true, encoding: .utf8)
                return url
            } catch {
                RingLog.shared.log("ring log write failed: \(error)")
                return nil
            }
        }
    }

    /// Writes rows as Documents/Diagnostics/<name> (atomically), then keeps only the newest recordings.
    func writeCSV(_ rows: [String], name: String) throws -> URL {
        try EngineMeter.shared.measure(.io) {
            let diag = try Storage.diagnosticsFolder()
            let url = diag.appendingPathComponent(name)
            try (rows.joined(separator: "\n") + "\n").write(to: url, atomically: true, encoding: .utf8)
            Self.prune(Self.files(in: diag) { $0.lastPathComponent.hasPrefix("recorder-") && $0.pathExtension == "csv" }, keep: Self.keepCSVs)
            return url
        }
    }

    /// Keeps a MetricKit payload as JSON in Documents/Diagnostics/metrickit, then keeps only the newest payloads.
    func saveMetricPayload(_ data: Data, name: String) {
        EngineMeter.shared.measure(.io) {
            do {
                let dir = try Storage.diagnosticsFolder().appendingPathComponent("metrickit", isDirectory: true)
                try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
                try data.write(to: dir.appendingPathComponent("\(name)-\(Stamp.now())-\(UInt32.random(in: 0...UInt32.max)).json"), options: .atomic)
                Self.prune(Self.files(in: dir) { $0.pathExtension == "json" }, keep: Self.keepPayloads)
                RingLog.shared.log("metrickit \(name) payload saved")
            } catch {
                RingLog.shared.log("metrickit save failed: \(error)")
            }
        }
    }

    /// One new folder Documents/Diagnostics/export-<time>/ with this session's log, the previous session's log, the
    /// newest recorder CSVs, the newest MetricKit payloads and the device summary; returns its files for the share
    /// sheet (also visible in Files). Only the newest `keepExports` export folders are kept.
    func exportDiagnostics(deviceSummary: String, logLines: [String]) throws -> [URL] {
        try EngineMeter.shared.measure(.io) {
            let fm = FileManager.default
            let diag = try Storage.diagnosticsFolder()
            let stamp = Stamp.now()
            var out = diag.appendingPathComponent("export-\(stamp)", isDirectory: true)
            var n = 2
            while fm.fileExists(atPath: out.path) {
                out = diag.appendingPathComponent("export-\(stamp)-\(n)", isDirectory: true)
                n += 1
            }
            try fm.createDirectory(at: out, withIntermediateDirectories: true)
            try (logLines.joined(separator: "\n") + "\n").write(to: out.appendingPathComponent(Self.logName), atomically: true, encoding: .utf8)
            let previous = try Storage.logsFolder().appendingPathComponent(Self.previousLogName)
            if fm.fileExists(atPath: previous.path) {
                try fm.copyItem(at: previous, to: out.appendingPathComponent(Self.previousLogName))
            }
            let csvs = Self.files(in: diag) { $0.lastPathComponent.hasPrefix("recorder-") && $0.pathExtension == "csv" }
            for url in csvs.suffix(Self.keepCSVs) {
                try fm.copyItem(at: url, to: out.appendingPathComponent(url.lastPathComponent))
            }
            let mk = diag.appendingPathComponent("metrickit", isDirectory: true)
            for url in Self.files(in: mk, { $0.pathExtension == "json" }).suffix(Self.keepPayloads) {
                try fm.copyItem(at: url, to: out.appendingPathComponent(url.lastPathComponent))
            }
            try (deviceSummary + "\n").write(to: out.appendingPathComponent("device.txt"), atomically: true, encoding: .utf8)
            Self.prune(Self.files(in: diag) { $0.lastPathComponent.hasPrefix("export-") && (try? $0.resourceValues(forKeys: [.isDirectoryKey]).isDirectory) == true }, keep: Self.keepExports)
            return try fm.contentsOfDirectory(at: out, includingPropertiesForKeys: nil)
                .sorted { $0.lastPathComponent < $1.lastPathComponent }
        }
    }

    /// The entries of `dir` that pass `keep`, oldest first (their names start with a time stamp after a fixed prefix,
    /// and the modification date breaks ties).
    private static func files(in dir: URL, _ keep: (URL) -> Bool) -> [URL] {
        let key = URLResourceKey.contentModificationDateKey
        let urls = (try? FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: [key, .isDirectoryKey])) ?? []
        func date(_ u: URL) -> Date { (try? u.resourceValues(forKeys: [key]).contentModificationDate) ?? .distantPast }
        return urls.filter(keep).sorted { a, b in
            let da = date(a), db = date(b)
            return da != db ? da < db : a.lastPathComponent < b.lastPathComponent
        }
    }

    /// Deletes all but the newest `keep` of `urls` (oldest first).
    private static func prune(_ urls: [URL], keep: Int) {
        guard urls.count > keep else { return }
        for url in urls.prefix(urls.count - keep) {
            do { try FileManager.default.removeItem(at: url) } catch { RingLog.shared.log("prune failed: \(url.lastPathComponent): \(error)") }
        }
    }
}

/// A file-name time stamp in Western digits, to the millisecond.
enum Stamp {
    static func now() -> String {
        let f = DateFormatter()
        f.locale = Locale(identifier: "en_US_POSIX")
        f.dateFormat = "yyyyMMdd-HHmmss-SSS"
        return f.string(from: Date())
    }
}
