# T-024: The second-country test (Saudi Arabia and long names)

## The need
Every screen was designed with Egypt. The game lets the player take any 2011 government (D-29), so the HUD and every
panel must hold another country's names, including the widest, without overflowing or covering a neighbour.

## Evidence
`tools/stress_names.js` renders the pages that name the player's country (the HUD on screen 1 B3; screen 3 p2B's card
and chips; the panels of screens 4 R, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 18 A, 20, 23) on the 7 phones with five name
sets: Egypt (the baseline, which must give 0 issues), Saudi Arabia, the United States, the Central African Republic and
the widest short name («الكونغو الديمقراطية»), each with its leader, regime, leader line, province, currency and flag.
It replaces the country's name in the header, the sub-line and the bodies, and checks: the top row fits; no name, cap,
title or sub-line wraps or overflows; no text runs out of its panel body; the header's controls keep their sizes; a
sub-line may ellipsize at its end only (listed), never a name.

First run (with the first, weaker version of the test): 77 of 294 renders had a header sub-line wider than its box,
and on one more (screen 18 A, 16 Pro Max) the HUD's regime label ran out of its box. The six reviewers then found the
state panel's title wrapping and the mode chip's words breaking out of it, the close button squashed, a sub-line
ellipsis cutting a year to its last digit, Saudi Arabia losing its name in the HUD on the mini, and screen 20's sub-line
losing its words.

## Scope
Shared rules and the test; no new screen. Out of scope: other scripts' names (the game is Arabic only).

## Acceptance criteria
1. The HUD: the nation card drops the leader and regime first, then tightens the indicators with the name shown, then
   keeps the flag alone; a label that runs out of its box or wraps also takes the next level; Egypt's levels unchanged.
2. Panel titles never wrap; the header's controls never shrink; in the state panel the mode chip gives way to its icon.
3. A header sub-line ellipsizes at its end, hiding a number whole; VoiceOver reads it whole.
4. Short names everywhere on screen, bounded by measured width (design doc §3.10); leaders' short forms for their lines.
5. `tools/stress_names.js`: 0 issues on 560 renders (24 sub-lines ellipsized, all with the widest name or the United
   States on screens 6, 7, 10 and 23); the full gate on all 27 screens PASS; six independent read-only reviews, every
   confirmed finding fixed.
