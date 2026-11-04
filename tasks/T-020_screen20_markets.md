# T-020: Screen 20, the markets panel

## The need
§5.1: goods (20 traded), industries (25 types) and the trade through chokepoints with their disruption; screen 6's brief
moved «markets per good and industries» and «chokepoint exposure and its disruption» to this screen.

## Evidence
`design_doc/final_design.md` §5.1 (goods, industries, landed import price with exposure × disruption × reroute, the
chokepoints, the shortage index); screen 6 (imports «قمح · آلات · وقود مكرر · سيارات», exports «نفط وغاز · كيماويات ·
منسوجات · غذاء», Suez fees 4.8 billion $); screen 16 (wheat at its highest since 2008). Values are illustrative.

## Scope
A full panel in the economy section (its identity, its dock item open), opened from the economy panel; three tabs:
السلع, الصناعات, الممرات. Out of scope: the full list of 20 goods (a link), the Markets map mode (screen 19's tool).

## Acceptance criteria
1. السلع: the wheat shock (amber with its icon), food inflation, the shortage index; Egypt's six key goods with the world
   price over a year: a rise is amber for an import and blue for an export, its arrow agreeing, said in words.
2. الصناعات: the six largest single industries of §5.1 by capacity used, sorted, each bar at its share, a share below
   70% said «تشغيل منخفض» in words, the margin falling with capacity used; a link to all 25.
3. الممرات: Suez, Bab el-Mandeb, Hormuz with the share of Egypt's trade and the disruption; Suez fees = screen 6's.
4. Gate: 0 issues on 7 phones, self-test, `check_screen.py` PASS; three independent read-only reviews, every confirmed
   finding fixed.
