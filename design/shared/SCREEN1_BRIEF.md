# Screen 1 brief: main play screen (صانع التاريخ)

This is a visual mockup for the user to approve before anything is built. It is NOT app code.

## Device and canvas
- iPhone, landscape only. Canvas 844 x 390 CSS px (points). Render at deviceScaleFactor 3.
- Safe areas in landscape: keep every control and every text at least 52 px from the LEFT and RIGHT edges (Dynamic Island and rounded corners can be on either side). Keep controls out of the bottom 21 px (home indicator). The map itself is full-bleed under everything.
- Status bar is hidden in landscape. Do not draw a fake status bar.

## Background map (approved style "D1", do not change its look)
- Two stacked layers in the same box: `../shared/map_mena_d1.jpg` (satellite base, 1688 x 1097 px) and `../shared/map_mena_d1_overlay.svg` (borders, labels, Egypt glow; same 1688 x 1097 size and alignment).
- Egypt (the player's country) centre is at about pixel (735, 545) in those 1688 x 1097 images. Scale and position both layers identically (same CSS box, `position:absolute`) so Egypt sits slightly right of the screen centre (RTL reading starts right) and the Mediterranean, Levant and Arabian Peninsula stay visible. A scale between 0.6 and 0.8 of the image size looks good.
- The map must stay dominant: UI chrome covers at most about 25-30 % of the screen area.

## Language and type
- Arabic UI, `<html lang="ar" dir="rtl">`. Western digits (123). `font-variant-numeric: tabular-nums` for numbers.
- Font: `font-family: "IBM Plex Sans Arabic", system-ui, sans-serif;` (installed locally; stand-in for the iOS system Arabic font). Minimum text size 11 px; main values 13-16 px.
- No emoji anywhere. Icons: simple inline stroke SVG (stroke-width 1.75, round caps/joins, 20-22 px), drawn by you.

## Style tokens (operations room, comfortable for the eyes)
- Glass panels: background `rgba(9, 17, 25, 0.74)`, `backdrop-filter: blur(14px)`, border `1px solid rgba(127, 233, 255, 0.16)`, radius 12-14 px, soft shadow `0 6px 24px rgba(0,0,0,0.35)`.
- Text: primary `#EAF2F7`, secondary `#A9BCCB` (must keep >= 4.5:1 on the glass), muted labels at least `#8FA5B6` on dark only.
- Accent (interactive, selected): cyan `#7FE9FF`, teal `#3FE0D0` (the player's country colour on the map).
- States: warning amber `#F2B14C`, danger `#F2705A`, positive blue `#6FB6FF` (never rely on colour alone: pair with an arrow or icon).
- Touch targets at least 44 x 44 px for every tappable control.

## Content that MUST be on the screen (values are illustrative until the data pipeline fills them)
1. Nation identity: Egypt flag `../shared/flag_eg.svg` (keep its 4:3 ratio), name "مصر", leader "حسني مبارك", regime "جمهورية رئاسية". Tapping it opens the State panel.
2. Date "السبت 1 يناير 2011" and speed controls: إيقاف (pause), 1×, 2×, 5×, 10×, أقصى. Current speed 1× is selected and the game is running.
3. Six key indicators, each with an icon, value and a small trend arrow:
   - الخزينة 36.0 مليار $ (down, amber)
   - الاستقرار 58% (down, amber)
   - الشرعية 44 (down, amber)
   - القوة البشرية 2.4 مليون (flat)
   - النفوذ 62 (up, blue)
   - البحث +18 / شهر (up, blue)
4. Section navigation, 8 entries with icon AND label (labels can be small): الدولة، الاقتصاد، الداخلية والسياسة، الجيش، الخارجية، الاستخبارات، البحث، المزيد.
5. Notifications button with badge "3", plus a compact preview of the top alert: "احتجاجات واسعة في تونس" (amber).
6. Map controls: map-mode button showing the current mode "الخريطة: سياسية"; a "دولتي" (centre on my country) button. Zoom is by pinch, so no +/- buttons are needed.

## Do not
- No web scrollbars, no hover-only UI, no lorem ipsum, no invented extra stats beyond the list above, no other countries' flags.
- Do not cover Egypt or the Nile with panels.

## Output
- Write your files only in your own variant folder (given in your task). Use relative paths to `../shared/`.
- `index.html` (self-contained apart from the shared files) and `screen.png` rendered with:
  `node tools/render_screen.js index.html screen.png 844 390 3` (run it from your variant folder; NODE_PATH is not needed because the script lives next to its node_modules; if `require('playwright')` fails, run it with `NODE_PATH=tools/node_modules`).
- Look at your own `screen.png` with the Read tool and fix clipping, overlaps, wrong RTL order, unreadable text and safe-area violations. Repeat render -> look -> fix at least twice.
