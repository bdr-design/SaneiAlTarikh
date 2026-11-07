# T-026: Screen 24, the government chooser (D-29)

## The need
D-29 (the owner): any government that administers a province on the start date is playable, chosen from a small chooser;
the default is the holder of the country's seat or representation at the UN. The new-game flow (§6.9: scenario →
country on the world map → government chooser if needed → options) needs that chooser designed.

## Evidence
Decisions D-29 («rivalGovernments») and D-8 («disputed2011»: on 1 January 2011 the Palestinian Authority is playable in
the West Bank, and Gaza is administered by a Hamas-led de facto government inside polity pse); design doc §6.9 and the
D-29 row; the approved screen 3 page 2 (the country card on the world map). The example is Palestine on 1 January 2011:
the Palestinian Authority (Ramallah; President Mahmoud Abbas; Prime Minister Salam Fayyad) and the de facto government
in Gaza (Ismail Haniyeh). Neutral words, no judgement; values illustrative.

## Scope
A variant of screen 3 page 2: the country card of a country with two governments holds the chooser (a radio group of
two rows, the default first and chosen), in the card, never a dialog over the map (mapCentral). Out of scope: three or
more governments (the same rows, more of them), the options page.

## Acceptance criteria
1. The card names the country and asks «اختر الحكومة»; the two governments as rows, each with its seat and its leader;
   exactly one chosen (the default: the UN representation), a radio group read by VoiceOver.
2. The facts under it are the chosen government's (its population and area of control, difficulty).
3. The map shows both areas with the chosen one marked; Egypt's approved page unchanged.
4. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; six independent read-only reviews, every confirmed
   finding fixed; the owner's proxy for any owner question.
