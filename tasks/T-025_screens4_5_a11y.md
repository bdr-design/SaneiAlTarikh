# T-025: The checker improvements and VoiceOver on screens 4 R and 5

## The need
Screens 4 R (the province panel) and 5 (the state panel) were approved before the shared checker of screens 6 to 23
grew its later rules. They lacked VoiceOver names that the later panels have, and screen 5's report did not bind its
renders by their content (WORKLOG «متابعة على الشاشات المعتمدة»).

## Evidence
Screen 5: «لماذا؟» ×3 unnamed, the close read as «إغلاق» only, the action rows read by their pieces (the capital icon
and the chip's arrow silent), the project buttons «إلغاء» / «بدء» naming no project, the progress bars read out, no PNG
hashes in its report. Screen 4 R: «لماذا؟» ×3 and «كل الأسباب» unnamed, the close «إغلاق», the row buttons «تغيير»,
«تخطيط التوسعة», «اعتماد البرنامج», «تأجيل» naming no row, the causes of unrest read without their way.

## Scope
Labels and checks only; nothing visible changes. The shared tab rule: screens 8 to 23 share one in
`design/shared/check/panelcheck.js`; screens 4 R to 7 keep their own tab checks (each already planted); the native build's
UI tests replace both (a merge here would re-open four approved checkers for no visible gain).

## Acceptance criteria
1. Screen 5: each «لماذا؟» named «لماذا؟ <its subject>»; the close «إغلاق، العودة إلى الخريطة»; every action row reads
   whole (its numbers, «رأس المال السياسي», its chip's way in words), and in the states view its states wording; every
   row button names its row; progress bars hidden from VoiceOver; the report binds every PNG by its SHA-1.
2. Screen 4 R: the same for its «لماذا؟», «كل الأسباب», the close and its row buttons; each cause of unrest reads its
   name, its way and its points.
3. Each rule has a planted defect its self-test catches; 0 issues on 7 phones; `check_screen.py` PASS; every screen
   that reads these sheets still passes; six independent read-only reviews, every confirmed finding fixed.
