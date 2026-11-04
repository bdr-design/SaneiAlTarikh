# T-021: Screen 21, the relation sheet

## The need
§5.5's pair state (opinion, treaties, recognition of the state and of the government, sanctions) for one country, opened
from the foreign panel's relations list (screen 10 rows say «يفتح علاقتها»).

## Evidence
`design_doc/final_design.md` §5.5; R9 (every value explained by its terms); screen 10's Ethiopia row (−22, «خلاف مياه
النيل», falling) and influence 62. History: the Nile Basin Cooperative Framework (Entebbe) signed by Ethiopia in 2010; the
1959 Nile agreement. Values illustrative.

## Scope
A side sheet in the foreign section (identity, dock item open), the map central. Out of scope: proposing treaties (the
treaties tab of screen 10), the Relations map mode (screen 19's tool).

## Acceptance criteria
1. Ethiopia's flag and name; the relation, its line and trend as screen 10's row; our influence as screen 10's.
2. Recognition, treaties and sanctions in the status cells.
3. The causes add up to the relation (= the headline = the sum row), sorted by size within their sign, each signed,
   coloured and said in words.
4. Three actions with their cost and effect; chips agreeing with their words.
5. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; three independent read-only reviews, every confirmed
   finding fixed.
