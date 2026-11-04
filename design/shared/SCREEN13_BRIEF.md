# Screen 13 brief: the «المزيد» panel (saves, settings, log, about)

Visual mockups. NOT app code. The build is `../screen13/A`. Task card: `tasks/T-013_screen13_more.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «المزيد» (§6.5: saves, settings, statistics, event log, sources and rights, help; diagnostics export, the save mirror, «قيم تصميمية»). Built with the shared builder and checker. Identity grey `#A9BCCB`: it is the text grey itself, so for this section the checker's "identity never on data" rule cannot tell chrome from data and is skipped (the chrome still carries it). Header: flag, «المزيد», the sub-line «حملة مصر · 1 يناير 2011».

## Tabs
1. **الحفظ** (the first tab): «حفظ الآن» (a new save, no chip); «ملفات الحفظ في هذه الحملة»: the autosave with its date, country and size, opening load, export or delete; the note that it saves on the first of each month and on leaving; «نسخة في مجلد آخر» (D-28: the mirror copy in a folder the player picks once, e.g. iCloud Drive; it survives deleting the game; at the start no folder is chosen); «استيراد حفظ أو تصديره» through Files (decision «saves»).
2. **الإعدادات:** «الأداء»: الجودة (توفير / متوازن / أعلى: the governor's preference, L9, lightness first), حد السرعة (×5 / ×10 / أقصى, «أقصى» chosen so the HUD's top speed of D-16 stays reachable; it drops by itself when the phone is hot); «الصوت واللمس والحركة»: الأصوات (UI sounds, decision «sound»), الاهتزاز (كامل / خفيف / متوقف), الحركة (تلقائي / كاملة / مخففة: follows the system's Reduce Motion by default). No music setting (no music in v1); digits are Western always and money in US dollars, stated in a note. The per-category auto-pause of §6.7 belongs to the notification centre.
3. **السجل:** the campaign's events, newest first, each dated and opening its «لماذا؟» (the mode read as «الوضع واقعي»); «الإحصاءات» as a link (charts open only while shown, ≤120 points, §6.5).
4. **حول:** «المصادر والحقوق» (with «قيم تصميمية» on that screen, §6.5), «المساعدة», «الخصوصية» (no data collected, no account, no tracking; opens the privacy policy), «تصدير التشخيص» (a file the player shares, no personal data), and «صانع التاريخ · الإصدار 1.0 · لا إعلانات · يعمل دون إنترنت.» (L10).

## Rules
- Every setting is a radio group named exactly as its row, with three choices and exactly one chosen (white).
- Every link row says where it leads; every row, the action row too, reads all it shows.

## Gate
`screen13/A/_build/render.js` uses the shared checker (with the plants aimed at headline numbers moved to this panel's own elements) and adds: every setting as [name, line, its three choices in order, the chosen one] (a swap cannot pass) and a group named exactly as its row; the speed cap reaching «أقصى»; no music or digit setting; the log newest first and dated; every link row says where it leads (a word after «يفتح»); the mirror a folder the player picks. The shared rules now also hold exactly one chosen segment per group and the action rows read whole. `--selftest` and `check_screen.py` must pass.
