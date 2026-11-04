# T-018: Screen 18, the end screens

## The need
§5.11's end conditions: 31 Dec 2100 → «تقرير الأمة» (the nation report: 5 equal pillars in constant 2011 USD, from the
campaign-start baseline; off when cheats were used); nuclear rung 5 → a sober text screen; the player's government
dissolved → continue in exile, or as the successor government if one exists, or the campaign ends. Milestones: the 2100
screen in M6, the nuclear screen in M4.

## Evidence
`design_doc/final_design.md` §5.11, D-24 (the campaign ends at 2100), decisions `nuclear`, `endDate`, `electionLoss`
(an election loss is not an end: play on in opposition). The five pillars are not named in the doc: a design call
under `ownerDelegation` (below), logged, the owner can change it.

## The pillars (design call)
الاقتصاد (income per person, constant 2011 $) · المعيشة (life expectancy and living standard) · الاستقرار
(stability and legitimacy) · السيادة والأمن (territory held, wars) · المكانة الدولية (influence). Each 0–100 against
the 2011 baseline; the score is their mean.

## Scope and what to protect
Three variants, each a side sheet in the approved panel frame (shared builder and checker), the map central and visible
(mapCentral: an end is still a sheet, never a cover): A the 2100 report, B the nuclear end, C the government dissolved
with a successor. Protected: the approved HUD, tokens, panels. Out of scope: the exile case (play simply continues),
the opposition screens (D-9, own item).

## Acceptance criteria
1. A: header «تقرير الأمة», the result, the 2011 baseline and the change; the five pillars in words, each with its
   2011 → 2100 measure and its score; the score = the mean of the pillars, the change = the score − the baseline,
   exactly; money in constant 2011 dollars said so; the cheat rule said; what next (new game, the map in 2100).
2. B: sober and neutral: no score, no image, no drama words, no countries named; what the player can do (load the last
   save before the escalation, new game).
3. C: what happened, in a sentence; the choice: continue as the successor, or end and see the report; the default
   none (the game waits, paused).
4. Every variant: the clock stopped; the HUD as approved; no dock item open; VoiceOver reads every row whole.
5. Gate: 0 issues on 7 phones, the self-test catches every plant, `check_screen.py` PASS; three independent read-only
   reviews (checker and consistency; what the player sees; dimensions and the formatting of text and boxes), every
   confirmed finding fixed.
