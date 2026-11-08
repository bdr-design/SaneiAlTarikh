import Foundation
import UIKit

/// A short description of the device for the log and the diagnostics export. Western digits (String(format:) is POSIX).
@MainActor
enum DeviceInfo {
    /// The hardware model identifier, such as iPhone17,2.
    static func model() -> String {
        var u = utsname()
        uname(&u)
        return withUnsafeBytes(of: &u.machine) { raw in
            String(decoding: raw.prefix { $0 != 0 }, as: UTF8.self)
        }
    }

    static func thermalName(_ s: ProcessInfo.ThermalState) -> String {
        switch s {
        case .nominal: return "nominal"
        case .fair: return "fair"
        case .serious: return "serious"
        case .critical: return "critical"
        @unknown default: return "unknown"
        }
    }

    /// The memory the app may still use before the system limits it, in MB.
    static func availableMemoryMB() -> Double { Double(os_proc_available_memory()) / 1_048_576 }

    static func summaryLine() -> String {
        let p = ProcessInfo.processInfo
        return String(format: "%@ iOS %@ thermal %@ lowPower %ld memAvail %.0f MB",
                      model(), UIDevice.current.systemVersion, thermalName(p.thermalState),
                      p.isLowPowerModeEnabled ? 1 : 0, availableMemoryMB())
    }
}
