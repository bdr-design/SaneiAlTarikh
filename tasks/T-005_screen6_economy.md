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
  - **The adjuster** that a budget, tax or subsidy row opens. It is designed next, as its own screen.
  - **Markets per good and industries.** They belong to the markets screen in the owner's list.

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
   - revenue minus spending equals the deficit;
   - the deficit and the debt match their share of GDP;
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
