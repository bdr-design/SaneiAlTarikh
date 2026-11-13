# ADR 0002: Fixed-point numbers and the determinism kit

Status: accepted, 2026-11-09 (T-036); revised the same day after the six reviews (the seed mixing, the counter's scope
rule, the qualified bounds); decision 9 added with T-038 (sums that must close and their helpers). Implements design doc
§2.3 and L5; decides what §2.3 leaves open.

## Context
The simulation must give the same result on every device and in every build: a save continued on another phone, a
replay in a bug report, Linux x86 against iOS arm64 (§8). Floating point does not promise that (libm differs in the
last bit between platforms), so the simulation uses integers only. §2.3 names the types; it does not fix the rounding,
how a clamp is counted, where the tables come from or how a random draw is mapped to a range.

## Decisions
1. **Types.** `Q32` is an Int64 with 32 binary places. `BP` is an Int32 in basis points. `LogQ` is a base-2 logarithm
   with 32 binary places, for levels that grow without bound (prices, exchange rates, the deflator). Money is a whole
   Int64 in one of three distinct types (`LCU`, `USDn`, `Money`), so the three kinds of unit cannot be mixed by
   accident. The compiler does not tell one currency's `LCU` from another's, nor a currency before and after a
   redenomination, and it does not stop `Money` (derived, constant dollars) from being posted: those are the ledger's
   job.
2. **Rounding: to the nearest value, ties away from zero.** Arithmetic runs on magnitudes and the sign is put back at
   the end, so -(a × b) = (-a) × b and a refund is exactly the opposite of a charge. A multiply is one 128-bit product
   and a shift. Dividing by the constant 10,000 is written as two 64-bit divisions, which an optimised build turns into
   multiplies and shifts. A true division is one hardware division when the dividend fits in 64 bits, and a 128-bit
   division otherwise. The square root is the exception to «nearest»: it rounds down, so it is never above the true
   root.
   - Rounding cannot make parts add up to a whole: six shares of 1/6 are 10,002 bp. Where a sum must close (a budget,
     seats, a population split), the exact split is used, never a share of each part (T-038).
3. **Overflow clamps and is counted, never wraps, never traps.** The count belongs to one game (§8: it must stay 0 in
   a game without cheats).
   - A scope binds a counter to the running task: `Saturation.counting(into:)`. Only the cold path of a clamp reads
     the binding, so the hot path carries one overflow check and no extra argument.
   - There is no shared mutable global (`threadSpread`). The counter is a class that is deliberately not `Sendable`,
     so the compiler refuses to let two tasks hold it; the task-local that holds it is internal.
   - Opening a scope allocates once (measured on Linux: 72 bytes, freed when it ends). So the simulation's loop opens
     one long scope around a whole run of ticks (`Saturation.countingAcrossAwaits`), which follows its task across
     awaits and allocates nothing while it lasts; a tick does not open a scope per phase (§8: 0 allocations a tick).
     The short synchronous scope (`counting(into:)`) is for single calls and tests.
   - Each child of a parallel burst must count its own clamps (`Saturation.counted`) and hand the count back in its
     result; the parent adds the counts in serial order. Per-child counters from a pool, so the counters add no
     allocation, are the engine's (its burst helper); the burst's child tasks still allocate in the Swift runtime
     (about 53 allocations for 8 children, measured on x86 Linux), a bounded line of their own in §3.2 (OWNER PROXY
     2026-11-13: at most the core count of children, each a stripe of the day's governments).
   - The silent cases: a clamp outside every scope is still a clamp, and nobody counts it. That is every test of plain
     values and all formatting, and also a detached task and an actor's method whose caller did not bind. The engine's
     entry points must each bind (the test that a tick's clamps are all counted comes with the engine).
   - Inside the short scope (`counting(into:)`), no task of any kind is started: an unstructured `Task { }` and a
     child added to a group made outside (`group.addTask`) both copy the scope, outlive it and would write the counter
     from another thread (a reviewer saw counts lost). Inside the long scope, the only tasks started are a parallel
     burst's children, each counting its own clamps (`counted` around its whole body), and only through the engine's
     one burst helper; a CI ban on `Task {`, `addTask` and `async let` elsewhere in the engine comes with it.
   - No scope is opened in the body of a task group (`withTaskGroup { … }`), where the parent merges its children:
     the runtimes before Swift 6, iOS 17's among them, stop the program there. A child opens its own.
   - Not counted, by decision: `exp2` of a logarithm below -33 is 0 (a level that small is 0 to a `Q32`).
   - Atomics are not used: the standard library's need iOS 18, and the app supports iOS 17.
4. **Division by zero is a counted clamp:** 0 ÷ 0 = 0; anything else is the end of the range on the dividend's side.
   `log2` of a non-positive level is the bottom of the range, `sqrt` of a negative number is 0; both counted.
5. **Tables are data, generated and checked.** `tools/checks/core_reference.py` computes 2^(i/1024) and
   log2(1 + i/1024) for i = 0…1024 from 60-digit decimal arithmetic, correctly rounded to 32 binary places, and writes
   them as a Swift file. `exp2` and `log2` interpolate linearly. The reference asserts these bounds against decimals
   (§2.3 asks for 1e-6):
   - `exp2`: within 6e-8 of the true value, relative, from the level 1 up. Below 1 a `Q32` has few bits: within 6e-8
     of the true level plus one step of 2^-32 (the level 1/20,500 is already 2e-6 off). A small level is better built
     as `LogQ` from two whole numbers.
   - `scale` (a whole amount times 2^y, the way a price index or an exchange rate is applied): within 6e-8 of the true
     product plus one unit, at any size of level. It is not exactly rounded, and scaling by y and then by -y does not return the
     amount exactly.
   - `log2`: within 2e-7, absolute, everywhere. A round trip `exp2(log2(x))`: within 2e-7, relative, from 1 up.
   - `logistic`: within 2e-8, absolute, and exactly symmetric.
   - `sqrt`: never above the true root; within one step below 1, and within 2^-30, relative, from 1 up.
   - Whole powers of two are exact both ways, and `exp2` and `log2` keep the order of their inputs.
6. **A reference model locks the arithmetic.** The same script holds the arithmetic a second time in exact integer
   arithmetic and writes rows (inputs, outputs, and the clamps counted for that row) that the Swift tests must
   reproduce exactly, row by row. Where an independent truth exists the script checks each row against it before
   writing: exact fractions for the fixed-point arithmetic, 60-digit decimals for the tables and `scale`, Python's own
   calendar for dates, SplitMix64's published sequence for the generator. CI regenerates both files and fails on a
   difference, and the script fails when the Swift tests do not read a family. These are the golden values of §8
   (`DetRNG` and `DMath`, with the fixed-point arithmetic, the calendar and the deflator they stand on); simulation
   outputs are never golden values.
   - The rows are Swift source that the test target compiles, so they sit with the tests
     (`Tests/SaneiCoreTests/CoreGolden.swift`), not under §2.1's `Tests/Golden/values/`; `Tests/Golden/` holds the
     saves and replays when they come.
7. **Random numbers.** SplitMix64. A generator is made from (the game's seed, a key, a stream, a serial): the key is
   the day or the intelligence epoch, the stream is the system's (one per system, §2.3), the serial the entity's. A draw therefore does not
   depend on the order systems or threads run in.
   - Each coordinate is mixed in on its own: `mix(mix(mix(seed + γ) + γ + key) + γ + (stream << 32 | serial))`, with
     SplitMix64's output function and increment. If the seed and the key were added first, the game with seed 2012
     would roll on each day what the game with seed 2011 rolls on the next.
   - No generator is saved between days. Format 1 keeps the game's seed in `WRLD.seed` (§7); the counters a key is made
     of come with their systems (the `RNG ` chunk, §7), never a generator's state.
   - A number below n is the high half of draw × n: one draw per value, no rejection loop (bias below n / 2^64).
   - `chance` has a grain of 1 bp. A chance that is not a whole number of basis points is `chance(_:in:)` (n in d) or
     `chance(_: Q32)` (T-038, decision 9).
   - `DetRNG` is not a `RandomNumberGenerator`: the standard library does not promise a stable mapping across Swift
     versions. CI bans the standard library's own randomness and `hashValue` in the simulation's sources.
8. **The calendar.** `GameDate` is an Int32 day count from 1970-01-01 in the proleptic Gregorian calendar, converted
   by integer arithmetic. The supported range is 1850-01-01 to 2200-12-31; adding days or months holds at its ends,
   counted. A day count from a save is not checked when it is made (`isSupported` answers). A weekday is 0 for Sunday
   to 6 for Saturday. Adding months keeps the day of the month where the month has it, so steps do not add up: a term
   counts its months from its start date.

9. **Sums that must close, and the helpers around them (T-038).**
   - A split (`ShareSplitter`) is the largest-remainder method (Hare's): each part is its exact share rounded toward
     zero, and the units left over go one each to the largest remainders; of two equal remainders, to the larger
     weight; of two equal weights, to the earlier part. So the parts add up to the whole exactly, each is within one
     unit of its exact share, a smaller weight never gets more than a larger one (of the halved weights, past 64 bits), and the
     result depends only on the inputs. A whole below 0 splits as its opposite, signs turned. A weight below 0 counts as 0, counted as a clamp.
     No weight above 0: the whole is split as if every weight were 1, and the split says so (it returns false), for
     the caller to decide. No parts: nothing, counted when the whole is not 0. Weights whose sum passes 64 bits are
     halved until it fits, counted once; each part is then within one unit of its share by the halved weights. Each weight is read once; the weights are a random-access collection, never a
     set or a dictionary. Elections that count by highest averages (d'Hondt, Sainte-Laguë) need their own allocator,
     with the elections.
   - An amount times n / d is exactly rounded at any size (a 128-bit product, one division); dividing by zero is a
     counted clamp. An amount times or over a whole count (the count is labelled, `times(count:)`, so a share cannot
     pass as one), the ratio of two amounts of one unit, and a share of a total follow the same rules.
   - A bounded ratio (`Q32(ratio:_:within:undefined:)`, `BP(ratio:_:within:undefined:)`, an amount's
     `ratio(to:within:)` and `share(of:within:)`) is for a ratio whose divisor can be 0 on an ordinary day: it is
     held inside the bounds and never counted, and the caller says what 0 / 0 is (0 unless given). `clamped(to:)`
     likewise never counts.
   - `LogQ(level:)` takes a level, `LogQ(exponent:)` a number that is already a logarithm (nothing computed), and
     `LogQ(ratio: n, d)` the logarithm of a ratio of two whole numbers, within 4e-7 at any size. A level raised to a
     power is `raised(to:)`, clamped and counted like a product; it is not a product of levels, so it has no operator.
   - `chance(n, in: d)` takes chances finer than a basis point on whole counts, `chance(_: Q32)` a probability a model
     works out; each makes one draw, always, and is never true for a chance of 0 or below. A yearly probability is
     not a daily one (the daily one is 1 − (1 − P)^(1/365)); the model that owns a hazard says which it stores.
     `pick` chooses an index in proportion to whole-number weights in one draw, always (also when nothing can be
     picked), and counts a weight below 0 as a split does. `shuffle` is Fisher–Yates on `below`, one draw per item but
     the last. All are our own mappings, locked by rows, and fair to within the bias of `below`.
   - People: `Pop` (an Int64, an `Amount`) per government, `Pop32` (an Int32) per province or cohort; narrowing
     clamps and counts, also in a split into `Pop32`.

## Consequences
- A change to any algorithm here changes saves and replays: it needs a new ADR, the reference and the vectors
  regenerated together, and a save migration if state depends on it.
- The engine opens one long counting scope around its run of ticks, and checks the count with the other invariants.
- `SaneiCore` stays free of Foundation and of floating point (CI scans it with the engine); the reference needs only
  Python's standard library.
- CI builds and tests both the debug and the optimised build: the app ships optimised, and an unchecked read or a
  different inlining shows only there. The optimised tests run on a build made for testing (`-enable-testing`); the
  plain optimised build is built, with warnings as errors, but not tested.
