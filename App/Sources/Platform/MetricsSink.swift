import Foundation
import MetricKit

/// Receives MetricKit's metric and diagnostic payloads (on MetricKit's own queue) and hands them to the I/O engine,
/// which keeps them for the next diagnostics export.
final class MetricsSink: NSObject, MXMetricManagerSubscriber, @unchecked Sendable {
    static let shared = MetricsSink()

    func start() { MXMetricManager.shared.add(self) }

    func didReceive(_ payloads: [MXMetricPayload]) {
        let data = payloads.map { $0.jsonRepresentation() }
        Task { for d in data { await IOEngine.shared.saveMetricPayload(d, name: "metrics") } }
    }

    func didReceive(_ payloads: [MXDiagnosticPayload]) {
        let data = payloads.map { $0.jsonRepresentation() }
        Task { for d in data { await IOEngine.shared.saveMetricPayload(d, name: "diagnostic") } }
    }
}
