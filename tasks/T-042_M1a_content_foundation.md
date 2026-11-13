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
`exists` per scenario; actors `act.<polity>.<slug>`; the group registry; province IDs `p00001` plus a slug), §5.2
(the currency registry: national currencies, unions, dollarized users), §5.9 (every name record carries gender,
number, definiteness, a short form, and the ل and ب forms), §7 (`IDxx` lists per kind in the save, `aliases.json`,
`rulesHash` from `content.bin`), the M1a checklist («loader, validator, baker … polity, actor, group and currency
registries; runtime namespace; aliases; ID lock; tag lock»), CI's ID lock on `content/registry/**` (§2.8, §8).

## Scope
- **`SaneiContent`** (Core only):
  - `ContentFile`: `content.bin`, the rules and registries, in SaneiCore's `SaveTree` columns inside its own
    container (magic `SANEICNT`, a format version, the trailer SHA-256 that is META's `rulesHash`); read from one
    buffer, nothing copied; a malformed file refused.
  - `ContentDB`: the registries read from it, each a table in registry order with its string ID; lookup by ID by
    halving over a sorted index (no dictionary walk).
  - `NameRecord`: Arabic name, short form, gender, number, definiteness, the ل and ب forms.
  - Content IDs: `ContentID` per kind, and the runtime form `dyn:<serial>` that never collides with a registry ID.
- **`SaneiBake`** (Foundation; linked only by `simcli` and tests):
  - strict CSV reading: a header that must match the schema, quoted fields, UTF-8 only, no unknown or missing
    column, every value parsed to its type or the row refused with its file and line;
  - the validator: IDs unique and well formed, every reference resolved (a government's polity, a polity's currency,
    an actor's polity), the caps (L3), every name record whole, the ID lock;
  - the baker: the registries into `content.bin`, byte for byte the same on every run.
- **`simcli`**: `validate` and `bake` (the other commands come with their tasks).
- **The registries** in `content/registry/`, each with a schema in its header: polities, actors, groups,
  currencies; `aliases.json`. A polity's default government is `<polity>.gov` (§4.4: one per polity); rival and
  exile governments are each scenario's `governments.csv` (T-048). Seeded with the polities M1a's cases need
  (Sudan, Côte d'Ivoire, Libya, Egypt, Iraq, the United States) and their currencies; South Sudan's polity and
  currency as rows that exist from 2011-07-09 only. Each row's facts carry an evidence ID.
- **The ID lock** `content/registry/ids.lock`: every ID ever issued, per kind; a test fails when a registry ID is
  missing from it, and CI fails when a line of it is removed or changed (`tools/checks/ids_lock.sh`, compared with
  the target branch and with the commit before the push).
- **CI:** SaneiContent in the import allow list and the floating-point and randomness bans; JSON only in SaneiBake,
  SaneiBake imported only by `simcli` and the tests and never linked by the app; `simcli validate` and `bake` twice
  with the bytes compared; `content/**` in the path filters. Every stored number of `content.bin` is in `tags.lock`.
- Out of scope, each with its place (tasks/BACKLOG.md): the scenario's start state, `scenario-*.bin`, the save's
  `IDxx` lists and the lifecycle effects (T-048); the stub packs and the effect vocabulary's schema (T-049); the full
  2011 registries and the evidence records and gate (the data pipeline, M1b); provinces and the map's province order
  (M0b/M1b); a memory map of `content.bin` on the device (T-044).

## Acceptance criteria
1. `ci-linux` green, debug and optimised, with the new targets; SaneiContent imports only SaneiCore, and nothing in
   the app's packages imports SaneiBake or Foundation's JSON outside it (the hygiene gate).
2. `simcli bake` makes the same `content.bin` twice, and `simcli validate` passes on the checked-in registries.
3. One malformed input per validator rule is refused, each by that rule alone, with its file and line.
4. `ContentDB` reads back every row the baker wrote; a damaged `content.bin` is refused.
5. Every registry ID is in `ids.lock`; a removed or changed lock line fails CI.
6. Lookup by ID allocates nothing and walks no dictionary or set (measured, and the lint).
7. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes; nothing
   pushed before the reviews are clean (`reviewBeforePush`).

## Test and risks
- Risk: a registry schema chosen now is the one every later version must read. The columns go through the same
  rules as a save's (an added column keeps the format; a renamed one bumps it).
- Risk: Arabic text in CSV (quotes, commas, the BOM): the reader is strict and tested on each.
- Risk: facts without sources. Each seeded row's facts carry an evidence ID; the evidence records and the gate come
  with the data pipeline.
