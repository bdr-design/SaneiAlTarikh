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
Sudan whole, as on 1 January 2011 (Natural Earth's Sudan and South Sudan as one, as the 2011 base maps; the base map
ends at 10° N, so the ring runs along that edge; `tools/sudan_outline.py` builds `_build/sudan.json`), outlined with the
selected province's language: a 2 pt white ring and a faint white fill. The map is placed so the country's north (to
15° N, Khartoum and its name included) is in view and clear of every panel and hit box (the shared checker's map focus),
the camera aiming the focus's centre at the open map's centre, the zoom 0.6 to 1.1 x the play screen's. The map names
the country on its north («السودان», moved there from the base map's 13° N) and shows Khartoum's dot and name (its name west of the dot, as every city's).

## The card
- Three headline numbers: السكان «44 مليون» (2011); الناتج «65 مليار $» (2010; the output fact screen 24 left to this
  card); الاستقرار «40% إلى 50%» · «تقدير» (a percentage, as the
  HUD's and every stability value; the connector in the secondary type, as «2 من 4» on screen 11).
- Another country's internal values the player could not know are estimates (D-19, §5.6 «Fog of war»): a range whose
  half-width follows our network there, ±(12 − network): 7 of 10 gives ±5. Population and output are public: exact.
- Status cells: علاقتنا «+18» (screen 10's relations list, between China +30 and Israel +12); المعاهدات «مياه النيل
  1959» (screen 10); النزاع «حلايب»; شبكتنا «7 من 10» (screens 11, 22). The cells are our standing with the country; its
  military strength is the intelligence view's, not this card's. VoiceOver reads a positive relation bare («18»), a
  negative one «سالب», as screen 10.
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
  population and output at the monthly refresh; the estimate only at an intelligence refresh (stable between, D-19); the
  relation monthly; the network and exposure on an operation or intelligence change; the treaty, dispute and leader on
  events. Nothing ticks.
- The outline is a layer-3 border style class (§2.5): the selected polity's id is a uniform tested against the GPU
  sovereign array, on the country-border instances with exactly one side in that polity, stencil-once, inside layer 3's
  ≤22 draws; the faint fill is the same uniform test in layer 2. Nothing is built per tap; any number of provinces and
  every vector level work; the total stays ≤50 draws.
- The camera moves only when the country's focus box would sit under the sheet or the HUD (otherwise no move, as screen
  4's card); then one move (tiles under L7; the tiles under the opaque sheet culled and unpinned, the header strip one copy
  from the resident z4 base, §3.9 «Tiles under opaque sheets»). Closing does not move the camera. The latest tap wins: a
  tap on another country retargets the running move and cancels the earlier country's in-flight jobs (its model, its
  flag).
- One background label placement after the move (≤ once per 250 ms), new strings shaped off the main thread; the header
  flag (32/40 pt) rendered on demand from vector, cached apart and droppable (§3.9 «Flags»), once per tapped country.
- Main thread: the tap and the finished model only (L14).

## Gate
`screen28/A/_build/render.js` uses the shared checker (the foreign section; its map focus Sudan's north) and adds: the
header (flag, name, leader and regime); the emblem, the close; the headline numbers in order, population and output read
whole with their years, stability an estimated range whose width follows the network, read whole; the status cells in
order (the relation as screen 10's Sudan row, screen 10's treaty, Halaib, the network as screens 11 and 22); the referendum dated as screens 10
and 16; the links in order, saying where they lead (a positive relation read bare), the operation's line screen 22's;
the country outlined (white, opaque, on the map over its north) and whole (Renk, in the south's north, inside the ring; the plant swaps in Sudan without the south); Sudan's name
and Khartoum with its dot shown on the map and not under a panel; population 2011 and output 2010; no red (borders,
outlines and shadows included); no dialog. `--selftest` and `check_screen.py` must pass.
