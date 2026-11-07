# T-023: Screen 23, the save-file sheet (load, export, delete)

## The need
§6.5 and the decision «saves»: the «المزيد» panel's saves tab lists this campaign's autosave, a row that «يفتح التحميل
والتصدير والحذف». The player needs the sheet it opens: what the file is, loading it, exporting it, deleting it safely.

## Evidence
`design_doc/final_design.md` §6.5, §3.5, §7 (saves), §2.6 lifecycle; decisions «saves» (autosave each in-game month
rotating 3 files, export and import through Files), D-4 (cadence), D-28 (Documents plus an optional mirror folder the
player picks once); screen 13's autosave row (1 يناير 2011 · مصر · 2 ميغابايت) and its mirror row (لم يُختر مجلد).
Values illustrative.

## Scope
A side sheet in the «المزيد» section (identity, dock item open), the map central, two bodies without a tab row: the file
and the delete confirmation (in the sheet, never a dialog over the map). Out of scope: the Files share sheet itself (the
system's), named manual saves (the same sheet, another title), the mirror folder chooser.

## Acceptance criteria
1. The file as screen 13's autosave row: its date and size, the campaign's country in the header; when it was saved,
   formatted once when the sheet opens (no ticking label).
2. The rotation over the decision's 3 files said; the mirror state as screen 13's: the delete says the file has no other copy.
3. The actions in order: load (the one primary, saying the date it returns to and that it replaces the game), export
   (through Files), delete (the red bin alone marks it; the text stays white; it opens the confirmation).
4. The confirmation: the safe choice «إبقاء الحفظ» first and primary, «حذف نهائيًا» second, both naming the file.
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews (checker, player,
   layout, boxes and type, heaviness, errors), every confirmed finding fixed.
