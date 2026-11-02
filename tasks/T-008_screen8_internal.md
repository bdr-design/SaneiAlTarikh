# T-008: Screen 8, the internal and politics panel («الداخلية والسياسة»)

## Goal
The full build of the dock's «الداخلية والسياسة» (design doc §6.5: population, the unrest list worst first, movements, parties, elections, coalitions, interest groups, the emergency regions per province), in the approved panel look, built with the shared builder and checker so it cannot drift from screens 5 and 6. Under the owner's delegation and the instruction to finish everything (`finishEverything`), Claude designs it, has it reviewed by two independent read-only reviewers, fixes every confirmed finding, approves it and moves it to `main`.

## Scope
- **In scope:** four tabs (نظرة عامة, الاضطرابات, الأحزاب, الحركات), Egypt on 1 January 2011.
- **Out of scope:** elections in progress and results (a later state of this panel, with the event screens); coalition building (no coalition exists in Egypt in 2011; the row appears when parties can form one); the national laws (الدولة › السياسات).

## Acceptance criteria
1. Same frame as the approved dock panels (sheet geometry, dock, HUD, opaque, fit level, identity violet on chrome only).
2. One tab body at a time, a VoiceOver tab list; each long tab scrolls with the fades and the hint in its strip; every string shown clear in some view.
3. The numbers agree with each other and with the approved panels (Cairo 64; average 45 over 29; 3 above 60; 518 seats with the NDP's 420; the laws as the state panel sets them).
4. Colour never alone; every action and link row, every unrest and satisfaction row and every movement has a VoiceOver phrase with its numbers.
5. Gate: 0 issues on 7 phones, the self-test catches every plant, `check_screen.py` PASS; two independent read-only reviews with every confirmed finding fixed.

## Evidence
See `design/shared/SCREEN8_BRIEF.md` («Evidence»).

## Still assumptions
- The population figure and the unrest values are illustrative, with the right order and pattern; the engine's seed (§5.2, `unrest_seed.csv`) will set them.
- The costs of the two actions (political capital 20 and 15) are illustrative, in the range of screen 5's decisions.
