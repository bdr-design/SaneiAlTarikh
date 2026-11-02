# Screen 14 brief: the military map (D-15)

Visual mockup and moving prototype. NOT app code. The build is `../screen14/A`. Task card: `tasks/T-014_screen14_military_map.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## Decisions it follows
- **`military`:** full control of each army on the map, as in «الجنرال | الحرب العالمية»; equipment generic.
- **D-15:** small generic unit tokens with flag and strength, a dashed route to the destination, the token gliding along it; light: only on-screen moving units animate, frames only while something moves, simpler at high speed or when hot.
- **The owner's unit images** (`design/generated/units`, 20 October 2026): tank for the armies, destroyer for the fleet, fighter for the air group; small 3x copies (84 px tall, 15–21 KB) in `screen14/A/units/`. In the game all unit images share one texture atlas, drawn in one pass.

## What it shows (Egypt, 1 January 2011)
- The armies of the military panel at their regions: المنطقة الغربية 4 (Marsa Matruh), المنطقة الشمالية 4 (Alexandria), Cairo's two armies as one stack 6 (المنطقة المركزية 5 and الحرس الجمهوري 1), الجيش الثاني الميداني 7 (the canal), الجيش الثالث الميداني 6 (Suez); الأسطول الشمالي 10 ships off Alexandria; an air group of 24 aircraft at Beni Suef. The Southern Region (Aswan) is off this view.
- The order: the Western Region army from Marsa Matruh down the desert road (one waypoint) to the Siwa oasis near the Libyan border: about 273 km at 40 km a day, «يصل بعد 7 أيام».
- Each unit: the image (28 pt) under a 20 pt tag (flag, strength); the selected one's tag ringed teal. Map labels yield to the units.
- The order bar on the dock's line: flag, name, «4 تشكيلات · إلى سيوة · يصل بعد 7 أيام»; تحرّك (white while under way), هجوم (locked: no war), توقف (white on arrival), نقطة مرور, إغلاق.
- The map zooms to the largest scale at which every unit, the whole route and its marks stay in the safe screen and clear of the panels.

## Views
`&t=0` ordered (the main render), `&t=0.5` under way (the date 4 January, Tuesday; 4 days left), `&t=1` arrived (halt), `&state=idle` nothing selected (the dock back). Without `&t` the page is live: the clock runs, the speed button cycles ×1 ×2 ×5 ×10 أقصى, pause works, tapping a unit selects it.

## Lightness (measured in the live page)
≤30 frames a second while gliding at ×1–×5; at ×10 and «أقصى», and with Reduce Motion, one step per game day (≤10 a second); none at all when nothing moves or when paused.

## Gate
`screen14/A/_build/render.js` (its own checker, with the panels' generic rules) checks the units at their map places, whole and clear, strengths from screen 9's sheet, the images, the route and its marks, the date, the bar (name, line, order in force, attack locked, on the dock's line), VoiceOver, no weapon names, the labels, and the frame counts. `--selftest` and `check_screen.py` must pass.
