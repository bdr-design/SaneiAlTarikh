import SwiftUI
import UIKit

/// M0's overlay: the device, iOS, thermal state, memory, the saves folder, the last recording and each engine's time and
/// thread from it (ADR 0001). It refreshes once a second (a timer, not a display link: L1).
struct PerfOverlay: View {
    let model: AppModel
    private static let t1 = Color(red: 0.918, green: 0.949, blue: 0.969)
    private static let t2 = Color(red: 0.663, green: 0.737, blue: 0.796)

    var body: some View {
        TimelineView(.periodic(from: .now, by: 1)) { _ in
            VStack(alignment: .leading, spacing: 4) {
                row("الجهاز", DeviceInfo.model() + " · iOS " + UIDevice.current.systemVersion)
                row("الحرارة", DeviceInfo.thermalName(ProcessInfo.processInfo.thermalState))
                row("الذاكرة المتاحة", String(format: "%.0f ميغابايت", DeviceInfo.availableMemoryMB()))
                row("مجلد الحفظ", model.savesReady.map { $0 ? "جاهز (Saves)" : "تعذّر إنشاؤه" } ?? "يُجهَّز…")
                row("آخر تسجيل", model.recorder.lastSummary ?? "لا يوجد بعد")
                ForEach(model.recorder.engineLines, id: \.self) { line in
                    Text(verbatim: line).font(.system(size: 11.5, weight: .medium)).foregroundStyle(Self.t2)
                }
            }
        }
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(verbatim: label).font(.system(size: 11.5, weight: .medium)).foregroundStyle(Self.t2)
                .frame(width: 104, alignment: .leading)
            Text(verbatim: value).font(.system(size: 13, weight: .semibold)).foregroundStyle(Self.t1)
                .lineLimit(2)
        }
    }
}
