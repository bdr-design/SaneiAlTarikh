# Screen 11 brief: the intelligence panel («الاستخبارات»)

Visual mockups. NOT app code. The build is `../screen11/A`. Task card: `tasks/T-011_screen11_intel.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «الاستخبارات» (§6.5: agency, networks per country, operations, counter-intelligence, exposure log). Built with the shared builder and checker. Identity purple `#C873D6` on chrome only. Header: flag, «الاستخبارات», the chip «سري» (lock), the sub-line «مصر · جهاز الاستخبارات»: the agency is named generically (D-13).

## Tabs
1. **نظرة عامة:** the agency 7 / 10, counter-intelligence 8 / 10, operations 2 of 4 (the capacity); the status table: cyber 4 / 10, budget 400 مليون $, intelligence sharing with the US, exposure «منخفض». One action: «رفع ميزانية الجهاز» (100 مليون $ a year, «↑ الإلكتروني +1»).
2. **الشبكات:** per country, strongest first: the network level out of 10 as a teal bar and a number, how fresh the picture is («آخر تحديث: ديسمبر 2010», the intel epoch of §5.6: estimates are stable between refreshes) and the exposure in words (a high one amber with the warning icon). غزة والضفة 8, السودان 7, ليبيا 6, إسرائيل 5, إيران 3.
3. **العمليات:** the running operations (2 of 4: gather intelligence in Libya 60%, dismantle a network in Cairo 35%), each with its end month, risk and a teal progress bar; the 9 operation types of §5.6 (gather, sabotage, cyber attack, support the opposition, support insurgents, election influence, coup support, propaganda, technology theft) and the line «لا توجد عمليات اغتيال في اللعبة.» (D-14); one action: gather intelligence in Sudan (60 مليون $ · 3 أشهر · خطر منخفض, «↑ الدقة»).
4. **المكافحة:** foreign operations caught (a spy network in Sinai: dismantled; funding of an armed group in Gaza: still followed, amber with the warning icon); the exposure log (none of ours exposed in a year); the internal and cyber threat.

## Rules
- Every row is read whole by VoiceOver (role img) and none is a control.
- No real agency name anywhere; no operation type that kills a person.

## Gate
`screen11/A/_build/render.js` uses the shared checker and adds: the brief's strings; no real agency name; networks strongest first, bars at their levels, read whole with their refresh month; the running operations = the headline within the capacity, bars at their progress; the 9 types and no killing; rows read whole and never controls. `--selftest` and `check_screen.py` must pass.
