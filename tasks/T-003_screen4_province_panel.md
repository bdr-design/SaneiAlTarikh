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

## Status (2026-10-20)
- **Designs A, B, C:** done by the designers. Each had one independent review.
- **Fixes:**
  - **A:** the fixer had applied the two must findings before it stopped: the dock stays in place, and the «عام» tab became «السياسة». I checked the renders myself.
  - **B:** I fixed it myself.
    - The 12 px fades let a cut text line show, above the pinned action and at the bottom edge on the SE. The drawn fades are now 24 px, so no line shows cut. The pin layout keeps its 12 px reserve, because the checker caught that widening it un-pinned the action on the 17 Pro Max.
    - Status cells went from 32 to 36 pt.
  - **C:** I fixed it myself. In the expanded sheet the actions now come before the details, so the first action shows without scrolling.
- **Automatic checks:** each variant reports 0 issues on i16promax and se (C also in its expanded renders). I looked at all the renders.
- **Deferred to the chosen variant** (fitting stage, with an independent review):
  - checker gaps the reviewers found: in-card overlap, brief-wording checks, a hidden dock passing silently;
  - the disputed-province status layout;
  - the mini overflow in C;
  - map labels cut under the HUD in B and C, where labels are baked into the overlay image.
- **Process change (owner, 2026-10-20):** Claude executes; subagents only review. The workflow fixers were stopped by the owner's interruption, and the rest was done by me.
- **Evaluation (rule 11):**
  - The designs plus reviews took about 1.5 hours with 2 agents at a time.
  - The reviews found real defects in all 3 variants (A: 2 must; B: 4 should; C: 1 must).
  - Reviewing unchosen variants is the waste to remove: from now on, review only after the owner chooses.

## Style rounds (2026-10-20)
- **Rejected by the owner:** themes 1–7 (`design/proposals/S4_styles`), 8–10 (`S4_v2`), 11 (`S4_v3`). Their words: not modern, cartoonish, crowded, too dark, too small, no feeling of running a state.
- **The owner's reference:** two images they generated, an overview and the details' governance tab.
- **Proposal built from them:** `design/proposals/S4_ref` (assembled from variant A by `_build/assemble.py`; renders `i16promax.png`, `i16promax_govern.png`, `i16promax_govern_end.png`).
  - Kept from the approved work: the dark HUD, Western digits, USD (D-6).
  - The dock moves to the left of the panel wherever it fits, so the panel runs down to the dock line.
  - The owner's image is 16:9; the iPhone is wider and shorter. The overview fits on the 16 / 17 Pro Max; the governance tab scrolls 126 pt inside the panel.
  - The render checker reports 0 cut or overlapping texts on i16promax in all three renders.
  - Waiting for the owner's verdict. Fitting all 7 devices, the independent review and the gate come after approval.

## Approval, fitting and review (2026-10-20)
- **Owner:**
  - «لابد التركيز يكون الخريطة هي مركز الاساس»: the panel became two steps, a 320 pt card first, then the full-height details.
  - «ممتاز»: approved.
- **Fitting:** all 7 iPhones, in 3 views: the card, the details, and the details scrolled to the end.
- **Independent review:**
  - 4 read-only reviewers, one lens each: fidelity, visual, gate, and lightness / realism / Arabic.
  - One skeptic per finding tried to refute it.
  - Result: 45 findings; 26 confirmed (1 must, 12 should, 13 nit) and 19 refuted.
  - All 26 were fixed by Claude. Fixes in the design:
    - hairlines between the «الحكم» sections;
    - crane and plain-shield icons as in the image;
    - blue-outlined action buttons with cyan text, and «لماذا؟» in cyan;
    - the details keep the card's 56 pt header;
    - 12 pt under the last card, 8 pt under the card's last row;
    - Cairo without the square outline at the country zoom;
    - labels squeezed between a panel and the screen edge are hidden;
    - «البنية التحتية» on both steps;
    - the old comparison overview removed.
  - Fixes in the gate:
    - The must: the "brief text visible" check could never fail. It now checks the deepest element holding each string, and the details must be reachable by scrolling.
    - Fades are trusted only when the computed mask fades that edge.
    - Opacity counts in visibility, panels and contrast. Contrast is now measured per pixel.
    - RTL order is checked in the details too.
    - The loosest fit level is enforced.
    - Hit boxes are clipped by every clipping ancestor.
    - A scroll hint is required at a bottom edge that hides content.
    - The report and the self-test carry an input hash. `check_screen.py` refuses a stale report or a failing self-test (screens 1–3 still PASS).
- **Gate:** the checker reports 0 issues on 7 phones × 3 views. The self-test catches all 46 planted defects. `check_screen.py design/screen4/R`: PASS.
- **Engine follow-up:** governor, development priority and tax burden are recorded in `final_design.md` §6.1.
- **Evaluation (rule 11):**
  - The review took about 56 minutes with 49 agents and found real defects the gate had passed (1 must, 7 gate gaps).
  - The fidelity reviewer's pixel comparison against the owner's image was the most useful.
  - 19 refuted findings would have been wasted fixes. The skeptic step paid for itself.
