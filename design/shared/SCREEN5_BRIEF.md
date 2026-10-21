# Screen 5 brief: the state panel («الدولة»)

Visual mockups for the owner. NOT app code. The build is `../screen5/A`.

**Approved by the owner on 2026-10-21** («اعتمد كل شي»), together with one owner per law (design doc §6.5). Logged in `decisions/`.

## When it appears
The player taps «الدولة», the first item of the section dock. The panel opens as the full-height side sheet of the approved province details (`SCREEN4_BRIEF.md`). The map stays visible and Egypt stays clear of every panel. The dock item «الدولة» shows the open section.

## Base
- **Look:** the approved province panel (`../screen4/R`). Its CSS file `screen4/R/_build/panel.css` is read by the assembler, so the panels cannot drift.
- **Section identity:** `section_identity.css`. On «كمل الباقي بدقه» (2026-10-21) the owner went ahead with Claude's recommendation:
  - **One colour per dock section.** It is kept out of the hues that carry meaning everywhere: teal, cyan, blue, amber and red.
  - **Where it shows:** only on the section's chrome:
    - a 2 pt line across the top of the panel;
    - the emblem in the header;
    - the open tab, with its 2 pt underline and a faint fill of the colour (the closed tabs are the secondary grey);
    - the dock item while the section is open, with a 2 pt underline.

    Data colours never change with the section.
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

    The white lines come in two strengths, both built on the text white:
    - `--w-line` (50%): outlines of buttons, chips and the header chip;
    - `--w-line-dim` (28%): grey buttons, and the segment track and its dividers.

    White panels are not used. The owner confirmed this mix on 2026-10-21: «الاسود ممزوج مع المربعات البيضه».

## Content (Egypt, 1 January 2011; values are illustrative)
- **Header:**
  - Flag and «مصر».
  - **The mode chip** uses the approved new-game page's terms (screen 3: «الوضع», «خيارات غير واقعية»):
    - «الوضع: واقعي» in white, with the mode icon.
    - Any other mode shows in amber: «<mode> · غير واقعي».
    - While unrealistic options are on, the chip reads «<mode> · خيارات غير واقعية», with the wand icon. `?states=1` draws «God · خيارات غير واقعية» (D-12).
    - On the SE, the longest pair, «قوة عظمى · خيارات غير واقعية», is 1 pt too wide. There the chip reads «خيارات غير واقعية» alone.
  - «الرئيس محمد حسني مبارك · منذ 1981».
  - The section emblem and the close button.
- **Tabs:** نظرة عامة / القيادة / السياسات / المشاريع (icons: grid, people, document, crane). No crown: Egypt is a republic.
  1. **نظرة عامة:**
     - The 3 headline numbers, each with a monthly rate and «لماذا؟»: رأس المال السياسي 86, الاستقرار 58%, الشرعية 44 / 100 (amber).
     - The status table: نظام الحكم, الدستور «1971 · عُدّل في 2007», الحزب الحاكم, الطوارئ («سارية منذ 1981», amber).
     - Two decisions with their cost, written «الكلفة: 60» plus the political-capital glyph:
       - «رفع حالة الطوارئ» is a shortcut to the emergency law's change: the same command, cost and cooldown.
       - «تعديل وزاري» is allowed once a year. In its wait (`?states=1`) its line reads «متاح في يناير 2012», and its tile and chip step back to grey.
  2. **القيادة:**
     - **Offices:** the president, with «تغيير الاسم» and the podium icon. Real name only: no photo, no traits (D-30). The prime minister (briefcase) and the vacant vice-president (person).
     - **People's Assembly:** «الحزب الوطني: نحو 420 من 518 مقعدًا», as a bar that fills from the right.
     - The next election («رئاسية · سبتمبر 2011») and «عند خلوّ منصب الرئيس: رئيس مجلس الشعب مؤقتًا».
  3. **السياسات:** 8 laws in three groups. Each shows its setting as 3 segments, freest on the right, and «كلفة التغيير: N» with the glyph. A change starts a 6-month cooldown.
     - الأمن والنظام: حالة الطوارئ, التجنيد, التظاهر.
     - الحريات: الإعلام (حر / مقيد / موجَّه), الأحزاب, الإنترنت (مفتوح / مراقَب / محجوب).
     - الخدمات العامة: التعليم الحكومي, الرعاية الصحية.
     - **One owner per law** (design doc §6.5): this tab owns all 8 laws. Military shows conscription read-only with a link. Internal's emergency rule is the per-province emergency regions. Economic levers live in the Economy section.
     - **States** (`?states=1`, illustrative):
       - A law in its cooldown («الإعلام»): its cost line becomes «متاح بعد 4 أشهر», its segments step back to grey (the chosen one a dim white), and it cannot be tapped.
       - A change the player cannot afford («حالة الطوارئ»): the cost in amber.
  4. **المشاريع:**
     - Running projects show their progress, «إلغاء», and the refund: «يُسترد 90 مليون $» for Cairo Metro line 3 (train icon) and «يُسترد 410 ملايين $» for Toshka.
     - Available projects show «بدء»: the El Dabaa nuclear plant and the East Port Said expansion (ship icon; the anchor stays the stability icon).
     - The rule: «عند إلغاء مشروع يُرجع المبلغ غير المصروف بعد خصم 10% منه.» The escrow is the unspent balance (design doc §5).
     - **Money:** amounts under 1 billion are written in millions, with the Arabic count form: «90 مليون $», «410 ملايين $», «4 مليارات $».

## Geometry and fit
- **The sheet:** the province details' rules apply:
  - the width;
  - the dock moves left of the sheet, or hides on the 375 pt phones;
  - every other HUD element stays at its B3 place.
- **The overview tab** shows everything without scrolling, at the loosest fit level that does. The fit levels are `panel.css` 0 to 6. Level 5 (the header at 44 pt, the status rows kept at 22) was added after the review, so the SE and the iPhone 14 no longer jump to the 18 pt rows. Its last action row needs only 4 pt under it, so the 17 Pro Max fits at level 0.
- **The other tabs** scroll inside the sheet:
  - a 24 pt fade at each edge that hides content;
  - at the bottom, a clear 22 pt strip under the fade holds the scroll hint, so the hint never sits on content. The mask changes, the layout does not, so nothing moves when the player reaches the end.
- **Sizes added for this panel:**
  - Law segments: 26 pt tall, 60 pt wide, radius 6.
  - Law rows: 40 pt, 4 pt apart, so the segments' 44 pt hit boxes meet without overlapping.
  - Office rows: 40 pt with the panel's 34 pt tiles.
  - Project rows: 52 pt.
  - The header emblem: 32 pt, radius 10.
  - The cost glyph: 10 pt.
- **Map labels:** a label the screen edge or the side inset (the notch, the Dynamic Island) would slice is hidden in the final pass, like a label a panel cuts. This happens in that pass only, so the map does not move.

## Light build rules
As in `SCREEN4_BRIEF.md`:
- no blur;
- no masks on scrolling content (overlay gradients instead);
- the header strip cropped from the map imagery in memory;
- the fit level as a lookup.

## Gate
- **`screen5/A/_build/render.js`** checks all 7 phones.
  - It saves 9 views: each tab, the end of each long tab, the states overview and the states laws.
  - It also checks, without saving a PNG, the middle scroll offsets of every long tab and the end of the states laws.
  - Every brief string of a tab must be shown whole and clear of the fades in one of that tab's views.
- **Its `--selftest`** plants defects and must catch every one. That includes a run without the middle views, which must report the rows it leaves unchecked.
- **Before it judges anything,** it re-runs `assemble.py` and refuses an `index.html` that differs.
- **The input hash** covers:
  - the screen's sources;
  - the shared identity CSS and the province panel's CSS;
  - the base page;
  - B3;
  - `devices.json`;
  - every file the pages load.
- **`python3 -I tools/check_screen.py design/screen5/A`** must PASS. It recomputes the hash, matches each phone with `devices.json`, and requires the self-test.
