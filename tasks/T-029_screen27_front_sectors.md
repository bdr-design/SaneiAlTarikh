# T-029: Screen 27, the front and its sectors

## The need
The pending-design row (§6.1, «front-sector arrow interaction (own sector highlighted, partner sectors shown read-only)»)
and §5.4 (fronts per war side, split into per-government sectors; each government orders only its own sector, RH-11).
The decision «military» (the owner, 2026-10-20: full control of each army, replacing «automated fronts only») comes
first: the owner's proxy (decisions_log 2026-11-08) redefined the item to fit it.

## Evidence
§5.4 (fronts and sectors, SetSectorOrder), §6.1 pending-design row, §2.5 renderer layers 3 (the amber dashed front line,
≤22 draws) and 4 (fronts and arrows, 3 draws), L6 (static marks), risk row 3 («arrows are static»), D-19 (the enemy as an
estimate), RH-11, the approved screen 14 (the military map: the army's own orders, its tokens and route, the owner's
supervised part, untouched here), screen 9 (the army section), the decision «military», the proxy's answer. The example:
eastern Libya, 10 April 2011, the front between Brega and Ajdabiya south to the desert near Jalu (where it ran in April
2011); in this campaign Egypt (the player) has joined the coalition beside the National Transitional Council: a game
state, not history; the line and the places are real.

## Scope
The front drawn on the map (the line, amber and dashed, static) with its sectors as bands on the coalition's side: the
player's sector highlighted, the partner's read-only with its flag and name; a side sheet in the army section's frame
for the front: the player's sector (its armies, its posture تثبيت | هجوم for armies with no order of their own), the
partner's sector read-only, the enemy facing the front as an estimate. Out of scope: the army's own orders (screen 14),
unit tokens and their movement (the owner's), player-drawn arrows (dropped: lighter, and the army orders cover them).

## Acceptance criteria
1. The map stays central: the front, both sectors and the places named on it are in view, clear of every panel.
2. The player's sector is told apart (its band, its name), the partner's is read-only (no control on it, said so).
3. The posture is one segmented choice (تثبيت | هجوم) for the player's sector only, and says it yields to an army's own
   order; the enemy is an estimate (D-19).
4. A side sheet with the army section's identity, never a dialog over the map; Western digits; correct Arabic counts.
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews, every confirmed
   finding fixed; §5.4 and the pending-design row updated to the decision «military».
