# T-032: Screen 29, sources and rights

## The need
The pending-design list (§6.1) names «credits and sources». §4.8 says stage 50 generates «المصادر والحقوق» with the data
citations, the image registry and the design values; R5 lists the design-target values there as «قيم تصميمية»; screen 13's
about tab has the row «المصادر والحقوق» with no screen behind it. The licences require attribution (CC BY 4.0, CC BY 3.0
IGO, MIT, NASA's credit and no-endorsement terms).

## Evidence
design_doc/final_design.md §4 (the sources table with each licence), §4.8, R5, R2 (a pending licence blocks release builds),
§2.5 (the system Arabic font), D-26 (ETOPO not used), §5.2 (the unrest offset's half-life), §5.4 (the capture rate, recorded there for this screen: 15%), CREDITS.md (NASA's credit, the flags'
licence and use), the approved screen 13 (the row, the version) and screen 23 (a sheet opened from «المزيد»).

## Scope
A side sheet in the «المزيد» section's frame with three tabs: the data sources, the maps and images, the design values;
each source with what it feeds and its licence. Out of scope: the generator (stage 50), help, privacy.

## Acceptance criteria
1. Every source shown gives what it feeds and the licence §4 gives it; every §4 source whose licence asks for credit is shown; NASA's credit and no-endorsement line; the flags
   for identification only; the images with their registry; no source with a pending licence.
2. The design values are said to be no data and outside the realism comparison, each with its value and section.
3. A side sheet in «المزيد»'s frame, its own emblem, opened from screen 13's row and read as it; nothing opens the web;
   never a dialog over the map; Western digits.
4. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews, every confirmed
   finding fixed; a verification review.
