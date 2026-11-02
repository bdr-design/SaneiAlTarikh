# T-007: The province details' other three tabs (الإنشاءات، القوات، السياسات)

## Goal
The approved province panel (screen 4 R) opens «تفاصيل المحافظة» with 4 tabs, and only «الحكم» is designed. This task designs the other three so the panel is complete:
- الإنشاءات: construction and facilities;
- القوات: the forces in the province;
- السياسات: the province's policies and society.

The two actions of the owner's overview image move here, as decided at approval:
- «توسعة شبكة الكهرباء» → الإنشاءات;
- «دعم الخدمات الأساسية» → السياسات.

The build extends `design/screen4/R`: the same sheet, with tabs switching as in the state panel (`?view=govern&tab=…`). Claude designs, reviews, approves and moves it to `main` under the owner's delegation.

## Scope
- **In scope:** Cairo Governorate, 1 January 2011. Each tab shows status first, then actions with cost and an effect preview. The approved «الحكم» tab and the card stay as they are.
- **Out of scope:**
  - **Moving units** on the map: the military screens (full control, smooth movement, D-15).
  - **The national laws:** State › السياسات (approved).
  - **Emergency regions:** they are the Internal section's lever (`lawOwnership`). The province shows their state and links there.

## Acceptance criteria
1. **The approved frame, unchanged:**
   - the province panel's sizes, look, fit levels and identity;
   - no section colour, since the province panel is a map panel (teal marks selected states);
   - «الحكم» and the card render exactly as before.
2. **One tab body at a time:**
   - the tab row selects it;
   - each long tab scrolls with the fades and the hint in its strip;
   - every string is shown clear in some view.
3. **الإنشاءات:**
   - infrastructure by sector, out of 10, adding up to the card's 8 / 10;
   - the main facilities;
   - the running national projects in this province, linked to the state panel's projects;
   - «توسعة شبكة الكهرباء» with its cost, duration and effect.
4. **القوات:**
   - control and the police level;
   - the units stationed, with generic designations (D-13 spirit) and readiness;
   - who commands them (army or interior);
   - a link to the military section.

   No unit can be moved from here.
5. **السياسات:**
   - the groups and their grievances (§5.2);
   - party support in the province (§5.3);
   - the unrest drivers;
   - «دعم الخدمات الأساسية» and «تعزيز الأمن», each with cost and effect;
   - the emergency-region state, linking to Internal.
6. **Numbers and units agree with screens 4 to 7:**
   - unrest 64 and population 8.8 million;
   - millions under 1 billion;
   - the metro project's 85% matches the state panel.
7. **The gate:** 0 issues on 7 phones and the self-test passes; check_screen PASS for screen 4 R; independent read-only review with every confirmed finding fixed.

## Evidence (to be completed while designing)
- **Cairo 2011:** population about 8.8 million (CAPMAS). Metro lines 1 and 2 in service, with line 3 phase 1 under construction (state panel: 85%, done in 2012). Cairo International Airport.
- **Electricity:** demand was close to capacity. There were summer outages in 2010.
- **Politics:** the NDP won about 90% of the seats in the 2010 People's Assembly election (state panel: about 420 of 518).
- **Society:** Copts are about 10% (approved card).
- **Security:** large Central Security Forces deployments under the Interior. The army's Central Military Zone and the Republican Guard are based in Cairo.

## Design calls (2026-11-02, under the owner's delegation)
- **Unrest causes do not claim a sum.** The card's 64 is the model's target with the 2011 offset (§5.2), so a short list cannot add up to it honestly. The tab shows the largest terms and links to «لماذا؟» for the whole breakdown.
- **The emergency law is shown, not set, here.** It is the state panel's national law («شاملة منذ 1981», screen 5). The province's emergency region is Internal's lever; the tab shows its state and links there.
- **Share bars use one data hue** (teal, half teal, grey), so no group or party reads as better or worse; each row has a key of its part's colour and its share in words.
- **The «الحكم» tab's two link rows** («الإنشاءات والمرافق», «إدارة القوات») stay as approved: they now lead to the الإنشاءات tab and to the military section.
- **Styles in a file of the province panel's own** (`province.css`), so the shared `panel.css` that screens 5 to 7 read is untouched.
- **The checker** (screen 4 R's `render.js`) now covers every tab: per-tab views (top, end, middle offsets), per-tab coverage, the tab marks, the meters against their values and the card, the metro against the state panel's sheet (read, not copied), unit rows, share bars, causes, colour never alone, VoiceOver labels with their numbers, the money rule over the shown text, signs inside their numbers, strings matched as whole element text, and the PNG hashes.
