# T-022: Screen 22, the new-operation sheet

## The need
§5.6: full espionage, nine operation types, targets by government or actor, no assassinations (D-14). The intelligence
panel (screen 11) lists the types and suggests one; the player needs a sheet to set one up and start it.

## Evidence
`design_doc/final_design.md` §5.6; decision D-14 (no assassinations) and D-13 (generic agency names); screen 11's types,
its Sudan row (network 7 of 10, exposure low), its suggestion (gather intelligence in Sudan, 60 million $, 3 months, low
risk) and its slots (2 of 4 running). Values illustrative.

## Scope
A side sheet in the intelligence section (identity, dock item open), the map central. Out of scope: the target chooser
(a list, the same rows as screen 11's networks), the other types' own options.

## Acceptance criteria
1. The nine types as screen 11's list and order, none an assassination; exactly one chosen, white; a radio group.
2. The target and its network and exposure as screen 11's row; the duration one choice (3 months).
3. The estimate: cost, effect, success, exposure; cost and risk as screen 11's suggestion; its error said.
4. Starting takes the next slot (3 of 4) at that cost, and says its effect.
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews (checker, player,
   layout here; boxes and type, heaviness and errors in the whole-game reviews), every confirmed
   finding fixed.
