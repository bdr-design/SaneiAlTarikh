# Screen 8 brief: the internal and politics panel («الداخلية والسياسة»)

Visual mockups. NOT app code. The build is `../screen8/A`. Task card: `tasks/T-008_screen8_internal.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`); the owner can change anything.

## When it appears
The dock's «الداخلية والسياسة». It is the third full-height dock panel after الدولة (screen 5) and الاقتصاد (screen 6), built with the shared builder and checker (`design/shared/check/`), so its frame, sizes, fit levels and identity follow the approved panels exactly.

## Frame and identity
- The full-height side sheet, the dock beside it or hidden on the 375 pt phones, the rest of the HUD at its B3 place.
- The section identity, violet `#A08CFF`, on chrome only: the top line, the emblem, the open tab with its fill, the dock item while open. Data keeps its colours: bars teal, amber a worsening (always with its arrow), blue an improvement.
- Header: the flag, «الداخلية والسياسة» at 18 pt, the sub-line «مصر · 29 محافظة», the emblem and the close button. The title is longer than the other panels', so this panel's header shade reaches further left (the name keeps ≥ 4.5:1 over the satellite strip).
- The fit level is the loosest at which the overview fits (the same header for every tab).

## Tabs (a VoiceOver tab list, right to left)
1. **نظرة عامة (overview):**
   - Three headline numbers: السكان 79.7 مليون (+180 ألف شهريًا); الاضطرابات 45 / 100, the average over the 29 provinces, amber with its flame icon and «↑ +2 شهريًا»; «فوق 60»: 3 محافظات من 29 (the mass-protest threshold of §5.2). Each has «لماذا؟».
   - The status table: الحزب الحاكم, الطوارئ, التظاهر, الأحزاب, shown as the state panel sets them (one owner per law: they change only in الدولة › السياسات).
   - «الأكثر اضطرابًا»: the three worst provinces, the same as the unrest tab's first three.
   - One action: «فتح حوار وطني» (الكلفة 20 ★ · مرة في السنة, «↓ الاضطرابات −3»).
2. **الاضطرابات (unrest):** every province worst first, each a row of name, a teal bar out of 100 and the value with its trend arrow (amber when rising). Eight are listed, then «21 محافظة أخرى بين 32 و48»; a tap opens the province card. Then «مناطق الطوارئ», this panel's own lever (the emergency regions of §5.2, per province), with the national law shown read-only, and the action «إعلان منطقة طوارئ» (الكلفة 15 ★ · الشرعية −2, «↓ الاضطرابات −6»).
3. **الأحزاب (parties and elections):** the People's Assembly, 518 seats, as a share bar with keyed rows (الحزب الوطني 420, the state panel's «نحو 420»; مستقلون 69; the opposition 19 = الوفد 6 + التجمع 5 + أخرى 8; 10 appointed by the president); support in the country (58 / 27 / 15%); the elections (presidential September 2011, the Assembly 2015, half the Shura 2013; two-round single-member districts; at least half the seats for workers and farmers and 64 for women); the parties law as a link to الدولة › السياسات.
4. **الحركات (movements and interest groups):** the opposition movements (§5.3 actors: الإخوان المسلمون محظورة · شبكة واسعة, الجمعية الوطنية للتغيير, حركة 6 أبريل, كلنا خالد سعيد, كفاية) with their strength in words (rising ones amber with an up arrow); the note that a new movement appears when a province passes 60 under restricted liberties (§5.3); the interest groups' satisfaction (الجيش 72, رجال الأعمال 68, الأزهر 60, الكنيسة القبطية 55, القضاة 47, العمال 41), amber with a down arrow where it falls.

## Numbers that must agree
- Cairo's unrest is the province card's 64 (read from screen 4 R's sheet).
- The average over 29 provinces is the headline 45: the 8 listed (452) plus 21 at about 40 (the middle of 32..48) is 1,292 / 29 ≈ 44.6.
- Three provinces are above 60 (القاهرة 64, السويس 63, الإسكندرية 61).
- The seats add up to 518 with the state panel's NDP 420; the opposition parties add up to their 19.
- The laws shown are read from the state panel's sheet.

## Evidence (1 January 2011)
- **Seats:** the 2010 People's Assembly election gave the NDP about 420 of 508 elected seats (the state panel's figure); the Brotherhood boycotted the run-off and kept 1 seat; the Wafd about 6 and Tagammu about 5; about 70 independents, many NDP-aligned; 10 members appointed by the president (518 in all). The women's quota of 64 seats was new in 2010; at least half the members must be workers or farmers (the 1971 constitution).
- **Unrest:** Suez, Alexandria (Khaled Said, June 2010) and Mahalla in Gharbia (the 2008 strikes) were the flashpoints with Cairo; Tunisia's uprising was under way.
- **Movements:** Kefaya (2004), 6 April (2008), the National Association for Change around ElBaradei (2010), the «كلنا خالد سعيد» page (2010); the Brotherhood banned but organised.
- **Population:** about 80 million in Egypt in early 2011, growing about 2.2 million a year (CAPMAS); the figure is illustrative.

## Gate
- `screen8/A/_build/render.js` uses the shared checker and adds the panel's own rules: the brief's strings per tab; each unrest or satisfaction row (bar at its value, arrow by its trend, amber only for a worsening, a VoiceOver phrase with its value); worst first and Cairo = the card; the average and the count against the headline; the overview's three = the unrest tab's first three; the laws = the state panel's; the seats and the share bars; the movements read whole; row order (RTL).
- Its `--selftest` plants the shared checker's generic defects and the panel's own, and must catch every one.
- `python3 -I tools/check_screen.py design/screen8/A` must PASS.
