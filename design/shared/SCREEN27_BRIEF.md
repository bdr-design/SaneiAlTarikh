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
game state, not history; the line and the places are real; Brega and Ras Lanuf are on the government's side). The
coalition's side has two sectors (RH-11): the coast, facing Brega to south of Ajdabiya, the NTC's; the desert, from south
of Ajdabiya to Jalu, Egypt's.

## The map (central, never covered)
- Placed on the front: the line, both sectors and the front's names in view, clear of every panel and inside the safe
  area (the shared checker's map focus is the front here, not Egypt).
- The front line amber and dashed (§2.5 layer 3); the sectors as bands on the coalition's (east) side, vertex by vertex:
  the player's teal (the player's colour), the partner's white at 0.45; flat ends where they meet; all static (L6).
- The places at the play map's city-label size at any zoom (21 map units at 0.63 H / 390: 13.2 pt on iPhone 14), weight
  600, a 1.25 pt dark halo, dots r 5 at the same size: أجدابيا and جالو east of their dots (the front lies west of them),
  البريقة west of its dot, the dot hollow (held by the other side). Tags at 11.5 pt bold: «قطاعك» in teal and «قطاع
  الحليف» beside their bands, «قوات القذافي» in grey on the other side of the line. Every name 2 pt clear of the line and
  the bands; a name a panel (6 pt around it) or the screen edge would cut is hidden with its dot (رأس لانوف). Egypt's
  play-map names give way.
- The zoom never goes past the engine's maximum 1.0 km/pt (§2.5).
- The open front's line and bands show in any map mode (the chip here stays «الخريطة: سياسية», as on screen 9); the military
  mode (§6.6: control, fronts, sectors) shows every front's line and sectors.
- The HUD's date: «الأحد 10 أبريل 2011»; its alert the day's: «هجوم على أجدابيا» (the government's forces attacked
  Ajdabiya on 9-10 April 2011), the slot at B3's width; the dock's «الجيش» open.

## The sheet (the army section's olive identity)
Header: Egypt's flag, «جبهة شرق ليبيا», «التحالف ضد حكومة القذافي · قطاعان», the front emblem, close («إغلاق، العودة
إلى الخريطة»). One body:
- «قطاعك»: the player's sector told apart (teal outline and fill): Egypt's flag (22 x 16.5), «قطاع الصحراء» · «من جنوب
  أجدابيا إلى جالو · جيشان · 11 تشكيلًا»; «وضع القطاع» · «للجيوش بلا أمر خاص» with two segments (120 pt) تثبيت (chosen) |
  هجوم; note «أمر الجيش الخاص (تقدّم، هجوم، توقّف) له الأولوية على وضع القطاع.»
- «قطاع الحليف»: read-only, no control: the NTC's flag, «قطاع الساحل» · «المجلس الوطني الانتقالي · الوضع: هجوم»,
  «للعرض فقط» (VoiceOver: «قطاع الساحل: قبالة البريقة إلى جنوب أجدابيا، … للعرض فقط»).
- «أمام الجبهة»: the 2011 government's flag, «قوات حكومة القذافي» · «نحو 6 إلى 9 تشكيلات · تقدير» (D-19: an estimate).
The last section is below the fold on the smaller phones (the scroll hint shows).

## Rules
- No red; Western digits; the Arabic counts (جيشان، 11 تشكيلًا، 6 إلى 9 تشكيلات).
- Attack is open here (a war); without a war the posture's «هجوم» is locked as screen 14's attack («لا حرب: يُفتح الهجوم
  عند إعلان الحرب»).

## Cost (the heaviness review, 2026-11-08; design doc §3.9 «The front and its sectors»)
- Drawing: the front line is a layer-3 border style class (amber, dashed by arc length, stencil-once) inside layer 3's ≤22
  draws; the two sector bands are one instanced pass of layer 4 in the slot the dropped arrows leave, so layer 4 keeps its
  3 draws and the total stays ≤50 (§2.5, §3.9). The bands and the sector tags are drawn only for the open front; the play
  map shows only the layer-3 line. One instanced pass however many sectors, the instances capped by L3.
- When: rebuilt only when that front's provinces change controller or its sector allocation version changes, only for
  that front, coalesced to at most one rebuild per snapshot publish; never per frame. The sector allocation runs on the
  simulation engine inside §3.2's «Front execution, sectors and distance fields» 0.20 ms; the line's style flags and the
  band strips are built by the map engine's background buffer task from the published snapshot and uploaded once; the main
  thread does none of it (L14).
- Under «هجوم» the axes of the player's sector are chosen as an AI sector's, inside front execution's 0.20 ms, every 3 days
  per front; the posture change itself is one O(1) command (the pending queue when paused, screen 26).
- The camera: one move on open and one on close, then settling; the new tiles stream under L7 (visible pinned, ≤2 decodes,
  parents meanwhile, tiles under the opaque sheet culled, §3.9); the zoom clamped to the engine's 1.0 km/pt.
- The names: the label set is swapped by one background placement run on open, on close and on a sector change (applied at
  most once per 250 ms, §3.9); new strings shaped once off the main thread into the SDF atlas.
- The sheet's model is built under §3.9's open-panel rule (a background task, ≤4 a second, only on a version change); the
  enemy range changes only at an intelligence refresh (D-19). Nothing ticks.

## Gate
`screen27/A/_build/render.js` uses the shared checker (the army section; its map focus the front) and adds: the line and
both bands wholly on screen in the safe area (with their stroke widths) and under no panel, drawn (visible, strong enough),
at their widths; the line amber and dashed; each band east of the line vertex by vertex, the player's teal, the partner's
told apart, in their places and where the sheet says; enemy-held places hollow; the zoom within 1.0 km/pt; nothing animated; the front's names shown at 11.5, none cut,
under a panel or overlapping, dots with their names, «قطاعك» teal; no unit tokens; the HUD date and its weekday; the
header, emblem and close; the player's sector told apart and read as «قطاعك»; the posture one radio choice of two that
yields to an army's own order; the partner's sector read-only (no control, said so, the NTC's flag); the enemy an
estimated range with the 2011 flag; every group reads what it shows; no red; no dialog. `--selftest` and
`check_screen.py` must pass.
