# Screen 28 brief: the country info card

Visual mockup. NOT app code. The build is `../screen28/A`. Task card: `tasks/T-030_screen28_country_card.md`. Designed
and approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`.

## The moment
1 January 2011. The player tapped Sudan on the map (any of its provinces at the country zoom; a tap on the player's own
country opens the province card, screen 4). Sudan is still whole: South Sudan seceded on 9 July 2011, after the
referendum of 9 January.

## Frame
The approved panel sheet from the right in the foreign section's frame (its royal-blue identity, the dock's «الخارجية»
open: the card is the foreign view of another country), one body, no tab row. Header: Sudan's flag, «السودان», «عمر
البشير · جمهورية رئاسية», the globe emblem, close («إغلاق، العودة إلى الخريطة»).

## The map
Sudan (with the south, from Natural Earth; the base map ends at 10° N) outlined with the selected province's language: a
2 pt white ring and a faint white fill; the map placed so the country's north (to 16° N) is in view and clear of every
panel and hit box (the shared checker's map focus), the zoom 0.6 to 1.1 x the play screen's. Khartoum's name shows.

## The card
- Three headline numbers: السكان «44 مليون» (2011); الناتج «65 مليار $» (2010; the output fact screen 24 left to this
  card); الاستقرار «40 إلى 50» · «تقدير».
- Another country's internal values the player could not know are estimates (D-19, §5.6 «Fog of war»): a range whose
  half-width follows our network there, ±(12 − network): 7 of 10 gives ±5. Population and output are public: exact.
- Status cells: علاقتنا «+18»; المعاهدات «مياه النيل 1959» (screen 10); النزاع «حلايب»; شبكتنا «7 من 10» (screens 11, 22).
- Note: «استفتاء جنوب السودان في 9 يناير 2011.» (screens 10, 16).
- Links: «العلاقة مع السودان» · «ما يحركها والإجراءات» (opens the relation sheet, as screen 21 for Ethiopia); «عملية جديدة
  في السودان» · «الشبكة 7 من 10 · الانكشاف منخفض» (opens screen 22 with Sudan as the target). The second link is below the
  fold on the smaller phones.

## Facts (1 January 2011)
Omar al-Bashir, president since 1989 (elected 2010); population about 44 million with the south (World Bank series
before the split); GDP about 65 billion dollars (2010, before the split); the Halaib triangle claimed by both Egypt and
Sudan, administered by Egypt. Values illustrative within these bounds.

## Rules
- No red; Western digits; the Arabic counts.

## Cost
- The card's model is built under §3.9's open-panel rule (a background task, ≤4 a second, only on a version change):
  population and output at the monthly refresh, the estimate only at an intelligence refresh (stable between, D-19);
  nothing ticks.
- The outline is the map engine's selection layer (the selected province's ring, one draw), built once per tap from the
  polity's provinces; opening is one camera move (tiles under L7).

## Gate
`screen28/A/_build/render.js` uses the shared checker (the foreign section; its map focus Sudan's north) and adds: the
header (flag, name, leader and regime); the emblem, the close; the headline numbers in order, population and output read
whole with their years, stability an estimated range whose width follows the network, read whole; the status cells in
order (a signed relation, screen 10's treaty, Halaib, the network as screens 11 and 22); the referendum dated as screens 10
and 16; the links in order, saying where they lead, the operation's line screen 22's; the country outlined; no red; no
dialog. `--selftest` and `check_screen.py` must pass.
