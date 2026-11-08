import SaneiRuntime

/// The engines' own threads (ADR 0001). They start on first use and live for the app's life; each sleeps when idle.
enum Engines {
    /// The simulation (GameHost): its own thread, never the main thread or a long loop on the shared pool.
    static let sim = DedicatedThreadExecutor(name: "sanei.sim", qos: .userInitiated)
    /// Platform I/O: saves, the ring log's file, exports, the recorder's CSV.
    static let io = DedicatedThreadExecutor(name: "sanei.io", qos: .utility)
}
