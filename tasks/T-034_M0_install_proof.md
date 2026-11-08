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
