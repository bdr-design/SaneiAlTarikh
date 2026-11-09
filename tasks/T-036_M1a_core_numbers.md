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
- `tools/checks/core_reference.py`: the reference model. The arithmetic a second time in exact integer arithmetic; it
  generates `Sources/SaneiCore/DMathTables.swift` (the two tables, correctly rounded from 60-digit decimals) and
  `Tests/SaneiCoreTests/CoreGolden.swift` (34 families of rows, each row with the clamps counted for it). Before it
  writes a row it checks it against an independent truth where one exists: exact fractions for the fixed-point
  arithmetic, 60-digit decimals for the tables and `scale`, Python's own calendar for every day of 1850–2200 and for
  the date steps, SplitMix64's published sequence. It fails when the Swift tests do not read a family.
- `Sources/SaneiCore`: `Saturation` (a per-game counter, bound to the task for a synchronous scope), `Q32`, `BP`,
  `LogQ`, `Amount` with `LCU`, `USDn`, `Money`, `DMath` (`exp2`, `log2`, `scale`, `isqrt`, `sqrt`, `logistic`),
  `DetRNG`, `GameDate`.
- Tests: every row reproduced exactly with its own clamp count; properties (signs, ties, identities, order, the 1e-6
  round trip, every day of the calendar); the counter's scopes inside tasks (a burst of 8 children, a detached task,
  an actor).
- `ci-linux`: the debug and the optimised build, both tested; a job that fails when the generated files differ from
  the reference or a bound does not hold; the hygiene scans cover `SaneiCore` (no floating point, no randomness other
  than `DetRNG`, no hash values).
- `docs/adr/0002-fixed-point-and-determinism.md`; a cost line in `docs/perf.md`.
- Out of scope, each with its place:
  - the structures: T-037;
  - sums that must close (the exact split), an exact n ÷ d of an amount, an amount times and over a count, the ratio
    of two amounts, a ratio that does not count a zero divisor, a logarithm times a number, a chance of n in d, a
    weighted choice, a shuffle, `Pop`: T-038;
  - telling currencies apart, a typed `LCU` ↔ `USDn` conversion, keeping `Money` out of postings, the redenomination
    trigger on aggregates: the ledger's card;
  - the registry of random streams, the packing of a fog-of-war key, the one burst helper with its CI ban on
    unstructured tasks, the test that every entry point binds a counter scope, `GameDate.civil` once per tick: the
    engine's card;
  - a bench counter and measured costs (they need the engine's loops).

## Acceptance criteria
1. `ci-linux` green: build with warnings as errors and all tests, debug and optimised; the reference job.
2. The Swift results equal the reference's on every row, and every row counts the clamps the reference counted for it.
3. Asserted in the reference against 60-digit decimals: `exp2` within 6e-8, relative, from the level 1 up (below 1
   the result's own last step); `scale` within 6e-8, relative, or one unit, at any size; `log2` within 2e-7, absolute;
   the round trip within 2e-7 from 1 up; `logistic` within 2e-8; whole powers of two exact both ways; `exp2` and `log2`
   never out of order. §2.3 asks for 1e-6.
4. No operation wraps or traps by design: a result outside its range is clamped and counted. The rows hold the ends
   of every range, and the errors review compared 86 million random cases with the reference without a difference.
   No shared mutable global.
5. `SaneiCore` imports nothing and has no floating point; CI scans for both.
6. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.

## Test and risks
The reference runs locally and in CI; the Swift code compiles and runs only in CI (a failed build costs a round).
Risks: an `@inlinable` body reaching a non-public name; a task-local binding outside a task; a tuple-array literal the
type checker finds slow. Each is fixed at its cause.

## Outcome
First version: 5494421 and 219e1b2 (`ci-linux` green). Six reviews (design and game, concurrency and determinism,
heaviness, API and words, errors, checker) then found, and this round fixed:
- **A fault in the random numbers (must).** The seed and the key were added before mixing, so (seed + 1, day - 1)
  rolled what (seed, day) rolls. Now each coordinate is mixed in on its own; rows with neighbouring seeds and a test of
  40 seeds on 40 days lock it.
- **A trap in the calendar.** `adding(months:)` overflowed for dates a save could hold (before year 0). The month now
  comes from a remainder that cannot overflow; rows and a test from the first and last day an Int32 holds.
- **The counter's rule was not enforced.** `SaturationCounter` is no longer `Sendable`; the binding is internal; a
  form that hands the count back (`counted`) serves the children of a burst. Tests inside tasks.
- **Words that said more than the code:** the bounds (`exp2` from 1 up; `scale` and `times(LogQ)` not exactly
  rounded, not reversible; `sqrt` rounds down), what clamps and what divides by zero, one `LCU` type for every
  currency, `Money` not postable by type alone.
- **The checker:** 16 holes closed. Every row now carries its own clamp count and is checked against an independent
  truth; 34 families against 24 (negation, BP arithmetic one operation each, date steps, month facts, chances,
  constant dollars); the four untested regions of `scale`; dropped carries and ties pinned; each family its own random
  stream; the reference fails when the tests skip a family.
- **Cost:** a division whose dividend fits in 64 bits is one hardware division; `==` is inlinable; CI builds and tests
  the optimised build; the perf line says what is estimated and what allocates.
- **Gates:** `SaneiCore` is scanned for floating point; the simulation's sources for the standard library's randomness
  and for hash values.

