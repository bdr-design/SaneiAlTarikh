# Screen 7 brief: the economy adjusters («الضبط»)

Visual mockups. NOT app code. The build is `../screen7/A`. Task card: `tasks/T-006_screen7_adjusters.md`. Designed under the owner's standing delegation («قلتلك انت تولى كل شي»).

## When it appears
The player taps a line in the economy panel (screen 6, approved): a budget line, a tax, a subsidy, or «السياسة النقدية والعملة». The overview's «خفض دعم الوقود 10%» opens the fuel adjuster with the cut preset. The adjuster opens **inside the same sheet as a pushed view**, so the map stays the centre:
- the header stays, collapsed to its compact height (fit level 6, 44 pt), as a pushed view does on iOS;
- a back control replaces the tab row;
- the body scrolls;
- a fixed footer keeps the timing and the two buttons in view.

## Base
The approved panels, all read by the assembler:
- `screen4/R/_build/panel.css`: the look, sizes and levels;
- `shared/section_identity.css`: the identity and the white touches;
- `screen5/A/_build/state.css`: the notes and the segments;
- `screen6/A/_build/econ.css`: the economy rules;
- the header markup, taken from screen 6's sheet.

The section identity (الاقتصاد, emerald) stays on chrome only: the top line, the emblem and the dock item.

## Layout (RTL)
1. **Back control** (45 pt with its rule; 44 pt control): a chevron pointing back (right) and the name of the tab it returns to. Its VoiceOver label says «رجوع إلى …».
2. **Title** on one line: the item, and a short note in grey.
3. **Value block** on one line:
   - «الحالي» and the current value, in grey;
   - an arrow pointing from current to new (left);
   - «الجديد» and the new value at 18 pt bold, with an amount's unit once after it;
   - the change as a white-outlined chip: points for a rate, percent for an amount.
4. **Stepper** (32 pt row):
   - − at the minimum's end (right) and + at the maximum's end (left), each 32 pt with a 44 pt hit box;
   - the limits beside the buttons;
   - between them a 6 pt track, with the minimum at the right as RTL sliders do. A teal fill and a 20 pt white knob mark the new value, and a 2 × 16 pt grey tick marks the current one.
   - The track reads its range and both values to VoiceOver.
5. **«الأثر المتوقع»:** a 2-column grid of label over value. Blue is an improvement and amber a worsening, the panels' meanings. Amounts carry their units, under 1 billion in millions.
6. **Money only:** «الصرف ورأس المال» holds the exchange regime (ثابت / مُدار / حر) and capital controls (محدودة / متوسطة / مشددة), as screen 5's 3-segment settings. Each is a gradual change over 6 months.
7. **Footer** (60 pt, never scrolls):
   - the timing line: «يبدأ الشهر القادم · مرة كل 3 أشهر · الأثر تقدير»;
   - then «اعتماد» (36 pt, filled white, dark text) and «إلغاء» (36 pt, white outline).

   The scroll hint sits in the body's clear strip above the footer.

## Content (Egypt, 1 January 2011; illustrative, agreeing with screen 6)
| View | From → to | Effects |
|---|---|---|
| tax: ضريبة الدخل (الشريحة العليا) | 20% → 22% (+2 نقطة), range 10% to 35% | الإيرادات +300 مليون $ سنويًا; العجز 17.4 مليار $ بدل 17.7; اضطرابات المحافظات الأفقر +2; النمو −0.1 نقطة |
| line: التعليم (11% من الإنفاق) | 7.3 → 8.0 مليار $ (+10%), range 3.7 to 11.0 | العجز 18.4 مليار $ بدل 17.7; الدين إلى الناتج +0.3 نقطة سنويًا; مستوى التعليم يرتفع خلال 5 سنوات; الشرعية +1 |
| subsidy: دعم الوقود | 11.7 → 10.5 مليار $ (−10%), range 0 to 15 | الوفر 1.2 مليار $ سنويًا; التضخم +0.6 نقطة; اضطرابات المحافظات الأفقر +4; الشرعية −3 |
| money: فائدة المركزي | 8.25% → 9.25% (+1 نقطة), range 2% to 20% | التضخم −0.4 نقطة خلال سنة; النمو −0.2 نقطة; فوائد الدين المحلي +600 مليون $ سنويًا; الجنيه أقوى قليلًا |

**Rules:**
- No adjuster costs political capital, because laws do (screen 5). The limit is a 3-month cooldown per item, plus the effects.
- The effects are the model's estimate before the change is committed.

## Geometry and fit
- **The sheet:** the economy sheet's rules (width, place, the dock beside it or hidden).
- **What shows without scrolling:** on the 17 Pro Max the tax, line and subsidy bodies fit whole. The money body, and every body on the smaller phones, scrolls between the back control and the footer, with the fades and the hint.
- **Signs and numbers:** signs sit inside the left-to-right number spans («+2», «−0.1»), so they stay on the number's left in RTL text.

## Gate
- **`screen7/A/_build/render.js`** is the economy checker, ported. It checks all 7 phones:
  - 5 saved views (tax, line, subsidy, money, money's end);
  - every adjuster's end and middle offsets, without saving PNGs.
- **It checks:**
  - the frame and the identity;
  - the back control: label, direction, VoiceOver;
  - each view's rows against this brief;
  - the value block against the stepper's data;
  - the knob, tick and fill drawn where the data says;
  - − and + at the right ends;
  - the change in words;
  - the effects' colours;
  - the numbers against screen 6: the new deficit, the debt share, the saving;
  - the money rule;
  - the fixed footer;
  - the white touches;
  - the brief's strings per view.
- **Its `--selftest`** plants defects and must catch every one.
- **`python3 -I tools/check_screen.py design/screen7/A`** must PASS.
