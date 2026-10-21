# Screen 5 brief: the state panel («الدولة»)

Visual mockups for the owner. NOT app code. The build is `../screen5/A`.

## When it appears
The player taps «الدولة», the first item of the section dock. The panel opens as the full-height side sheet of the approved province details (`SCREEN4_BRIEF.md`). The map stays visible and Egypt stays clear of every panel. The dock item «الدولة» shows the open section.

## Base
- **Look:** the approved province panel (`../screen4/R`). Its CSS file `screen4/R/_build/panel.css` is read by the assembler, so the panels cannot drift.
- **Section identity:** `section_identity.css`. On «كمل الباقي بدقه» (2026-10-21) the owner went ahead with Claude's recommendation:
  - **One colour per dock section.** It is kept out of the hues that carry meaning everywhere: teal, cyan, blue, amber and red.
  - **Where it shows:** only on the section's chrome. That is a 2 pt line on top of the panel, the emblem in the header, the open tab, and the dock item while the section is open (with a 2 pt underline). Data colours never change with the section.
  - **The colours:**

    | Section | Colour |
    |---|---|
    | الدولة | لؤلؤي `#E9EEF4` |
    | الاقتصاد | زمردي `#43C08A` |
    | الداخلية والسياسة | بنفسجي `#A08CFF` |
    | الجيش | زيتي `#BDB46A` |
    | الخارجية | أزرق ملكي `#5B86F2` |
    | الاستخبارات | أرجواني `#C873D6` |
    | البحث | ليموني `#9EDB5B` |
    | المزيد | رمادي `#A9BCCB` |
  - **The dock** stays neutral as approved on B3. Only the open section takes its colour.
  - **White touches** on the dark panels (D-3 stands), in the text white `#EAF2F7`:
    - white tile icons;
    - filled white primary buttons with dark `#0B1218` text;
    - the chosen segment of a law filled white;
    - white-outlined secondary buttons and chips.

    White panels are not used.

## Content (Egypt, 1 January 2011; values are illustrative)
- **Header:**
  - Flag and «مصر».
  - The «إعداد واقعي» chip shows the game setting (presets). If cheats are on, this is where it shows.
  - «الرئيس محمد حسني مبارك · منذ 1981».
  - The section emblem and the close button.
- **Tabs:** نظرة عامة / القيادة / السياسات / المشاريع.
  1. **نظرة عامة** shows the 3 headline numbers with a monthly rate and «لماذا؟»: رأس المال السياسي 86, الاستقرار 58%, الشرعية 44 / 100 (amber).
     - The status table: نظام الحكم, الدستور (1971, amended 2007), الحزب الحاكم, الطوارئ (in force since 1981, amber).
     - Two decisions with their political-capital cost: «رفع حالة الطوارئ» and «تعديل وزاري» (once a year).
  2. **القيادة:**
     - Offices: the president with «تغيير الاسم» (real name, no photo, no traits; D-30), the prime minister, and the vacant vice-president.
     - The People's Assembly seats (about 420 of 518 for the NDP) as a bar that fills from the right.
     - The next election (presidential, September 2011) and who holds office on a vacancy.
  3. **السياسات:** 8 laws in three groups. Each shows its setting as 3 segments and the political capital a change costs; a change has a 6-month cooldown.
     - الأمن والنظام: حالة الطوارئ, التجنيد, التظاهر.
     - الحريات: الإعلام, الأحزاب, الإنترنت.
     - الخدمات العامة: التعليم الحكومي, الصحة العامة.

     Economic levers live in the Economy section.
  4. **المشاريع:** running projects with progress and «إلغاء», showing the refund (escrow minus 10%), and available projects with «بدء». Real 2011 examples: Cairo Metro line 3, Toshka, the El Dabaa nuclear plant, East Port Said.

## Geometry and fit
- **The sheet:** the province details' rules apply: width, the dock left of the sheet or hidden on the 375 pt phones, and every other HUD element at its B3 place.
- **The overview tab** shows everything without scrolling, at the loosest fit level that does. The other tabs scroll inside the sheet with 24 pt fades, and a bottom scroll hint is required.
- **Sizes added for this panel:**
  - Law segments: 26 pt tall, 60 pt wide, radius 6.
  - Law rows: 40 pt with 4 pt between them, so the segments' 44 pt hit boxes meet without overlapping.
  - The header emblem: 32 pt, radius 10.

## Light build rules
As in `SCREEN4_BRIEF.md`: no blur, no masks on scrolling content (overlay gradients), the header strip cropped from the map imagery in memory, and the fit level as a lookup.

## Gate
- `screen5/A/_build/render.js` checks all 7 phones in 6 views (each tab, and the end of each long one). Its `--selftest` plants defects and must catch every one.
- `python3 -I tools/check_screen.py design/screen5/A` must PASS. It recomputes the input hash over the screen's files, the shared identity CSS and the province panel's CSS.
