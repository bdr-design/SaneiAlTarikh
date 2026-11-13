# T-042: M1a, part 7: the content foundation (registries, stable IDs, the bake, `content.bin`)

## The need
The engine runs on rows it was handed by tests. Before a 2011 start can be built, the game needs the content side:
the registries that give every polity, actor, group and currency a stable ID that only grows (F4);
the baked file the phone maps instead of parsing anything (L2); and the bake that turns the checked-in CSV and JSON
into that file, refusing bad rows (the validator). Every later content task (the start state, the stub packs, the
2011 data) writes into these.

## Evidence
design_doc §2.1 (`content/registry/`: `province_registry.csv`, `polity_registry.csv`, `actor_registry.csv`,
`group_registry.csv`, `currency_registry.csv`, `aliases.json`), §2.2 (`SaneiContent`: Core only, the readers of
`content.bin` and `scenario-*.bin`, the validator, never JSON; `SaneiBake`: Core, Content, Foundation, the strict
JSON and CSV loaders, the baker, never linked into the app; `simcli`: `validate`, `bake`), L2 (nothing parsed on the
phone; JSON only in `SaneiBake`), L3 (polities ≤384, registry ≤320 plus 64 runtime), F4 (registries only grow;
removing an ID needs an alias with population weights; runtime IDs `dyn:<serial>`), §4.4 (the polity registry's
fields: tag, Arabic name with morphology fields and dated variants, flags by date, colour, capital by date, kind,
`exists` per scenario; actors `act.<polity>.<slug>`; the group registry; province IDs `p00001` plus a slug), §5.1
(the currency registry: national currencies, unions, dollarized users), §5.9 (every name record carries gender,
number, definiteness, a short form, and the ل and ب forms), §7 (`IDxx` lists per kind in the save, `aliases.json`,
`rulesHash` from `content.bin`), the M1a checklist («loader, validator, baker … polity, actor, group and currency
registries; runtime namespace; aliases; ID lock; tag lock»), CI's ID lock on `content/registry/**` (§2.8, §8).

## Scope
- **`SaneiContent`** (Core only):
  - `ContentFile`: `content.bin`, the rules and registries, in SaneiCore's `SaveTree` columns inside its own
    container (magic `SANEICNT`, a format version, the trailer SHA-256 that `read` hands back as META's `rulesHash`).
    Read from one buffer: the columns are read where they lie, each of the type and encoding the writer gives it, and
    the rows decoded out of them once at launch (every text copied into its row); a malformed file refused, never a
    trap. Decision: decoded once, not used in place from a memory map (today's registries are small; fixed-width
    columns with offset tables for the large static tables, and the memory map, are T-044's, measured against the
    launch budget).
  - `ContentDB`: the registries read from it, each table in registry order, its IDs kept apart with an order sorted
    by their bytes; finding a row by ID (`polityRow(id:)` and the like, a position) is a search by halving that
    allocates nothing and walks no dictionary.
  - `NameRecord`: the full name, and of the short form (the one shown everywhere, §3.10): gender, number, whether it
    names people (agreement: a plural of people agrees in the plural, any other plural as a feminine singular),
    whether it takes ال, its oblique form, and its forms after ل and ب.
  - `ContentID`: the ID rule; a polity's ID has no dot and at most 32 bytes (so `<polity>.gov` is well formed); an
    actor's is `act.<polity>.<slug>`; the runtime form `dyn:<serial>` never collides with a registry ID.
  - The validator (`problems()`): IDs unique and of their kind's shape, every reference resolved (an actor's
    polity), the caps (polities 320 and actors 1,984: L3's 384 and 2,048 less the 64 each keeps for runtime rows;
    groups 1,024 and currencies 320, T-042's), at least one polity and one currency, every name field whole (not
    empty, at most 256 bytes, no space at an end, no control, separator or direction mark), «human» only on plurals,
    ISO codes three capitals and unique, evidence IDs of the ID rule.
- **`SaneiBake`** (Foundation; linked only by `simcli` and the tests):
  - strict CSV reading, on the file's bytes: a header that must match the schema, quoted fields, UTF-8 without a BOM,
    lines ending in `\n` alone, every value parsed to its type, every text in Unicode's composed form (NFC);
  - a strict JSON reader (one parser): no repeated key, whole numbers only, no BOM;
  - every rule refused with its file, line and rule: a row's own (its file and line), the lock's (its line), an
    alias's (its line);
  - the baker: the registries into `content.bin`, read back and written again to the same bytes.
- **`simcli`**: `validate` and `bake` (the other commands come with their tasks); an unknown option, or one with no
  value, is refused.
- **The registries** in `content/registry/`, each with a schema in its header: polities, actors, groups,
  currencies; `aliases.json`. A registry holds what is true of a row in every scenario; what is a fact of one start
  is the scenario's (T-048): whether a polity exists, its governments (`<polity>.gov` by default; rival and exile
  governments such as `civ.ouattara` and `civ.gbagbo`, and which holds the UN seat, D-29) and their currencies, an
  actor's roles. Seeded with what M1a's cases name: Sudan and South Sudan, Côte d'Ivoire, Libya, Egypt, Iraq, the
  United States; their currencies (South Sudan's pound, SSP, from 18 July 2011, is the scenario's event, T-049); the
  NCP, the SPLM and SPLM-North, the NDP, the FPI, the RDR, the Forces Nouvelles, the NTC; four groups.
- **The ID lock** `content/registry/ids.lock`: every ID ever issued, per kind (the registries' four, and `government`
  for the scenarios' government IDs, T-048); a test fails when a registry ID is missing from it, and CI fails when a
  byte of it is removed or changed (`tools/checks/ids_lock.sh`, against the target branch and the commit before the
  push).
- **CI:** SaneiContent in the import allow list and the floating-point and randomness bans; no dictionary or set in
  SaneiContent; JSON only in SaneiBake, SaneiBake imported only by `simcli` and the tests and never linked by the app;
  the pinned toolchain's `simcli validate` and `bake` twice, in two processes, with the bytes compared; the test pins
  `content.bin`'s SHA-256; `content/**` in the path filters. Every stored number of `content.bin` is in `tags.lock`.
- Out of scope, each with its place (tasks/BACKLOG.md): the scenario's start state, `scenario-*.bin`, the save's
  `IDxx` lists, the lifecycle effects, existence per scenario, governments and their currencies, the actors' roles,
  and the evidence records and gate with `SOURCES.yaml` (T-048); the stub packs, the effect vocabulary's schema and
  the currency events (T-049); polity names and flags by date, capitals by date (with provinces), a group's sect or
  denomination (T-048 with the 2011 scenario; capitals with the provinces, M0b/M1b); the short names' width checked
  with the bundled font (§3.10, M1c's fit engine); the full 2011 registries (the data pipeline, M1b); the memory map
  and `content.bin`'s launch measure (T-044); the content bake on Apple's toolchain against the pinned hash (T-043's
  macOS CI build).

## Acceptance criteria
1. `ci-linux` green, debug and optimised, with the new targets; SaneiContent imports only SaneiCore, and nothing in
   the app's packages imports SaneiBake or Foundation's JSON outside it (the hygiene gate).
2. `simcli bake` makes the same `content.bin` twice, and `simcli validate` passes on the checked-in registries.
3. One malformed input per rule is refused, each by that rule alone, with its file, line and rule.
4. `ContentDB` reads back every row the baker wrote, to the same bytes (pinned); a damaged or forged `content.bin` is
   refused, never a trap.
5. Every registry ID is in `ids.lock`; a removed or changed lock byte fails CI.
6. Lookup by ID allocates nothing (measured: docs/perf.md) and SaneiContent holds no dictionary or set (the lint).
7. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes; nothing
   pushed before the reviews are clean (`reviewBeforePush`).

## Test and risks
- Risk: a registry schema chosen now is the one every later version must read. The columns go through the same
  rules as a save's (an added column keeps the format; a renamed one bumps it).
- Risk: Arabic text in CSV (quotes, commas, the BOM): the reader is strict and tested on each.
- Risk: facts without sources. Each seeded row carries an evidence ID (one per table today: the official names from
  UNTERM, the codes from ISO 4217; a short form is the game's display choice, §3.10); the evidence records and the
  gate are T-048's (§9 puts the evidence gate in M1a).

## Reviews and their verification (2026-11-13)
- **The first four reviews** (API and words, design, determinism, errors) on 7e4b004: 6 must, 37 should, fixed in
  f7a0330. The main ones: a forged `content.bin` could trap the reader, now every column is read with the writer's
  type and encoding; every problem is located with its file, line and rule; the registries hold only what is true in
  every scenario; and the names carry the short form's grammar.
- **Heaviness:** the perf row had been measured on names shorter than today's, and is measured again (616 KB at the
  caps, 13 to 14 ms, about 16,600 allocations, 1.8 MB kept). Texts are now decoded once, straight from the file. The
  bake refuses a file past §3.6's 6 MB, and the launch read's parts are budgeted in T-044. One nit was declined: the
  oblique form is kept explicit (about 90 KB at the caps).
- **The checkers (mutation):** 159 planted faults; 158 compiled, 79 caught, 11 equivalent, and 62 changed behaviour
  untested, plus 6 in simcli (2 of which the CI's bake step caught). Tests were added for every rule at its edge,
  simcli's options moved where tests reach them, CI checks simcli's exit codes, and the lock script has a self-test in
  CI. Planted again, together with faults in the fixes: 100 written, 99 planted (one pattern missed the code, then
  planted on its own and caught), 97 caught (4 of them by the fault's own trap), 2 equivalent (a search that returns
  before the changed line; a space allowed mid-name either way). The fix verification's own survivors in the content
  (the strings reader's end, the government ID's slug) are caught. The lock script: 8 planted, 6 caught, 2 equivalent (a
  check `cmp` already makes, a comparison over no bytes).
- **The fix verifications (FV6, FV7):** they found two problems in the fixes. The reader took files in another layout
  (one content, two hashes); it now takes only the writer's layout. The name rule let invisible characters through;
  it now refuses format and ignorable characters, unassigned and private-use code points, joiners at an end and a
  mark at the start. Alias lines are where each alias starts, and a government's ID in the lock names a registry's
  polity. They fuzzed 270,000 forged files (FV6, which found the layout) and 120,000 more (FV7): 0 traps, and in
  FV7 every file accepted was its content's own bytes.
- **The fix verifications (FV8 to FV11):** a name now takes only characters of Unicode 15.0 or older, the tables of the
  Swift runtime in iOS 17.0 and macOS 14.0 as they are taken to be (T-043 checks iOS 17.0's on its simulator), and the
  characters it refuses are written out as 15.0 has them (a test checks the list against the toolchain's tables), with
  the 66 noncharacters, which the tables give an age, and the two replacement characters (U+FFFC, U+FFFD: a character
  missing or broken), so the bake and every phone judge a name alike, but for a first character whose mark category a
  later Unicode changes (§3.10). The harakat skip the lookups (on x86-64 Linux at the caps, a fully vowelled name about
  6 times cheaper to check: 26 to 28 ms down to 4.3 to 4.9).
  - **What FV8 planted:** 62 faults in the content and the engine, the engine's 12 among them (56 caught, the engine's
    all; 1 equivalent; 5 survived), 13 in the
    lock script (9 caught, 2 equivalent, 2 survived) and 12 more on the next commit (9 caught, 1 equivalent, 2
    survived).
  - **The survivors** (a fathatan first, an ISO code twice where it sorts first, a dual of people, a payload length
    one short, a carriage return in aliases.json, the lock compared with the last push, an empty old lock) got tests
    and are caught; the two left are the Unicode version's minor and major bounds, equivalent on the pinned
    toolchain, which knows nothing past 15.0 (letters of 15.1 and 16.0 catch them on a newer one).
  - **Planted again on the fixes:** 18 faults, 16 caught and those 2 equivalent; and 9 in the lock script, all
    caught.

## Approval
Approved by Claude under the owner's delegation on 2026-11-13 (decisions.json `m1aContentFoundation`): the
content foundation: `SaneiContent` (the registries, `ContentDB`, `content.bin` in SaveTree columns with its own
container and SHA-256, the validator), `SaneiBake` (the strict CSV and JSON readers, the bake), `simcli validate` and
`bake`, the registries seeded with M1a's cases, `aliases.json`, the ID lock and its CI check with its own test. A
name takes characters of Unicode 15.0 or older: that iOS 17.0 carries Unicode 15.0 is taken, not measured, and is
checked on the iOS 17.0 simulator in T-043.
- **Reviews:** the six lenses and the verification rounds recorded above. The later rounds planted, and caught:
  - FV10: 30 faults in the Swift (26 caught; the noncharacters' sample, the message, and 2 equivalent) and 15 in the
    lock script (11 caught; the default target, a 1-byte lock, and 2 equivalent).
  - FV11: 24 in the Swift (16 caught; the noncharacters' neighbours, three message phrases, and 3 equivalent) and 20
    in the lock script (15 caught; «no lock yet», and 4 equivalent).
  - FV12: 10 in the Swift, all caught, and 18 in the lock script (15 caught; the target beside the last push, a 1-byte
    lock, and 1 equivalent).
  - FV13: 7 in the lock script (5 caught; a 1-byte lock, and 1 equivalent).
  - Each survivor that changes behaviour got its test and was planted again: caught, the last of them the 1-byte lock,
    but one (the noncharacters' mask widened), which the refused replacement characters made equivalent;
    FV13's 3 nits (a long code line, a lock-test line with no effect, a comment's place) are fixed in the same commit.
- **Pushes** (decisions_log): the commits up to 4211b32 on the owner's order «ارفع», when a words-only verification
  still ran (it reported clean), SaneiCore's checker and words verifications had not reported (they were run again
  after, and their fixes verified in FV6) and the skeleton (T-039) had no errors review; those up to 352a10e on his
  second «ارفع» while FV11 ran, 677d943 among them unverified (FV12 then verified it: no must); 068bdbc and c38208d
  once FV13 was clean.
- **Measured** (x86-64 Linux, not a phone; docs/perf.md): `content.bin` 616 KB at the caps, read and checked in 13 to
  14 ms; today's registries bake to 4,838 bytes, the same in debug and optimised builds on Linux, pinned (Apple's bake
  is checked against the pin in T-043).

Tests: 219, debug and optimised, warnings as errors; `ci-linux` green on c38208d (run 43435523810).
