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
- **البيانات:** a note «أهم مصادر أرقام البداية ومعايرة النماذج، ثم تتغير بقراراتك.», then three sections of source rows, each
  its name, then what it feeds · its licence (the licence cell of its row in §4's table):
  - السكان والاقتصاد: the UN's World Population Prospects 2024 (CC BY 3.0 IGO); the World Bank's World Development
    Indicators and International Debt Statistics (CC BY 4.0); the UN's national accounts (North Korea's output; UNdata
    terms); the CIA World Factbook 2011 (public domain); GHS-POP, European Commission (CC BY 4.0); the gridded GDP of
    Kummu 2018 (CC0); ILOSTAT (CC BY 4.0); Penn World Table (CC BY 4.0).
  - الأمن والسياسة: UCDP/PRIO, Uppsala University and the Peace Research Institute Oslo (CC BY 4.0); WMEAT, US State
    Department (public domain); Wikidata (parties, elections, leaders; CC0).
  - الأرض والمناخ: DeltaDTM, Pronk 2024 (CC BY 4.0); Global Carbon Budget (CC BY 4.0); IPCC AR6 data (CC BY 4.0).
  The rule: every §4 source whose licence asks for credit (CC BY, UNdata, Unicode, MIT, NASA's terms) is shown, with the
  main public-domain and CC0 inputs; a source whose licence is still pending in §4 (OECD ICIO, SSP, land cover, Köppen and
  the others) is never shown: it blocks a release build until resolved (R2). Land cover waits for the choice between
  MODIS (pending) and ESA WorldCover (CC BY 4.0); if ESA WorldCover is chosen, it is shown here.
- **الخرائط والصور:** الخرائط والأسماء: NASA Blue Marble (the Earth with its relief and sea depths; credit «مرصد الأرض في
  ناسا، Reto Stöckli»), Natural Earth (public domain), geoBoundaries (the detailed provinces; CC BY 4.0 / CC BY 3.0
  IGO, file by file), GMTED2010, USGS (terrain classes; public domain; ETOPO is not used: D-26), GeoNames (Arabic names; CC BY 4.0),
  Unicode CLDR (Arabic names; the Unicode licence); the note «استخدام صور ناسا لا يعني أن ناسا تؤيد اللعبة.». الأعلام
  والصور: flag-icons by Panayiotis Lipiridis (MIT); the game's images «صُنعت خصيصًا لهذه اللعبة»; the note «الأعلام
  لتعريف الدول داخل اللعبة فقط.» The game draws text in the system Arabic font (§2.5): no font credit.
- **قيم تصميمية:** (R5) the note «قيم ضبطناها للعب حيث لا توجد بيانات تُقاس بها، فلا نعدّها جزءًا من واقعية اللعبة.», then
  the values, each its value · its section, as the design doc records them: تلاشي فرق الاضطراب الأولي (half-life 8
  years, §5.2's unrest offset: الداخلية والسياسة), الاستيلاء على العتاد (15% of what the loser loses, §5.4: الجيش), مستوى
  أجهزة الاستخبارات (set per country, §4 stage 25: الاستخبارات). The shipped list is generated (§4.8); the tab must fit
  without scrolling, so it holds at most 3 values and a note of at most 2 lines on the narrowest sheet (314 pt); a longer
  list makes the tab scroll like the others.

## Rules
- Offline (L10): nothing opens the web. Rows are text, not controls. Western digits; no red.

## Cost
- A static sheet: stage 50 bakes its rows at build time (§4.8) as binary strings packed with content.bin's, never parsed on
  the phone (L2); the IPA gate checks the credits hash. They are read off the main thread once per open; nothing ticks,
  nothing is computed in play. Opening it moves no camera (the map stays as it is under the sheet; tiles under the opaque
  sheet culled, §3.9). Main thread: the open and the tab change only (L14).

## Gate
`screen29/A/_build/render.js` uses the shared checker (the «المزيد» section, three tabs, the values tab must fit, the data
tab scrolls) and adds: the header with screen 13's version, read as screen 13's row, its emblem screen 13's row icon; the
close; the tabs in order; every source in order with what it feeds and its licence, the licence the licence cell of its
row in §4's table (never pending), each tab's count, every §4 source whose licence asks for credit shown; NASA's credit and
the flags' author and licence as CREDITS.md; NASA's no-endorsement line; the flags for identification only; the images
made for this game; the design values said to be no measured data and outside the game's realism, each with the design
doc's value and its section; no web link; rows not controls; no dialog. `--selftest` and `check_screen.py` must pass.
