# ADR 0003: Currencies and the nominal ledger

Status: accepted, 2026-11-12 (T-040). The design calls it ADR 0019 (§2.4, the M1a checklist); this repository numbers
its ADRs in the order they are written. Implements design doc §2.3, §2.4 «Ledger», §5.1 (settlement, the money base,
revaluation, the transport payout) and §8 (ledger conservation).

## Context
The game keeps every country's money in its own currency, so that devaluations and inflation show as they do in the
news (D-6), and trade settles in dollars through a world account. Money must never be made or lost by a forgotten
flow: §8 checks, per account, that the change of the balance equals the sum of its postings in its own unit, and that
the world account is exactly 0 after each monthly close.

## Decisions
1. **Units by type.** A government's local accounts and a currency's money base hold `LCU`; FX reserves and the world
   account hold `USDn`. A balance changes only by a posting (`post` for one amount, `transfer` and `exchange` for two
   that belong together), by the opening of a government's accounts, and by a redenomination; a wrong unit does not
   compile, and CI proves it (`tools/checks/units/check.sh`: seven wrong-unit postings must fail, a control must
   compile). `Money` (constant dollars) has no posting at all: it is derived for reports. Two limits the types do not
   cover: one currency's `LCU` from another's (a posting lands in the account's own currency, and a local transfer
   refuses two currencies), and a value rebuilt from another unit's `raw`, which a CI lint bans outside SaneiCore.
2. **Accounts.** Each government row has two local accounts (treasury and domestic debt) and its FX reserves; each
   currency has its money base (§5.1: the money is the currency's, and one currency can serve several governments, as
   with Côte d'Ivoire's two in 2011 and the unions of M2); the world market has one dollar account. A government that
   follows another in power (`succeedGovernment`) keeps the row, so the balances are its own. A dissolved government's
   balances stay, in their currency's scale, until a new government takes the row; then they are dropped, unposted,
   and the new treasury starts at its amount, which is an opening balance, not a posting. How a dissolved state's money
   and debts are shared out comes with the lifecycle effects and the stub packs (T-042). Debt by currency bucket comes
   with the debt system (M2).
3. **Currencies.** Each polity has one currency, in the same row (both tables are capped at 384, a polity's row is
   never reused, and only the polity's set-up adds a currency). A currency has its scale (one LCU unit is 10^k of its
   own units), its exchange rate (LCU units per USDn unit) and its price index, both as logarithms, and its money base.
   Unions and pegs come with M2.
4. **Categories.** Every posting names why money moved, from a list of reserved numbers (tax, spending, fx,
   revaluation, trade, transport, aid, redenomination, cheat, interest), never renumbered and pinned by name in a test.
   The postings are not stored by category yet: each moves its balance and the month's sum per account, which is the
   invariant's other side. The sums per category come with the budget's «لماذا؟» and the history (M2). `cheat` is
   reserved for the cheats (§5.11, M8); nothing gates it yet.
5. **Exchanges and transfers.** An exchange is two postings under `fx` at the day's rate, from or to the treasury: the
   LCU leg and the USDn leg, each exact in its own unit, their values equal at the rate to within the rounding of the
   dollar leg. An exchange whose dollar leg would round to 0 is refused, so local currency is never given for nothing.
   A transfer, local or in dollars, is two postings that cancel; both sides are checked before either leg posts. No
   balance is checked: overdrafts are the economy's rule (M2). A posting, transfer or exchange that touches a government
   that has ended, or mixes two currencies, moves nothing and is counted in the world row (`refusedPostings`), so money
   never vanishes silently.
6. **Redenomination.** A local balance or a money base past 2^60 either way marks its currency; at the day's end,
   after every posting of the day, the currency redenominates, so a flow of several postings is all in one scale
   (Int64 leaves 8 times 2^60 of room for the rest of the day). Every LCU amount in that currency is divided by 1,000 to
   the nearest unit: every government row's local balances (dissolved rows included), the money base, the governments'
   tax bases (and every LCU column the economy adds, M2), and the LCU fields of the commands waiting to make a
   government in it. The whole change of each balance is posted under `redenomination`, so the month's sums span the
   change of scale; M2's inflation, its exchange-rate pass-through and the money base's growth must take that step out
   (by `scaleExponent`). The scale moves by 3, and the rate and the price index follow by `LogQ(ratio: 1, 1_000)`,
   within 4e-7 of log2(1/1000), so a value at the rate drifts by about 3e-7 per redenomination. The count of
   redenominations per currency is the log; a notification comes with the notification ring (M1b). Dollars never
   redenominate: a dollar hyperinflation has no rule. The aggregates that M2 adds (a budget's lines, nominal output, a
   union's money base) must ask the same of their sums.
7. **The monthly close** runs on day 1, after the calendar jobs (and, from M2, after the world market and the transport
   payout, which settle through the world account). It checks the invariants in every build, a walk of the columns once
   a month, and that the world account is 0; a failed close is counted in the world row (0 in every game), and the
   month opens at the balances as they are. A balance that clamped fails its invariant on purpose: money past the range
   was lost. A world account left owed fails every close until it is settled, so the count is of failed closes.
8. **The surface.** Everything that moves money is internal to the engine: its systems post; nothing outside writes a
   balance. The parallel monthly slots (M2) cannot post into the state from their tasks: each task fills an outbox of
   postings (an account, a category, an amount in the account's unit), applied in serial order after the burst; that is
   also where the category gets stored.

## Consequences
- Every system that moves money posts it; nothing writes a balance directly.
- A failed close and every refused posting are visible in the state and its hash; the engine's tests fail on them.
- Revaluation postings for debt and reserves held in other currencies come with the debt system (M2): a reserve's
  revaluation is in its local value, so it posts to the government's local accounts, never to the dollar balance.
