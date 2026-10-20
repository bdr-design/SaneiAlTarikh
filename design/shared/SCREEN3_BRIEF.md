# Screen 3 brief: "لعبة جديدة" (new game), three pages

Visual mockups for the user to approve. NOT app code.

## Reuse the approved system (mandatory)
- Approved screens: `../screen1/B3/` (main play screen) and `../screen2/B/` (main menu). Copy their responsive system: device presets from URL parameters (w, h, side, bottom, cutout) read from `../shared/devices.json`, the drawn island/notch, home indicator and rounded screen corners, the `frost()` glass technique, and the tokens:
  - glass `rgba(9,17,25,0.66)` + blur, border 1 px `rgba(127,233,255,0.14)`, radius 10 (controls) / 12 (cards, bars);
  - control heights 32 / 36 / 44 pt only; spacing 4 / 8 / 12 pt only;
  - type sizes 10, 11.5, 13 semibold tabular, 14 bold, plus one page-title size 18 bold (new, only for the page title);
  - text `#EAF2F7` / `#A9BCCB`; accent cyan `#7FE9FF`, teal `#3FE0D0`; warning amber `#F2B14C`; contrast >= 4.5:1; 44x44 pt hit areas without overlap; nothing inside the side safe insets; nothing tappable in the bottom inset.
- Font "IBM Plex Sans Arabic", `<html lang="ar" dir="rtl">`, Western digits, no emoji, icons inline stroke SVG 16 pt.

## Shared header on all three pages
- A back button (chevron pointing right, label "رجوع") at the RTL start (right), a 3-step indicator in the centre: "1 السيناريو · 2 الدولة · 3 الإعدادات" with the current step highlighted in cyan and done steps marked, all inside one 36 pt glass bar at the top.
- A primary "التالي" (or "ابدأ الحملة" on page 3) button, 44 pt, cyan fill with dark text, at the bottom-left (RTL end), above the home indicator.

## Background
- The approved satellite world map: `../shared/world_d1.jpg` + `../shared/world_d1_overlay.svg` (2400 x 1202, Miller projection, Egypt highlighted). For pages 1 and 3 darken it more (it is a backdrop); on page 2 it is the interactive map.

## Page 1: اختيار السيناريو (step 1)
Scenarios with their images in `../shared/scenarios/` (3:2):
- 2011 (available, selected): title "الربيع العربي"; date "1 يناير 2011"; text: "احتجاجات تونس بدأت والمنطقة على حافة التغيير. أزمة ديون في أوروبا، والنفط قرب 100 دولار."
- 2026 "العالم اليوم", 1990 "نهاية الحرب الباردة", 1985 "آخر الحرب الباردة", 1979 "عام التحولات": each shown with its image dimmed and a small lock + "قريبًا"; not selectable.

## Page 2: اختيار الدولة (step 2)
- The world map is the main surface; Egypt is selected (highlighted). A search field "ابحث عن دولة" (32 pt).
- A list of countries with flags (`../shared/flags/<iso2>.svg`, keep 4:3; for Libya use `ly_2011.svg`, the 2011 flag): مصر (eg), السعودية (sa), ليبيا (ly_2011), تونس (tn), سوريا (sy), العراق (iq), اليمن (ye), الأردن (jo), السودان (sd), تركيا (tr), إيران (ir), الولايات المتحدة (us), روسيا (ru), الصين (cn). Show each country's difficulty as a small label: سهلة / متوسطة / صعبة / صعبة جدًا (illustrative: مصر صعبة, ليبيا صعبة جدًا, تونس صعبة جدًا, اليمن صعبة جدًا, سوريا صعبة, السعودية متوسطة, الإمارات not listed, تركيا متوسطة, الولايات المتحدة سهلة, الصين سهلة, روسيا متوسطة, إيران صعبة, العراق صعبة جدًا, الأردن متوسطة, السودان صعبة جدًا).
- A selected-country card: flag, "مصر", القائد "حسني مبارك", نظام الحكم "جمهورية رئاسية", السكان "83 مليون", الناتج "219 مليار $", الاستقرار "58%", الصعوبة "صعبة" (amber), and one line "تحذير: بطالة الشباب مرتفعة واحتجاجات محتملة". Values are illustrative.

## Page 3: إعدادات الحملة (step 3)
- الوضع (segmented, 4 options): واقعي (selected, default, with a small note "الوضع الموصى به"), قوي، قوة عظمى، God.
- ذكاء الدول الأخرى (segmented, 4 options): سهل، متوازن (selected)، صعب، خبير. One line under it: "الصعوبة تغيّر ذكاء القرارات فقط، بدون غش."
- خيارات غير واقعية (اختيارية), visibly separated and off by default, each a 32 pt toggle row: أموال غير محدودة، موارد غير محدودة، بناء فوري، بحث فوري، استقرار كامل. A small amber note: "تفعيلها يخرج اللعبة عن الواقعية".
- A summary line: "مصر · 1 يناير 2011 · واقعي · ذكاء متوازن" and the primary button "ابدأ الحملة".

## Output
- Work only in your own folder. Render with Playwright (NODE_PATH=tools/node_modules; browser from the CHROMIUM_PATH environment variable when set, args ['--no-sandbox']) at deviceScaleFactor 3 for `i16promax` (the user's iPhone 17 Pro Max) and `se`. Files: `i16promax.png`, `se.png`.
- Inspect every PNG with the Read tool; fix clipping, overlaps, RTL mistakes, safe-area violations and unreadable text; repeat at least twice.
