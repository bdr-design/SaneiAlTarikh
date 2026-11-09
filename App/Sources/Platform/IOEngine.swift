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
    /// The log file's bound (§3.8's 1 MB): once it has grown this much past its last restart, it restarts in place from
    /// the lines still in memory (the last 2,000), so the file stays under those lines plus this.
    static let logCapBytes = 1_024 * 1_024

    // the log file, kept open between flushes: each flush appends only the new lines (no new file, no rename, no sync)
    private var logHandle: FileHandle?
    private var logWritten = 0          // RingLog's sequence number of the first line not yet in the file
    private var logBytes = 0            // the file's size
    private var logBase = 0             // its size when it last restarted: it grows by at most logCapBytes past that
    private var logRestart = false      // the next flush rewrites the file from the lines held (after a failure)
    private var foldersReady = false    // no flush before the last session's log is rotated
    private var logURL: URL?            // Documents/Logs/ring.log, found when the file is opened
    private var logRetryAt: ContinuousClock.Instant?   // after a failed write, the next try waits a minute
    private var logContinues = false    // the file opened with an earlier log in it: the next write marks the seam

    /// Makes Documents/Saves, Diagnostics and Logs, and keeps the last session's log as ring-previous.log (this session's
    /// first flush starts a new ring.log; after a crash it is the previous log that matters). The rotation runs whatever
    /// happens to the other folders. True when all exist. Log flushes wait for it, whatever its outcome.
    func prepareFolders() -> Bool {
        defer { foldersReady = true }
        let start = ContinuousClock.now
        defer {
            let d = start.duration(to: .now).components
            RingLog.shared.log(String(format: "io: folders and rotation in %.2f ms",
                                      Double(d.seconds) * 1_000 + Double(d.attoseconds) / 1e15))
        }
        return EngineMeter.shared.measure(.io) {
            var ok = true
            do {
                _ = try Storage.savesFolder()
                _ = try Storage.diagnosticsFolder()
            } catch {
                RingLog.shared.log("folders failed: \(error)")
                ok = false
            }
            do {
                let logs = try Storage.logsFolder()
                let current = logs.appendingPathComponent(Self.logName)
                let previous = logs.appendingPathComponent(Self.previousLogName)
                // one rename(2): it replaces ring-previous.log in a single step; a missing ring.log (the first launch) is
                // no failure. A failed rotation loses only the previous log, never the saves folder's state.
                if rename(current.path, previous.path) != 0 {
                    var e = errno
                    if e == EISDIR || e == ENOTEMPTY || e == EEXIST {
                        // ring-previous.log is a folder (made in Files): the old code removed it, so does this
                        try? FileManager.default.removeItem(at: previous)
                        e = rename(current.path, previous.path) == 0 ? 0 : errno
                    }
                    if e != 0 && e != ENOENT { RingLog.shared.log("ring log rotate failed: \(String(cString: strerror(e)))") }
                }
            } catch {
                RingLog.shared.log("logs folder failed: \(error)")
                ok = false
            }
            return ok
        }
    }

    /// Adds the lines logged since the last flush to Documents/Logs/ring.log. The file is opened once (open(2) with
    /// O_CREAT | O_APPEND: no temporary file, no rename) and each flush is one append with no sync: an app crash or kill
    /// keeps every flushed line (it is in the kernel); a power loss or a kernel panic may lose what the kernel had not yet
    /// put on disk. The atomic rewrite this replaces took 2.8-6.2 ms a flush on the iPhone 17 Pro Max (M0) against the
    /// 5 ms budget, most likely its sync. After a failed write the next try waits a minute (a full disk). The file
    /// restarts in place from the lines still held (at most 2,000) after a failed write, when it was deleted (from Files),
    /// and once it has grown `logCapBytes` past its last restart, so it stays under the held lines plus `logCapBytes`. A
    /// file found with lines in it (a failed rotation) gets a marker before this session's first lines. Waits for
    /// `prepareFolders` (the lines stay in memory until then).
    @discardableResult
    func flushLog() -> URL? {
        guard foldersReady else { return nil }
        if let t = logRetryAt, ContinuousClock.now < t { return nil }
        var opened: Double?
        return EngineMeter.shared.measure(.io) {
            do {
                if logHandle != nil, let u = logURL, !FileManager.default.fileExists(atPath: u.path) {  // deleted from Files
                    closeLog()
                    logRestart = true
                }
                if logHandle == nil {
                    // only on opening: the folder is found (and made again if it was deleted from Files)
                    let openStart = ContinuousClock.now
                    let url = try Storage.logsFolder().appendingPathComponent(Self.logName)
                    logURL = url
                    let fd = open(url.path, O_WRONLY | O_CREAT | O_APPEND, 0o644)
                    guard fd >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
                    let h = FileHandle(fileDescriptor: fd, closeOnDealloc: true)
                    logBytes = try Int(h.seekToEnd())
                    let d = openStart.duration(to: .now).components
                    opened = Double(d.seconds) * 1_000 + Double(d.attoseconds) / 1e15
                    logBase = 0                     // a file kept from before (a failed rotation) counts toward the bound
                    logHandle = h
                    if logBytes > 0 && !logRestart { logContinues = true }
                }
                guard let h = logHandle, let url = logURL else { return nil }
                // the open's own time goes in with this flush's lines (each open is rare: launch, a deletion, a failure)
                if let ms = opened { RingLog.shared.log(String(format: "io: ring.log opened in %.2f ms", ms)) }
                var pending = RingLog.shared.lines(since: logWritten)
                var head: [String] = []
                if logContinues { head.append(Self.mark("an earlier log ends here; the lines below are this session's")) }
                if pending.lost > 0 { head.append(Self.mark("\(pending.lost) lines dropped before this flush")) }
                let size = pending.lines.reduce(0) { $0 + $1.utf8.count + 1 }
                let restart = logRestart || logBytes - logBase + size > Self.logCapBytes
                if restart {
                    let why = logRestart ? "the log file restarted after a failed write or a deletion"
                                         : "the log file restarted at its \(Self.logCapBytes / 1_048_576) MB bound"
                    pending = RingLog.shared.lines(since: 0)
                    head = [Self.mark(why + "; the lines still held follow")]
                    logRestart = true               // until the write below is done
                    try h.truncate(atOffset: 0)
                    logBytes = 0
                }
                guard !pending.lines.isEmpty || !head.isEmpty else { return url }
                let data = Data(((head + pending.lines).joined(separator: "\n") + "\n").utf8)
                logRestart = true                   // a partial write is rewritten by the next flush
                try h.write(contentsOf: data)
                logRestart = false
                logBytes += data.count
                if restart { logBase = logBytes }
                logWritten = pending.next
                logRetryAt = nil
                logContinues = false
                return url
            } catch {
                closeLog()
                logRestart = true
                logRetryAt = ContinuousClock.now.advanced(by: .seconds(60))   // a full disk is not retried every flush
                RingLog.shared.log("ring log write failed (next try in a minute): \(error)")
                return nil
            }
        }
    }

    private static func mark(_ text: String) -> String { String(repeating: " ", count: 10) + "(" + text + ")" }

    private func closeLog() {
        try? logHandle?.close()
        logHandle = nil
        logBytes = 0
        logBase = 0
    }

    /// Writes rows as a new file Documents/Diagnostics/<name>, then keeps only the newest recordings. One open(2) with
    /// O_CREAT | O_EXCL and one write, with no sync and no rename: the atomic write it replaces took about 6 ms on the
    /// iPhone 17 Pro Max (M0's second run) against the 5 ms budget. A crash during the write can leave the file short;
    /// its name is new each time, so no older recording is touched.
    func writeCSV(_ rows: [String], name: String) throws -> URL {
        try EngineMeter.shared.measure(.io) {
            let diag = try Storage.diagnosticsFolder()
            var url = diag.appendingPathComponent(name)
            var fd = open(url.path, O_WRONLY | O_CREAT | O_EXCL, 0o644)
            var n = 2
            while fd < 0 && errno == EEXIST && n < 10 {          // the same millisecond twice: a suffix, as the exports
                url = diag.appendingPathComponent((name as NSString).deletingPathExtension + "-\(n).csv")
                fd = open(url.path, O_WRONLY | O_CREAT | O_EXCL, 0o644)
                n += 1
            }
            guard fd >= 0 else { throw POSIXError(POSIXErrorCode(rawValue: errno) ?? .EIO) }
            let h = FileHandle(fileDescriptor: fd, closeOnDealloc: true)
            defer { try? h.close() }
            do {
                try h.write(contentsOf: Data((rows.joined(separator: "\n") + "\n").utf8))
            } catch {
                unlink(url.path)                                  // no short file under a recording's name
                throw error
            }
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
        let flushed = flushLog() != nil
        return try EngineMeter.shared.measure(.io) {
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
            // the log file (every line flushed this session, up to its bound), or the lines held when there is none
            if let log = logURL, flushed, fm.fileExists(atPath: log.path) {
                try fm.copyItem(at: log, to: out.appendingPathComponent(Self.logName))
            } else {
                try (logLines.joined(separator: "\n") + "\n").write(to: out.appendingPathComponent(Self.logName), atomically: true, encoding: .utf8)
            }
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
        let d = Calendar(identifier: .gregorian).dateComponents([.year, .month, .day, .hour, .minute, .second, .nanosecond], from: Date())
        return String(format: "%04ld%02ld%02ld-%02ld%02ld%02ld-%03ld", d.year ?? 0, d.month ?? 0, d.day ?? 0,
                      d.hour ?? 0, d.minute ?? 0, d.second ?? 0, (d.nanosecond ?? 0) / 1_000_000)
    }
}
