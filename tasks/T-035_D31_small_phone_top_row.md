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
longest; level 5 never); design_doc §6.3, §3.10 (short names), §9 (D-31), §13 (D-31); decisions `ownerDelegation`,
`secondCountry`, `reviewEveryFix`.

## Scope
- `tools/d31_board.js`: renders B3's top row on the 7 phones with Egypt's names and the longest short name (the
  automatic level), and every level 0–5 forced on the SE and the mini with the longest name; measures, per render,
  whether the row fits the safe width and whether any name, value or date clips; writes `design/d31/board.html` (the
  strips side by side, each with its phone, set, level and fit) and `design/d31/report.json`. Exit 1 on a clip at the
  automatic level, or on a forced level 5 that does not fit the SE.
- design_doc §6.3: the fit chain as B3 implements and the owner approved (1 the regime under the name, 2 the name
  alone, 3 tighter indicator padding, 4 the flag alone with the name in the State panel header and in the card's
  VoiceOver label, 5 the year beside the weekday, the date's room kept), with the levels each phone reaches; the
  dropped steps (trend arrows, 10 pt values, «12/3/2011») recorded as not used.
- Out of scope: changing B3 (approved); the native fit engine (M1c builds it from this record).

## Acceptance criteria
1. The board shows every phone at its automatic level with Egypt and the longest name, and levels 0–5 forced on the
   SE and the mini; no clip at any automatic level; level 5 fits the SE with the longest name.
2. At flag-only (4, 5) the nation card still reads the country, leader and regime to VoiceOver, and the State panel
   header names the country.
3. §6.3 matches B3 exactly; §9 and §13 rows for D-31 updated.
4. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.
