# T-026: Screen 24, the government chooser (D-29)

## The need
D-29 (the owner): any government that administers a province on the start date is playable, chosen from a small chooser;
the default is the holder of the country's seat or representation at the UN. The new-game flow (§6.9: scenario →
country on the world map → government chooser if needed → options) needs that chooser designed.

## Evidence
Decisions D-29 («rivalGovernments») and D-8 («disputed2011»: on 1 January 2011 the Palestinian Authority is playable in
the West Bank, and Gaza is administered by a Hamas-led de facto government inside polity pse); design doc §6.9 and the
D-29 row (which names this very case); the approved screen 3 page 2 (the country card on the world map). The example is
Côte d'Ivoire on 1 January 2011, the case D-29 names: after the November 2010 run-off two governments claimed the state.
Alassane Ouattara's (recognised by the UN, whose General Assembly accepted his ambassador on 23 December 2010; his prime
minister Guillaume Soro; it administered the north through the Forces Nouvelles) and Laurent Gbagbo's (it administered
the south, Abidjan and Yamoussoukro, with the army). Palestine (D-8) was considered and set aside: at the world map's
scale its two areas are a few points wide. Neutral words, no judgement; values illustrative.

## Scope
A variant of screen 3 page 2: the country card of a country with two governments holds the chooser (a radio group of
two rows, the default first and chosen), in the card, never a dialog over the map (mapCentral). Out of scope: three or
more governments (the same rows, more of them), the options page.

## Acceptance criteria
1. The card names the country and asks «اختر الحكومة»; the two governments as rows, each with its seat and its leader;
   exactly one chosen (the default: the UN representation), a radio group read by VoiceOver.
2. Each row says which part of the country that government administers; the facts under them are the country's
   (population, output) and the chosen government's difficulty.
3. The map highlights the country, linked to the card as screen 3 does for Egypt (the areas are named in words: the
   game's province layer carries each government's provinces); Egypt's approved page unchanged.
4. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews, every confirmed
   finding fixed; the owner's proxy for any owner question.
