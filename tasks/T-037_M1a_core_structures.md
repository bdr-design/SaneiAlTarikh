# T-037: M1a, part 2: SaneiCore's structures

## The need
The second half of M1a's Core line (§9): `Serial`, `TermSink`, the zigzag codec, `HandleTable` with serial order, with
the typed names (`Idx`, `Handle`) and the state hash they need. T-036 gave the numbers; these give the shapes every
table, save and «لماذا؟» value is made of.

## Evidence
design_doc §2.2 (SaneiCore's contents: stdlib only), §2.3 (`Serial`: UInt32 from a saved counter per kind, never
reused; `TermSink` with `SumSink` and a 12-slot `TermBuffer12`, at most 12 rows with the rest in «أخرى», the sum exact;
`GameDate` as zigzag varints), §2.4 (handle tables are capped, L3, and every row carries its serial), §7 (columns are
raw, varint-delta or zigzag; on load handle tables are rebuilt in serial order; a save is a promise), §8 (two runs give
equal hashes; Linux x86 equals macOS arm64; the `TermSink` equality test), R9. `reviewEveryFix`.

## Scope
- `Sources/SaneiCore`: `Identity.swift` (`Serial`, `SerialCounter`, `Idx<Tag>`, `Handle<Tag>`), `HandleTable.swift`,
  `TermSink.swift` (`TermID`, `TermValue`, `TermSink`, `SumSink`, `TermBuffer12`), `ColumnCodec.swift` (`ByteWriter`,
  `ByteReader`, `ColumnEncoding`, `ColumnCodec`), `StateHasher.swift`.
- `tools/checks/codec_reference.py`: the codec and the hash a second time; generates
  `Tests/SaneiCoreTests/CodecGolden.swift`. Before it writes, it checks itself against published LEB128 and protobuf
  bytes, Python's `struct`, a second decoder written another way, SplitMix64's published output, and the hash on every
  state of three small boxes. `ci-linux`'s reference job runs it.
- Tests: the vectors byte for byte; damaged bytes refused without a trap and without moving the reader; random bytes;
  a table saved in any order and loaded equals the running one; the cap; serials never given twice; many rows removed
  in one pass; the room kept across a snapshot; the sum equals the list for 0 to 30 terms; what a sheet keeps.
- A cost line in `docs/perf.md`, measured.
- Out of scope, each with its place:
  - the self-describing table and chunks of a save, `SaveTree`, migrations: the engine's `SaveCodec`. It will need
    from Core: a byte-string and a text column, `ByteReader.skip` and a checked slice (so a column is held to its own
    length), a byte length per column (to skip an unknown one), columns of the wrapper types without a copy, the table
    header and type-tag numbers, and caps for the tables L3 does not list (group rows, industries, party support, the
    pair extension). A back-patched length must be a fixed `UInt32`: a padded varint is refused. A loader checks every
    stored handle with `SerialCounter.hasGiven` and every stored index with `Idx(_:in:)`, and caps the raw length
    before it inflates;
  - the campaign log's stored form (the kept rows, the unit and, for local currency, its scale), and §2.4's sizes for
    it: with the campaign log;
  - reading memory-mapped baked content without a copy (a reader over a raw buffer): with the content loader;
  - `BitSet`, `DenseMatrix`, `Interner`, tables addressed by two indices (industries: 25 types × 3,000 provinces is
    more rows than an `Idx` holds): when a system needs them; column tables per kind in `WorldState`;
  - the registry of `TermID`s in `tags.lock` (0 and 65,535 reserved) and R9's lint: with the first value function;
  - where the «أخرى» row sits on the sheet, and its words when the left-out terms cancel: with the sheet's screen;
  - a remembered position for repeated lookups, the 1.2× cross-module bench, the work counters: the engine's bench;
  - `GameHost`'s stand-in hash (M0) still uses the old step; the engine skeleton replaces it with `StateHasher`;
  - §8's words «freed slots»: this table has no slots to free; reworded by T-041 («rows dissolved and reused»).

## Decisions the design did not make
1. **A sink is typed by the value it explains.** §2.3's sketch gave `TermSink.add(_ id: TermID, _ v: Q32)`. A `Q32`
   holds at most 2,147,483,647 whole units, and money is in units of $1,000: the United States' 2011 federal revenue
   (about $2.3 trillion) would clamp, and count, in a game without cheats (T-036's design review, TG4). So:
   `SumSink<Q32>` for a number, `SumSink<USDn>` or `<LCU>` or `<Money>` for money, through the `TermValue` protocol.
   Terms of different units cannot be added into one sheet. `BP` values are explained as `Q32` (`Q32(bp)`).
2. **What a sheet keeps** (the owner's proxy, 2026-11-09, logged; the approved screen 17 and T-017 said it already):
   at most 12 rows; a term of exactly 0 takes no row; with more than 12 terms, 11 rows and one «أخرى»; the kept ones
   are the starting level (`base`, always first) and the largest by size, the lower `TermID` among equals, so what is
   shown does not depend on the order the terms were added in. «أخرى» stays a row when its terms cancel to 0. The list
   sink counts exactly the clamps the summing sink counts: «أخرى» clamps by itself, uncounted.
3. **A handle is typed by its table's row.** `HandleTable<Formation>` gives and takes `Handle<Formation>` only; a bare
   `Serial` is for the save. 0 is «no thing» (`absent`), named so and never given out. `SerialCounter` is the one rule
   for every kind that needs serials, dense kinds included.
4. **The state hash mixes each value through SplitMix64's output function.** A multiply per value (the FNV-1a step on
   a whole word) let a bit move only upward: two changes of a top bit cancelled, and a swap of -1 and 1 was not seen
   (four reviewers reproduced it). The hash runs in tests, debug builds and replays only.
5. **A table is saved and loaded as columns** (`serials`, `rows`, the counter): in rising order they are taken as they
   are; any other order is put right; an inconsistent save is refused.
6. **A column read takes the caller's limit** (its table's cap): the bytes alone do not bound the memory, because a
   varint can be one byte and its value eight.
7. **Everything generic is `@inlinable` on `@frozen` types** (§2.2): measured from another module, the unspecialised
   calls were up to 110 times slower.

## Acceptance criteria
1. `ci-linux` green: build with warnings as errors and all tests, debug and optimised; both reference checks.
2. The codec writes exactly the reference's bytes for every vector and reads them back; a varint has one byte string
   per value (a longer form is refused at every length up to ten bytes).
3. No read traps. A truncated column, a count above the caller's limit or above what the bytes could hold, a value
   that does not fit the column's type and a varint in a longer form all return nil and leave the reader where it was;
   random bytes either do that or read as a column that writes back to the same bytes. A read reserves its array only
   after the count has passed both checks.
4. `HandleTable`: rows always in serial order; an insert at the cap is refused and takes no serial; a removed handle
   is never found and its serial never given again, also after a save and a load; a table rebuilt from its saved
   columns in any order, with the counter, equals the original; an inconsistent save is refused; the room for the cap
   is kept across a snapshot.
5. For any number of terms the list sink's total equals the summing sink's and counts the same clamps; a sheet never
   has more than 12 rows; while nothing clamps, its rows add up to the total exactly.
6. The state hash is the same for the same numbers at any integer width, alone or in a column; it depends on order and
   on column lengths; and it tells apart every state of the reference's three boxes and the pairs the first version
   confused.
7. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.

## Test and risks
The references run locally and in CI. Swift now also builds and tests locally, in the CI's image (docker), in both
builds. Risks: unsafe byte access to the tuples of `TermBuffer12` (every slot index is kept below 12 by the type's own
state, which nothing outside can set; a saved sheet is checked before it is taken); a removal's cost in a full table
(one pass for many).

## Outcome
First version: 22200a3, 82e9507, ec3e2eb (`ci-linux` green). Six reviews (API and words, errors, design and saves,
concurrency and safety, checker, heaviness) then found, and this round fixed:
- **The state hash could not tell natural differences apart (must, four reviewers):** `[0, 0]` and `[Int64.min,
  Int64.min]`, `[-1, 1, 0]` and `[1, -1, 0]`, a flag at the top bit set on a pair and on its mirror. A new step; the
  reference asserts no collision on 40,401 + 6,561 + 22,500 states and on the pairs found.
- **Nothing generic was inlinable (must, measured by the heaviness reviewer in the CI's image):** a walk 21 ns a row
  against 1.7, the raw codec 385 and 468 ns a value against 9 and 13, a 7.3 MB save about 350 ms to encode. Now
  `@frozen` and `@inlinable` throughout; measured again after the fix (`docs/perf.md`).
- **Removing many rows was quadratic (must):** 2,000 removals moved 1.9 GB, 35 ms. `removeAll(where:)` does it in one
  pass (0.06 ms for 2,048 of 8,192).
- **A read past the tuples (should, three reviewers):** `TermBuffer12`'s fields were public and `term` trusted
  `count`. The state is no longer settable from outside; a saved sheet comes in through a checked initialiser.
- **A column could allocate eight times its bytes:** the caller's limit, in the signature.
- **The table:** handles typed by row; `absent`; `SerialCounter`; the room kept across a copy-on-write; a load that
  adopts ordered columns; `updateEach`; how to use it stated at the top of the file.
- **The sheet:** the rules of decision 2; the fields ordered for 144 bytes (it was 152 against a stated 144).
- **The checker:** nine surviving mutants closed (a read ending exactly at the end, long non-shortest varints, the
  column hash at other widths, «أخرى» at zero, index 0, `contains`, order, a negative offset, the number of «أخرى»);
  independent anchors in the reference; a `UInt32` column family; the counter saved, not rebuilt.
- **Words:** what `read` refuses, what the inits refuse, where a trap is a programmer's error, the estimates.

## Verification of the fixes (2026-11-13)
The earlier verification rounds of SaneiCore's checker and words lenses were cut off before they reported (found by
the review of the approval records), so both were run again on the whole of SaneiCore (Save/ apart):
- **Words and cost:** the code keeps every fix the rounds made; the counter's rule as the compiler keeps it (handing it
  to one task compiles); the burst's runtime task allocations a bounded line of their own in §3.2 (OWNER PROXY
  2026-11-13); perf rows as measured (x86 Linux, not a phone).
- **Checker:** 165 planted faults; 164 compiled and ran (one did not compile), 145 of them caught; of the 19 that
  survived, 8 change nothing (equivalent) and 11 change behaviour. Each of the 11 got its test (a whole number
  hashed as its 64-bit word, the division's wide-path ties, a bounded ratio in basis points never counted, a chance
  true exactly below its draw, a removal that takes nothing copies nothing, a splitter that doubles), and a saved
  sheet now refuses one term on two rows; re-planted, 9 of the 11 are caught and the other 2 are unreachable now that
  the sheet refuses the repeat.
- **Its verification (FV6, 2026-11-13):** every test caught its fault; the repeat check now also has a term two rows
  on, and the sheet asserts in debug builds that a term comes once.

## Approval
Approved by Claude under the owner's delegation on 2026-11-13 (decisions.json `m1aCoreStructures`): SaneiCore's
structures as built and reviewed above. The reviews: six lenses (design and game, concurrency and determinism,
heaviness, API and words, errors, the checker), then verification rounds; the checker and words verifications that were
cut off before they reported were run again on the whole of SaneiCore (2026-11-13), and the first of the branch's later
rounds (FV6) verified those fixes. The rounds after it (FV7 to FV13) checked later fix commits, not this task's code as
a whole.

- **Pushes** (decisions_log): this task's code went out with the commits up to 4211b32, on the owner's order «ارفع»,
  before its checker and words verifications had reported (they were run again after, and their fixes verified in
  FV6).

Tests: 219, debug and optimised, warnings as errors; `ci-linux` green on c38208d (run 43435523810).
