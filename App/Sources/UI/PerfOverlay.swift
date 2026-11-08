import SwiftUI

/// M0's overlay: the device, iOS, thermal state, memory, frames drawn, the saves folder, the last recording and each
/// engine's time and threads from it (ADR 0001). Event-driven, no timer (L1): the model and iOS are read once, the
/// thermal state on its notification, memory and frames when the overlay appears or is tapped, and each second only
/// while a recording runs. It stays visible in M0 (the install proof); the game's overlay hides behind a gesture.
struct PerfOverlay: View {
    let model: AppModel
    private static let t1 = Color(red: 0.918, green: 0.949, blue: 0.969)
    private static let t2 = Color(red: 0.663, green: 0.737, blue: 0.796)

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            row("الجهاز", model.deviceLine)
            row("الحرارة", model.thermal)
            row("الذاكرة المتاحة", memoryText)
            row("الإطارات المرسومة", String(format: "%ld منذ التشغيل", model.framesSinceLaunch))
            row("مجلد الحفظ", model.savesReady.map { $0 ? "جاهز (Saves)" : "تعذّر إنشاؤه" } ?? "يُجهَّز…")
            row("آخر تسجيل", model.recorder.lastSummary ?? "لا يوجد بعد")
            ForEach(model.recorder.engineLines, id: \.self) { line in
                Text(verbatim: line).font(.system(size: 11.5, weight: .medium)).foregroundStyle(Self.t2)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture { model.refreshDeviceState() }
        .onAppear { model.refreshDeviceState() }
        .accessibilityHint(Text(verbatim: "انقر مرتين لتحديث الذاكرة والإطارات"))
    }

    private var memoryText: String {
        let mb = model.recorder.isRecording ? (model.recorder.memoryMB ?? model.memoryMB) : model.memoryMB
        return mb.map { String(format: "%.0f ميغابايت", $0) } ?? "—"
    }

    private func row(_ label: String, _ value: String) -> some View {
        HStack(alignment: .firstTextBaseline, spacing: 8) {
            Text(verbatim: label).font(.system(size: 11.5, weight: .medium)).foregroundStyle(Self.t2)
                .frame(width: 104, alignment: .leading)
            Text(verbatim: value).font(.system(size: 13, weight: .semibold)).foregroundStyle(Self.t1)
                .lineLimit(2)
        }
        .accessibilityElement(children: .combine)
    }
}
