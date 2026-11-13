# T-041: M1a, part 6: the save codec (SaveTree, META, the container frame, format 1)

## The need
A game is saved and loaded as a full snapshot, and «every released save loads in every later version» (§7): the bytes
are a promise. The engine's state must therefore go into self-describing columns that a later version can read
whatever columns it has added, renamed or dropped, with a default for every column a save lacks, and the file must
say what it is (META) and prove it is whole (the trailer). Nothing else in the save path can be built before this.

## Evidence
design_doc §7 (the file: header with magic `SANEISAV`, `containerVersion`, compression, flags, `metaLength`; META as
a small self-describing table in the column codec; the payload as chunks; the trailer SHA-256; self-describing tables
`{name, typeTag, encoding, data}`; unknown chunks and columns skipped; missing columns from `SaveDefaults`, with a test
that fails when an engine column has no default; persisted enums and commands by stable numeric tags; `SaveTree` as
typed column buffers with column-level migrations; each save a full snapshot; golden saves), §2.2 (`SaveCodec`,
`SaveTree` and migrations live in SaneiEngine, stdlib only (T-041 moved the container and the tree to SaneiCore, so
the platform reads META with the same reader; §2.2 updated); DEFLATE and storage in App/Platform), §2.4 (the
pending-command queue is part of the state), the M1a checklist («Saves: container, binary META, format 1, typed
`SaveTree` migrations, golden saves …»). T-039's out-of-scope list sent here: tagged codec fields with lengths so that
a reader can skip an unknown field, and whether a held copy keeps the cap's room (answered in T-039's fix round).

## Scope
- `Sources/SaneiCore/Save/` (so App/Platform reads META with the same reader, and Linux tests it; §2.2 updated):
  - `SaveTree`: chunks, each a four-letter tag and its columns; a column is its name, its type tag, its encoding, its
    count and its bytes (the column codec of T-037), a range of the file's one buffer when read (nothing copied); an
    unknown chunk or column is skipped (and reported), a malformed one refuses the whole tree.
  - `SaveFile`: the container (header, META, payload, trailer) and `SaveMeta` in plain values, with a default for
    every META column but the format; SHA-256 in stdlib Swift, checked against the published vectors.
- `Sources/SaneiEngine/Save/`:
  - `SaveDefaults`: the default of every column the engine writes (none for the required columns every save has); a
    missing column takes it; a test checks every stored property of the state is written.
  - The state's chunks: `WRLD` (the world row and the world account), `SERL` (the serial counters), `POLI`, `GOVT`,
    `PROV`, `CURR` (currencies and money bases), `LEDG` (per government row, a column per account by its stored name),
    `CMDQ` (the waiting commands, each in its tagged codec form with its length, so a reader can skip one it does not
    know); `WorldState` from a tree and back, with every value checked (rows within caps, serials given by their
    counters, references in range, the queue in order), so a bad file is refused, never trusted.
  - META: a self-describing table (format version, game version and build, scenario ID, map version, rules hash,
    scenario hash, game date, player government ID and display name, playtime, preset, difficulty, cheats used, seed),
    readable without the payload.
  - `SaveCodec`: the state in the container; the engine fills META's format, date and seed from the state, so a file
    it writes from a state between days always reads back (a player's government it never made is left out);
    compression is a byte (0 none, 1 raw DEFLATE), handed in by the platform (T-043); a compressor that fails, or
    whose bytes pass the 2 MB a read keeps, leaves the payload stored as it is; a state whose tree passes 12 MB
    writes nothing (nil), so the platform keeps the last save.
  - `tags.lock` at the root: every stored number, checked by a test both ways.
  - Migrations: `SaveMigrations[n → n+1]` as column-level steps (add, rename, drop a column; add a chunk); format 1
    has none; a test runs a made-up format-0 tree through a step.
- A golden save of format 1 in `Tests/SaneiEngineTests/Golden/`, made final on 2026-11-12 after the reviews (every
  counter and META field a value of its own) and never rewritten since: its SHA-256 is pinned in the test; a test
  loads it with nothing skipped or defaulted, checks values written in the test, and checks the current format writes
  it back column by column, META's included, each column's bytes equal (columns added since are listed). The format
  policy (what bumps the format) is in §7 and in `SaveCodec.swift`.
- Out of scope, each with its place (tasks/BACKLOG.md): raw DEFLATE (App/Platform with Apple's Compression, and the
  device fixture read on Linux: T-043); storage, atomic writes, autosave rotation, the mirror and export
  (App/Platform, T-043); the peak-load test on a 90-year save (T-045), the start, mid-war and 30-year golden saves
  (when the systems exist; the first is the start save, T-048); `.saneibug` and
  `simcli replay` (T-044, with the host); content ID lists `IDxx` and `remapIDs` (T-048; `aliases.json` came with T-042);
  `CMDJ`, the build-scoped command journal (T-044, with replays); moving `GameHost` onto this simulation, the host
  holding a day until the AI's results are in, the test that every entry point binds a counter scope, the
  Set/Dictionary lint, the ledger's invariants after every day, the load procedure, the host following the player onto
  a successor, and the append-only check of `tags.lock` (T-044); the rules-hash message (T-043); the migration
  operations `remapIDs` (T-048), `splitChunk` (T-047), `splitProvince` (map v2's alias migration, M1b) and
  `convertUnits` (the first unit to change, M2).

## Acceptance criteria
1. `ci-linux` green, debug and optimised; the reference checks.
2. A state saved and loaded is equal to the original (`==` and the hash), for worlds with dissolved rows, reused rows,
   successions, waiting commands of every kind, a redenomination and a failed close; and a loaded game continued gives
   the same hash as the game that never stopped.
3. An unknown chunk, an unknown column and an unknown command tag or issuer kind are skipped and reported; a missing
   column takes its default, except the required columns every save has (their absence refuses the file); every
   written column is in `SaveDefaults` and every stored property of the state is written (a test fails otherwise).
4. Every byte of a save is checked on load: a truncated, flipped or forged file (lengths, counts, rows past a cap,
   serials past a counter, references out of range, a queue out of order, a wrong SHA-256) is refused, never trusted,
   and never crashes (a fuzz test).
5. META is read without decoding the payload.
6. SHA-256 matches the published vectors; the golden save of format 1 loads, holds its written values, its SHA-256 is
   the pinned one, and the current format writes each of its columns to the same bytes (META's included); every
   stored number is in `tags.lock`.
7. Writing sizes its output once; reading copies no payload; both bounded by the caps (measured at the caps:
   docs/perf.md).
8. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes; nothing pushed
   before the reviews are clean (`reviewBeforePush`).

## Verification of the fixes (2026-11-13)
- **An API and words review** (0 must, 9 should, 11 nits), fixed: a newer format told from META before its tree is
  read; no file written for a state with a redenomination mark; `SaveFile.check`, `compression(of:)`, `mostFileBytes`
  and `headerBytes` for the platform; the format policy stated once, in `SaveCodec.swift` and §7, with format 1's
  bounds; the golden save migrated before it is compared.
- **Its verification (FV6):** the policy's words matched to the golden test (a golden save holds only columns the
  current version writes, each byte for byte; a drop's step is `dropColumn`); `compression(of:)`'s nil cases stated;
  tests on a compressed file, an unknown compression and the size bound at `mostFileBytes`. Still open, by choice:
  a compressor whose output is no shorter than the payload is stored as it gives it (the compressor's contract asks
  it to answer false then; the platform's comes with T-043), and the writer does not refuse repeated tags or column
  names, or a count past Int32.max (the engine never makes them; the reader refuses them).

## Approval
Approved by Claude under the owner's delegation on 2026-11-13 (decisions.json `m1aSaveCodec`): the save codec,
format 1: `SaveTree`, binary META, the container with its SHA-256, the state's chunks loaded with every rule checked,
defaults, migrations as column steps, `tags.lock`, the golden save pinned by its SHA-256; the bounds 12 MB raw, 2 MB
compressed (stored as it is past that), 64 KB META; for every state the engine makes, a write whose file a load would
refuse returns nothing, and the platform keeps the last good save (T-043). (The writer does not refuse repeated tags or
column names or a count past Int32.max, which the engine never makes; the reader refuses them.)
- **Reviews:** design, API and words, errors, heaviness, determinism and platform, the tests and planted faults, then
  verification rounds; an API and words review and its verification on 2026-11-13 (FV6), and the writer's bounds
  verified in FV7 and FV8.
- Pushes: the commits up to 4211b32 on the owner's order «ارفع» while a words-only verification still ran (it
reported clean); those up to 352a10e on his second «ارفع» while FV11 ran, 677d943 among them unverified (FV12 then
verified it: no must); the rest only once FV13 was clean (decisions_log).
- **Fuzzed:** in round 5 (6053e6d), over 3 million mutants of a busy save (about 520,000 structured, 2.6 million raw),
  0 crashes; the codec changed after that round, and later rounds fuzzed the ledger's states (60,000, FV7).
- **Measured** (x86-64 Linux, not a phone; docs/perf.md): a state at the caps (384 governments, 3,300 provinces, 576
  waiting commands) makes a 46 to 51 KB file; writing 0.7 to 1.0 ms, reading 1.1 to 1.5 ms. A load's peak, measured
  once by a reviewer on a forged file at the bounds in the optimised build at today's caps: 15.4 to 15.5 MiB beyond
  §7's footprint, within the 16 MB.

Tests: 219, debug and optimised, warnings as errors; `ci-linux` green on c38208d (run 43435523810).
