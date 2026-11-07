# Screen 18 brief: the end screens

Visual mockups. NOT app code. Builds `../screen18/A` (the 2100 report), `../screen18/B` (the nuclear end),
`../screen18/C` (the government dissolved). Task card: `tasks/T-018_screen18_end.md`. Designed and approved by Claude
under the owner's delegation (`ownerDelegation`, `finishEverything`), to the owner's rule `mapCentral`: each end is a
side sheet in the panels' frame, the map central and visible.

## Frame (all three)
The approved panel sheet from the right (shared builder and checker), one body, no tab row, no section (its own identity (sheetIdentity),
no dock item open). The stopped clock and the speed chip are drawn disabled (the secondary grey, aria-disabled). The end sheets are plain: no photo strip in the header. The clock is stopped and disabled (play glyph;
VoiceOver «الحملة منتهية» on A and B, «الوقت متوقف حتى تختار» on C). The HUD date is the moment's; the nation card names
no real person after 2011 (A and B «رئيس الدولة», C «المجلس · حكم انتقالي», VoiceOver «المجلس الانتقالي»; the card keeps B3's widths so the strip stays in place); the toast shows the moment's notification in
the B3 toast's width (A «انتهت الحملة في 2100», B «انتهت الحملة», C «ثورة: سقطت الحكومة»). On A the HUD's
stability and influence show the report's 2100 values (71%, 70).

## A: «تقرير الأمة» (31 December 2100)
Header: flag, «تقرير الأمة», «مصر · 2011–2100», the star emblem, close («العودة إلى الخريطة»).
Headline numbers: النتيجة 68 / 100 «+14 منذ 2011» · في 2011: 54 / 100 «بداية الحملة» · الأعلى 75 «السيادة والأمن».
**المحاور الخمسة** (each: its name, its measure 2011 → 2100, its score with its change since 2011):
- الاقتصاد · «دخل الفرد من 2,640 إلى 9,800 $» · 72 (+20)
- المعيشة · «متوسط العمر من 70 إلى 79 سنة» · 70 (+16)
- السيادة والأمن · «كل الأراضي · بلا حرب خاسرة» · 75 (+5)
- الاستقرار · «من 58% إلى 71%» · 66 (+12)
- المكانة الدولية · «النفوذ من 62 إلى 70» · 57 (+15)
(mean 68; 2011: 52, 54, 70, 54, 42 → 54). Note: «بدولارات 2011 الثابتة · تُلغى النتيجة إن استُخدمت خيارات غير واقعية».
Rows: «لعبة جديدة» (to the menu) and «تصفح الخريطة في 2100» · «الوقت متوقف».

## B: the nuclear end
Header: flag, «نهاية الحملة», «15 مارس 2034», the warning emblem, close («العودة إلى الخريطة», the stopped map, as on A).
Text (neutral, sober, no country named): «بلغ التصعيد النووي أعلى درجاته واستُخدم السلاح النووي. تتوقف الحملة هنا: لا تستطيع
اللعبة أن تمثّل ما يلي ذلك بأمانة.» No score, no image. Rows: «العودة إلى آخر حفظ» («1 مارس 2034 · قبل التصعيد»), «لعبة جديدة».

## C: the government dissolved (12 August 2031)
Header: flag, «سقطت حكومتك», «12 أغسطس 2031 · الوقت متوقف», the warning emblem, close («لاحقًا»: the choice waits in the notifications, time stays stopped).
Text: «أطاحت ثورة واسعة بالحكومة وتولّى مجلس انتقالي إدارة البلاد. يمكنك متابعة الحملة بالحكومة الجديدة أو إنهاؤها.»
Under the choices, visible: «يمكنك الاختيار لاحقًا من الإشعارات، والوقت متوقف حتى تختار.» The HUD shows the council: nation card
«المجلس» · «حكم انتقالي», legitimacy 35, stability 31%. Choices (r-act rows, no default): «المتابعة بالمجلس الانتقالي» («حكومة مصر الجديدة · تبدأ بشرعية 35») and
«إنهاء الحملة» («يعرض تقرير الأمة»).

## Gate
Each variant's render.js uses the shared checker and adds its own rules (A: the mean and the change exact, the pillars in
order and words, the note; B: no score, no number but dates, no image, the neutral words; C: two choices, no default,
the game paused). `--selftest` and `check_screen.py` must pass. Three independent read-only reviewers.
