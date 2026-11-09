# ADR 0002: Fixed-point numbers and the determinism kit

Status: accepted, 2026-11-09 (T-036). Implements design doc §2.3 and L5; decides what §2.3 leaves open.

## Context
The simulation must give the same result on every device and in every build: a save continued on another phone, a
replay in a bug report, Linux x86 against iOS arm64 (§8). Floating point does not promise that (libm differs in the
last bit between platforms), so the simulation uses integers only. §2.3 names the types; it does not fix the rounding,
how a clamp is counted, where the tables come from or how a random draw is mapped to a range.

## Decisions
1. **Types.** `Q32` is an Int64 with 32 binary places. `BP` is an Int32 in basis points. `LogQ` is a base-2 logarithm
   with 32 binary places, for levels that grow without bound (prices, exchange rates, the deflator). Money is a whole
   Int64 in one of three distinct types (`LCU`, `USDn`, `Money`), so units cannot be mixed by accident.
2. **Rounding: to the nearest value, ties away from zero.** Arithmetic runs on magnitudes and the sign is put back at
   the end, so -(a × b) = (-a) × b and a refund is exactly the opposite of a charge. A multiply is one 128-bit product
   and a shift; dividing by the constant 10,000 is two multiply-and-shift steps. Only a true division divides.
3. **Overflow clamps and is counted, never wraps, never traps.** The count belongs to one game (§8: it must stay 0 in
   a game without cheats). It is reached through a task-local (`Saturation.counter`), read only on the cold path of a
   clamp, so the hot path carries one overflow check and no extra argument. There is no shared mutable global
   (`threadSpread`): a parallel burst binds a counter per child task and adds them in serial order. Outside a game
   (tests, formatting) nothing is bound and a clamp is silent. Atomics are not used: the standard library's need
   iOS 18, and the app supports iOS 17.
4. **Division by zero is a counted clamp:** 0 ÷ 0 = 0; anything else is the end of the range on the dividend's side.
   `log2` of a non-positive level is the bottom of the range, `sqrt` of a negative number is 0; both counted.
5. **Tables are data, generated and checked.** `tools/checks/core_reference.py` computes 2^(i/1024) and
   log2(1 + i/1024) for i = 0…1024 from 60-digit decimal arithmetic, correctly rounded to 32 binary places, and writes
   them as a Swift file. `exp2` and `log2` interpolate linearly. Measured against decimals: `exp2` within 6e-8
   (relative), `log2` within 2e-7 (absolute), a round trip within 2e-7; §2.3 asks for 1e-6. Whole powers of two are
   exact both ways, and both functions keep the order of their inputs. `logistic` is exactly symmetric.
6. **A reference model locks the arithmetic.** The same script holds every algorithm a second time in exact integer
   arithmetic and writes vectors (inputs, outputs, saturations counted) that the Swift tests must reproduce exactly. CI
   regenerates both files and fails on a difference. These are the golden values of §8 (`DetRNG` and `DMath`, with the
   fixed-point arithmetic they stand on); simulation outputs are never golden values.
7. **Random numbers.** SplitMix64. A generator is made from (the game's seed, a key, a stream, a serial): the key is
   the day or the intelligence epoch, the stream is the system's, the serial the entity's. A draw therefore does not
   depend on the order systems or threads run in, and no generator state is saved. A number below n is the high half
   of draw × n: one draw per value, no rejection loop (bias below n / 2^64). `DetRNG` is not a
   `RandomNumberGenerator`: the standard library does not promise a stable mapping across Swift versions.
8. **The calendar.** `GameDate` is an Int32 day count from 1970-01-01 in the proleptic Gregorian calendar, converted
   by integer arithmetic. The supported range is 1850-01-01 to 2200-12-31; adding days or months holds at its ends,
   counted.

## Consequences
- A change to any algorithm here changes saves and replays: it needs a new ADR, the reference and the vectors
  regenerated together, and a save migration if state depends on it.
- The engine binds its world's counter around each tick, and checks it with the other invariants.
- `SaneiCore` stays free of Foundation and of floating point; the reference needs only Python's standard library.
