# Cost lines (L12, P2)

Every feature has a line here: what it costs on the phone, on which engine (ADR 0001), and how it is measured. The
measured columns come from the in-app recorder's CSV on the owner's iPhone (§3.8), never from a simulator or a browser.
"—" means not measured yet.

M0 measured on the owner's iPhone 17 Pro Max (iPhone18,2, iOS 27.0.1), 2026-11-09: thermal nominal throughout, about
6.6 GB available and steady. Files: `docs/measurements/m0/` (the recorder CSV, `ring.log`, `device.txt`).

## M0 (the install proof)

| Feature | Engine / thread | Budget | How it is kept | Measured on the iPhone |
|---|---|---|---|---|
| Idle screen | render (`sanei.render`) | 0 frames a second when nothing changes (L1) | CAMetalDisplayLink paused after each requested frame; paused in the background | **0** frames in the 5 idle seconds (render_frames 0, render_idle_frames 0): pass |
| Metal triangle under load | render | encode ≤ 1 ms a frame; hitches 0 a second at 60 Hz | one command buffer a frame, `present` before `commit`, an autorelease pool per callback | — (`render_ms_mean/max`, `render_hitches`: stale refreshes against the requested 60 a second, from the gaps between presented frames (a gap of g sixtieths counts ⌊g + 0.25⌋ − 1, so from 1.75 on; a run at 30 a second reads 30), booked in the second the later frame is presented; `frame_interval_ms_*`). **Measured:** encode 0.107 ms mean, 0.239 ms worst; 3,600 frames in 60 s, **0 hitches**, every interval 16.67 ms: pass |
| Stand-in simulation at top speed | sim (`sanei.sim`: utility, user-initiated at the top speed) | 30 days a second; a day of 16,384 cells ≪ 1 ms | `GameHost.run`: 3 days every 100 ms, sleeping to deadlines on its own thread | **30 days every second** (1,800 in 60 s); a day 0.085 ms mean, 0.272 ms worst, on `sanei.sim/user-initiated`: pass |
| Recorder rows, ring log file, exports, MetricKit files | io (`sanei.io`, utility) | ≤ 5 ms a write; nothing on the main thread | the `IOEngine` actor; bounded: 10 CSVs, 20 payloads, 3 exports | **Over budget, fixed, to re-measure:** 72 operations, the worst 6.17 ms. The ring log's flush every 10 s (an atomic rewrite: a new file and a rename) took 4.6–6.2 ms, 5 of 7 over 5 ms; everything else ≤ 0.2 ms after the first second (2.79 ms). It touched nothing else (main lag 0.12 ms, 0 hitches). Fix: the log file stays open and each flush appends only the new lines, with no sync (`IOEngine.flushLog`); re-measured with the next IPA |
| Main thread | main | its own work ≤ 1 ms; worst lag ≤ 16 ms | touches and finished models only; the overlay refreshes on events, no timer | its own work 0.123 ms worst; **worst lag 0.12 ms**: pass |
| App size | — | IPA ≤ 120 MB; executable ≤ 15 MB, Assets.car ≤ 3 MB, metallib ≤ 0.5 MB | the IPA gate (`tools/checks/ipa_gate.py`) prints every size | CI prints it on each `ios` run |
