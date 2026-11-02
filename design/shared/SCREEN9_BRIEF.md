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
1. **نظرة عامة:** العاملون 469 ألف; الاحتياط 479 ألف (+2 ألف شهريًا, conscription feeds it); التشكيلات 72 «من 94» (the quota of §5.4: 40 + population / 1.5 million, with the internal panel's 79.7 million). The status table: التجنيد (the state panel's «إلزامي»), الميزانية 4.0 مليار $ (the economy panel's defence line), المعونة 1.3 مليار $ سنويًا, الحروب «لا توجد». One action: «تعبئة جزئية» (40 ألفًا · 150 مليون $ شهريًا; «↑ التشكيلات +4», 40,000 over the nominal 10,000; its cost «↓ النمو» in amber in its title).
2. **القوات:** the armies (regional commands), each a row of name, region and formations, and its organization («التنظيم», §5.4); they add up to the 72: الجيش الثاني الميداني 14, الجيش الثالث الميداني 12, المنطقة المركزية 10, المنطقة الشمالية 8, المنطقة الغربية 7, المنطقة الجنوبية 6, الحرس الجمهوري 4 (95%, as the province panel's guard division), الاحتياط العام 11. No row is a control; the note says armies are ordered on the map (advance, attack, halt). Then air (14 groups), navy (two fleets), air defence (5 divisions), air control.
3. **المعدات:** the stock per category as estimates (§5.4 shows estimates with ranges): البرية 14, الجوية 9, الدفاع الجوي 5, البحرية 3, الصواريخ 1 مليار $ (= the stock «32 مليار $ تقريبًا»), each with a teal bar of its modern share (the two newest generations available). Procurement 1.1 مليار $ a year, US aid 1.3, domestic production, assembly of main battle tanks. One action: «20 مقاتلة من الجيل الرابع» (2.5 مليار $ · تسليم 2013, «↑ الحديث +10»: the 2010 order, without its real name). The conscription link to the state panel.
4. **الحروب:** the empty state («لا حروب ولا جبهات الآن. تظهر الجبهة على الخريطة عند أول حرب.»), what binds the forces (the 1979 treaty's limits in Sinai, no nuclear weapons, party to the NPT, the US partnership), and the link to the foreign section, where war and alliances are declared.

## Evidence (1 January 2011)
- **Personnel:** about 468,500 active (army 340,000, air defence 80,000, air force 30,000, navy 18,500) and 479,000 reserves (IISS, The Military Balance 2011); conscription of 12 to 36 months.
- **Money:** the defence line 4.0 مليار $ (screen 6) plus about 1.3 مليار $ of US military aid a year.
- **Forces:** the Second and Third Field Armies on the canal, regional commands (central, northern, western, southern), the Republican Guard in Cairo.
- **Equipment:** licence assembly of main battle tanks since 1992; 20 fourth-generation fighters ordered in 2010 for delivery from 2013. Names are left out by the owner's decision.
- **Sinai:** the 1979 treaty divides Sinai into zones with limits on forces.

## Gate
`screen9/A/_build/render.js` uses the shared checker and adds: the brief's strings per tab; the armies adding up to the headline and within the quota; the budget, conscription and the guard's organization read from their owners' sheets; army and equipment rows read whole and never controls; the stock adding up and the bars at their shares; no real weapon name or Latin model code anywhere (text or VoiceOver); the mobilization's formations against its personnel. Its `--selftest` must catch every plant; `check_screen.py` must PASS.
