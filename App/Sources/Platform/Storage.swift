import Foundation

/// The app's folders in Documents (visible in Files: UIFileSharingEnabled). Saves go to Documents/Saves (§7).
enum Storage {
    static func documents() throws -> URL {
        try FileManager.default.url(for: .documentDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    }

    /// Documents/<name>, made when missing.
    static func folder(_ name: String) throws -> URL {
        let url = try documents().appendingPathComponent(name, isDirectory: true)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
        return url
    }

    static func savesFolder() throws -> URL { try folder("Saves") }
    static func diagnosticsFolder() throws -> URL { try folder("Diagnostics") }
    static func logsFolder() throws -> URL { try folder("Logs") }
}
