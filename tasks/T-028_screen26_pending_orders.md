# T-028: Screen 26, the pending orders

## The need
Design doc §6.4: «A pending-orders badge shows while paused»; §6.5: «Pending orders (أوامر معلقة) can be cancelled before
time resumes». The pending-design list (§6 «Pending design» and the 2026-11-07 rows) names the pending-orders list; it
needs a design.

## Evidence
§6.4 (the date and speed control, the left column's toast), §6.5 and the D-16 speed rules; the approved B3 play screen
(the date pill, play and speed, the toast slot with the bell); the approved screens whose orders wait: screen 7 (the fuel
subsidy −10%: 11.7 to 10.5 مليار $), screen 22 (جمع معلومات في السودان, 3 أشهر, 60 مليون $) and screen 14 (the Western
Region's 4 formations to Siwa, arriving after 7 days). The owner's rules mapCentral, sheetIdentity, ownerProxy.

## Scope
The paused HUD (the play button «استئناف» with the count; the toast slot holding the pending orders while paused) and a
side sheet of no dock section listing the orders given while paused, each cancellable, with «استئناف الوقت»; the list
after one cancel. Out of scope: reordering orders; orders given while time runs (they act at once).

## Acceptance criteria
1. Paused, the HUD says so: the play button reads «استئناف» and counts the orders that will start; the toast slot holds
   them and opens the list (one tap); the HUD keeps B3's places.
2. The list shows each order as given on its screen (its section's icon and name, its values), each with a cancel that
   names it; a note says nothing is spent or moved before time resumes and a cancelled order costs nothing.
3. «استئناف الوقت» is the one primary, after the list, counting the orders; after a cancel the list says what was
   cancelled at once (VoiceOver) and that nothing was spent.
4. A side sheet with its own identity, never a dialog over the map; no red.
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews, every confirmed
   finding fixed; the owner's proxy for any owner question.
