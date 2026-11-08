# ADR 0001: Engines and threads

Status: accepted, 2026-11-08. Owner's rules `loadSpread` (2026-11-02) and `threadSpread` (2026-11-08: «ممنوع جعل كل شي على
خيط واحد يجب توزين الثقل بحيث اللعبة تتحمل اي تحديثات مستقبله من الاساس ... ممنوع الثقل»). Sharpens design doc L14 and §2.4.

## Context
A grand-strategy game grows: more systems, more countries, more map layers. If they share one thread, each addition
slows every other, and the screen stutters. Swift's cooperative thread pool has a fixed number of threads (the core
count) and never grows; a long-running loop or a blocking call on it starves every other task. File I/O blocks its
thread. Metal encoding on the main thread competes with touches and SwiftUI.

## Decision
Every engine has its own thread from the first milestone, and new systems join an engine, never the main thread:

| Engine | Thread | Does | Never |
|---|---|---|---|
| Main (UI) | the main thread | touches; hands finished models to the views (≤1.0 ms a frame) | simulate, decode, shape text, build buffers, touch files, encode Metal |
| Render | `sanei.render`: its own `Thread` and run loop, driven by `CAMetalDisplayLink` (iOS 17) on a `CAMetalLayer` | encodes and presents frames; paused (no callbacks) when nothing changes (L1, L6) | read the engine or content |
| Simulation | `sanei.sim`: a dedicated-thread `SerialExecutor` behind the `GameHost` actor | days, systems, commands; publishes snapshots ≤10 a second | run on the main thread or as a long loop on the cooperative pool |
| Platform I/O | `sanei.io`: a dedicated-thread `SerialExecutor` behind the I/O actor | saves, the ring log's file, exports, the recorder's CSV | block the main thread |
| Parallel bursts | the cooperative pool (`TaskGroup`) | per-government monthly work, image decoding, label shaping, map buffers; each kind with an in-flight limit | run an endless loop or block |
| MetricKit | its own queue | stores payloads (they go through the I/O engine's files) | — |

Every engine is metered: each records its busy time into a lock-protected meter that the overlay shows and the
recorder writes per second. A watchdog pings the main thread every 100 ms from the I/O thread and records the worst lag.
The simulation's parallel work stays deterministic (§2.4: each job writes only its own rows; outboxes merged in serial
order), and one core is enough (the governor can run it serially; the same state hash).

## Consequences
- Adding a system means giving it a line in its engine's budget, not a new thread; the main thread never grows.
- Two dedicated threads (sim, I/O) and one render thread exist for the app's life; they sleep when idle (no polling).
- The engine module stays free of Foundation: `GameHost` takes its executor from outside (`SaneiRuntime` provides the
  dedicated-thread executor).
- M0 proves the threads on the owner's iPhone: the overlay and the recorder show each engine's time, the thread each
  ran on, and the main thread's lag.
