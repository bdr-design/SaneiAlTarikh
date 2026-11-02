# Screen 11 brief: the intelligence panel («الاستخبارات»)

Visual mockups. NOT app code. The build is `../screen11/A`. Task card: `tasks/T-011_screen11_intel.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «الاستخبارات» (§6.5: agency, networks per country, operations, counter-intelligence, exposure log). Built with the shared builder and checker. Identity purple `#C873D6` on chrome only. Header: flag, «الاستخبارات», the chip «سري» (lock), the sub-line «مصر · جهاز الاستخبارات»: the agency is named generically (D-13).

## Tabs
1. **نظرة عامة:** the agency 7 / 10, counter-intelligence «مكافحة التجسس» 8 / 10, operations «2 من 4 · قيد التنفيذ» (running, of the capacity); the status table: «السيبراني» 4 / 10, budget «400 مليون $ سنويًا» (inside screen 6's «الأمن الداخلي» line, 3.3 مليار $), «الشبكات: 6 دول», exposure «منخفض». One action: «تمويل القدرات السيبرانية» (100 مليون $ a year · within a year, from the internal-security line; «↑ السيبراني +1»).
2. **الشبكات:** per country, strongest first: the network level out of 10 as a teal bar and a number, and the exposure in words (a high one amber with the warning icon). غزة والضفة 8, السودان 7, ليبيا 6, إسرائيل 5, إثيوبيا 4 (the Nile file after the 2010 framework agreement), إيران 3. The picture refreshes on the 1st of each month (§5.6's intel epoch), so the month is said once in the note: «… آخر تحديث: ديسمبر 2010.» (the month before the game date).
3. **العمليات:** the running operations (2 of 4: gather intelligence in Libya «أُنجز 60%» and in Ethiopia «أُنجز 35%»; both of the 9 types), each with its end month, risk and a teal progress bar; «أنواع العمليات المتاحة»: the 9 types of §5.6 separated by «،» (gather, sabotage, cyber attack, support the opposition, support insurgents, election influence, coup support, propaganda, «سرقة التقنية») and the line «لا توجد عمليات اغتيال في اللعبة.» (D-14); one action: gather intelligence in Sudan (60 مليون $ · 3 أشهر · خطر منخفض, «↑ الدقة»).
4. **المكافحة:** foreign operations caught (a spy network in Sinai, sponsor unconfirmed: dismantled; a foreign spy network in Cairo: «قيد التفكيك»; funding of an armed group in Gaza: «قيد المتابعة»; open cases amber with the warning icon); the exposure log (none of ours exposed in a year); «تهديد داخلي: مرتفع» (amber with its icon: the game opens hours after the Alexandria church bombing and with the Tunisian protests under way) and «تهديد سيبراني: منخفض».

## Rules
- Every row is read whole by VoiceOver (role img) and none is a control.
- No real agency name anywhere; no operation type that kills a person.

## Gate
`screen11/A/_build/render.js` uses the shared checker and adds: the brief's strings; every row as its parts in order (headlines, status cells, networks, operations, cases: a swap cannot pass); no real agency name in the text or any VoiceOver label (a long Arabic and Latin list); networks strongest first, bars at their levels, read whole; the last refresh the month before the game date; amber with its icon exactly on high values and open cases; the running operations = the headline within the capacity, each one of the 9 types, bars at their progress, «أُنجز» shown and heard; no killing type; rows read whole and never controls (networks too). `--selftest` and `check_screen.py` must pass.
