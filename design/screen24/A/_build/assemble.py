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
# the composition, the card's placement and the lead line, for the selected country (Côte d'Ivoire): page 2's composition
# block and placeCard() replaced whole
a0 = t.index('  /* Composition. Egypt sits')
a1 = t.index('\n  }\n', t.index('  function placeCard() {', a0)) + len('\n  }\n')
t = t[:a0] + (S / 'place.js').read_text(encoding='utf-8') % (civ['x0'], civ['x1'], civ['y0'], civ['y1'], civ['cy'], civ['cx'], civ['cy']) + t[a1:]
# the card
a = t.index('  <!-- The selected country, linked to Egypt on the map -->')
b = t.index('  </section>', a) + len('  </section>')
t = t[:a] + (S / 'card.html').read_text(encoding='utf-8').rstrip('\n') + t[b:]
# the chips: Côte d'Ivoire first and chosen, Egypt one of the others; the count
sub('<button class="chip glass ctl tap on" role="option" aria-selected="true"><span class="flag"><img src="../../shared/flags/eg.svg" alt="">',
    '<button class="chip glass ctl tap on" role="option" aria-selected="true"><span class="flag"><img src="../../shared/flags/ci.svg" alt=""></span><span class="tx"><span class="nm">ساحل العاج</span><span class="df d4">صعبة جدًا</span></span></button>\n      '
    '<button class="chip glass ctl tap" role="option"><span class="flag"><img src="../../shared/flags/eg.svg" alt="">')
sub('<span class="cnt">14 دولة</span>', '<span class="cnt">15 دولة</span>')
# the map: the selected country's anchor at the band's height (the head's), the line ending on the card's head
sub("    var T = window.__band.ey - EG.cy * s;\n", "    var T = window.__band.ey - EG.ay * s;\n")
sub("    line.setAttribute('x1', ax); line.setAttribute('y1', ay); line.setAttribute('x2', card.left); line.setAttribute('y2', ay);\n",
    "    var hb = window.__band.head, y2 = Math.min(Math.max(ay, hb[0] + 4), hb[1] - 4);   /* ends on the card's head */\n"
    "    line.setAttribute('x1', ax); line.setAttribute('y1', ay); line.setAttribute('x2', card.left); line.setAttribute('y2', y2);\n")
# map names the lead line or its dot's halo would cross are taken out too (as those the bottom row cuts)
sub("      if (why) hidden.push({ t: lb[3], why: why, ink: ink, lb: lb });\n",
    "      if (!why && leadHits(ink, halo)) why = 'lead line';\n"
    "      if (!why && (edgeCut(ink, halo, '.search') || edgeCut(ink, halo, '.sel'))) why = 'panel edge';\n"
    "      if (!why && ink.x1 + halo > strip.left && ink.x0 - halo < strip.right && ink.y1 + halo > chip.top && ink.y0 - halo < chip.bottom) why = 'chip row';\n"
    "      if (why) hidden.push({ t: lb[3], why: why, ink: ink, lb: lb });\n")
sub("  function declutter() {\n",
    "  /* screen 24: does the lead line (sampled every point, 1.5 pt each side) or its dot's halo (7 pt) touch an ink box? */\n"
    "  function leadHits(ink, pad) {\n"
    "    var l = document.getElementById('leadLine'), x1 = +l.getAttribute('x1'), y1 = +l.getAttribute('y1'), x2 = +l.getAttribute('x2'), y2 = +l.getAttribute('y2');\n"
    "    var n = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1))), e = pad + 1.5;\n"
    "    for (var i = 0; i <= n; i++) { var x = x1 + (x2 - x1) * i / n, y = y1 + (y2 - y1) * i / n; if (x > ink.x0 - e && x < ink.x1 + e && y > ink.y0 - e && y < ink.y1 + e) return true; }\n"
    "    var cx = Math.max(ink.x0 - pad, Math.min(x1, ink.x1 + pad)), cy = Math.max(ink.y0 - pad, Math.min(y1, ink.y1 + pad));\n"
    "    return Math.hypot(cx - x1, cy - y1) < 7;\n"
    "  }\n"
    "  /* screen 24: is the ink box cut by a panel's edge (partly under it, partly out)? */\n"
    "  function edgeCut(ink, pad, sel) {\n"
    "    var o = document.querySelector(sel).getBoundingClientRect();\n"
    "    var meets = ink.x1 + pad > o.left && ink.x0 - pad < o.right && ink.y1 + pad > o.top && ink.y0 - pad < o.bottom;\n"
    "    var inside = ink.x0 >= o.left && ink.x1 <= o.right && ink.y0 >= o.top && ink.y1 <= o.bottom;\n"
    "    return meets && !inside;\n"
    "  }\n"
    "  function declutter() {\n")
# radio symbols (page 3's)
sub('    <symbol id="i-pin" ', '    <symbol id="i-radio" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.25"/></symbol>\n'
    '    <symbol id="i-radio-on" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.25"/><circle cx="12" cy="12" r="4.25" fill="currentColor" stroke="none"/></symbol>\n'
    '    <symbol id="i-pin" ')
# comments and title of this page
sub('<!-- The map: approved world satellite + overlay (Egypt highlighted), placed by placeMap() -->',
    "<!-- The map: approved world satellite + overlay (Côte d'Ivoire highlighted), placed by placeMap() -->")
sub("  /* Map: zoom scales with the screen height so Europe, the Mediterranean, North and East Africa\n     and the Middle East fill the screen; Egypt's east edge sits 36 pt left of the card. */",
    "  /* Map: zoom scales with the screen height (page 2's); the selected country's east edge sits 36 pt left of the card,\n     its anchor at the band's height (placeCard), the map clamped to cover the screen. */")
sub("    var ax = L + EG.ax * s, ay = T + EG.ay * s;          /* in Sinai, clear of Egypt's name; the line runs north of the Saudi label */",
    "    var ax = L + EG.ax * s, ay = T + EG.ay * s;          /* the anchor: inside the selected country (the checker tests it) */")
sub("egypt: { x0: L + EG.x0 * s", "country: { x0: L + EG.x0 * s")
sub("  /* ---------- Selected-country card: floats at the right, next to Egypt ---------- */",
    "  /* ---------- Selected-country card: floats at the right, next to the selected country ---------- */")
t = re.sub(r'<title>[^<]*</title>', '<title>اختيار الحكومة</title>', t, count=1)
# the chooser's CSS, then D-3 (confirmed): opaque panels, as screens 22 and 23 (../../proposals/D3_panels/opaque.html)
i = t.index('</style>')
t = t[:i] + (S / 'chooser.css').read_text(encoding='utf-8') + t[i:]
i = t.index('</head>')
t = t[:i] + ('<style>/* D-3 (confirmed): opaque panels, applied to the HUD exactly as ../../proposals/D3_panels/opaque.html */\n'
             '  .glass { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; }\n'
             '  .frost i { display: none !important; }\n'
             '  .frost::after { background: rgb(12, 20, 28) !important; }\n</style>\n') + t[i:]
(Path(D) / 'index.html').write_text(t, encoding='utf-8')
print('assembled', Path(D) / 'index.html')
