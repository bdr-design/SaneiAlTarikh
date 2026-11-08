import SwiftUI

/// صانع التاريخ, M0 (the install proof): one Arabic right-to-left landscape screen with a Metal triangle, the overlay,
/// the 60 s recorder, the ring log, the diagnostics export and the Documents saves folder (design_doc §9, M0).
@main
struct SaneiApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var model = AppModel()

    var body: some Scene {
        WindowGroup {
            RootView(model: model)
                .environment(\.layoutDirection, .rightToLeft)
                .environment(\.locale, Locale(identifier: "ar"))
                .preferredColorScheme(.dark)
                .statusBarHidden(true)
        }
        .onChange(of: scenePhase) { _, phase in
            RingLog.shared.log("scene \(phase)")
            if phase == .background { Task { await RingLog.shared.flush() } }
        }
    }
}
