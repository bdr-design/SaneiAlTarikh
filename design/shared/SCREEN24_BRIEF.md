# Screen 24 brief: the government chooser (D-29)

Visual mockup. NOT app code. The build is `../screen24/A`. Task card: `tasks/T-026_screen24_government_chooser.md`.
Designed and approved by Claude under the owner's delegation, to the owner's rules `mapCentral` and `ownerProxy`.

## When it appears
The new game's page 2 (screen 3 p2B), when the chosen country had more than one government on 1 January 2011 (D-29):
the chooser is part of the country card, never a dialog over the map. The example is Côte d'Ivoire, the case D-29 names.

## The card
- Head: Côte d'Ivoire's flag, «ساحل العاج», «مختارة».
- The caption «حكومتان منذ ديسمبر 2010: اختر الحكومة» (both were sworn in on 4 December 2010) with the warning icon (amber), which names the radio group
  (aria-labelledby), then two rows of 40 pt (44 pt touch), page 3's choice rows (p3B `.ch` / `.ch.sel`: page 3's radio at the row's start,
  empty and grey; a faint fill and hairline; the chosen one cyan at 0.10 fill and 0.55 outline, its radio filled cyan): «حكومة الحسن واتارا» ·
  «تعترف بها الأمم المتحدة · تدير الشمال» (the default, first and chosen); «حكومة لوران غباغبو» ·
  «أعلن المجلس الدستوري فوزه · تدير الجنوب وأبيدجان». Each row names the formal act its claim rests on and what it
  administers, in the same neutral form. VoiceOver reads each row whole; the default says «الافتراضية».
- Facts: السكان 20.2 مليون; الصعوبة صعبة جدًا, in the scale's colour (--d4, as on its chip), four bars.
- Not on this card: the output and the seat of each government. The chooser takes the room the output row would need (the
  card must fit the iPhone SE's band); the output is the country's info card's (a later screen). Both governments sat in
  Abidjan, so a seat tells the player nothing; the rows name the areas.
- The default is shown by being chosen when the page opens and by its line «تعترف بها الأمم المتحدة» (D-29's rule); no
  separate tag.

## The page
Page 2's frame and rules: Côte d'Ivoire highlighted on the world map (its outline from Natural Earth admin-1, the same
highlight as Egypt on page 2), its chip first and chosen («15 دولة»); Egypt drawn as any other country. The chooser makes
the card taller, so the search field sits left of the card, 12 pt apart; a card top that would come level with the field
(less than 8 pt under its bottom) aligns with the field's top. The lead line runs from the dot in the country to the card's left edge within its head (never to a government's
row): the country is placed at the head's height as far as the search field above it leaves room (its top at least 8 pt
under the field), and the line ends on the head's band. Map names that the line or its dot's halo would cross, that the search
field's or the card's edges would cut, or that would show in the chip row are taken out of the overlay, as page 2 takes
out those the bottom row cuts (here «غانا» on every phone; on most phones also the names around the card and the field).
Panels are opaque (D-3).

## Cost
See design doc §3.9 «The government chooser»: static fields; one chip per polity; one highlight outline; a row tap changes
the card's model only; the line's hidden names are worked out once per selection.

## Facts (1 January 2011)
After the run-off of 28 November 2010 both Alassane Ouattara and Laurent Gbagbo claimed the presidency. The Independent
Electoral Commission announced Ouattara the winner (2 December); the Constitutional Council proclaimed Gbagbo (3
December); both were sworn in on 4 December. The UN recognised
Ouattara (the General Assembly accepted his ambassador on 23 December 2010); his prime minister Guillaume Soro's Forces
Nouvelles held the north; Gbagbo held the south, Abidjan and Yamoussoukro with the army. Population about 20.2 million
(2011). Neutral words; no judgement.

## Gate
`screen24/A/_build/render.js` is page 2's checker (layout, safe areas, hit boxes, contrast, the strip, the map names)
with opaque panels (D-3), plus the chooser's checks: a radio group named by its visible caption («حكومتان … اختر الحكومة»)
of two radio rows; exactly one chosen, marked and drawn apart; the default (the UN's) first and chosen, and the default
and the UN recognition that row's alone; each row names this scenario's leader and the part it administers and reads all
it shows; rows at least 40 pt; one radio per row at its start, filled and cyan on the chosen row alone; no dialog; the facts population
and difficulty, the difficulty in its chip's colour; the card and the chosen chip the same country (names and flags), the
chip first, the count equal to the chips; the search field 12 pt from the card and the card's top aligned with it or 8 pt under it; the lead line from
the dot (inside the country, whose highlight box is the placement box) to the card's head, crossing no panel and no drawn
map name; no drawn map name cut by the search field's or the card's edges or in the chip row. Its report names its inputs (the map image and the flag included) and binds its PNGs; `--selftest` (47 plants,
one on iPhone 17 Pro Max and one on iPhone 16 Pro) and `check_screen.py` must pass.
