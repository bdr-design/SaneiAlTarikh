# Screen 16 brief: the notification centre

Visual mockup. NOT app code. The build is `../screen16/A`. Task card: `tasks/T-016_screen16_notifications.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`), to the owner's rule `mapCentral`.

## The moment
1 January 2011: the player put the Tunisia decision off («لاحقًا», screen 15), paused the game and ordered the western army to Siwa (screen 14), then tapped the bell (badge 2: the decision was read and now waits).

## Frame
The approved panel sheet from the right (shared builder and checker), the map central with Egypt clear; one body, no tab row, no section (its own identity (sheetIdentity), no dock item open). The clock shows play (paused), with screen 26's paused HUD (design/shared/paused_hud): the play button reads «تشغيل (اللعبة متوقفة)، يُنفَّذ أمر معلّق واحد» and carries the count 1 (the pending order's yellow), and the toast slot holds «أمر واحد ينتظر الاستئناف» (its list closed: the notification centre is open). The bell reads «الإشعارات، غير المقروءة 2» and is shown open (a wording that agrees with any count).

## Content
Header: Egypt's flag, «الإشعارات», «غير المقروءة: 2 · 1 يناير 2011», the grey bell emblem, close. Sections in words (§6.7's tiers), each row a 44 pt row with its icon:
- **قرارات تنتظرك:** «احتجاجات في تونس» · «قرار · الافتراضي بعد 7 أيام» (opens the decision; read, so no dot; VoiceOver «قرار ينتظرك: …»).
- **أوامر معلقة:** «المنطقة الغربية إلى سيوة» · «يُنفَّذ عند استئناف الوقت»: a group, not a notification, with its own «إلغاء» (§6.7: cancellable before time resumes).
- **مهم:** «السودان: استفتاء الجنوب بعد 8 أيام» · «9 يناير 2011 · الجوار».
- **للعلم:** «القمح عالميًا في أعلى مستوى منذ 2008» · «السلع · ديسمبر 2010».
Unread rows (the two news items) carry a 6 pt teal dot before the chevron and begin «غير مقروء» in VoiceOver; the badge, the header and the bell all count 2. The pending order's row has the link rows' box and inset.

## Gate
`screen16/A/_build/render.js` uses the shared checker and adds: the paused clock; the sections in order, each row under its own, its line, its icon and chevron; the counts (badge, header, bell) = the unread rows = 2; the waiting decision said as such; the dots and words only on unread rows; the pending order a group with its own «إلغاء», read whole. `--selftest` and `check_screen.py` must pass. Three independent read-only reviewers (checker and consistency; what the player sees; dimensions and the formatting of text and boxes).
