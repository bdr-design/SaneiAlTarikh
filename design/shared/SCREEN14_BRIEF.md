# Screen 14 brief: the military map (D-15)

Visual mockup and moving prototype. NOT app code. The build is `../screen14/A`. Task card: `tasks/T-014_screen14_military_map.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## Decisions it follows
- **`military`:** full control of each army on the map, as in «الجنرال | الحرب العالمية»; equipment generic.
- **D-15:** small generic unit tokens with flag and strength, a dashed route to the destination, the token gliding along it; light: only on-screen moving units animate, frames only while something moves, simpler at high speed or when hot.
- **The owner's unit images** (`design/generated/units`, 20 October 2026): tank for the armies, destroyer for the fleet, fighter for the air group; small 3x copies (84 px tall, 15–21 KB) in `screen14/A/units/`. In the game all unit images share one texture atlas, drawn in one pass.

## What it shows (Egypt, 1 January 2011)
- The armies of the military panel at their regions: المنطقة الغربية 4 (Marsa Matruh), المنطقة الشمالية 4 (Alexandria), Cairo's two armies as one stack 6 (المنطقة المركزية 5 and الحرس الجمهوري 1: a tap shows them, and orders wait until one is chosen), الجيش الثاني الميداني 7 (the canal), الجيش الثالث الميداني 6 (Suez); «أسطول المتوسط» off Alexandria (the Northern and Southern Fleets date from 2017) and an air group at Beni Suef; their 10 ships and 24 aircraft are this screen's own figures (screen 9 gives only «أسطولان» and «14 مجموعة»). Every place is checked against its latitude and longitude through the overlay's city dots. The Southern Region (Aswan) is off this view.
- The order: the Western Region army from Marsa Matruh down the desert road (one waypoint) to the Siwa oasis near the Libyan border: about 290 km (the road is about 300) at 40 km a day, 7.25 days: it arrives on 8 January, so on 1 January the bar reads «الوصول بعد 7 أيام» (counted on the HUD's dates; gender-free wording).
- Each unit: the image (28 pt) under a 20 pt tag (flag, strength); the selected one's tag ringed teal. Map names keep their play-screen size at any zoom; a city name a unit covers moves beside it (Cairo and Alexandria stay readable).
- The order bar on the dock's line, in the military panel's words: flag, name, «4 تشكيلات · إلى سيوة · الوصول بعد 7 أيام»; تقدّم (white while under way), هجوم (locked: no war; a tap shows «لا حرب: يُفتح الهجوم عند إعلان الحرب» above it), توقّف (white when halted or on arrival: the army holds, the clock runs on, «على طريق سيوة · الأمر: توقّف»), نقطة عبور, إغلاق (the dock returns, focus back on the unit). The destination's name sits 8 pt off the arrow's tip on the side away from the last leg.
- The map zooms to the largest scale at which every unit, the whole route and its marks stay in the safe screen and clear of the panels.

## Views
`&t=0` ordered (the main render), `&t=0.5` under way (4 January, Tuesday; arrival in 4 days), `&t=0.3&halt=1` halted, `&t=1` arrived (halt), `&t=0&tip=1` the attack note, `&state=idle` nothing selected (the dock back). Without `&t` the page is live: the clock runs, the speed button cycles ×1 ×2 ×5 ×10 أقصى, pause works, tapping a unit selects it.

## Lightness (measured in the live page)
Counted from outside the page's code (every animation-frame, timer and interval callback, every map frame, every CSS animation): ≤30 map frames a second while gliding at ×1–×5 (a 25 ms timer then the next frame, never the display's 60/120 Hz); at ×10, at «أقصى» (3 days a step) and with Reduce Motion (the system's or the URL's), steps at most 10 a second and no animation frame; with nothing moving no map frame, no animation frame, no interval, the date's clock at most 4 a second; paused, nothing at all.

## Gate
`screen14/A/_build/render.js` (its own checker, with the panels' generic rules) checks the units at their map places, whole and clear, strengths from screen 9's sheet, the images, the route and its marks, the date, the bar (name, line, order in force, attack locked, on the dock's line), VoiceOver, no weapon names, the labels, and the frame counts. `--selftest` and `check_screen.py` must pass.
