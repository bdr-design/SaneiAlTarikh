# Screen 4 brief: province panel (لوحة المحافظة)

Visual mockups for the owner to choose from. NOT app code.

## When it appears
The player taps a province on the main play screen. The panel opens over the play screen. The map stays visible, the tapped province is highlighted, and the rest of the HUD stays where it is.

## Base: the approved play screen, with opaque panels (decision D-3)
- Copy `../screen1/B3/index.html` into your own folder and build on it. Keep its responsive system: device presets from URL parameters (w, h, side, bottom, cutout), the drawn island or notch, the home indicator, rounded corners and the HUD.
- **Panels are opaque (D-3, confirmed):** solid `rgb(12, 20, 28)`, border 1 px `rgba(127, 233, 255, 0.14)`, no blur, no transparency. Apply this to the HUD too, exactly as `../proposals/D3_panels/opaque.html` does: `.glass` with no backdrop-filter, `.frost i` hidden, and `.frost::after` filled with the opaque colour.
- **Tokens:**
  - Control heights 32, 36 or 44 pt only. Spacing 4, 8 or 12 pt only. Radius 10 for controls, 12 for cards and panels.
  - Type sizes:
    - 10
    - 11.5
    - 13 semibold tabular
    - 14 bold
    - 18 bold, for the province name only
  - Text `#EAF2F7` / `#A9BCCB`. Cyan `#7FE9FF`, teal `#3FE0D0`, amber `#F2B14C`, red `#F2705A`, positive blue `#6FB6FF`. Never use colour alone; pair it with an arrow or an icon.
  - Contrast at least 4.5:1. Every hit area at least 44 × 44 pt, with no overlaps.
  - Nothing inside the side safe insets. Nothing tappable in the bottom inset.
- Font "IBM Plex Sans Arabic". `<html lang="ar" dir="rtl">`. Western digits. No emoji. Icons are inline stroke SVG, 16 pt, stroke 1.75.

## Content (values are illustrative until the data pipeline fills them)
The province is **القاهرة** (Cairo Governorate), Egypt, on Saturday 1 January 2011.

1. **Header**
   - Province name «القاهرة», plus a small «العاصمة» star chip.
   - A line with Egypt's flag (`../shared/flags/eg.svg`, 4:3) and «مصر».
   - A close button, 44 pt hit area.
2. **Status of the province** (from the engine's five fields; must also work for disputed or occupied provinces)

   | Field | Value |
   |---|---|
   | السيادة (sovereign) | مصر |
   | الإدارة (administrator) | حكومة مصر |
   | السيطرة (controller) | الحكومة · 100% |
   | المطالبات (claims) | لا توجد |
3. **Headline numbers**, at most 3. Each has a trend arrow and a «لماذا؟» link to the why-sheet.
   - السكان «8.8 مليون» (flat)
   - الاضطراب «64» (up, amber; Cairo in January 2011)
   - البنية التحتية «8 / 10» (flat)
4. **Details**, grouped:
   - **Population and society:**
     - Urban share «100%».
     - Groups: «مسلمون سنة 90% · مسيحيون أقباط 10%», as a slim stacked bar with labels.
   - **Economy:**
     - «نحو 22% من ناتج مصر».
     - Main activities «خدمات · صناعة · سياحة».
   - **Politics:**
     - Ruling party in the province: «الحزب الوطني الديمقراطي».
     - Support «حاكم».
   - **Security:**
     - Forces present «أمن داخلي · فرقة واحدة».
     - Control «100%».
5. **Actions**, as action rows. Each shows its cost and an effect preview before the player confirms.
   - «مشروع بنية تحتية»: cost «0.8 مليار $ · 24 شهرًا», effect «+1 بنية تحتية».
   - «دعم الخدمات»: cost «0.3 مليار $», effect «−5 اضطراب».
   - «تعزيز الأمن»: cost «0.2 مليار $ / سنة», effect «−8 اضطراب · −3 شرعية» (the legitimacy cost in amber).
6. **Map:**
   - Cairo is highlighted (teal outline, like the player country, but tighter).
   - Egypt's outline stays visible.
   - The panel must not cover Cairo or the Nile delta. Move the map so Cairo stays in view beside the panel.

Not everything has to be visible at once. Tabs, sections or a scroll are allowed, but the header, status, headline numbers and the first action must be visible without scrolling on the iPhone 17 Pro Max.

## Panel geometry (design document §6.5)
- Side sheet from the right (RTL start).
- Width = clamp(42% of the safe width, 340, 440) pt. That is about 349 pt on the 17 Pro Max.
- The panel may cover the right part of the HUD's indicator row if the design explains how the HUD adapts. Otherwise keep the top row visible.
- A variant may propose a different form, such as a bottom card, if it keeps the map dominant. Say why.

## Do not
- No fake status bar, no lorem ipsum, no emoji.
- No features beyond this list.
- Nothing that covers Cairo.

## Output
- Work only in your own folder `design/screen4/<variant>/`.
- Render with Playwright at device scale factor 3 for `i16promax` (the owner's iPhone 17 Pro Max) and `se`. Files: `i16promax.png` and `se.png`.
  - Set `NODE_PATH` to the tools `node_modules` path given in your task.
  - Read the browser from the `CHROMIUM_PATH` environment variable, args `['--no-sandbox']`.
- Keep a `_build/render.js` that runs automatic checks and writes `_build/report.json` with an `issues` list per device, like `../screen3/p3B/_build/render.js`. The checks cover: tokens, 44 pt hit boxes without overlap, safe areas, overlaps, clipped text and contrast.
- Look at every PNG with the Read tool. Fix clipping, overlaps, RTL mistakes, safe-area violations and unreadable text. Repeat at least twice.
