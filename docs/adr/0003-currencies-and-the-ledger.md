# ADR 0003: Currencies and the nominal ledger

Status: accepted, 2026-11-12 (T-040). The design calls it ADR 0019 (§2.4, the M1a checklist); this repository numbers
its ADRs in the order they are written. Implements design doc §2.3, §2.4 «Ledger», §5.1 (settlement, revaluation,
the transport payout) and §8 (ledger conservation).

## Context
The game keeps every country's money in its own currency, so that devaluations and inflation show as they do in the
news (D-6), and trade settles in dollars through a world account. Money must never be made or lost by rounding or by
a forgotten flow: §8 checks, per account, that the change of the balance equals the sum of its postings in its own
unit, and that the world account is exactly 0 after each monthly close.

## Decisions
1. **Units by type.** A government's local accounts hold `LCU`; its FX reserves and the world account hold `USDn`.
   The only ways to change a balance are `post(_:_:_:_:)` for an LCU amount to a local account and `post(_:_:_:)` for a
   USDn amount to a dollar account, so a wrong unit does not compile. `Money` (constant dollars) has no posting at
   all: it is derived for reports.
2. **Accounts.** Each government row has three local accounts (treasury, money base, domestic debt) and one reserves
   account; the world market has one dollar account. A dissolved government's balances stay as they were; a new
   government in a reused row opens its accounts afresh (its treasury at its starting amount, the rest at 0). Debt by
   currency bucket comes with the debt system (M2).
3. **Currencies.** Each polity has one currency, in the same row (both tables are capped at 384 and a polity's row is
   never reused). A currency has its scale (one LCU unit is 10^k of its own units), its exchange rate (LCU units per
   USDn unit) and its price index, both as logarithms. Unions and pegs come with M2.
4. **Postings by category.** Every posting names why money moved, from a list of stored numbers (tax, spending, fx,
   revaluation, trade, transport, aid, redenomination, cheat, interest), never renumbered. The month's sum of postings
   per account is kept beside the month's opening balance; that is the invariant's other side.
5. **Exchanges and transfers.** An exchange is two postings under `fx` at the day's rate: the LCU leg and the USDn leg,
   each exact in its own unit (value at the rate is kept to within the rounding of `LogQ.applied`). A dollar transfer
   is two postings that cancel, so dollars move and are never made. A side that is a government no longer existing
   stops the whole movement.
6. **Redenomination.** A local balance past 2^60 either way makes its currency redenominate at once: every local
   balance of every government in that currency is divided by 1,000 to the nearest unit, the change posted under
   `redenomination`, the scale moves by 3 and the rate and price index follow. Three local accounts at most 2^60 each
   still sum inside an Int64. Dollars never redenominate: a dollar hyperinflation has no rule.
7. **The monthly close** runs on day 1, after the world market and the transport payout: it checks the invariants
   (and that the world account is 0), counts a failure in the world row (0 in every game), and opens the month at the
   balances as they are.

## Consequences
- Every system that moves money posts it; nothing writes a balance directly.
- A failed close is visible in the state and its hash; the engine's invariant test fails on it.
- Revaluation postings for debt and reserves held in other currencies come with the debt system; the category is
  already stored.
