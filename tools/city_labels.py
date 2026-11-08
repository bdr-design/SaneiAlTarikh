"""Place the city names on the shared MENA overlay (design/shared/map_mena_d1_overlay.svg): each name beside its dot,
never over it. Idempotent: it rewrites every city name's placement from the table below.

The overlay draws each city's dot (<circle>) and right after it the name (<text>). Arabic map practice puts the name
west of the dot, its end 10 px (map units) west of the dot's centre, about 2-4 pt clear of the dot. The names render
right to left (direction="rtl"), so text-anchor="start" is the name's east end. Where the west side falls on the sea,
across a border or on another label, the name goes east of the dot instead (its west end 10 px east of the centre:
text-anchor="end"); and where both sides fall on the sea or a border, south of the dot (centred, its baseline 29 px
under the dot's centre: text-anchor="middle"):
  - طرابلس (south): west of Tripoli is Tunisia (the name would cross the border), east of it the sea;
  - بنغازي: west of Benghazi is the Gulf of Sirte (the name would sit in the sea);
  - الرياض: west of Riyadh is the country name «السعودية».
The country name «العراق» moves 27 px south and 19 px east (still in Iraq) so Baghdad's name, west of its dot, is clear
of it. Every other label is unchanged.
Usage: python3 -I tools/city_labels.py   (then design/screen4/A/_build/make_overlay.py)"""
import re
from pathlib import Path

SVG = Path(__file__).resolve().parents[1] / 'design/shared/map_mena_d1_overlay.svg'
SIDE = {'طرابلس': 'south', 'بنغازي': 'east', 'الرياض': 'east'}   # every other city: west
IRAQ_OLD, IRAQ_NEW = ('x="1131" y="393"', 'x="1150" y="420"')
s = SVG.read_text(encoding='utf-8')
n = 0


def place(m):
    global n
    circle, attrs, name = m.group(1), m.group(2), m.group(3)
    cx, cy = (int(re.search(f' {a}="([0-9.]+)"', circle).group(1)) for a in ('cx', 'cy'))
    attrs = re.sub(r' direction="rtl"', '', attrs)
    side = SIDE.get(name, 'west')
    x, y, anchor = {'west': (cx - 10, cy + 7, 'start'), 'east': (cx + 10, cy + 7, 'end'), 'south': (cx, cy + 29, 'middle')}[side]
    attrs = re.sub(r'^ x="\d+" y="\d+"', f' x="{x}" y="{y}"', attrs)
    attrs = re.sub(r'text-anchor="(start|end|middle)"', f'text-anchor="{anchor}"', attrs)
    assert attrs.startswith(f' x="{x}" y="{y}"') and attrs.endswith(f'text-anchor="{anchor}"'), attrs
    n += 1
    return f'{circle}<text{attrs} direction="rtl">{name}</text>'


s = re.sub(r'(<circle [^>]*/>\s*)<text([^>]*)>([^<]*)</text>', place, s)
assert n == 11, n
if IRAQ_OLD in s:
    i = s.index(IRAQ_OLD)
    assert s[s.index('>', i) + 1:].startswith('العراق<'), 'unexpected label at the Iraq position'
    s = s.replace(IRAQ_OLD, IRAQ_NEW, 1)
assert s.count(IRAQ_NEW) == 1
SVG.write_text(s, encoding='utf-8')
print('city names placed:', n, '(' + ', '.join(f'{k} {v}' for k, v in sorted(SIDE.items())) + '; the rest west)')
