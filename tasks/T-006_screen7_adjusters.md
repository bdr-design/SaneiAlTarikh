# T-006: Screen 7, the economy adjusters («الضبط»)

## Goal
The view a player gets when they tap a line in the economy panel (screen 6, approved): a budget line, a tax, a subsidy, or «السياسة النقدية والعملة». It shows:
- the current value and the new one;
- a control to change the value;
- the expected effects, before anything is committed;
- when the change starts, and how often it can be made;
- a way to confirm or to cancel.

The map stays the centre, so the adjuster opens inside the same side sheet, as a pushed sub-view with a back control. The build is `design/screen7/A`. Under the owner's delegation, Claude designs, reviews, approves and moves it to `main`.

## Scope
- **In scope:** four kinds, one shared layout. Each has a view (`?adjust=`):
  - **tax:** income tax, top bracket, 20% → 22%;
  - **line:** the education line, 7.3 → 8.0 مليار $ (+10%);
  - **subsidy:** the fuel subsidy, 11.7 → 10.5 مليار $ (−10%). The overview's «خفض دعم الوقود 10%» opens this view with the same numbers.
  - **money:** the central bank's rate 8.25% → 9.25%. The exchange regime and capital controls are shown with their current setting.
- **Out of scope:** the «لماذا؟» sheet (its own screen). Province-level effects on the map. Multi-step budget plans.

## Acceptance criteria
1. **Same frame as the approved panels:**
   - the full-height sheet, with the header of screen 6;
   - the section identity (emerald) and the white touches;
   - the dock and HUD as on screen 6;
   - Egypt clear.
2. **A back control** replaces the tab row, names the tab it returns to, and keeps a 44 pt hit box.
3. **The value block:**
   - the current and the new value, RTL;
   - a stepper (− and +, 44 pt hit boxes) and a range track showing the minimum, the maximum, the current mark and the new mark;
   - the change in words («+2 نقطة», «+10%»).
4. **The effects block («الأثر المتوقع»):**
   - one row per effect, in amounts with units;
   - blue for an improvement and amber for a worsening, the panel's meanings;
   - the numbers agree with screen 6. For example, the fuel cut saves 1.2 of the 11.7 line, and the tax change moves the deficit from 17.7.
5. **A fixed footer** that never scrolls away:
   - when the change starts and how often it can be made;
   - «اعتماد» (filled white primary) and «إلغاء» (white outline).
6. **The rest of the gate:**
   - the body scrolls where it must, with the fades and the scroll hint in its strip, above the footer;
   - every string is shown clear in some view;
   - the gate passes on 7 phones;
   - the self-test catches every planted defect.
7. **Text and accessibility:**
   - Arabic RTL, Western digits, US dollars, millions under 1 billion;
   - VoiceOver labels for the stepper buttons, the track and the effects.
8. **Independent read-only review,** every confirmed finding fixed.

## Evidence
- **The model (`final_design.md` §5.1):**
  - **Revenue:** income, corporate and consumption taxes, tariffs, royalties and aid, with a tax-capacity cap.
  - **Spending:** 9 lines, with interest mandatory.
  - **Inflation:** 0.7·last month + 0.3·(money-base growth − real growth) + 0.2·output gap + import pass-through.
  - **The monetary parameter set:** regime, convertibility and capital controls, changed as a gradual reform.
- **The unrest target (§5.2):**
  - it includes a food and fuel price shock (10) and a fall in living standard (20);
  - it relaxes over about 3 months;
  - legitimacy enters with −0.5·(legitimacy − 50).

  So a fuel-subsidy cut raises unrest in the poorest provinces and costs legitimacy, as screen 6's chip says.
- **The effect sizes here are illustrative.** They have the right sign and a sensible order of magnitude for Egypt in 2011:
  - a 10% fuel cut, 1.2 مليار $ a year, would add about 0.5 to 1 point of inflation through pass-through;
  - a 1-point rise in the policy rate lowers inflation over about a year and raises the interest bill on the domestic debt.

## Still assumptions
- **No adjuster costs political capital.** Laws do (screen 5); budget and tax settings are fiscal choices, limited by a cooldown (once every 3 months) and by their effects. To be confirmed when the engine's lever list is written.
- **The effect preview runs the model ahead** for the affected step only, as a point estimate. The app may show a range later.

## Test
- **`render.js`** for all 7 phones and the 4 views, including the middle scroll offsets. It checks:
  - the frame;
  - the back control;
  - the stepper and the track;
  - the effects' colours and units;
  - the numbers agreeing with screen 6;
  - the footer staying fixed;
  - VoiceOver labels.
- **`--selftest`** and **`check_screen.py`**.

## Risks
- **The small phones:** the sheet is short on the SE and the 13 mini, so the body scrolls behind a fixed footer. The hint and fades must sit above the footer.
