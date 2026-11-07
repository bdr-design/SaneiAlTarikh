# Screen 19 brief: the map modes

Visual mockup. NOT app code. The build is `../screen19/A`. Task card: `tasks/T-019_screen19_map_modes.md`. Designed and
approved by Claude under the owner's delegation, to the owner's rule `mapCentral`.

## The moment
1 January 2011, the game running. The player tapped «الخريطة: سياسية» and chose «الأمن»: the map shows unrest per
province at once, and the chooser stays open beside it.

## Frame
The approved panel sheet from the right (shared builder and checker), one body, no tab row, no section. The HUD's mode
button reads «الخريطة: الأمن» (aria-expanded) in B3's label width. The map: satellite base, the mode layer
(`map_mode_security.svg` from `tools/mapmode.py`, Natural Earth admin-1, fill-opacity 0.55, five bands of the inferno
palette, lightness only rising), then the borders and labels as approved but without the player's teal fill
(`map_overlay_mode.svg`; the glow stays), so Egypt's bands read as the legend.

## Content
Header: flag, «الخريطة», «أوضاع الخريطة · المعروض: الأمن», the layers emblem, close («إغلاق أوضاع الخريطة، يبقى وضع الأمن»).
- «الأمن: الاضطرابات في كل محافظة»: the legend bar (five bands, right to left), the edges 0 25 40 60 75 100, and
  «من 40: احتجاجات · من 60: احتجاجات واسعة · من 75: تمرد».
- «الوضع»: 13 tiles in two columns (36 pt, icon and name): سياسية، العلاقات، التكتلات، الاقتصاد، الأسواق، الأمن، الأحزاب (§6.6 «السياسة», renamed so it is not confused with «سياسية»)،
  عسكرية، الاستخبارات، البنية التحتية، الموارد، السكان، مخاطر المناخ; «الأمن» chosen (white).
- «العرض»: الحدود (فعلية | قانونية), حدود المحافظات (تظهر | تختفي), الأسماء (قليلة | متوسطة | كثيرة).

Natural Earth has 27 Egyptian governorates (Helwan and 6 October merged back), screen 8 counts the 2011 29: the layer draws
the 27; screen 8's eight named governorates carry its values, the other 19 fall in its «32 و48». Tunisia is set by hand for 1 January 2011 (the uprising centred on Sidi
Bouzid, Kasserine and Gafsa, the three highest); Libya stays under the protests edge (40: its protests began in February).

## Gate
`screen19/A/_build/render.js`: the shared checker plus the modes, the choice, the layer and its file, the legend, the
options. Three independent read-only reviewers.
