# T-038: M1a, part 3: exact shares and the helpers the systems need

## The need
T-036's reviews (design, API) found what the first systems will reach for and not find, and would then write by hand on
`.raw`, outside the clamps and the vectors:
- **Sums that must close.** Rounding to the nearest value cannot make parts add up to the whole: six shares of 1/6 in
  basis points are 10,002; four quarter-shares of 10 units are 12; 225 equal `Q32` shares of 300,000,000 sum to
  299,999,925. §8 asks «party support per province sums to ≤ 10,000 bp», §2.4 «the world account is exactly 0 after
  each monthly close», R4 «province sums equal country totals exactly».
- **An exact proportional share** of a large amount: amount × n ÷ d through the 128-bit quotient Core already has
  (`Q32(ratio: 1, 7).applied(to: 10^15)` is 99,784 units off; the `BP` path 4.3 × 10^10).
- **Counts and ratios of amounts:** amount × a whole count and ÷ a whole count (clamped, zero-safe); the ratio of two
  amounts of one unit as `BP` or `Q32`; a magnitude; `clamped(to:)`.
- **A ratio that may be undefined:** `Q32(ratio: D − S, S)` with S = 0 counts a saturation although the model clamps
  the result anyway (§5.1's ±8%): a bounded, uncounted ratio.
- **Levels:** a `LogQ` times a `Q32` exponent (an elasticity, a decay); a labelled bridge from an exponent to a `LogQ`
  (today `LogQ(_: Q32)` takes a logarithm, and passing an exponent compiles); `LogQ(ratio:)`.
- **Chances finer than 1 bp:** `chance(n, in: d)` (a once-in-50-years daily hazard is 1/18,250); a weighted choice and
  a shuffle built on `below`, each with vectors.
- **`Pop`** (§2.3: Int64 per government, Int32 per province or cohort).

## Evidence
T-036's review reports (findings TG3, TG7, TG8, TG9, TG10, TA-E in the session's findings file); design_doc §2.3, §2.4,
§5.1, §8, R4; ADR 0002 (rounding: nearest, ties away from zero; a change to an algorithm needs the reference and the
vectors).

## Scope
- `Sources/SaneiCore`: `Shares.swift` (a largest-remainder split of a whole amount by weights into a caller's buffer,
  with a total tie rule: the larger remainder first, then the lower index; exact n ÷ d of an amount), additions to
  `Money.swift`, `FixedPoint.swift`, `DetRNG.swift`, `Pop`.
- The reference model gains each algorithm and vectors; the tests assert them and the closing properties (the parts
  sum to the whole for any weights, including all-zero weights and a negative whole).
- ADR 0002 gains the split's rule.
- Out of scope: the ledger (its own card: accounts per currency, postings, typed LCU ↔ USDn conversion, the
  redenomination trigger on aggregates, which unit may be posted); the stream registry for `DetRNG` (the engine card).

## Acceptance criteria
1. `ci-linux` green (debug and optimised), with the reference checks.
2. For any weights and any whole, the split's parts sum to the whole exactly, each part is within one unit of its exact
   share, and the result does not depend on anything but the inputs (ties by index).
3. amount × n ÷ d equals the exactly rounded quotient for every vector, at any size that fits.
4. Nothing traps or wraps; a clamp is counted, except in the bounded ratio, which never counts.
5. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.

## Test and risks
As T-036. Risk: the split's cost on long inputs (a sort of remainders): it is for monthly work on tens to hundreds of
parts, not for per-province daily loops; the doc comment says so.

## What was built
- `Sources/SaneiCore/Shares.swift`: `ShareSplitter` (the rule in ADR 0002 decision 9), with forms for whole numbers,
  any `Amount` and `BP`, and a general form that reads a weight from and writes a part into any column.
- `FixedPoint.swift`: `FixedMath.mulDiv`; `Q32(ratio:_:within:)`, `BP(ratio:_:within:)`; `magnitude` and
  `clamped(to:)`; `LogQ(level:)` (it was `LogQ(_:)`), `LogQ(exponent:)`, `LogQ(ratio:)`, `exponent`, `LogQ * Q32`.
- `DMath.swift`: `log2(ratio:)` on one shared table step (`log2Bits`).
- `Money.swift`: an amount `times(count)`, `times(n, over: d)`, `divided(by:)`, `ratio(to:)` (and bounded),
  `share(of:)`, `magnitude`, `clamped(to:)`; `Pop` and `Pop32`.
- `DetRNG.swift`: `chance(_:in:)`, `pick`, `shuffle`.
- The reference: 12 families (mulDiv, amountTimesCount, amountDividedBy, q32RatioWithin, bpRatioWithin, logRatio,
  splits, splitsBP, rngChanceIn, rngPick, rngShuffle, popNarrowed), each checked against exact fractions, decimals
  or the split rule stated a second time, except the random draws, which are their own definitions.
- `Tests/SaneiCoreTests/SharesTests.swift`: every row with its clamp count; the split's properties on 3,000 random
  inputs; the hazard and choice frequencies.

