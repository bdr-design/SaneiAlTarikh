import Foundation
import Observation
import SaneiEngine
import SaneiRuntime
import UIKit

/// The M0 app's state, on the main thread; every piece of work goes to its engine (ADR 0001): the simulation on
/// `sanei.sim`, files and the recorder on `sanei.io`, drawing on `sanei.render`. Each main-thread action is metered
/// under `.main`.
@MainActor
@Observable
final class AppModel {
    static let idleSeconds = 5, loadSeconds = 60

    let recorder = RecorderUI()
    let host = GameHost(executor: Engines.sim) { ns in EngineMeter.shared.record(.sim, nanoseconds: ns) }
    /// The model and iOS version, read once.
    let deviceLine = DeviceInfo.staticLine()
    private(set) var thermal = DeviceInfo.thermalName(ProcessInfo.processInfo.thermalState)
    /// Free memory, read when the overlay appears or is tapped (and each second while recording, from the recorder).
    private(set) var memoryMB: Double?
    private(set) var framesSinceLaunch = 0
    private(set) var savesReady: Bool?
    private(set) var lastExport: [URL] = []
    private(set) var exportError: String?
    private(set) var exporting = false
    @ObservationIgnored private var thermalObserver: (any NSObjectProtocol)?

    init() {
        RingLog.shared.log("launch \(DeviceInfo.summaryLine())")
        RenderEngine.shared.start()
        MetricsSink.shared.start()
        // the thermal state changes rarely: a notification, never a timer (L1)
        thermalObserver = NotificationCenter.default.addObserver(
            forName: ProcessInfo.thermalStateDidChangeNotification, object: nil, queue: .main
        ) { [weak self] _ in
            MainActor.assumeIsolated {
                guard let self else { return }
                self.thermal = DeviceInfo.thermalName(ProcessInfo.processInfo.thermalState)
                RingLog.shared.log("thermal \(self.thermal)")
            }
        }
        Task {
            let ok = await IOEngine.shared.prepareFolders()
            self.savesReady = ok
            RingLog.shared.log(ok ? "saves folder ready" : "saves folder failed")
            await RingLog.shared.flush()        // this session's log reaches its file from the start
        }
    }

    /// The overlay's on-request values (it appeared or was tapped).
    func refreshDeviceState() {
        EngineMeter.shared.measure(.main) {
            memoryMB = DeviceInfo.availableMemoryMB()
            framesSinceLaunch = RenderEngine.shared.totalFrames
        }
    }

    func startRecording() {
        guard !recorder.isRecording else { return }
        EngineMeter.shared.measure(.main) {
            UIDevice.current.isBatteryMonitoringEnabled = true
            UIApplication.shared.isIdleTimerDisabled = true     // the screen must stay on for the whole recording
            recorder.isRecording = true
            recorder.secondsLeft = Self.idleSeconds + Self.loadSeconds
        }
        let host = self.host, ui = self.recorder, idle = Self.idleSeconds, loaded = Self.loadSeconds
        // the simulation's load runs on its own thread at the top speed; the recorder only starts and cancels it
        // the top speed runs at user-initiated, the rest of the time the simulation's thread is utility (§2.4)
        let load: @Sendable () async -> Void = {
            Engines.sim.setQoS(.userInitiated)
            await host.run(daysPerWake: 3, period: .milliseconds(100))
            Engines.sim.setQoS(.utility)
        }
        Task.detached(priority: .utility) {
            await RecorderEngine.shared.record(idleSeconds: idle, loadSeconds: loaded, load: load, ui: ui)
        }
    }

    /// The export runs on the I/O engine; the main thread only receives the file list.
    func prepareExport() {
        guard !exporting else { return }
        exporting = true
        let summary = DeviceInfo.summaryLine() + "\n" + recorder.engineLines.joined(separator: "\n")
        let lines = RingLog.shared.snapshot()
        Task {
            do {
                let urls = try await IOEngine.shared.exportDiagnostics(deviceSummary: summary, logLines: lines)
                self.lastExport = urls
                self.exportError = nil
                RingLog.shared.log("diagnostics export: \(urls.count) files")
            } catch {
                self.lastExport = []
                self.exportError = "\(error)"
                RingLog.shared.log("diagnostics export failed: \(error)")
            }
            await RingLog.shared.flush()
            self.exporting = false
        }
    }

    /// The app went to the background: drawing stops, a recording ends early with its rows kept, and the log reaches
    /// its file, inside a background task so iOS lets the writes finish (§2.4 lifecycle).
    func enterBackground() {
        RenderEngine.shared.pause()
        let task = BackgroundTask(name: "sanei.flush")
        Task {
            await RecorderEngine.shared.interrupt()
            await RingLog.shared.flush()
            task.end()
        }
    }

    func enterForeground() {
        RenderEngine.shared.resume()
        refreshDeviceState()
    }
}

/// A UIKit background task that ends once, from the work or from iOS's expiry.
@MainActor
final class BackgroundTask {
    private var id = UIBackgroundTaskIdentifier.invalid

    init(name: String) {
        id = UIApplication.shared.beginBackgroundTask(withName: name) { [weak self] in
            MainActor.assumeIsolated { self?.end() }
        }
    }

    func end() {
        guard id != .invalid else { return }
        UIApplication.shared.endBackgroundTask(id)
        id = .invalid
    }
}
