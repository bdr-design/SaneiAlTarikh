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
  logarithms); each government's accounts (treasury, money base and domestic debt in its currency, FX reserves in
  USDn); the world account in USDn; `post(account, category, amount)` in the account's own unit, with stable category
  numbers; an FX pair at the day's rate; a transfer between USDn accounts; the redenomination of a currency when one of
  its balances passes 2^60 (every balance of that currency rescaled by 10^3, the rounding posted); the monthly close;
  the invariants as a check that names what failed.
- The skeleton's thin taxes post through the ledger.
- `docs/adr/0003-currencies-and-the-ledger.md` (the design's ADR 0019, numbered in this repository's sequence).
- Tests: conservation over random postings; the world account 0 after closes with trade settled through it; an FX
  pair conserves value at the rate; a redenomination keeps every invariant; `Money` and the other units cannot be
  posted to the wrong account (by type).
- Out of scope: the economy's flows (M2), debt by currency bucket and its revaluation (M2, with debt), currency unions
  and pegs (M2), the money base's growth (M2), cheats (M8's settings; the category is reserved now).

## Acceptance criteria
1. `ci-linux` green, debug and optimised.
2. For every account, in every test run, the balance's change since the month's opening equals the sum of the month's
   postings, in its own unit, exactly.
3. The world account is exactly 0 after every monthly close in the tests; a USDn transfer moves value, never makes it.
4. An FX pair is in two units at one rate; the LCU leg and the USDn leg are each exact in their own unit.
5. A redenomination never breaks 2 or 3, is logged as a posting, and only the passing currency moves.
6. Posting money of the wrong unit to an account does not compile; `Money` cannot be posted at all.
7. Nothing allocates per posting or per day (measured).
8. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.
