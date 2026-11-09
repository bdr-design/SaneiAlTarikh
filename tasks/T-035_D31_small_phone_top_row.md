# T-035: D-31, the small-phone top row

## The need
§9's «Designs needed first» lists D-31 for M1c: «the ordered fallbacks … on phones where the approved row does not fit.
Needs one design approval for the SE and mini variants». §6.3 says the variants that differ from the approved Pro Max
design need approval. The owner approved screen 1 (B3) after seeing all 7 phones (§13: D-31 «Covered»), and the
second-country test (T-024, `secondCountry`) rendered B3 with the longest names; but §6.3's chain (drop trends, 10 pt
values, the date as «12/3/2011») is not the chain B3 implements, and the deepest level (5) was never shown.

## Evidence
`design/screen1/B3/index.html` (`fitTop`: levels 0–5); `tools/stress_names_report.json` (the level each phone reaches
per name set: the SE at 4 with every name, Egypt's included; the mini at 4 with long names; the 16 at 4 with the
longest; level 5 never, with the mock-up's own values: the reviewers showed the reserved widths take the SE to 5); design_doc §6.3, §3.10 (short names), §9 (D-31), §13 (D-31); decisions `ownerDelegation`,
`secondCountry`, `reviewEveryFix`.

## Scope
- `tools/d31_board.js`: renders B3's top row on the 7 phones with Egypt's names, the longest short name and a worst case
  (the longest name with the widest leader and regime), with B3's 2011 values and with each chip at its widest value
  class (the reserved widths of §2.5 and §6.3), at the automatic level; and every level 0–5 forced on the SE and the
  mini (worst case, widest values); measures, per render,
  whether the row fits B3's width and every text node against its part and the row; writes `design/d31/board.html` (the
  strips, a table of levels per phone) and `design/d31/report.json`. Exit 1 on a clip or a row that does not fit at
  any automatic level, a wrong accessible name, or a forced level 5 that does not fit the SE.
- design_doc §6.3: B3's row width, the reserved widths (each chip's widest value class, the date rooms), the fit chain
  as B3 implements and the owner approved (0 the name over «leader · regime», 1 the leader beside the name, 2 the name
  alone, 3 tighter chips (2 pt, an approved exception), 4 the flag alone, 5 the year beside the weekday), where the
  native fit runs (a background job, never the main thread), and the levels each phone reaches with the reserved
  widths; the dropped steps (trend arrows, 10 pt values, «12/3/2011») recorded as not used; §6.2's spacing exception;
  §6.4's nation card.
- Out of scope: changing B3 (approved); the native fit engine (M1c builds it from this record).

## Acceptance criteria
1. The board shows every phone at its automatic level with the three name sets and both value modes, and levels 0–5
   forced on the SE and the mini; no clip at any automatic level; level 5 fits the SE with the widest values and the
   worst names.
2. At flag-only (4, 5) the nation card's accessible name, as the browser computes it, is «الدولة: name، leader،
   regime» (the board checks it); the State panel's header names the country with every name set (the second-country
   test, `tools/stress_names.js`, checks screen 5's header).
3. §6.3 matches B3 exactly; §9 and §13 rows for D-31 updated.
4. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.
