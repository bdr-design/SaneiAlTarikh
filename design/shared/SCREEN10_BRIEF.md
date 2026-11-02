# Screen 10 brief: the foreign panel («الخارجية»), with the UN Security Council

Visual mockups. NOT app code. The build is `../screen10/A`. Task card: `tasks/T-010_screen10_foreign.md`. Designed and approved by Claude under the owner's delegation (`ownerDelegation`, `finishEverything`).

## When it appears
The dock's «الخارجية» (design doc §6.5: relations, treaties, blocs, sanctions, aid and arms, recognition, the UN Security Council; state and government recognition shown separately). Built with the shared builder and checker. Identity royal blue `#5B86F2` on chrome only. Header: flag, «الخارجية», the chip «معترف بها», the sub-line «مصر · عضو في الأمم المتحدة».

## Tabs
1. **نظرة عامة:** النفوذ 62 / 100 (the HUD's, «↑ +1 شهريًا» in blue with its arrow); علاقات جيدة: 41 دولة (above +40); متوترة: 3 دول (below −40). The status table: recognition of the state and of the government (separately), sanctions «لا توجد», the Non-Aligned Movement «الرئاسة» (Egypt chaired it 2009–2012). One action: «وساطة بين الفصائل الفلسطينية» (10 of influence, 6 months; «↑ النفوذ +4» when it succeeds).
2. **العلاقات:** the main relations best first, each a row of the country and its standing in words, then the value (−100..100) with its sign and its trend arrow: الولايات المتحدة +62 (ally, military aid), السعودية +58, الاتحاد الأوروبي +44, الصين +30 (rising, blue), إسرائيل +12 (cold peace, 1979), إثيوبيا −22 (the Nile water dispute after the 2010 Entebbe agreement; falling, amber), قطر −30 (media tension), إيران −48 (no embassies since 1980). A tap opens the relation (agreements, aid, arms, sanctions): its own sheet, next.
3. **المعاهدات:** the blocs (the Arab League's host state, the African Union, the Non-Aligned Movement's chair, the OIC); the treaties that bind (peace with Israel 1979 and its Sinai limits, the EU partnership 2004, the QIZ 2004, the 1959 Nile agreement with Sudan, Egypt's 55.5 billion m³); aid and arms in and out (1.6 مليار $ a year in; US arms; none out).
4. **مجلس الأمن:** the 2011 Council: the five permanent members with the veto, the five elected to 2011 (Bosnia, Brazil, Gabon, Lebanon, Nigeria) and the five to 2012 (Germany, India, Portugal, South Africa, Colombia); Egypt not a member (last 1996–1997, next 2016), Lebanon the Arab seat; the agenda items that touch Egypt (Sudan's southern referendum on 9 January 2011, Iran's sanctions under resolution 1929); a non-member's one action: «حشد التأييد لمشروع قرار» (15 of influence).

## Rules
- Relations: each value has its sign and a word, and a trend arrow; amber only for a fall, blue only for a rise (colour never alone). VoiceOver says «سالب» for a negative value.
- Every row (relation, treaty, agenda item) is read whole by VoiceOver.

## Gate
`screen10/A/_build/render.js` uses the shared checker and adds: the brief's strings per tab; influence = the HUD's; relations best first, within −100..100, their arrows and colours against their trends, read whole with the sign; the Council's 5 + 5 + 5 seats; treaties and agenda items read whole. `--selftest` and `check_screen.py` must pass.
