# Screen 2 brief: main menu (القائمة الرئيسية)

This is a visual mockup for the user to approve before anything is built. It is NOT app code.

## Reuse the approved system from screen 1
- The approved main play screen is `../screen1/B3/` (index.html, renders, `_build/render.js`, `_build/overview.js`, `_build/devices.json`). Copy its responsive system: device presets from URL parameters (w, h, side, bottom, cutout), the drawn island/notch and home indicator, rounded screen corners, the `frost()` glass technique, and the same tokens:
  - glass `rgba(9,17,25,0.66)` + blur, 1 px border `rgba(127,233,255,0.14)`, radius 10 (controls) / 12 (bars, cards);
  - control heights 32 / 36 / 44 pt only; spacing 4 / 8 / 12 pt only;
  - type sizes 10, 11.5, 13 semibold tabular, 14 bold, plus ONE display size for the game title wordmark only (between 30 and 40 pt, IBM Plex Sans Arabic Bold);
  - text primary `#EAF2F7`, secondary `#A9BCCB`; accent cyan `#7FE9FF`, teal `#3FE0D0`; contrast >= 4.5:1; 44x44 pt hit areas that do not overlap.
- Font "IBM Plex Sans Arabic" (installed), `<html lang="ar" dir="rtl">`, Western digits. No emoji; icons inline stroke SVG 16 pt, stroke 1.75.

## Background
- `../shared/menu_background.png` (1672 x 941, an operations room at night; its right third is darker and is meant to hold the menu). Cover the screen (object-fit cover). You may add a subtle dark gradient for legibility, but the room must stay recognisable. Do not blur the whole image.

## Content (all required)
1. Game title wordmark "صانع التاريخ" and a small subtitle "استراتيجية عالمية · من 2011 إلى 2100".
2. "متابعة" (continue) as the primary action, showing the last save: Egypt flag `../shared/flag_eg.svg`, "مصر", "14 مارس 2011", "حفظ تلقائي · قبل 3 دقائق".
3. "لعبة جديدة".
4. "تحميل لعبة".
5. "الإعدادات".
6. "المصادر وحقوق البيانات" (required because the game credits its data sources).
7. A tiny version label "الإصدار 0.1".

## Do not
- No fake status bar, no lorem ipsum, no extra features not listed, no social or store buttons.

## Output
- Work only in your own folder. Render with Playwright (NODE_PATH=tools/node_modules, browser from the CHROMIUM_PATH environment variable when set, args ['--no-sandbox']) at deviceScaleFactor 3 for three devices from `../shared/devices.json`: `i16promax` (the user's own phone, iPhone 17 Pro Max), `i14`, and `se`. Name them `<id>.png`.
- Look at each PNG with the Read tool and fix clipping, overlaps, RTL mistakes, safe-area violations and unreadable text. Repeat at least twice.
