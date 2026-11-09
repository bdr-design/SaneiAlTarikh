# T-034: M0, the install proof

## The need
The owner started the build (2026-11-08, «ابدا ببناء اللعبة مع الوكلاء الان بدقه»; decisions.json `buildStart`). §9's
first milestone, M0, proves the whole path from code to the owner's iPhone before any game system is built: «Repo, CI
skeleton, XcodeGen, unsigned IPA, an Arabic right-to-left landscape screen, a Metal triangle, the overlay, ring log,
diagnostics export, 60 s recorder, the Documents saves folder». Exit: «The user signs and installs; the recorder CSV and
log reach the PR».

## Evidence
design_doc/final_design.md §2.1 (layout), §2.2 (modules), §2.8 (project.yml essentials, workflows, IPA gate), §3 (L1
display link idle, L6 redraw on change), §9 (M0); decisions.json `install` (the owner has a signing certificate and no
Mac; GitHub Actions builds an unsigned IPA), `repository` (D-1: this public repository), `buildStart`. Hypotheses: the
CI runner labels and the Xcode version on GitHub's macOS image (checked on the first run); Swift 6 strict concurrency
with the iOS SDK's annotations (checked by the build).

## Scope
- `Package.swift` (swift-tools 6.0, Swift 6 mode) with `SaneiCore` (its first type: `RingBuffer`) and its tests.
- `App/project.yml` (XcodeGen 2.46.0; the `.xcodeproj` is never committed) with §2.8's Info.plist keys, iOS 17, iPhone
  only, arm64, no entitlements, a fixed bundle ID `com.bdrdesign.SaneiAlTarikh`.
- The app: one Arabic right-to-left landscape screen (system Arabic font) with a Metal triangle drawn once (redraw only on
  change), an overlay (device, iOS, thermal state, memory, the last recording), the 60 s recorder (frame times, hitches,
  thermal state, battery, memory: a CSV), the ring log (the last 2,000 lines, kept on disk), the diagnostics export
  (the log, the CSVs, MetricKit payloads and a device summary, shared through the share sheet and visible in Files), and
  the Documents `Saves` folder made on launch.
- `.github/workflows/ci-linux.yml` (build with warnings as errors, tests, hygiene) and `ios.yml` (manual dispatch: XcodeGen,
  Release build with `CODE_SIGNING_ALLOWED=NO`, the IPA, the IPA gate of §2.8 for what M0 has, upload).
- Out of scope: content, packs, the engine, the map (M0b), the design gate, SwiftLint and the other hygiene checks of
  later milestones. A placeholder icon (the owner's art comes later).

## Acceptance criteria
1. `ci-linux.yml` green: `swift build` with warnings as errors and `swift test` on Linux; no `.xcodeproj` in the tree.
2. `ios.yml` green on GitHub's macOS runner: an unsigned IPA artifact; the IPA gate passes: arm64; MinimumOSVersion 17.0;
   UIDeviceFamily [1]; landscape only; CADisableMinimumFrameDurationOnPhone and ITSAppUsesNonExemptEncryption set;
   UIFileSharingEnabled and LSSupportsOpeningDocumentsInPlace; CFBundleDevelopmentRegion ar; the icon and Assets.car;
   default.metallib; ar.lproj; Frameworks empty; size ≤ 120 MB (the 25 MB floor waits for the packs, M0b).
3. The screen is Arabic, right to left, landscape; the triangle is drawn by Metal; the display link is idle when nothing
   changes (L1, L6).
4. The owner signs and installs it on the iPhone; the recorder's CSV and the ring log come back through the diagnostics
   export.
5. Six independent read-only reviews of the code; every confirmed finding fixed; a verification review.

## Test and risks
Linux tests for `RingBuffer`; the iOS build and the IPA gate in CI; the device check is the owner's (never claimed from a
simulator or a browser). Risks: the runner image and Xcode version; Swift 6 concurrency errors found only by the macOS
build (each fixed at its cause, never by turning the language mode down without a recorded reason).

## Recorded choices and deviations (after the six reviews, 2026-11-08)
- Runner: `macos-15` with Xcode 26.3 selected (§2.8 names macos-26; the macos-15 image carries Xcode 26.3, which the
  build needs, and the label change is not needed for it). `ios.yml` is manual only; tagged releases and a schedule wait
  for M5 (the owner dispatches it). The XcodeGen zip is checked by its SHA-256.
- The app is built only by `ios.yml` (no push trigger): every change to `App/**` is dispatched before it reaches `main`.
  Simulator tests and an on-device determinism comparison (Linux hash against iPhone hash) wait for M1a, when there is a
  real engine; M0 holds a golden hash test on Linux.
- The overlay stays visible in M0 (the install proof is its screen); from M1 it hides behind a gesture. It is
  event-driven: no timer.
- Labels avoid counted words (a number beside a unit or a label: «المدة 65 ث», «الملفات (4)») until GameFormatter brings
  the Arabic counted forms (§6.11).
- The recorder records 5 idle seconds (render must draw 0 frames: L1) and 60 loaded seconds (render every refresh, the
  simulation at 30 days a second through `GameHost.run`). Hitches come from presented times (`addPresentedHandler`).
- `SaneiRuntime` (Foundation; the dedicated-thread executor and the engine meter) joins §2.1 and §2.2; App/Platform and
  App/MapRenderer may import it.
- The install steps for the owner: `docs/install.md`. M0's measured costs: `docs/perf.md`.

## After the verification reviews (2026-11-08, `reviewEveryFix`)
- The simulation's thread is utility and raises itself to user-initiated while it runs at the top speed
  (`DedicatedThreadExecutor.setQoS`, §2.4); on Linux the call is a no-op. On the iPhone the thread names itself after
  its class («sanei.sim/user-initiated»), so the recorder's `sim_thread` column proves the raise.
- The CI's import and literal checks read each file with trailing `//` comments cut and statements split at `;`; known
  gaps (until a Swift-syntax check, M1a): an import split over two lines, a `//` inside a string literal, and
  `Duration / Duration`, which returns a Double with no keyword or literal.
- The ring log's file is written at launch (after the folders), at the start of a recording, at its idle/load switch,
  every 10 s while it runs, after it, after an export and on background: not a line-by-line mirror (§3.8's 1 MB file
  waits for the real log volume, M1a). A crash report itself comes from MetricKit; the dSYM is kept with each IPA.
- Hitches count each stale refresh once against the requested 60 a second, from presentation times alone: a gap of g
  sixtieths between two presented frames counts floor(g + 0.25) - 1 (from 1.75 on, clear of a ProMotion half-step),
  whatever caused it (a skipped refresh, a late callback, a GPU-late or dropped frame), so a run at 30 a second reads
  30 a second; booked when the later frame's presented handler runs (about two refreshes after encoding); the last
  second's frames in flight are not booked.
- The CSV has no CPU time and no `phys_footprint` yet (free memory only); both join the recorder with M0b's map test.
- ci-linux also runs on pushes to `claude/**` branches: the work is checked before a pull request exists (the owner
  reviews on GitHub's app); the concurrency group cancels superseded runs.
- App/Platform's recorder drives the render engine through its control calls, and App/MapRenderer logs through
  Platform's ring log (§2.2's rows say so); CI fails if either reaches the engine (`SaneiEngine`, `GameHost`).

## Measured on the owner's iPhone (2026-11-09)
The owner installed the IPA from `main` (ios run 42544253797) on an iPhone 17 Pro Max (iPhone18,2, iOS 27.0.1) and sent
the recorder CSV, `ring.log` and `device.txt` (kept in `docs/measurements/m0/`; the numbers in `docs/perf.md`):
- Idle: 0 frames in the 5 idle seconds (L1). Load: 3,600 frames in 60 s, 0 hitches, every interval 16.67 ms; encode
  0.107 ms mean, 0.239 ms worst (budget 1 ms).
- Simulation: 1,800 days in 60 s (30 a second), a day 0.085 ms mean, 0.272 ms worst, on «sanei.sim/user-initiated»: the
  QoS raise is proven on the device.
- Main thread: its own work 0.123 ms worst, worst lag 0.12 ms. Thermal nominal; free memory steady near 6.6 GB.
- Every engine ran on its own thread (render, sim, io, main), as the CSV's thread columns show.
- **Over budget:** I/O, worst 6.17 ms against 5 ms a write: the ring log's atomic rewrite every 10 s (4.6–6.2 ms, 5 of 7).
  It disturbed nothing (no hitch, main lag 0.12 ms), but the budget is the budget. Fix: `IOEngine.flushLog` keeps the
  file open and appends only the new lines, with no sync (an app crash keeps them; a power loss may lose the last
  seconds, as before with no fsync guarantee), cut back in place past 512 KB. Re-measured with the next IPA (M0b's
  device test needs one anyway); until then M0's exit stands on every other line, with this one fixed and unmeasured.
