# Screen 9 brief: the military panel («الجيش»)

Visual mockups. NOT app code. The build is `../screen9/A`. Task card: `tasks/T-009_screen9_military.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «الجيش». Built with the shared builder and checker (`design/shared/check/`), like screen 8. The owner's decisions it follows:
- **`military`:** full control of each army, as in «الجنرال | الحرب العالمية»: the player orders each army on the map (move, attack, halt, waypoints); equipment stays generic (no real weapon names); air and naval are simplified in v1.
- **D-15:** units on the map are small generic tokens that glide along their route. That moving map prototype is its own item (with this screen), not part of this panel.
- **One owner per law:** conscription is the state panel's law, shown here with a link.

## Frame and identity
The full-height side sheet with the section identity olive `#BDB46A` on chrome only (top line, emblem, open tab, dock item). Header: flag, «الجيش», the chip «لا حروب», the sub-line «مصر · القوات المسلحة». The fit level is the loosest at which the overview fits.

## Tabs
1. **نظرة عامة:** القوات العاملة 469 ألف; الاحتياط 479 ألف (+2 ألف شهريًا, conscription feeds it); التشكيلات 36 «من 93» (the quota of §5.4: 40 + population / 1.5 million, with the internal panel's 79.7 million, rounded down). The status table: التجنيد (the state panel's «إلزامي»), الميزانية 4.0 مليار $ (the economy panel's defence line), المعونة 1.3 مليار $ سنويًا, الحروب «لا توجد». One action: «تعبئة جزئية» (150 مليون $ شهريًا, drawn from the reserves (said in VoiceOver; the sub-line holds only the cost so it fits the 330 pt sheet); «↑ القوام +40 ألفًا»: §5.4 fills the existing formations first, so their strength grows and the count does not; its cost «↓ النمو −0.2» in amber in its title).
2. **القوات:** the armies (regional commands), each a 44 pt row (a button) of name, region and formations, its organization («التنظيم», §5.4) and a chevron: a tap shows the army on the map, where it is ordered (advance, attack, halt, waypoints). They add up to the 36 (about 340,000 in the army over formations of about 10,000): الجيش الثاني الميداني 7, الجيش الثالث الميداني 6, المنطقة المركزية 5, المنطقة الشمالية 4, المنطقة الغربية 4, المنطقة الجنوبية 3, الحرس الجمهوري 1 (95%, the province panel's guard division), and «احتياط القيادة العامة» 6 unassigned formations (a tap makes an army from them, §5.4 CreateArmy). Then air (14 groups), navy (two fleets), air defence (5 divisions), «السيطرة الجوية: كاملة فوق مصر».
3. **المعدات:** the stock per category as estimates: البرية 14, الجوية 9, الدفاع الجوي 5, البحرية 3, الصواريخ 1 مليار $ (= «32 مليار $ تقريبًا»), each with a teal bar of its modern share; «التسليح سنويًا»: 1.1 مليار $ from the budget and 1.3 from US aid, military factories, assembly of main battle tanks; the 2010 order as a row, not a button («قيد التسليم: 20 مقاتلة من الجيل الرابع · من المعونة · من 2013»); one new order: «طلب منظومات دفاع جوي» (1.2 مليار $ · تسليم 2014, «↑ الدفاع الجوي +8»); the conscription link to the state panel.
4. **الحروب:** the empty state, what binds the forces (the 1979 treaty's limits in Sinai, no nuclear weapons, party to the NPT, the US partnership), and the link to the foreign section.

## Rules
- No real weapon name or model code anywhere: in Latin or Arabic letters, in the text, VoiceOver or the markup.
- Every row read as one element reads all it shows.

## Evidence (1 January 2011)
- **Personnel:** about 468,500 active (army 340,000, air defence 80,000, air force 30,000, navy 18,500) and 479,000 reserves (IISS, The Military Balance 2011); conscription of 12 to 36 months.
- **Money:** the defence line 4.0 مليار $ (screen 6) plus about 1.3 مليار $ of US military aid a year.
- **Forces:** the Second and Third Field Armies on the canal, regional commands (central, northern, western, southern), the Republican Guard in Cairo.
- **Equipment:** licence assembly of main battle tanks since 1992; 20 fourth-generation fighters ordered in 2010 for delivery from 2013. Names are left out by the owner's decision.
- **Sinai:** the 1979 treaty divides Sinai into zones with limits on forces.

## Gate
`screen9/A/_build/render.js` uses the shared checker and adds: the brief's strings per tab; the armies adding up to the headline and within the quota (rounded down); the budget, conscription (overview and link) and the guard (count and organization) read from their owners' sheets; army rows lead to the map; equipment rows read whole with «دولار» and never controls; the order being delivered a row; the stock adding up and the bars at their shares; no real weapon name or model code in Latin or Arabic letters, text, VoiceOver or markup; mobilization filling the existing formations, its cost amber with its arrow. Its `--selftest` must catch every plant; `check_screen.py` must PASS.
