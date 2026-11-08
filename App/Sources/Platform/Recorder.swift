import Foundation
import Observation
import SaneiEngine
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
}

/// The 60 s recorder (M0), on the I/O thread (ADR 0001): for its duration the render engine draws every refresh and
/// the simulation runs 30 days a second (the maximum speed, D-16); each second it writes one CSV row from the engines'
/// meters: render frames, encode time, hitches, the simulation's days and time per day, the I/O time, the main
/// thread's worst lag (a ping every 100 ms), thermal state, battery, Low Power Mode and free memory.
actor RecorderEngine {
    static let shared = RecorderEngine()
    nonisolated var unownedExecutor: UnownedSerialExecutor { Engines.io.asUnownedSerialExecutor() }
    private var running = false

    func record(seconds: Int, host: GameHost, ui: RecorderUI) async {
        guard !running else { return }
        running = true
        defer { running = false }
        _ = EngineMeter.shared.drain()
        _ = RenderEngine.shared.drainFrames()
        RenderEngine.shared.setContinuous(true)
        let sim = Task.detached(priority: .utility) {
            while !Task.isCancelled {
                await host.advance(days: 1)
                try? await Task.sleep(for: .milliseconds(33))
            }
        }
        var rows = ["second,render_frames,render_ms_mean,render_ms_max,render_hitches,render_thread,sim_days,sim_ms_mean,sim_ms_max,sim_thread,io_ms_max,main_lag_ms_max,thermal,battery_level,battery_state,low_power,mem_available_mb"]
        var total = Totals()
        let clock = ContinuousClock()
        for second in 1...seconds {
            var lag = Duration.zero
            for _ in 0..<10 {
                try? await Task.sleep(for: .milliseconds(100))
                let t0 = clock.now
                await MainActor.run {}
                lag = max(lag, t0.duration(to: clock.now))
            }
            let m = EngineMeter.shared.drain()
            let f = RenderEngine.shared.drainFrames()
            let device = await MainActor.run { (UIDevice.current.batteryLevel, UIDevice.current.batteryState.rawValue) }
            let p = ProcessInfo.processInfo
            let r = m[.render] ?? EngineMeter.Sample(), s = m[.sim] ?? EngineMeter.Sample(), io = m[.io] ?? EngineMeter.Sample()
            let lagMs = Self.ms(lag)
            rows.append(String(format: "%ld,%ld,%.3f,%.3f,%ld,%@,%ld,%.3f,%.3f,%@,%.3f,%.2f,%@,%.2f,%ld,%ld,%.0f",
                               second, f.frames, r.meanMs, r.maxMs, f.hitches, r.thread, s.count, s.meanMs, s.maxMs, s.thread,
                               io.maxMs, lagMs, Self.thermalName(p.thermalState), device.0, device.1,
                               p.isLowPowerModeEnabled ? 1 : 0, Double(os_proc_available_memory()) / 1_048_576))
            total.add(r: r, s: s, frames: f.frames, hitches: f.hitches, lagMs: lagMs)
            let left = seconds - second
            await MainActor.run { ui.secondsLeft = left }
        }
        sim.cancel()
        RenderEngine.shared.setContinuous(false)
        var file = ""
        do {
            let url = try await IOEngine.shared.writeCSV(rows, name: "recorder-\(Stamp.now()).csv")
            file = url.lastPathComponent
        } catch {
            RingLog.shared.log("recorder write failed: \(error)")
        }
        RingLog.shared.log("recorder done \(file): \(total.lines().joined(separator: " | "))")
        let summary = String(format: "%ld ثانية · %ld إطارًا · %ld تقطّعًا", seconds, total.frames, total.hitches)
        let lines = total.lines()
        await MainActor.run {
            ui.isRecording = false
            ui.secondsLeft = 0
            ui.lastSummary = summary
            ui.engineLines = lines
        }
    }

    private struct Totals {
        var frames = 0, hitches = 0, days = 0
        var renderNs: UInt64 = 0, renderMax = 0.0, renderThread = ""
        var simNs: UInt64 = 0, simMax = 0.0, simThread = ""
        var lagMax = 0.0

        mutating func add(r: EngineMeter.Sample, s: EngineMeter.Sample, frames f: Int, hitches h: Int, lagMs: Double) {
            frames += f; hitches += h; days += s.count
            renderNs &+= r.totalNanos; renderMax = max(renderMax, r.maxMs); if !r.thread.isEmpty { renderThread = r.thread }
            simNs &+= s.totalNanos; simMax = max(simMax, s.maxMs); if !s.thread.isEmpty { simThread = s.thread }
            lagMax = max(lagMax, lagMs)
        }

        func lines() -> [String] {
            let rm = frames > 0 ? Double(renderNs) / Double(frames) / 1_000_000 : 0
            let sm = days > 0 ? Double(simNs) / Double(days) / 1_000_000 : 0
            return [String(format: "الرسم: %.2f م.ث للإطار (أسوأ %.2f) · %@", rm, renderMax, renderThread),
                    String(format: "المحاكاة: %ld يومًا · %.2f م.ث لليوم (أسوأ %.2f) · %@", days, sm, simMax, simThread),
                    String(format: "الواجهة: أسوأ تأخر %.1f م.ث", lagMax)]
        }
    }

    private static func ms(_ d: Duration) -> Double {
        let c = d.components
        return Double(c.seconds) * 1_000 + Double(c.attoseconds) / 1_000_000_000_000_000
    }

    private static func thermalName(_ s: ProcessInfo.ThermalState) -> String {
        switch s {
        case .nominal: return "nominal"
        case .fair: return "fair"
        case .serious: return "serious"
        case .critical: return "critical"
        @unknown default: return "unknown"
        }
    }
}
