# T-004: Screen 5, the state panel («الدولة»)

## Request
Owner (2026-10-20), after approving the province panel: «صمم». Design the «الدولة» panel in the same look as the approved province panel (screen 4 R), as a proposal to approve before fitting.

## Evidence
- `design_doc/final_design.md` §6.5, the «الدولة» row: leader (rename), regime, constitution, policies, political capital, projects (start; cancel with the refund shown), presets and cheats status.
- §5.3: leaders have a real name, no photo, age and tenure, and no traits (D-30). Political capital accrues as legitimacy × institutional capacity; spending it has cooldowns.
- §5.x projects: paid into escrow; `CancelProject` refunds the escrow minus 10%.
- §5.11 presets: واقعي (default), قوي, قوة عظمى, «صلاحيات مطلقة». Every preset except واقعي is labelled «غير واقعي». Cheats switch off the score.
- The approved look: `design/screen4/R`.
  - Dark navy opaque panel (D-3), satellite header strip, 3 headline numbers with monthly rates and «لماذا؟», a 2x2 status table, tabs with icons, and action rows with effect chips.
  - The map stays the centre.
- Egypt on 1 January 2011:
  - President محمد حسني مبارك, in office since 14 October 1981, aged 82.
  - Prime minister أحمد نظيف, since July 2004. The vice-president post is vacant.
  - The 1971 constitution, last amended in 2007. The National Democratic Party rules. A state of emergency has been in force since 1981.
  - The next presidential election is due in September 2011. Cairo Metro line 3 phase 1 opens in February 2012.
  - Toshka (South Valley) targets 2017. El Dabaa was named in August 2010 as the site of the first nuclear plant.

## Scope
The proposal only, in `design/proposals/S5_state`, rendered on the iPhone 17 Pro Max.
- Tabs: نظرة عامة (designed), القيادة (designed), المشاريع (designed), السياسات (tab shown, content later).
- Fitting all 7 iPhones, the independent review and the gate come after the owner approves.

## Acceptance criteria
1. Same tokens and look as screen 4 R, reusing its CSS file so the two cannot drift.
2. The HUD keeps its B3 place. The dock moves left of the sheet as in the province details, and the «الدولة» item shows as the open section.
3. The content covers every item of the §6.5 row: leader and rename, regime, constitution, political capital, policies (tab), projects with start and cancel and the refund shown, preset and cheats status.
4. No photo and no traits for the real leader. Western digits. Money in US dollars.
5. No cut or overlapping text on the 17 Pro Max (render check: 0 issues). I look at every render myself.

## Reference: the «Modern Age» series (العصر الحديث 1–3, Oxiwyle), checked 2026-10-20 at the owner's request («راجع لعبة عصر الحداثة»)
The store pages and screenshots could not be opened: the environment's network policy denies apps.apple.com and play.google.com. The notes below come from web search results (store text quoted by search, Steam pages, player reviews). The game's look is not reviewed until the owner sends screenshots.
- **Sections:** the president's rating (to avoid riots, protests and revolutions); production and trade; about 20 ministries; construction; the army; international relations and UN votes.
- **Ministries:** health, education, infrastructure, culture, sports, justice, police, defence, security service, tourism. Each has its own funding, and the player appoints the ministers.
- **Other levers:**
  - economic and military laws; ideology and religion (the player can change them);
  - taxes, a central bank, loans;
  - trade in goods, mines and factories.
- **Victory:** military, religious or ideological, or leading in revenue, army, population and industry.
- **Players praise:** the depth of the economy and of the army battles.
- **Players complain about:**
  - hard menus (MA 1: "absolutely horrendous", no way back); MA 3's categories helped;
  - a weak tutorial;
  - ads and paywalls (2x speed behind a subscription);
  - slow timers (troop training in "centuries");
  - holding a button to build many things;
  - relations not colour-coded on the map.
- **Taken for this game:**
  - a clear way back from every deeper view;
  - grouped laws (economy / security / society) for the «السياسات» tab;
  - a cabinet view as an option for «القيادة».

  **Avoided:** unrealistic switches (changing the state religion at will), paywalls, timers that block play.

## Go-ahead and build (2026-10-21)
- **Owner, after the section-identity proposal:** «كمل الباقي بدقه». Taken as a go-ahead with Claude's recommendation:
  - the identity colours as proposed;
  - white touches on the dark panels (D-3 stands; white panels not used);
  - the dock neutral, with only the open section coloured.

  Logged in `decisions/`.
- **Built:** `design/screen5/A`.
  - It reuses screen 4 R's CSS and the new shared `design/shared/section_identity.css`.
  - The «السياسات» tab holds 8 laws in 3 groups, each with 3 segments and the political-capital cost of a change, plus a 6-month cooldown.
  - Brief: `design/shared/SCREEN5_BRIEF.md`.
- **Gate:** `_build/render.js` is adapted from screen 4 R's checker. It checks 7 phones × 6 views, plus a self-test of planted defects.
- **Shared change:** the header hairline is now drawn inside the header (inset shadow). Its 1 pt border had pushed the close button's 44 pt hit box half a point out of the panel at the tighter fit levels. Screen 4 R is re-rendered and re-gated with it.

## Independent review and fixes (2026-10-21)
- **Review:** read-only reviewers (separate context, no edits) looked at screen 5 through 4 lenses:
  - the checker;
  - consistency with the approved panels;
  - the renders;
  - language, realism and the light rules.

  A skeptic re-checked each finding: 35 were confirmed and 6 refuted. The findings and verdicts are kept out of the repo (scratchpad).
- **Fixed, in the design:**
  - **Open tab:**
    - the closed tabs are grey;
    - the open tab gets a faint fill of the section colour.
  - **Hairlines and spacing:**
    - no double hairline in القيادة;
    - law rows 4 pt apart, as the brief says;
    - office tiles back to 34 pt;
    - one white line token pair (`--w-line`, `--w-line-dim`).
  - **Scroll hint:** it gets a clear 22 pt strip under the bottom fade, so it covers nothing.
  - **Overview fit:**
    - a fit step between 4 and 5;
    - 4 pt under the last action, so the 17 Pro Max fits at level 0 with even gaps.
  - **Small fixes:**
    - the accent bar is inset;
    - «إلغاء» and «بدء» share their left edge;
    - the dead `.r-fade` span is gone.
  - **Map:** labels the screen edge or the notch would slice are hidden (also in screen 4 R).
- **Fixed, in the content:**
  - **Refunds:** the refund note matches the numbers: the unspent balance, minus 10%. Refunds are in millions.
  - **Mode chip:** it uses screen 3's terms («الوضع: واقعي»), and the unrealistic state is drawn.
  - **Icons:** no crown for a republic. The president, the PM and the VP get their own icons, and the port and the metro get theirs.
  - **Laws:**
    - internet «محجوب»;
    - «الرعاية الصحية»;
    - «كلفة التغيير: N» with the capital glyph.
  - **Other wording:** «تكتمل في», «عُدّل في», «عند خلوّ منصب الرئيس», «الحزب الوطني:».
  - **States** (`?states=1`): a law in its cooldown, a law the player cannot afford, and the reshuffle waiting for its turn.
  - **One owner per law:** written in design doc §6.5. **Not yet approved by the owner:** it is part of what the owner approves with this screen.
- **Fixed, in the gate:**
  - **New views:** the leader tab's end view; middle scroll views for every long tab; a coverage check, so every brief string is shown clear of the fades in some view.
  - **Section identity:**
    - the identity checks see a missing line or underline;
    - the closed dock items must stay neutral as on B3.
  - **Sizes and colours:**
    - the brief's sizes;
    - the white touches;
    - amber where the brief says;
    - the section colour only on chrome.
  - **Rules:**
    - D-30 (no picture, no traits);
    - the chosen segment is the aria-checked one;
    - the hint's place.
  - **Inputs:**
    - the input hash covers every file the pages load, plus B3 and `devices.json`;
    - `render.js` refuses an `index.html` that `assemble.py` would not produce.
  - **`check_screen.py`:**
    - it matches each phone with `devices.json`;
    - it fails without a self-test.
  - **Self-test:** each case names the one check it tests, with new cases for every new check.
- **Refuted (no change):**
  - the grey «إلغاء»;
  - the chosen-segment style living in state.css;
  - the emblem looking like a button;
  - the 2010 narrowing of the emergency law;
  - East Port Said already under way;
  - the light rules being incomplete.

## Approved (2026-10-21)
- **Owner:** «اعتمد كل شي», in answer to three questions: approve the state screen; one owner per law; move it to `main`. Approved:
  - the state screen;
  - one owner per law;
  - the three shared refinements in the approved screen 4 R;
  - the move to `main`.
- **Logged in `decisions/`.** The same answer is taken as the go-ahead for the economy proposal (screen 6, task T-005).
