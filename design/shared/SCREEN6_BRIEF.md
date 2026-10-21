# Screen 6 brief: the economy panel («الاقتصاد»)

Visual mockups for the owner. NOT app code. The build is `../screen6/A`. The owner went ahead with the proposal (`../proposals/S6_economy`) on 2026-10-21 («اعتمد كل شي»). Task card: `tasks/T-005_screen6_economy.md`.

## When it appears
The player taps «الاقتصاد», the second item of the section dock. The panel opens as the same full-height side sheet as the approved state panel (`SCREEN5_BRIEF.md`). The map stays visible and Egypt stays clear of every panel. The dock item «الاقتصاد» shows the open section.

## Base
- **Look:** the approved panels.
  - `screen4/R/_build/panel.css`: the look, the sizes and the fit levels.
  - `screen5/A/_build/state.css`: the tab and note rules.
  - `shared/section_identity.css`: the section identity and the white touches.

  The assembler reads all three, so the panels cannot drift.
- **Section identity:** الاقتصاد is emerald `#43C08A`. It appears only on chrome:
  - the 2 pt top line;
  - the header emblem;
  - the open tab, with its underline and a faint fill;
  - the dock item, with its underline.

  The closed tabs are grey and the closed dock items stay as on B3. **The share bars are data, so they are teal, not emerald.**
- **White touches:** white tile icons, white-outlined chips and header chip. A chip that warns of a cost in legitimacy is amber.

## Content (Egypt, 1 January 2011; values are illustrative, in US dollars, D-6)
The numbers agree with each other. The sources are in T-005: Egypt's FY2009/10 budget outturn, CBE, World Bank and S&P.

- **Header:** flag, «الاقتصاد», the chip «الجنيه المصري», and «مصر · السنة المالية 2010/11». The emblem and the close button.
- **Tabs:** نظرة عامة / الميزانية / الضرائب والدعم / التجارة والعملة (icons: grid, pie, percent, ship).
  1. **نظرة عامة:**
     - **Headline numbers**, each with «لماذا؟»:
       - الناتج المحلي 219 مليار $, +5.1% سنويًا;
       - التضخم 10.3% (amber), +0.4 نقطة شهريًا;
       - البطالة 8.9%, دون تغيّر.
     - **Status table:** عجز الموازنة 8.1% من الناتج (amber), الدين العام 73%, سعر الصرف 5.80 جنيه للدولار, التصنيف BB+ مستقر.
     - **Two decisions:**
       - «طرح سندات دولية»: 1 مليار $ · فائدة 6.2% · 10 سنوات, chip «تمويل العجز».
       - «خفض دعم الوقود 10%»: saves 1.2 مليار $ a year, which is 10% of the 11.7 line; amber chip «الشرعية ↓».
  2. **الميزانية:**
     - Revenue 48.6, spending 66.3, deficit −17.7 (amber) مليار $ a year. These are 22.2%, 30.3% and 8.1% of GDP.
     - **The spending lines**, each with its share and a bar relative to the largest line:

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

     - Interest is mandatory: a lock instead of the chevron, and the row is not a control. Every other line opens its adjuster, which is designed next.
     - The note: interest cannot be cut, and a cut's effect on services and stability shows before it is confirmed.
  3. **الضرائب والدعم:**
     - **Taxes:**
       - income 20% (top bracket), 3.6;
       - corporate 20%, 11.6;
       - sales 10%, 12.2;
       - customs 9% (weighted average), 2.7.

       The note: «الضرائب 30.1 مليار $ من إيرادات 48.6. الباقي من قناة السويس والبترول والمنح.»
     - **Subsidies:** fuel 11.7, bread and rations 2.9 (63 million beneficiaries), electricity 0.9. Together 15.5, which fits inside the 17.2 line.
     - The note: a tax rise or a subsidy cut raises unrest in the poorest provinces first.
  4. **التجارة والعملة:**
     - **Currency:** a managed float, fully convertible, reserves of 8 months of imports, light capital controls.
     - **The external balance in a year:**
       - exports 26.3 and imports 52.9;
       - the trade deficit −26.6 (amber);
       - Suez Canal 4.8 (a chokepoint Egypt owns);
       - tourism 12.5 (14.7 million visitors);
       - remittances 12.6.
     - **The largest partners:** the EU, the US, China, Saudi Arabia and India.
     - The note: amounts are in billions of dollars, and changing the exchange regime is a gradual reform that takes months.
- **Money:** amounts under 1 billion are in millions («700 مليون $»).
- **Not in this screen:**
  - the adjuster (next);
  - markets per good and industries (the markets screen).

## Geometry and fit
Exactly the state panel's rules:
- the sheet's width and place;
- the dock left of it or hidden;
- the overview at the loosest fit level that fits without scrolling;
- the other tabs scrolling with 24 pt fades;
- the scroll hint in its clear 22 pt strip;
- labels the screen edge or the notch would slice are hidden.

**Sizes added for this panel:**
- budget, tax and subsidy rows: 44 pt, and the whole row is the control;
- flow rows: 36 pt;
- share bars: 72 × 6 pt, radius 3, filling from the right;
- the budget summary numbers: 18 pt bold (the panel's headline numbers).

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
- **It also checks that the numbers agree:**
  - revenue − spending = deficit = 8.1% of GDP;
  - the lines add up to the spending, and their shares to 100%;
  - every bar is in proportion to its amount;
  - the subsidies fit inside their line;
  - the fuel cut's saving matches its line;
  - the taxes match the note;
  - exports − imports = the trade balance.
- **Its `--selftest`** plants defects and must catch every one.
- **Before it judges anything,** it re-runs `assemble.py` and refuses an `index.html` that differs.
- **`python3 -I tools/check_screen.py design/screen6/A`** must PASS.
