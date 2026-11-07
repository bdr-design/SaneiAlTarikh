# Screen 7 brief: the economy adjusters («الضبط»)

Visual mockups. NOT app code. The build is `../screen7/A`. Task card: `tasks/T-006_screen7_adjusters.md`. Designed under the owner's standing delegation («قلتلك انت تولى كل شي»).

## When it appears
The player taps a line in the economy panel (screen 6, approved): a budget line, a tax, a subsidy, or «السياسة النقدية والعملة». The overview's «خفض دعم الوقود 10%» opens the fuel adjuster with the cut preset. The adjuster opens **inside the same sheet as a pushed view**, so the map stays the centre:
- the header stays at its compact height (fit level 6, 44 pt), as iOS shows a pushed view's bar under a large-title root; the economy tabs keep their own level;
- the back control and the item's title share the row where the tabs were;
- the body holds the value block, the stepper and the effects;
- a fixed footer keeps the timing and the two buttons in view.

**Navigation rules (after the review, 2026-11-02):**
- The back control names where the player came from. From a row it names that row's tab, and the adjuster opens with new = current. From the overview's shortcut it names «نظرة عامة» and opens with the shortcut's preset. The rendered views show each adjuster after some taps (the subsidy view after the shortcut).
- Back and «إلغاء» both leave without committing; «إلغاء» sits beside «اعتماد» so the choice is explicit. The header's × closes the whole sheet, also without committing.

## Base
The approved panels, all read by the assembler:
- `screen4/R/_build/panel.css`: the look, sizes and levels;
- `shared/section_identity.css`: the identity and the white touches;
- `screen5/A/_build/state.css`: the notes, the segments and the states switch;
- `screen6/A/_build/econ.css`: the economy rules;
- the header markup, taken from screen 6's sheet.

The section identity (الاقتصاد, emerald) stays on chrome only: the top line, the emblem and the dock item.

## Layout (RTL)
1. **The back row** (45 pt with its rule):
   - at the leading edge (right), the back control: a chevron pointing back (right) and the name of where it returns, 13 pt semibold, with a 44 pt control. Its VoiceOver label says «رجوع إلى …».
   - at the trailing edge (left), the item's title at 14 pt bold and under it a short note at 10 pt in grey, as an iOS pushed view's bar holds both.
2. **Value block** on one line:
   - «الحالي» and the current value, 13 pt semibold grey;
   - an arrow with a shaft pointing from current to new (left), not the row chevron;
   - «الجديد» and the new value at 18 pt bold, with an amount's unit once after it;
   - the change as a white-outlined chip: points for a rate, percent for an amount. The noun agrees with the count: 1 نقطة · 2 نقطتان · 3 to 10 نقاط · 11 and more نقطة.
3. **Stepper** (32 pt row):
   - − at the minimum's end (right) and + at the maximum's end (left), each 32 pt with a 44 pt hit box. Their VoiceOver labels say «أنقص …» and «زد …»;
   - the limits beside the buttons;
   - between them a 6 pt track, 12 pt from each limit, with the minimum at the right as RTL sliders do. The track is a slider: it can be dragged (snapping to the step), it has a 44 pt hit box, and VoiceOver reads its range, the new value and the current one and steps it with a swipe up or down. A teal fill and a 20 pt white knob mark the new value. A 2 × 26 pt grey tick marks the current one; it is taller than the knob and painted under it, so it shows above and below the knob at any distance. At either end the knob clears the limit labels.
4. **The effects** (no heading; the footer's «الأثر تقديري» names them, and VoiceOver reads the grid as «الأثر المتوقع»): a 2-column grid of label over value, read right to left.
   - Blue is an improvement and amber a worsening, the panels' meanings. Colour is never the only cue: each value starts with an arrow in its colour showing the way the quantity moves.
   - Every value has an amount and a time frame where it is not a yearly flow («خلال سنة», «خلال 3 أشهر», «بعد 5 سنوات»), so a change is not read as the monthly trends of screens 4 and 6.
   - Amounts carry their units, under 1 billion in millions.
   - VoiceOver reads each effect as one phrase: the label, the value in words with «دولار», and its verdict «أفضل» or «أسوأ».
5. **Money only:** the view is titled «السياسة النقدية والعملة», the row the player tapped, with «فائدة المركزي: الإيداع لليلة واحدة» as its note. Under the effects, a hairline, then «الصرف ورأس المال» with one note («كل تغيير هنا يتم تدريجيًا خلال 6 أشهر، ولا يُعدَّل الإعداد مرة أخرى قبل اكتماله، ولا يكلّف رأس مال سياسي. التحويل الجزئي: للحساب الجاري فقط.») and three rows of screen 5's 3-segment settings, freest on the right:
   - نظام الصرف: حر / مُدار / ثابت (مُدار, screen 6's «تعويم مُدار»);
   - قابلية التحويل: كاملة / جزئية (للحساب الجاري فقط) / معلّقة (كاملة);
   - ضوابط رأس المال: محدودة / متوسطة / مشدّدة (محدودة).
   The rows have no cost line, so they do not read as screen 5's priced laws.
   **A pending change** (`&pending=1`: the regime from مُدار to حر): the new choice is filled white and the current one keeps a white outline, read «مُدار، الحالي»; the effects grid shows the rate's and the float's effects together (التضخم +2.6 نقطة خلال سنة; سعر الدولار بعد 6 أشهر 7.00 جنيه بدل 5.80; الاحتياطي +2.0 مليار $ خلال 6 أشهر, since the pound is no longer defended with reserves; الصادرات +1.6 مليار $ سنويًا) and the footer says when the change lands.
6. **Footer** (60 pt, never scrolls):
   - the timing line: «يبدأ الشهر القادم · تعديل كل 3 أشهر · الأثر تقديري»; for money «الفائدة من الشهر القادم · تعديل كل 3 أشهر · الأثر تقديري», and with a currency setting pending «الفائدة من الشهر القادم · الصرف خلال 6 أشهر · الأثر تقديري»;
   - then «اعتماد» (36 pt, filled white, dark text) and «إلغاء» (36 pt, white outline).
   - **The wait** (`?states=1`, drawn on the tax adjuster): during the 3-month cooldown the line reads «الاعتماد متاح بعد شهرين · الأثر تقديري» and «اعتماد» steps back: grey text with a lock, no fill and no outline, so it no longer reads as a button, and not tappable. The preview still works, so the player can study a change before it is allowed.

   The scroll hint sits in the body's clear strip above the footer.

## Content (Egypt, 1 January 2011; illustrative, agreeing with screen 6)
| View | From → to | Effects |
|---|---|---|
| tax: ضريبة الدخل (الشريحة العليا) | 20% → 25% (+5 نقاط), range 10% to 35% | الإيرادات +300 مليون $ سنويًا; العجز 17.4 مليار $ بدل 17.7; اضطرابات المحافظات الحضرية +1 خلال 3 أشهر; النمو −0.1 نقطة خلال سنة |
| line: التعليم (11% من الإنفاق) | 7.3 → 8.0 مليار $ (+10%), range 3.7 to 11.0 | العجز 18.4 مليار $ بدل 17.7; الدين إلى الناتج +0.3 نقطة سنويًا; العمالة الماهرة +0.3 نقطة بعد 5 سنوات; الشرعية +1 خلال 3 أشهر |
| subsidy: دعم الوقود, from the overview | 11.7 → 10.5 مليار $ (−10%), range 0 to 17.6 (−100% to +50%: a subsidy can be abolished whole; the cap +50% as the line view) | العجز 16.5 مليار $ بدل 17.7; التضخم +0.6 نقطة خلال سنة; اضطرابات المحافظات الأفقر +4 خلال 3 أشهر; الشرعية −3 خلال 3 أشهر |
| money: السياسة النقدية والعملة (فائدة المركزي) | 8.25% → 9.25% (+1 نقطة), range 2% to 20% | التضخم −0.4 نقطة خلال سنة; سعر الدولار بعد 3 أشهر 5.75 جنيه بدل 5.80 (the price of the dollar, so a fall is the pound getting stronger); الفوائد 13.9 مليار $ بدل 13.3; النمو −0.2 نقطة خلال سنة |

**Why these numbers:**
- **Tax:** Egypt added a 25% top bracket in 2011, so 20% → 25% is a real step. Screen 6's personal income tax row (shown with its top rate) yields 3.6 مليار $; 5 more points on the top bracket can add at most 0.9 even if all of it were taxed at the top rate, and the top bracket is a minority of that base, so +300 مليون (with growth −0.1) is the estimate. The top bracket's earners live mostly in Cairo, Giza and Alexandria, so the unrest is in the urban provinces, not the poorest.
- **Education:** the model has three labour skill tiers (§5.2), so the gain is the skilled tier's share, after 5 years.
- **Fuel:** screen 6's rule moves the subsidy line, and so the deficit, by the cut: 17.7 − 1.2 = 16.5.
- **Rate:** the interest line is screen 6's 13.3 (mandatory, never cut by the player, but it moves with the rate), and the exchange rate is its 5.80.
- Every number the checker ties to screen 6 is read from screen 6's sheet, not copied.

**Rules:**
- No adjuster costs political capital, because laws do (screen 5). Budget, tax and monetary settings are the government's fiscal and technical choices; their limits are the cooldown and the effects. The money note says so, since its rows look like screen 5's.
- The limit is a 3-month cooldown per item; a currency setting also waits until its 6-month change is complete.
- The effects are the model's estimate before the change is committed.

## Geometry and fit
- **The sheet:** the economy sheet's rules (width, place, the dock beside it or hidden).
- **What shows without scrolling:** tax, line and subsidy fit whole on all 7 phones. Money scrolls to its settings; its first row of effects (inflation and the price of the dollar, the two a rate decision is judged on) is clear on every phone, and the second may need a short scroll.
- **Signs and numbers:** signs sit inside the left-to-right number spans («+5», «−0.2»), so they stay on the number's left in RTL text.

## Gate
- **`screen7/A/_build/render.js`** is the economy checker, ported. It checks all 7 phones:
  - 8 saved views (tax, line, subsidy, money, money's end, the wait, the pending currency change and its end);
  - every adjuster's end and middle offsets, and every adjuster with its new value at the minimum and at the maximum, without saving PNGs.
- **It checks:**
  - the frame and the identity (any border, outline or shadow in emerald; the emblem's icon; the open dock item's label);
  - the header's measured 44 pt and the back row right under it; tax, line and subsidy fitting whole;
  - the back row: label, place, direction, VoiceOver; the title at the trailing edge, 14 pt bold;
  - each view's rows against this brief, each string matched as an element's whole text;
  - the value block against the stepper's data, its type and colours, the arrow, the unit's place, the chip's number and noun;
  - the knob, tick and fill drawn, in their colours, centred on the track and where the data says; the tick showing past the knob; the knob clear of the limits at both ends;
  - − and + at the right ends with their labels; the slider's role and values;
  - the effects: the grid's layout, colours, arrows and their direction, VoiceOver phrases;
  - the numbers against screen 6, read from its sheet;
  - the money rule over the text as shown; signs inside their numbers and left of them;
  - the settings: freest on the right, the unruled heading;
  - the fixed footer, its order, and the wait;
  - the white touches; the brief's strings per view.
- **Its `--selftest`** plants defects and must catch every one.
- **`python3 -I tools/check_screen.py design/screen7/A`** must PASS.

## Cost (the heaviness review, 2026-11-07; design doc §3.9)
The effects preview uses linear sensitivities per lever, computed once when the adjuster opens (one TermSink pass on the simulation engine's task); each snapped step costs a few multiply-adds and is recomputed only when the snapped value changes. The preview never runs the simulation forward.
