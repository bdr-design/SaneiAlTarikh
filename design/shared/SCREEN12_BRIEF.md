# Screen 12 brief: the research panel («البحث»)

Visual mockups. NOT app code. The build is `../screen12/A`. Task card: `tasks/T-012_screen12_research.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «البحث» (§6.5: 8 domains, focus, cooperation and licences; §5.7: 8 domains × 15 levels; 1–7 to about 2025, 8–11 to about 2050, 12–15 projected «مُسقَط»). Built with the shared builder and checker. Identity lime `#9EDB5B` on chrome only. Three tabs, so the tab row has three columns. Header: flag, «البحث», the chip «التركيز: الطاقة», the sub-line «مصر · 8 مجالات».

## Tabs
1. **نظرة عامة:** البحث +18 شهريًا (the HUD's), الإنفاق 900 مليون $ (0.4% of GDP), المتوسط 3.6 / 15 (the 8 domains' mean); «قيد البحث»: الطاقة · المستوى 5, 62%, ends in 14 months (in the focus); one action: «رفع الإنفاق على البحث» (300 مليون $ a year, «↑ البحث +6»).
2. **المجالات:** the 8 domains, each a row of name, a teal bar of its level out of 15 and the level, the focus marked «التركيز»: الطاقة 4, الصناعة والتصنيع 4, الصحة والزراعة 4, الأنظمة البرية 4, الحاسوب والذكاء 3, الجو والبحر والفضاء 3, الصواريخ والردع 3, الأمن الإلكتروني 4; the note on the level eras; «تغيير التركيز» as a link row.
3. **التعاون:** agreements (Russia: peaceful nuclear energy, the Dabaa site studies; Ukraine: an observation satellite launched in 2007; the EU: joint research funding) and licences (US: main battle tank assembly since 1992, without its name); one action: cooperation with China in energy (5 of influence, «↑ التقدم +10%»).

## Gate
`screen12/A/_build/render.js` uses the shared checker and adds: the brief's strings; the rate = the HUD's; the project's bar and its domain = the focus; the 8 domains, bars at their levels, read whole, their mean = the headline, the focus marked once; agreements read whole. `--selftest` and `check_screen.py` must pass.
