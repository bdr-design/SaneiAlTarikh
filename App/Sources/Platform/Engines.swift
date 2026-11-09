import SaneiRuntime

/// The engines' own threads (ADR 0001). They start on first use and live for the app's life; each sleeps when idle.
enum Engines {
    /// The simulation engine: its own thread, never the main thread or a long loop on the shared pool. Utility, below
    /// the render thread (user-interactive) and the main thread, so a heavy day never takes a frame's time; raised to
    /// user-initiated while it runs at its top speed (§2.4, `setQoS`).
    static let sim = DedicatedThreadExecutor(name: "sanei.sim", qos: .utility)
    /// Platform I/O: saves, the ring log's file, exports, the recorder's CSV.
    static let io = DedicatedThreadExecutor(name: "sanei.io", qos: .utility)
}
