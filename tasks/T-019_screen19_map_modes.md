# T-019: Screen 19, the map modes

## The need
§6.6: 13 map modes, all translucent over the satellite base (alpha 0.35–0.55, palettes safe for colour-blind players),
and a chooser with toggles for de facto/de jure borders, province borders and label density. The HUD's map-mode button
(«الخريطة: سياسية») opens it.

## Evidence
`design_doc/final_design.md` §6.4 (the map-mode button), §6.6 (the modes), §5.2 (unrest thresholds 40/60/75); screen 8's
governorate unrest (Cairo 64 … North Sinai 49, «21 محافظة أخرى بين 32 و48»); the owner's rule `mapCentral`.

## Goal, scope
The chooser as a side sheet in the panels' frame (never a popover over the map), applying the chosen mode at once while it
stays open, so the map changes beside it; one mode drawn for real («الأمن»: unrest per province) from Natural Earth admin-1
with `tools/mapmode.py`. Out of scope: drawing the other 12 modes (each gets its layer when built; same tool and rules).

## Acceptance criteria
1. The 13 modes in the doc's order, a radio group, exactly one chosen, filled white; the header, the HUD button and its
   VoiceOver name it; the left column stays in place.
2. The layer between the satellite base and the borders; fill-opacity in 0.35–0.55; only the legend's five colours;
   lightness only rising (colour-blind safe); Egypt's governorates as screen 8.
3. The legend: the five bands right to left, the edges 0 25 40 60 75 100 with the thresholds named, read whole.
4. The three display options, one choice each.
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; three independent read-only reviews, every confirmed
   finding fixed.
