# T-031: City names west of their dots, on every screen

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
`tools/city_labels_rtl.py` sets direction="rtl" on all 11 city names of the shared overlay (screen 1 and screen 4's
variants B and C use it as an image); `make_overlay.py` now only checks it and regenerates screen 4's label layer, which
every map screen takes; screen 28's local fix dropped. A shared rule «map city dot under its own name», with a plant, in
the panel checker and in the own checkers of screens 4A, 5, 6, 7 and 14. Out of scope: label positions otherwise.

## Acceptance criteria
1. On every screen, every city name shown sits west of its dot, the dot visible.
2. The rule catches a name over its dot on every checker that checks the map's labels (planted).
3. Every map screen regated: 0 issues on 7 phones, self-test, `check_screen.py` PASS.
4. Six independent read-only reviews, every confirmed finding fixed; a verification review.
