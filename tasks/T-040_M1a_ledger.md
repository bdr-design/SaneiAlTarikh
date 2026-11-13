# T-040: M1a, part 5: the per-currency ledger and the world account

## The need
Every flow of money in the game goes through one place, in the unit of the account it lands in, so that money is
never made or lost by rounding and the sums the design promises hold: per account, the change in its balance equals
the sum of its postings in its own unit; the world account is exactly 0 after each monthly close (§2.4, §5.1, §8).
The economy (M2) will post thousands of flows; the ledger and its invariants come first.

## Evidence
design_doc §2.4 «Ledger (ADR-0019)», §2.3 (LCU in a per-currency scale, redenomination at 2^60 with a logged
posting; USDn; Money derived, never posted), §5.1 (settlement against the world account in USDn with FX postings to
reserves; revaluation postings; the transport payout; the world account 0 after the monthly close), §8 (ledger
conservation per account in its own unit), §5.11 (cheats post from a `cheat` source), the M1a checklist (ADR 0019).
T-036's out-of-scope list sent here: telling currencies apart, a typed LCU ↔ USDn conversion, keeping `Money` out of
postings, the redenomination trigger on aggregates, `USDn` never redenominating.

## Scope
- `Sources/SaneiEngine/Ledger.swift`: currencies (each with its scale 10^k, its exchange rate and price index as
  logarithms, and its money base, §5.1); each government's accounts (treasury and domestic debt in its currency, FX
  reserves in USDn); the world account in USDn; `post(account, category, amount)` in the account's own unit, with
  stable category numbers; an FX pair at the day's rate; transfers between two local accounts of one currency and
  between USDn accounts; refusals counted; the redenomination of a currency when one of its balances passes 2^60, at
  the day's end (every LCU amount of that currency rescaled by 10^3, the whole change posted); the monthly close; the
  invariants as a check that names what failed.
- The skeleton's thin taxes post through the ledger.
- `docs/adr/0003-currencies-and-the-ledger.md` (the design's ADR 0019, numbered in this repository's sequence).
- Tests: conservation over random postings; the world account 0 after closes with trade settled through it; an FX pair
  conserves value at the rate; a redenomination keeps every invariant; `Money` and the other units cannot be posted to
  the wrong account (by type).
- Out of scope, each with its place: the economy's flows (M2), debt by currency bucket and the revaluation of debt and
  reserves (M2, with debt), currency unions and pegs (M2), the money base's growth (M2), cheats (M8's settings; the
  category is reserved now). Named by the reviews and placed: the sums per posting category and their «لماذا؟» (M2,
  with the budget and the history); a redenomination's notification (the notification ring, M1c); inflation, pass-
  through and money-base growth taking a redenomination step out (M2); the trigger on aggregates (a budget's lines,
  nominal output, a union's money base: M2, with them); the day-1 closure checked in LCU and in USD and §8's `--t0`
  closure (T-048, with the start); the ledger's invariants after every day in debug and test builds (T-044, with
  the invariant checker the host runs); the daily ledger step, step 9 (M2); a typed LCU ↔ USDn conversion that does
  not post (trade prices and the display of D-6: M2, with the world market); an exchange set by its dollar side (M2,
  with trade settlement); the posting outboxes of the parallel monthly slots (M2, with the burst helper); how a
  dissolved state's money and debts are shared out (T-048, with the lifecycle effects); a command
  carrying LCU worked out on an older view stamped with its currency's scale and rescaled or refused when applied (M2,
  with the AI's budget commands); the redenomination's change routed through the per-category sums (M2, with them).

## Acceptance criteria
1. `ci-linux` green, debug and optimised.
2. For every account, in every test run, the balance's change since the month's opening equals the sum of the month's
   postings, in its own unit, exactly.
3. The world account is exactly 0 after every monthly close in the tests; a USDn transfer moves value, never makes it.
4. An FX pair is in two units at one rate; the LCU leg and the USDn leg are each exact in their own unit.
5. A redenomination never breaks 2 or 3, posts the whole change of each balance under `redenomination` and is counted
   per currency (the log until the notification ring), comes at the day's end so a flow of several postings stays in
   one scale, rescales every LCU amount of that currency, and only the passing currency moves.
6. Posting money of the wrong unit to an account does not compile; `Money` cannot be posted at all (a CI step proves
   it with snippets that must fail).
7. Nothing allocates per posting or per day (measured).
8. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.

## Verification of the fixes (2026-11-13)
- **A concurrency and determinism review** (the first rounds had none): debug and optimised hashes equal over 30
  years with 3,132 redenominations, 200 orders of the same postings one hash, the close and the redenomination each
  idempotent, a snapshot read on another thread unchanged, the thread sanitizer clean. It found the checks' sums
  clamping on forged extremes, loose bounds at load and no pinned run: the sums are now exact, a load refuses amounts
  past 2^60 and rates past ±2^52 (ADR 0003, decision 6), the exchange refuses a rate it cannot negate, and a short
  run's hash is pinned.
- **Its verification (FV6):** a state a save wrote but no load took (a posting before the close on a month's first
  day leaves an opening past 2^60): the writer now refuses every state past the ledger's bounds that the loader
  refuses (ADR 0003, decisions 6 and 7); four tests that could not catch their faults remade (each bound on its own
  and exactly at 2^60, a currency at and past its ceiling, a wrapped difference, the exchange's clamp count).
- **Its verification (FV7):** 60,000 random ledger states, none written that a load refused; it planted 15 faults
  in the writer and the loader, and the 10 that survived (each check of the writer, its last row and currency, the
  ceiling either way) are caught now by a test of the writer's own checks: 4,000 states at and around every bound,
  with a government whose row is not its currency's number, each written exactly when its tree loads.
