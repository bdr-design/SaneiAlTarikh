# T-031: City names beside their dots, on every screen

## The need
Found while approving screen 28 (Khartoum): the shared MENA overlay draws each city's name with text-anchor="start"
10 px left of its dot, the right-to-left placement, but renders it left to right, so the name starts left of the dot
and runs over it: every city's dot (الإسكندرية، أسوان، طرابلس، بنغازي، الخرطوم، الرياض، بغداد، صنعاء، أنقرة، طهران) is
hidden under its own name on every screen that shows it. Only Cairo had been fixed, in screen 4's copy
(`make_overlay.py`). No checker looked at a dot against its own name.

## Evidence
design/shared/map_mena_d1_overlay.svg (11 city dots, each followed by its name at cx − 10, cy + 7, anchor start, no
direction); design/screen4/A/_build/make_overlay.py (direction="rtl" for «القاهرة» only); screen 28's i16 render before
its local fix (Khartoum's dot under «الخرطوم»); getBBox: Khartoum's name 805–874 over its dot 810–820, Cairo's 710–767
west of its dot 772–782.

## Scope
`tools/city_labels.py` places all 11 city names of the shared overlay beside their dots, right to left: west by default
(its end 10 px west of the dot's centre), east where the west falls on the sea (Benghazi: the Gulf of Sirte), south where both sides do (Tripoli: Tunisia's border
west, the sea east); «العراق» and «السعودية» move south off Baghdad's and Riyadh's names (east, Riyadh's name would run
off the play screen's edge). `tools/check_overlay_labels.js` measures the overlay (each name clear of its dot, of every
other label and dot; no other name over a city's dot). `make_overlay.py` only checks the placement and regenerates screen 4's label layer, which every
map screen takes; screen 28's local fix dropped. Screen 1 (B3), which drew the overlay as one image, gets the same
inline label layer with a cut step (`_build/labels.py`: a name a panel edge, the screen edge or the side inset would cut
hides whole) and the label rules. Screen 4 variant C now loads the shared overlay (its stale copy removed); variants A,
B and C stay two-phone proposals as before. The rules «map city dot under its own name» and «map city name over another
label», with plants, in the panel checker and in the own checkers of screens 1 B3, 4A, 4R, 5, 6, 7 and 14. §2.5 gains
the city-label rules (layer 5: the dot in the glyph atlas) and the §8 test line.

## Acceptance criteria
1. On every screen (the two-phone screen 4 proposals A, B and C excepted: superseded by 4R, not in the game), every city
   name shown sits beside its dot (west unless the sea, a border or a label is there), the
   dot visible, never over another label; no name cut by a panel or the screen edge.
2. The rules catch a name over its dot and over another label on every checker that checks the map's labels (planted),
   and the overlay check catches it in the shared overlay.
3. Every map screen regated: 0 issues on 7 phones, self-test, `check_screen.py` PASS.
4. Six independent read-only reviews, every confirmed finding fixed; a verification review.
