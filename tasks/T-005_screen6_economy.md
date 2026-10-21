# T-005: Screen 6, the economy panel («الاقتصاد»)

## Goal
The full build of the economy panel, opened from the dock's «الاقتصاد», in the approved panel look (screens 4 R and 5 A), with the section identity (الاقتصاد: emerald `#43C08A`) and the white touches. The owner's go-ahead on the proposal (`design/proposals/S6_economy`) was given on 2026-10-21 («اعتمد كل شي»). The build is `design/screen6/A`.

## Scope
- **In scope:** the four tabs of the proposal:
  - نظرة عامة;
  - الميزانية;
  - الضرائب والدعم;
  - التجارة والعملة.

  Egypt on 1 January 2011.
- **Out of scope:**
  - **The adjusters** that a budget, tax, subsidy or currency row opens. They are designed next, as their own screen.
  - **Markets per good and industries.** They belong to the markets screen in the owner's list.
  - **Chokepoint exposure** (§6.5): the share of trade through each chokepoint, and its disruption. It goes to the markets screen, next to the Markets map mode.

## Acceptance criteria
1. **Same frame as the approved state panel:**
   - the full-height side sheet;
   - the dock left of it, or hidden on the 375 pt phones;
   - every other HUD element at its B3 place;
   - Egypt and the delta clear.
2. **Section identity only on chrome:**
   - the top line, the emblem, the open tab with its fill, and the dock item while open;
   - the closed tabs and the closed dock items neutral;
   - data colours unchanged: the bars are a data colour (teal), not the section colour.
3. **The numbers agree with each other and with Egypt's real figures** (illustrative, but no contradictions):
   - spending minus revenue equals the deficit;
   - the deficit matches its share of GDP (17.7 of 219 = 8.1%);
   - the debt is shown as a share only (73%, Egypt's gross public debt in FY2009/10);
   - the budget lines add up to the spending, and their shares to 100%;
   - each bar is in proportion to its amount;
   - the subsidies listed fit inside the subsidy line;
   - a cut's saving matches its line.
4. **The overview fits without scrolling** at the loosest fit level. The other tabs scroll, with the fades and the scroll hint in its clear strip.
5. **The gate covers every view** (the screen 5 checker, ported):
   - every brief string is shown clear of the fades in one view of its tab;
   - `check_screen.py` passes on 7 phones;
   - the self-test catches every planted defect.
6. **Language and units:**
   - Arabic RTL, Western digits, US dollars (D-6);
   - amounts under 1 billion in millions;
   - no cut or overlapping text.
7. **Independent read-only review,** every confirmed finding fixed, then shown to the owner for approval.

## Evidence for the content (checked 2026-10-21)
- **Sources:** Egypt's Ministry of Finance outturns, the Central Bank of Egypt, the World Bank and S&P.
- **The proposal's budget totals were too high.** It showed revenue 60.0 and spending 77.7 billion $, which is 27% and 35% of GDP. Egypt's FY2009/10 outturn was:
  - revenue 22.2% of GDP;
  - spending 30.3%;
  - deficit 8.1%;

  with GDP 219 billion $ in 2010 (EGP 5.5 to 5.8 per $). The build uses revenue 48.6 and spending 66.3, so the deficit stays 17.7 = 8.1%.
- **Budget lines** follow the FY2009/10 shares:
  - subsidies, grants and social benefits about 26%;
  - interest about 20%;
  - education about 11%;
  - investment about 11 to 12%;
  - defence about 6%;
  - public order about 5%;
  - health about 5%.

  They are rescaled to 66.3.
- **Taxes** (FY2009/10, about 14% of GDP):
  - corporate, including the petroleum company and the canal authority, about 11.6;
  - sales tax about 12.2;
  - personal income about 3.6;
  - customs about 2.7 billion $.

  The other 18.5 of revenue is non-tax: the canal, petroleum dividends and grants.
- **Subsidies** (FY2010/11):
  - fuel about EGP 68 billion, 11.7 billion $;
  - food and bread 2.9, with about 63 million ration-card beneficiaries;
  - electricity about 0.9.
- **External (calendar 2010):**
  - goods exports 26.3 and imports 52.9;
  - Suez Canal 4.8;
  - tourism 12.5 from 14.7 million visitors;
  - remittances 12.6;
  - reserves about 36 billion $, about 8 months of imports.
- **Rates:** inflation 10.3% (December 2010); unemployment 8.9%; growth 5.1%; EGP 5.80 per $.
- **Rating:** S&P BB+ stable, until the downgrade of 31 January 2011.
- **Added after the review (2026-10-21):**
  - inflation was 10.2% in November 2010 and 10.3% in December, so the trend is +0.1 point a month (CAPMAS, reported by Reuters and Ahram Online);
  - customs collected about EGP 14.7 billion in FY2009/10, about 2.7 billion $, which is about 5% of goods imports (the trade-weighted tariff was about 7.5%, WITS);
  - the current account was about −4.3 billion $ in FY2009/10 (CBE);
  - the CBE overnight deposit rate was 8.25% from September 2009 to 2011 (CBE);
  - the deficit was financed mostly by domestic borrowing, through treasury bills and bonds (Ministry of Finance);
  - gross public debt was about 73% of GDP in FY2009/10 (IMF, Ministry of Finance).
  - **Bond:** Egypt issued 1.5 billion $ of Eurobonds in April 2010. A new 1 billion $ issue over 10 years at about 6.2% is illustrative, close to the 2010 yields.
  - **Partners:** the EU, the US, China, Saudi Arabia and India, from CAPMAS trade data, rounded.

## Still assumptions
- **No page fetched:** the figures come from Claude's knowledge of the publications named above and from the reviewers' checks. No source page was fetched in this session.
- **The treasury:** «الخزينة 36.0» is the approved B3 HUD's illustrative value. The government's cash and the CBE reserves are different things in the model (§5.1). The reserves are shown here only in months of imports, so the two do not read as one number.
- **Engine follow-up:** several items have no model in §5.1 yet, and they stay illustrative until each one has a model (design doc §6.1). They are:
  - tourism;
  - remittances;
  - canal fees;
  - the current account;
  - the rating's letters;
  - the bond's tenor;
  - the three subsidies;
  - the 9 line names;
  - the policy rate;
  - the deficit's financing.

## Test
- **`render.js`** checks all 7 phones in every view, including the middle scroll offsets. It covers:
  - the brief's tables row by row;
  - the money rule;
  - the numbers agreeing with each other;
  - the section colour, the white touches and amber;
  - the locks and the adjusters;
  - VoiceOver labels;
  - the layout rules of the approved panels.
- **`--selftest`** plants every defect a check exists for, and must catch each one.
- **`check_screen.py`** re-hashes the inputs and the PNGs.

## Risks
- **Built from the brief:** the build would copy an illustrative number as a model output if the engine follow-up is not done first. The numbers are labelled illustrative in the brief and in the design doc.
- **Long country names** in the header (not Egypt) are not tested yet. The same applies to the state panel.

## Review and fixes (2026-10-21)
- **The review:** a read-only workflow ran four lenses (checker, consistency, renders, realism and Arabic), then a skeptic per finding, then a completeness critic. 59 findings were checked: 50 confirmed and 9 refuted.
- **All 50 confirmed findings are fixed:**
  - the money rule;
  - the double negatives;
  - the units;
  - the icons;
  - the cards;
  - the tab spacing;
  - the summary alignment;
  - the notes;
  - the trade terms;
  - the current account;
  - the treasury;
  - the policy rate and the deficit's financing;
  - the money-and-currency lever;
  - VoiceOver;
  - the subsidy ownership;
  - the effective customs rate;
  - the inflation trend;
  - the checker gaps (rows, NaN, bars as drawn, interest by name, the section colour on any element, the PNG hashes, the gate's strictness);
  - the docs.
- **Changes from the proposal:** listed in `design/shared/SCREEN6_BRIEF.md`.

## Approved (2026-10-21)
- **Approved by Claude** under the owner's standing delegation («قلتلك انت تولى كل شي», `decisions.json`: `ownerDelegation`). The gate passed with 0 issues on 7 phones, and the self-test caught 120 of 120 planted defects.
- **Logged** in `decisions/`, moved to `main`, and shown to the owner, who can change anything.
