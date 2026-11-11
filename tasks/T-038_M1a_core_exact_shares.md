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
  (the old `LogQ(_: Q32)` took a level and worked out its logarithm, and passing an exponent compiled); `LogQ(ratio:)`.
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
- Out of scope, each with its place:
  - the ledger (accounts per currency, postings, typed LCU ↔ USDn conversion, the redenomination trigger on
    aggregates, which unit may be posted): the ledger's card;
  - the stream registry for `DetRNG`, and one `ShareSplitter` per worker in the burst helper's scratch: the engine's
    card;
  - a highest-averages seat allocator (d'Hondt, Sainte-Laguë; the 2011 elections of Turkey, Poland, Spain and Croatia
    use d'Hondt) with integer cross-multiplied comparisons and the same tie rule: the elections' card;
  - keeping party support closed by construction («أخرى» = 10,000 − the rest) and splitting only on a reseed, a remap
    or a transfer: the politics card;
  - whether each hazard's data is a yearly probability or a rate, and its daily form: the card of the system that
    owns it.

## Acceptance criteria
1. `ci-linux` green (debug and optimised), with the reference checks.
2. For any weights and any whole, the split's parts sum to the whole exactly, each part is within one unit of its exact
   share (of its share by the halved weights when their sum passes 64 bits), a smaller weight never gets more than a
   larger one, and the result does not depend on anything but the inputs (ties by weight, then by index).
3. amount × n ÷ d equals the exactly rounded quotient for every vector, at any size that fits.
4. Nothing traps or wraps; a clamp is counted, except in a bounded ratio and in `clamped(to:)`, which never count.
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

## Outcome
Six reviews (errors, checker, design and game, API and words, heaviness, concurrency) found no fault in the
arithmetic (the errors review: about 780,000 fuzzed cases against an independent model, debug and optimised
identical). This round fixed what they found:
- **The tie rule:** of two equal remainders the larger weight now wins, then the earlier part. Before, the earlier
  part won outright, so a party of 10 votes took a seat from a party of 30 (`split(5, by: [10, 30, 60])` was
  [1, 1, 3], now [0, 2, 3]). The reference states the rule a second time and checks that a smaller weight never gets
  more.
- **What the split tells its caller:** it returns false when no weight was above 0 (equal shares by the same rule).
  Each weight is read once, so a closure that changes cannot break the sum or trap; the weights are a random-access
  collection, so a set's order cannot change the result between runs; a longer list grows the room once; a product
  that fits in 64 bits takes one hardware division; a split into `Pop32` clamps and counts.
- **The chances:** `chance(n, in: d)` takes Int64 counts and is never true at 0 or below (a count that dips below 0
  is no chance, not a crash); `chance(_: Q32)` for a hazard a model works out; `pick` makes one draw always and counts
  a weight below 0, as the split does, and returns an index of its weights.
- **The ratios:** the caller says what 0 / 0 is; `share(of:within:)`; the doc of the bounded ratio now reads §5.1
  right (the ±8% limits the price change, not the gap).
- **Names a caller could misread:** `times(count:)` (an Int64 share used to pass as a count); `raised(to:)` for a
  power of a level (it was `*`, which read as scaling); a warning on `exponent`.
- **Words and numbers:** the copy of a splitter, the closures' calls, the output column, 0 weights, «about 2», the
  bias of `below`, the cost line measured.
- **The checker (the sixth review, 78 Swift and 36 Python mutants):** the split's truth now holds the halved weights
  to the one-unit rule too, with rows of unequal wide weights; the bounded ratio's overflow rows; the logarithm of a
  ratio checked at its ends and exact at powers of two; every draw family checked for the number of draws it makes,
  `pick` restated a second way, the chance rule's rows, a shuffle's six orders counted; each helper tested on both
  sides (a zero divisor, the far end, both bounds).

