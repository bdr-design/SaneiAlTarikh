# Screen 25 brief: the save mirror prompt (D-28)

Visual mockup. NOT app code. The build is `../screen25/A`. Task card: `tasks/T-027_screen25_save_mirror.md`. Designed and
approved by Claude under the owner's delegation, to the owner's rules `mapCentral`, `sheetIdentity` and `ownerProxy`.

## When it appears
Once, right after the player's first manual save («حفظ الآن» in the «المزيد» panel's saves tab, screen 13): the save is
made, then this sheet takes the panel's place in the same frame (the «المزيد» section's grey identity, its dock item open).
Never during play, never over the map. Autosaves never open it. «ليس الآن» records the answer: the game does not show
it again, and the saves tab's row «نسخة في مجلد آخر» stays the way to pick a folder later. The close does not record an
answer: the ask shows again at the next manual save.
The folder gone (`&tab=stale`) shows once, at the next manual save after a copy found that the folder's bookmark no longer
resolves (or its access failed); the saves tab's mirror row says «المجلد غير متاح» until the folder is back or another
is picked, and the folder is retried at each copy event. A bookmark that resolves but is marked stale (a moved folder) is
recreated silently and never shows this body.

## Frame
The approved panel sheet from the right, four bodies and no tab row (as screen 23): `&tab=ask` (default), `&tab=own`,
`&tab=done` and `&tab=stale`. Header: Egypt's flag, «نسخة احتياطية» (short: the saves tab row's own «نسخة في مجلد آخر» runs onto the
bright part of the section's header image), «حملة مصر · حُفظ الآن» (the save just made, in real time as screen 23's
«حُفظ قبل دقيقة»; formatted once), the folder emblem, close
(«إغلاق، العودة إلى الحفظ»).

## The ask (`&tab=ask`)
- «احمِ حفظك»: «الحفظ في هذا الجهاز فقط، ويضيع إذا حُذفت اللعبة. اختر مجلدًا مرة واحدة، مثل iCloud Drive، فتُنسخ إليه
  ملفات الحفظ تلقائيًا.» (screen 13's word for the files)
- «اختيار مجلد» · «مرة واحدة · مثل iCloud Drive» (first, primary: opens the system's folder picker).
- «ليس الآن» · «لن يُعرض مرة أخرى · المجلد لاحقًا من الحفظ».
- A folder inside the game's own container (its Documents, «على الـ iPhone › صانع التاريخ» in Files) is refused: it is
  deleted with the game. The sheet shows the folder refused (`&tab=own`).

## The folder refused (`&tab=own`)
- «اختر مجلدًا آخر»: «هذا المجلد يُحذف مع اللعبة. اختر مجلدًا خارجها، مثل iCloud Drive.» (a status: VoiceOver reads it
  as soon as the picker closes).
- «اختيار مجلد» · «خارج اللعبة · مثل iCloud Drive» (first, primary: opens the picker again); «ليس الآن» as on the ask.

## The folder chosen (`&tab=done`)
- «تُنسخ ملفات الحفظ»: المجلد صانع التاريخ · المكان iCloud Drive; «نُسخ هذا الحفظ الآن. بعده يُنسخ كل حفظ يدوي وأحدث
  حفظ تلقائي عند الحفظ أو الخروج من اللعبة، مرة كل 10 دقائق على الأكثر.» (§7: picking copies the current saves at once; this body shows only once that first copy has returned; a first
  copy that fails, for example a folder the game cannot write to, shows the folder gone instead).
- «تم» · «العودة إلى الحفظ» (first, primary); «تغيير المجلد» · «يفتح منتقي المجلدات».

## The folder gone (`&tab=stale`)
- «المجلد غير متاح»: «لا تصل اللعبة إلى مجلد صانع التاريخ في iCloud Drive؛ ربما حُذف، أو أُوقف iCloud Drive. الحفظ مستمر
  في هذا الجهاز، لكن دون نسخة.»
- «اختيار المجلد مرة أخرى» · «يفتح منتقي المجلدات» (first, primary); «ليس الآن» · «يبقى الحفظ في هذا الجهاز فقط حتى يعود المجلد».
- Product names and closing words are bound with no-break spaces («iCloud&nbsp;Drive», «الحفظ&nbsp;مستمر», «أو&nbsp;الخروج», «على&nbsp;الأكثر»); every Latin run is nowrap:
  no split name, no lone last word.

## Rules
- No red: nothing is deleted. The forward choice is first and primary in each body (the one white bar).
- Every body fits whole on every phone.

## Cost
Static text, a few icons, the flag and the «المزيد» section's shared header image (decoded once at sheet size off the main
thread, released when the sheet closes, inside §3.3's panels line, as screen 23); nothing live while open.
- The prompt is one flag in the settings file («mirrorAsked»), read once at launch; it costs nothing after.
- Picking: while the system's folder picker is up (out of process, full screen), the game is paused and the display link
  stopped, as on `.inactive`, and both are restored when it closes. The game stores one security-scoped bookmark in the
  settings file in Application Support (never in Documents).
- Copying (§7 «Mirror», design doc §3.9 and §3.5): only on save events (a manual save, an autosave, going to the
  background), never on a timer or by polling, at most once per 10 real minutes; a change not yet copied waits for the next
  event. Only new or changed files, against a local record (name, size, modification date); the mirror's files are never
  listed or read (no iCloud download); the newest autosave goes to one fixed mirror name, so the mirror holds the manual
  saves plus one autosave. On its own serial queue at utility QoS, after the save's atomic write and never ahead of a save;
  each file to a temporary name, then replaced. A coordinated write that waits on iCloud is cancelled by the background
  task's expiration handler and stays due. A failure sets the mirror row's state and never blocks a save.
- The bookmark is resolved once per copy; a stale-but-resolving one is recreated silently.

## Gate
`screen25/A/_build/render.js` uses the shared checker (screen 13's skips for the grey identity, with the plants moved to
this sheet) and adds: the title, and the saves tab's mirror row (no folder chosen, opening the folder choice); the header's
campaign and date the «حفظ الآن» row's; the flag, the folder emblem and the close; each body's two actions in order, the
first the one primary with the white bar; the ask's risk, once, example folder and automatic copy; picking and changing
open the folder picker; «ليس الآن» asks once and says where the choice stays; the chosen folder's cells (the brief's) and the copy
frequency (read from §7), the copy of the save just made; the folder gone naming the folder and saying saving goes on without a copy; the folder refused saying why first, as a status, and asking for a folder outside the game; no red anywhere (icons' colour, stroke and fill; text, fills, borders, outlines, shadows, ::before/::after); «ملفات الحفظ»,
never «الحفظات»; no product name split over two lines; no dialog.
`--selftest` and `check_screen.py` must pass.
