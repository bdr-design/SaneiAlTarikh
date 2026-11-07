# Screen 17 brief: the «لماذا؟» (why) sheet

Visual mockup. NOT app code. The build is `../screen17/A`. Task card: `tasks/T-017_screen17_why.md`. Designed and
approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`), to the owner's rule `mapCentral`.

## The moment
1 January 2011, the game paused. The player taps the HUD's «الاستقرار» chip (58%, arrow down). The same sheet opens from
the state panel's «لماذا؟ الاستقرار».

## Frame
The approved panel sheet from the right (shared builder and checker), the map central with Egypt clear; one body, no tab
row, no section (its own identity (sheetIdentity), no dock item open). The HUD chip «الاستقرار» is shown as the one that opened it
(aria-expanded). The clock shows play (paused).

## Content
Header: Egypt's flag, «الاستقرار», «لماذا؟ · الآن 58% · يتجه إلى 56%» (a short title: the header strip is lighter further left), the anchor emblem (the chip's icon), close.
Status cells: الآن 58% · الهدف 56% · التغير −1 شهريًا (amber, arrow down) · يصل خلال نحو شهرين (58 إلى 56 بـ −1 شهريًا).
- **الأساس:** «مستوى البداية» · «مصر في 2011 · يتلاشى ببطء» · 55.
- **ما يرفعه:** الأمن والشرطة «الإنفاق الأمني» +8 · دعم الخبز والوقود «من الموازنة» +5 · النمو الاقتصادي «5.1% سنويًا» +3.
- **ما يخفضه:** الشرعية «44 / 100» −5 · الاضطرابات «45 / 100» −4 · البطالة «8.9%» −3 · التضخم «10.3%» −2 ·
  احتجاجات تونس «في الجوار» −1.
- **The sum:** «يتجه إلى» · «55 + 16 − 15» (shown, in the secondary grey) · 56%; VoiceOver «المجموع: يتجه إلى 56%، من 55 نقطة، ترفعه 16 نقطة وتخفضه 15 نقطة».
- A link row: «لوحة الدولة» · «الاستقرار والشرعية» (opens the state panel).
A rise is blue with an up arrow, a fall amber with a down arrow (colour never alone); rows sorted by size within each
section. Up to 12 terms; a 13th and beyond fold into one «أخرى» row (the sum stays exact). Later (D-6): a money value's
sheet adds its constant 2011 USD line.

## Gate
`screen17/A/_build/render.js` uses the shared checker and adds: the paused clock and the chip shown open; the sections in
order; each term's sign, arrow and colour; the order by size; the starting level plus the terms = the target = the
header's and the cells' target; the values agree with the HUD (58%) and the other panels (44, 45, 8.9%, 10.3%, 5.1%);
at most 12 terms, the starting level included; every term row read whole; the values read from the approved panels' sources. `--selftest` and `check_screen.py` must pass. Three independent read-only
reviewers (checker and consistency; what the player sees; dimensions and the formatting of text and boxes).
