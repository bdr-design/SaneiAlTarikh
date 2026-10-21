# صانع التاريخ (Sanei Al-Tarikh): final rebuild design

**Version:** final-1.1, 2026-10-20. This revision handles all 54 issues raised by the rework-hunter and realism-feasibility critics; §12 lists each one. This is a design document only. No project file was created, changed or deleted. The new measurement script for this revision is `wf/revise/merge_pop3.py`.

**Base:** proposal C (foundation, judged 24.4), with grafts from A (lightness, 23.4) and B (realism, 21.1). Every fatal flaw the judges listed is fixed (§0.3). Where the user's updated decisions differ from the proposals, the updated decisions win:
- the first scenario is 2011
- the end date is 2100
- the satellite map is approved
- markets, parties and full espionage are in v1
- fronts are automated

**Main changes in this revision:**
- **State and government are separate.** A *polity* is the state. It can hold one or more *governments*, and one of them holds the UN seat. Recognising a state and recognising a government are separate bits.
- **One political actor registry.** A single actor can hold a party role, an armed role, a controller role and a government role at the same time.
- **Stable party IDs.** Party support is stored as sparse rows.
- **Nominal accounting.** Each government keeps a ledger in its own currency, plus USD reserves and a money base. A world USD deflator is simulated. Constant 2011 USD is used only for reporting.
- **Equipment is a stock that carries forward** (a recursive pool) with allocations to units. The 2011 opening stock includes older inventories and arms imports.
- **Runtime country IDs**, persistent serial numbers for every runtime entity, and stored scheduling slots.
- **Arabic grammar fields** on every name, plus agreement selectors in text templates.
- **Data instead of code** for population groups (two dimensions), electoral systems, regimes and monetary regimes. The effect vocabulary is derived from all five planned scenarios, and stub scenario packs are tested in CI from M1a.
- **Saves:** typed column buffers, binary metadata, stable numeric command tags, a separate file per scenario, and saves stored in the visible Documents folder with an optional mirror.
- **Renderer:** the tile cache is sized from the screen; blur is measured end to end on the device; Arabic labels use a glyph distance-field atlas drawn in two passes; label anchors are computed at runtime; border records carry arc length, so dashes run continuously along a border.
- **Data realism:**
  - OECD input-output tables, with a public-domain fallback
  - unrest seeded from real 2011 levels
  - single-year age cohorts
  - a territory-composition table
  - WMEAT for 2011 military seeds
  - an evidence gate with archived snapshots
  - long-run GDP bands
- **An honest schedule** (about 2–2.5 years), re-estimated from measured velocity, with a cut list that cuts content and never the foundation.

---

## 0. Summary

### 0.1 The design in 15 points

1. **Platform.** Native Swift 6, with the toolchain pinned to the Xcode 26.x release (Swift 6.2; exact patch to verify). iOS 17 or newer, iPhone only, landscape only. There is no WebView, no JavaScript, no third-party runtime code and no network access.
2. **Engine.** Pure Swift using integer binary fixed-point. It is deterministic, and it is built and tested on Linux.
   - One tick is one day.
   - Each government's monthly work runs on its *stored* slot day (1–28).
   - Yearly work is spread over 1–28 January.
   - Commands (`Command`) are the only way to change game state.
   - Every runtime entity has a persistent serial number. Random-number keys, sort tie-breaks and iteration order all use it, so a loaded game continues exactly like an uninterrupted one.
3. **Scenarios.** The first scenario starts on 1 Jan 2011, and every campaign ends on 31 Dec 2100. Later scenarios (2026, then 1990, 1985 and 1979) are data packs only.
   - The effect vocabulary covers the headline events and institutions of **all five packs** (succession of states, governments in exile, voting rights by group, non-convertible currencies, and so on).
   - CI parses a stub pack for each planned scenario from M1a onward.
   - A scenario PR may touch only an allowlist of content paths, never Swift code.
4. **Map.** The base is NASA Blue Marble Next Generation, *with topography and bathymetry*, so relief and sea-depth shading are already baked in by NASA. It is graded offline on Linux into the approved "operations room" look.
   - Only the tiles for the visible area are streamed from a bundled pyramid.
   - The vector province layer has **2,850 ± 100 land provinces** (hard cap 3,000), about 250 sea zones and 3 detail levels.
   - Map modes are translucent overlays, never flat fills.
5. **States and governments.** About 300 polities are in a registry, plus a runtime ID space for states born during play.
   - Each polity has one or more governments, and one government holds the UN seat.
   - On day 190 a succession event creates South Sudan.
   - Côte d'Ivoire's two rival presidents and Libya's NTC are governments within one polity.
   - The player picks a government, not a tag.
6. **Province status.** Each province has five fields:
   - sovereign: the polity that holds it under international law (de jure)
   - administrator: the government that runs it in practice (de facto)
   - controller: who holds it militarily, a government or an armed actor
   - control%
   - claims

   The default view is de facto, with dashed borders on disputed areas. A toggle switches to the de jure view.
7. **Economy.**
   - 20 goods plus 2 non-traded sectors; 25 industry types, with input-output coefficients from the OECD inter-country tables (licence pending; public-domain US BEA template as the fallback); 3 labour skill tiers.
   - A national market per government that clears monthly and **clears exactly at base prices on day 1**.
   - A world market with transport and tariff costs, and **exposure to sea chokepoints**.
   - Trade blocs and sanctions; the top 10 trading partners per country.
   - **Accounts are kept in each government's own currency**, with USD reserves, a money base and debt split by currency. Constant 2011 USD is used only for reports and the score.
8. **Politics.** One registry of political actors with stable IDs, each holding party, armed, controller or government roles.
   - About 120 countries hold elections, with up to 12 parties each, seeded from the last real election.
   - Electoral systems include SNTV, block vote, reserved and confessional seats, STV and alternative vote.
   - Regime types and electoral systems are data, not Swift enums.
   - Non-democracies have ruling factions, and an opposition can emerge during play.
9. **Military.** Fronts are automated.
   - A front belongs to a side in a war and is split into per-country sectors. Each country orders only its own sector.
   - One front-execution system in the engine runs both player and AI fronts.
   - Equipment is a stock that carries forward with losses, transfers and captures. It is seeded from 20 years of defence spending plus older inventories and arms imports, and is shown only as estimates.
   - Formations have per-government quotas and a manpower reserve pool.
   - The top rung of the nuclear escalation ladder ends the game.
10. **Intelligence.** The game has full espionage: networks, intelligence gathering, counter-intelligence, sabotage, cyber, technology theft, support for opposition or insurgents, election and media influence, and coup support. Being exposed causes diplomatic fallout.
    - **There is no assassination action** anywhere in the commands or effects.
    - Fog-of-war estimates change only when intelligence is refreshed, not every day.
11. **Climate and the long run.**
    - Temperature follows cumulative emissions, calibrated to IPCC AR6.
    - Population uses single-year ages and is calibrated to UN WPP 2024 to 2100.
    - GDP is checked against SSP2 or OECD long-term bands.
    - Coastal exposure comes from DeltaDTM (CC BY 4.0).
    - Technology is real up to about 2025, follows published projections to 2050, and uses labelled projections to 2100.
12. **UI.** The approved slim glass HUD (sizes 36/32/44 pt; type sizes 10/11.5/13/14; dark glass with system blur; cyan accents; an 8-section dock; labels that hide under HUD panels).
    - The layout class is chosen from the **safe-area width**, and a fit test per device checks the longest Arabic names and values.
    - Every other screen, and every small-phone variant, gets a visual design approved by the user before it is built.
13. **Saves.**
    - Self-describing tables. Migrations run on typed column buffers.
    - Binary metadata, and commands stored with stable numeric tags.
    - Raw DEFLATE compression.
    - Saves live in **Documents**, visible in the Files app, with an optional automatic mirror to a folder the user picks.
    - Autosave each in-game month (rate-limited) and on background; unlimited manual saves; export and import.
14. **Budgets** (the floor device is the iPhone XR, A12, 3 GB):
    - 0 fps when idle
    - ≤2 ms per simulated day on average
    - ≤160 MB memory (≤210 MB on a Pro Max)
    - first frame ≤400 ms; scenario playable in ≤1.5 s
    - save file ≤2 MB; IPA ≤80 MB
15. **Plan.**
    - M0: prove the install path.
    - M0b: test the map look on the user's iPhone.
    - M1a: engine, saves and CI.
    - M1c: renderer and UI shell.
    - M1b: map version 2.
    - M2–M8: one system at a time.

    The planning range is **about 95–125 weeks**. It is re-estimated from measured velocity after M0b and after M1a. When work slips, a written cut list cuts content first and never the foundation.

### 0.2 What the user's updated decisions changed

| Updated decision | Consequence in this design | § |
|---|---|---|
| First scenario 2011; later 2026, 1990, 1985, 1979 | <ul><li>`GameDate` counts days from 1970-01-01 as a signed number. It is valid for 1850–2200 so leaders' birth dates and old treaty dates fit, and dates are stored with zigzag varints.</li><li>`facts_2011.yaml`.</li><li>Province edges include every border needed from 1979 to 2026.</li><li>The effect vocabulary comes from all five packs, and a stub pack for each is tested in CI.</li><li>The scenario gate uses a path allowlist.</li><li>A source plan per era (§4.2).</li></ul> | 2.3, 4.2, 4.4–4.5, 5.9, 8 |
| End date 2100 | <ul><li>32,872 days per campaign: 9.1 h at ×1, 18 min at maximum speed.</li><li>Price indices are stored as logarithms, and currencies have automatic redenomination, so nothing overflows.</li><li>Single-year ages 0–100+.</li><li>Bands from WPP, IPCC and SSP2 GDP.</li><li>Technology to 2100 is labelled "projected".</li><li>125 yearly history samples plus a campaign-start baseline row.</li></ul> | 2.3, 5.2, 5.7, 5.8 |
| Detailed markets in v1 | §5.1. Input-output coefficients from OECD ICIO (or the BEA fallback), budget shares solved so day 1 clears exactly, chokepoint exposure, nominal accounts in each currency. | 5.1 |
| Detailed parties in v1 | One actor registry, stable party IDs, sparse support rows, up to 12 parties per country, electoral systems as data, two tiers of data collection (D-10). | 5.3 |
| Automated fronts only | No control of single units. Fronts belong to a side and are split into per-country sectors. One front-execution system serves player and AI alike. | 5.4 |
| Full espionage, no assassinations | §5.6. Operations target actor IDs. The fog of war uses estimates tied to intelligence refreshes. | 5.6 |
| Approved satellite map | <ul><li>Blue Marble NG with NASA's topography and bathymetry shading.</li><li>Tiles stream into a cache sized from the screen; visible tiles are never evicted.</li><li>IPA ≤80 MB.</li><li>Lossless graded tiles are kept as a pinned release asset.</li></ul> | 2.5, 3 |
| Approved glass HUD with system blur | Blur cost is measured **end to end** on the device: hitches from presentation timestamps, thermal state over time, battery drain. Automatic fallback to opaque glass under heat, Low Power Mode or Reduce Transparency. | 2.6, 3.7 |
| Western digits (123) | The number formatter (`GameFormatter`) always uses Western digits. | 6.11 |
| User-made images, one per event category | An image registry records the generator's terms. About 16 category images ship as HEIC. | 4.2, 6.12 |
| Autosave each in-game month | Kept, with a minimum real-time interval (D-4). Saves go to the visible Documents folder, with an optional mirror (D-28). | 7 |
| Every screen is designed and approved before it is built | A CI design gate refuses a screen that has no approved design record. Small-phone variants of approved screens also need approval (D-31). | 1.4, 6.1 |

### 0.3 The judges' fatal flaws and how each is fixed

| # | Flaw (proposal) | Fix in this design | § |
|---|---|---|---|
| 1 | B: the 0.5 km level cut into 8×4 tiles overflows 16-bit indices and defeats culling | <ul><li>3 detail levels at 10, 2 and 1 km, in chunks of 2,048 km (middle level) and 1,024 km (finest level). The worst chunks measured 17k and 11k vertices, so 16-bit indices are safe.</li><li>Vertices are 8 bytes.</li><li>The vector pack is memory-mapped.</li><li>Imagery streams with the coarser parent tile shown until the child is ready.</li></ul> | 2.5 |
| 2 | B: budgets heavier than "never heavy" allows | <ul><li>A's limits are adopted.</li><li>120 Hz only while a finger is on the screen and the phone is cool.</li><li>Yearly work spread over January.</li><li>No music in v1.</li><li>Relief comes from NASA's baked imagery, so there is no hillshade at runtime.</li></ul> IPA ≤80 MB because of the approved satellite imagery. | 3 |
| 3 | C: units animate at 30 fps whenever they move | Units jump from province to province and arrows are static. An optional tween of ≤300 ms plays only on arrival, only at ×2 or slower, and only when the phone is cool. A smoke test counts frames with a front on screen. | 2.5, 8 |
| 4 | C: decimal fixed-point does a 128-bit division on every multiply | Binary Q32.32; ratios in basis points; indices as base-2 logarithms. Decimal appears only in `GameFormatter`. Golden values lock the maths. | 2.3 |
| 5 | C: runtime shader compilation accepted in release builds | Allowed only in development builds. The IPA gate fails a tag or release build that has no `default.metallib`. | 2.8 |
| 6 | All: 20 route searches a day blow the daily budget | Hierarchical routing: about 300 route clusters with distances precomputed; a distance field per front; ≤5 fresh searches a day on average and ≤12 on any one day. | 5.4 |
| 7 | A, C: GDP is one nominal figure, so large countries are mis-scaled | <ul><li>Nominal accounts in each government's currency, converted to USD at the market rate.</li><li>A price level for non-traded goods, calibrated to ICP 2011, gives PPP.</li><li>Soldiers' pay, construction and research staff are paid at national prices.</li><li>The day-1 closure tests run in both local currency and USD.</li></ul> | 5.1 |
| 8 | C: α (labour share) per country from PWT is noisy | No α per country. Industries are calibrated to 2011 value added with a productivity residual per country. | 5.1 |
| 9 | C: Palestine as the 1985 owner (anachronism) | The status model is asserted **per area and per pack** in the facts files: <ul><li>Gaza never carries a Jordanian claim.</li><li>East Jerusalem: Israeli law applied from 1967, the Jerusalem Law event on 30 Jul 1980, never recognised.</li><li>Golan: occupied in 1979; Golan Heights Law on 14 Dec 1981, not recognised.</li></ul> 2011 per §4.5 and D-8. | 4.5 |
| 10 | A: no age cohorts | **Single-year ages 0–100+** × 2 sexes, shifted exactly once a year. 5-year bands are used for display only. | 5.2 |
| 11 | A: 2% a day attrition destroys armies on static fronts | Three combat modes (positional, offensive, counter-insurgency calibrated to UCDP) and a frontage cap per terrain. | 5.4 |
| 12 | All: the debt-crisis trigger tests a level, so crises fire on day 1 | `debtStatus`; crises fire only when a value crosses a threshold. **Unrest uses the same crossing rule** and is seeded from 2011 levels (§5.2). Day-1 invariants for debt (30 days) and unrest (90 days). | 5.1, 5.2 |
| 13 | B: scope too large | A's budgets, split milestones, an honest schedule measured from velocity, and a cut list (§9). | 9 |
| 14 | All: IMF, HYDE and FAOSTAT licences assumed safe | Pending sources block release builds. UIS-sourced WDI education series are **denied** (UIS terms are CC BY-SA 4.0). Military expenditure from SIPRI is excluded. | 4.1 |
| 15 | All: the country set is fixed | Polity and government registries plus a runtime ID space. A data-driven **succession** effect with allocation tables. Unify, annex and government-in-exile effects. | 2.4, 4.4, 5.9 |
| 16 | A: Q16.16 indices saturate under inflation | Indices stored as log2 in Q32.32. Currencies redenominate automatically before overflow. A saturation counter must stay at 0. | 2.3 |
| 17 | A: positional binary save chunks | Self-describing columns. Migrations on **typed column buffers**. `SaveDefaults`. Binary metadata. Stable numeric command tags. | 7 |
| 18 | A: the owner is part of the province ID | `p00001` plus a slug, with no country in it. | 4.4 |
| 19 | B: the engine imports the map module | Adjacency, regions and the sea-zone graph live in `ContentDB`. `imports.sh` forbids the engine from importing SaneiMap. | 2.2 |
| 20 | B, C: gates that compare against stored hashes | Determinism is checked within one build: run twice, x86 against arm64, and save → load → continue against an uninterrupted run. Persistent serials make that last check possible. | 8 |
| 21 | B, C: LZFSE saves cannot be read on Linux | Raw DEFLATE everywhere. CI decodes a file made on the device. | 7 |
| 22 | All: a wall-clock benchmark gate is flaky | Merges are blocked on deterministic work counters. Wall-clock time blocks only above 2× the baseline. | 8 |
| 23 | A, C: the province order contract is not stated | The map pack embeds the ordered list of province IDs and its SHA-256. `content.bin` and every `scenario-*.bin` record the same hash, and the app refuses to load on a mismatch. | 2.5 |
| 24 | B: M1 is too large | Split into M0, M0b, M1a (engine, saves, CI), M1c (renderer and UI shell) and M1b (map version 2 with the alias migration). | 9 |

### 0.4 Ideas taken from each proposal

- **From A:**
  - the M0 proof that the app can be built, signed and installed
  - the debug overlay from day 1
  - 3 simulated days per wake-up at maximum speed
  - monthly work staggered by country; yearly work spread over January
  - detail levels at 10/2/1 km with 8-byte vertices
  - a cost ledger for every feature
  - no third-party runtime code
  - country colours assigned so neighbours always differ
  - `@inlinable` and `@frozen` on hot core types
  - explicit task priority (QoS) for the simulation
  - 16 KB page alignment of the map file
- **From B:**
  - the province status model with recognition bits
  - province merging that uses population as well as area, with protected cities and finer conflict zones
  - age cohorts
  - a shortage index for planned economies
  - higher research cost for technology ahead of its time, and a blocklist of names that are too late for a scenario
  - trajectory bands
  - detail panels that query data only while open
  - a per-scenario layer of historical admin regions
  - the save compatibility promise
  - AI weights for historical mode
- **From C:**
  - the module boundaries
  - the frame scheduler and thermal governor as pure state machines tested on Linux
  - `Displayed<T>`
  - the `DialogPresenter` queue
  - facts files run as tests
  - the ID lock
  - `SaveDefaults`
  - the map pack pinned by SHA-256
  - the per-system sub-budget table
  - strategy bots that test balance
  - QJM combat with a frontage cap
  - flags where data sources disagree
- **From the judges:**
  - the two output measures plus the day-1 closure test
  - WMEAT as a military source
  - right-to-left forced at the root of the UI
  - sorting always on a total key with no ties
- **From the critics (this revision):**
  - polity and government as separate entities
  - one actor registry
  - a nominal ledger in each currency
  - a recursive equipment pool
  - persistent serials
  - "why" terms written once through a `TermSink`
  - typed migration buffers
  - Arabic morphology fields
  - chokepoint exposure
  - single-year ages
  - an evidence gate
  - velocity-based planning

---

## 1. Principles: the three conditions as enforceable rules

A rule that nothing enforces is not a rule here. Rule IDs are referenced in the ADRs, the PR template and the CI gates.

### 1.1 Lightness (الخفة)

| ID | Rule | Enforced by |
|---|---|---|
| L1 | **Idle costs nothing.** Paused with no touch means 0 frames, 0 simulation wake-ups and no timers. | `FrameScheduler` unit tests on Linux; a simulator smoke test reads the counters over 5 s; the device overlay. |
| L2 | **Nothing is parsed on the phone.** `content.bin`, `scenario-<id>.bin`, `world-N.mappack` and `world-N.imagery` are baked offline and memory-mapped. Save metadata is binary. JSON parsing lives only in `SaneiBake`, which only `simcli` links. | The IPA gate rejects `*.geojson`, `*.csv` and `*.json` over 64 KB. `imports.sh` forbids `JSONDecoder` and `JSONSerialization` outside `SaneiBake`. |
| L3 | **The world is bounded.** Hard limits: <ul><li>land provinces ≤3,000; sea zones ≤300; total ≤3,300</li><li>polities ≤384 and governments ≤384 (registry ≤320 plus 64 runtime)</li><li>political actors ≤2,048</li><li>formations ≤8,192 worldwide, plus a quota per government (§5.4); armies ≤1,024; fronts ≤256 (sectors ≤1,024)</li><li>fleets ≤512; air groups ≤1,024</li><li>active spy operations ≤512</li><li>notification ring of 512; history in fixed windows</li></ul> | The invariant checker. A weekly all-AI run from 2011 to 2100 checks the maximum counts and that state stays ≤8 MB. The wartime benchmark measures the formation cap. |
| L4 | **Daily work grows only with provinces and active entities.** Monthly work runs on each government's stored slot day. Yearly work runs in its January slot. Strategic AI has its own stagger. Supply, routes, labels, anchors and colour tables are recomputed only when their inputs change. | The work-counter gate (§8). |
| L5 | **The simulation uses integers only**, with binary fixed-point and table-based math. | `banned_api.sh` and the golden values. |
| L6 | **Redraw only on change.** Redraws caused by the simulation happen at most 10 times a second, and nothing animates continuously. | Frame-counter tests, including one with a front on screen at ×1. |
| L7 | **Imagery loads only for the visible area.** Decoding happens off the main thread and the parent tile shows meanwhile. **Visible tiles are pinned.** Prefetch uses only free slots. The cache is sized from the drawable. | Renderer counters (decodes per second, evictions of visible tiles, which must be 0). A Linux test of tile selection and the eviction policy. |
| L8 | **Memory:** ≤160 MB on an A12 phone and ≤210 MB on a Pro Max, with a 250 MB ceiling. Caches can always be dropped; game state never is. Loading a save peaks at most 16 MB above the in-game footprint. | The overlay (`phys_footprint`), a memory-warning test, a peak-memory test for loading a 90-year save, MetricKit. |
| L9 | **One governor** controls the frame-rate cap, maximum speed, MSAA, render scale, the blur fallback, the tween and prefetch. | A pure policy function with unit tests. Thermal recordings at each milestone. |
| L10 | **No third-party runtime code**, no network, no analytics or ads, no WebKit. | `Package.resolved` has no remote packages; the IPA gate requires an empty `Frameworks/`; banned imports. |
| L11 | **SwiftUI discipline.** <ul><li>Views read only models built from snapshots.</li><li>The HUD updates at most 4 times a second.</li><li>At most 6 regions are blurred.</li><li>Long lists are lazy.</li><li>Panels ask for their data only while open.</li></ul> | `Displayed<T>` tests; SwiftLint custom rules. |
| L12 | **Every feature has a cost line** in `docs/perf.md`. | PR template; a CI warning when `Systems/` or `content/` change without a `perf.md` change. |
| L13 | **Every asset class has a size budget** (§3.6), including each scenario file. | The IPA gate's size manifest. |

### 1.2 Realism (الواقعية)

| ID | Rule | Enforced by |
|---|---|---|
| R1 | Every numeric column names its source (`source_id`) or carries `estimate:` with a written method. **Every fact-sourced row carries an evidence record:** URL, Wayback snapshot ID, a quoted snippet (≤300 characters) that contains the value, and the retrieval date. | The validator and the evidence gate (R11). |
| R2 | Each data source has a licence status: allowed, pending verification (blocks release builds) or denied. Licences are checked **per series**, not just per publisher. | The licence gate. |
| R3 | **Facts are tests.** `facts_2011.yaml` holds about 150 assertions, each with an evidence record. Each later scenario has its own facts file, asserted **per area and per pack**. | `simcli facts` on every PR. |
| R4 | **The start date matches the data**, compared against **composed targets** from the territory-composition table (§4.6): <ul><li>population and GDP within ±0.5%</li><li>military spending share within ±10% relative (against WMEAT)</li><li>fiscal balance within ±1 percentage point of GDP</li><li>trade balance within ±2 points</li><li>province sums equal country totals exactly</li><li>every national market clears at base prices; month-1 price change ≤1%</li></ul> Closure runs in both local currency and USD. Which tests apply in which era is listed in §4.2. | `simcli validate --t0`. |
| R5 | Only published models. Every coefficient lives in `defines.json` with `rationale` and a typed `calibratedAgainst`, one of three classes: <ul><li>`data:<source>`</li><li>`literature:<ref>`</li><li>`design-target:<bot target>`</li></ul> Design-target values are excluded from realism claims and listed as «قيم تصميمية» (design values) on the sources screen. | The validator rejects an untyped or empty `calibratedAgainst`. |
| R6 | **Trajectory gates.** In historical mode, 2011–2021 is compared with what really happened. 2011–2100 is compared with WPP 2024, IPCC AR6, and **GDP bands from SSP2 or the OECD long-term baseline** for the world and the top 10 economies. | Weekly long runs; nightly short runs. |
| R7 | **No anachronism and no fiction.** Each tech level carries its year, research ahead of history costs more, each scenario has a blocklist, and projected content is labelled «مُسقَط» (projected). | The validator. |
| R8 | **The AI is honest.** It uses the same Commands and the same visibility layer as the player, and difficulty changes only the quality of decisions. **No personality traits are authored or shown for real, named people.** AI personality comes from regime, bloc and data. | Tests; a lint rule that bans `isAI` branches in `Systems/`; the validator rejects trait fields on real leaders. |
| R9 | **Every value can be explained.** Each derived value is written once, as `func f<S: TermSink>(…, into: inout S)`. The simulation uses a summing sink that allocates nothing; the «لماذا؟» (why?) sheet uses a list sink holding at most 12 terms inline. | A lint rule bans `-> [Term]` and duplicate fast paths; a test checks that the sum equals the list total for each value. |
| R10 | **Sensitive content stays neutral.** Disputed territories follow ADR-0014, with de facto and de jure views and neutral labels. | A content-review checklist; facts assertions on the status fields. |
| R11 | **Evidence gate.** <ul><li>Every evidence record has a snapshot ID, and its quote contains the value (after normalising digits, separators and units).</li><li>A weekly network job checks that the snapshots resolve.</li><li>Every data PR carries `verification/<pr>.json` from a **second, independent AI session**. That session re-extracts a seeded 10% sample (seed = PR number + head SHA) from the snapshots without seeing the PR's values. Any mismatch, or a sample that does not match the seed, blocks the merge.</li></ul> | `tools/checks/evidence_gate.py`. |

### 1.3 Strong foundation (الأساس المتين)

| ID | Rule | Enforced by |
|---|---|---|
| F1 | The engine is pure Swift and builds on Linux. Dependencies point one way only. | The SwiftPM target graph and `imports.sh`. |
| F2 | **Determinism kit:** <ul><li>binary fixed-point</li><li>seeded random streams keyed by **persistent serials**</li><li>no iteration over a Dictionary or Set</li><li>every sort uses a total key (value, then serial or stable ID)</li><li>iteration over handle tables follows serial order</li><li>no libm, `Date` or `.random` in the engine</li></ul> | `banned_api.sh`; within-build determinism tests, including save → load → continue. |
| F3 | Commands are the only way to change state. The AI uses the same Commands. | Access control; an import allowlist for `SaneiAI`. |
| F4 | Stable IDs live in registries that can only grow. Removing an ID needs an alias with population weights. **Runtime IDs** (`dyn:<serial>` for polities, governments and actors) live in the save's ID lists and never collide with registry IDs. | `ids_lock.py`; the runtime-namespace test. |
| F5 | Behaviour lives in data: `defines.json`, modifiers, regime, electoral, monetary and constitutional parameter sets, and the effect vocabulary. **Scenarios are data only.** | <ul><li>The validator.</li><li>The **stub-pack test**: CI parses stub packs for 2026, 1990, 1985 and 1979 and runs each for 30 days on a tiny world from M1a.</li><li>The scenario gate: path allowlist in §2.8.</li></ul> |
| F6 | **Saves load forever:** self-describing columns, typed migration buffers, `SaveDefaults`, golden saves, and stable numeric tags for every persisted enum case and field. | The golden-save gate; the `SaveDefaults` test; a tag-registry lock. |
| F7 | One file, `Pipeline.swift`, owns the order of the daily stages, and each system declares the columns it reads and writes. | A test that fails on two writers of one column in a phase. |
| F8 | **Repository hygiene.** <ul><li>Git holds text.</li><li>Map, imagery and graded-tile packs are release assets pinned by SHA-256.</li><li>No archives in git.</li><li>The Xcode project is generated.</li><li>Versions are pinned.</li></ul> | CI gates. |
| F9 | Decisions are recorded in ADRs. `CLAUDE.md` stays ≤150 lines. Files fail at 600 lines. No names containing V2, Patch, Fix, Old or New. `jscpd` allows 0 new clones. | Lint. |
| F10 | **Extension points are declared in M1a** as columns with defaults, codecs and stub tests: <ul><li>polity and government tables; the actor registry with all four roles</li><li>currencies and the nominal ledger; FX reserves; money base</li><li>goods and industries; chokepoint exposure</li><li>party rows; group rows; electoral, regime and monetary parameter sets</li><li>the equipment pool and allocation columns</li><li>front sectors; espionage pair-extension rows; the visibility epoch</li><li>climate state; single-year cohorts</li><li>regions and sea zones; map versions and aliases</li><li>design tokens; `DialogPresenter`; Arabic morphology fields</li></ul> | The M1a exit checklist (§9). |
| F11 | **Native lifecycle.** The app uses scene phases and saves when it goes to the background. Bundle content is never copied to a writable folder. | `banned_api.sh`. |
| F12 | **One identity per real-world actor.** A party, movement, faction, armed group or ruling body is one actor ID for its whole life. A role change never copies data into a new entity. | Validator; a test that every reference to a party, movement, controller or spy target uses an actor ID. |

### 1.4 Process (العملية)

| ID | Rule | Enforced by |
|---|---|---|
| P1 | **No screen without an approved design**, including small-phone variants of approved screens. Each screen declares `static let designID`, and its record lives in `docs/design/approved/`. | `tools/checks/design_gate.py`. |
| P2 | Every milestone ends with an IPA installed on the user's iPhone and an entry in `docs/perf.md`. The numbers come from the in-app recorder (§3.8), not from Instruments. | Milestone exit criteria. |
| P3 | PRs stay at about 400 changed lines or fewer, not counting data. `main` is protected, and the user merges from the phone. | GitHub settings; PR template. |
| P4 | **Plans follow measurement.** Velocity (PRs merged per week, days to approve a design, days to check on the device) is recorded weekly in `docs/velocity.md`. Every milestone is re-estimated after M0b, after M1a and at each milestone end. A milestone running more than 30% over its estimate applies the cut list (§9). Cuts that touch a user decision need the user's approval (D-25). | Milestone review checklist. |

---

## 2. Technical architecture

### 2.1 Repository layout (a new clean repository is recommended, D-1)

```
Package.swift                         # swift-tools 6.0, Swift 6 language mode
Sources/
  SaneiCore/ SaneiContent/ SaneiBake/ SaneiMap/ SaneiEngine/ SaneiAI/ SaneiPresentation/
  simcli/  CZlib/                     # CZlib links system zlib, simcli only
Tests/<Module>Tests/   Tests/Golden/{saves,replays,values}/   # values = DetRNG + DMath only
App/project.yml                       # XcodeGen 2.46.0; .xcodeproj is gitignored
App/Sources/{App,UI,MapRenderer,Platform}/
App/Resources/{Assets.xcassets,Localizable.xcstrings,Shaders/*.metal,Sounds/,Art/}
content/packs/base/                   # goods, industries, techs, unit types, regime/electoral/monetary/
                                      # constitution parameter sets, policies, blocs, spy ops, effect
                                      # vocabulary schema, generic events/, decisions/, defines.json,
                                      # modifiers.json, loc/ar/
content/scenarios/s2011/              # scenario.json, polities.csv, governments.csv, actors.csv,
                                      # provinces_status.csv, groups.csv, economy.csv, industries.csv,
                                      # trade_partners.csv, party_support.csv, elections.csv, military.csv,
                                      # equipment.csv, intel.csv, diplomacy.csv, research.csv, unrest_seed.csv,
                                      # admin_regions.csv, events/, facts.yaml, loc/ar/
content/scenarios/stubs/{s2026,s1990,s1985,s1979}/   # headline events + institutions only (CI parse test)
content/map/world-1/                  # provinces.csv, adjacency.csv, regions.csv, seazones.csv,
                                      # chokepoints.csv, label_anchors.csv (cache), map.lock.json
content/registry/                     # province_registry.csv, polity_registry.csv, actor_registry.csv,
                                      # group_registry.csv, currency_registry.csv, aliases.json
content/territory/composition.csv     # game polity -> source location codes (+/-) per dataset
content/evidence/                     # evidence records (url, snapshot, quote, date) per data file
content/art/registry.yaml   content/flags/   content/SOURCES.yaml
verification/                         # second-session re-extraction results per data PR
design/tokens.json
docs/{adr/,systems/,design/approved/,perf.md,velocity.md}
tools/{datapipeline/,imagery/,checks/}  CLAUDE.md
.github/workflows/{ci-linux,ios,weekly,map-repro}.yml   .github/pull_request_template.md
```

### 2.2 Modules and dependency rules

| Module | May import | Contains | Must never |
|---|---|---|---|
| `SaneiCore` | stdlib only | `Idx<T>`, `Handle<T>`, `Serial`, `Interner`, `BP`, `Q32`, `LogQ`, `LCU`, `USDn`, `Money`, `Pop`, `GameDate`, `DetRNG`, `DMath`, `StateHasher`, `RingBuffer`, `HandleTable` (serial-ordered), `DenseMatrix`, `BitSet`, `TermSink` with `SumSink` and `TermBuffer12`, the column codec (varint, zigzag, raw). Hot types are `@frozen` and `@inlinable`. | Foundation |
| `SaneiContent` | Core | <ul><li>Readers for `content.bin` and `scenario-*.bin`.</li><li>`ContentDB`, holding the static rules: goods, industries, input-output templates, adjacency, route clusters, regions, sea zones, chokepoints, terrain, units, techs, parameter sets, effect vocabulary, defines, modifiers, Arabic strings with morphology fields.</li><li>`ScenarioStart`, mapped only while a new game is being built.</li><li>The validator.</li></ul> | Parse JSON; know about `WorldState` |
| `SaneiBake` | Core, Content, Foundation | JSON and CSV loaders with strict decoding; the baker; the evidence and stub-pack checks | Be linked into the app |
| `SaneiMap` | Core | <ul><li>Readers for the map pack and the imagery index.</li><li>Projection, choice of level, chunks and tiles.</li><li>The tile-cache policy (pinned visible set).</li><li>Picking.</li><li>Label placement around HUD rectangles.</li><li>**Runtime label anchors.**</li><li>`FrameScheduler` and the governor policy.</li></ul> | Metal, UIKit, Content, Engine |
| `SaneiEngine` | Core, Content | `WorldState`, the systems, `Pipeline`, `Command` (with numeric tags), `Ledger` (per currency), `Visibility`, invariants, front execution, `SaveCodec`, `SaveTree` (typed columns), migrations | SaneiMap, Foundation dates or timers, Dispatch, `Float`/`Double`, libm, `.random`, iterating a Dictionary or Set, `Codable` on persisted types |
| `SaneiAI` | Engine's public API, Content, Core | Strategic, operational, diplomatic and intelligence AI. Outputs Commands only. | Touch `WorldState` internals |
| `SaneiPresentation` | Engine, Content, Core, Foundation | `GameFormatter` with the **Arabic morphology layer**; why-terms turned into rows; map-mode colour functions; view data; Arabic search normalization; notification text | SwiftUI, UIKit, Metal |
| `simcli` | All modules, plus `SaneiBake` and `CZlib` | `validate`, `facts`, `evidence`, `stubs`, `bake`, `run`, `replay`, `bench`, `balance`, `history-check`, `save-inspect`, `peak-load` | — |
| App/UI | All packages | SwiftUI shell, `GameScreen` screens, `DesignTokens`, `GlassStyle`, `DialogPresenter`, `GameStore`, the layout fit engine | Change state except through `host.submit` |
| App/MapRenderer | Core, Map, Metal | Imagery, overlays, borders (stencil-once), glow, fronts, markers, arrows, distance-field labels, overlay counters | Read the engine or content |
| App/Platform | Core | Storage (Documents, mirror bookmark), DEFLATE, the binary metadata reader, audio, haptics, thermal and power state, memory pressure, image decoding, **ring-buffer log**, MetricKit and `MXDiagnosticPayload` export, the 60 s recorder | — |

Dependencies run one way: Core ← Content ← Engine ← AI; Core ← Map; Presentation depends on Engine. The Linux build leaves out the App targets.

### 2.3 Core primitives and the determinism kit

| Type | Representation | Used for | Notes |
|---|---|---|---|
| `BP` | Int32, units of 1/10,000 | Shares, rates, unrest, party support | Division by the constant 10,000 compiles to a multiply |
| `Q32` | Int64, Q32.32 | Growth maths, productivity, elasticities | Multiply = 128-bit product shifted right, with no division |
| `LogQ` | Int64, log₂ in Q32.32 | Price levels per currency, exchange rates, the USD deflator | Cannot overflow in practice |
| `LCU` | Int64 in a **per-currency scale** (10^k local units) | Treasury, taxes, domestic debt, money base, wages, prices of non-traded goods | If a balance passes 2^60 the currency **redenominates**: the scale moves by 10^3 with a logged posting. Real redenominations (for example Turkey 2005) are effects. |
| `USDn` | Int64, units of $1,000 nominal USD | FX reserves, external debt, world-market account, trade settlement | — |
| `Money` | Int64, $1,000 of **constant 2011 USD** | Reports, comparisons, score, "why" values | **Derived only:** USDn ÷ the world USD deflator. Never posted to. |
| `Pop` | Int64 per government; Int32 per province or cohort | People | — |
| `GameDate` | Int32 days since 1970-01-01, signed | 1850–2200 (tested) | Zigzag varints in saves |
| `Serial` | UInt32 from a saved counter per entity kind | Runtime entity identity | Never reused |

- **`DMath`:** `log2` and `exp2` from 1,024-entry tables, `isqrt`, logistic. Relative error ≤1×10⁻⁶, locked by golden values.
- **`DetRNG`:** SplitMix64 with counter-based seeds `rng(seed, key, stream, serial)`, where `key` is the day or, for fog of war, the intelligence epoch. One stream per system.
- **Overflow** saturates (clamps), and a saturation counter must stay at 0 in games without cheats.
- **Sorting:** total key (value, then serial or stable ID).
- **Cross-module speed:** `@frozen` and `@inlinable` hot types, whole-module optimization, and a bench counter that fails above 1.2× an in-module copy.
- **`TermSink`:**

  ```swift
  protocol TermSink { mutating func add(_ id: TermID, _ v: Q32) }
  @frozen struct SumSink: TermSink { var total: Q32 }        // simulation, 0 allocations
  @frozen struct TermBuffer12: TermSink { /* 12-slot tuple */ } // «لماذا؟», still 0 allocations
  func stabilityTarget<S: TermSink>(_ g: GovIdx, _ w: borrowing WorldState, into s: inout S)
  ```

  A 13th term in the list sink folds into «أخرى» (other). The sum stays exact.

### 2.4 Simulation engine and threading

**State.** `ContentDB` is immutable and shared. `WorldState` is a value type made of column tables:

| Table | Rows | Main columns | Size (est.) |
|---|---|---|---|
| Provinces | ~3,150 (≤3,000 land + ~250 sea) | <ul><li>Status: sovereign (polity), administrator (government), controller (`AgentRef`: a government or an actor in one uint16 space), controlPct, claims, flags</li><li>People: population, urban share, 3 skill-tier shares</li><li>Condition: unrest, unrest offset, infrastructure, damage, fortification, supply capacity, admin-region ID</li></ul> | 0.40 MB |
| Group rows (sparse) | ~8,000 | (province, group, share, grievance). Groups come from a global registry with two dimensions, ethno-linguistic and religious. No limit per province. | 0.06 MB |
| Industries | ~17,000 | Province, type, capacity, utilisation, damage, state share, last margin | 0.43 MB |
| Polities | ≤384 (`exists`) | Territory summary, UN membership, the UN-seat government, bloc seats, continuator links, flags | 0.03 MB |
| Governments | ≤384 (`exists`) | <ul><li>Currency; treasury (LCU); 9 budget lines; taxes; money base; FX reserves (USDn); debt as domestic LCU plus external in 3 currency buckets; debt status; monetary parameter set</li><li>202 single-year cohorts; 22 market cells × 6; 3-tier labour market</li><li>Regime, constitution and electoral parameter-set IDs plus overrides; offices; franchise rules</li><li>Research, intelligence, equipment pool (5 categories × 6 generations), reserve pool</li><li>Scheduling: `monthlySlot`, `lastMonthlyRun`, `lastYearlyRun`, `aiNextStrategic`</li><li>`exileHost` (government in exile)</li></ul> | 1.3 MB |
| Actors | ≤2,048 | Stable or runtime ID, home polity, kind, and role components: party (seats, ideology axes, regime-loyal flag), armed (movement strength, capacity, formation quota), controller, government link | 0.13 MB |
| Party support (sparse) | ~16,000 | (province, actor, support in bp) | 0.13 MB |
| Government pairs, dense | 384² × 8 B | Opinion, treaty bits, **recognises-state** bit, **recognises-government** bit, sanction bits, escalation rung, claim bit | 1.18 MB |
| Pair extension (sparse) | ~6,000 | Spy network, intelligence level, exposure heat, **intel epoch**, partner share | 0.10 MB |
| Handle tables | Capped (L3) | Formations (with equipment allocations), armies, fronts and sectors, wars, fleets, air groups, operations, projects, treaties. Each row carries its `Serial`. | ≤0.9 MB |
| Queues and history | — | Event queue, decisions, a 512-entry notification ring. History: 12 series × existing governments × (60 monthly + 125 yearly) plus a campaign-start baseline row. | ≤2.6 MB |
| World | 1 | 22 world prices and stocks, world interest rate, **USD deflator**, chokepoint disruption (~10), CO₂, temperature, sea level, entity counters | <2 KB |
| **Total** | | | **≈7.3 MB** (≤8 MB) |

**Daily pipeline** (`Pipeline.swift`, in this order):

1. `ApplyCommands`, sorted by (day, issuerRank, sequence).
2. **Global calendar jobs:**
   - Day 1 of each month: the world-market step, then the transport payout.
   - Day 1 of each quarter: world interest rate and ratings.
   - 1 January: climate and the USD deflator.
   - Scheduled elections.
3. `DatedEvents`.
4. `DiplomacyDaily`.
5. `FrontExecution`: each front every 3 days, staggered by serial. Each country's sector moves only that country's formations (§5.4).
6. `Movement`, `Combat`, `Occupation`, `Supply` (when dirty), `AirRegions`, `NavalZones` (sets chokepoint disruption).
7. `Espionage`.
8. `Construction`.
9. `LedgerDaily`: smooths planned monthly flows.
10. **Monthly slot.** Governments with `monthlySlot == day` and `lastMonthlyRun` not in this month run:
    - `Economy`
    - `Population`, `Internal`, `Politics`, `Intelligence` (advances intel epochs), `Research`, `DiplomacyDrift`, `ConditionalEvents`

    Then `lastMonthlyRun` is set.
    - **Slot rule for a new government:** it is assigned the least-loaded slot whose day has not yet passed this month. If none is left, it gets the least-loaded slot overall and first runs next month, with this month's flows initialised pro rata.
    - This guarantees **exactly one run per government per month**.
11. **Strategic AI stagger.** Governments with `aiNextStrategic ≤ today` run, at most 15 a day, ordered by (due date, serial). Each then reschedules by its difficulty period (§5.10).
12. **Yearly, in each government's January slot** (guarded by `lastYearlyRun`):
    - age shift of single-year cohorts
    - births and deaths
    - skill tiers
    - equipment depreciation
    - refresh of the top 10 trading partners
    - climate impacts
    - technology diffusion
    - decay of the unrest offset
13. `AIOperational` for governments at war (every 3–7 days).
14. `Notifications`, `HistorySample`. In debug and test builds, the invariants and, in replay mode, the state hash.

**Commands.** `enum Command: Sendable`. Each case has a **stable numeric tag** (`UInt16`) and tagged fields, written in the column codec. Synthesised `Codable` is never used for persisted data. Each case has `validate` and `apply`, and a rejected command leaves the state hash unchanged. Important cases:
- `RenameLeader`; `StartProject`, `CancelProject`; `SetBudget`, `SetTax`, `SetPolicy`
- `AssignArmyToFront`, `SetSectorOrder(hold|attack, arrows[≤3])`, `AirMission`, `FleetMission`, `Mobilize`
- `LaunchSpyOp(target: ActorRef|GovRef, …)`, `CancelSpyOp`
- `ProposeTreaty`, `ImposeSanction`, `RecogniseState`, `RecogniseGovernment`, `UNSCVote`
- lifecycle effects reachable only from events, peace deals or negotiation: `Succession`, `Unify`, `Annex`, `CreateGovernment`, `DissolveGovernment`, `TransferUNSeat`, `GovernmentInExile`

**Ledger (ADR-0019).**
- Each government has accounts in its own currency (LCU), plus an FX-reserves account in USDn. The world market has a USDn account.
- `Ledger.post(account, category, amount)` works in the account's unit.
- Cross-currency flows are posted as pairs at the day's exchange rate under an `fx` category.
- When an exchange rate or price index changes the LCU value of foreign-currency debt or reserves, the change is posted under a `revaluation` category.
- **Invariants:** per account, Δbalance = Σ postings, in its own unit. The world account is exactly 0 after each monthly close. The day-1 closure is checked in LCU and in USD.

**Threading.**
- `GameHost` is an `actor` on the default executor. Its loop runs in a `Task` at `.utility` priority from ×1 to ×10 and at `.userInitiated` at maximum speed.
- It sleeps with `ContinuousClock`. At maximum speed it runs 3 days per wake-up.
- If a wake-up overruns, the effective speed drops and the HUD shows it.
- While paused it waits on a control stream with no wake-ups.
- **What crosses to the UI:**
  - `ViewSnapshot`, sent through `AsyncStream(.bufferingNewest(1))` at most 10 times a second.
  - Detail panels call `await host.query(…)` only while open.
- **On the main actor**, `GameStore` updates panel models through `Displayed<T>`. Map buffers and runtime label anchors are rebuilt in background tasks when their versions change.

**Lifecycle.**

| Event | Action |
|---|---|
| `.inactive` | Pause and remember the speed. |
| `.background` | Call `beginBackgroundTask`. Then snapshot, autosave atomically, mirror if enabled and due, stop the display link and audio, and end the task. |
| Back to `.active` | Stay paused. |
| Memory warning | Shrink the tile cache to its minimum (48 slices) with a +1 level bias, drop the label and glyph atlas (rebuilt lazily) and the event image. Never drop game state. |
| Launch after an unclean exit | Offer «استئناف من آخر حفظ تلقائي» (resume from the last autosave), and offer to export the diagnostics. |

### 2.5 Map rendering (Metal, satellite base)

**Assets.** All are memory-mapped, every section is aligned to 16 KB pages, and the file is mapped with `makeBuffer(bytesNoCopy:)` where possible.

| File | Contents | Budget |
|---|---|---|
| `world-1.mappack` | <ul><li>Header and section table with crc32.</li><li>The ordered list of province IDs and its SHA-256.</li><li>Fill meshes for 3 levels (8-byte vertices).</li><li>**Border instances, 16 bytes each:** endpoints a and b (`short2` each), left and right province (`ushort` each), and **cumulative arc length at a** (`uint32`, in 8 m units along the shared border's polyline).</li><li>Chunk tables, the picking grid and rings.</li><li>The start-date label-anchor cache.</li></ul> | ≤24 MB |
| `world-1.imagery` | Tile index and tiles z0–z7 (256×256), plus the resident world base: z4 at 4096×2085 in ASTC 8×8, about 2.1 MB | ≤40 MB |

**Province-order contract.** `content.bin` and every `scenario-*.bin` store the map pack's SHA-256, and the app refuses a mismatch. The bake gate and the IPA gate compare the hashes.

**Vector detail levels** (measured on raw Natural Earth admin-1, Miller projection; the final layer is merged, so it is smaller):

| Level | Tolerance | Used at | Vertices | Chunking |
|---|---|---|---|---|
| L0 | 10 km | more than 8 km per screen point | 78k | 2–4 chunks |
| L1 | 2 km | 2–8 km/pt | 276k | 2,048 km chunks; worst chunk 17k vertices |
| L2 | 1 km | under 2 km/pt; maximum zoom 1.0 km/pt | 430k | 1,024 km chunks; worst chunk 11k vertices |

All indices are 16-bit, and shared borders are simplified once, preserving topology. The 4-byte growth of border instances adds about 3 MB (estimate), which is within the ≤24 MB budget.

**Imagery pyramid.** Tile counts were measured with `wf/final/tiles_est.py`:

| Level | km per pixel at the equator | Tiles stored |
|---|---|---|
| z0–z4 | 157 → 9.8 | 201 (all) |
| z5 | 4.9 | 544 (all) |
| z6 | 2.45 | 1,086 of 2,112 (land only) |
| z7 | 1.22 | 3,582 of 8,448 (land only) |

- **As HEIC:** about 20–36 MB in total (estimate).
- **As ASTC:** about 66 MB, with no decoding.
- The codec is decided in M0b (D-2).

**Offline imagery bake** (`tools/imagery`; runs on Linux, in a CI job or on any Linux machine):
1. Take **Blue Marble NG with Topography and Bathymetry** (500 m, NASA, 2004 monthly mosaic). NASA bakes in relief from SRTM-era topography and depth shading for the sea. **GMTED and ETOPO are no longer needed for imagery** (D-26).
2. Reproject to Miller (−60° to 84°), window by window from the source tiles, so peak disk use stays within a standard runner. GDAL is used as a tool only.
3. Apply the approved grade: brightness ≈0.72, saturation ≈0.78, cool tint, with values from `design/tokens.json`. Optionally darken the sea a little further using the variant's own depth shading.
4. Write **lossless graded tiles**, about 1 GB (estimate). These are published as a pinned release asset, and **reproducibility is checked on their decoded pixels** (SHA-256 of the RGB data, not of the file bytes).
5. Encode with a pinned `astcenc` binary (ASTC; reproducible per version, to verify), or with ImageIO HEIC on the macOS runner. The encoded pack is itself a pinned release artifact, checked by a PSNR floor against the graded tiles, not by byte equality.
6. Write the pack with 16 KB alignment and record its SHA-256 in `map.lock.json`.

The shader takes one texture sample per pixel. There is no relief shading or grading at runtime.

**Runtime streaming.**
- **Tile choice:** the level with a +0.5 bias. At most 45 tiles are visible on a 2868×1320-pixel screen and about 24 on an XR.
- **Cache size comes from the drawable:** visible maximum + prefetch ring + 16 parents, rounded up to a multiple of 16. That gives **64 slices (16 MB, RGBA8) on an A12** and **96 slices (24 MB) on a Pro Max**; an iPad later would need 128. If ASTC is chosen in D-2, slices are about 10.8 KB each and the cache drops to about 1 MB.
- **Pinned visible set:** tiles on screen, and the ancestors currently drawn for missing ones, are never evicted. Prefetch fills **free slots only** and is the first thing evicted. A counter of evictions of visible tiles must stay at 0.
- **Decoding:** a background task at `.utility`, at most 2 in flight. Arrivals cause at most one redraw per 100 ms batch.
- **Prefetch:** a 1-tile ring, only while settling, never during a 120 Hz gesture, and never in Low Power Mode.

**Layers and draw calls per frame:**

| # | Layer | Draws |
|---|---|---|
| 1 | Imagery (instanced), plus a second copy of the world at the 180° line | 1–2 |
| 2 | **Map-mode overlay**, RGBA per province with alpha 0–0.55. Political mode: light cyan fill on the player; occupation drawn as stripes. | ≤20 |
| 3 | **Borders and glow.** Instanced. Each style class is drawn with a **stencil-once** test (a pixel is written once per class), so translucent quads never double-blend at joints. Dashes are computed from arc length × scale, so the pattern runs **continuously along the polyline**. Styles: <ul><li>country border: cyan, about 1 pt, 60%</li><li>province line: faint cyan, 0.5 pt, about 18%, hidden at L0</li><li>disputed edge: dashed</li><li>front line: amber, dashed</li><li>player edge: soft cyan glow</li></ul> | ≤22 |
| 4 | Fronts, army markers (NATO-style symbols drawn in code), arrows | 3 |
| 5 | **Labels: a single-channel distance-field glyph atlas.** Pass 1 draws all halos, pass 2 all fills (§2.5 Labels). | 2 |
| 6 | Selection and hover via uniforms | 0 |
| | **Total** | **≤50** |

Per-province arrays (sovereign, administrator, controller, flags, mode colour) are about 3 × 3,300 × 12 B. They are kept in 3 rotating copies and re-uploaded only on a version change. 4× MSAA uses memoryless attachments, and the stencil buffer is memoryless too.

**FrameScheduler** (pure state machine, tested on Linux):

| State | Rendering |
|---|---|
| `Idle` | Display link paused |
| `Interacting` | 60 Hz; 120 Hz only while touching and when the governor allows |
| `Settling` | 0.5 s after the last input |
| `DataChanged` | 1 frame |
| `TileArrival` | At most 10 Hz |
| `Tween` | ≤300 ms (D-15) |

The view uses `CAMetalDisplayLink` (iOS 17+).

**Picking.** Grid lookup, then point-in-polygon (≤0.2 ms). If a tap misses, the nearest province centre within 22 pt is chosen; an ambiguous tap opens a chooser; micro states get tap markers. Linux tests use known points.

**Labels (decided in M0b, D-2b).**
- **Default: a glyph distance-field atlas.** Core Text shapes each label string once, off the main thread. The glyph IDs (Arabic contextual forms are distinct glyphs) and their positions are cached per label.
- Each glyph is rasterized once at a single size into a 1024×1024 R8 signed-distance atlas (1 MB) using the system Arabic font at runtime. The font is never redistributed.
- Drawing takes two passes: **all halos first, then all fills**, so a halo never cuts into the join of the previous glyph. This is 2 draws in total, at any size, with no re-rasterising while panning.
- **Fallback if small Arabic sizes look soft on the device:** a string atlas holding only the visible labels, with sizes snapped to 3 steps and two-pass halo and fill.
- The overlay shows atlas occupancy and rasterisation time.
- **Runtime label anchors.** When the administrator array's version changes, a background task recomputes anchors for the affected governments (and for the sovereign view when it is toggled):
  - take the largest connected component of the government's provinces
  - choose the province with the greatest adjacency distance from the component's border, with ties going to the area-weighted centroid
  - orient the label along the component's principal axis, and size it by the component's extent

  The baked anchors are only the cache for the start date.
- **Labels hide under the HUD.** The UI publishes the rectangles it covers. Placement skips labels inside them and first tries a runtime alternate position, the next-best province in the component.
- The map view is forced left-to-right internally; the text stays right-to-left.

**Governor controls:** frame-rate cap, render scale (1.0 or 0.75), MSAA, blur to opaque, tween, maximum speed, prefetch.

### 2.6 UI layer

- SwiftUI App lifecycle. Default main-actor isolation only on the App target.
- **Right-to-left.** `CFBundleDevelopmentRegion = ar`, and `ar.lproj` is the only localization. `.environment(\.layoutDirection, .rightToLeft)` is forced at the root. Layout uses leading and trailing edges only.
- **Tokens.** `DesignTokens.swift` is generated from `design/tokens.json`. `GlassStyle` is the only place a material may be used.
- **Custom chrome only** on the play screen: no system TabView, NavigationBar or `.sheet`.
- **Layout fit engine.** The width class comes from the **safe-area width minus margins** (§6.3). Variants are chosen once per campaign and again on an inset change, never per tick. Chip widths are reserved from the longest formatted value class, not the current value.
- **`DialogPresenter`** is one queue for every dialog. Every request has a default or an expiry.

### 2.7 Saves

Summarised here; the full specification is §7. Self-describing tables, binary metadata, commands stored with numeric tags, typed column buffers for migration, raw DEFLATE, and the Documents folder with an optional mirror.

### 2.8 Build and CI pipeline

**`project.yml` essentials.**
- Resources are listed only under `sources:` (a target-level `resources:` key is ignored by XcodeGen). `build/Bundle` holds `content.bin`, `scenario-s2011.bin`, `world-1.mappack` and `world-1.imagery`.
- Info.plist:
  - orientations exactly LandscapeLeft and LandscapeRight
  - `CADisableMinimumFrameDurationOnPhone = YES`
  - `ITSAppUsesNonExemptEncryption = NO`
  - `CFBundleDevelopmentRegion = ar`
  - `UIStatusBarHidden = YES`
  - **`UIFileSharingEnabled = YES` and `LSSupportsOpeningDocumentsInPlace = YES`**
  - an exported type for `.sanei`
- `TARGETED_DEVICE_FAMILY = 1`, arm64 only, no entitlements.
- **A fixed bundle ID**, documented for re-signing (§7).

**Workflows** (redesigned to fit CI minutes; costs in D-1):

| Workflow | Runner | Trigger | Steps |
|---|---|---|---|
| `ci-linux.yml` | `ubuntu-24.04` (x86 only) | PRs and merges to `main`; `concurrency` cancels superseded runs; path filters skip runs for documentation-only changes | <ol><li>Hygiene: archives, `.xcodeproj`, banned APIs, imports, SwiftLint, jscpd, file length, names, design gate, scenario gate, tag-registry lock.</li><li>Build with warnings as errors; tests.</li><li>`simcli validate`, `facts`, `validate --t0`, `stubs`, `evidence` (offline part).</li><li>Bake, size gate, province-order hash.</li><li>Licence gate; ID lock.</li><li>Golden saves and replays; the DEFLATE fixture; the peak-load test.</li><li>Determinism (§8).</li><li>Work-counter gate.</li></ol> Uploads the determinism-hash artifact. Target ≤12 min. |
| `ios.yml` | `macos-26`, Xcode 26.x pinned | **Manual dispatch** (the user taps "Run workflow" in the GitHub app), tags, and one scheduled run a day **only if** `main` changed since the last IPA (a 1-minute Linux job checks first). Not on PRs. | <ol><li>Restore the cached Metal toolchain, or run `xcodebuild -downloadComponent MetalToolchain` with 3 retries. Tags fail without `default.metallib`.</li><li>Fetch the packs (cached by SHA-256).</li><li>Bake; XcodeGen.</li><li>Engine tests on the arm64 simulator, **comparing the determinism hash with the Linux artifact for the same commit** (this replaces a Linux arm runner).</li><li>Smoke UI test.</li><li>Release build with `CODE_SIGNING_ALLOWED=NO`.</li><li>IPA gate.</li><li>Upload; a tag creates a Release.</li></ol> |
| `weekly.yml` | Linux x86 | Weekly, or manual | Trajectory gates (2011–2021, 5 seeds), long-run gates (2011–2100, 3 seeds), strategy bots, wall-clock trend, evidence link check (network), and a nightly-size subset of the trajectory bands on `main` |
| `map-repro.yml` | Linux only | Monthly or manual | Download the graded-tile release asset, re-run grading from the pinned raw source on a sample of 64 tiles, and compare decoded-pixel hashes; check the encoded pack's SHA-256 against `map.lock.json` and its PSNR floor |

**Scenario gate.** A PR labelled `scenario` may change only:
- `content/scenarios/**`
- `content/registry/**` (append-only, checked by the ID lock)
- `content/art/**`, `content/flags/**`, `content/evidence/**`, `verification/**`
- `docs/design/approved/**`
- `content/SOURCES.yaml` (append-only)

It must not touch `Sources/**`, `App/Sources/**` or `content/packs/base/**`. Map lines go through a separate PR labelled `map-version`.

**IPA gate checks:**
- the executable is arm64; `MinimumOSVersion` is 17.0; `UIDeviceFamily` is [1]
- orientations are exactly landscape; the frame-rate and encryption keys are set
- `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace` are present
- the icon and `Assets.car` are present; `default.metallib` is present (mandatory for tags)
- every pack's SHA-256 matches, and the province-order hashes match
- `ar.lproj` is present; the credits file hash matches
- `Frameworks/` is empty; no `*.geojson`, `*.csv` or `*.json` over 64 KB
- every file is within its budget, and the IPA is between 25 and 120 MB

**Delivery.** The AI opens a PR, the checks go green, and the user merges on the phone. When the user wants to install, they run `ios.yml`, download the IPA, sign it and install it.

---

## 3. Performance budgets

**Device basis.** The floor device is the **iPhone XR (A12, 3 GB)**. The XS is also A12 but has 4 GB. The SE 2nd generation is an A13 with 3 GB, and the SE 2nd or 3rd generation is the **667 pt layout device**, not the floor device. The primary device is the iPhone 17 Pro Max. Lightness is enforced mainly through machine-independent work counters and through heat and battery recordings on the Pro Max. A12 numbers are extrapolations until checked on an XR (D-21).

### 3.1 Frames and rendering

| Metric | Budget | Enforced by |
|---|---|---|
| Idle | **0 fps** | `FrameScheduler` tests; simulator frame counter |
| Redraws caused by the simulation | ≤10 Hz, typically ≤1 Hz at ×1 | Frame-counter tests, including one with a front on screen |
| Gestures | 60 fps; 120 on ProMotion only while touching | Governor tests; the recorder |
| Main-thread time per frame | ≤1.0 ms | Recorder (display-link timestamps) |
| App GPU time per frame | ≤4 ms at 60 Hz on A12; ≤3 ms at 120 Hz on A19 | Recorder (command-buffer timestamps; this **excludes** system blur, see §3.7) |
| **Hitch rate while panning** | ≤1% of frames missing their target presentation time | Recorder (`addPresentedHandler` presented time against the display-link target); MetricKit hitch metrics |
| Draw calls | ≤50 | Renderer counter |
| Visible vertices | ≤150k | Culling test on Linux |
| Imagery | ≤45 visible tiles; ≤2 decodes in flight; **0 evictions of visible tiles** | Renderer counters |
| Label atlas | Glyph build ≤4 ms per batch off the main thread; atlas occupancy shown | Overlay |

### 3.2 Simulation time per day and per speed

| Metric | Budget | Enforced by |
|---|---|---|
| Mean day | ≤2 ms on A12 (≤2.15 ms at expert difficulty) | Work counters (blocking); wall-clock blocks only above 2× the Linux baseline |
| Worst 1% of days | ≤8 ms; no day over 16 ms | The same |
| Fresh route searches | ≤5 per day on average, ≤12 on any one day | Counter |
| Heap allocations per steady-state tick | 0, including «لماذا؟» values (TermSink) | Linux `mallinfo2` difference |
| Snapshot copy per publish | ≤2 MB | Counter |

**Sub-budget per day** (A12, averages):

| Work | ms |
|---|---|
| Commands and dated events | 0.05 |
| Daily diplomacy | 0.05 |
| Front execution, sectors and distance fields (amortized) | 0.20 |
| Movement | 0.10 |
| Combat (≤60 contested provinces) | 0.35 |
| Supply (amortized) | 0.15 |
| Air regions, naval zones, chokepoint disruption | 0.05 |
| Espionage operations | 0.05 |
| Construction and ledger | 0.07 |
| Monthly slot (7–8 governments): markets and industries 0.25, population 0.03, internal 0.03, politics 0.05, intelligence 0.02, research 0.01, drift 0.02, conditional events 0.03 | 0.44 |
| Strategic AI stagger (≈7 a day at normal; ≤15 at expert) | 0.15 (0.30 at expert) |
| World market and transport payout (day 1 only, amortized) | 0.01 |
| Operational AI | 0.25 |
| History and notifications | 0.03 |
| **Total** | **≈1.95 (≈2.10 at expert)** |

| Speed (السرعة) | Days/s | Wake-ups/s | Days per wake | Simulation CPU | Snapshot rate | HUD rate | 2011 → 2100 |
|---|---|---|---|---|---|---|---|
| Pause (⏸) | 0 | 0 | — | 0 | — | — | — |
| ×1 | 1 | 1 | 1 | 0.2% | 1 Hz | 1 Hz | 9.1 h |
| ×2 | 2 | 2 | 1 | 0.4% | 2 Hz | 2 Hz | 4.6 h |
| ×5 | 5 | 5 | 1 | 1% | 5 Hz | 4 Hz | 1.8 h |
| ×10 | 10 | 10 | 1 | 2% | 10 Hz | 4 Hz | 55 min |
| Max (أقصى) | 30 | 10 | 3 | 6% | 10 Hz | 4 Hz | 18 min |

**Governor:**

| Condition | Action |
|---|---|
| Thermal `nominal` | 120 Hz while touching |
| Thermal `fair` | 60 fps cap; tween off |
| Thermal `serious` | 30 fps; MSAA off; render scale 0.75; speed capped at ×5; opaque glass |
| Thermal `critical` | Auto-pause and a toast: «الجهاز ساخن — تم الإيقاف المؤقت» (device is hot, paused) |
| Low Power Mode | 60 fps; speed capped at ×10; opaque glass; no prefetch |
| Reduce Transparency is on | Opaque glass |

### 3.3 Memory footprint

| Item | A12 (XR) | 17 Pro Max |
|---|---|---|
| Code, runtime, SwiftUI, system (est.) | 55 | 60 |
| Vector map pack (memory-mapped) | ≤22 | ≤22 |
| Imagery: base 2.1 + tile cache (64 or 96 slices RGBA8) | 18 | 26 |
| Screen buffers (3 × screen × 4 B) | 18 | 45 |
| Atlases: glyph distance field 1, flags 1.5, unit symbols 1, one event image 3 | 6.5 | 6.5 |
| `ContentDB` (static rules; the scenario file is released after start) | ≤6 | ≤6 |
| State, one snapshot, history | ≤15 | ≤15 |
| Audio | ≤1 | ≤1 |
| Panels while open | 15 | 20 |
| **Total** | **≈156 MB (target ≤160)** | **≈201 MB (target ≤210)** |

- **Load spike:** the old state is released before decoding. Peak ≤ in-game footprint + 16 MB (raw payload ≤8 MB plus typed buffers ≤8 MB), checked by `simcli peak-load` on a 90-year save and by the device recorder.
- **ASTC option (D-2):** the tile cache drops by about 15 MB (A12) or 23 MB (Pro Max).
- The hard ceiling is 250 MB. Whether memory-mapped clean pages count fully toward the footprint is unverified; the recorder measures it.

### 3.4 Start time

| Metric | Budget |
|---|---|
| First frame | ≤400 ms |
| Main menu interactive | ≤700 ms; only the menu art and the binary metadata of the latest save are read |
| 2011 scenario playable, cold | ≤1.5 s on A12: map `scenario-s2011.bin`, build state, release the file, load the base texture, build labels lazily; ≤0.8 s warm |
| Load a save | ≤1.0 s (the scenario file is not needed) |
| Resume from background | ≤100 ms |

Measured by the in-app recorder (launch markers written to the ring log) and by simulator trends.

### 3.5 Saves

| Metric | Budget |
|---|---|
| File size | ≤2 MB compressed; ≤8 MB raw |
| Stall on the simulation thread | ≤2 ms (copy-on-write snapshot) |
| Background encode and atomic write | ≤250 ms on A12 |
| Mirror copy (if enabled) | Background; at most once per 10 real minutes |

### 3.6 Size

| Item | Budget |
|---|---|
| IPA | **Target ≤80 MB** (est. 52–68 MB); ceiling 120 MB; floor 25 MB |
| Executable | ≤15 MB |
| `world-1.imagery` | ≤40 MB |
| `world-1.mappack` | ≤24 MB |
| `content.bin` (static rules) | ≤6 MB |
| `scenario-<id>.bin`, each | ≤3 MB |
| Flags | ≤1.5 MB |
| Art | ≤6 MB |
| UI sounds | ≤1 MB |
| `Assets.car` | ≤3 MB |
| `default.metallib` | ≤0.5 MB |

### 3.7 Energy, heat and blur

| Metric | Budget |
|---|---|
| CPU seconds per minute | ≤0.3 paused; ≤1 at ×1 with no touch; ≤6 at maximum speed with no touch |
| 30 min at maximum speed, no touch | Stays at `fair` or cooler |
| 30 min of active play at ×1 | Stays `nominal` (target) |
| Blur | At most 6 blurred regions. System blur is composited by the system's render server, outside the app's command buffers (likely; to verify), so **its cost is measured end to end** (below). |

**Blur measurement in M0b, deciding D-3.**
- The in-app **auto-pan benchmark** drives the camera along a fixed path for 10 minutes. It runs twice from the same starting thermal state and battery level (≥50%, unplugged): once with the approved blur and once with opaque glass.
- The recorder logs:
  - the hitch rate, from presented time against target per frame
  - the thermal state over time
  - battery level per minute
  - CPU per minute
  - MetricKit animation-hitch and energy metrics the next day
- **Decision rule.** If blur raises the thermal state by one level, raises battery drain by ≥10% relative, or pushes the hitch rate above 1%, the governor uses opaque glass **while panning** and restores blur at rest.
- **Fallback alternative:** a Metal-rendered blur of the map under the HUD rectangles only. It is measurable inside the app's own GPU time, and the SwiftUI glass becomes tint only (D-3).

### 3.8 Enforcement and debugging without a Mac

- **Linux CI blocks merges** on work counters, data and asset budgets, entity limits, determinism, facts, evidence, licences, the ID lock, stub packs and peak load.
- **macOS CI blocks** on IPA contents and size, metallib for tags, simulator memory ≤250 MB, and the arm64 determinism hash.
- **On the device, from M0:**
  - **Ring-buffer log:** a 1 MB file mirroring the app's log lines, exportable through the share sheet («تصدير السجل», export the log).
  - **`MXDiagnosticPayload`** crash, hang and CPU-exception reports, delivered on the next launch (iOS 15+), saved to `Documents/Diagnostics` and exportable.
  - **Overlay** (3-finger long-press) with fps, footprint, CPU, thermal state, tiles and atlas.
  - **«تسجيل 60 ث» (record 60 s):** writes a CSV of frame times, presented-time misses, thermal state, CPU, memory and battery.
  - **The auto-pan benchmark.**
- Signposts are **not** part of any exit criterion.
- The user shares the CSV and log files into the PR conversation, and `simcli perf-import` adds them to `perf.md`.

---

## 4. Data and realism pipeline

### 4.1 Licence policy (ADR-0013)

- **Allowed:** public domain (including US government works), CC0, CC BY 4.0, CC BY 3.0 IGO, dl-de/by-2.0, UNdata terms, MIT, BSD, OFL, Unicode-3.0. Apache-2.0 and GDAL's MIT/X licence for tools only.
- **Pending verification:** development builds only. The release gate fails until a human records the official licence URL.
- **Denied:** any NC, ND or **SA** licence (ODbL included); GPL for anything shipped; unknown terms. The status is checked **per series** for aggregators such as WDI.
- **User artwork:** an entry in `content/art/registry.yaml` with the user's attestation of commercial use; no real likenesses, insignia or logos.
- **App Store hedge:** processed CC BY data is published in a public data repository.
- **Before any sale:** IP-lawyer review.

### 4.2 Sources

**2011 scenario:**

| Use | Source | Licence / status | Ships as |
|---|---|---|---|
| Geometry | Natural Earth 10m v5.1.2+, pinned | Public domain | Meshes, names, cities |
| Admin-2 detail for refinement zones | geoBoundaries, file by file | CC BY 3.0 IGO / CC BY 4.0 / PD only | Split polygons |
| Own-work lines | Digitized from public-domain US-government maps | Own work | Province edges |
| **Satellite base** | **NASA Blue Marble NG with Topography and Bathymetry** (500 m, 2004) | NASA imagery terms (credit NASA Earth Observatory / Reto Stöckli; no endorsement); official terms page to re-check | Graded tiles |
| Relief statistics (terrain, ruggedness) | GMTED2010 (USGS) | Public domain | Terrain classes only |
| **Coastal elevation** | **DeltaDTM** (Pronk et al. 2024, v1.1, 4TU.ResearchData) | **CC BY 4.0** (4TU record; recheck before release) | Low-elevation coastal shares (≤1, 2, 5, 10 m) |
| Land cover | MODIS MCD12Q1 or ESA WorldCover | Pending / CC BY 4.0 | Terrain classes |
| Climate zones | Köppen-Geiger (Beck 2018) | Pending | Impact zones |
| Population: country, **single ages**, fertility, mortality, migration, projections | UN WPP 2024 | CC BY 3.0 IGO | Start values; bands |
| Province population | GHS-POP R2023A | CC BY 4.0 | Province shares |
| GDP, price level, sectors, labour | World Bank WDI | CC BY 4.0, checked **per series**. **Military expenditure (SIPRI) and all UIS-sourced education series are excluded** (UIS terms: CC BY-SA 4.0). | Start values |
| **Industry structure and input-output coefficients** | **OECD ICIO 2023** (76 economies + rest of world, 1995–2020) | **Pending:** the OECD's July 2024 open licence (CC BY 4.0) is confirmed for content but not clearly for this dataset | Coefficients; per-good output and use for 76 economies |
| Input-output fallback | **US BEA input-output tables** | Public domain | Technical-coefficient template, adjusted by development tier |
| Province productivity | Kummu 2018 gridded GDP (1990–2015) | CC0 | Province shares |
| Skill tiers | ILOSTAT labour force by education | CC BY 4.0 | Tiers (with `estimate` adjustments) |
| GDP and price-level gaps (Taiwan; PPP checks) | Penn World Table 10.x | CC BY 4.0 | Taiwan GDP and price level |
| GDP gap (North Korea) | UNSD National Accounts Main Aggregates | UNdata terms | GDP |
| Fiscal figures, debt, trading partners, groups | CIA World Factbook 2011 (archived, SHA-256 pinned) | Public domain | Start values (military fields go to `notes` only) |
| External debt | World Bank IDS | CC BY 4.0 (catalog) | Debt and status |
| **Military spending 2010 and armed-forces personnel** | **WMEAT 2013 and 2015** | Public domain | Spending seed; personnel; R4 closure |
| **Equipment history and opening stock** | WMEAT editions covering 1971–2010, including arms imports | Public domain (coverage per edition to verify) | Recursive pool seed |
| **Force structure for about 40 key countries** | DoD reports to Congress, CRS reports | Public domain | Templates and deployments |
| Energy, minerals, grain | EIA International; USGS; USDA FAS PSD | Public domain | Capacities |
| Conflicts | UCDP/PRIO; UCDP battle deaths | CC BY 4.0 | Wars, movements, bands |
| **Unrest seeds** | Hand-coded per country with evidence; optional GDELT (terms quoted second-hand as unrestricted commercial use; pending) and the Mass Mobilization data (licence unknown; pending) | Own work / pending | `unrest_seed.csv` |
| Parties, elections, leaders | Wikidata snapshot, official results per row, CIA *Chiefs of State* | CC0; facts; PD | Actors, parties, seeds |
| Infrastructure | Factbook roadway and railway lengths (PD); optional GRIP global roads (licence pending) | PD / pending | Infrastructure index (estimate) |
| Long-run GDP bands | IIASA SSP v3.2 (licence pending) or the OECD long-term baseline (OECD open licence; dataset scope pending) | Pending | Bands only |
| Emissions history | Global Carbon Budget | CC BY 4.0 | Start emissions |
| Climate calibration | IPCC AR6 WGI data | CC BY 4.0 per dataset | Bands |
| Energy projections | EIA International Energy Outlook | Public domain | Bands |
| Education projections | Wittgenstein Centre; Barro-Lee | Pending | Optional bands |
| Arabic names | Natural Earth `name_ar` → Wikidata → CLDR → GeoNames → native review | PD / CC0 / Unicode-3.0 / CC BY 4.0 | Localization with morphology fields |
| Flags | flag-icons plus own redraws | MIT / own work | Atlas |
| UI icons; logo font; illustrations; sounds | SF Symbols; OFL font; the user's images; CC0 or bought sounds | As before | — |

**Denied or cross-check only:**
- GADM; OSM/ODbL; SA geoBoundaries files; UN SALB; CShapes; historical-basemaps; Correlates of War
- SIPRI; IISS; Polity5; V-Dem/V-Party; Archigos; ParlGov; Manifesto Project
- UN Comtrade and BACI; IMF WEO, GFS and DOTS (cross-check only); IEA; Energy Institute
- **UIS / UNESCO data (CC BY-SA 4.0)**; Eora (non-commercial); EXIOBASE (SA); ACLED (non-commercial); FABDEM (NC); CoastalDEM (commercial)
- Kaggle mirrors; Wikipedia prose

**Source plan per era (historical packs; R4 tests that apply):**

| Item | 2026 | 1990 | 1985 / 1979 |
|---|---|---|---|
| Population | WPP 2024 (estimates to 2023, then projection) | WPP 2024 | WPP 2024 |
| National GDP | WDI; PWT | WDI and PWT; USSR, GDR, Czechoslovakia and Yugoslavia from the CIA *Handbook of Economic Statistics* (PD) | The same Handbook editions; PWT; Maddison Project as cross-check (licence pending) |
| Province GDP shares | Kummu has no 2026 data; GHS-POP 2025 × urban weights (`estimate`) | Kummu 1990 | GHS-POP 1975/1980/1985 × urban weights (`estimate`) |
| Trade partners | WDI and national sources; ICIO PYP tables (licence pending) | Factbook 1990 (PD; scanned editions) | Factbook 1982–1989 editions (PD; scans) plus gravity |
| Fiscal figures | WDI; national budgets (Factbook discontinued Feb 2026) | Factbook 1990 | Factbook editions; Handbook |
| Military | WMEAT latest; DoD/CRS | WMEAT; LoC Country Studies | WMEAT 1970s–80s editions; Country Studies |
| Lines | Own work (control lines) | Own work; OCHA Yemen districts (licence to verify before the pack) | Own work |
| **R4 tests** | All | Population ±0.5%; GDP ±5% (composed estimate); military share ±20%; trade balance not applied | Population ±0.5%; GDP ±10%; military share ±25%; fiscal and trade balance not applied |

### 4.3 Pipeline stages (`python -m datapipeline build`, inputs checked by SHA-256)

| Stage | Work |
|---|---|
| 00 fetch | Download each source into a gitignored cache and verify its SHA-256 |
| 05 evidence | Archive each cited URL (Wayback), store the snapshot ID, quote and date; the offline gate checks quote ⊇ value |
| 10 geometry | Keep NE columns; apply merge, split and own-work rules; **auto-tune one global scale factor** so the full rule lands on 2,850 ± 100 land provinces; assign registry IDs |
| 11 topology | Shared arcs; one simplification per level; **cumulative arc length per border polyline**; adjacency; river crossings; split at 180° |
| 12 regions | About 300 route clusters; about 80 air regions; about 250 sea zones; **about 10 chokepoints** (Hormuz, Bab el-Mandeb, Suez, Malacca, Panama, Turkish Straits, Gibraltar, Danish Straits, Taiwan Strait, Cape route) with their sea-zone edges |
| 13 terrain | GMTED statistics → terrain class, width, movement cost; **DeltaDTM** low-elevation coastal shares |
| 14 imagery | §2.5 bake (Linux) |
| 15 territory | `territory/composition.csv` → composed targets per polity per dataset |
| 20 population | WPP single ages; GHS shares; urban share; skill tiers; **group rows** (two dimensions) |
| 21 economy | WDI totals; ICIO (or BEA template) coefficients; industries; price levels; **household and government budget shares solved so every national market clears at base prices**; fiscal figures, debt by currency; money base; currencies |
| 22 trade | Partners (Factbook, gravity fill); tariffs and blocs; **chokepoint and sea-cluster exposure vectors** from the route graph and partner shares; logistics-capacity shares |
| 23 military | WMEAT 1971–2010 spending and arms imports → opening stock and recursive roll-forward to 2010; WMEAT personnel; DoD/CRS structure |
| 24 politics | Actors (stable IDs) and roles; parties ≤12; electoral, regime and constitution parameter sets and overrides; seeds; calendar; interest groups |
| 25 intelligence | Agency levels (`design-target` or `estimate`) |
| 26 names_ar | Fails on missing or Latin names, **missing gender, definiteness, short form, or the ل and ب forms** |
| 27 unrest | Seeds per country; offsets per province |
| 30 validate | pytest invariants (§4.7) |
| 40 pack | CSVs → `content.bin` and `scenario-<id>.bin`; map and imagery packs with SHA-256 |
| 50 attribution | Credits screen data, `Acknowledgements.plist`, `ATTRIBUTION.md` |

Hand corrections live in `overrides/*.csv`, and both provenances are kept.

### 4.4 Province layer

**Merge rule** (in `geometry.py`, reviewed in `merge_rules.csv`):
1. **Never merge across** any sovereignty, administration or control line in any planned scenario, 1979–2026.
2. **Size score** s = area / (10,000 km² × k) + 2011 population / (3 M × k). The global factor k (starting at 1.0) is auto-tuned in M1a so the whole rule lands on 2,850 ± 100. A unit with s < 1 merges into its smallest same-country neighbour.
3. **Protected units:** capitals and cities of **2 M or more** (323 units in Natural Earth).
4. **Floors:** Lebanon ≥6; Israel ≥4; West Bank ≥3; Gaza 1; East Jerusalem 1; Golan 1; Kuwait ≥2; each piece of Cyprus; micro provinces for Bahrain, Qatar and Singapore.
5. **Splits:** units over 200,000 km² are split, or over 400,000 km² if they have fewer than 200k people. Minimum per country: min(source units, 1 + ⌈pop/2 M⌉).
6. **Refinement zones** halve the thresholds. The zones are unchanged: Libya, Syria, Iraq, Yemen, Af-Pak, Somalia, Sudan/South Sudan, the Sahel, NE Nigeria, eastern DRC, eastern Ukraine and Crimea, the South Caucasus, the Levant, Korea, Kashmir, Myanmar's border states and the Taiwan Strait islands. Historical zones: central Germany and Berlin, the Iran–Iraq belt, the Horn, Angola–Namibia, Chad/Aouzou, Western Sahara and Sinai.

**Measured in this revision** (script `wf/revise/merge_pop3.py`; populations estimated from cities plus a rural share by area):

| Rule (before refinement zones and never-merge lines) | After merging | After splits |
|---|---|---|
| area/6,000 + pop/1.5 M, cities ≥1 M (old rule) | 2,871 | 3,183 |
| area/8,000 + pop/2.5 M, cities ≥1 M | 2,602 | 2,914 |
| area/8,000 + pop/2.5 M, cities ≥2 M | 2,589 | 2,901 |
| **area/10,000 + pop/3 M, cities ≥2 M** | **2,430** | **2,742** |

Refinement zones and never-merge lines are expected to add about 150–300 (estimate). k is then tuned so the final count is 2,850 ± 100. **L3 limits: land ≤3,000; sea ≤300; total ≤3,300.** The full rule runs in M1a, before any ID list is released.

**Province IDs.** `p00001`… plus a slug, held in `province_registry.csv` with atoms, the map version where each was created and retired, `replaced_by` and population weights. IDs are never reused.

**Polity registry** (`polity_registry.csv`, about 300 rows, capacity 320):
- tag, Arabic name with morphology fields and dated variants, flags by date, offline colour, capital by date, `kind` (state, de facto state, candidate), `exists` per scenario
- a default government row per polity, plus rival or exile governments per scenario in `governments.csv`

**Runtime namespace.** Polities, governments and actors created during play get `dyn:<serial>` IDs, stored in the save's ID lists. Each gets:
- an Arabic name generated from the region or movement name and a regime template, with morphology fields
- a flag from a template plus colours
- a colour by greedy graph colouring against its neighbours (ΔE ≥15)
- a capital at its most populous province
- a runtime label anchor
- a stored monthly slot

**Actor registry** (`actor_registry.csv`, append-only): `act.<polity>.<slug>` with kind and the roles it holds at each scenario start.

**Group registry** (`group_registry.csv`): ethno-linguistic and religious groups, each with Arabic names and a sect or denomination where relevant.

**Dependencies** (Greenland, Puerto Rico, Hong Kong SAR and others) are provinces with status flags, and their data is composed via the territory table (§4.6).

**Admin-region layer per scenario:** as before.

### 4.5 Borders and status on 1 Jan 2011

Columns: sovereign (polity) / administrator (government) / controller / flags. Facts files assert every row.

| Case | 1 Jan 2011 state | Geometry |
|---|---|---|
| Sudan / South Sudan | Polity `sdn` with government `sdn.gov`; the south has an autonomy flag (GoSS). Referendum event 9–15 Jan. **On 9 Jul a `succession` effect** creates polity `ssd` with continuator `sdn` (§5.9); UN admission on 14 Jul. | NE SDN + SDS; the 1956 line |
| Abyei; Heglig / Kafia Kingi | Administrator `sdn.gov`; special-area flag; claims by `ssd` after July | NE disputed areas plus own lines |
| Hala'ib; Bir Tawil; Ilemi | As before | NE |
| Western Sahara | Morocco west of the berm; SADR (`esh`) east of it; sovereign none; MINURSO | NE plus berm |
| West Bank | Sovereign (de jure view) `pse`; administrator `pse.pa` (Palestinian Authority government); controller Israel with controlPct ≈ Area C share; occupied flag | ≥3 provinces |
| East Jerusalem | Administrator Israel; Israeli law applied (not recognised); claim by `pse` | NE |
| Gaza | Sovereign (de jure view) `pse`; **administrator `pse.gaza`**, a de facto government led by actor `act.pse.hamas`, unrecognised; blockaded flag | NE |
| Golan; UNDOF; Shebaa | As before | NE |
| Kosovo | Polity `kos`; claimed by Serbia; state-recognition bits; North Kosovo controlPct (estimate) | NE |
| Abkhazia, South Ossetia; Transnistria; Nagorno-Karabakh; Northern Cyprus; Somaliland | De facto polities with limited state recognition, as before. In Somalia, al-Shabaab (`act.som.shabaab`, armed and controller roles) holds controlPct in the south. | As before |
| Taiwan; Kashmir and related areas | As before | NE |
| Crimea and Sevastopol | Ukraine (reassigned from NE's current coding); Russian fleet basing flag | NE |
| Donbas and the south | Ukraine; split for the 2026 lines | Own lines |
| Hong Kong, Macau; Falklands … Belize; Tiran and Sanafir; Korean DMZ | As before | NE |
| **Côte d'Ivoire** | Polity `civ` with **two governments**: `civ.gbagbo`, administering Abidjan and the south, and `civ.ouattara`, **holding the UN seat** (credentials accepted Dec 2010; to verify), administering the north through actor `act.civ.fn` (Forces Nouvelles, armed and controller roles). Resolution event 11 Apr. | Data |
| Libya | Polity `lby`, government `lby.gov`. **Event on 27 Feb 2011 creates government `lby.ntc`.** Recognitions are given country by country through events; the **UN seat transfers on 16 Sep 2011** (`TransferUNSeat`). | Data |
| Lebanon | Government `lbn.gov`; actor `act.lbn.hezbollah` holds party, cabinet and armed roles and a controller role with controlPct in the south (`estimate`) | Data |
| Afghanistan; Iraq | Coalition forces under access treaties; the Taliban (`act.afg.taliban`) and other actors with armed and controller roles; Iraq's Kurdistan autonomy flag; US withdrawal event on 18 Dec | Data |
| Pakistan FATA, Yemen, Darfur, eastern DRC, Mindanao, southern Thailand, Colombia, Myanmar | Armed actors with controlPct, seeded from UCDP | Data |
| Tunisia, Egypt, Libya, Syria, Bahrain, Yemen | Unrest seeds (§5.2) plus conditional historical events | Data |

**Lines needed only by later packs:** as before (USSR republics, Yugoslav republics, Czech/Slovak, FRG/GDR and Berlin, YAR/PDRY, Eritrea, Namibia and Walvis Bay, TBVC, Western Sahara 1979/1985, Aouzou, Sinai phases, the Pacific trust territory, Netherlands Antilles, Rhodesia, Timor-Leste, Kuwait 1990).

**Palestinian areas per pack** (asserted in each pack's facts file):

| Area | 1979 | 1985 | 1990 |
|---|---|---|---|
| West Bank (excluding East Jerusalem) | Administrator Israel (military government); **Jordanian claim** | Same | Jordanian claim ended (event 31 Jul 1988); PLO claim; the 15 Nov 1988 declaration is an event |
| East Jerusalem | Israeli law applied since 1967, not recognised; Jordanian claim | Plus the Jerusalem Law event (30 Jul 1980) | As 1985; Jordanian claim ended |
| Gaza | Administrator Israel; **no Jordanian claim**; no Egyptian claim | Same | Same |
| Golan | **Occupied** (no annexation flag) | Golan Heights Law (14 Dec 1981): annexation not recognised | Same |
| Sinai | Withdrawal phases 1979–82 (events) | Egypt | Egypt |

### 4.6 How totals are spread to provinces (2011)

| Quantity | Method |
|---|---|
| **Territory composition** | `territory/composition.csv` maps each game polity to source location codes, with + or − per dataset. Examples: <ul><li>`chn` = WDI CHN + HKG + MAC</li><li>`usa` = USA + PRI + GUM + VIR + ASM + MNP</li><li>`dnk` = DNK + GRL + FRO</li><li>`srb` and `kos` per WPP and WDI codes</li></ul> De facto states are carved out of their parent with a written method (`estimate:`), using the parent's census practice, GHS population and any published local census. Fallbacks: Taiwan GDP and price level from PWT; DPRK GDP from UNSD; price levels for gaps from a regional model (`estimate`). **R4 compares against the composed targets.** |
| Population | Composed WPP total × GHS shares, with largest-remainder rounding |
| Urban share | Share in GHS cells ≥1,500 people per km² |
| Cohorts | **WPP single ages 0–100+ × 2 sexes** per government; provinces inherit the structure |
| Skill tiers | ILOSTAT labour force by education, plus an urban premium (`estimate`) |
| Groups | Factbook shares plus curated regional overrides, as rows on two dimensions (for example Beirut: Shia, Sunni, Maronite, Greek Orthodox, Druze, Armenian; Nineveh: Arab and Kurd × Sunni, Christian, Yazidi, Shabak) |
| GDP | Composed WDI nominal and PPP; province shares from Kummu |
| Industries | ICIO industry output and coefficients for 76 economies; the regional or BEA template for others; WDI sector shares; EIA, USGS and USDA physical data; curated deposits; a productivity residual |
| **Day-1 market clearing** | Budget shares for households (per tier) and government (per line) are solved so that, for every government and good, production + imports = household + government + intermediate + investment demand + exports at base prices. **Invariant: month-1 price change ≤1%.** |
| Price levels | ICP 2011 price-level ratio |
| Trade partners and exposure | Factbook partners plus gravity fill to 10 partners. **Exposure vectors:** for each partner, the shortest sea route between main ports on the sea-zone graph, weighted by trade share, gives the share of seaborne trade through each chokepoint and sea cluster. |
| Fiscal figures, debt and money | Factbook, WDI, IDS (external debt by currency where reported, else USD); `debtStatus` hand-coded; money base from WDI (CC BY series only) or `estimate` |
| **Military** | <ul><li>WMEAT 2013/2015: 2010 spending and armed-forces personnel</li><li>The opening equipment stock in 1991 from WMEAT 1971–1990 spending and arms imports (split rules: USSR's stock allocated to successors by the 1992 Tashkent-type allocation and basing, Yugoslavia's by location, Czechoslovakia's at 2:1)</li><li>Rolled forward to 2010 with spending plus arms imports</li><li>DoD/CRS force structure for about 40 key countries</li></ul> |
| Politics | Actors, parties ≤12, two data tiers (D-10) |
| **Unrest seed** | Per country, evidence-coded for about 60 countries with notable 2011 unrest or conflict; the rest calm (≤35). Per-province offsets keep the model's within-country pattern but make the day-1 target equal the seed (§5.2). |
| **Infrastructure 0–10** | f(GDP per capita, urban share, road and rail density per country from Factbook lengths, spread by population density), tagged `estimate`. Natural Earth roads are **not** used. |
| Disagreements | Differences over 25% are flagged; the alternatives go into `notes` and appear on «المصادر» (sources) |

### 4.7 Validation and facts

- Each province has exactly one administrator government per scenario (or the unclaimed flag), and every reference exists.
- Adjacency is symmetric, there are no overlaps, and connectivity holds or exclaves are declared.
- Province sums equal the composed totals exactly. **The closure tests (R4) pass in local currency and USD. Every market clears.**
- Arabic names have every morphology field. Every polity has a flag. Neighbouring colours differ by ΔE ≥15.
- **Evidence:** every fact-sourced row has a snapshot and a quote containing the value.
- **`facts_2011.yaml` examples** (each with evidence):
  - UN members = 192 (South Sudan the 193rd on 14 Jul 2011)
  - EU = 27; euro area = 17; NATO = 28; OPEC = 12; GCC = 6; ASEAN = 10; Arab League = 22; AU = 53
  - leaders on 1 Jan 2011, as before
  - Crimea's administrator is Ukraine's government; `ssd` does not exist on 1 Jan; Kosovo exists
  - **`civ` has 2 governments, and the UN seat is held by `civ.ouattara`**
  - **Gaza's administrator is `pse.gaza`**
  - **no polity has more than one UN-seat government**

### 4.8 Attribution

Stage 50 generates «المصادر والحقوق» (sources and rights) with the NASA imagery credit, the DeltaDTM, Kummu, UCDP, WPP, GHS, ILO, PWT and OECD citations (when OECD data is used), the image registry, and a list of **design-target values**. The IPA gate checks the credits hash.

---

## 5. Game systems

### 5.0 Shared conventions

- **Cadence codes:** D daily · M monthly in the government's slot · S strategic-AI stagger · Q quarterly · Y yearly in January · E on event or input change.
- **Six scarce resources:** money, manpower (plus the reserve pool), political capital, influence, research points, intelligence capacity.
- **«لماذا؟».** Every derived value is written once against `TermSink`; the UI shows up to 12 terms, with any overflow folded into «أخرى» (other).
- **Modifiers** come from `modifiers.json`.
- **Coefficients** are untuned starting values. Each carries a `calibratedAgainst` class (R5); values with no data are `design-target`.

### 5.1 Economy and markets (الاقتصاد والأسواق)

**Goods (20 traded, 2 non-traded) and industries (25 types):** unchanged from the list in final-1.0:

| # | Good | # | Good |
|---|---|---|---|
| 1 | Grain (حبوب) | 11 | Chemicals and fertilizer (كيماويات وأسمدة) |
| 2 | Other farm produce and fish (منتجات زراعية وسمكية) | 12 | Steel and base metals (صلب ومعادن أساسية) |
| 3 | Processed food (أغذية مصنعة) | 13 | Construction materials (مواد بناء) |
| 4 | Timber and paper (أخشاب وورق) | 14 | Textiles and clothing (منسوجات وملابس) |
| 5 | Crude oil (نفط خام) | 15 | Consumer goods (سلع استهلاكية) |
| 6 | Natural gas (غاز طبيعي) | 16 | Machinery and equipment (آلات ومعدات) |
| 7 | Coal (فحم) | 17 | Electronics and semiconductors (إلكترونيات وأشباه موصلات) |
| 8 | Metal ores (خامات معدنية) | 18 | Vehicles (مركبات) |
| 9 | Strategic minerals (معادن استراتيجية) | 19 | Medicines (أدوية) |
| 10 | Refined fuels (مشتقات نفطية) | 20 | Arms and military equipment (أسلحة ومعدات عسكرية) |
| — | Non-traded: electricity (كهرباء), services (خدمات) | | |

Industries:
- **Primary:** grain farming; mixed farming and fishing; forestry; oil; gas; coal; metal mining; strategic minerals.
- **Processing:** refining; power (fossil, nuclear, renewable); food processing; chemicals; steel; construction materials; textiles.
- **Manufacturing:** consumer goods; machinery; electronics; vehicles; medicines; arms.
- **Non-traded:** construction; services.

Each type has up to 4 inputs, labour per tier, capital cost and emissions. **Coefficients come from OECD ICIO**, mapped from its 45 industries to our 25, or from the BEA template adjusted by development tier.

**Currencies and accounts (ADR-0019).**
- **Currency registry (data):** national currencies; unions (euro area with 17 members, the two CFA zones); dollarized users.
- **Each currency has:** a scale; a price index in log form (`LogQ`); an exchange rate to USD (`LogQ`); a money base (LCU).
- **Monetary parameter set per government (data, not an enum):** regime family (float, managed, peg, currency board, union, dollarized), anchor currency, band, **convertibility** (full, current-account only, non-convertible), **official and parallel rates** (a parallel premium for multiple exchange rates), reserve rules, and capital-control level.
- **Accounts per government:** treasury (LCU); FX reserves (USDn); domestic debt (LCU); external debt in buckets (USD, EUR, local).
- **The world USD deflator** is a log index updated monthly from the US price index and world tradable prices. `Money` = USDn ÷ deflator.

**Monthly steps in each government's slot:**
1. **Production:** min(capacity × utilisation, inputs, labour). Utilisation follows the margin (prices in LCU).
2. **Labour market:** a wage per tier (LCU) and unemployment.
3. **Households:** Cobb-Douglas budget shares **solved at bake time** so day 1 clears exactly.
4. **Government demand** by budget line.
5. **Investment.**
6. **Trade.** For each traded good:
   - landed import price (LCU) = world price (USDn) × exchange rate × (1 + transport(bulk class, distance class) + tariff + sanction penalty + **Σ_k exposure_k × disruption_k × reroute_k**)
   - export receipt = world price × rate × (1 − transport − partner tariff − Σ_k exposure_k × disruption_k × reroute_k)
   - **If a chokepoint has no alternative route** (Hormuz for Gulf exporters), exports and imports through it are also capped by (1 − exposure_k × disruption_k)
   - disruption_k is set by naval control, blockades and events (for example Bab el-Mandeb attacks); reroute_k is the extra cost of the alternative route (Suez → Cape)
   - settlement is against the world account in USDn, with FX postings to reserves
7. **Clearing.** p' = p · exp2(κ·(D − S)/S), κ = 0.5, clamped to ±8% a month. Price controls feed the **shortage index**.

**World market** (day 1 of each month): p_w' = p_w · exp2(κ_w·Σ net demand / world supply), clamped to ±12%, with buffer stocks, OPEC behaviour and day-1 calibration to 2011 prices.
- **Transport payout:** all transport costs collected that month are paid out in the same step as **service exports** to governments in proportion to their logistics capacity: merchant fleet, ports and coastline, an `estimate`. Rerouting costs are paid out the same way.
- **Invariant:** the world account is exactly 0 after the monthly close.

**Two output measures.**
- **Nominal output** = Σ value added at national prices (LCU), converted at the exchange rate to USDn for trade, debt and display (D-6).
- **Price level** from non-traded prices, calibrated to ICP 2011; PPP output = nominal ÷ price level.
- **Real comparisons** use `Money` (constant 2011 USD).
- **Day-1 closure** in both units.

**Budget and taxes:** as before. Revenue: income, corporate and consumption tax, tariffs, royalties, aid. A tax-capacity cap (Besley–Persson). 9 spending lines, with interest mandatory. All in LCU.

**Money and inflation.**
- Inflation is the change in the currency's log price index:
  0.7·last month + 0.3·(money-base growth − real growth) + 0.2·output gap + import pass-through (exchange-rate change × import share).
- **Seigniorage cap (Cagan)** on the money base; above it, inflation accelerates until a stabilization package.
- **Pegs:** defended with FX reserves (USDn). A peg breaks when reserves cross 3 months of imports, which is a crossing event, or by a devaluation command.
- **Devaluation** moves the exchange rate. That revalues external debt and reserves through explicit `revaluation` postings, raises import prices, and erodes the USD value of domestic debt.
- **Unions:** the rate is set by the union rule, and members cannot devalue.
- **Non-convertible currencies:** trade settles at the official rate with quotas, the parallel premium drives shortages, and reserves are rationed.

**Debt (flaw 12).**
- Domestic debt (LCU) is eroded by inflation. External debt (by currency) is revalued explicitly.
- Interest premium; rating from 0 to 20; `debtStatus`.
- Crises fire **on crossings only**.
- Crisis options: IMF-type programme, union bailout, patron rescue, default.
- Day-1 invariant: no non-historical crisis in the first 30 days.

**Projects:** as before; escrow in LCU. The escrow is the unspent balance: money already spent on construction is gone. `CancelProject` refunds that unspent balance minus 10%, and the panel shows the refund before the player confirms (screen 5: «عند إلغاء مشروع يُرجع المبلغ غير المصروف بعد خصم 10% منه.»).

**Player levers:** as before, plus the exchange-rate regime and convertibility (a gradual reform) and capital controls.

**Links:** as before, plus naval control → chokepoint disruption.

**Cost:** unchanged order of magnitude. The exposure terms are about 10 multiply-adds per good per government per month.

### 5.2 Population and internal affairs (السكان والشؤون الداخلية)

**Government state:**
- **202 single-year cohorts** (0–100+ × 2 sexes)
- fertility rate and target; mortality index; migration
- living standard by tier; stability; legitimacy; war support; war exhaustion
- coup hazard; emergency regions
- **reserve pool** (trained reservists)

**Province state:** population, urban share, skill tiers; **group rows** (any number, two dimensions, each with a share and a grievance); unrest; **unrest offset**; control% and controller; police, refugees, famine flag.

**Rules:**
- **Births and deaths (yearly):** as before, using single-year age-specific fertility and mortality.
- **Ageing:** every single-year cohort moves up exactly one year, once a year. 5-year bands are only a display aggregation. Manpower (males 18–49), women of fertile age and dependency ratios therefore track WPP.
- **Migration and skill tiers:** as before.
- **Monthly unrest target:**
  raw = clamp(15·misery + 20·fall in living standard + 25·group grievance (max over the province's groups, weighted by share) + 15·repression gap + 10·war weariness + 10·conflict next door + 10·media-sphere contagion + 15·foreign support + 10·food and fuel price shock + 10·youth unemployment − 0.5·(legitimacy − 50) − police, 0..100)

  target = clamp(raw + offset_p, 0..100)
  - **Offset:** set at bake time so the day-1 target equals the seeded 2011 value (§4.6). It decays toward 0 with a half-life of 8 years (`design-target`), so structure takes over in the long run.
  - Unrest relaxes toward the target over about 3 months, or about 1 month when contagion is high. The media-sphere term links countries sharing a language and media space.
- **Thresholds fire on upward crossings only, with hysteresis.** A threshold re-arms when unrest drops 5 points below it.
  - 40: protests (output −5%)
  - 60: mass protests and strikes (−15%, legitimacy falls)
  - 75: insurgency if capacity allows. Capacity = ruggedness × (1 − infrastructure/10) × group share × (1 + foreign aid). A new or existing armed actor gains strength.
  - Pre-existing 2011 insurgencies are **seeded actors**, not threshold events.
- **Revolution chain:** as before (capital ≥85 for 2 months; security-force loyalty decides between transition and civil war).
- **Day-1 invariant:** no non-historical insurgency, revolution or mass-protest event in the first 90 days. Historical ones (Tunisia, Egypt and so on) are dated or conditional events.
- **Stability, coup hazard:** as before.
- **Manpower:** males 18–49 × fit share × conscription tier, feeding the **reserve pool** (§5.4).

**Levers:** as before.

### 5.3 Government, parties and elections (الحكم والأحزاب والانتخابات)

**Data-defined parameter sets** (in `content/packs/base`, extensible by scenario packs with no Swift change):
- **Regime parameter sets:** the 10 starting archetypes (liberal democracy … theocratic hybrid) are *data rows*. Each defines legitimacy sources, selectorate size, office list, succession rule and coup-hazard base. New ones (for example Iran's 1979 constitution, with a supreme-leader office and a guardian-council veto body) are added as rows.
- **Constitution parameters:** offices (head of state, head of government, supreme leader, upper and lower chambers), each with how it is filled (direct, by parliament, by a body, hereditary, by group allocation), term, powers and veto bodies. **Offices allocated by group** cover Lebanon's sect-allocated presidency, premiership and speakership.
- **Electoral-system parameters:**
  - formula: FPTP, two-round, list PR (d'Hondt, Sainte-Laguë, Hare) with threshold, **SNTV**, **block vote**, party block vote, **STV**, **alternative vote**, MMP, parallel
  - **district magnitude** per admin region
  - **reserved seats** by group or gender, and **confessional quotas** per district
  - tiers and the electing body for indirect offices
- **Franchise rules:** who votes, by age and **by group** (whites-only parliament; the 1984 tricameral chambers per group; Rhodesia to Zimbabwe), as data.

**Actors and parties (F12).**
- Every party, movement, faction and armed group is an **actor** with a stable ID. Roles:
  - **party:** seats, 4 ideology axes, regime-loyal flag
  - **armed:** strength, capacity, formation quota
  - **controller:** which provinces it controls (controlPct)
  - **government:** link to a government row
- Examples:
  - Hezbollah holds party, cabinet and armed roles at once.
  - Hamas holds party (PLC), armed and government roles in Gaza.
  - The SPLM moves to South Sudan by succession, keeping its ID; a new actor is created for SPLM-North.
  - The Muslim Brotherhood becomes the FJP party in 2011, ruling in 2012 and banned in 2013, as one actor throughout.
- **Party support** is stored as sparse rows (province, actor, bp). Each government has **up to 12** competitive parties plus "others".
- **Effects:** `createParty`, `dissolveParty` (with a support-transfer table, for example Egypt's NDP in April 2011), `mergeParties`, `splitParty`, `setActorRole`.
- **On every administrator change** (succession, annexation, peace transfer), support in the transferred provinces is **remapped by an explicit table** in the effect, or **reseeded** from the actor affinities of the new owner's parties. A row never points at another country's party.

**Monthly support drift:** as before. Influence operations target actor IDs.

**Elections.**
- Real calendar for 2011–12; later dates follow terms and rules.
- Votes = support × turnout. Seats follow the electoral parameter set (district by district for SNTV, block vote and STV; national for list PR).
- Reserved and confessional seats are filled from the group-eligible candidates of each party.
- Cost of one election ≤ about 2,900 × 12 operations.

**Coalitions.** Up to 4 of up to 12 parties, so **≤793 combinations**. Ranked as minimal winning and connected with the smallest ideological range. The player chooses among the top 3.

**Player and elections (D-9):** the player keeps leading the state.

**Non-democracies.** A ruling actor with 2–4 internal factions (also actors, with a faction role). Emerging opposition actors (≤4 active per country) appear on an upward crossing of 60 unrest under low liberties, and can be legalised, which gives them the party role on the **same ID**.

**Leaders.** Real name, no photo, renamable; age and tenure. **No personality traits or skill ratings are authored or shown for real people** (D-30). Political capital accrues as legitimacy × institutional capacity (data). Generated future leaders, with fictional names from a name pool, may have traits marked «شخصية مولّدة» (generated character).

**Rules and levers:** as before: political capital spending, cooldowns, selectorate theory, an age-based mortality hazard with succession events, and the same levers.

### 5.4 Military and war (الجيش والحرب): automated fronts

**Entities:**
- **Formations:** nominal 10,000 personnel, with actual strength **between 5,000 and 25,000** (reinforced). Types: infantry, mechanized, armour, airborne and marines, artillery and missiles, militia. Each carries **equipment allocations** per category (in equipment-value units) and its generation mix.
- **Quotas:**
  - **Per government:** Q = 40 + population/1.5 M, capped at 1,200 (China about 930, India about 830, US about 245, Egypt about 94).
  - **Per armed actor:** set by its capacity, at most 60.
  - **Worldwide cap:** 8,192, measured in the wartime benchmark (≤0.6 MB).
- **Reserve pool** (personnel, not formations): conscription feeds it. Mobilising first fills existing formations to 25k, then creates new formations up to the quota, and the remainder stays in the pool as replacements. Total-war mobilisation of large countries therefore never hits a counter limit.
- **Armies:** 3–30 formations.
- **Fronts:** one per contiguous contested border **between two sides of a war** (side-level). Each side's **lead** is the government with the largest committed strength. A front is divided into **per-government sectors**: contiguous runs of front provinces allocated in proportion to assigned strength, recomputed when assignments change. Sectors may share a province where they meet.

**The player's tools:** `CreateArmy`, `AssignArmyToFront`, `SetSectorOrder(hold «تثبيت» | attack «هجوم», arrows ≤3 inside or adjacent to the own sector)`, `SetFrontPosture`, `Mobilize`, `Recruit`, `Disband`, `SetConscription` (the conscription law: changed in State › السياسات, §6.5), `AirMission`, `FleetMission`, `DeclareWar`, `ProposePeace`.
- Without its own order, a contributor follows the lead's front-wide order when allied coordination is on (AI difficulty table).

**Front execution** (one engine system for player and AI):
- Every 3 days per front, iterating sectors in serial order, it moves **only the owning government's formations** within its sector.
- The **frontage cap per province** is shared among a side's governments in proportion to the strength present.
- It launches an offensive on an arrow axis when the local ratio is ≥1.5, and **stops it only below 1.3** (hysteresis).
- It reads enemy strength through the owner's `Visibility` estimates, which are stable within an intel epoch (§5.6).
- Air support from partners (NATO over Libya) applies through regional air share.

**Combat** (QJM-style, contested provinces only):

| Mode | When | Daily losses (attacker / defender) | Limits |
|---|---|---|---|
| Positional | Hold, or no offensive | 0.02–0.1% / 0.02–0.1% | — |
| Offensive | Attack arrow and R ≥1.5 | 1–3%·R^−0.5 / 0.75–2%·R^0.5 | Stops when organization <25%, supply <50%, the objective is taken, or R <1.3 |
| Counter-insurgency | control% <100 against an armed actor | UCDP bands | Continuous |

- **Combat power** P = Σ strength × firepower(type, **allocated equipment**, generation) × (0.25 + 0.75·organization) × supply × morale × combat-effectiveness value.
- Defender and attacker multipliers and the frontage cap (plains 6, hills 4, mountains 3, urban 3, marsh 2) are as before.
- **Losses** debit personnel (to the reserve pool as casualties) and equipment allocations. **Captured equipment** is credited to the capturer's pool at a capture rate (`design-target`).

**Supply and routing:** as before. Sea lanes depend on naval control.

**Equipment (المعدات): a stock that carries forward.**
- **Pool per government:** 5 categories (land, air, naval, air defence, missiles) × 6 generations (G1–G6), in equipment-value units.
- **Rules:**
  - **Yearly:** E ← (1 − δ_c)·E. Depreciation: land 6%, air 7%, naval 4%.
  - **Monthly:** + procurement, P = defence budget × procurement share ÷ unit cost(generation, producer price level). Arms goods come from the market and imports.
  - **Daily:** − combat losses; + captures.
  - **On event or treaty:** ± arms transfers and aid deliveries; ± succession allocation.
- **Allocations:** formations, fleets and air groups draw from the pool and return to it. **Invariant: pool + Σ allocations = total stock.**
- **Seed for 2011:** an opening stock in 1991 from WMEAT 1971–1990 (spending and arms imports, with split rules), rolled forward through 1991–2010 with spending plus arms imports, using the same formula. This keeps the user's spending rule and adds legacy inventories and imports (D-27). Both extra terms appear in «لماذا؟».
- **The UI shows estimates with ranges** through `Visibility`.
- **Personnel seed:** WMEAT armed forces 2010, spread over formations by the DoD/CRS templates (about 40 key countries) or automatic templates elsewhere.

**Air:** about 80 regions. Air groups hold allocations from the air pool. Share = A²/(A²+B²), summed over a side's governments.

**Navy:** about 250 sea zones. Fleets hold allocations from the naval pool. Missions: patrol, blockade, escort, sea control. **Sea control and blockades set chokepoint disruption** (§5.1).

**War and peace:** goals, score, exhaustion and terms as before. Peace transfers run the explicit administrator-change remaps (§5.3). Armed actors can negotiate, integrate, win (gain the government role on the same ID) or form a state (`succession` into a runtime polity).

**Nuclear:**
- **Nuclear stocks** are a column per government, transferable only by succession or treaty (for example Ukraine, Belarus and Kazakhstan in 1991–96).
- Ladder from rung 0 to 5; **rung 5 ends the game**.
- 2011 status: declared for the US, Russia, UK, France, China, India, Pakistan and North Korea; undeclared for Israel.

**Lightness:** as before.

### 5.5 Diplomacy, blocs and the United Nations (الدبلوماسية والتكتلات والأمم المتحدة)

**Pair state (government × government):** opinion; treaty bits; **recognises-state** (the target's polity); **recognises-government** (the target as the legitimate government of its polity); sanction bits; claim bit; rung; distance class.

**Polity state:** UN membership and **UN-seat government**; bloc seats (for example permanent Security Council seats) with **continuator rules**.

**Blocs in 2011** (counts asserted in facts):
- UN 192; EU 27 / euro area 17; NATO 28
- CSTO; SCO; GCC 6; Arab League 22; African Union 53; ASEAN 10; OPEC 12
- BRICS (South Africa joins in 2011); G8 and G20
- Mercosur; NAFTA; the Russia–Belarus–Kazakhstan customs union; CIS; OIC; ECOWAS; SADC; NAM; OAS

Each bloc's rules are data. **Seats belong to polities and are exercised by the polity's UN-seat (or bloc-seat) government.**

**Treaties (12 types):** alliance; defensive pact; non-aggression; military access and basing; free trade; arms supply (moves equipment between pools); economic aid; sanctions; guarantee; intelligence sharing; technology cooperation; nuclear umbrella. A treaty's parties are polities, with continuity rules on succession.

**Rules:**
- Opinion drift and joining wars as before.
- **Recognition of state and of government** are separate data and commands. Credential changes (Libya NTC, 16 Sep 2011; Côte d'Ivoire) are events or UN votes.
- **UN Security Council:** 5 permanent members plus the 10 elected for 2011 (unverified); resolutions; AI utility votes; veto.

**Levers:** as before, plus recognising a rival government.

### 5.6 Intelligence and espionage (الاستخبارات), full system with no assassinations

**State:**
- Per government: agency level, counter-intelligence, cyber, operation capacity.
- Per pair (sparse extension): network, intelligence level, exposure heat, **intel epoch**.
- Operations: ≤512 active, each with a serial.

**Operations:** the same 9 types and effects as before. **Targets are government IDs or actor IDs**, so support for opposition or insurgents, election influence and coup support survive a role change (party → government, insurgency → government).

**Resolution, exposure and fallout:** as before.

**Fog of war.** `Visibility.view(of:by:)` returns exact public data and **estimates with ranges** for military strength, operations and secret programmes. **Noise is keyed to (observer, target, intel epoch)**:
- the epoch advances in the observer's monthly slot (routine refresh) and when a gather-intelligence operation completes
- estimates are stable between refreshes, so panels do not churn and AI threat ratios do not jitter

Intelligence-sharing treaties pool visibility, and the AI sees through the same layer.

**No assassinations.** No such `Command` case or effect exists. The validator rejects any option that kills a named person, and a test asserts it (D-14).

### 5.7 Research and technology (البحث والتطوير)

As before:
- **8 domains × 15 levels:** industry and manufacturing; energy; computing, electronics and AI; biotech, health and agriculture; land systems; air, sea and space; missiles, deterrence and missile defence; cyber and intelligence.
- Levels 1–7 cover about 1975–2025 (real), 8–11 about 2026–2050 (published projections), and 12–15 cover 2051–2100, labelled «مُسقَط» (projected).
- cost(L) = base × 1.35^L × (1 + k·max(0, year(L) − current year)²); a catch-up bonus; theft and cooperation transfer progress.
- Start levels are `estimate`.
- Effects include equipment generations G4 → G6.

### 5.8 Climate and the long run (المناخ والمدى البعيد)

- **Global state (each 1 January):** CO₂; temperature by TCRE (≈0.45 °C per 1,000 Gt CO₂) plus a non-CO₂ adder; sea level calibrated to AR6.
- **Impacts:** farm yields, labour lost to heat, extreme-event frequency. **Coastal flooding uses DeltaDTM** low-elevation shares per province (≤1/2/5/10 m), tagged `estimate` and calibrated against published national exposure figures.
- **Levers:** energy mix, carbon tax, adaptation projects, a climate-agreement treaty.
- **Long-run realism:**
  - population: WPP 2024 bands
  - energy: EIA bands to 2050
  - warming: AR6 SSP bands
  - **GDP: SSP2 (v3.2) or OECD long-term baseline bands** for the world and the top 10 economies in 2050 and 2100
  - technology after 2050 follows labelled projections

  The emissions gate is judged together with the GDP gate, so a warming result is never accepted from the wrong growth path.
- **Cost:** about 300 multiply-adds a year.

### 5.9 Events and decisions (الأحداث والقرارات)

**Effect vocabulary.** It is derived in M1a from the headline events and institutions of all five packs. Each scenario contributes a list, and the stub packs exercise every effect:

| Family | Effects | Needed by (examples) |
|---|---|---|
| State lifecycle | `succession` (predecessor, continuator or none, successors, **allocation tables**), `unify` (with continuator or a new polity), `annex` (as a province set or governorate), `createPolity` (runtime), `renamePolity` | South Sudan 2011; Yemen and Germany 1990; USSR 1991; Czechoslovakia 1993 (no continuator); Iraq–Kuwait 1990 |
| Governments | `createGovernment`, `dissolveGovernment`, `governmentInExile` (host polity, seat, treasury abroad, frozen assets, forces abroad), `transferUNSeat`, `setRecognition` (state or government) | Kuwait at Taif 1990; Libya NTC 2011; Côte d'Ivoire; Afghanistan 2025; Sudan 2025 |
| Allocation keys | provinces, treasury, domestic and external debt, reserves, formations, equipment pool, **nuclear stock**, treaties (continue, lapse or transfer), UN seat, bloc seats, actors, party support (remap or reseed) | USSR (Russia continuator; nuclear weapons in Ukraine, Belarus, Kazakhstan); GDR treaties lapse |
| Institutions | `setRegime` (parameter set), `setConstitution` (offices), `setElectoralSystem`, `setFranchise` (by group), `setMonetaryRegime` (convertibility, parallel rate), `redenominate`, `joinCurrencyUnion` | Iran 1979; Zimbabwe 1980; South Africa 1984; COMECON currencies |
| Actors | `createActor`, `setActorRole`, `createParty`, `dissolveParty`, `mergeParties`, `splitParty`, `transferActor` | Egypt 2011–13; SPLM / SPLM-North |
| Standard | modifiers, flags, opinion, tension, spawn armed actor, war, treaty, sanction, disaster, news | All |

**Format example (succession):**

```json
{ "id": "evt.sdn.south_sudan_independence", "kind": "historical", "category": "politics",
  "trigger": {"date": "2011-07-09", "windowDays": 0},
  "conditions": [{"polityExists": "sdn"}, {"flagSet": "ref.sdn.2011_south_yes"}],
  "text": {"title": "loc.evt.ssd.title", "body": "loc.evt.ssd.body"},
  "options": [
    {"id": "recognize", "aiWeight": 95, "effects": [{"succession": {
      "predecessor": "sdn", "continuator": "sdn",
      "successors": [{"polity": "ssd", "government": {"id": "ssd.gov", "rulingActor": "act.sdn.splm",
                      "regime": "regime.presidential_partial", "currency": "cur.ssp"},
                      "provinces": {"adminRegionSet": "sdn.south_10"}, "capital": "p_slug.juba"}],
      "allocate": {"treasury": "continuator", "domesticDebt": "continuator", "externalDebt": "continuator",
                   "formations": "byLocation", "equipment": "byLocation", "nuclear": "continuator",
                   "treaties": "continuator", "unSeat": "continuator", "blocSeats": "continuator",
                   "actors": {"act.sdn.splm": {"to": "ssd", "splitInto": "act.sdn.splm_n",
                              "keepIn": "sdn", "provinces": "sdn.blue_nile+sdn.s_kordofan"}},
                   "partySupport": "remapByActors"}}}]},
    {"id": "contest", "aiWeight": 5, "effects": [{"addTension": {"with": "ssd", "rung": 1}}]}],
  "defaultOption": "recognize", "expiresDays": 14, "pausePolicy": "major",
  "evidence": ["ev.sdn.2011.independence"] }
```

**Text and Arabic grammar.**
- Templates use **typed slots with agreement selectors**, for example `{subj:country}` and `{v:أعلن|أعلنت}`. The selector is resolved from the subject's gender and number, giving «أعلنت مصر» but «أعلن العراق».
- Prepositions use forms such as `{country.li}`, giving «للعراق» but «لمصر».
- Every name record (polity, government, actor, leader, region) carries gender, number, definiteness, a short form, and the ل and ب forms. The fields are per locale, so English can add articles and possessives later.
- **The validator rejects** a template that uses a name slot as a subject without an agreement selector, unless the template is marked `noAgreement` after review.
- Apple's automatic grammar agreement is not relied on: no source found lists Arabic.

**Scheduling, historical mode, 2011 hooks and categories:** as before. Hooks:

| Date | Hook |
|---|---|
| 9–15 Jan | South Sudan referendum |
| 14 Jan | Ben Ali leaves Tunisia |
| 25 Jan / 11 Feb | Egypt protests begin / Mubarak resigns |
| 14 Feb / 14 Mar | Bahrain protests / Peninsula Shield deployment |
| 15–17 Feb | Libya uprising; **NTC government created on 27 Feb**; UNSCR 1970 (26 Feb), 1973 (17 Mar); intervention from 19 Mar; Tripoli falls in Aug; **UN seat to the NTC on 16 Sep**; 20 Oct (neutral news); 23 Oct liberation declared |
| 11 Mar | Tōhoku earthquake, tsunami and Fukushima |
| mid-Mar | Syria protests begin |
| Apr–May | Portugal requests and receives a bailout |
| 11 Apr | Côte d'Ivoire crisis resolved (**`dissolveGovernment(civ.gbagbo)`**) |
| 16 Apr | **Egypt's NDP dissolved (`dissolveParty`)** |
| Jun | **FJP founded (`setActorRole` on `act.egy.mb`)** |
| 2 May | Neutral news only (D-14) |
| 1 Jul | Morocco constitutional referendum |
| 9 / 14 Jul | South Sudan / UN membership |
| 20 Jul | Somalia famine declared |
| Jul–Oct | Greek second programme |
| 5 Aug | US credit downgrade |
| 23 Sep / 31 Oct | Palestinian UN application / UNESCO admission |
| 23 Oct | Tunisia constituent assembly election |
| 12 Nov | Arab League suspends Syria; Italian government change |
| 23 Nov | Yemen GCC agreement |
| 28 Nov | Egypt parliamentary elections begin |
| 4 Dec | Russia Duma election |
| 17 Dec | Death in North Korea's leadership (succession event) |
| 18 Dec | Last US troops leave Iraq |

- **Categories (about 16, one illustration each):** politics and elections; protests and revolutions; coups and regime change; war and operations; security; diplomacy and summits; economy and finance; energy and commodities; natural disasters; health and epidemics; science and technology; intelligence and cyber; climate and environment; nuclear; humanitarian and refugees; space.
- **v1 content (D-22):** 80 historical, 50 generic, 40 decisions.
- **Never blocking:** every decision has an expiry and a default.

### 5.10 AI and difficulty (الذكاء الاصطناعي والصعوبة)

| Layer | Cadence | Work |
|---|---|---|
| Grand strategy | Yearly | Goals: survive, grow, expand, realign, decarbonize |
| Strategic | **Its own stagger** (`aiNextStrategic`), at most 15 governments a day, on the difficulty period | Scores about 50 options from response curves over cached aggregates |
| Operational | Every 3–7 days, governments at war | Assigns armies to fronts and sets sector orders; execution is the shared engine system |
| Diplomatic and intelligence | Monthly slot | Treaties, UN votes, operations |

- **Method:** utility AI (Infinite Axis style) with integer curves.
- **Personalities come from data only:**
  - regime parameter set
  - bloc and alignment
  - defence share and conflict history from the data
  - debt and economic structure

  Small per-game noise is added. **No authored traits for real leaders.** Generated fictional leaders may add traits (R8, D-30).
- **Parity:** the AI uses Commands only and sees through `Visibility`, with stable epoch estimates.

**Difficulty changes decision quality only** (periods are now actually achievable):

| | Easy (سهل) | Normal (عادي) | Hard (صعب) | Expert (خبير) |
|---|---|---|---|---|
| Choice temperature | 0.6 | 0.3 | 0.15 | 0.05 |
| Strategic period (days) | 60 | 30 | 20 | 14 |
| Operational period (days) | 7 | 5 | 4 | 3 |
| Allied coordination (follow the front lead) | Off | Partial | On | On |
| Advanced levers | None | Some | All | All |

- The AI bonus toggle «مكافآت للذكاء الاصطناعي» (+10% / +25%) is off by default.
- **Strategy bots** (weekly): the balanced bot wins in at least 4 of 5 seeds.

### 5.11 Setup, presets, cheats, score and end

- **Flow (approved):**
  1. Scenario card.
  2. Country on the world satellite map. **Where a polity has more than one government on the start date, a small chooser lists them** (default: the UN-seat holder) (D-29).
  3. Campaign options.
- **Presets** (the group is called «الوضع» on the approved new-game page): واقعي (realistic, default); قوي (strong); قوة عظمى (superpower); «God» (D-12, the owner's answer, which replaced the earlier «صلاحيات مطلقة»). Every preset other than realistic is labelled «غير واقعي» (not realistic). In play, the State panel's header chip shows the mode: «الوضع: واقعي» in white, or the mode in amber; while unrealistic options are on it reads «<mode> · خيارات غير واقعية» with the wand icon (screen 5, `?states=1`).
- **Cheats** (collapsed, with a warning): unlimited money (posted from a `cheat` ledger source in LCU), unlimited resources, instant build, instant research, no rebellions. Saves record `cheatsUsed`, and the score is turned off.
- **Other options:** AI difficulty, historical mode, fog of war, climate impacts.
- **Score («تقرير الأمة», the nation report):** 5 equal pillars, computed in `Money` (constant 2011 USD) and from the campaign-start baseline row.
- **End conditions:**
  - 31 Dec 2100 → the report.
  - Nuclear rung 5 → a sober text screen.
  - **The player's government is dissolved:**
    - if it becomes a government in exile, play continues in exile (for example Kuwait 1990)
    - otherwise, if a successor government exists, the player is offered to continue as it
    - otherwise the campaign ends

### 5.12 Links between systems

As in final-1.0, plus:
- Navy → Economy (chokepoint disruption)
- Succession → All (allocation tables)
- Actors → Politics, Military, Intelligence (one identity across roles)

---

## 6. UI and UX: landscape iPhone, Arabic right-to-left

### 6.1 Design process and approval status

**Rule P1:** nothing is built before its visual design is approved. CI enforces it.

| Status | Screens |
|---|---|
| **Approved** | Main play screen (as designed for the 17 Pro Max); UI tokens; main menu; new-game flow; **province panel** (2026-10-20: a 320 pt card first, the map stays the centre; «تفاصيل المحافظة» opens the full-height details with 4 tabs; `design/screen4/R`, brief `design/shared/SCREEN4_BRIEF.md`) |
| **Pending design** (user's list) | Province details tabs الإنشاءات / القوات / السياسات; state (go-ahead 2026-10-21, `design/screen5/A`, brief `design/shared/SCREEN5_BRIEF.md`; reviewed, every confirmed finding fixed, awaiting the owner's approval); economy (proposal `design/proposals/S6_economy`, awaiting the owner); markets; politics and parties; internal and unrest; military fronts; forces and production; diplomacy; UN Security Council; intelligence; research; event and decision modal; war and peace; notifications; saves and settings; the "why" sheet; end screens |
| **Pending design** (added) | Speed popover; map-mode popover; **front-sector arrow interaction** (own sector highlighted, partner sectors shown read-only); pending-orders list; credits and sources; onboarding; country info card; **government chooser** (D-29); **small-phone variants of the top row** (D-31); **save mirror prompt** (D-28) |

**Province details, engine follow-up (from the approved province panel, 2026-10-20).** The «الحكم» tab shows three levers the engine does not model yet. Each needs a data model before it is built; until then the values are illustrative.
- **Governor:** an office per admin region, appointed by the head of state (Egypt 2011: presidential appointment), with a defined effect on administration and on unrest response.
- **Development priority** (industry, services, infrastructure): a share of the public-investment budget line per admin region.
- **Tax burden** (low, balanced, high): Egypt's taxes were national in 2011. The lever is to be defined as local fees and collection effort, or removed for unitary states.

### 6.2 Approved tokens (`design/tokens.json`)

Unchanged:

| Token | Value |
|---|---|
| Top-row elements | 36 pt |
| Small controls | 32 pt visual, **44 pt hit area** |
| Bottom dock | 44 pt, above the home-indicator inset |
| Type sizes | 10 / 11.5 / 13 / 14, plus a display title size |
| Spacing | 4 / 8 / 12 |
| Radii | 10 / 12 |
| Glass | `rgba(9,17,25,0.66)`, system blur, 1 px cyan-tinted border |
| Accents | Cyan and teal; calm, low-glare palette; not pure black; no harsh neon |
| Map grade | Brightness ≈0.72, saturation ≈0.78, cool tint; cyan borders at about 60%; faint cyan province lines; cyan glow and light fill on the player's country |

**Panels (2026-10-20/21, owner decisions D-3, `whiteTouches` and `sectionIdentity`).**
- **Panels are opaque** `rgb(12,20,28)` with no blur (D-3: «غامق دايمًا»). This replaces the glass row above for panels.
- **White touches** on the dark panels, confirmed by the owner («حلو الاسود ممزوج مع المربعات البيضه»):
  - white tile icons;
  - filled white primary buttons and chosen segments with dark text;
  - white-outlined secondary buttons.
- **Section identity:** each dock section has one colour, used only on its chrome: the panel's top line, the header emblem, the open tab, and the dock item while open.

  | Section | Colour |
  |---|---|
  | الدولة | `#E9EEF4` |
  | الاقتصاد | `#43C08A` |
  | الداخلية والسياسة | `#A08CFF` |
  | الجيش | `#BDB46A` |
  | الخارجية | `#5B86F2` |
  | الاستخبارات | `#C873D6` |
  | البحث | `#9EDB5B` |
  | المزيد | `#A9BCCB` |

  Data colours (teal, cyan, blue, amber, red) never change with the section.
- **The shared files:** `design/shared/section_identity.css`, and the province panel's `design/screen4/R/_build/panel.css` for the panel sizes.

### 6.3 Main play screen (approved)

```
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│ [⏸ ×2 ▾] 12 مارس 2011 │ البحث · النفوذ · القوى البشرية · الشرعية · الاستقرار · الخزينة │ [علم] مصر │ 36 pt
│ ┌toast┐                                                                                  │
│ [▦ أوضاع الخريطة]                 satellite map, full-bleed (left-to-right inside)       │
│ [⌖ دولتي]                         labels hide under every HUD rectangle                  │
│                                                                                          │
│ المزيد │ البحث │ الاستخبارات │ الخارجية │ الجيش │ الداخلية والسياسة │ الاقتصاد │ الدولة   │ 44 pt
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

**Width classes use the usable width** U = safe-area width − 2 × 8 pt:

| Class | U (pt) | Typical devices (U est.) | Starting variant |
|---|---|---|---|
| Wide | ≥820 | 17 Pro Max ≈ 820–830; 16 Plus / Pro Max ≈ 790–810 fall to Regular | Flag, name (full if it fits, else short), regime line if it fits; chips with trends |
| Regular | 700–819 | 844–896 pt models ≈ 700–790; 12/13 mini (812) ≈ 700–710 | Flag and short name; chips with trends if they fit |
| Compact | <700 | SE 667 ≈ 651 | Flag and short name; values at 11.5 pt; no trends |

**Fit engine.** A deterministic fallback chain runs until the measured top row fits U:
1. full name → short name
2. drop the regime line
3. drop trend arrows
4. chip values from 11.5 pt → 10 pt (an approved type size)
5. nation card → flag only (name moves to the State panel header)
6. date → short form «12/3/2011»

Measurements use the **player's name** (fixed per campaign) and **reserved widths for each chip's longest value class**, for example «−999.9 مليار» for the treasury, in Western digits.

**Snapshot fit tests** run in CI for the SE (667), 12/13 mini (812), XR/11 (896), 14/15 (844/852), 16 Pro (874), Plus/Pro Max (926/932) and 17 Pro Max (956). They use the longest Arabic country names («جمهورية الكونغو الديمقراطية», «سانت فينسنت وجزر غرينادين») and the widest values. Nothing may clip.

The variants that differ from the approved Pro Max design (steps 5 and 6) need the user's approval (D-31). Safe-area inset values per model are unverified, so the tests read them from the simulator.

### 6.4 HUD components

As before:
- **Nation card (top right):** flag 24×16, name at 13 pt (or a fit-engine variant). Tap opens the State panel.
- **Indicator strip (top centre):** الخزينة (treasury, with the monthly net arrow), الاستقرار (stability), الشرعية (legitimacy), القوى البشرية (available manpower), النفوذ (influence), البحث (research points per month).
  - Values are rounded and update at most 4 times a second. Tapping a chip opens its «لماذا؟» sheet.
  - Stability bands: <25 red, 25–49 amber, 50–74 neutral, ≥75 teal.
  - **Manpower shows available plus the reserve pool** («+ احتياط», plus reserve).
- **Date and speed (top left):** the date in Western digits («12 مارس 2011»).
  - One 32 pt control: tap to pause or resume; the chevron opens a popover with ⏸ ×1 ×2 ×5 ×10 أقصى.
  - Speeds capped by the governor appear disabled with a thermometer icon and the reason.
  - A pending-orders badge shows while paused.
- **Left column:**
  - Notification toast: one at a time, about 3 s, similar ones merged; tap to jump.
  - Map-mode button (32 pt visual, 44 pt hit area).
  - «دولتي» (my country): flies the camera to the player in 0.6 s, or jumps with Reduce Motion.
- **Dock (44 pt):** 8 sections, the active one in cyan, with badges.

### 6.5 Panels

As before. Custom side sheets from the right; width = clamp(42% of the safe width, 340, 440) pt; the panel's rectangle is published as an occluder. Structure: at most 3 headline numbers with trends and why-links, then grouped levers, then action rows showing cost and an effect preview.

| Dock section | Contents |
|---|---|
| الدولة (State) | Leader (rename), regime, constitution, the national laws (see below), political capital, projects (start, cancel with the refund shown), presets and cheats status |
| الاقتصاد (Economy) | Budget, taxes, debt and status, money and exchange rate, markets per good, trading partners, industries, subsidies |
| الداخلية والسياسة (Internal and politics) | Population, unrest list (worst first), movements, parties, elections, coalitions, interest groups, emergency regions (per province) |
| الجيش (Military) | Fronts and orders, armies, forces and production, conscription (shown, changed in State › السياسات), air regions, fleets, wars and peace, nuclear posture |
| الخارجية (Foreign) | Relations, treaties, blocs, sanctions, aid and arms, recognition, UN Security Council |
| الاستخبارات (Intelligence) | Agency, networks per country, operations, counter-intelligence, exposure log |
| البحث (Research) | 8 domains, focus, cooperation and licences |
| المزيد (More) | Saves, settings, statistics charts (Swift Charts, ≤120 points, only while open), event log, sources and rights, help |

**One owner per law (screen 5 review, 2026-10-21).** State › السياسات owns the 8 national laws: the state of emergency, conscription, protest, media, parties, internet, public education and healthcare. Each change goes through `SetPolicy`, costs political capital and starts a 6-month cooldown. Other panels only show a law and link to it:
- Military shows the conscription level read-only, with a link. `SetConscription` (§5.4) becomes this law's `SetPolicy`.
- Internal's emergency rule is the per-province emergency regions of §5.2, not the national law.
- The State overview's decision «رفع حالة الطوارئ» is a shortcut to the same law change: one command, one cost (60), one cooldown.

Economic levers stay in the Economy section.

Additions in this revision:
- **Economy:** currency and convertibility, reserves in months of imports, chokepoint exposure.
- **Foreign:** state and government recognition shown separately.
- **Military:** sector ownership and the reserve pool.
- **More:** diagnostics export, save mirror settings, and «قيم تصميمية» (design values) on the sources screen.

### 6.6 Map modes (أوضاع الخريطة): all translucent over the satellite base

| Mode | Overlay |
|---|---|
| Political (سياسي, default) | Satellite, borders and the player glow; other countries have no fill |
| Relations (العلاقات) | Opinion toward the selected country |
| Blocs (التكتلات) | Bloc membership; hatching for claims |
| Economy (الاقتصاد) | GDP per capita |
| Markets (الأسواق) | Price or shortage of the selected good; **chokepoint disruption** |
| Security (الأمن) | Unrest, insurgency, control% |
| Politics (السياسة) | Leading or ruling party per province; election map |
| Military (عسكري) | Control, fronts, **sectors**, supply |
| Intelligence (الاستخبارات) | Network strength and exposure by country |
| Infrastructure (البنية التحتية) | Infrastructure 0–10 |
| Resources (الموارد) | Deposits and output of the selected good |
| Population (السكان) | Density |
| Climate risk (مخاطر المناخ) | From M6 |

Overlay alpha is 0.35–0.55, palettes are safe for colour-blind players, and the popover has toggles for de facto/de jure, province borders and label density.

### 6.7 Notifications (الإشعارات)

As before:

| Tier | Behaviour |
|---|---|
| Urgent | Event or decision modal; pauses the game if that category's auto-pause is on |
| Important | Toast plus the notification centre |
| Info | Notification centre only |

Pending requests have an expiry and a default answer. Pending orders (أوامر معلقة) can be cancelled before time resumes.

### 6.8 Dialogs (all through `DialogPresenter`)

As before:
- **Event and decision modal:** the category image, a title ≤60 characters, neutral text ≤90 words **rendered through the morphology layer**, 2–4 options with effect previews, and an expiry countdown.
- **Confirmation** for destructive actions, with «إلغاء» (cancel) as the default button.
- **Text input** for renaming the leader, an army or a save.
- **Chooser** for an ambiguous tap and for picking a government.

### 6.9 Main menu and new game (approved)

- **Main menu:** background art (one HEIC ≤600 KB), a continue card read from the latest save's **binary metadata**, and the 4 approved actions. No map or content loads before Start.
- **New game:** scenario → country on the world satellite map → (government chooser if needed) → options.

### 6.10 Accessibility and touch

As before:
- 44 pt hit areas around 32 pt visuals.
- Contrast ≈6.2:1 over the brightest imagery.
- VoiceOver labels on every HUD value, for example «الخزينة: 3.1 مليار دولار، في انخفاض» (treasury: 3.1 billion dollars, falling), **using the morphology layer**.
- Reduce Transparency → opaque glass. Reduce Motion → no camera flights or tween.
- Dynamic Type up to AX1 in panels.
- Haptics can be turned off.

### 6.11 Language, digits and dates

- Arabic only in v1, ready for English: semantic keys, CLDR plurals, Unicode isolates, and **per-locale morphology fields** on every name.
- **`GameFormatter`** is the only formatter: Western digits always (`ar@numbers=latn`), Arabic money scale words, percentages, dates with Arabic month names (D-7), and **agreement selectors and preposition forms**.

### 6.12 Visual style, sound, haptics and images

As before:
- **Style:** the approved operations-room look; system Arabic font; NATO-style symbols drawn in code; flag atlas; SF Symbols; logo in a licensed font (D-17).
- **Sound:** about 15 UI cues (≤1 MB, AAC), ambient audio session, stops in the background.
- **Haptics:** selection, confirm, warning and war-declared patterns.
- **User images:**

| Image | Source size | In the app |
|---|---|---|
| Menu background | 2868×1320 px | HEIC ≤600 KB |
| Scenario cards | 1200×800 | ≤200 KB each |
| Event category images (16) | 1600×800 | ≤250 KB each |
| App icon | 1024×1024 | — |

---

## 7. Saves, versioning and migration

**File `<name>.sanei`:**

| Part | Contents |
|---|---|
| Header | Magic `SANEISAV`, `containerVersion` u16, compression u8 (0 none, **1 raw DEFLATE**), flags, `metaLength` |
| **META (uncompressed, binary)** | A small self-describing table in the same column codec: `formatVersion`, game version and build, `scenarioId`, `mapVersion`, **`rulesHash` (`content.bin`)**, **`scenarioHash`**, game date, player government (ID and display name), playtime, preset, difficulty, `cheatsUsed`, seed. Read by `Platform`'s 200-line reader; no JSON. |
| Payload | Compressed and raw lengths, then compressed chunks |
| Trailer | SHA-256 |

**Chunks:**
- `IDxx`: ID lists per kind, including the **runtime `dyn:` IDs**
- `SERL`: serial counters per kind
- `PROV`, `GRPR` (group rows), `INDU`, `POLI` (polities), `GOVT`, `ACTR`, `PSUP` (party support), `PAIR`, `PEXT` (pair extension)
- `FORM`, `ARMY`, `FRNT` (fronts and sectors), `WARS`, `FLET`, `AIRG`, `SPYO`, `PROJ`, `TRTY`
- `EVTQ`, `DECN`, `NOTI`, `HIST`, `CLIM`, `WRLD`, `RNG `
- `CMDJ`: command journal, **build-scoped**

**Rules:**
- **Self-describing tables.** Columns `{name, typeTag, encoding (raw | varint-delta | **zigzag**), data}`. References are indices into the save's own ID lists. **Every handle row stores its `Serial`.** On load, handle tables are rebuilt in serial order, so random keys, tie-breaks and iteration order are identical to the running game.
  - An unknown chunk or column is skipped and logged.
  - A missing column takes its value from `SaveDefaults`. A test fails if any engine column has no default.
- **Persisted enums and commands** use **stable numeric tags** registered in `tags.lock`. Renaming a Swift case or field never changes the bytes. A tag is never reused.
- **`SaveTree` = typed column buffers.** Each is raw bytes plus a type tag and encoding, decoded per chunk in streaming fashion. Migration steps `SaveMigrations[n → n+1]` are **column-level operations**: `addColumn`, `renameColumn`, `dropColumn`, `convertUnits` (for example constant-USD columns → LCU with the stored deflator), `remapIDs(aliases)`, `splitProvince(pop weights)`, `addChunk`, `splitChunk`. Old Swift types are never kept.
- **Load procedure:** pause; release the old `WorldState` and its snapshot; decode; migrate; build the state.
  - Peak ≤ in-game footprint + 16 MB.
  - `simcli peak-load` runs on a 90-year save in CI, and the device recorder logs the peak.
- **`CMDJ`** is valid only for the build that wrote it. Loading a save from another build drops it with a log line. `.saneibug` replays need the same build, which `simcli` checks out by build hash.
- **Content migrations:** `aliases.json`; map-version changes run the alias migration.
- **Each save is a full snapshot.** The scenario file is never needed to load a save. A different `rulesHash` shows «تغيّرت قواعد اللعبة منذ هذا الحفظ» (the game rules have changed since this save) once. `scenarioHash` is informational.
- **Compatibility promise:** every released save loads in every later version. Bit-exact replay is promised within one build.
- **Golden saves:** at least 3 per release (start, mid-war, 30 years in), plus **one 90-year save** for the peak-load test.
- **Compression:** raw DEFLATE everywhere, with a device fixture tested on Linux.
- **Autosave (الحفظ التلقائي):**
  - 3 rotating slots, each in-game month, at most once per 2 real minutes (D-4)
  - always on going to the background
  - temp file → fsync → atomic rename → verify → "last good" marker
- **Manual saves:** unlimited, with a warning above 50. Corrupt files are shown as «تالف» (damaged) and kept.
- **Location (ADR-0020):** `Documents/Saves`, visible in the Files app under «على الـ iPhone» (On My iPhone) › صانع التاريخ, thanks to `UIFileSharingEnabled` and `LSSupportsOpeningDocumentsInPlace`.
- **Mirror (D-28):**
  - An optional automatic copy to a folder the user picks once in the document picker, for example in iCloud Drive or another location that survives deleting the app.
  - The folder is stored as a security-scoped bookmark (no entitlement needed; to verify).
  - Each manual save and the newest autosave are copied at most every 10 real minutes and on background.
  - The user is prompted once, after the first manual save. A stale bookmark asks the user to pick the folder again.
- **Re-signing note** (shown in help and in the M0 install guide): keep the same bundle ID when re-signing so the app updates in place and keeps its data. If a tool forces a new team or ID, check the mirror or export the saves before deleting the app.
- **Export and import** through the share sheet and the document picker. «نسخ احتياطي لكل الحفظ» (back up all saves) writes one `.saneipack` container.
- **Bug report «الإبلاغ عن مشكلة»:** a `.saneibug` file with the save, `CMDJ`, seed, hashes, device, build and the **ring log**.

---

## 8. Testing and quality gates

**Test pyramid:**

1. **Unit tests** per system with a tiny world-builder.
2. **Invariants after every tick** (test and debug builds):
   - ledger conservation **per account in its own unit**; **world account = 0 after the monthly close**
   - **equipment pool + allocations = stock**
   - **party support per province sums to ≤10,000 bp and references only existing actors of the administrator's polity**
   - population ≥0; manpower and reserves within bounds; handles valid; caps respected
   - **every government ran exactly once this month** (checked at month end)
   - saturation counter = 0
   - no non-historical crisis in 30 days; **no non-historical insurgency, revolution or mass protest in 90 days**
   - **month-1 price change ≤1%**
3. **Property and fuzz tests:** 1–5 years of random Commands; a rejected command leaves the hash unchanged.
4. **Determinism within one build:**
   - two runs give equal hashes
   - **Linux x86 equals macOS arm64** (hash artifact compared in `ios.yml`)
   - **save → load → continue equals an uninterrupted run**, with saves taken mid-war with full handle tables and freed slots
   - golden values only for `DetRNG` and `DMath`
5. **Golden saves and replays**, plus `peak-load`.
6. **Content:**
   - validate (including morphology, agreement selectors, parameter sets and effect vocabulary)
   - facts; `--t0` closure in both units
   - **stub packs** for 2026, 1990, 1985 and 1979: parse, build and run 30 days on tiny worlds, exercising succession with USSR-type allocations, a government in exile, franchise by group, non-convertible currency, SNTV, block vote, confessional seats, STV and a dissolved continuator
   - **evidence gate**; licence gate (per series); ID lock; **tag lock**; province-order hash; scenario gate (allowlist)
7. **Presentation:**
   - `GameFormatter` golden strings, including agreement: «أعلنت مصر», «أعلن العراق», «للعراق», «لمصر», «أعلنت الولايات المتحدة»
   - colour functions; search normalization
   - **`TermSink` equality test** (sum equals list total for every value)
8. **Map, on Linux:**
   - picking; level and tile selection
   - **cache policy (no visible eviction under a pan script)**
   - label placement with occluders; **runtime anchors** (Sudan after day 190 lands inside the new Sudan; Kuwait annexed in a stub)
   - **dash continuity** (pattern phase continuous across vertices)
   - `FrameScheduler`; governor
9. **Benchmarks by work counter**, plus allocations per tick = 0 with «لماذا؟» values active.
10. **Trajectory gates** (nightly subset; full weekly; historical mode, 2011–2021, 5 seeds):
    - world population within ±1% of WPP 2024 in 2021
    - real growth 2011–2019 for the top 20 economies within ±1.5 points a year of WDI
    - Brent bands (EIA values to verify)
    - active state-based conflicts within ±40% of UCDP
    - a euro-area programme in 2011–2013 in at least 4 of 5 seeds
    - no non-historical G20 regime collapse before 2016 in at least 4 of 5 seeds
    - Syria civil war starting 2011–2012 in at least 3 of 5 seeds
    - **number of countries with mass protests in 2011 within a band from the evidence-coded seed list**
11. **Long-run gates** (weekly, 2011–2100, 3 seeds):
    - population within ±6% (2050) and ±15% (2100) of WPP
    - warming within AR6 SSP2-4.5 (2.1–3.5 °C) **only when the GDP gate also passes**
    - **world GDP and the top 10 within SSP2 or OECD bands** (±25% in 2050, ±40% in 2100; licence pending)
    - largest economy under 40% of world output
    - no country above 300% debt/GDP for 10 years or more
    - caps hold; state ≤8 MB
12. **Strategy bots.**
13. **macOS:**
    - simulator tests; the arm64 determinism comparison
    - **smoke UI test:** Egypt → 30 days → every dock section → each dialog type → save, load, export
    - **fit tests on all listed device sizes**
    - 0 frames idle; ≤2 fps at ×1 with a front on screen; memory ≤250 MB; right-to-left
14. **Device (each milestone):** recorder CSVs, the auto-pan benchmark, MetricKit and diagnostic exports in `perf.md`.

**Gates that block a merge to `main`:**

| Gate | Fails when |
|---|---|
| Hygiene | Archives, a committed `.xcodeproj`, banned names, a file >600 lines, a function >60 lines, a new clone |
| Imports and APIs | Engine imports Map, UIKit or WebKit; uses `Date`, `.random`, libm or Float; iterates a Dictionary; JSON outside `SaneiBake`; `Codable` on persisted engine types; a function returns `[Term]` |
| Design gate | A screen or variant has no approved record |
| Scenario gate | A path outside the allowlist; a pack or stub fails |
| Build and tests | Any warning or failing test |
| Content | Validator, facts, closure, evidence, licence, ID lock, tag lock or province-order hash fails |
| Determinism and golden | Any mismatch (Linux; arm64 compared on `ios.yml` runs) |
| Performance | A work counter over budget, or peak load over budget; wall-clock above 2× |
| IPA (on `ios.yml` runs) | Any item in §2.8 |

**Process:**
- `CLAUDE.md`: module map, banned APIs, "search before you add", "replace in place", definition of done, **the evidence workflow** (first session compiles; a second, independent session verifies the sample).
- **Definition of done:**
  - both workflows green; tests added; ADR and docs updated
  - Arabic strings with morphology present
  - the AI uses the feature
  - every new column has a save default and every enum case a tag
  - a cost line in `perf.md`
  - an approved design for any screen
  - every new source licensed **per series** and evidenced

---

## 9. Phased roadmap

**Honest estimate.** The work is done by one non-programmer user plus an AI. It involves many design-approval rounds, PRs capped at about 400 lines and merged from a phone, and device checks that need manual signing. The **planning range is 95–125 weeks (about 2–2.5 years)**. It is **not** a commitment. Velocity is measured from M0 (P4), and the plan is re-estimated after M0b, after M1a and at every milestone end. The milestones are ordered so the game is playable early.

| Milestone | Est. | Builds | Playable at the end | Designs needed first | Exit criteria |
|---|---|---|---|---|---|
| **M0 Install proof** | 1–2 wk | Repo, CI skeleton, XcodeGen, unsigned IPA, an Arabic right-to-left landscape screen, a Metal triangle, the overlay, **ring log, diagnostics export, 60 s recorder**, the Documents saves folder | Nothing | — | The user signs and installs; the recorder CSV and log reach the PR |
| **M0b Map-look device test** | 3–4 wk | Linux imagery bake (base plus one region at z7), tile streaming with the pinned cache, vector borders with arc-length dashes and stencil, **both label approaches**, glass HUD shell, `FrameScheduler`, governor, **auto-pan benchmark** | Pan and zoom under the HUD | Main play screen (approved) | Recorder numbers: decode ms, hitches, thermal state and battery with blur on and off, memory. **The user approves the look on the device.** D-2, D-2b, D-3, D-5 and D-26 decided. **First velocity re-estimate.** |
| **M1a Engine, saves, CI** | 7–9 wk | Engine foundation with **every column group declared** (checklist below), saves format 1, migrations, golden saves, replay, CI gates, ADRs, registries, stub packs, evidence gate, the full province rule measured (map v1 = Natural Earth grouping) | `simcli`: any 2011 government runs to 2100 with thin systems; South Sudan succession; Côte d'Ivoire's two governments; save, load, continue | — (no screens) | All Linux gates green; stub packs pass; peak-load test; **second velocity re-estimate** |
| **M1c Renderer and UI shell** | 6–8 wk | Full renderer (overlays, glow, dashed disputes, picking, labels with occluders, runtime anchors), approved menu, new-game flow, play-screen shell, fit engine and tests, `DialogPresenter`, notifications, saves and settings screens, «لماذا؟» for stability | Pick any 2011 country on the map; taxes and budget; stability with «لماذا؟»; projects; rename the leader; save, load, autosave, export, import, mirror | Saves and settings; notifications; «لماذا؟»; province panel (basic); state (basic); government chooser; small-phone variants; mirror prompt | IPA on the device; `perf.md` entry |
| **M1b Map version 2** | 4–5 wk (data work runs in parallel with M1c; about 2–3 wk extra) | Refined layer (2,850 ± 100), refinement zones, every historical cut line, regions, sea zones, chokepoints, alias migration v1 → v2, `facts_2011` complete | The same, on the final map | — | First released ID list; migration test |
| **M2 Economy, markets, population** | 12–14 wk | Goods, ICIO/BEA industries, labour, national and world markets, chokepoints, currencies and the nominal ledger, fiscal and monetary policy, debt, crises, single-year demography, migration, seeded unrest and insurgency, economic AI | 2011: euro crisis, food and oil prices, the Libyan oil shock, programmes, devaluations | Economy budget; markets; internal and unrest | Closure in both units; month-1 ≤1%; 2011–2013 bands |
| **M3 Politics and events** | 12–14 wk | Actors and roles, parameter sets, parties ≤12, elections (all formulas), coalitions, interest groups, opposition, coups, event engine with the full vocabulary, morphology, first 40 historical events plus generic events and decisions | The Arab Spring; 2011 elections; NDP dissolved and FJP founded | Politics and parties; event and decision modal | Calendar facts; election tests per formula |
| **M4 Military** | 12–14 wk | Armies, side-level fronts and sectors, execution, combat, supply, routing, the equipment pool, reserves and quotas, air, fleets, war and peace, counter-insurgency, nuclear, operational AI | Libya 2011 with a NATO coalition; counter-insurgency in Afghanistan and Somalia | Military fronts and sector arrows; forces and production; war and peace; nuclear end screen | Bands; wartime benchmark at 8,192 formations; front frame test |
| **M5 Diplomacy, UN, intelligence** | 10–12 wk | Relations, blocs, treaties, sanctions, state and government recognition, UN seats and credentials, Security Council, full espionage, epoch fog | Sanctions, UN votes, covert operations, recognition of the Libyan NTC | Diplomacy; UN Security Council; intelligence | Veto, credentials and exposure tests; no-assassination test |
| **M6 Research, climate, long run** | 6–8 wk | Research to 2100, climate with DeltaDTM, GDP bands | Play to 2100 | Research; 2100 end screen | WPP, IPCC and SSP2/OECD bands |
| **M7 AI depth and balance** | 8–10 wk | Grand strategy, data-derived personalities, difficulty, bots | Complete single-player game | — | 14 nights green |
| **M8 Polish and release candidate** | 6–8 wk | Sounds, haptics, onboarding, accessibility, sources screen, art, legal package, **XR device check** | Release candidate | Onboarding; credits | Release checklist; final `perf.md` |
| After 1.0 | — | Packs 2026 → 1990 → 1985 → 1979 (data only, per §4.2), music, English, deeper naval play, iPad | — | Per screen | Additive (F5, F10) |

**Cut list.** When a milestone runs more than 30% over its estimate, items are taken in this order. The foundation is never cut: schema, saves, gates, IDs, map lines and evidence.
1. Event volume: 80/50/40 → 50/40/30 (D-22).
2. Tier-B party countries use national-only seeds (D-10).
3. Fewer curated deposits and plants (templates instead).
4. Naval missions in v1: patrol and blockade first; escort and sea control in a later v1.x (the base is already declared).
5. Fewer onboarding cards and statistics charts.
6. Flavour depth in espionage operations, staged rather than removed. **All 9 operation types stay**, because the user decided on full espionage. Removing any type needs the user's approval (D-25).
7. Any cut touching a user decision (markets, parties, espionage, scenarios, satellite map) → stop and ask the user.

### M1a foundation checklist (engine, saves, CI)

- **Process:**
  - repo, `CLAUDE.md`, PR template, branch protection
  - **ADRs 0001–0022:** the 18 from final-1.0, plus 0019 currencies and the nominal ledger; 0020 save location and mirror; 0021 polity, government and actors; 0022 effect vocabulary and parameter sets
  - design, scenario, evidence and tag gates; cost ledger; `velocity.md`
- **Core:** `BP`, `Q32`, `LogQ`, `LCU`, `USDn`, `Money`, `GameDate` (1850–2200), `Serial`, `DetRNG`, `DMath`, `TermSink`, zigzag codec, `HandleTable` with serial order.
- **Content:**
  - loader, validator, baker; parameter sets; effect vocabulary schema
  - `SOURCES.yaml` with per-series status; `facts_2011` (first 60)
  - polity, actor, group and currency registries; runtime namespace; aliases; ID lock; tag lock
  - territory composition
  - **stub packs for 2026, 1990, 1985 and 1979**
- **Map data:** pack formats (16-byte borders with arc length), the province-order hash, the **full merge rule measured with k tuned**, map v1 and v2 formats with a migration test, regions, sea zones and chokepoints.
- **Engine:**
  - `WorldState` with **every column group for M1–M6 declared** with defaults: polities, governments, actors, party rows, group rows, currencies and ledger accounts, equipment pool and allocations, reserve pool, front sectors, pair extension with epochs, climate, single-year cohorts, scheduling columns
  - `Pipeline` with stored slots and the strategic stagger
  - Commands with tags, including succession, government and recognition effects
  - per-currency `Ledger` with the world account; invariants; `Visibility`
- **Thin systems:** time, taxes, budget, cohorts, stability (via `TermSink`), projects, rename, event scheduler with 5 real events (South Sudan succession, Côte d'Ivoire resolution, Libya NTC creation, NDP dissolution, US withdrawal from Iraq).
- **AI stub** on the stagger.
- **Saves:** container, binary META, format 1, typed `SaveTree` migrations, golden saves, peak-load, autosave rotation, atomic writes, `.saneibug` with `simcli replay`, the DEFLATE fixture.
- **CI:** every Linux gate; weekly bands for economy and population only at first.

### M1c checklist (renderer and UI shell)

- **Presentation:** `GameFormatter` with morphology, the political mode plus one overlay, «لماذا؟» for stability.
- **App:**
  - menu, new game, government chooser, play shell, fit engine and device-size tests
  - `DialogPresenter`, toasts, notification centre
  - saves and settings screens, mirror, unclean-exit resume
- **Renderer:** imagery streaming with the pinned cache, overlays, borders (stencil, dashes), glow, picking, the chosen label approach, runtime anchors, `FrameScheduler`, governor, overlay, recorder.
- **`perf.md`** numbers from the user's iPhone.

---

## 10. Open decisions (choices only; costs and alternatives in §13)

| ID | Decision | Recommended default |
|---|---|---|
| D-1 | Repository and CI budget | New private repo; `ios.yml` on manual runs, tags and at most one changed-main build a day; a $25/month spending cap |
| D-2 | Imagery depth and codec | z7 HEIC (cache 64 or 96 slices), confirmed in M0b; ASTC if decode heat is measurable |
| D-2b | Label rendering | Glyph distance-field atlas, two passes; string atlas if small Arabic looks soft |
| D-3 | Glass blur fallback | Approved blur at rest; opaque while panning only if the end-to-end measures trip the rule |
| D-4 | Autosave cadence | Monthly, at most once per 2 real minutes |
| D-5 | Maximum zoom | 1.0 km/pt |
| D-6 | Money shown as | Nominal current USD (from the nominal ledger); «لماذا؟» also shows constant 2011 USD |
| D-7 | Month names | يناير… with a setting for كانون الثاني… |
| D-8 | Disputed and de facto entities | As in §4.5, with Gaza as a de facto government inside polity `pse` |
| D-9 | Player after losing an election | Keeps leading the state |
| D-10 | Party data depth | Tier A about 40 by province; tier B about 80 modelled |
| D-11 | Releasable candidates | About 10, created by events or negotiation only |
| D-12 | Name of the "god" preset | «صلاحيات مطلقة» |
| D-13 | Agency names | Generic |
| D-14 | Historical targeted killings | Neutral news only |
| D-15 | Unit movement display | Discrete jumps |
| D-16 | Maximum speed | 30 days/s |
| D-17 | Logo font | OFL Arabic font |
| D-18 | Historical-events mode | Flexible |
| D-19 | Fog of war | Estimates from intelligence |
| D-20 | Climate impacts | On, with a toggle |
| D-21 | Test devices | Borrow an **iPhone XR** for M0b, M4 and M8; an SE for layout checks |
| D-22 | Event volume | 80 / 50 / 40 |
| D-23 | Imagery for historical packs | Reuse the 2004 mosaic |
| D-24 | After 2100 | Campaign ends |
| D-25 | Schedule and cut policy | Planning range 95–125 weeks; cut list cuts content only; anything touching a user decision comes back to the user |
| D-26 | Imagery source variant | Blue Marble NG with NASA topography and bathymetry, re-approved on the device in M0b |
| D-27 | Equipment stock rule | 20-year spending plus legacy stock plus arms imports, as a carry-forward pool |
| D-28 | Save safety | Documents (visible in Files) plus an optional mirror, prompted once |
| D-29 | Rival governments | Any government administering a province on the start date is playable; default is the UN-seat holder |
| D-30 | Leaders' personality traits | None for real people; AI personality from data |
| D-31 | Small-phone top-row fallbacks | The ordered fit chain in §6.3 |

---

## 11. Unverified items and sources checked

### Unverified (must be confirmed before anything relies on it)

**Platform and performance**
- Decode time and energy per tile for HEIC, JPEG and ASTC on A12 and A19; the 0.4–0.8 bits per pixel for graded tiles.
- **That system blur is composited by the system's render server, outside the app's command buffers**; that presented-time callbacks and MetricKit hitch metrics capture its cost; battery-level granularity on iOS 17+.
- Whether memory-mapped clean pages and screen buffers count fully toward the footprint; A12 jetsam limits.
- **Safe-area insets of each Face ID iPhone in landscape** (the 44–62 pt range is from secondary sources); point sizes of models other than the SE (667×375) and 17 Pro Max (956×440).
- Quality of distance-field rendering of Arabic glyphs at 10–11.5 pt on the device.
- That Xcode 26.x bundles Swift 6.2.x; that `UIDesignRequiresCompatibility` is ignored by the Xcode 27 SDK.
- That Low Power Mode caps ProMotion; that `COMPRESSION_ZLIB` is raw DEFLATE.
- **That security-scoped bookmarks to a user-picked folder work on iOS 17 without an entitlement**, and how long they stay valid.
- **How common signing tools behave when re-signing over an installed app** (same versus different team or bundle ID).
- **Whether `astcenc` output is byte-reproducible per version and settings.**
- **Whether Linux arm64 hosted runners are available to private repositories on the user's plan** (the design no longer needs them).
- SF Symbols and system-font terms for logos.
- That forcing right-to-left at the root behaves correctly on devices set to non-Arabic languages.
- **Apple's automatic grammar agreement:** sources found list English, Spanish, French, Italian, Portuguese and German, and no Arabic. The design does not rely on it.

**CI cost**
- That github.com bills macOS minutes at **10×** against included private-repo minutes (secondary sources agree).
- That included minutes are **2,000 (Free) and 3,000 (Pro)**.
- That macOS costs **$0.062/min** and Linux 2-core **$0.006/min** after the January 2026 price cut. The only official table found is on a GitHub Enterprise Server docs page.
- The default $0 spending limit.

**Data and licences**
- NASA Blue Marble terms (only a mirrored copy found), including the topography-and-bathymetry variant and its exact file names.
- **OECD ICIO 2023 licence:** coverage confirmed (76 economies plus rest of world, 1995–2020). The OECD's July 2024 CC BY 4.0 adoption is confirmed for content, but not clearly for this dataset.
- **SSP database v3.2 licence; OECD long-term baseline scope.**
- **GDELT terms** (second-hand quote of unrestricted commercial use); **Mass Mobilization data licence** (not found); **GRIP roads licence**; **Maddison Project licence**.
- **WMEAT coverage of the editions before 1991** (a 1970–79 edition exists; others to confirm) and the public-domain status of each scan; **DoD and CRS report reuse** (US government works, expected PD).
- **CIA Handbook of Economic Statistics editions and their availability.**
- GHS-POP R2023A epochs; IDS licence; WDI per-series exceptions beyond SIPRI and UIS; ILOSTAT terms.
- Factbook 2011 archive integrity; Library of Congress Country Studies PD status.
- Wikidata coverage of 2011 parties; EU database rights.
- ParlGov, CLEA, Wittgenstein and **Barro-Lee** licences.
- Global Carbon Budget record licence; AR6 dataset licences; EIA IEO reuse; FAOSTAT; USDA PSD.
- MODIS and Köppen licences; **the OCHA Yemen admin-2 licence** (needed before the 1990 pack).
- The copyright status of AI-generated images; FairPlay versus CC's technological-measures clause.
- **Checked in this step, with a recheck before release:** DeltaDTM v1.1 is CC BY 4.0 (4TU record and paper); UIS data is CC BY-SA 4.0 (UIS Data Browser terms), so it is **denied**.

**Facts** (to be asserted with evidence)
- Every count, date and leader in §4.7, §5.5 and §5.9.
- **Ouattara's UN credentials (Dec 2010); NTC formed 27 Feb 2011 and seated at the UN 16 Sep 2011; Egypt's NDP dissolved 16 Apr 2011; FJP founding date.**
- For the 2026 pack: **Russia's recognition of the Taliban government on 3 Jul 2025; the RSF "Tasis" government sworn in at Nyala in Aug 2025 and its non-recognition by the Security Council and the AU**; the status of the Chagos treaty.
- Recognition counts; Area C share; Brent averages; world GDP 2011.
- Lebanon 2009 electoral rules; Jordan and Afghanistan 2010 SNTV; Iraqi minority quota seats.
- Per-pack Palestinian status details (§4.5).

**Models**
- TCRE and its range; WPP 2100; AR6 SSP2-4.5 range; SSP2 GDP values.
- Every coefficient in §5, including the new ones: the 8-year half-life of the unrest offset, the hysteresis margins, the capture rate, the logistics-capacity shares, the reroute costs, the formation quota formula, the opening-stock split rules.
- **Province count:** the measured 2,742 (area/10,000 + pop/3 M, protected cities ≥2 M, before refinement zones and never-merge lines). The final 2,850 ± 100 depends on k tuned in M1a.
- **China males 18–49 ≈ 340 M (2011)**, used only to size formation quotas.
- The planning range of 95–125 weeks (no velocity measured yet).

**Measurements made for this design**
- Imagery tile counts: `wf/final/tiles_est.py`.
- Vector mesh numbers: `wf/lite/mesh_budget.py` and `wf/judge_lite/chunk_density.py`.
- Province counts under four rules: `wf/revise/merge_pop3.py`, adapted from the critic's `wf/audit/merge_pop2.py`. It reproduced the critic's 2,871 and 3,183.

### Sources checked

**Earlier steps:**
- [NASA Blue Marble NG / Visible Earth terms (mirrored copy)](https://public.data.npolar.no/quantarctica/Quantarctica/Basemap/World/1st_ReadMe_NASA_BlueMarbleNextGeneration_NASA%20Visible%20Earth%20Terms%20of%20Use.htm)
- [NASA media usage guidelines](https://www.nasa.gov/multimedia/guidelines/index.html)
- [The World Factbook is gone (Data Rescue Project)](https://www.datarescueproject.org/guest-post-the-world-factbook-is-gone/)
- [Simon Willison, Feb 2026](https://simonwillison.net/2026/Feb/5/)
- [CIA Factbook archives](https://www.cia.gov/the-world-factbook/about/archives)
- [WDI military expenditure (SIPRI)](https://data.worldbank.org/indicator/MS.MIL.XPND.CN?start=2011)
- [WMEAT 1999–2000](https://www.globalsecurity.org/military/library/report/2003/wmeat9900/index.html)
- [WMEAT 2015 note](https://www.infodocket.com/2015/12/28/reference-new-report-and-data-files-world-military-expenditures-and-arms-transfers-2015/)
- [ParlGov about](https://parlgov.org/about/)
- [Kummu 2018 on Dryad](https://datadryad.org/stash/dataset/doi:10.5061/dryad.dk1j0/)
- [Apple forums on UIDesignRequiresCompatibility](https://developer.apple.com/forums/thread/832543)
- [OECD open-licence announcement](https://www.oecd.org/en/about/news/press-releases/2024/07/oecd-data-publications-and-analysis-become-freely-accessible.html)
- [Wittgenstein Centre](https://iiasa.ac.at/models-tools-data/wcde)
- [Global Carbon Project 2025v15](https://zenodo.org/records/17417124)
- [ILO rights](https://www.ilo.org/node/9321)
- [IPCC AR6 data](https://www.ipcc.ch/report/ar6/wg1/resources/data-access)
- [ETOPO 2022](https://doi.org/10.25921/Fd45-Gt74)
- [World Bank IDS](https://datacatalog.world bank.org/search/dataset/0038015/international-debt-statistics)
- [World Bank dataset terms](https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets)

**This revision:**
- [UIS Data Browser terms (CC BY-SA 4.0)](https://databrowser.uis.unesco.org/terms-and-conditions)
- [OECD ICIO tables page](https://t4.oecd.org/sti/ind/inter-country-input-output-tables.htm)
- [OECD ICIO 2023 working paper](https://www.oecd.org/en/publications/development-of-the-oecd-inter-country-input-output-database-2023_5a5d0665-en.html)
- [Open Risk Manual: OECD ICIO licence "unclear"](https://www.openriskmanual.org/wiki/OECD-ICIO)
- [NDL note on the OECD CC BY 4.0 scope](https://current.ndl.go.jp/car/222406)
- [NASA Blue Marble NG base topography and bathymetry](https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/base-topography-bathymetry)
- [NOAA SOS: Blue Marble with topography and bathymetry](https://sos.noaa.gov/datasets/blue-marble-with-topography-and-bathymetry/)
- [NASA SVS Blue Marble NG](https://svs.gsfc.nasa.gov/3539)
- [DeltaDTM paper (Scientific Data 2024)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10917791/)
- [DeltaDTM 4TU record](https://data.4tu.nl/datasets/1da2e70f-6c4d-4b03-86bd-b53e789cc629)
- [Apple forum: Foundation grammar languages](https://developer.apple.com/forums/thread/682147)
- [WWDC23 session 10153](https://developer.apple.com/videos/play/wwdc2023/10153)
- [GitHub Enterprise Server runner pricing reference](https://docs.github.com/en/enterprise-server@3.17/billing/reference/actions-runner-pricing)
- [Bitrise on GitHub Actions pricing 2026](https://bitrise.io/blog/post/best-github-actions-runners-in-2026-and-hidden-pricing-traps-to-avoid)
- [DEV: macOS minutes and the multiplier](https://dev.to/ace2932/your-github-actions-bill-is-mostly-macos-minutes-heres-how-to-tell-56fk)
- [IIASA SSP basic drivers v3.2](https://ssp.apps.ece.iiasa.ac.at/documentation/basic-drivers)
- [Mass Mobilization Project](https://www.binghamton.edu/massmobilization/)
- [GDELT terms (second-hand quote)](https://jwatte.com/blog/gdelt-open-data-kalev-leetaru.md)
- [ICPSR WMEAT series](https://www.icpsr.umich.edu/web/ICPSR/series/61/studies)
- [WMEAT 1970–1979 catalogue record](https://discovery.ifa.de/vufind/Record/1459352467)

---

## 12. Change log from critique

All 54 issues were accepted. Five were merged with a duplicate from the other critic. Seven were accepted in part, and the part declined has a one-line reason.

| # | Critic · area | Verdict | What changed (§) |
|---|---|---|---|
| 1 | RH · effect vocabulary and enums | Accepted | Vocabulary derived from all 5 packs: succession with allocation tables, government in exile, franchise by group; regime, electoral and monetary parameter sets as data; stub-pack CI test in M1a (§5.3, §5.9, F5, §8) |
| 2 | RH · state vs government | Accepted | Polity/government split; N governments per polity; UN-seat holder; separate state- and government-recognition bits; player picks a government; declared in M1a (§2.4, §4.5, §5.5, D-29) |
| 3 | RH · one political actor | Accepted | One actor registry with party, armed, controller and government roles; role changes keep the ID; controllers and spy targets reference actor IDs (F12, §5.3, §5.6) |
| 4 | RH · party slots | Accepted | Stable party IDs (actors); sparse support rows; create, dissolve, merge and split effects; explicit remap or reseed on every administrator change; cap 12 (793 coalitions) (§5.3) |
| 5 | RH · unit of account | Accepted (merged with #44) | ADR-0019: LCU ledger per currency, FX reserves in USDn, money base, debt by currency, world USD deflator; `Money` derived for reports; closure in both units (§2.3, §2.4, §5.1) |
| 6 | RH · equipment formula ignores losses | Accepted | Recursive pool per category × generation with losses, captures and transfers; 20-year formula only seeds the start; allocations to formations, fleets and air groups; conservation invariant (§5.4) |
| 7 | RH · runtime country IDs | Accepted | `dyn:<serial>` namespace with generated name, flag, colour, capital and anchor; capacity 384; stored `monthlySlot` and last-run dates (§2.4, §4.4) |
| 8 | RH · Arabic grammar | Accepted | Morphology fields on every name; agreement selectors and preposition forms in `GameFormatter`; validator rejects unselected subject slots; per-locale fields (§5.9, §6.11) |
| 9 | RH · groups and electoral rules | Accepted | Two-dimension group registry with sparse rows and no 3-group limit; SNTV, block vote, STV, AV, reserved and confessional seats, offices allocated by group (§5.3, §4.6) |
| 10 | RH · trade has no geography | Accepted | About 10 chokepoints plus sea clusters; baked exposure vectors; disruption from naval control and events; no bilateral matrix (§5.1, §4.3) |
| 11 | RH · front ownership in coalitions | Accepted | Fronts per war side with a lead and per-government sectors; each country orders only its sector; frontage shared by strength (§5.4) |
| 12 | RH · formation cap vs mobilisation | Accepted (merged with #51) | Reserve pool; formations 5k–25k; quota per government (40 + pop/1.5 M, ≤1,200); world cap 8,192 measured in the benchmark (§5.4, L3) |
| 13 | RH · identity after load | Accepted | Persistent u32 serials for every handle entity, saved counters, used for random keys, tie-breaks and iteration (§2.3, §7, F2) |
| 14 | RH · "why" terms vs zero allocation | Accepted | Generic `TermSink`; `SumSink` for the simulation; 12-slot inline list sink for the UI; lint bans `[Term]` (R9, §2.3) |
| 15 | RH · JSON metadata and Codable | Accepted, in part | Binary META table and numeric command tags with `tags.lock`; build-scoped CMDJ. **Declined** the `JSONSerialization` exception: the binary table avoids a second format (§7) |
| 16 | RH · SaveTree memory spike | Accepted | Typed column buffers with column-level migrations; old state released first; `peak-load` test on a 90-year save (§7, L8) |
| 17 | RH · monolithic content.bin | Accepted | `content.bin` holds rules; `scenario-<id>.bin` per scenario, mapped only for a new game; separate hashes and budgets (§2.8, §3.6, §7) |
| 18 | RH · saves location | Accepted, in part | Documents with file sharing; optional mirror to a user-picked folder; re-signing note. **Declined** making the mirror automatic by default: it needs the user's own folder choice (§7, D-28) |
| 19 | RH · tile cache too small | Accepted | Visible set pinned; prefetch only into free slots; cache sized from the drawable (64 on A12, 96 on Pro Max); memory table updated; ASTC option noted (§2.5, §3.3) |
| 20 | RH · blur cost invisible | Accepted (merged with #40) | End-to-end measurement (hitches, thermal state, battery, auto-pan benchmark), a decision rule, and a Metal-blur alternative (§3.7, D-3) |
| 21 | RH · label atlas and Arabic joins | Accepted, in part | Default: glyph distance-field atlas shaped once, halos then fills. **Declined** the string atlas as default (re-rasterises while panning); kept as the M0b fallback (§2.5, D-2b) |
| 22 | RH · static label anchors | Accepted | Runtime anchors off the main thread on administrator change; baked anchors only a cache; tests for South Sudan and Kuwait (§2.5, §8) |
| 23 | RH · border format | Accepted, in part | 16-byte instances with cumulative arc length; stencil-once drawing per style class. **Declined** full polylines with join data: arc length plus stencil gives the same result with a smaller pack (§2.5) |
| 24 | RH · width classes ignore safe areas | Accepted (merged with #41) | Classes from the usable safe width; ordered fit chain; snapshot fit tests per device with the longest names and values (§6.3, D-31) |
| 25 | RH · fog estimates re-rolled daily | Accepted | Noise keyed to (observer, target, intel epoch); attack/stop hysteresis 1.5/1.3 (§5.6, §5.4) |
| 26 | RH · long-horizon ranges | Accepted | 125 yearly samples plus a baseline row; `GameDate` tested for 1850–2200; zigzag varints (§2.3, §2.4) |
| 27 | RH · scenario gate allowlist | Accepted | Allowlist of registry, art, flags, evidence, verification and approved designs; map lines via a `map-version` PR (§2.8) |
| 28 | RH · imagery reproducibility gate | Accepted | Reproducibility checked on decoded pixels of the lossless graded tiles; encoded pack pinned and checked by PSNR; Linux only (§2.5, §2.8) |
| 29 | RF · scope and milestones | Accepted, in part | M1a split into M1a and M1c; planning range 95–125 weeks; velocity re-estimates; cut list. **Declined** cutting espionage operations from v1: user decision; staging only (§9, P4, D-25) |
| 30 | RF · economy data | Accepted | OECD ICIO (pending) with the BEA public-domain fallback; regional and tier templates; budget shares solved for exact day-1 clearing; month-1 ≤1% invariant (§4.2, §4.6, §5.1) |
| 31 | RF · CI cost | Accepted | `ios.yml` only on manual, tags and one changed-main build a day; arm determinism via the macOS job; weekly long runs; cost estimate in D-1 (§2.8, §13) |
| 32 | RF · unrest calibration | Accepted | Seed per country with evidence; decaying offset per province; thresholds on upward crossings with hysteresis; 90-day invariant; GDELT and MM pending (§5.2, §4.6, §8) |
| 33 | RF · legacy stocks and imports | Accepted | Opening 1991 stock from WMEAT 1971–90 with split rules; arms imports added to procurement; both shown in «لماذا؟» (§5.4, §4.6, D-27) |
| 34 | RF · 2011 military seed | Accepted | WMEAT 2013/2015 for 2010 spending and personnel; DoD and CRS for about 40 countries; Country Studies only for 1985/1990; Factbook to `notes` (§4.2, §4.6) |
| 35 | RF · data provenance | Accepted, in part | Snapshot, quote and date per row; offline quote check; weekly link check; second-session 10% re-extraction blocks PRs. **Declined** live URL checks on every CI run: network flakiness would make the gate unreliable (R1, R11) |
| 36 | RF · territory definitions | Accepted | `territory/composition.csv`; carve-out methods for de facto states; fallbacks (PWT for Taiwan, UNSD for DPRK); closure against composed targets (§4.6) |
| 37 | RF · population ageing | Accepted | Single-year ages 0–100+ × 2 sexes, shifted once a year; 5-year bands for display only (§5.2) |
| 38 | RF · UIS education licence | Accepted | UIS-sourced WDI series denied (CC BY-SA 4.0, checked); skill tiers from ILOSTAT plus estimates; Barro-Lee and Wittgenstein pending (§4.1, §4.2) |
| 39 | RF · province count | Accepted | Rule changed to area/10,000 + pop/3 M with cities ≥2 M (measured 2,742 before zones); k auto-tuned to 2,850 ± 100 in M1a; L3 split into land, sea and total caps (§4.4, L3) |
| 40 | RF · blur measurement | Accepted (merged into #20) | As #20 |
| 41 | RF · layout classes | Accepted (merged into #24) | As #24, including the chip value width on the SE, resolved by the 10 pt step |
| 42 | RF · AI difficulty cadence | Accepted | Strategic AI on its own stagger (≤15 a day); budget 0.15 ms normal, 0.30 ms expert (§2.4, §3.2, §5.10) |
| 43 | RF · trade accounting | Accepted, in part | Transport paid out monthly as service exports by logistics capacity; world account exactly 0. **Declined** the deadweight-sink option as default, because it drains income (§5.1) |
| 44 | RF · monetary units | Accepted (merged into #5) | As #5, plus revaluation postings, redenomination, and a path for nominal display (D-6) |
| 45 | RF · long-run calibration | Accepted | SSP2 v3.2 or OECD long-term GDP bands for 2050 and 2100, world and top 10; warming gate judged with the GDP gate (R6, §5.8, §8) |
| 46 | RF · debugging without a Mac | Accepted | Ring log export, `MXDiagnosticPayload` export, «تسجيل 60 ث» recorder and auto-pan benchmark from M0; signposts dropped from exit criteria (§3.8, §9) |
| 47 | RF · imagery pipeline | Accepted | Blue Marble NG with topography and bathymetry; GMTED and ETOPO removed from the imagery bake (ETOPO no longer needed); Linux processing; graded tiles as a release asset (§2.5, D-26) |
| 48 | RF · historical packs data | Accepted | Source plan per era, R4 tests per era, OCHA Yemen licence flagged (§4.2) |
| 49 | RF · coefficients with no data | Accepted | `calibratedAgainst` classes including `design-target`; AI personality from data; no authored traits shown for real leaders (R5, R8, §5.3, §5.10, D-30) |
| 50 | RF · device floor facts | Accepted | XR (A12, 3 GB) is the floor device; XS is A12 with 4 GB; SE 2 is A13 and used for 667 pt layout (§3, D-21) |
| 51 | RF · entity caps | Accepted (merged into #12) | Quotas, reserve pool, 8,192 cap measured |
| 52 | RF · sea-level impacts | Accepted | DeltaDTM (CC BY 4.0) thresholds ≤1/2/5/10 m with `estimate` tag and calibration to national exposure figures; GMTED no longer used for coasts (§4.2, §5.8) |
| 53 | RF · Palestinian status 1979/1985 | Accepted | Per-area, per-pack table: no Jordanian claim on Gaza; East Jerusalem law from 1967 plus the 30 Jul 1980 event; Golan occupied in 1979 and law of 14 Dec 1981 not recognised (§4.5) |
| 54 | RF · infrastructure index | Accepted | Index from GDP per capita, urban share and Factbook road and rail lengths (PD); GRIP pending; Natural Earth roads dropped; `estimate` (§4.6) |

---

## 13. Decisions for the user (updated)

Each item needs the user's agreement before the milestone shown. The recommended default comes first. These supersede §12 of final-1.0.

### 13.0 Owner's answers (2026-10-20)

These answers override the defaults below. They are logged in `decisions/decisions_log.txt`.

| ID | Owner's answer | Consequence |
|---|---|---|
| D-1 | **New public repository** | Standard CI runners are free. The code, design and images are publicly visible. No open-source licence is granted (all rights reserved). |
| D-4 | Monthly autosave, at most once per 2 real minutes | As recommended. |
| D-6 | Nominal current USD | As recommended. |
| D-8 | Disputed areas as in reality on 1 Jan 2011 | As recommended (§4.5). |
| D-9 | **Play on in opposition** after losing an election | About +3–4 weeks in M3. Needs opposition gameplay and a designed opposition screen. |
| D-12 | God preset keeps the name **God** | The owner first chose «حكم مطلق», then approved the settings page with "God" (2026-10-20). |
| D-16 | Maximum speed 30 days/s | As recommended. |
| D-21 | **No device loan possible** | Replaced by: an "XR budget mode" in debug builds on the owner's phone (XR memory cap, 16 MB tile cache, 60 Hz cap, time budgets tightened by the measured speed gap); deterministic work counters in Linux CI; and XR-size layout and UI tests on the iOS Simulator in GitHub Actions. Real A12 heat, GPU and battery remain unmeasured: an accepted risk. |
| D-28 | Saves in Documents plus an optional mirror | As recommended. |
| D-29 | Government chooser | As recommended. Needs one screen design. |
| D-2 | Medium imagery (z7) | As recommended; final after the device test. |
| D-2b | Light label method (glyph distance-field atlas) | As recommended. |
| D-3 | **Opaque panels always, no blur** | The owner chose lightness over the approved glass. Shown as a proposal first (`design/proposals/D3_panels`); not applied to any approved design until the owner confirms the look. |
| D-5 | Maximum zoom about 1 km/pt | As recommended; final after the device test. |
| D-7 | يناير… with a setting | As recommended. |
| D-10 | Parties: tier A about 40 by province, tier B about 80 modelled | As recommended. |
| D-11 | About 10 releasable states | As recommended. |
| D-13 | Generic agency names | As recommended. |
| D-14 | Historical killings as neutral news only | As recommended. |
| D-15 | **Smooth, realistic unit movement** (owner's reference: a "General / World War" style mobile game) | Replaces discrete jumps. Must stay light: animate only on-screen moving units, draw frames only while something moves, simplify at maximum speed or when hot. A moving prototype needs the owner's approval with the military screen. |
| D-17 | Free OFL Arabic logo font from 3 samples | As recommended. |
| D-18 | Flexible historical events | As recommended. |
| D-19 | Fog of war as estimates | As recommended. |
| D-20 | Climate on, with a toggle | As recommended. |
| D-22 | Events 80 / 50 / 40 | As recommended. |
| D-23 | Historical packs reuse the 2004 imagery | As recommended. |
| D-24 | Campaign ends at 2100 | As recommended. |
| D-25 | **Early version first** | A playable v0.5 after M3 (map, economy, politics, events; no military yet), then M4–M8. Same total range, re-estimated after M0b and M1a. |
| D-26 | NASA Blue Marble NG with topography and bathymetry | Chosen from the owner's criteria (light and realistic). An AI-generated map was declined because it cannot match real geography. Pending: bathymetry licence check; owner approves the look on the device. |
| D-27 | Equipment: 20-year spending + legacy stock + imports | As recommended. |
| D-30 | No personality traits for real leaders | As recommended. |
| D-31 | Small-phone top row | Covered: the owner approved screen 1 (B3) after seeing all 7 devices. |
| **Military control** | **Full control of each army** (owner's reference: «الجنرال | الحرب العالمية») | **Replaces "automated fronts only" (§5.4).** The player orders each army: move, attack, halt and waypoints. AI countries run their own armies the same way. Consequences: an order queue and unit selection UI, per-army routing on demand (the daily routing budget in §5.4 must be re-measured), operational AI per army, and the M4 estimate grows (roughly +3–5 weeks; unverified, re-estimate at M4 planning). Equipment stays generic; air and naval stay simplified in v1. |

### 13.1 Design and technical choices

| ID | Needed before | Choice and cost |
|---|---|---|
| D-1 Repository and CI budget | M0 | <ul><li>**Superseded: the owner chose a public repo (13.0).** Previous default: new private repo. `ios.yml` runs only when the user asks, on tags, and at most once a day when `main` changed. Linux CI on PRs and merges. Estimated about $5–25 a month above the free 2,000 minutes, assuming 8–15 iOS builds of about 25 min (macOS counts 10× against included minutes; about $0.062/min after that, unverified) and about 1,000–1,500 Linux minutes. A spending cap of $25 a month stops runaway costs.</li><li>GitHub Pro ($4 a month, 3,000 included minutes): about $4–15 a month in total.</li><li>Public repo: standard runners are free, but the code is visible (bad for a paid app).</li><li>A $0 cap: CI stops producing IPAs once the free minutes run out each month.</li></ul> |
| D-2 Imagery codec | End of M0b | <ul><li>**Default: z7 HEIC.** About 20–36 MB of IPA; CPU decoding while panning; tile cache 16 MB (XR) or 24 MB (Pro Max).</li><li>ASTC: about 66 MB of IPA, no decoding, cache about 1 MB (lightest at runtime, heaviest download).</li><li>z6 only: about 8–12 MB, but soft imagery beyond about 2.5 km/pt.</li><li>z8: +50–90 MB for sharper close zoom.</li></ul> |
| D-2b Label rendering | End of M0b | <ul><li>**Default: glyph distance-field atlas.** 1 MB, no re-rasterising while panning, clean Arabic joins.</li><li>String atlas of visible labels: sharpest small text, but CPU work while panning and more memory. Chosen only if the default looks soft on the device.</li></ul> |
| D-3 Blur | End of M0b | <ul><li>**Default: approved blur at rest; opaque while panning only if the measured rule trips** (thermal state +1, battery drain +10%, or hitches >1%). Look identical at rest.</li><li>Blur always: possible extra heat while panning.</li><li>Opaque always: lightest, but departs from the approved design.</li><li>Metal-rendered blur under the HUD only: measurable and controllable; about 1–2 weeks of renderer work, with a slightly different look to approve.</li></ul> |
| D-4 Autosave | M1a | <ul><li>**Default: monthly, at most once per 2 real minutes.** Negligible CPU.</li><li>Strictly monthly: about 1 save per second at maximum speed, 10–20% extra CPU.</li><li>Every 5 minutes: lightest, but more progress can be lost.</li></ul> |
| D-5 Maximum zoom | End of M0b | <ul><li>**Default: 1.0 km/pt.**</li><li>2 km/pt: sharper imagery, but small areas such as Lebanon and the West Bank become hard to tap.</li><li>0.6 km/pt: needs z8 imagery (+50–90 MB).</li></ul> |
| D-6 Money display | M1a | <ul><li>**Default: nominal current USD**, now backed by the nominal ledger, so devaluations and inflation show as in the news. «لماذا؟» also shows constant 2011 USD.</li><li>Constant 2011 USD: easier to compare across decades, but values drift from real headlines.</li></ul> |
| D-7 Month names | M1c | <ul><li>**Default: يناير… with a setting.** One extra string set.</li><li>Levantine names only.</li><li>Both side by side: needs more width in the HUD.</li></ul> |
| D-15 Unit movement | M4 | <ul><li>**Default: discrete jumps.** 0 extra frames.</li><li>Tween: a few extra frames on arrival days at ×2 or slower.</li></ul> |
| D-16 Maximum speed | M1a | <ul><li>**Default: 30 days/s.** 2011 → 2100 in 18 min, 6% CPU.</li><li>20 days/s: 27 min, cooler.</li><li>60 days/s: 9 min, about 12% CPU and more heat.</li></ul> |
| D-21 Test devices | M0b | <ul><li>**Default: borrow an iPhone XR (A12, 3 GB)** for M0b, M4 and M8, and an SE (2nd or 3rd generation) for one layout check. A few hours each time.</li><li>Pro Max and counters only: no effort, but older-phone problems found late.</li></ul> |
| D-23 Imagery for historical packs | Before the 1990 pack | <ul><li>**Default: reuse the 2004 mosaic.** No cost; coastlines and the Aral Sea show their 2004 state.</li><li>Per-era imagery: no comparable licensable mosaic found; large work.</li></ul> |
| D-26 Imagery source variant | M0b | <ul><li>**Default: Blue Marble NG with NASA's topography and bathymetry.** Relief and depth already baked in; removes GMTED and ETOPO from the imagery bake and the pending ETOPO licence; the user re-approves the look on the device. No extra cost.</li><li>Own relief and depth bake (as in final-1.0): finer control of the look; tens of GB of processing and the ETOPO licence check.</li></ul> |
| D-28 Save safety | M1c | <ul><li>**Default: saves in Documents (visible in Files) plus a one-time prompt to pick a mirror folder** (for example iCloud Drive). Survives deleting the app; about 1 week of work.</li><li>Documents only: still lost if the app is deleted, but the user can copy files by hand.</li><li>Hidden Application Support (as in final-1.0): saves are invisible and lost with the app. Not recommended for sideloading.</li></ul> |

### 13.2 Game design and sensitive content

| ID | Needed before | Choice and cost |
|---|---|---|
| D-8 Disputed and de facto entities in 2011 | M1a | <ul><li>**Default per §4.5:** <ul><li>Palestinian Authority government playable in the West Bank provinces with Israeli control shares.</li><li>**Gaza administered by a Hamas-led de facto government** inside the same polity (unrecognised).</li><li>East Jerusalem and the Golan "annexation not recognised".</li><li>Limited-recognition polities labelled «اعتراف محدود» (limited recognition).</li><li>Western Sahara split at the berm.</li><li>Côte d'Ivoire with two governments.</li></ul> Cost: one review of names and labels.</li><li>Unrecognised entities as factions only: simpler, not playable.</li><li>Hide them: unrealistic.</li></ul> |
| D-9 Player and elections | M3 | <ul><li>**Default: keeps the state.**</li><li>Losing ends the campaign: needs an extra end screen.</li><li>Play on in opposition: +3–4 weeks.</li></ul> |
| D-10 Party data | M3 | <ul><li>**Default: tier A about 40 by province, tier B about 80 modelled** (≤12 parties each). About 8–10 weeks of data work, plus about 20% for evidence verification.</li><li>All 120 compiled by province: +10–14 weeks.</li><li>National results only: −6 weeks; province support maps become generic.</li></ul> |
| D-11 Releasable candidates | M1a | <ul><li>**Default: about 10, by event or negotiation.** Insurgent states can also form at runtime (`dyn:` IDs).</li><li>None (runtime states only).</li><li>About 40: politically sensitive.</li></ul> |
| D-12 Name of the "god" preset | M1c | <ul><li>**Default: «صلاحيات مطلقة».**</li><li>«الوضع الخارق».</li><li>The literal «الإله»: not recommended.</li></ul> |
| D-13 Agency names | M5 | <ul><li>**Default: generic.**</li><li>Real names: needs trademark and sensitivity review.</li></ul> |
| D-14 Historical targeted killings | M3 | <ul><li>**Default: neutral news only.**</li><li>Omit entirely.</li></ul> |
| D-17 Logo font | M8 | <ul><li>**Default: an OFL Arabic font** from 3 samples.</li><li>Commissioned lettering: paid.</li></ul> |
| D-18 Historical-events mode | M3 | <ul><li>**Default: flexible.**</li><li>Strict: plays more like a replay.</li><li>Off: pure sandbox; trajectory gates do not apply.</li></ul> |
| D-19 Fog of war | M5 | <ul><li>**Default: estimates**, stable between intelligence refreshes.</li><li>Full-information toggle: easier, intelligence less useful.</li></ul> |
| D-20 Climate impacts | M6 | <ul><li>**Default: on, with a toggle.**</li><li>Always on.</li><li>Off: less realistic toward 2100.</li></ul> |
| D-22 Event volume | M3 | <ul><li>**Default: 80 / 50 / 40.**</li><li>150 historical to 2016: +6–8 weeks.</li><li>50 / 40 / 30 if the cut list applies (D-25).</li></ul> |
| D-24 After 2100 | M6 | <ul><li>**Default: the campaign ends.**</li><li>Continue without data support.</li></ul> |
| D-27 Equipment stock rule | M4 (seed data starts in M2) | <ul><li>**Default: your 20-year spending rule, plus the older inventories that existed in 1991 and arms received from abroad**, kept as a running stock with losses and captures. About +2 weeks of data work. Fixes understated starting forces for Ukraine, Syria, North Korea and Egypt.</li><li>Spending only, as originally stated: simpler, but those countries start with a fraction of their real forces.</li></ul> |
| D-29 Rival governments | M1c | <ul><li>**Default: any government that administers at least one province on the start date is playable**, chosen from a small chooser. The UN-seat holder is selected by default (for example Ouattara or Gbagbo in Côte d'Ivoire). About 1 week of UI work plus one screen design.</li><li>Only UN-seat holders playable: no chooser.</li><li>Also governments in exile at the start: needs exile gameplay at the start (for 1990 packs).</li></ul> |
| D-30 Leaders' traits | M3 | <ul><li>**Default: no personality traits are written or shown for real people.** AI behaviour comes from regime, bloc and data. Generated future leaders may have traits marked «شخصية مولّدة» (generated character). Neutral, and lower legal and App Store risk.</li><li>Traits for real leaders with a disclaimer: more flavour, but invented judgements of real people. Not recommended.</li></ul> |
| D-31 Small-phone top row | M1c | <ul><li>**Default: the ordered fallbacks** (short name → no regime line → no trends → 10 pt values → flag-only nation card → short date) on phones where the approved row does not fit. Needs one design approval for the SE and mini variants.</li><li>Hide one indicator on small phones instead: keeps the approved card, loses a value from view.</li><li>Use the same layout everywhere: text clips on several iPhones.</li></ul> |
| D-25 Schedule and cut policy | M0 | <ul><li>**Default: a planning range of 95–125 weeks**, re-estimated from measured velocity after M0b and M1a. When slipping, cut content in the §9 order. Anything touching your decisions (markets, parties, full espionage, scenarios, satellite map) comes back to you. No hidden cost; honest dates.</li><li>A fixed date (for example 70 weeks) with feature cuts: earlier release, but your v1 decisions would have to shrink.</li><li>An earlier "v0.5" with economy, politics and the map only, then the rest: something to play sooner; same total time.</li></ul> |

### 13.3 Approvals and inputs the user must provide

- **Screen designs to approve before their milestone (P1):**
  - M1c: province panel, state, saves and settings, notifications, the «لماذا؟» sheet, the **government chooser**, the **small-phone top-row variants**, the **mirror prompt**
  - M2: economy budget, markets, internal and unrest
  - M3: politics and parties, event and decision modal
  - M4: military fronts **with the sector-arrow interaction**, forces and production, war and peace, nuclear end screen
  - M5: diplomacy, UN Security Council, intelligence
  - M6: research, 2100 end screen
  - M8: onboarding, credits and sources
  - Also, before the screens that use them: the speed and map-mode popovers and the pending-orders list
- **The map look on the device (M0b).** The user approves the topography-and-bathymetry imagery, blur behaviour, labels and zoom on the iPhone, and runs the 10-minute auto-pan benchmark twice (blur on and off) when asked.
- **Diagnostics.** At each milestone the user shares the recorder CSV and log exports from the app's share sheet into the PR.
- **Device loan.** An iPhone XR for M0b, M4 and M8 (D-21).
- **Images.** The menu background, the 2011 scenario card, 16 event-category images and the app icon, to the specs in §6.12, with the generator's commercial-use attestation in `content/art/registry.yaml`.
- **Names list.** One review of Arabic names of countries, governments and contested entities, including the grammatical gender field (D-8, R10).
- **CI budget.** Set the GitHub spending cap (D-1).
- **Before any sale.** A legal review of the licence allowlist, imagery credits, flags, disputed territories, the image registry and the credits screen. Every source still pending (OECD ICIO, SSP or OECD long-term bands, MODIS, Köppen, FAOSTAT, Wittgenstein, Barro-Lee, GDELT, Mass Mobilization, GRIP, Maddison, OCHA Yemen) must be resolved or replaced, or the release licence gate blocks the build.