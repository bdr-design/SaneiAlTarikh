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

## Review: two independent reviewers (2026-11-02)
- **Reviewer A (the checker and consistency), 8 findings; reviewer B (renders, realism, Arabic, UX), 10.** All fixed:
  - **Relations open:** each is a 44 pt button with a chevron; steady relations carry no arrow (the flat bar read as a second minus); labels read the whole row.
  - **Realism:** Algeria (the 2009 football crisis) and Syria added, so three relations sit below −40 as the overview says; the Organisation of the Islamic Conference by its 2011 name; the Union for the Mediterranean co-presidency and COMESA; the QIZ's Israeli content; technical aid to Africa; aid split (1.3 of the 1.6 military); «أقرب عضوية: 2016–2017»; the UN action named, with its outcome on its chip and its partners read.
  - **The checker:** every label paired with its value (swaps fail); relations against the brief (names, standings, values); «سالب» both ways; influence's rise blue with its arrow; the lobbying partners read; the shared rule that every row reads all it shows.
