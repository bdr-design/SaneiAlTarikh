# T-039: M1a, part 4: the engine skeleton (world state, the daily pipeline, commands, the state hash)

## The need
M1a's Engine line (§9 checklist): `WorldState` as column tables, the `Pipeline` with stored slots and the strategic
stagger, Commands with stable tags. Every later system plugs into these, so their shape is settled before any system
is written: the order of a day, exactly one monthly run per government, a rejected command that changes nothing, the
same hash in every run and after a copy.

## Evidence
design_doc §2.4 (the tables, the daily pipeline in its 14 steps, the slot rule for a new government, the stagger at
most 15 a day ordered by (due date, serial), Commands with stable numeric tags, `validate` and `apply`, never
synthesised `Codable`), §2.3 (Core), §7 (columns in saves), §8 (two runs give equal hashes; a rejected command leaves
the hash unchanged), L3 (caps: 384 governments and polities), ADR 0001 (the host on its own thread), ADR 0002.

## Scope
- `Sources/SaneiEngine`: `WorldState` (the world row, polities, governments, provinces as dense column tables with
  caps; each government's scheduling columns `monthlySlot`, `lastMonthlyRun`, `lastYearlyRun`, `aiNextStrategic`; a
  thin fiscal set: treasury, tax rate, tax base), `Pipeline` (one day in §2.4's order: commands sorted by (day,
  issuerRank, sequence), refined by the reviews to (day, rank, the issuer's serial, sequence) so two issuers of one
  rank never tie, and kept in that order as they are submitted; the calendar hooks; the monthly slot; the yearly run
  in the January slot; the strategic
  stagger), the slot rule for a new government, `Command` (an enum, a stable `UInt16` tag per case, `validate`,
  `apply`, a column-codec form), the state hash over every column, and two thin systems on the monthly slot (taxes into
  the treasury; a counter of runs).
- Tests: two runs equal; a copy continued equals the original; exactly one monthly run per government per month over
  years, with governments created and dissolved mid-month; the stagger never above 15 a day and in (due, serial)
  order; commands submitted in any order give the same day; a rejected command leaves the hash unchanged; every command
  survives its codec.
- Out of scope, each with its place: every other column group (they arrive with their systems in the next M1a
  slices, declared with defaults before M1a ends); the ledger (T-040); the save container, META, migrations and
  golden saves (T-041); content loading (T-042); moving `GameHost` from its M0 stand-in onto this world (T-044,
  after the save container of T-041); parallel monthly slots (with the burst helper). Named by the reviews and
  placed: content
  IDs, dormant polities and ending a polity, and starting slots spread evenly across the 28 (T-042); tagged codec
  fields with lengths so that a reader can skip an unknown field (T-041 decided: a length per command, so an unknown
  command is skipped; a changed command's fields are a new format with a step that rewrites the queue's items;
  whether a held copy keeps the cap's room was
  measured and fixed in this card's fix round: every append re-reserves);
  the strategic period set by difficulty (the difficulty settings, M7; its feasibility answered by the owner's proxy on
  2026-11-12: 15 a day on every level, the period a target, §5.10 corrected); this month's flows initialised pro rata
  for a government made mid-month (M2, with the daily ledger); the observer's steps carry no date (a test that needs
  one keeps its own); the host holding a day until every AI result due on it has been submitted, so a late result
  never splits two
  phones' games (T-044, with `GameHost`); a government made by step 10's conditional events given its slot from
  tomorrow on (with the event scheduler, M1a's thin systems, T-045); the record of which order was refused and why,
  for screen 26 (the
  notification ring, M1c); the lifecycle effects beyond succession and dissolution: independence, unification,
  recognition, annexation (§2.4's `Annex`, giving provinces to another polity), an effect that gives provinces held by
  nobody, and polities made after the start (T-042).
  Carried from T-036 («the engine's card») and placed: the registry of random streams and the packing of a fog-of-war
  key (the registry with the event scheduler, T-045; the fog-of-war key with `Visibility`, T-046); the one burst
  helper with its per-child counters from a pool and
  the CI ban on `Task {`, `addTask` and `async let` outside it (with parallel monthly slots, M2); the test that every
  entry point binds a counter scope (T-044, when `GameHost` runs this simulation); a lint that no simulation code walks
  a `Set` or a `Dictionary` (T-044's CI, before M1a ends). `GameDate.civil` once per day is done: the day computes it
  once.

## Acceptance criteria
1. `ci-linux` green, debug and optimised; the reference checks.
2. The day runs §2.4's steps in order; each government runs its monthly systems exactly once in every month it exists,
   whatever day it was created; the yearly run comes once a year in its January slot.
3. The stagger runs at most 15 governments a day, ordered by (due date, serial).
4. Commands: a stable tag per case (pinned by a test); a rejected command changes nothing (the hash is equal); the
   order of submission within a day never changes the result; every case writes and reads back through the codec.
5. Determinism: two runs of the same world give equal hashes; a copy continued gives the original's hash.
6. SaneiEngine imports only SaneiCore; nothing in it allocates per day once its tables are made, while no copy of the
   state is held (measured; with a copy held, the first write to each column copies it once, also measured).
7. Six independent read-only reviews; every confirmed finding fixed; verification reviews of the fixes.
