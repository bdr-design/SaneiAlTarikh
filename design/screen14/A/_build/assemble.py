"""Build design/screen14/A/index.html (the military map, D-15) from screen 4 A's page (the approved B3 play screen with
opaque panels and the map): the province sheet and Cairo's selection layer come out; the map mode reads «عسكرية»; the
unit tokens, the route and the order bar (units.html, orders.html, units.css) go in; units.js replaces the sheet and map
placement code (placeUnits picks the zoom and position; the tokens glide in the live view).
URL: &state=order (default: the western army selected and ordered to Salloum) | idle (nothing selected);
&t=0..1 freezes the march at that share (the checker's views), without &t the clock runs (&loop=0 stops after arrival,
&motion=reduce steps a day at a time).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
t = (R / 'design/screen4/A/index.html').read_text(encoding='utf-8')


def sub(old, new, n=1):
    global t
    assert t.count(old) == n, (old[:60], t.count(old))
    t = t.replace(old, new)


def cut(start, end, new, keep_end=True):
    global t
    assert t.count(start) == 1, start[:60]
    a = t.index(start)
    b = t.index(end, a)
    t = t[:a] + new + (t[b:] if keep_end else t[b + len(end):])


sub('<title>لوحة المحافظة A</title>', '<title>الخريطة العسكرية</title>')
sub("     &tab=politics|society|economy|security opens that tab of the province sheet (default politics = «السياسة»).\n",
    "     &state=order|idle, &t=0..1 (a frozen share of the march; without it the clock runs), &loop=0, &motion=reduce:\n"
    "     the military map of screen 14 (D-15).\n")
sub("    r.dataset.tab = ['politics', 'society', 'economy', 'security'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'politics';\n", "")
# the screen's own CSS after the base styles
sub('</style>\n</head>', (S / 'units.css').read_text(encoding='utf-8') + '</style>\n</head>')
# icons: generic unit glyphs and the orders
SYMBOLS = """    <!-- military map (screen 14): the orders (the units are the owner's images) -->
    <symbol id="i-move" viewBox="0 0 24 24"><path d="M4 12h15"/><path d="M14 7l5 5-5 5"/></symbol>
    <symbol id="i-halt" viewBox="0 0 24 24"><path d="M8.6 3.75h6.8l4.85 4.85v6.8l-4.85 4.85H8.6l-4.85-4.85V8.6z"/><path d="M8.5 12h7"/></symbol>
    <symbol id="i-pin" viewBox="0 0 24 24"><path d="M12 21s-6.25-5.6-6.25-10.75a6.25 6.25 0 0 1 12.5 0C18.25 15.4 12 21 12 21z"/><circle cx="12" cy="10.25" r="2.25"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></symbol>
"""
sub('  </defs>', SYMBOLS + '  </defs>')
# no province is selected: Cairo's selection layer comes out
cut('  <!-- the tapped province: Cairo Governorate', '</div>\n\n<div class="hud">', '', keep_end=True)
sub('</div>\n\n<div class="hud">', '</div>\n' + (S / 'units.html').read_text(encoding='utf-8') + '\n<div class="hud">')
# the map mode is the military one
sub('<span><span class="k">الخريطة:</span> سياسية</span>', '<span><span class="k">الخريطة:</span> عسكرية</span>')
# the province sheet comes out; the order bar sits after the dock
cut('  <!-- Province panel: tabbed side sheet from the right -->', '  </section>\n', (S / 'orders.html').read_text(encoding='utf-8'), keep_end=False)
# the page script: units.js replaces the sheet and map placement code (fitTop and frost stay)
cut('  /* ---------- Province sheet ---------- */', '  /* Frosted glass for the mockup render.', (S / 'units.js').read_text(encoding='utf-8') + '\n')
sub('.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(placeMap).then(frost)', '.then(fitTop).then(startUnits).then(frost)')
(Path(D) / 'index.html').write_text(t, encoding='utf-8')
print('assembled', Path(D) / 'index.html')
