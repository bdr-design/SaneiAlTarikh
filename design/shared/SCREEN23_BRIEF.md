# Screen 23 brief: the save-file sheet

Visual mockup. NOT app code. The build is `../screen23/A`. Task card: `tasks/T-023_screen23_save_file.md`. Designed and
approved by Claude under the owner's delegation, to the owner's rules `mapCentral` and `sheetIdentity`.

## Frame
The approved panel sheet from the right in the «المزيد» section (its grey identity, the dock's «المزيد» open; a sheet
opened from a section keeps that section's identity), three bodies and no tab row: `&tab=file` (default), `&tab=confirm`
(deleting) and `&tab=load` (loading). Header: Egypt's flag, «حفظ تلقائي», «حملة مصر · حُفظ قبل دقيقة», the save emblem, close («إغلاق،
العودة إلى الحفظ»). «قبل دقيقة» is formatted once when the sheet opens, from the file's modification date (set by the atomic
rename; §7's META has no save time); it does not tick (L1: idle costs nothing).

## The file (`&tab=file`)
- «الملف»: التاريخ 1 يناير 2011 · الحجم 2 ميغابايت (screen 13's autosave row); note «يتناوب الحفظ التلقائي على 3 ملفات، الأحدث
  مكان الأقدم.» (the decision «saves»).
- «تحميل هذا الحفظ» · «يعود إلى 1 يناير 2011 · يحل محل اللعبة الحالية» (the one primary action; opens the load
  confirmation: loading cannot be undone either, §6.8).
- «تصدير» · «ملف واحد عبر تطبيق الملفات» (opens the system's share sheet).
- «حذف هذا الحفظ» · «لا نسخة له في مجلد آخر · لا يمكن التراجع» (the red bin; opens the confirmation; D-28: screen 13's
  mirror row has no folder chosen, so the file has no other copy).

## The confirmation (`&tab=confirm`)
- «حذف هذا الحفظ؟» and «سيُحذف حفظ 1 يناير 2011 (مصر · 2 ميغابايت) من هذا الجهاز نهائيًا، ولا نسخة له في مجلد آخر.»
- «إبقاء الحفظ» · «العودة دون حذف» (first, primary); «حذف نهائيًا» · «لا يمكن التراجع» (the red bin, a red outline).

## The load confirmation (`&tab=load`)
- «تحميل هذا الحفظ؟» and «تعود الحملة إلى 1 يناير 2011، ويضيع من اللعبة الحالية ما لم يُحفظ بعد آخر حفظ.»
- «متابعة اللعب» · «العودة دون تحميل» (first, primary); «تحميل» · «يحل محل اللعبة الحالية».

The safe choices name what they keep («إبقاء الحفظ», «متابعة اللعب») rather than §6.8's generic «إلغاء»: a deliberate,
more specific label for the same default (the safe one is first and primary, the only one with the white bar).

## Rules
- Red only on the delete rows' bins (and the final delete's outline); the words say «حذف», the text stays white
  (colour never alone).
- Both bodies fit whole on every phone (fit level from the file body).

## Cost
Static text, five icons, the flag and the «المزيد» section's shared header image (decoded once at sheet size off the main
thread, released when the sheet closes, inside §3.3's panels line); nothing live while open (the age is formatted once).
- The file's facts come from the row model the «المزيد» panel's saves tab already holds (its META read once by the
  platform engine); nothing is re-read when the sheet opens. If an autosave lands while it is open, the platform engine
  sends one write event and the model is rebuilt once (no timer, no folder polling, L1).
- Export hands the existing file's URL to the system share sheet as is: no decode, no re-encode, off the main thread.
- Load, on «تحميل»: pause; the platform engine first checks the header, META (formatVersion, rulesHash) and the trailer
  hash (`SaveFile.check`: a SHA-256 over the file in memory, with no decompression: over ≤2 MB compressed, about 10 ms; over ≤12 MB when stored
  as it is, about 60 ms, at 195 MB/s measured on x86 Linux, not a phone); on failure the game is kept and the sheet
  says why («تالف» or «من إصدار أحدث»). Then the sheet closes and the panel models are dropped, the old state is
  released, and the file is decoded on the platform engine (§3.3 load spike and §7: peak ≤ footprint + 16 MB, L8).
  A static «جارٍ التحميل» state (no running animation, L6) shows until the first frame, within ≤1.0 s on A12 (§3.4).
- Delete removes the file on the platform engine, off the main thread (L14).

## Gate
`screen23/A/_build/render.js` uses the shared checker (screen 13's skips for the grey identity, with the plants moved to
this sheet) and adds: the file read from screen 13's row and the rotation from decisions.json; the actions' order and the
one primary and its drawn white bar (no other row draws one); loading's date and replacing, and its asking
first; the load confirmation's order, primary, date and loss; the flag, the emblem and the close; export through Files; every link says where it leads; the delete saying the file has no other copy; red
only on the delete rows (icon, outline and fill; the final delete's outline required), their titles white; deleting asks
first; the delete confirmation's order, primary and naming; one body shown; no
dialog. `--selftest` and `check_screen.py` must pass.
