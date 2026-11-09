import Foundation
import Observation
import SaneiRuntime
import UIKit

/// What the screen shows of the recorder (the main thread only reads it).
@MainActor
@Observable
final class RecorderUI {
    var isRecording = false
    var secondsLeft = 0
    var lastSummary: String?
    /// One line per engine from the last recording: its mean and worst time and the thread it ran on.
    var engineLines: [String] = []
    /// The memory headroom (`os_proc_available_memory`), refreshed each second while recording (the overlay reads it then).
    var memoryMB: Double?
}

/// The recorder (M0), on the I/O thread (ADR 0001). It first records `idleSeconds` with nothing changing (the render
/// engine must draw no frame: L1), then `loadSeconds` under load: the render engine draws every refresh and the
/// simulation runs at its top speed (`load`, 30 days a second, D-16). Each second, on deadlines that do not drift, it
/// writes one CSV row from the engines' meters (frames, encode time, hitches, frame spacing, the simulation's days and
/// time per day, the I/O and main-thread work, each engine's threads), the main thread's worst lag (a ping every
/// 100 ms, timed on the main thread), the real length of the row, thermal state, battery, Low Power Mode and the memory headroom
/// (`os_proc_available_memory`, not free memory).
/// Going to the background interrupts it: the rows so far are written to a file marked "interrupted".
actor RecorderEngine {
    static let shared = RecorderEngine()
    nonisolated var unownedExecutor: UnownedSerialExecutor { Engines.io.asUnownedSerialExecutor() }
    private var running = false
    private var interrupted = false
    private var waiters: [CheckedContinuation<Void, Never>] = []

    static let header = "second,phase,elapsed_ms,render_frames,render_idle_frames,render_ms_mean,render_ms_max,render_hitches,"
        + "frame_interval_ms_mean,frame_interval_ms_max,link_late_ms_max,link_skipped,present_late_ms_max,render_dropped,render_thread,sim_days,sim_ms_mean,sim_ms_max,sim_thread,"
        + "io_count,io_ms_max,io_thread,main_count,main_ms_max,main_thread,main_lag_ms_max,"
        + "thermal,battery_level,battery_state,low_power,mem_available_mb"

    /// Stops a running recording and returns once its partial file is written (the app is going to the background).
    func interrupt() async {
        guard running else { return }
        interrupted = true
        await withCheckedContinuation { waiters.append($0) }
    }

    func record(idleSeconds: Int, loadSeconds: Int, load: @escaping @Sendable () async -> Void, ui: RecorderUI) async {
        guard !running else { return }
        running = true
        interrupted = false
        let seconds = idleSeconds + loadSeconds
        // what ran before the recording (launch, exports, the last recording's CSV, MetricKit payloads) is in no row:
        // its I/O goes to the log, so the one-off writes are measured too
        let before = EngineMeter.shared.drain()[.io] ?? EngineMeter.Sample()
        RingLog.shared.log(String(format: "recorder: before it, io %ld operations, worst %.2f ms", before.count, before.maxMs))
        _ = RenderEngine.shared.drainFrames()
        var sim: Task<Void, Never>?
        var rows = [Self.header]
        rows.reserveCapacity(seconds + 1)
        var total = Totals()
        var done = 0
        let clock = ContinuousClock()
        let begin = clock.now
        var lastDrain = begin
        await RingLog.shared.flush()
        for second in 1...seconds {
            if interrupted { break }
            let loaded = second > idleSeconds
            if second == idleSeconds + 1 {
                RingLog.shared.log("recorder: load starts")
                await RingLog.shared.flush()
                if interrupted { break }
                RenderEngine.shared.setContinuous(true)
                sim = Task.detached(priority: .utility) { await load() }
            } else if second % 10 == 0 {
                // the log's file follows the recording (the heaviest moment), so a crash in it leaves its lines; the
                // line written each time makes every flush a real append (the cost the recorder measures)
                RingLog.shared.log("recorder: second \(second)")
                await RingLog.shared.flush()
            }
            var lag = Duration.zero
            for k in 1...10 {
                let deadline = begin.advanced(by: .milliseconds(100 * ((second - 1) * 10 + k)))
                try? await clock.sleep(until: deadline, tolerance: .milliseconds(2))
                let t0 = clock.now
                let t1 = await MainActor.run { ContinuousClock.now }
                lag = max(lag, t0.duration(to: t1))
                if interrupted { break }
            }
            if interrupted { break }
            let now = clock.now
            let elapsedMs = Self.ms(lastDrain.duration(to: now))
            lastDrain = now
            let m = EngineMeter.shared.drain()
            let f = RenderEngine.shared.drainFrames()
            let device = await MainActor.run {
                EngineMeter.shared.measure(.main) { (UIDevice.current.batteryLevel, UIDevice.current.batteryState.rawValue) }
            }
            let row = EngineMeter.shared.measure(.io) { () -> (String, Double) in
                let p = ProcessInfo.processInfo
                let none = EngineMeter.Sample()
                let r = m[.render] ?? none, s = m[.sim] ?? none, io = m[.io] ?? none, main = m[.main] ?? none
                let lagMs = Self.ms(lag)
                let mem = Double(os_proc_available_memory()) / 1_048_576
                total.add(loaded: loaded, r: r, s: s, io: io, main: main, frames: f, lagMs: lagMs)
                let line = String(format: "%ld,%@,%.1f,%ld,%ld,%.3f,%.3f,%ld,%.2f,%.2f,%.2f,%ld,%.2f,%ld,%@,%ld,%.3f,%.3f,%@,%ld,%.3f,%@,%ld,%.3f,%@,%.2f,%@,%.2f,%ld,%ld,%.0f",
                                  second, loaded ? "load" : "idle", elapsedMs,
                                  f.frames, f.idleFrames, r.meanMs, r.maxMs, f.hitches, f.intervalMeanMs, f.intervalMaxMs, f.linkLateMaxMs, f.linkSkipped, f.presentLateMaxMs, f.dropped, r.thread,
                                  s.count, s.meanMs, s.maxMs, s.thread,
                                  io.count, io.maxMs, io.thread, main.count, main.maxMs, main.thread, lagMs,
                                  DeviceInfo.thermalName(p.thermalState), device.0, device.1, p.isLowPowerModeEnabled ? 1 : 0, mem)
                return (line, mem)
            }
            rows.append(row.0)
            done = second
            let left = seconds - second
            await MainActor.run {
                EngineMeter.shared.measure(.main) {
                    ui.secondsLeft = left
                    ui.memoryMB = row.1
                }
            }
        }
        sim?.cancel()
        await sim?.value
        RenderEngine.shared.setContinuous(false)
        let cut = done < seconds
        var file = ""
        let name = "recorder-\(Stamp.now())\(cut ? "-interrupted" : "").csv"
        let writeStart = ContinuousClock.now
        do {
            let url = try await IOEngine.shared.writeCSV(rows, name: name)
            file = url.lastPathComponent
            RingLog.shared.log(String(format: "recorder: the CSV written in %.2f ms (wall, the write and the prune)",
                                      Self.ms(writeStart.duration(to: .now))))
        } catch {
            RingLog.shared.log("recorder write failed: \(error)")
        }
        let lines = total.lines()
        RingLog.shared.log("recorder \(cut ? "interrupted at second \(done)" : "done") \(file): \(lines.joined(separator: " | "))")
        await RingLog.shared.flush()
        let summary = cut
            ? String(format: "انقطع عند الثانية %ld (خرج التطبيق للخلفية)", done)
            : String(format: "المدة %ld ث · الإطارات %ld · التقطّعات %ld · إطارات الخمول %ld",
                     done, total.frames, total.hitches, total.idleFrames)
        await MainActor.run {
            ui.isRecording = false
            ui.secondsLeft = 0
            ui.lastSummary = summary
            ui.engineLines = lines
            UIApplication.shared.isIdleTimerDisabled = false
            UIDevice.current.isBatteryMonitoringEnabled = false
        }
        running = false
        interrupted = false
        let w = waiters
        waiters.removeAll()
        for c in w { c.resume() }
    }

    private struct Totals {
        var frames = 0, idleFrames = 0, hitches = 0, days = 0
        var renderNs: UInt64 = 0, renderCount = 0, renderMax = 0.0, renderThread = ""
        var simNs: UInt64 = 0, simMax = 0.0, simThread = ""
        var ioCount = 0, ioMax = 0.0, ioThread = ""
        var mainCount = 0, mainMax = 0.0, mainThread = ""
        var lagMax = 0.0

        mutating func add(loaded: Bool, r: EngineMeter.Sample, s: EngineMeter.Sample, io: EngineMeter.Sample,
                          main: EngineMeter.Sample, frames f: FrameStats, lagMs: Double) {
            frames += f.frames; idleFrames += f.idleFrames; hitches += f.hitches; days += s.count
            renderNs &+= r.totalNanos; renderCount += r.count; renderMax = max(renderMax, r.maxMs)
            simNs &+= s.totalNanos; simMax = max(simMax, s.maxMs)
            ioCount += io.count; ioMax = max(ioMax, io.maxMs)
            mainCount += main.count; mainMax = max(mainMax, main.maxMs)
            Self.merge(&renderThread, r.thread); Self.merge(&simThread, s.thread)
            Self.merge(&ioThread, io.thread); Self.merge(&mainThread, main.thread)
            lagMax = max(lagMax, lagMs)
        }

        /// Keeps every distinct thread name seen over the recording.
        private static func merge(_ into: inout String, _ names: String) {
            for n in names.split(separator: "+") where !into.split(separator: "+").contains(n) {
                into = into.isEmpty ? String(n) : into + "+" + n
            }
        }

        func lines() -> [String] {
            let rm = renderCount > 0 ? Double(renderNs) / Double(renderCount) / 1_000_000 : 0
            let sm = days > 0 ? Double(simNs) / Double(days) / 1_000_000 : 0
            let dash = "—"
            return [String(format: "الرسم: %.2f م.ث للإطار (الأسوأ %.2f) · %@", rm, renderMax, renderThread.isEmpty ? dash : renderThread),
                    String(format: "المحاكاة: الأيام %ld · %.2f م.ث لليوم (الأسوأ %.2f) · %@", days, sm, simMax, simThread.isEmpty ? dash : simThread),
                    String(format: "الملفات: العمليات %ld · الأسوأ %.2f م.ث · %@", ioCount, ioMax, ioThread.isEmpty ? dash : ioThread),
                    String(format: "الواجهة: الأعمال %ld · الأسوأ %.2f م.ث · أسوأ تأخر %.1f م.ث · %@", mainCount, mainMax, lagMax,
                           mainThread.isEmpty ? dash : mainThread)]
        }
    }

    private static func ms(_ d: Duration) -> Double {
        let c = d.components
        return Double(c.seconds) * 1_000 + Double(c.attoseconds) / 1_000_000_000_000_000
    }
}
