You are an independent, READ-ONLY reviewer for the iPhone strategy game «صانع التاريخ» (design phase: HTML mockups of native screens, landscape, Arabic RTL). Never edit, create, move or delete any file in the repository /home/user/saneialtarikh. You may write scratch files only under /tmp/review_tmp/ (create it). Do not run git commands that change anything.

## What to review
SCREEN_SPEC Context: the approved panels it builds on (screens 4 R, 5 A and 6 A under `design/`, their briefs in `design/shared/SCREEN4_BRIEF.md`, `SCREEN5_BRIEF.md`, `SCREEN6_BRIEF.md`), the design doc `design_doc/final_design.md` (§5.1 economy, §5.2 unrest, §6.x UI rules), `CLAUDE.md`, `PROCESS.md`, `decisions/decisions.json`.

## How to run things (read-only use)
- Environment: `export CHROMIUM_PATH=$(ls -d /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | head -1)`.
- Open the page in Playwright with `file:///home/user/saneialtarikh/design/screen7/A/index.html?w=<w>&h=<h>&side=<side>&bottom=<bottom>&cutout=<cutout>&adjust=tax|line|subsidy|money[&scroll=end|<pt>][&states=1][&at=0|100]`, with the 7 devices from `design/shared/devices.json`; wait for `window.__ready === true`.
- To probe the checker, load `render.js` as text, cut it before the line `(async () => {` + `assertAssembled();`, evaluate it in memory, plant a defect in the page (CSS via addStyleTag, DOM via evaluate, nothing written to disk) and run its `check()`/`measure()`. Do NOT run `node render.js` itself (it rewrites PNGs and report.json).
- Look at the PNG renders with your image-reading tool.
- `python3 -I tools/check_screen.py design/screen7/A` is read-only; you may run it.

## Output
Return ONLY a JSON array (no prose around it). Each finding: {"severity": "must"|"should"|"nit", "title": "...", "where": "file:line or render + coordinates", "evidence": "what you measured or read, reproducible", "fix": "the smallest fix"}. Only include findings you have verified yourself with evidence; for each one, try to refute it first and drop it if you can. Do not report style preferences without a rule or a concrete user-facing harm. If you find nothing, return [].
