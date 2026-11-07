"""Build design/screen24/A/index.html (the government chooser, D-29) from the approved screen 3 page 2 (the country
picker on the world map): Côte d'Ivoire selected instead of Egypt (its highlight, the lead line and the map placed on it),
its chip first and chosen, and the card asking which of its two governments to play (card.html, chooser.css). The
overlay is page 2's with Egypt drawn as any other country.
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import json
import re
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
P2 = R / 'design/screen3/p2B'
t = (P2 / 'index.html').read_text(encoding='utf-8')
civ = json.loads((S / 'civ_path.json').read_text())


def sub(old, new, n=1):
    global t
    assert t.count(old) == n, (old[:70], t.count(old))
    t = t.replace(old, new)


# the overlay: Egypt's highlight (fill, glow, line) back to a plain border, as every other country
ov = (P2 / 'world_d1_overlay_declutter.svg').read_text(encoding='utf-8')
eg = re.findall(r'<path d="(M1445\.8,615\.6[^"]*)"[^>]*/>', ov)
assert len(eg) == 3
ov = re.sub(r'<path d="M1445\.8,615\.6[^"]*"[^>]*/>', '', ov)
ov = ov.replace('</svg>', f'<path d="{eg[0]}" fill="none" stroke="#7FE9FF" stroke-opacity="0.55" stroke-width="0.9"/></svg>')
(Path(D) / 'world_d1_overlay_civ.svg').write_text(ov, encoding='utf-8')
sub('src="world_d1_overlay_declutter.svg"', 'src="world_d1_overlay_civ.svg"')
# the selected country's highlight: Côte d'Ivoire
hl = re.findall(r'(    <path d="M1445\.8,615\.6[^"]*")', t)
assert len(hl) == 3
t = re.sub(r'<path d="M1445\.8,615\.6[^"]*"', '<path d="' + civ['d'] + '"', t)
# placement and the lead line on Côte d'Ivoire (the variable keeps its name: it is the selected country)
sub(re.search(r'  var EG = \{[^}]*\};', t).group(0),
    "  var EG = { x0: %s, x1: %s, y0: %s, y1: %s, cy: %s, ax: %s, ay: %s };   /* the selected country: Côte d'Ivoire */"
    % (civ['x0'], civ['x1'], civ['y0'], civ['y1'], civ['cy'], civ['cx'], civ['cy']))
# the card
a = t.index('  <!-- The selected country, linked to Egypt on the map -->')
b = t.index('  </section>', a) + len('  </section>')
t = t[:a] + (S / 'card.html').read_text(encoding='utf-8').rstrip('\n') + t[b:]
# the chips: Côte d'Ivoire first and chosen, Egypt one of the others; the count
sub('<button class="chip glass ctl tap on" role="option" aria-selected="true"><span class="flag"><img src="../../shared/flags/eg.svg" alt="">',
    '<button class="chip glass ctl tap on" role="option" aria-selected="true"><span class="flag"><img src="../../shared/flags/ci.svg" alt=""></span><span class="tx"><span class="nm">ساحل العاج</span><span class="df d4">صعبة جدًا</span></span></button>\n      '
    '<button class="chip glass ctl tap" role="option"><span class="flag"><img src="../../shared/flags/eg.svg" alt="">')
sub('<span class="cnt">14 دولة</span>', '<span class="cnt">15 دولة</span>')
sub('aria-label="الدولة المختارة: مصر"', 'aria-label="الدولة المختارة: مصر"', 0) if 'aria-label="الدولة المختارة: مصر"' not in t else None
# the chooser's CSS
i = t.index('</style>')
t = t[:i] + (S / 'chooser.css').read_text(encoding='utf-8') + t[i:]
t = t.replace('<title>', '<title>', 1)
(Path(D) / 'index.html').write_text(t, encoding='utf-8')
print('assembled', Path(D) / 'index.html')
