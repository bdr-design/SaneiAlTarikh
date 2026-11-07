# T-017: Screen 17, the «لماذا؟» (why) sheet

## The need
Every derived value can be explained (design doc R9, §5.0): tapping a HUD chip or a panel's «لماذا؟» opens a sheet that
lists the terms that make the value, up to 12, with any overflow folded into «أخرى». M1c ships «لماذا؟» for stability
first, so the design shows stability.

## Evidence
`design_doc/final_design.md` R9, §2.3 (TermSink, TermBuffer12), §5.0, §6.4 (tapping a chip opens its «لماذا؟» sheet),
M1c. Today's values on the approved screens: HUD الاستقرار 58% trending down; state panel الاستقرار 58% «−1 شهريًا»,
الشرعية 44 «−2 شهريًا»; economy التضخم 10.3%, البطالة 8.9%; internal الاضطرابات 45 «+1 شهريًا». Hypothesis (design
target, not data): the stability terms and their sizes below.

## Goal
One sheet the player reads in seconds: where the value is now, where it is heading and how fast, and each cause with its
signed share, adding up exactly to the value it heads for.

## Scope and what to protect
The sheet in the approved panel frame from the right (shared builder and checker), no dock item open, the map central
and visible (mapCentral). Protected: the approved HUD, the panels' tokens, every value already shown elsewhere.
Out of scope: the money variant of D-6 (constant 2011 USD beside nominal; noted in the brief as a later line), the
per-province «لماذا؟» (screen 4 R keeps its own list).

## Acceptance criteria
1. Header: flag, «الاستقرار», the line «لماذا؟ · الآن 58% · يتجه إلى 56%», the stability emblem, close.
2. The status cells: الآن 58%, الهدف 56%, التغير −1 شهريًا, يصل خلال نحو شهرين (from the cells); the same values as the HUD and the state panel.
3. Terms in two sections in words, «ما يرفعه» and «ما يخفضه», each row: its name, the value it comes from, its signed
   share (blue with an up arrow for a rise, amber with a down arrow for a fall), sorted by size; the starting level first.
4. The sum row: the starting level plus every term = the target, exactly, shown as «55 + 16 − 15»; at most 12 rows, the starting level included (TermBuffer12), beyond that the 12th is «أخرى».
5. Every term row reads whole in VoiceOver («يرفع … نقاط» / «يخفض …»); a link to the state panel says where it leads.
6. Gate: 0 issues on 7 phones, the self-test catches every plant, `check_screen.py` PASS; three independent read-only
   reviews (checker and consistency; what the player sees; dimensions and the formatting of text and boxes), every
   confirmed finding fixed.

## Test and risks
`design/screen17/A/_build/render.js` with the shared checker plus the sheet's own rules (the sum, the order, the signs and
colours, the agreement with the other screens' values, the 12-term cap). Risk: long term names on the 335 pt sheet of
the iPhone 15/16; measured before wording.
