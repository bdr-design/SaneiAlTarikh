# M1a: the cards still to write (planned)

Each becomes a card with acceptance criteria before its work starts (PROCESS.md). The items other cards place here are
listed under each, so a deferred item always has a place that exists.

- **T-042: content and the start.** The content loader, validator and baker; content IDs and the `IDxx` lists,
  `aliases.json` and `remapIDs`; the polity, actor, group and currency registries; dormant polities and ending a
  polity; the lifecycle effects beyond succession and dissolution (independence, unification, recognition, annexation
  `Annex`, an effect that gives provinces held by nobody, polities made after the start); starting slots spread evenly
  across the 28; the scenario's set-up of the start state (directly, not through commands) with its amounts within
  2^60; the day-1 closure in LCU and in USD and §8's `--t0` closure; the stub packs and how a dissolved state's money and
  debts are shared out; the start golden save; META's player as a content ID.
- **T-043: the platform's saves.** Raw DEFLATE with Apple's Compression (`SaveCompressor`, code 1) and the device
  fixture read on Linux; storage in `Documents/Saves`, atomic writes (temp, fsync, rename, verify, «last good»),
  autosave rotation, the mirror (D-28), export and import, the saves list from `SaveFile.readMeta`, corrupt files shown
  as «تالف»; the rules-hash message «تغيّرت قواعد اللعبة منذ هذا الحفظ» once.
- **T-044: the host on the simulation.** `GameHost` runs `Simulation` inside one long counting scope; the test that
  every entry point binds a counter scope; the host holding a day until every AI result due on it has been submitted;
  the host following the player onto a successor's row after `succeedGovernment`, with one sequence of player orders
  across a succession (so a new order never takes a handed-over order's key); the load procedure (pause, release the
  old state and its snapshot, decode, migrate, build) and the peak-load measure; the build-scoped command journal
  `CMDJ`, `.saneibug` and `simcli replay`; the ledger's invariants after every day in debug and test builds; the lint
  that no simulation code walks a `Set` or a `Dictionary`; the append-only check of `tags.lock` in CI.
- **T-045: the thin systems.** Time, taxes, budget, cohorts, stability through `TermSink`, projects, rename; the event
  scheduler with the 5 real events (South Sudan's succession, Côte d'Ivoire's resolution, Libya's NTC, the NDP's
  dissolution, the US withdrawal from Iraq) and step 10's conditional events (a government they make takes its slot from
  tomorrow on); the registry of random streams; the AI stub on the stagger.
- **T-046: `Visibility`.** The engine's view through fog, declared in M1a with the packing of a fog-of-war key (epoch
  fog itself is M5).

Placed elsewhere: the notification ring and the record of refused orders for screen 26 (M1c, the notification
centre); the player's worked-out data for a queued order, in a side table of 64 slots keyed by the command's key (M1c,
with screen 26's previews); the per-category sums of postings, their «لماذا؟», the redenomination's change routed
through them, inflation and pass-through taking a redenomination out, the trigger on aggregates, the typed LCU ↔ USDn
conversion that does not post, the exchange set by its dollar side, the daily ledger and the posting outboxes of the
parallel monthly slots with the burst helper (M2); the difficulty settings (M7); the cheats (M8).
