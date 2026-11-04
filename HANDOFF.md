# Handoff: where the work stands and how to carry on

Written 2026-11-04 at the owner's request («انقلني محادثه جديده بدقه بالكامل») so a new session can continue exactly
where this one stopped. Read this file, then `CLAUDE.md`, `PROCESS.md`, `WORKLOG.md` and `decisions/decisions.json`.

## 1. The project in one paragraph
«صانع التاريخ»: an iPhone grand-strategy game (2011–2100, landscape only, Arabic right to left, native Swift later). We
are still in the **design phase**: every screen is an HTML mockup rendered with Playwright/Chromium at the 7 iPhone sizes
of `design/shared/devices.json`, checked by a per-screen `render.js` and gated by `tools/check_screen.py`. No game code
yet. The technical design is `design_doc/final_design.md`. The owner talks to us in Gulf Arabic; answer in simple Gulf
Arabic with Western digits, and never claim "tested on iPhone" for browser mockups.

## 2. The owner's standing rules (all in `CLAUDE.md` and `decisions/decisions.json`)
- `ownerDelegation`: Claude makes the design calls, approves each finished screen itself (reviewed, fixed, gated), logs
  it, moves it to `main`, shows it to the owner, and goes on without asking. The owner can change anything.
- `finishEverything`: carry on without stopping through every remaining item, then build the game until it is ready.
- Reviewers: subagents are **read-only reviewers only** (Claude does all the work). Every item gets **three**
  independent reviewers, each its own lens: (1) the checker and consistency, (2) what the player sees and does,
  (3) dimensions and the formatting of text and boxes (`layoutReviewer`). Every confirmed finding is fixed before
  approval. The whole game also gets the layout review across all screens.
- `mapCentral` (2026-11-02): the game map stays central and visible; options, decisions and dialogs never cover or dim
  it; they open as side sheets in the panels' frame. The shared checker now enforces this (map undimmed, nothing drawn
  over Egypt).
- `loadSpread`: no heaviness; spread the load across engines (design doc L14, L15, §2.4).
- `military`: full control of each army on the map; generic equipment, no real weapon names. D-13 generic agency
  names; D-14 no assassinations; D-15 smooth unit glide, light.
- Never change a decision without the owner's explicit answer; log every approval in `decisions/decisions_log.txt`.
- The owner generates all AI images; ask for them. Files must not contain AI model identifiers (the commit trailer is
  the only exception).

## 3. Environment and tools
- Repo: `https://github.com/bdr-design/SaneiAlTarikh` (the old name `bdr-design/SaneiAlTarikh-Android` redirects).
  Working branch: `claude/happy-planck-0p74o1`. `main` holds only approved work.
- Playwright: `require('playwright')` works globally in the cloud container (1.48.x); the browser is
  `/opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell` (set `CHROMIUM_PATH` to it). Do not run
  `playwright install`. Elsewhere: `cd tools && npm install`.
- **The font first:** run `tools/install_fonts.sh` in a new container. Every mockup uses IBM Plex Sans Arabic; without it
  Chromium falls back to other fonts and every render, measurement and review is wrong (2026-11-04: a new container had
  no Plex and a whole session rendered in DejaVu). `gate_all.sh` refuses to run without it.
- **Disk:** reviewers copy `design/` to `/tmp/review_tmp/<name>`; delete finished reviewers' folders (one run filled
  the disk and crashed the renders).
- **Gate a screen:** `tools/gate_all.sh screen15/A screen16/A ...` (assemble → render 7 phones → self-test →
  `check_screen.py`; ends with `ALLDONE`). About 10–20 minutes a screen; run it in the background. While it runs it
  rewrites PNGs and reports, so the stop hook keeps asking for commits: commit "renders in progress" and commit again
  when it ends.
- Never edit a screen's sources while its gate is running (the self-test asserts `index.html` = the current
  `assemble.py` output).
- **Reviewer prompt:** `tools/review_template.md` (lenses 1 and 2: replace SCREEN_SPEC with the subject and the lens;
  reviewers return a JSON array). The layout lens prompt is in §7 below.
- **Shared foundation** (most panels are built on it):
  - `design/shared/check/panel_page.py` builds a side sheet on screen 4 A's page (the approved B3 play screen, opaque
    panels): `build(R, S, D, title, sec, dock_label=None, dock_icon=None, tabs, fit_tab, css, symbols, extra_subs)`.
    `dock_label=None` = a sheet of no section (no dock item open); `fit_tab=None` = no body must fit whole.
  - `design/shared/check/panelcheck.js` is the shared checker (`require(...)(cfg)`): every generic rule of the
    approved panels plus `cfg.noTabs` (one body, no tab row), `cfg.dock: null`, `cfg.fitTab: false`, `cfg.skipGeneric`,
    `cfg.cases` (the screen's own plants), `cfg.screenChecks` (a template string run in the page; escape a quote as
    `\\'` and a regex backslash as `\\`).
  - Screens 14 (the military map) has its own standalone checker; 15 and 16 use the shared one.
- **Moving approved screens to `main`:** use a separate worktree at the latest `main` (fetch with explicit refspecs:
  `git fetch origin +refs/heads/main:refs/remotes/origin/main +refs/heads/claude/happy-planck-0p74o1:refs/remotes/origin/claude/happy-planck-0p74o1`),
  check out the branch's files path by path (`git checkout origin/claude/happy-planck-0p74o1 -- <paths>`), one commit for
  the shared base and one commit per approved screen, verify `git diff <branch>` is empty, then
  `git push origin HEAD:refs/heads/main`. `main` and the branch do not share history, so never merge; copy paths.
- Approval record: add a key to `decisions/decisions.json` (`decisions` object; write with indent=1,
  ensure_ascii False), a dated line in `decisions/decisions_log.txt`, and an entry in `WORKLOG.md` (Arabic).

## 4. State at handoff
**On `main` (fe4a4ba):** approved screens 1–3, 4 R (with the details tabs), 5, 6, 7, 8, 9, 10, 11, 12, 13, 14 (the
military map, the D-15 moving prototype with the owner's unit images; the owner may still want to look at the moving
page `design/screen14/A/index.html` without `&t`).

**On the branch only (not yet approved, not on `main`):**
- Screen 15, the decision sheet (`design/screen15/A`, brief `design/shared/SCREEN15_BRIEF.md`, card
  `tasks/T-015_screen15_events.md`): redesigned to `mapCentral` as a side sheet; all three reviews done and every
  finding fixed (latest round: 9 checker findings, 9 player findings, 4 layout findings). Clean on se and i16promax.
- Screen 16, the notification centre (`design/screen16/A`, brief `SCREEN16_BRIEF.md`, card `T-016`): same; all three
  reviews done and fixed; clean on se and i16promax.
- The shared checker gained: one-body sheets, sheets of no section, counts said in words («نقطة واحدة», «نقطتين»),
  text running into a control, one chosen segment, action rows read whole, the map kept undimmed and uncovered, and
  more plants. **Because panelcheck.js changed, screens 8–13 must be re-gated before the next move to `main`.**
- The owner's two new rules (`mapCentral`, `layoutReviewer`) are recorded in `CLAUDE.md`, `decisions.json` and the log.

**Interrupted at handoff (redo them first):**
1. The final gate of screens 8–16 was **stopped midway**, so the renders and reports on the branch are a mix of old
   and new. Run: `tools/gate_all.sh screen15/A screen16/A screen8/A screen9/A screen10/A screen11/A screen12/A screen13/A`
   and fix anything it finds (a new generic rule can flag an older panel).
2. The **whole-game layout review** (lens 3 across every screen) was stopped before it reported. Run it again (prompt
   in §7), fix every confirmed finding, re-gate what changed.
3. Then approve screens 15 and 16 under the delegation, move them and the re-gated 8–13 (and the shared checker) to
   `main`, and tell the owner in Gulf Arabic with a board of renders.

## 5. Remaining work after that (in order)
1. The «لماذا؟» (why) sheet.
2. End screens (victory, defeat, the 2100 end).
3. Map modes (the mode chooser and the modes of §6.6).
4. The markets screen (goods and prices).
5. The relation sheet (foreign), the new-operation sheet (intelligence), the save load/export/delete sheet.
6. Second-country test: Saudi Arabia and a long country name across the panels.
7. Port the checker improvements and VoiceOver labels to screens 4 and 5 (one shared tab rule).
8. Then build the game (native Swift, iOS 17+; the owner has no Mac: GitHub Actions builds an unsigned IPA that the
   owner signs), following `design_doc/final_design.md` and the milestones there.
Postponed by the owner: the menu background image (he will send one ≥ 2868×1320); the NASA bathymetry licence check.
Every new screen: a task card and brief first, build on the shared builder where it fits, the gate, three reviewers,
fix, approve, move to `main`, show the owner.

## 6. Pitfalls met
- Panels from the right only; the map must stay central (owner rule). Decisions and dialogs are sheets, not modals.
- A sheet's text must fit its row on the iPhone 15/16 (852×393: the sheet narrows to 335 to leave room for the dock):
  measure `scrollWidth` before wording; under 1 billion write money in millions («500 مليون $»).
- Arabic counts: use wordings that agree with any number («غير المقروءة: 2») or say one and two in words.
- The stop hook fires on any uncommitted file; gates create files continuously.
- Do not use `rm -rf` with globs after `cd` (blocked); use `git rm` on explicit paths.

## 7. The layout reviewer prompt (lens 3)
Spawn a general-purpose subagent with: "You are an independent, READ-ONLY reviewer for «صانع التاريخ» (HTML mockups,
landscape, Arabic RTL). Never edit files in the repo; scratch only under /tmp/review_tmp/; do not run render.js. Your
one lens: dimensions and the formatting of text and boxes (the owner's rule layoutReviewer): text cut, clipped, badly
wrapped, crowded, misaligned; boxes (rows, cards, chips, tiles, segments, status cells, headline numbers) with uneven
sizes, gaps or paddings, misaligned edges, too small or too empty; the same kind of element drawn differently from screen
to screen; the type scale. Render in memory with Playwright on the 7 phones of design/shared/devices.json:
file:///…/design/<screen>/index.html?w=&h=&side=&bottom=&cutout= plus each screen's parameters (panels &tab=<id>
[&scroll=end]; screen 7 &adjust=tax|line|subsidy|money; screen 14 &t=0|0.5|1, &state=idle), wait for window.__ready,
measure boxes, look at screenshots. Return ONLY a JSON array of {severity, title, where, evidence (numbers in pt), fix},
verified findings only." Name the screens to cover (the whole game: screen1/B3, screen2/B, screen3/p1A p2B p3B,
screen4/R, screen5/A … screen16/A).
