# Screen 27 brief: the front and its sectors

Visual mockup. NOT app code. The build is `../screen27/A`. Task card: `tasks/T-029_screen27_front_sectors.md`. Designed
and approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`
(the proxy's answer of 2026-11-08 in decisions_log.txt).

## The decision first
The owner's decision «military» (2026-10-20): full control of each army (screen 14), replacing «automated fronts only».
So the front's sector is not the player's way of fighting: an army's own order (تقدّم، هجوم، توقّف، نقطة عبور) always
comes first; the sector's posture only covers the armies of the sector that have no order of their own. The three
player-drawn arrows of §5.4 are dropped (lighter; the army orders already say where to attack). The units' tokens, their
route and their glide are screen 14's and the owner's to supervise: not drawn here, unchanged.

## The moment
Eastern Libya, 10 April 2011 (a Sunday): the front between Brega and Ajdabiya, south to the desert near Jalu, where it ran
in April 2011. In this campaign Egypt (the player) has joined the coalition beside the National Transitional Council (a
game state, not history; the line and the places are real). The coalition's side of the front has two sectors (RH-11):
the coast (Brega to Ajdabiya), the NTC's; the desert (Ajdabiya to Jalu), Egypt's.

## The map (central, never covered)
- Placed on the front: the line, both sectors and the front's names in view, clear of every panel and inside the safe
  area (the shared checker's map focus is the front here, not Egypt).
- The front line amber and dashed (§7 layer 3); the sectors as bands on the coalition's (east) side: the player's teal
  (the player's colour), the partner's white at 0.32; all static (L6).
- Names at a constant 11.5 pt whatever the zoom: أجدابيا، البريقة، جالو (places with their dots), «قطاعك» in teal and
  «قطاع الحليف»; a name a panel or the screen edge would cut is hidden with its dot (here بنغازي and on smaller phones
  رأس لانوف). Egypt's play-map names give way.
- The HUD's date: «الأحد 10 أبريل 2011»; the dock's «الجيش» open.

## The sheet (the army section's olive identity)
Header: Egypt's flag, «جبهة شرق ليبيا», «التحالف ضد حكومة القذافي · قطاعان», the front emblem, close («إغلاق، العودة
إلى الخريطة»). One body:
- «قطاعك»: the player's sector told apart (teal outline and fill): Egypt's flag, «قطاع الصحراء» · «من أجدابيا إلى جالو ·
  جيشان · 11 تشكيلًا»; «وضع القطاع» · «للجيوش بلا أمر خاص» with the segments تثبيت (chosen) | هجوم; note «أمر الجيش الخاص
  (تقدّم، هجوم، توقّف) يتقدم على وضع القطاع.»
- «قطاع الحليف»: read-only, no control: the NTC's flag, «قطاع الساحل» · «المجلس الوطني الانتقالي · الوضع: هجوم»,
  «للعرض فقط» (VoiceOver: «… للعرض فقط»).
- «أمام الجبهة»: the 2011 government's flag, «قوات حكومة القذافي» · «نحو 6 إلى 9 تشكيلات · تقدير» (D-19: an estimate).
The last section is below the fold on the smaller phones (the scroll hint shows).

## Rules
- No red; Western digits; the Arabic counts (جيشان، 11 تشكيلًا، 6 إلى 9 تشكيلات).
- Attack is open here (a war); without a war the posture's «هجوم» is locked as screen 14's attack («لا حرب: يُفتح الهجوم
  عند إعلان الحرب»).

## Cost
The line and the bands are static marks of the map engine's layers 3 and 4 (≤3 ms, L6), worked out when the front or an
army's assignment changes (every 3 days at most, with front execution, §5.4), never per frame; no new image atlas. The
names are the label pass's. The sheet is static; a posture change is one command (the queue when paused, screen 26).

## Gate
`screen27/A/_build/render.js` uses the shared checker (the army section; its map focus the front) and adds: the line and
both bands wholly on screen in the safe area and under no panel; the line amber and dashed; the bands on the east side, the
player's teal, the partner's told apart, in their places; nothing animated; the front's names shown at 11.5, none cut,
under a panel or overlapping, dots with their names, «قطاعك» teal; no unit tokens; the HUD date and its weekday; the
header, emblem and close; the player's sector told apart and read as «قطاعك»; the posture one radio choice of two that
yields to an army's own order; the partner's sector read-only (no control, said so, the NTC's flag); the enemy an
estimated range with the 2011 flag; every group reads what it shows; no red; no dialog. `--selftest` and
`check_screen.py` must pass.
