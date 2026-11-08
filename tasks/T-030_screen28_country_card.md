# T-030: Screen 28, the country info card

## The need
The pending-design list (§6.1) names the «country info card»: what the player sees on tapping another country on the
map. Screen 24 left the country's output to it («the output is the country's info card's»). No approved screen shows a
foreign country at a glance.

## Evidence
§2.5 picking (a tap on a province of another country), §5.5 (relations, recognition, treaties), §5.6 and D-19 (another
country's internal values are estimates through the player's intelligence), the approved screens 10 (the foreign panel:
Sudan, the 1959 Nile agreement), 11 and 22 (the network in Sudan: 7 of 10, exposure low), 16 (the South Sudan referendum
on 9 January 2011) and 21 (the relation sheet, the frame this card follows), screen 24 (the output fact moved here).
Sudan on 1 January 2011: President Omar al-Bashir; the country still whole (South Sudan seceded on 9 July 2011);
population about 44 million; GDP about 65 billion dollars (2010); the Halaib triangle in dispute with Egypt.

## Scope
A side sheet in the foreign section's frame, opened by tapping the country on the map (any of its provinces at country
zoom): the country, its leader and regime; three headline numbers (population, output, and stability as an estimate);
the status cells (our relation, treaties, the dispute, our network); a note; links to the relation sheet and to a new
operation. The country is outlined on the map. Out of scope: the other country's own panels (not the player's).

## Acceptance criteria
1. The card names the country, its leader and regime, with its flag; the map shows the country outlined, in view, never
   covered.
2. Population and output are the country's; values the player could not know (stability) are estimates as D-19 says,
   their range tied to the network's level.
3. The relation, treaty, dispute and network agree with the approved screens 10, 11, 16, 21 and 22.
4. The links say where they lead; a side sheet, never a dialog over the map; Western digits; correct Arabic counts.
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews, every confirmed
   finding fixed.
