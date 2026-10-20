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
