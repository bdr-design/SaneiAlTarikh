import SwiftUI

/// The M0 screen: Arabic, right to left, landscape. The title and the checks on the right (the leading side), the Metal
/// triangle on the left (drawn on the render thread). The main thread only lays out and forwards taps (ADR 0001).
/// Every number is built with String(format:) and shown verbatim: Western digits.
struct RootView: View {
    let model: AppModel

    private static let t1 = Color(red: 0.918, green: 0.949, blue: 0.969)    // #EAF2F7
    private static let t2 = Color(red: 0.663, green: 0.737, blue: 0.796)    // #A9BCCB
    private static let cyan = Color(red: 0.498, green: 0.914, blue: 1.0)     // #7FE9FF
    private static let bg = Color(red: 0.043, green: 0.071, blue: 0.094)     // #0B1218
    private static let panel = Color(red: 0.035, green: 0.067, blue: 0.098).opacity(0.92)

    /// Counted words are avoided (the counted forms wait for GameFormatter, §6.11): a number beside a unit or a label.
    private var recordLabel: String {
        guard model.recorder.isRecording else {
            return String(format: "تسجيل الأداء · %ld ث", AppModel.idleSeconds + AppModel.loadSeconds)
        }
        let left = model.recorder.secondsLeft
        return left > 0 ? String(format: "يسجّل… باقي %ld ث", left) : "يحفظ…"
    }

    var body: some View {
        HStack(spacing: 16) {
            VStack(alignment: .leading, spacing: 12) {
                VStack(alignment: .leading, spacing: 2) {
                    Text(verbatim: "صانع التاريخ").font(.system(size: 28, weight: .bold)).foregroundStyle(Self.t1)
                    Text(verbatim: "إثبات التثبيت · المرحلة M0").font(.system(size: 13, weight: .medium)).foregroundStyle(Self.t2)
                }
                PerfOverlay(model: model)
                HStack(spacing: 8) {
                    Button {
                        model.startRecording()
                    } label: {
                        Text(verbatim: recordLabel)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(Self.cyan)
                    .foregroundStyle(Self.bg)
                    .disabled(model.recorder.isRecording)

                    Button {
                        model.prepareExport()
                    } label: {
                        Text(verbatim: "تجهيز التشخيص")
                    }
                    .buttonStyle(.bordered)
                    .tint(Self.t1)
                    .disabled(model.recorder.isRecording || model.exporting)

                    if !model.lastExport.isEmpty {
                        ShareLink(items: model.lastExport) {
                            Text(verbatim: String(format: "مشاركة الملفات (%ld)", model.lastExport.count))
                        }
                        .buttonStyle(.bordered)
                        .tint(Self.cyan)
                    }
                }
                Text(verbatim: String(format: "التسجيل: %ld ث بلا حركة ثم %ld ث تحت الحمل (الرسم كل تحديث والمحاكاة بأقصى سرعة)",
                                      AppModel.idleSeconds, AppModel.loadSeconds))
                    .font(.system(size: 11)).foregroundStyle(Self.t2)
                if let e = model.exportError {
                    Text(verbatim: "تعذّر التصدير: " + e).font(.system(size: 11)).foregroundStyle(Self.t2)
                }
                Spacer(minLength: 0)
            }
            .padding(16)
            .frame(maxWidth: 420, maxHeight: .infinity, alignment: .topLeading)
            .background(Self.panel, in: RoundedRectangle(cornerRadius: 16))

            MetalHost()
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .accessibilityElement()
                .accessibilityAddTraits(.isImage)
                .accessibilityLabel(Text(verbatim: "مثلث مرسوم بـ Metal"))
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 12)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Self.bg.ignoresSafeArea())
    }
}
