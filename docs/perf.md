# Cost lines (L12, P2)

Every feature has a line here: what it costs on the phone, on which engine (ADR 0001), and how it is measured. The
measured columns come from the in-app recorder's CSV on the owner's iPhone (§3.8), never from a simulator or a browser.
"—" means not measured yet.

## M0 (the install proof)

| Feature | Engine / thread | Budget | How it is kept | Measured on the iPhone |
|---|---|---|---|---|
| Idle screen | render (`sanei.render`) | 0 frames a second when nothing changes (L1) | CAMetalDisplayLink paused after each requested frame; paused in the background | — (CSV `render_idle_frames` over the 5 idle seconds) |
| Metal triangle under load | render | encode ≤ 1 ms a frame; hitches 0 a second at 60 Hz | one command buffer a frame, `present` before `commit`, an autorelease pool per callback | — (`render_ms_mean/max`, `render_hitches`: stale refreshes against the requested 60 a second, from the gaps between presented frames (a gap of g sixtieths counts ⌊g + 0.25⌋ − 1, so from 1.75 on; a run at 30 a second reads 30), booked in the second the later frame is presented; `frame_interval_ms_*`) |
| Stand-in simulation at top speed | sim (`sanei.sim`: utility, user-initiated at the top speed) | 30 days a second; a day of 16,384 cells ≪ 1 ms | `GameHost.run`: 3 days every 100 ms, sleeping to deadlines on its own thread | — (`sim_days`, `sim_ms_*`) |
| Recorder rows, ring log file, exports, MetricKit files | io (`sanei.io`, utility) | ≤ 5 ms a write; nothing on the main thread | the `IOEngine` actor; bounded: 10 CSVs, 20 payloads, 3 exports | — (`io_count`, `io_ms_max`) |
| Main thread | main | its own work ≤ 1 ms; worst lag ≤ 16 ms | touches and finished models only; the overlay refreshes on events, no timer | — (`main_ms_max`, `main_lag_ms_max`) |
| App size | — | IPA ≤ 120 MB; executable ≤ 15 MB, Assets.car ≤ 3 MB, metallib ≤ 0.5 MB | the IPA gate (`tools/checks/ipa_gate.py`) prints every size | CI prints it on each `ios` run |
