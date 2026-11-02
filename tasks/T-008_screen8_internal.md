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

## Review: two independent reviewers (2026-11-02)
- **Reviewer A (the checker, the shared library and consistency), 12 findings; reviewer B (renders, realism, Arabic, UX), 11.** All fixed:
  - **The overview fits whole** on every phone (the laws moved out; they are the state panel's and linked where needed), and the shared checker again requires it, as screens 5 and 6 did.
  - **Provinces open their card:** the unrest rows are 44 pt buttons with a chevron.
  - **Realism:** the headline trend +1 (consistent with the provinces'); the opposition's «أخرى 4» and 73 independents; support per actor (the Brotherhood 20%, with why its candidates run as independents); «اضطراب فوق 60»; «الانتخابات» heading; «حركات المعارضة · القوة».
  - **One owner per law:** the emergency law as a link row (and «محدودة منذ 2010» everywhere, changed at the state panel).
  - **VoiceOver:** every named row has a role; trend phrases in full words; movements read as shown with «في صعود»; the bars' labels read their rows.
  - **The shared checker** (used by screens 8 to 12): the overview must fit; bars teal and from the right; white tiles; «لماذا؟» names its subject; colour never alone inside headline numbers; action chips' arrows and their verbs; «دولار»; labels only on elements with a role; 20 more generic plants from screen 6.
  - **This screen's checker:** plants scoped to the tab's body; share bars against their keyed rows; the unrest headline amber; movements' labels as shown; row order; the brief's order of movements and groups.
