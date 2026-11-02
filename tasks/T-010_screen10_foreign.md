# T-010: Screen 10, the foreign panel («الخارجية») with the UN Security Council

## Goal
The dock's «الخارجية» (§6.5), including the Security Council (the owner's list), in the approved panel look, built with the shared builder and checker.

## Scope
- **In scope:** four tabs (نظرة عامة, العلاقات, المعاهدات, مجلس الأمن), Egypt on 1 January 2011.
- **Out of scope (own items):** one relation's sheet (agreements, aid, arms, sanctions, war and alliances: the next foreign item); a Council vote in progress (a later state, with the event screens).

## Acceptance criteria
1. Same frame as the approved dock panels; identity royal blue on chrome only.
2. One tab body at a time; scrolling with fades and hint; every string shown clear in some view.
3. Influence = the HUD's; relations sorted, signed, with trend arrows; the Council's 2011 membership; state and government recognition separately.
4. Colour never alone; every row and action read whole by VoiceOver.
5. Gate: 0 issues on 7 phones, the self-test catches every plant, `check_screen.py` PASS; two independent read-only reviews with every confirmed finding fixed.

## Evidence
See `design/shared/SCREEN10_BRIEF.md`: the Council's 2011 members (UN), Egypt's terms (1996–97, 2016–17), the NAM chair (2009–12), the Entebbe dispute (May 2010), Egypt–Iran relations cut in 1980, the 1959 Nile agreement, the QIZ and the EU partnership (2004), US aid of about 1.55 مليار $ a year.

## Still assumptions
- The relation values, the counts of good and strained relations, and the action costs are illustrative.
