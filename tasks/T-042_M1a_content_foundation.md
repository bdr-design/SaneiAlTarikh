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
