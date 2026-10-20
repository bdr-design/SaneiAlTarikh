# T-003: Screen 4, province panel: design variants for the owner to choose

## Request
- The owner approved moving on to the next screen. They decide everything visually, one design at a time («تصميم تصميم»).
- This step only produces 3 different variants on the iPhone 17 Pro Max and SE for the owner to choose from.
- Fitting the chosen one to all 7 devices is a later step.

## Evidence
- Design document §6.5: side sheet from the right, width clamp(42%, 340, 440), at most 3 headline numbers with «لماذا؟», then grouped levers, then action rows with cost and an effect preview.
- §4.6: what each province holds:
  - population
  - urban share
  - groups
  - GDP share
  - infrastructure 0–10
  - unrest offset
  - the five status fields
- D-3 (confirmed): opaque panels.

## Still assumptions
- That the owner wants the panel to cover part of the map rather than replace the HUD.
- The illustrative numbers for Cairo. These are not data; the pipeline fills them later.

## Scope
- **In:** `design/screen4/{A,B,C}` and the brief `design/shared/SCREEN4_BRIEF.md`.
- **Out:** approved screens 1–3. They are not changed; the opaque HUD in these mockups lives only inside screen 4's own files.

## Acceptance criteria
1. Each variant renders on i16promax and se.
2. Each variant's `_build/report.json` shows 0 issues on both devices.
3. Every item in brief §Content is present. On the 17 Pro Max, the header, status, headline numbers and first action show without scrolling.
4. Cairo and the Nile delta are not covered on either device.
5. An independent reviewer looked at each variant. Every confirmed must or should finding is fixed, or rejected with evidence.
6. I look at all 6 renders myself before showing the owner.

## Organisation
- **Workflow:**
  - 3 designers in parallel. Each owns only its own folder, so there is no file overlap.
  - 1 independent reviewer per variant. Lesson from T-001: one reviewer is enough for a design that has not been chosen yet.
  - A fixer only when there are confirmed findings.
- Each variant explores a genuinely different layout, so the owner has a real choice.

## Risks
- Too much content for a 349 pt panel on the SE. That calls for prioritising, not for type smaller than the tokens.
- Variants that look too similar give the owner no real choice.
