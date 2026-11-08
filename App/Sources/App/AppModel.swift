import Foundation
import Observation
import SaneiEngine
import SaneiRuntime
import UIKit

/// The M0 app's state, on the main thread; every piece of work goes to its engine (ADR 0001): the simulation on
/// `sanei.sim`, files and the recorder on `sanei.io`, drawing on `sanei.render`.
@MainActor
@Observable
final class AppModel {
    let recorder = RecorderUI()
    let host = GameHost(executor: Engines.sim) { ns in EngineMeter.shared.record(.sim, nanoseconds: ns) }
    private(set) var savesReady: Bool?
    private(set) var lastExport: [URL] = []
    private(set) var exportError: String?
    private(set) var exporting = false

    init() {
        RingLog.shared.log("launch \(DeviceInfo.summaryLine())")
        RenderEngine.shared.start()
        MetricsSink.shared.start()
        Task {
            let ok = await IOEngine.shared.prepareFolders()
            self.savesReady = ok
            RingLog.shared.log(ok ? "saves folder ready" : "saves folder failed")
        }
    }

    func startRecording() {
        guard !recorder.isRecording else { return }
        UIDevice.current.isBatteryMonitoringEnabled = true
        recorder.isRecording = true
        recorder.secondsLeft = 60
        let host = self.host, ui = self.recorder
        Task.detached(priority: .utility) { await RecorderEngine.shared.record(seconds: 60, host: host, ui: ui) }
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
            self.exporting = false
        }
    }
}
