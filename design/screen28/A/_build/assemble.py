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
    # the country's name on its north, in the map focus (the base map sets it at 13° N, south of the focus)
    ('<text x="740" y="992" ', '<text x="700" y="850" '),
    # the map's focus: the country's north (to 15° N, Khartoum and its name included), clear of every panel; the
    # camera centres the focus (not Egypt) in the open map; the zoom 0.6 to 1.1 x the play screen's
    ('    var EG = { x0: 583, y0: 424, x1: 945, y1: 732, cx: 764, cy: 578 };',
     '    var EG = { x0: %.1f, y0: %.1f, x1: %.1f, y1: %.1f, cx: 764, cy: 578 };   /* screen 28: Sudan\'s north; the anchor stays Egypt\'s centre */\n'
     '    var FC = { x: %.1f, y: %.1f };                              /* screen 28: the focus centre the camera aims at */'
     % (N['x0'], N['y0'], N['x1'], N['y1'], (N['x0'] + N['x1']) / 2, (N['y0'] + N['y1']) / 2)),
    ('        var cost = (cx - tx) * (cx - tx) + 2 * (cy - ty) * (cy - ty);',
     '        var fx = cx + (FC.x - EG.cx) * s, fy = cy + (FC.y - EG.cy) * s, cost = (fx - tx) * (fx - tx) + 2 * (fy - ty) * (fy - ty);'),
    # the controls' 44 pt hit boxes (their ::before, as the shared checker measures them) keep clear of the focus too
    ("    var top = $('.top').getBoundingClientRect()",
     "    var HITS = Array.prototype.filter.call(document.querySelectorAll('.hud .tap'), function (e) { return e.getClientRects().length; }).map(function (e) {\n"
     "      var r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before'), mm = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);\n"
     "      var w = parseFloat(ps.width), h = parseFloat(ps.height); if (!(w > 0 && h > 0)) return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };\n"
     "      var x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + mm.e, y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + mm.f;\n"
     "      return { left: x0, top: y0, right: x0 + w, bottom: y0 + h }; });   /* screen 28: the hit boxes, for the focus only (labels stay with the panels) */\n"
     "    var top = $('.top').getBoundingClientRect()"),
    ('      return !obs.some(function (o) { return !(r.x1 <= o.left || r.x0 >= o.right || r.y1 <= o.top || r.y0 >= o.bottom); });',
     '      return !obs.concat(HITS).some(function (o) { return !(r.x1 <= o.left || r.x0 >= o.right || r.y1 <= o.top || r.y0 >= o.bottom); });'),
    ('    for (z = 1.3; z >= 0.8 - 1e-6 && !pick; z -= 0.05)', '    for (z = 1.1; z >= 0.6 - 1e-6 && !pick; z -= 0.05)'),
]
panel_page.build(R, S, D, title='السودان', sec='foreign', dock_label='الخارجية', dock_icon='i-globe',
                 tabs=['card'], fit_tab=None, css=['card.css'], symbols=SYMBOLS, extra_subs=SUBS)
