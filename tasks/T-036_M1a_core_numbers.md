# T-036: M1a, part 1: SaneiCore's numbers and the determinism kit

## The need
M1a (§9) starts the engine. Its foundation checklist's first line is Core: `BP`, `Q32`, `LogQ`, `LCU`, `USDn`, `Money`,
`GameDate` (1850–2200), `Serial`, `DetRNG`, `DMath`, `TermSink`, the zigzag codec, `HandleTable`. Every later system
computes with these, so they come first and are locked before anything is built on them. This card takes the numbers:
the fixed-point types, the money units, the table maths, the random numbers and the calendar. The structures (`Serial`,
`Idx`, `Handle`, `HandleTable`, `TermSink`, the column codec, `StateHasher`) are the next card.

## Evidence
design_doc §2.2 (SaneiCore: stdlib only), §2.3 (the table of types; `DMath` from 1,024-entry tables with relative error
≤ 1e-6; `DetRNG` SplitMix64 with counter-based seeds; overflow saturates and a counter stays at 0), §8 (the saturation
counter is an invariant after every tick; golden values for `DetRNG` and `DMath`), L5 (integers only), critic rows 4 and
16; research finding «Determinism: RNG» (the standard library's range mapping is not promised stable). The owner's
rules `threadSpread` (no shared mutable global) and `reviewEveryFix`. No Swift toolchain in the work environment: the
compiler and the tests run in `ci-linux`.

## Scope
- `tools/checks/core_reference.py`: the reference model. Every algorithm a second time in exact integer arithmetic; it
  generates `Sources/SaneiCore/DMathTables.swift` (the two tables, correctly rounded from 60-digit decimals) and
  `Tests/SaneiCoreTests/CoreGolden.swift` (the vectors and the saturations each family counts), measures the accuracy
  against decimals, checks the calendar against every day of 1850–2200 and SplitMix64 against its published sequence.
- `Sources/SaneiCore`: `Saturation` (a per-game counter, bound to the task), `Q32`, `BP`, `LogQ`, `Amount` with `LCU`,
  `USDn`, `Money`, `DMath` (`exp2`, `log2`, `scale`, `isqrt`, `sqrt`, `logistic`), `DetRNG`, `GameDate`.
- Tests: every vector reproduced exactly with the same saturation count; properties (signs, ties, identities, order,
  the 1e-6 round trip, every day of the calendar).
- `ci-linux`: a job that fails when the generated files differ from the reference or a bound does not hold.
- `docs/adr/0002-fixed-point-and-determinism.md`; a cost line in `docs/perf.md`.
- Out of scope: the structures (next card); `Pop`; the ledger and redenomination (the engine); a bench counter (it
  needs the engine's loops).

## Acceptance criteria
1. `ci-linux` green: build with warnings as errors, all tests, the reference job.
2. The Swift results equal the reference's on every vector, and each family counts the saturations the reference
   counted.
3. Measured in the reference against 60-digit decimals: `exp2` relative error ≤ 1e-6 (from 1 up; below 1 the result's
   own last bit), `log2` absolute error ≤ 1e-6, the round trip ≤ 1e-6; whole powers of two exact both ways; `exp2` and
   `log2` never out of order.
4. Nothing wraps and nothing traps on any Int64 input: a result outside its range is clamped and counted; no shared
   mutable global.
5. `SaneiCore` imports nothing; no floating point in it.
6. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.

## Test and risks
The reference runs locally and in CI; the Swift code compiles and runs only in CI (a failed build costs a round).
Risks: an `@inlinable` body reaching a non-public name; a task-local binding outside a task; a tuple-array literal the
type checker finds slow. Each is fixed at its cause.
