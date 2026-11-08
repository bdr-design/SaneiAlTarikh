# Screen 30 brief: the start tour («جولة البداية»)

Visual mockup. NOT app code. The build is `../screen30/A`. Task card: `tasks/T-033_screen30_tour.md`. Designed and
approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`.

## The moment
A new campaign has just started: Egypt, 1 January 2011 (screen 3's choice). The game opens paused with the tour; the
player can reopen it later from «المزيد» › «المساعدة» (screen 13's row «كيف تلعب»). Onboarding is §6.1's pending item and
M8's; the cut list (§12, item 5) calls its parts «onboarding cards».

## Frame
A side sheet in the «المزيد» section's frame (help lives there: its grey identity, its dock item open), its own emblem (a
compass), the map central and never dimmed (mapCentral): no scrim, no spotlight. A new sheet colour was measured and
none clears ΔE2000 16 from every section, meaning and sheet colour at contrast ≥ 9, so the tour takes its section's.
Header: the campaign's flag, «جولة البداية», «اللعبة متوقفة · 1 يناير 2011»; the close «تخطي الجولة، العودة إلى الخريطة
واللعبة متوقفة». The game is paused: the play button shows play, read «تشغيل (اللعبة متوقفة)».

## The steps
Five bodies, no tab row (&tab=s1..s5). Each: the heading «الخطوة n من 5 · title», a short text (the decision sheet's text
style), then «التالي» (the one primary, naming the next step) and «تخطي الجولة» («تعود إليها من المزيد › المساعدة»); the
last step's primary «ابدأ الحملة» («يستأنف الوقت بسرعة 1×») and no skip.
1. **بلدك** (rings the nation card): the player governs Egypt from 1 January 2011; tap a province for its card, a country
   for its state and our relation (screens 4 and 28).
2. **المؤشرات** (rings the indicators row): the six indicators by their HUD labels; the arrow is the trend; a tap says why
   (screen 17).
3. **الأقسام** (no ring: the dock hides under the sheet on the smaller phones): the seven sections' icons and names, as
   the dock has them.
4. **الوقت** (rings the date and speed bar): day by day, 1× to «أقصى» (the speed menu); pause any time; orders given
   while paused run on resume (screen 26).
5. **الأحداث** (rings the alert): news arrives here, important decisions stop time until the player chooses (screen 15);
   the first news is the alert's «احتجاجات واسعة في تونس».
The ring: a white 2 pt outline 3 pt outside the element; nothing is drawn over the map.

## Rules
- Western digits; no red; the Arabic counts.

## Cost
- A static sheet: five bodies from the bundle's strings; the ring is a style on a HUD element (no layer, no draw on the
  map); the game is paused, so the display link idles between taps (L1). Nothing ticks; main thread: the taps only (L14).

## Gate
`screen30/A/_build/render.js` uses the shared checker (the «المزيد» section, five bodies and no tab row, the sections'
step must fit) and adds: the header, emblem and close; no dialog or dimmer; the game shown paused; each step's heading,
number and text; the one primary naming the next step (the last «ابدأ الحملة», resuming at 1×); the skip on every step
but the last, saying the tour stays in the help; exactly the step's HUD element ringed, white 2 pt, on screen and clear
of the sheet, none on the sections' step; the six indicators the HUD's; the seven sections the dock's (order, names,
icons); the speeds the speed menu's; the first news the alert's. `--selftest` and `check_screen.py` must pass.
