# Screen 10 brief: the foreign panel («الخارجية»), with the UN Security Council

Visual mockups. NOT app code. The build is `../screen10/A`. Task card: `tasks/T-010_screen10_foreign.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «الخارجية» (design doc §6.5: relations, treaties, blocs, sanctions, aid and arms, recognition, the UN Security Council; state and government recognition shown separately). Built with the shared builder and checker. Identity royal blue `#5B86F2` on chrome only. Header: flag, «الخارجية», the chip «معترف بها», the sub-line «مصر · عضو في الأمم المتحدة».

## Tabs
1. **نظرة عامة:** النفوذ 62 / 100 (the HUD's, «↑ +1 شهريًا» in blue with its arrow); علاقات جيدة: 41 دولة (above +40); متوترة: 3 دول (below −40). The status table: recognition of the state and of the government (separately), sanctions «لا توجد», the Non-Aligned Movement «الرئاسة» (Egypt chaired it 2009–2012). One action: «وساطة بين الفصائل الفلسطينية» (10 of influence, 6 months; «↑ النفوذ +4» when it succeeds).
2. **العلاقات:** the main relations best first, each a 44 pt row (a button with a chevron: a tap opens the relation's agreements, aid, arms and sanctions) of the country and its standing in words, then the value (−100..100) with its sign: الولايات المتحدة +62 (ally, military aid), السعودية +58, الاتحاد الأوروبي +44, الصين +30 (rising: blue with an up arrow), إسرائيل +12 (cold peace, 1979), إثيوبيا −22 (the Nile water dispute after the 2010 Entebbe agreement; falling: amber with a down arrow), قطر −30 (media tension), الجزائر −41 (the November 2009 football crisis), سوريا −44 (cool since 2006), إيران −48 (no embassies since 1980). A steady relation has no arrow (VoiceOver says «دون تغير»). The three below −40 are the overview's «متوترة: 3».
3. **المعاهدات:** the blocs (the Arab League's host state, the African Union, the Non-Aligned Movement's chair, the Organisation of the Islamic Conference (renamed in June 2011), the Union for the Mediterranean's co-presidency (2008–2012), COMESA); the treaties (peace with Israel 1979 and its Sinai limits, the EU partnership 2004, the QIZ 2004 with its Israeli content, the 1959 Nile agreement, Egypt's 55.5 billion m³); aid and arms (1.6 مليار $ a year in, of which 1.3 military; US arms; technical aid to Africa out; no arms out).
4. **مجلس الأمن:** the 2011 Council (the five permanent members; Bosnia, Brazil, Gabon, Lebanon, Nigeria to 2011; Germany, India, Portugal, South Africa, Colombia to 2012); Egypt not a member (last 1996–1997; the nearest possible term 2016–2017), Lebanon the Arab seat; the agenda items that touch Egypt (Sudan's southern referendum, Iran's sanctions); one action: «مشروع قرار بشأن فلسطين» (15 of influence, with Lebanon and Gabon, «↑ الأصوات +2»).

## Rules
- Relations: each value has its sign and a word; a rise is blue with an up arrow, a fall amber with a down arrow, a steady one has no arrow. VoiceOver says «سالب» exactly for a negative value.
- Each label shows its own value: the checker compares every label with its value, so a swap cannot pass.
- Every row (relation, treaty, agenda item) is read whole by VoiceOver.

## Gate
`screen10/A/_build/render.js` uses the shared checker and adds: the brief's strings per tab; influence = the HUD's; relations best first, within −100..100, their arrows and colours against their trends, read whole with the sign; the Council's 5 + 5 + 5 seats; treaties and agenda items read whole. `--selftest` and `check_screen.py` must pass.
