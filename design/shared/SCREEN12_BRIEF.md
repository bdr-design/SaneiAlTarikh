# Screen 12 brief: the research panel («البحث»)

Visual mockups. NOT app code. The build is `../screen12/A`. Task card: `tasks/T-012_screen12_research.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «البحث» (§6.5: 8 domains, focus, cooperation and licences; §5.7: 8 domains × 15 levels; 1–7 to about 2025, 8–11 to about 2050, 12–15 projected «مُسقَط»). Built with the shared builder and checker. Identity lime `#9EDB5B` on chrome only. Three tabs, so the tab row has three columns. Header: flag, «البحث», the chip «التركيز: الطاقة», the sub-line «مصر · 8 مجالات».

## Tabs
1. **نظرة عامة:** البحث +18 شهريًا with «↑ +1 شهريًا» in blue (the HUD's value and rising arrow), الإنفاق 700 مليون $ (the economy panel's «البحث العلمي» line; 0.3% of GDP 219), المتوسط 3.6 / 15 (the 8 domains' mean); «قيد البحث»: الطاقة · نحو المستوى 5 (the focus's level 4 + 1), 62%, ends in 14 months (in the focus); one action: «رفع الإنفاق على البحث» (300 مليون $ a year, «↑ البحث +8», in proportion to the 700).
2. **المجالات:** the 8 domains, each a row of name, a teal bar of its level out of 15 and the level, the focus marked «التركيز»: الطاقة 4, الصناعة والتصنيع 4, الصحة والزراعة 4, الأنظمة البرية 4, الحاسوب والإلكترونيات 3, الجو والبحر والفضاء 3, الصواريخ والردع 3, السيبراني والاستخبارات 4 (§5.7's names); the note on the level eras; «تغيير التركيز» as a link row.
3. **التعاون:** agreements (Russia: peaceful nuclear energy, the 2008 agreement (Dabaa's 2009 site studies were a foreign consultant's, not Russia's); Ukraine: an observation satellite launched in 2007, contact lost in 2010; the EU: joint research funding) and licences (US: main battle tank assembly since 1992, without its name); one action: cooperation with China in energy (5 of influence, «↑ التقدم +10%»).

## Gate
`screen12/A/_build/render.js` uses the shared checker and adds: the brief's strings; the rate = the HUD's; the project's bar and its domain = the focus; the 8 domains, bars at their levels, read whole, their mean = the headline, the focus marked once; agreements read whole. Pairs, not loose strings (after the review of 2026-11-02): each headline's label, value and line; each domain's name and level in order; the focus one row, the header's, at its level, and the project toward its next level; the research trend = the HUD's arrow; all bars on one track; each agreement's name and line under its own section. `--selftest` and `check_screen.py` must pass.
