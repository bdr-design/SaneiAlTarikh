"""Build design/screen28/A/index.html (the country info card: Sudan, 1 January 2011) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS and
markup (card.css, sheet.html), in the foreign section (its identity, its dock item open). The tapped country outlined on
the map (sudan.json: Sudan with the south, from Natural Earth, in the MENA base's Miller space; the base ends at 10° N),
the map placed so the country's north is in view and clear of every panel.
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import json
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SD = json.loads((S / 'sudan.json').read_text())
N = SD['north']
SYMBOLS = """    <symbol id="i-hands" viewBox="0 0 24 24"><path d="M2.5 11.5 6 8l3 1.5 3-2 3 2 3-1.5 3.5 3.5"/><path d="M6 8v5.5l4.5 4a1.5 1.5 0 0 0 2.1 0l5.4-4.75V8"/><path d="M9.5 13.5l2 1.75M12 11.5l2.5 2"/></symbol>"""
SUBS = [
    ('<img src="map_overlay_cairo.svg" alt="">', '<img src="map_overlay_cairo.svg" alt="">\n  '
     '<svg class="sel-country" viewBox="0 0 1688 1097" preserveAspectRatio="none" aria-hidden="true"><path d="%s"/></svg>' % SD['d']),
    # the map's focus: the country's north (to 16° N), clear of every panel; the zoom 0.6 to 1.1 x the play screen's
    ('    var EG = { x0: 583, y0: 424, x1: 945, y1: 732, cx: 764, cy: 578 };',
     '    var EG = { x0: %.1f, y0: %.1f, x1: %.1f, y1: %.1f, cx: 764, cy: 578 };   /* screen 28: Sudan\'s north; the anchor stays Egypt\'s centre */'
     % (N['x0'], N['y0'], N['x1'], N['y1'])),
    ('    for (z = 1.3; z >= 0.8 - 1e-6 && !pick; z -= 0.05)', '    for (z = 1.1; z >= 0.6 - 1e-6 && !pick; z -= 0.05)'),
]
panel_page.build(R, S, D, title='السودان', sec='foreign', dock_label='الخارجية', dock_icon='i-globe',
                 tabs=['card'], fit_tab=None, css=['card.css'], symbols=SYMBOLS, extra_subs=SUBS)
