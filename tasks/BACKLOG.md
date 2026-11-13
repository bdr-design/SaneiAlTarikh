# M1a: the cards still to write (planned)

Each becomes a card with acceptance criteria before its work starts (PROCESS.md). The items other cards place here are
listed under each, so a deferred item always has a place that exists.

- **T-042: content and the start.** The content loader, validator and baker; content IDs and the `IDxx` lists,
  `aliases.json` and `remapIDs`; the polity, actor, group and currency registries; dormant polities and ending a
  polity; the lifecycle effects beyond succession and dissolution (independence, unification, recognition, annexation
  `Annex`, an effect that gives provinces held by nobody, polities made after the start); starting slots spread evenly
  across the 28; the scenario's set-up of the start state (directly, not through commands) with its amounts within
  2^60; the day-1 closure in LCU and in USD and §8's `--t0` closure; the stub packs and how a dissolved state's money
  and debts are shared out; the start golden save; META's player as a content ID, and its `rulesHash` and
  `scenarioHash` filled from `content.bin` and the scenario file.
- **T-043: the platform's saves.** Raw DEFLATE with Apple's Compression (a `SaveCompressor` of `.rawDeflate`) and the
  device fixture read on Linux; storage in `Documents/Saves`, atomic writes (temp, fsync, rename, verify, «last
  good»), autosave rotation, the mirror (D-28), export and import, the saves list from `SaveFile.readMeta`, corrupt
  files shown as «تالف»; a write that returns nothing (a tree past 12 MB) keeps the last good save and is logged;
  the rules-hash message «تغيّرت قواعد اللعبة منذ هذا الحفظ» once. The bytes made from a copy
  of the state handed from the simulation's thread (§3.5: a stall of at most 2 ms) and made on the I/O thread
  `sanei.io` (ADR 0001, `threadSpread`): the tree, DEFLATE, the SHA-256 and the file; the platform checks a file's
  size before reading it, reads it into one buffer, and reads only `SaveFile.metaPrefixLength` bytes for the list;
  DEFLATE streaming into the file (`compress(appendingTo:)`), stopping at `SaveFile.mostCompressedBytes` rather than
  making bytes the file then stores as they are; every write handed a compressor whose file is stored as it is
  (compression 0: the compressor failed or passed the bound) logged, as such a file is up to 12 MB, past §3.5's 2 MB;
  the Linux inflater for the device fixture (a zlib test target, as simcli's `CZlib`), comparing decompressed
  payloads (Apple's DEFLATE bytes vary by OS version); a macOS build in CI so an API newer than iOS 17 is caught.
- **T-044: the host on the simulation.** `GameHost` runs `Simulation` inside one long counting scope; the test that
  every entry point binds a counter scope; the host holding a day until every AI result due on it has been submitted;
  the host following the player onto a successor's row after `succeedGovernment`, with one sequence of player orders
  across a succession (so a new order never takes a handed-over order's key); the load procedure (pause, release the old
  state and its snapshot, decode, migrate, build) and the peak-load measure in the optimised build (a debug build runs
  0.4 to 0.6 MB higher, at or past the 16 MB), with a forged file at the bounds (a tree of 6,144 columns) and
  `mostPayloadBytes` and `mostCompressedBytes` worked out again against the grown state and §3.3's split; the
  build-scoped command journal `CMDJ`, `.saneibug` and `simcli replay`; the ledger's invariants after every day in debug
  and test builds; the lint that no simulation code walks a `Set` or a `Dictionary`; the append-only check of
  `tags.lock` in CI; the engine's bench in CI (the work counters, the 1.2× cross-module bench, the bench counter of
  T-036, the remembered position of T-037).
- **T-045: the thin systems.** Time, taxes, budget, cohorts, stability through `TermSink`, projects, rename; the event
  scheduler with the 5 real events (South Sudan's succession, Côte d'Ivoire's resolution, Libya's NTC, the NDP's
  dissolution, the US withdrawal from Iraq) and step 10's conditional events (a government they make takes its slot
  from tomorrow on); the registry of random streams; the AI stub on the stagger.
- **T-046: `Visibility`.** The engine's view through fog, declared in M1a with the packing of a fog-of-war key (epoch
  fog itself is M5).
- **T-047: every column group for M1 to M6 declared** (§9's M1a checklist): polities, governments, actors, party rows,
  group rows, currencies and accounts, the equipment pool and allocations, the reserve pool, front sectors, the pair
  extension with epochs, climate, single-year cohorts, each with its defaults and its save columns (an added column
  keeps format 1; the golden save's list of added columns grows); the loader reads each column straight into its
  typed column (no whole-number copy: today's peak is about 3 times the typed state, docs/perf.md).

Placed elsewhere: the notification ring and the record of refused orders for screen 26 (M1c, the notification
centre); the player's worked-out data for a queued order, in a side table of 64 slots keyed by the command's key (M1c,
with screen 26's previews); the per-category sums of postings, their «لماذا؟», the redenomination's change routed
through them, inflation and pass-through taking a redenomination out, the trigger on aggregates, the typed LCU ↔ USDn
conversion that does not post, the exchange set by its dollar side, the daily ledger and the posting outboxes of the
parallel monthly slots with the burst helper (M2); the difficulty settings (M7); the cheats (M8); the mid-war golden
save (with the war systems, M4) and the 30-year one (with the weekly long-run gate, M2 on).
