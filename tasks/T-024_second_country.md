# T-024: The second-country test (Saudi Arabia and long names)

## The need
Every screen was designed with Egypt. The game lets the player take any 2011 government (D-29), so the HUD and every
panel must hold another country's names, including the longest, without overflowing or covering a neighbour.

## Evidence
`tools/stress_names.js` renders the pages that name the player's country (the HUD on screen 1 B3, and screens 4 R, 5, 6,
8, 9, 10, 11, 12, 13, 14, 18 A, 20, 23) on the 7 phones with three name sets in place of Egypt's: Saudi Arabia
(«السعودية», «عبدالله بن عبدالعزيز», «ملكية مطلقة», the state panel's line «خادم الحرمين الشريفين الملك عبدالله · منذ 2005»,
the province «المنطقة الشرقية»), a long name («أفريقيا الوسطى») and the longest («سانت فينسنت والغرينادين», «ملكية
دستورية برلمانية»). First run: 78 of 294 renders had a header sub-line wider than its box, and the HUD's regime label ran
out of its box on one phone while the row still counted as fitting.

## Scope
Two shared rules and a registry rule; no new screen. Out of scope: other scripts' names (the game is Arabic only).

## Acceptance criteria
1. The HUD's fit level also steps when a name, leader or regime label runs out of its box (B3 and 4 A's `fitTop`), so the
   card drops the leader and regime first, then the name, as designed; Egypt's renders unchanged.
2. A panel header's sub-line gives way at its end with an ellipsis when it is too long (panel.css); its text stays whole
   for VoiceOver; Egypt's renders unchanged.
3. The registry gives every polity a short name of at most 14 characters for the HUD and the sub-lines (the design doc);
   the full name stays in the state panel and the country card.
4. `tools/stress_names.js`: 0 issues on the 294 renders; the full gate on all 27 screens PASS; six independent read-only
   reviews, every confirmed finding fixed.
