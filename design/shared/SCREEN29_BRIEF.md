# Screen 29 brief: sources and rights («المصادر والحقوق»)

Visual mockup. NOT app code. The build is `../screen29/A`. Task card: `tasks/T-032_screen29_sources.md`. Designed and
approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`.

## The moment
In a campaign (Egypt, 1 January 2011), the player opened «المزيد» › «حول» › «المصادر والحقوق» (screen 13's row:
«البيانات والخرائط ورخصها · قيم تصميمية»).

## Frame
The approved panel sheet from the right in the «المزيد» section's frame (its grey identity, its dock item open), the
document emblem (the row's icon on screen 13), close «إغلاق، العودة إلى حول». Header: the campaign's flag, the title
«المصادر» (the full «المصادر والحقوق» reaches the header image's light half: its contrast falls under 4.5), the sub-line
«الحقوق والرخص · الإصدار 1.0» (screen 13's version); VoiceOver reads the sheet as «المصادر والحقوق», screen 13's row. A tab
row of three: البيانات (default), الخرائط والصور, قيم تصميمية.

## The tabs
- **البيانات:** a note «أرقام البداية من هذه المصادر، ثم تتغير بقراراتك.», then three sections of source rows, each its
  name, then what it feeds · its licence (the licence §4's table gives it):
  - السكان والاقتصاد: UN World Population Prospects 2024 (CC BY 3.0 IGO); World Bank WDI (CC BY 4.0); GHS-POP, European
    Commission (CC BY 4.0); Kummu 2018 (CC0); ILOSTAT (CC BY 4.0); Penn World Table (CC BY 4.0).
  - الأمن والنزاعات: UCDP/PRIO, Uppsala (CC BY 4.0); WMEAT, US State Department (public domain).
  - الأرض والمناخ: DeltaDTM, Pronk 2024 (CC BY 4.0); Global Carbon Budget (CC BY 4.0); IPCC AR6 data (CC BY 4.0).
  Sources whose licence is still pending in §4 (OECD ICIO, SSP, MODIS, Köppen and the others) are not shown: they block a
  release build until resolved (R2), so a shipped list never carries them.
- **الخرائط والصور:** الخرائط: NASA Blue Marble (credit «مرصد الأرض في ناسا، Reto Stöckli»), Natural Earth (public
  domain), GMTED2010 and ETOPO1 (public domain); the note «استخدام صور ناسا لا يعني أن ناسا تؤيد اللعبة.». الأعلام والصور:
  flag-icons by Panayiotis Lipiridis (MIT); the game's images «صُنعت لهذه اللعبة · سجل لكل صورة» (§4.1's image registry);
  the note «الأعلام لتعريف الدول داخل اللعبة فقط.» The game draws text in the system Arabic font (§2.5): no font credit.
- **قيم تصميمية:** (R5) the note «قيم ضبطناها للعب حيث لا توجد بيانات. ليست واقعية، ولا تدخل في مقارنة اللعبة
  بالتاريخ.», then the values, each its value · its section: تلاشي فرق البداية (half-life 8 years, §5.1 offsets: the
  economy), الاستيلاء على العتاد (15% of what the loser loses: illustrative; §5.4 capture rate, the army), مستوى أجهزة
  الاستخبارات (an estimate per country, §4 stage 25: intelligence). The shipped list is generated (§4.8).

## Rules
- Offline (L10): nothing opens the web. Rows are text, not controls. Western digits; no red.

## Cost
- A static sheet: its rows are generated once at bake time (§4.8 stage 50, the credits hash checked by the IPA gate) and
  read from the bundle on open; nothing ticks, nothing is computed in play. Opening it moves no camera (the map stays as
  it is under the sheet; tiles under the opaque sheet culled, §3.9). Main thread: the open and the tab change only (L14).

## Gate
`screen29/A/_build/render.js` uses the shared checker (the «المزيد» section, three tabs, the values tab must fit, the data
tab scrolls) and adds: the header with screen 13's version, read as screen 13's row; the emblem; the close; the tabs in
order; every source with what it feeds and its licence, the licence §4's table gives it (read from the design doc); the
data tab's count; NASA's credit and no-endorsement line; the flags for identification only; the images with their
registry; the design values said to be no data and outside the realism comparison, each with its value and section; no
web link; rows not controls; no dialog. `--selftest` and `check_screen.py` must pass.
