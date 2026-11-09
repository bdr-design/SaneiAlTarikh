# T-033: Screen 30, the start tour (onboarding)

## The need
The pending-design list (§6.1) names «onboarding»; M8 lists it; the cut list (§12, item 5) calls its parts «onboarding
cards». A new player meets a dense HUD (six indicators, eight sections, time controls, news) with no guide.

## Evidence
design_doc/final_design.md §6.1, M8 and the cut list; the approved screens 1 (B3: the HUD, the speed menu), 3 (new game),
4 and 28 (province and country cards), 13 (help in «المزيد»), 15 (decisions stop time), 17 («لماذا؟»), 26 (orders while
paused); the owner's rules mapCentral and sheetIdentity; section_identity.css (the identity colours, measured).

## Scope
A side sheet in «المزيد»'s frame, opening paused at a new campaign and from help: five steps, each a short text and the HUD
element it speaks about ringed; skip and start. Out of scope: the help screen itself, tooltips elsewhere.

## Acceptance criteria
1. The map stays central and undimmed; the ring is an outline on a HUD element, never over the map.
2. Five steps in order, each naming its subject; the texts agree with the HUD (indicators, sections, speeds, the first decision).
3. One primary per step («التالي» naming the next, the last «ابدأ الحملة»); skip and close end it and say where it stays.
4. The game is shown paused; Western digits; correct Arabic.
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews, every confirmed
   finding fixed; a verification review.
