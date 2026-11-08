"""Build design/screen27/A/index.html (the front and its sectors, §5.4 and RH-11, under the owner's decision «military»)
with the shared panel builder (design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS,
and this sheet's CSS and markup (front.css, sheet.html), in the army section (its olive identity, its dock item open).
Eastern Libya, 10 April 2011: the map placed on the front (front.json: the line, the two sector bands on the coalition's
side and the places, in the MENA base's Miller space 1688 x 1097), the front amber and dashed, the player's sector a teal
band, the partner's a white one; the names at a constant size. Unit tokens are not drawn (screen 14's, the owner's).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import json
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

F = json.loads((S / 'front.json').read_text(encoding='utf-8'))
SYMBOLS = '    <symbol id="i-front" viewBox="0 0 24 24"><path d="M4 19.5c3-2 3.5-5 6-7.5s4.5-2.5 6-5.5 1.5-3 2-3"/><path d="M4 19.5" /><path d="M9 20.5l2-2M14 15.5l2-2M17.5 10l2-1.5"/></symbol>'
lay = ('<svg class="front-lay" viewBox="0 0 1688 1097" preserveAspectRatio="none" aria-hidden="true">'
       '<path class="f-band f-partner" d="%s"/><path class="f-band f-mine" d="%s"/><path class="f-line" d="%s"/></svg>\n  '
       % (F['partner'], F['own'], F['line']))
EAST = {'أجدابيا', 'جالو'}   # the front lies west of these: their names go east of the dot, clear of the line and bands
lbls = ''.join('<i class="f-dot%s" style="--x: %.1f; --y: %.1f"></i><span class="f-lbl city%s" style="--x: %.1f; --y: %.1f">%s</span>'
               % (' enemy' if n in F['enemy'] else '', x, y, ' east' if n in EAST else '', x, y, n) for n, (x, y) in F['places'].items())
lbls += ('<span class="f-lbl tag sec-mine" style="--x: %.1f; --y: %.1f">قطاعك</span><span class="f-lbl tag sec-partner" style="--x: %.1f; --y: %.1f">قطاع الحليف</span>'
         '<span class="f-lbl tag enemy-tag" style="--x: %.1f; --y: %.1f">قوات القذافي</span>'
         % (F['ownMid'][0], F['ownMid'][1], F['partnerMid'][0], F['partnerMid'][1], F['enemyTag'][0], F['enemyTag'][1]))
B = F['box']
SUBS = [
    # the map on the front: its box must be clear of every panel; the zoom 2.6 to 4.6 x the play screen's
    ('<img src="map_overlay_cairo.svg" alt="">', '<img src="map_overlay_cairo.svg" alt="">\n  ' + lay + '<div class="f-labels" aria-hidden="true">' + lbls + '</div>'),
    ('    var EG = { x0: 583, y0: 424, x1: 945, y1: 732, cx: 764, cy: 578 };',
     '    var EG = { x0: %.1f, y0: %.1f, x1: %.1f, y1: %.1f, cx: 764, cy: 578 };   /* screen 27: the front (its box); the anchor stays Egypt\'s centre */' % (B['x0'], B['y0'], B['x1'], B['y1'])),
    # the zoom: 2.6 to 4.6 x the play screen's, never past the engine's maximum 1.0 km/pt (§2.5; one map unit is about
    # 3.24 km here, so the scale stays at or under 3.2)
    ('    for (z = 1.3; z >= 0.8 - 1e-6 && !pick; z -= 0.05)', '    for (z = Math.min(4.6, Math.floor(3.2 / s0 * 10) / 10); z >= 2.6 - 1e-6 && !pick; z -= 0.1)'),
    # the place names' size: the play map's at any zoom
    ("    s.setProperty('--h', H + 'px');", "    s.setProperty('--h', H + 'px'); s.setProperty('--kl', String(0.63 * H / 390));"),
    # the HUD's alert of the day (9-10 April 2011: the government's forces attacked Ajdabiya)
    ('<span class="txt">احتجاجات واسعة في تونس</span>', '<span class="txt">هجوم على أجدابيا</span>'),
    # the date: 10 April 2011, a Sunday
    ('<span class="dow">السبت</span><span class="dmy">1 يناير 2011</span>', '<span class="dow">الأحد</span><span class="dmy">10 أبريل 2011</span>'),
]
# the front's names: any a panel (6 pt around it) or the screen edge would cut is hidden with its dot (as the play map's labels), once the
# map is placed (in the page's ready sequence, before the frost)
FL = ("  function frontLabels() {\n"
      "    var obs = [].filter.call(document.querySelectorAll('.hud .glass'), function (e) { return e.getClientRects().length; }).map(function (e) { return e.getBoundingClientRect(); });\n"
      "    var W = innerWidth, H = innerHeight, sx = Math.max(window.__dev.SIDE, 0);\n"
      "    [].forEach.call(document.querySelectorAll('.f-labels .f-lbl'), function (l) {\n"
      "      var dot = l.previousElementSibling && l.previousElementSibling.classList.contains('f-dot') ? l.previousElementSibling : null;\n"
      "      var rs = [l.getBoundingClientRect()].concat(dot ? [dot.getBoundingClientRect()] : []);\n"
      "      var bad = rs.some(function (b) { return b.left < sx || b.right > W - sx || b.top < 0 || b.bottom > H || obs.some(function (o) { return b.right > o.left - 6 && b.left < o.right + 6 && b.bottom > o.top - 6 && b.top < o.bottom + 6; }); });\n"
      "      l.classList.toggle('cut', bad); if (dot) dot.classList.toggle('cut', bad); });\n"
      "  }\n")
SUBS += [('  function placeMap() {', FL + '  function placeMap() {'),
         ('.then(placeMap).then(frost)', '.then(placeMap).then(frontLabels).then(frost)')]
panel_page.build(R, S, D, title='جبهة شرق ليبيا', sec='army', dock_label='الجيش', dock_icon='i-army',
                 tabs=['front'], fit_tab=None, css=['front.css'], symbols=SYMBOLS, extra_subs=SUBS)
