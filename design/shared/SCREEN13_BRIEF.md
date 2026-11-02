# Screen 13 brief: the «المزيد» panel (saves, settings, log, about)

Visual mockups. NOT app code. The build is `../screen13/A`. Task card: `tasks/T-013_screen13_more.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «المزيد» (§6.5: saves, settings, statistics, event log, sources and rights, help; diagnostics export, the save mirror, «قيم تصميمية»). Built with the shared builder and checker. Identity grey `#A9BCCB`: it is the text grey itself, so for this section the checker's "identity never on data" rule cannot tell chrome from data and is skipped (the chrome still carries it). Header: flag, «المزيد», the sub-line «حملة مصر · 1 يناير 2011».

## Tabs
1. **الحفظ** (the first tab; it fits whole on every phone): «حفظ الآن» (a new save); the campaign's saves (the autosave, with its date, country and size, opening load or delete); the note that it saves on the first of each month and on leaving; the backup copy as a 3-segment setting (أسبوعية / يومية / متوقفة).
2. **الإعدادات:** «الأداء»: الجودة (توفير / متوازن / أعلى: the governor's preference, L9, lightness first), أقصى سرعة (×2 / ×5 / ×10; it drops by itself when the phone is hot); «الإحساس»: الاهتزاز, الحركة (follows the system's Reduce Motion by default). No music setting (no music in v1); digits are Western always and money in US dollars, stated in a note.
3. **السجل:** the campaign's events, newest first, each opening its «لماذا؟»; «الإحصاءات» as a link (charts open only while shown, ≤120 points, §6.5).
4. **حول:** «المصادر والحقوق», «قيم تصميمية», «المساعدة», «تصدير التشخيص» (no personal data), and the line «لا إعلانات ولا اتصال بالإنترنت» (L10).

## Rules
- Every setting is a named radio group of three choices, the chosen one white.
- Every link row says where it leads; every row reads all it shows.

## Gate
`screen13/A/_build/render.js` uses the shared checker (with the plants aimed at headline numbers moved to this panel's own elements) and adds: the settings as named groups of three; no music or digit setting; every link row says where it leads. `--selftest` and `check_screen.py` must pass.
