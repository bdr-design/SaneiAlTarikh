# Screen 24 brief: the government chooser (D-29)

Visual mockup. NOT app code. The build is `../screen24/A`. Task card: `tasks/T-026_screen24_government_chooser.md`.
Designed and approved by Claude under the owner's delegation, to the owner's rules `mapCentral` and `ownerProxy`.

## When it appears
The new game's page 2 (screen 3 p2B), when the chosen country had more than one government on 1 January 2011 (D-29):
the chooser is part of the country card, never a dialog over the map. The example is Côte d'Ivoire, the case D-29 names.

## The card
- Head: Côte d'Ivoire's flag, «ساحل العاج», «مختارة».
- «اختر الحكومة» (the radio group's name, read by VoiceOver): two rows of 40 pt (44 pt touch), the default first and
  chosen (a teal outline and fill, the check mark): «حكومة الحسن واتارا» · «تعترف بها الأمم المتحدة · تدير الشمال»;
  «حكومة لوران غباغبو» · «تدير الجنوب وأبيدجان». VoiceOver reads each row whole; the default says «الافتراضية».
- Facts: السكان 20.2 مليون; الصعوبة صعبة جدًا (four bars, amber).
- The line «حكومتان: نزاع على السلطة منذ نوفمبر 2010» with the warning icon.

## The page
Page 2's frame and rules: Côte d'Ivoire highlighted on the world map (its outline from Natural Earth admin-1, the same
highlight as Egypt on page 2), the lead line from it to the card, its chip first and chosen («15 دولة»); Egypt drawn as
any other country. The chooser makes the card taller, so the search field sits left of the card, 12 pt apart.

## Facts (1 January 2011)
After the run-off of 28 November 2010 both Alassane Ouattara and Laurent Gbagbo claimed the presidency. The UN
recognised Ouattara (the General Assembly accepted his ambassador on 23 December 2010); his prime minister Guillaume
Soro's Forces Nouvelles held the north; Gbagbo held the south, Abidjan and Yamoussoukro with the army. Population about
20.2 million (2011). Neutral words; no judgement.

## Gate
`screen24/A/_build/render.js` is page 2's checker (layout, safe areas, hit boxes, contrast, the strip, the map names)
plus the chooser's checks: a radio group named «اختر الحكومة» of two radio rows; exactly one chosen, marked and drawn;
the default (the UN's) first and chosen and said; each row names its leader and the part it administers and reads all it
shows; rows at least 40 pt; the check mark follows the choice; no dialog; the card and the chosen chip the same country.
Its report names its inputs and binds its PNGs; `--selftest` and `check_screen.py` must pass.
