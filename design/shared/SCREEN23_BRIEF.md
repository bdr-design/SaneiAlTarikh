# Screen 23 brief: the save-file sheet

Visual mockup. NOT app code. The build is `../screen23/A`. Task card: `tasks/T-023_screen23_save_file.md`. Designed and
approved by Claude under the owner's delegation, to the owner's rules `mapCentral` and `sheetIdentity`.

## Frame
The approved panel sheet from the right in the «المزيد» section (its grey identity, the dock's «المزيد» open; a sheet
opened from a section keeps that section's identity), two bodies and no tab row: `&tab=file` (default) and
`&tab=confirm`. Header: Egypt's flag, «حفظ تلقائي», «حملة مصر · حُفظ قبل دقيقة», the save emblem, close («إغلاق،
العودة إلى الحفظ»). «قبل دقيقة» is formatted once when the sheet opens, from the save's binary metadata; it does not
tick (L1: idle costs nothing).

## The file (`&tab=file`)
- «الملف»: التاريخ 1 يناير 2011 · الحجم 2 ميغابايت (screen 13's autosave row); note «يتناوب الحفظ التلقائي على 3 ملفات، الأحدث
  مكان الأقدم.» (the decision «saves»).
- «تحميل هذا الحفظ» · «يعود إلى 1 يناير 2011 · يحل محل اللعبة الحالية» (the one primary action).
- «تصدير» · «ملف واحد عبر تطبيق الملفات» (opens the system's share sheet).
- «حذف هذا الحفظ» · «لا نسخة له في مجلد آخر · لا يمكن التراجع» (the red bin; opens the confirmation; D-28: screen 13's
  mirror row has no folder chosen, so the file has no other copy).

## The confirmation (`&tab=confirm`)
- «حذف هذا الحفظ؟» and «سيُحذف حفظ 1 يناير 2011 (مصر · 2 ميغابايت) من هذا الجهاز نهائيًا، ولا نسخة له في مجلد آخر.»
- «إبقاء الحفظ» · «العودة دون حذف» (first, primary); «حذف نهائيًا» · «لا يمكن التراجع» (the red bin, a red outline).

## Rules
- Red only on the delete rows' bins (and the final delete's outline); the words say «حذف», the text stays white
  (colour never alone).
- Both bodies fit whole on every phone (fit level from the file body).

## Cost
Static text, four icons, no images beyond the flag; nothing live while open (the age is formatted once). Loading and
deleting run on the platform engine off the main thread (L14); loading releases the old state before decoding (§3.4).

## Gate
`screen23/A/_build/render.js` uses the shared checker (screen 13's skips for the grey identity, with the plants moved to
this sheet) and adds: the file read from screen 13's row and the rotation from decisions.json; the actions' order and the
one primary; loading's date and replacing; export through Files; every link says where it leads; the delete saying the file has no other copy; red
only on the delete rows, their titles white; deleting asks first; the confirmation's order, primary and naming; no
dialog. `--selftest` and `check_screen.py` must pass.
