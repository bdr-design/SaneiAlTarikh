# Screen 6 brief: the economy panel («الاقتصاد»)

Visual mockups for the owner. NOT app code. The build is `../screen6/A`. The owner went ahead with the proposal (`../proposals/S6_economy`) on 2026-10-21 («اعتمد كل شي»). Task card: `tasks/T-005_screen6_economy.md`.

## When it appears
The player taps «الاقتصاد», the second item of the section dock. The panel opens as the same full-height side sheet as the approved state panel (`SCREEN5_BRIEF.md`). The map stays visible and Egypt stays clear of every panel. The dock item «الاقتصاد» shows the open section.

## Base
- **Look:** the approved panels. The assembler reads three CSS files:
  - `screen4/R/_build/panel.css`: the look, the sizes and the fit levels;
  - `screen5/A/_build/state.css`: the note style and the later-states rules;
  - `shared/section_identity.css`: the section identity and the white touches.

  So the look, the sizes, the levels and the identity cannot drift. The scrolling-tab and display rules are keyed to tab names in `state.css`, so `econ.css` declares them again for this panel's tabs. They should move to one shared rule when a shared change next re-renders the state panel.
- **Section identity:** الاقتصاد is emerald `#43C08A`. It appears only on chrome:
  - the 2 pt top line;
  - the header emblem;
  - the open tab, with its underline and a faint fill;
  - the dock item, with its underline.

  Everything else stays neutral:
  - the closed tabs are grey, and the closed dock items are as on B3;
  - no data text, border, fill or icon takes the section colour;
  - **the share bars are data, so they are teal.**
- **White touches:** white tile icons, white-outlined chips and header chip. A chip that warns of a cost in legitimacy is amber, with its down arrow.

## Content (Egypt, 1 January 2011; values are illustrative, in US dollars, D-6)
The numbers agree with each other. The sources are in T-005: Egypt's FY2009/10 budget outturn, CBE, CAPMAS, World Bank and S&P.

- **Header:** flag, «الاقتصاد», the chip «الجنيه المصري», and «مصر · السنة المالية 2010/11». The emblem and the close button.
- **Tabs:** نظرة عامة / الميزانية / الضرائب والدعم / التجارة والعملة (icons: grid, pie, percent, ship). The columns follow their labels, because the last two labels are long.
  1. **نظرة عامة:**
     - **Headline numbers**, each with «لماذا؟»:
       - الناتج المحلي 219 مليار $ (rising-chart icon), +5.1% سنويًا;
       - التضخم 10.3% (amber, price-tag icon), +0.1 نقطة شهريًا;
       - البطالة 8.9%, دون تغير.

       The flame stays the unrest icon, as on the province panel.
     - **Status table:** عجز الموازنة 8.1% من الناتج (amber), الدين العام 73%, سعر الصرف 5.80 جنيه للدولار, التصنيف BB+ مستقر.
     - **Two decisions:**
       - «طرح سندات دولية»: 1 مليار $ · فائدة 6.2% · 10 سنوات, chip «تمويل العجز».
       - «خفض دعم الوقود 10%» (fuel-pump icon): saves 1.2 مليار $ a year, which is 10% of the 11.7 fuel row. It has the amber chip «الشرعية ↓». It is a shortcut to the fuel row's command: one command, one effect.
  2. **الميزانية:**
     - **Summary:** each label above its 18 pt number: الإيرادات 48.6, الإنفاق 66.3, العجز 17.7 (amber, unsigned like the overview's «عجز»), مليار $ سنويًا. These are 22.2%, 30.3% and 8.1% of GDP.
     - **The treasury:** «الخزينة 36.0 مليار $ · تنقص 1.5 مليار $ شهريًا» (amber), the HUD's value falling by the deficit over 12 months.
     - **The spending lines** are 44 pt cards, each with its share and a teal bar relative to the largest line:

       | Line | Amount (مليار $) | Share |
       |---|---|---|
       | الدعم والحماية الاجتماعية | 17.2 | 26% |
       | الفوائد (locked) | 13.3 | 20% |
       | الإدارة العامة | 9.9 | 15% |
       | التعليم | 7.3 | 11% |
       | الاستثمار العام | 7.3 | 11% |
       | الدفاع | 4.0 | 6% |
       | الأمن الداخلي | 3.3 | 5% |
       | الصحة | 3.3 | 5% |
       | البحث العلمي | 700 مليون $ | 1% |

     - **Locks and adjusters:** interest is mandatory, so its card shows a lock instead of the chevron and it is not a control. Every other line opens its adjuster, designed next.
     - **One owner for each sum of money:**
       - the three subsidy rows of the next tab own their 15.5, and a change there moves the 17.2 line by the same amount;
       - this line's adjuster sets only the rest, 1.7 of social protection.
     - The note: «الفوائد لا تُخفَّض، ودعم الوقود والخبز والكهرباء يُعدَّل من تبويب الضرائب والدعم.»
  3. **الضرائب والدعم:**
     - **Taxes** (rate and yield):
       - income 20% (top bracket), 3.6;
       - corporate 20%, 11.6;
       - sales 10%, 12.2;
       - customs 5%, the effective rate (2.7 of goods imports of 52.9), 2.7.
     - **Subsidies:** the amount and its unit beside the value: fuel 11.7 مليار $, bread and rations 2.9 مليار $ (63 million beneficiaries), electricity 900 مليون $. Together 15.5, which fits inside the 17.2 line.
     - **One note at the end:** the taxes are 30.1 of the 48.6 revenue, and the rest comes from the canal, petroleum and grants. A tax rise or a subsidy cut raises unrest in the poorest provinces first.
  4. **التجارة والعملة:**
     - **Status table** (3 rows): a managed float, fully convertible (قابلية التحويل: كاملة), reserves of 8 months of imports, limited capital controls (ضوابط رأس المال: محدودة), the central bank's rate 8.25%, the deficit financed by domestic borrowing.
     - **«السياسة النقدية والعملة»:** a lever card that opens its adjuster (designed next). It sets the rate, the exchange regime and capital controls, as a gradual change.
     - **The external balance, «الميزان الخارجي · مليار $ سنويًا»:**
       - exports 26.3 and imports 52.9;
       - the trade balance −26.6 (amber);
       - Suez Canal 4.8 (a waterway Egypt owns);
       - tourism 12.5 (14.7 million visitors);
       - remittances 12.6;
       - the current account −4.3 (amber), after services and profits sent abroad.
     - **The largest partners:** the EU, the US, China, Saudi Arabia and India.
     - The note: changing the exchange regime is a gradual reform that takes months.
- **Money:**
  - amounts under 1 billion are in millions («700 مليون $», «900 مليون $»);
  - "per year" is always «سنويًا».
- **VoiceOver:**
  - the tabs are a tab list;
  - each «لماذا؟» names its subject;
  - the warning chip says «الشرعية: تنخفض»;
  - every card reads as one phrase: name, value and unit;
  - the bars are hidden from it.
- **Not in this screen:**
  - the adjusters (next);
  - markets per good and industries (the markets screen);
  - chokepoint exposure (§6.5, the share of trade through each chokepoint, §5.1) and its disruption: the markets screen, next to the Markets map mode.

## Changes from the proposal the owner went ahead with
1. **Budget totals:** revenue 60.0 → 48.6 and spending 77.7 → 66.3, Egypt's real 22.2% and 30.3% of GDP. The lines are rescaled; the deficit stays 17.7.
2. **Bars and amber:**
   - the share bars emerald → teal (data colours never take the section colour);
   - the deficit and the trade balance are written without double negatives;
   - amber moved from imports to the trade balance, and to the new current-account row.
3. **Units and money:**
   - research 0.8 → «700 مليون $», electricity 0.9 → «900 مليون $»;
   - subsidies carry their unit beside the number;
   - the trade heading carries «مليار $ سنويًا».
4. **Rates:**
   - customs 9% → the effective 5%;
   - the inflation trend +0.4 → +0.1 (CAPMAS);
   - the bond gains its tenor (10 سنوات).
5. **Icons:** inflation and the fuel cut get their own icons; GDP no longer uses the section's glyph.
6. **Added content:**
   - the treasury line;
   - the central bank's rate and the deficit's financing;
   - the money-and-currency lever;
   - the current account;
   - the notes on who owns which subsidy.
7. **Layout and labels:**
   - the lines are cards, as in the approved panels;
   - the budget summary puts each label above its number;
   - the trade terms are «قابلية التحويل» and «ضوابط رأس المال».

## Geometry and fit
Exactly the state panel's rules:
- the sheet's width and place;
- the dock left of it or hidden;
- the overview at the loosest fit level that fits without scrolling;
- the other tabs scrolling with 24 pt fades;
- the scroll hint in its clear 22 pt strip;
- labels the screen edge or the notch would slice are hidden.

**Sizes added for this panel:**
- line cards: 44 pt, radius 10, padding 12 on the text side and 8 on the chevron side, 4 pt apart, and the whole card is the control;
- flow rows: 36 pt;
- share bars: 72 × 6 pt, radius 3, filling from the right;
- the budget summary numbers: 18 pt bold. They are a tab's own summary: the 18 pt rule in `SCREEN4_BRIEF.md` covers them, and they are never on screen with the headline numbers.

## Light build rules
As in `SCREEN4_BRIEF.md`:
- no blur;
- overlay fades, not masks;
- the header strip cropped from the map imagery in memory;
- the fit level as a lookup.

## Gate
- **`screen6/A/_build/render.js`** is the state panel's checker, ported. It checks all 7 phones.
  - It saves 7 views: each tab and the end of each long tab.
  - It also checks the middle scroll offsets without saving PNGs.
  - Every brief string of a tab must be shown clear in one of its views.
- **It also checks:**
  - every row reads exactly as the brief's tables: name, line and value together;
  - the money rule;
  - the numbers agree (an unreadable number fails):
    - spending − revenue = the deficit = 8.1% of GDP;
    - the treasury is the HUD's and falls by the deficit over 12 months;
    - the lines add up to the spending, and their shares to 100%;
    - every bar, as drawn, is in proportion to its amount;
    - the subsidies fit inside their line;
    - the fuel cut's saving matches its row;
    - the taxes match the note;
    - exports − imports = the trade balance;
  - interest, found by its name, is locked;
  - the section colour is on chrome only, and the bars are teal;
  - the VoiceOver labels.
- **Its `--selftest`** plants defects and must catch every one.
- **The report** records a content hash of every PNG it checked, including the hit render.
- **`python3 -I tools/check_screen.py design/screen6/A`** must PASS. The gate:
  - re-hashes the inputs and the PNGs;
  - matches each phone with `devices.json`;
  - requires the self-test.
