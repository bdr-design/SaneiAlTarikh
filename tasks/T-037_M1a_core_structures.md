# T-037: M1a, part 2: SaneiCore's structures

## The need
The second half of M1a's Core line (§9): `Serial`, `TermSink`, the zigzag codec, `HandleTable` with serial order, with
the typed names (`Idx`, `Handle`) and the state hash they need. T-036 gave the numbers; these give the shapes every
table, save and «لماذا؟» value is made of.

## Evidence
design_doc §2.2 (SaneiCore's contents: stdlib only), §2.3 (`Serial`: UInt32 from a saved counter per kind, never
reused; `TermSink` with `SumSink` and a 12-slot `TermBuffer12`, a 13th term folds into «أخرى», the sum stays exact;
`GameDate` as zigzag varints), §2.4 (handle tables are capped, L3, and every row carries its serial), §7 (columns are
raw, varint-delta or zigzag; on load handle tables are rebuilt in serial order; a save is a promise), §8 (two runs give
equal hashes; Linux x86 equals macOS arm64; the `TermSink` equality test), R9. `reviewEveryFix`.

## Scope
- `Sources/SaneiCore`: `Identity.swift` (`Serial`, `Idx<Tag>`, `Handle<Tag>`), `HandleTable.swift`, `TermSink.swift`
  (`TermID`, `TermSink`, `SumSink`, `TermBuffer12`), `ColumnCodec.swift` (`ByteWriter`, `ByteReader`,
  `ColumnEncoding`, `ColumnCodec`), `StateHasher.swift`.
- `tools/checks/codec_reference.py`: the codec and the hash a second time; generates
  `Tests/SaneiCoreTests/CodecGolden.swift`. `ci-linux`'s reference job runs it.
- Tests: the vectors byte for byte; damaged bytes refused without a trap and without moving the reader; random bytes;
  a table saved in any order and loaded equals the running one; the cap; serials never reused; sum equals list for 0
  to 30 terms.
- A cost line in `docs/perf.md`.
- Out of scope: the self-describing table and chunks of a save, `SaveTree`, migrations (the engine's `SaveCodec`);
  `BitSet`, `DenseMatrix`, `Interner` (when a system needs them); column tables per kind in `WorldState`.

## A decision the design did not make
§2.3's sketch gives `TermSink.add(_ id: TermID, _ v: Q32)`. A `Q32` holds at most 2,147,483,647 whole units, and money
is in units of $1,000: the United States' 2011 federal revenue (about $2.3 trillion) would clamp, and count, in a game
without cheats (T-036's design review, TG4). So a sink is typed by the value it explains: `SumSink<Q32>` for a number,
`SumSink<USDn>` or `<LCU>` or `<Money>` for money, through the `TermValue` protocol. Terms of different units cannot be
added into one sheet. `BP` values are explained as `Q32` (`Q32(bp)`).

## Acceptance criteria
1. `ci-linux` green: build with warnings as errors, all tests, both reference checks.
2. The codec writes exactly the reference's bytes for every vector and reads them back; a varint has one byte string
   per value (a longer form is refused).
3. No read traps or allocates beyond the bytes it was given: truncated bytes, a count too large, a value that does not
   fit the column's type and random bytes all return nil and leave the reader where it was.
4. `HandleTable`: rows always in serial order; an insert at the cap is refused and takes no serial; a removed serial
   is never found or reused; a table rebuilt from its saved rows in any order, with the counter, equals the original;
   an inconsistent save is refused.
5. For any number of terms the list sink's total and its shown rows add up to the summing sink's total.
6. The state hash is the same for the same numbers at any integer width, and depends on order and column lengths.
7. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.

## Test and risks
As T-036: the reference runs locally and in CI; Swift compiles and runs only in CI. Risks: unsafe byte access to the
tuples of `TermBuffer12`; a removal's cost in a full table (a memmove of at most the cap's rows).
