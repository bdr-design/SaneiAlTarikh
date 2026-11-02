# T-009: Screen 9, the military panel («الجيش»)

## Goal
The dock's «الجيش» panel (design doc §6.5: fronts and orders, armies, forces and production, conscription shown, air, fleets, wars and peace, nuclear posture), in the approved panel look, built with the shared builder and checker, following the owner's `military` decision (full control of each army on the map; generic equipment).

## Scope
- **In scope:** four tabs (نظرة عامة, القوات, المعدات, الحروب) for Egypt on 1 January 2011, at peace.
- **Out of scope (own items):** the map's unit tokens and their movement (D-15: a moving prototype, next); a war in progress (fronts, sectors, combat): a later state of this panel with the war screens; declaring war (the foreign section).

## Acceptance criteria
1. Same frame as the approved dock panels; identity olive on chrome only.
2. One tab body at a time, a tab list; long tabs scroll with the fades and the hint; every string shown clear in some view.
3. Numbers agree: formations 72 = the armies' sum, within the quota 94; the budget = screen 6's defence line; conscription = screen 5's law; the guard = the province panel's 95%; the stock = its categories.
4. Equipment generic: no real weapon or model name, in text or VoiceOver.
5. Colour never alone; every row and action read whole by VoiceOver with its numbers and «دولار».
6. Gate: 0 issues on 7 phones, the self-test catches every plant, `check_screen.py` PASS; two independent read-only reviews with every confirmed finding fixed.

## Still assumptions
- The armies' formation counts, the organization levels and the equipment values are illustrative; the engine's seed (§5.4: WMEAT, DoD/CRS templates) will set them.
- The mobilization's cost (150 مليون $ a month) and the fighter order's +10 modern share are illustrative.
