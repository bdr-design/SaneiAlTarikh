# Screen 4 brief: province panel (لوحة المحافظة)

## Approved design (2026-10-20): variant R, from the owner's two reference images
The owner rejected the first three variants and eleven styles, then sent two images of the panel they want: an overview, and the details' governance tab. On «شوف المناسب اللي مايثقل على اللعبة وسوه» the panel was built from them as `../screen4/R`. After «لابد التركيز يكون الخريطة هي مركز الاساس» it became two steps, and the owner approved it («ممتاز»). **Where this section and the original brief below disagree, this section wins.**

- **Step 1: the card.** Tapping a province opens a 320 pt card at the top right. The map stays the centre, and the whole HUD, dock included, keeps its B3 place.
  - Contents: the header, the 3 headline numbers with a monthly rate and «لماذا؟», the 2x2 status table, and «تفاصيل المحافظة».
  - The card is as tall as its content and ends at least 8 pt above the dock.
  - It takes the loosest fit level at which it ends there: 0 on most phones, up to 2 on the 13 mini, so the header stays 56 pt.
- **Step 2: the details.** «تفاصيل المحافظة» opens the full-height sheet, with 4 tabs: الحكم, الإنشاءات, القوات, السياسات.
  - Only «الحكم» is designed so far. It holds:
    - the governor and «تغيير»;
    - the development priority and the tax burden, each as 3 radios;
    - two link rows;
    - a proposed decision with «اعتماد البرنامج» and «تأجيل».

    Each section is ruled off with a hairline.
  - The two action rows of the owner's overview image move into the tabs: «توسعة شبكة الكهرباء» to الإنشاءات, «دعم الخدمات الأساسية» to السياسات. They are designed with those tabs.
  - The body scrolls inside the sheet, with a 24 pt fade on any edge that hides content.
  - While the bottom edge hides content, a small chevron marks it. After the screen 5 review (2026-10-21), the chevron sits in a clear 22 pt strip under the bottom fade, so it never covers content. Only the mask changes, never the layout.
  - The header keeps the card's 56 pt (fit level 0).
- **Geometry of the details sheet:**
  - It runs from 8 pt under the top row down to the dock line.
  - Width is clamp(43% of the safe width, 340, 380) pt. Where the dock would just miss the room beside the sheet, the sheet narrows to make room, down to 330 pt (335 on the 15/16).
  - The dock moves to the left end of its line, 4 pt in and 8 pt clear of the sheet. On the 375 pt phones (SE, 13 mini) it cannot fit, so it hides while the details are open.
- **Look:**
  - The panel is opaque (D-3).
  - The header is a satellite strip of the province.
  - The selected province gets a blue-violet halo, a faint fill and a white ring with a white name pill. At the country zoom Cairo is smaller than its ring, so no outline is drawn.
  - Teal marks selected states: the open tab, the chosen radio, the «العاصمة» chip. Actions are outlined in blue (`#6FB6FF`) with cyan (`#7FE9FF`) text, and «لماذا؟» is cyan.
  - The dark HUD stays (the owner left the choice to Claude). Digits are Western; money is in US dollars.
- **Panel sizes added to the tokens.** Spacing stays on the 4/8/12 scale, plus 2 pt between stacked text lines and a 16 pt status-column gap.
  - Cards: radius 10. Inner tiles, chips and small buttons: radius 6 (concentric).
  - Small outlined buttons and chips: 24 pt tall.
  - Radio rows: 26 pt. Tabs and link rows: 44. «تفاصيل» row: 36.
  - Every control keeps a 44 × 44 pt hit box.
  - 18 pt bold is for the province name and the 3 headline numbers. Since screen 6 (2026-10-21, under the owner's delegation), it also covers a tab's own summary numbers, such as the budget's revenue, spending and deficit. They are never shown with the headline numbers.
- **Light build rules for the app** («مايثقل على اللعبة»):
  1. **No blur anywhere.** The panels are opaque (D-3).
  2. **No masks on scrolling content.** An edge fade is a 24 pt gradient overlay from the panel colour to clear, drawn above the scroll view, with hit testing off. It shows only while that edge hides content. It looks the same as the mockup's mask, which only reveals the same opaque panel colour. At the bottom, the overlay ends in a 22 pt band of solid panel colour that holds the scroll hint.
  3. **The header strip is a crop of the map imagery already in memory.** It is not a separate photo per province.
  4. **The province highlight is one pre-rendered halo sprite plus the ring,** drawn only for the selected province.
  5. **The fit level is a lookup from the safe height and the insets.** It is computed once at launch and again on an inset change, with no trial-layout loop and no re-fit per province or per tick.
  6. **The card appears over the live map without moving the camera.**
- **Changes carried over from the screen 5 review (2026-10-21)**, through the shared files:
  - the scroll hint's clear strip (above);
  - the first action's accent bar runs on the card's straight edge, inset 8 pt from the corners;
  - a map label that the screen edge or the side inset (the notch, the Dynamic Island) would slice is hidden, like a label a panel cuts;
  - the fit levels gain a step for the state panel (0 to 6). The card still uses 0 to 2.
- **Gate:**
  - `R/_build/render.js` checks all 7 phones.
    - It saves 3 views: card, details, and details at the end of the scroll.
    - It also checks the details at the middle scroll offsets those views leave out.
    - Every string of the details must be shown whole and clear of the fades in one of these views.
  - Before it judges anything, it re-runs `assemble.py` and refuses an `index.html` that differs.
  - `--selftest` plants defects and must catch every one.
  - `python3 -I tools/check_screen.py design/screen4/R` must PASS. The gate:
    - recomputes the input hash over the sources, the base page, B3, `devices.json` and every file the pages load;
    - matches each phone with `devices.json`;
    - requires every view clean and a passing self-test made from the same files.
- **Engine follow-up:** the governor, the development priority and the per-province tax burden have no model in `final_design.md` yet. See its §6.1 note. Values are illustrative.


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
