# Screen 30 brief: the start tour («جولة البداية»)

Visual mockup. NOT app code. The build is `../screen30/A`. Task card: `tasks/T-033_screen30_tour.md`. Designed and
approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`.

## The moment
A new campaign has just started: Egypt, 1 January 2011 (screen 3's choice). The game opens paused with the tour, first:
the urgent Tunisia decision (screen 15) waits in the queue and opens when the tour ends. The player can reopen the tour
later from «المزيد» › «حول» › «المساعدة» (screen 13's row «كيف تلعب»); reopened, it shows the current date and country,
leaves out the first decision, and its last primary is «إنهاء الجولة» · «العودة إلى الخريطة» (time as it was): its
header line, close, skip and the play button say the real time state («الوقت يمضي · <date>» and «… والوقت كما كان»
when it runs); the step texts are unchanged. Onboarding is §6.1's pending item and M8's; the cut list (§12, item 5) calls its parts «onboarding cards».

## Frame
A side sheet in the «المزيد» section's frame (help lives there: its grey identity, its dock item open), its own emblem (a
compass), the map central and never dimmed (mapCentral): no scrim, no spotlight. A new sheet colour was measured and
none clears ΔE2000 16 from every section, meaning and sheet colour at contrast ≥ 9, so the tour takes its section's.
Header: the campaign's flag, «جولة البداية», «اللعبة متوقفة · 1 يناير 2011»; the close «تخطي الجولة، تعود إليها من
المزيد، حول، المساعدة. ثم يفتح أول قرار، احتجاجات في تونس» (at a new campaign every way out of the tour leads to the
waiting decision; the skip's label says the same). The game is paused: the play button shows play, read «تشغيل (اللعبة متوقفة)».

## The steps
Five bodies, no tab row (&tab=s1..s5). Each: the heading «الخطوة n من 5 · title», a short text (the decision sheet's text
style), then «التالي» (the one primary, naming the next step) and «تخطي الجولة» («تعود إليها من المزيد › حول › المساعدة»);
the last step's primary «ابدأ الحملة» («يفتح أول قرار: احتجاجات في تونس»: the decision sheet follows, time still
stopped until the player chooses or puts it off) and no skip. No «السابق»: five short steps, and the whole tour stays in
the help (lightness). The skip row keeps the link row's chevron (the shared row: it leads somewhere, here to the waiting
decision). The last primary's tile is the «التالي» arrow, not the play sign: it opens the decision and time stays stopped.
1. **بلدك** (rings the nation card): the player governs Egypt from 1 January 2011, and Egypt's card at the top opens
   the State panel; tap a province of Egypt for its card, any other country for its state and our relation (screens 4, 28).
2. **المؤشرات** (rings the indicators row): the six indicators by their HUD labels; the arrow is the trend; a tap says why
   (screen 17).
3. **الأقسام** (no ring: the dock hides under the sheet on the smaller phones): the dock's eight icons and names, as the
   dock has them (its label type, 10/500), two rows of four; the icons at the sheet's 16 pt, one below the dock's 17
   (a list inside a sheet, as every sheet icon).
4. **الوقت** (rings the date and speed bar): day by day; the 1× button picks the speed up to «أقصى» (the speed menu), the
   play/pause button («زر التشغيل والإيقاف») stops it any time; orders given while the game is paused run on resume (screen 26).
5. **الأحداث** (rings the alert): news arrives here and the bell gathers every notification; urgent decisions stop time
   until the player chooses or puts them off (screen 15, «لاحقًا»); the ringed alert is the first decision waiting
   («وهذا الخبر أول قرار ينتظرك»), which the primary names by screen 15's title «احتجاجات في تونس».
The ring: a solid white 2 pt outline 3 pt outside the element (the element inside the side insets; the ring may reach
5 pt into them); nothing is drawn over the map; the alert's badge drops its dark halo while ringed, so the ring runs
unbroken.

## Rules
- Western digits; no red; the Arabic counts.

## Cost
- A static sheet: five bodies from the bundle's strings; the ring is a style on a HUD element (no layer, no draw on the
  map); the game is paused, so the display link idles between taps (L1). Nothing ticks; main thread: the taps only (L14).
- At a new campaign: after the first playable frame (outside §3.4's cold start), ahead of the queued urgent decision,
  whose sheet model and category image are built only when the tour ends: one sheet at a time.
- The «المزيد» section's shared header image (copied once at open from the resident z4 base, off the main thread,
  released on close, inside §3.3's panels line) and the 40 pt flag on demand, cached and droppable (§3.9 Flags).

## Gate
`screen30/A/_build/render.js` uses the shared checker (the «المزيد» section, five bodies and no tab row, the sections'
step must fit) and adds: the header, emblem and close (saying the tour stays in the help); no dialog or dimmer; the game
shown paused; each step's heading, number and text; each body exactly its text, one primary with its bar and (steps 1
to 4) the skip; the primary naming the next step (the last «ابدأ الحملة», opening the first decision); the skip's path
through «حول»; exactly the step's HUD element ringed and nothing else on the page (any outline, or a border, shadow
layer of 1 pt spread or 2 pt blur, drop-shadow, border image or SVG stroke in any colour that is visible, alpha ≥ 0.3,
and not dark, on an element or its ::before or ::after, the map's included, and any sheet part painting outside the
sheet; the HUD's own shadows are dark and its hairlines under 0.25; no added layer at the page's top level, in the
device frame or on html or body), solid white 2 pt at 3 pt with no second white ring on it, inside the side
insets, on screen and clear of the sheet, none on the sections' step; the date and country the HUD's; the six indicators the HUD's; the dock's eight sections (order,
names, icons, two rows); the speed button and menu; the first decision the alert's and the bell named. `--selftest` and `check_screen.py` must pass.
