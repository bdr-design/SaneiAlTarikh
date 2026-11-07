# Screen 25 brief: the save mirror prompt (D-28)

Visual mockup. NOT app code. The build is `../screen25/A`. Task card: `tasks/T-027_screen25_save_mirror.md`. Designed and
approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`.

## When it appears
Once, right after the player's first manual save («حفظ الآن» in the «المزيد» panel's saves tab, screen 13): the save is
made, then this sheet takes the panel's place in the same frame (the «المزيد» section's grey identity, its dock item open).
Never during play, never over the map. Autosaves never open it. «ليس الآن» or the close records the answer: the game does
not ask again; the saves tab's row «نسخة في مجلد آخر» stays the way to pick a folder later.
The folder gone (`&tab=stale`) shows at the next manual save after a copy failed because the folder's bookmark no longer
resolves; until then the saves tab's mirror row says so.

## Frame
The approved panel sheet from the right, three bodies and no tab row (as screen 23): `&tab=ask` (default), `&tab=done`
and `&tab=stale`. Header: Egypt's flag, «نسخة احتياطية» (short: the saves tab row's own «نسخة في مجلد آخر» runs onto the
bright part of the section's header image), «حملة مصر · حُفظ 1 يناير 2011» (the save just made), the folder emblem, close
(«إغلاق، العودة إلى الحفظ»).

## The ask (`&tab=ask`)
- «احمِ حفظك»: «الحفظ في هذا الجهاز فقط، ويضيع إذا حُذفت اللعبة. اختر مجلدًا مرة واحدة، مثل iCloud Drive، فتُنسخ إليه
  الحفظات تلقائيًا.»
- «اختيار مجلد» · «مرة واحدة · مثل iCloud Drive» (first, primary: opens the system's folder picker).
- «ليس الآن» · «لن نسأل مرة أخرى · تجده في الحفظ».

## The folder chosen (`&tab=done`)
- «تُنسخ الحفظات»: المجلد صانع التاريخ · المكان iCloud Drive; «يُنسخ كل حفظ يدوي وأحدث حفظ تلقائي، مرة كل 10 دقائق على
  الأكثر، وعند الخروج من اللعبة.» (§7).
- «تم» · «العودة إلى الحفظ» (first, primary); «تغيير المجلد» · «يفتح منتقي المجلدات».

## The folder gone (`&tab=stale`)
- «المجلد غير متاح»: «لا تصل اللعبة إلى مجلد صانع التاريخ في iCloud Drive؛ ربما نُقل أو حُذف. الحفظ مستمر في هذا الجهاز،
  لكن دون نسخة.»
- «اختيار المجلد مرة أخرى» · «يفتح منتقي المجلدات» (first, primary); «ليس الآن» · «يبقى الحفظ في هذا الجهاز فقط».

## Rules
- No red: nothing is deleted. The forward choice is first and primary in each body (the one white bar).
- Every body fits whole on every phone.

## Cost
Static text, a few icons, the flag and the «المزيد» section's shared header image (as screen 23); nothing live while open.
- The prompt is one flag in the settings file («mirrorAsked»), read once at launch; it costs nothing after.
- Picking: the system's folder picker returns a URL; the game stores a security-scoped bookmark (one small blob).
- Copying (not on this sheet, §7): on the platform engine, off the main thread, file to file (no decode, no re-encode), at
  most every 10 real minutes and on background, inside the background task's time; a failure sets the mirror row's state
  and never blocks a save. Resolving the bookmark is done once per copy, not on a timer (L1).

## Gate
`screen25/A/_build/render.js` uses the shared checker (screen 13's skips for the grey identity, with the plants moved to
this sheet) and adds: the title, and the saves tab's mirror row (no folder chosen, opening the folder choice); the header's
campaign and date the «حفظ الآن» row's; the flag, the folder emblem and the close; each body's two actions in order, the
first the one primary with the white bar; the ask's risk, once, example folder and automatic copy; picking and changing
open the folder picker; «ليس الآن» asks once and says where the choice stays; the chosen folder's cells and the copy
frequency read from §7; the folder gone naming the folder and saying saving goes on without a copy; no red; no dialog.
`--selftest` and `check_screen.py` must pass.
