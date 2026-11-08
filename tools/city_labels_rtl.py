"""Set every city name on the shared MENA overlay (design/shared/map_mena_d1_overlay.svg) west of its dot.

The overlay draws each city's name with text-anchor="start" 10 px left of the dot, which is the right-to-left placement
(the name to the west of the dot). Rendered left to right, the name starts left of the dot and runs over it, hiding the
dot under the name (Cairo alone had been fixed, in screen 4's copy). This adds direction="rtl" to every city name (the
<text> drawn right after each <circle>), so each sits west of its dot with a 10 px gap. Idempotent.
Usage: python3 -I tools/city_labels_rtl.py"""
import re
from pathlib import Path

SVG = Path(__file__).resolve().parents[1] / 'design/shared/map_mena_d1_overlay.svg'
s = SVG.read_text(encoding='utf-8')
n = 0
if s.count('text-anchor="start" direction="rtl"') == 11:
    raise SystemExit('city names already right to left: 11')


def fix(m):
    global n
    circle, text = m.group(1), m.group(2)
    cx, cy = (int(re.search(f' {a}="([0-9.]+)"', circle).group(1)) for a in ('cx', 'cy'))
    assert text.startswith(f'<text x="{cx - 10}" y="{cy + 7}"') and text.endswith('text-anchor="start"'), text
    n += 1
    return circle + text + ' direction="rtl"'


s2 = re.sub(r'(<circle [^>]*/>\s*)(<text [^>]*?text-anchor="start")(?=>)', fix, s)
assert n == 11, n
SVG.write_text(s2, encoding='utf-8')
print('city names set right to left:', n)
