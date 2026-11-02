"""Shared page builder for the full-height dock panels (screens 8 onward). It does what screens 6 and 7's assemble.py did
by hand, so every new panel is built the same way:
  screen 4 A's base page (the approved B3 play screen with opaque panels, the map placement and the label handling)
  + the approved panels' CSS (screen 4 R's panel.css, the shared section identity, screen 5 A's notes, segments and states)
  + the panel's own CSS and markup,
  with the economy sheet's geometry (width clamp(43% of the safe width, 340, 380), the dock beside it or hidden on the
  375 pt phones), a fit level taken from one body (the loosest at which that body fits, as screen 6 does), the open tab's
  body scrolling with its fades, the open dock item in the section's colour, and the label rules of screen 4 R (labels
  squeezed against a panel or sliced by the screen edge or the side inset are hidden).

Usage, from a screen's assemble.py:
    import sys; from pathlib import Path
    R, S, D = map(Path, sys.argv[1:4]); sys.path.insert(0, str(R / 'design/shared/check'))
    import panel_page
    panel_page.build(R, S, D, title=..., sec=..., dock_label=..., dock_icon=..., tabs=[...], fit_tab=..., css=[...], symbols='...')
"""
from pathlib import Path


def build(R, S, D, *, title, sec, dock_label, dock_icon, tabs, fit_tab, css, symbols='', sheet='sheet.html', url_doc='', init_js='', extra_subs=()):
    """R: repo root, S: the screen's _build dir, D: the output dir. tabs: the tab ids in order (the first is the
    default); fit_tab: the tab whose body chooses the fit level (None: level 0). css: the screen's own CSS files (in S).
    sec: the section id in section_identity.css (data-sec). init_js: extra lines for the URL parser (JS, 4-space
    indented). extra_subs: (old, new) pairs applied last."""
    t = (R / 'design/screen4/A/index.html').read_text(encoding='utf-8')

    def sub(old, new, n=1):
        nonlocal t
        assert t.count(old) == n, (old[:60], t.count(old))
        t = t.replace(old, new)

    def cut(start, end, new):
        nonlocal t
        a = t.index(start)
        b = t.index(end, a)
        assert t.count(start) == 1
        t = t[:a] + new + t[b:]

    files = [R / 'design/screen4/R/_build/panel.css', R / 'design/shared/section_identity.css', R / 'design/screen5/A/_build/state.css'] + [S / c for c in css]
    t0 = t.index('<style>\n  /* ================= Screen 4, variant A')
    t1 = t.index('</style>', t0) + len('</style>')
    t = t[:t0] + '<style>\n' + ''.join(f.read_text(encoding='utf-8') for f in files) + '</style>' + t[t1:]
    m0 = t.index('  <!-- Province panel: tabbed side sheet from the right -->')
    m1 = t.index('  </section>', t.index('<section class="sheet glass"', m0)) + len('  </section>')
    t = t[:m0] + (S / sheet).read_text(encoding='utf-8').rstrip('\n') + t[m1:]

    sub('<title>لوحة المحافظة A</title>', '<title>' + title + '</title>')
    sub("     &tab=politics|society|economy|security opens that tab of the province sheet (default politics = «السياسة»).\n",
        "     &tab=" + '|'.join(tabs) + " opens that tab of the panel (default " + tabs[0] + "), &scroll=end scrolls the open tab\n"
        "     to its end and &scroll=<pt> to that offset; &states=1 draws the later states." + url_doc + "\n")
    sub("    r.dataset.tab = ['politics', 'society', 'economy', 'security'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'politics';\n",
        "    r.dataset.tab = " + repr(list(tabs)).replace("'", "'") + ".indexOf(q.get('tab')) >= 0 ? q.get('tab') : '" + tabs[0] + "';\n"
        "    r.dataset.sec = '" + sec + "';\n"
        "    r.dataset.states = q.get('states') === '1' ? '1' : '0';\n"
        "    window.__scroll = q.get('scroll') === 'end' ? 'end' : (isFinite(parseFloat(q.get('scroll'))) ? parseFloat(q.get('scroll')) : 0);\n" + init_js)
    # the dock shows the panel's section as open
    sub('<button class="dock-item tap"><svg class="i"><use href="#' + dock_icon + '"/></svg><span>' + dock_label + '</span></button>',
        '<button class="dock-item tap on" aria-current="page"><svg class="i"><use href="#' + dock_icon + '"/></svg><span>' + dock_label + '</span></button>')
    # no province is selected: drop Cairo's selection layer (the map keeps the player's country outline and Cairo's label)
    s0 = t.index('  <!-- the tapped province: Cairo Governorate')
    s1 = t.index('  </svg>', s0) + len('  </svg>\n')
    t = t[:s0] + t[s1:]

    fit = ("    var root = document.documentElement, tab = root.dataset.tab, b = $('.r-body[data-tab=\"" + fit_tab + "\"]'), tried = [], lv;\n"
           "    root.dataset.tab = '" + str(fit_tab) + "';\n"
           "    for (lv = 0; lv <= 6; lv++) {\n"
           "      root.dataset.rfit = String(lv);\n"
           "      var over = b.scrollHeight - b.clientHeight;\n"
           "      tried.push([lv, over]);\n"
           "      if (over <= 0.5) break;\n"
           "    }\n"
           "    if (lv > 6) lv = 6;\n"
           "    root.dataset.rfit = String(lv);\n"
           "    root.dataset.tab = tab;\n"
           "    window.__sheetfit = { level: lv, tried: tried, fits: tried[tried.length - 1][1] <= 0.5 };\n") if fit_tab else (
           "    document.documentElement.dataset.rfit = '0';\n"
           "    window.__sheetfit = { level: 0, tried: [], fits: true };\n")
    cut('  /* ---------- Province sheet ---------- */', '  /* Place the map so Cairo and the Nile delta', '''  /* ---------- Dock panel (the province details' full-height side sheet; shared builder) ---------- */
  var $ = function (sel) { return document.querySelector(sel); };

  /* Width = clamp(43% of the safe width, 340, 380) pt; where the dock would just miss the room left of the sheet
     (4 pt in + dock + 8 pt), the sheet narrows to make that room, down to 330 pt at the least. */
  function sizeSheet() {
    var d = window.__dev, safe = d.W - 2 * d.SIDE, want = Math.round(Math.min(380, Math.max(340, 0.43 * safe)));
    var hud = $('.hud').getBoundingClientRect(), room = Math.floor(hud.width - 4 - $('.dock').getBoundingClientRect().width - 8);
    if (room < want && room >= 330) want = room;
    document.documentElement.style.setProperty('--sheet-w', want + 'px');
    var tab = document.documentElement.dataset.tab;
    Array.prototype.forEach.call(document.querySelectorAll('.r-tab'), function (b) {
      var on = b.dataset.for === tab; b.classList.toggle('on', on); b.setAttribute('aria-selected', String(on));
    });
    window.__sheet = { safe: safe, want: want, roomForDock: room };
  }

  /* From 8 pt under the top row down to the dock line; the dock moves to the left end of its line, 4 pt in, or hides
     while the sheet is open where it cannot clear the sheet by 8 pt (the 375 pt phones). */
  function placeSheet() {
    var root = document.documentElement;
    root.style.setProperty('--sheet-b', '0px');
    root.dataset.dock = 'left';
    var dk = $('.dock').getBoundingClientRect(), sh = $('.sheet').getBoundingClientRect();
    if (dk.right > sh.left - 8) root.dataset.dock = 'hidden';
    window.__sheetpos = { dock: root.dataset.dock };
  }

  /* The fit level: the loosest at which the chosen tab's body fits (the header stays the same for every tab). */
  function fitSheet() {
''' + fit + '''  }

  /* The open tab's body scrolls inside the sheet when it is taller; fades mark the edges that hide content. In the
     states view, a control in its wait cannot be tapped. */
  function fitBody() {
    var root = document.documentElement, b = $('.r-body[data-tab="' + root.dataset.tab + '"]');
    Array.prototype.forEach.call(document.querySelectorAll('.s-wait-ctl'), function (c) {
      if (root.dataset.states === '1') c.setAttribute('aria-disabled', 'true'); else c.removeAttribute('aria-disabled'); });
    b.scrollTop = window.__scroll === 'end' ? b.scrollHeight : window.__scroll;
    var over = b.scrollHeight - b.clientHeight;
    root.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0';
    root.dataset.fbot = b.scrollTop < over - 0.5 ? '1' : '0';
    window.__body = { tab: root.dataset.tab, shown: b.clientHeight, full: b.scrollHeight, over: over, top: b.scrollTop };
  }

''')
    sub('.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(placeMap)',
        '.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(fitBody).then(placeMap)')
    if symbols:
        sub('  </defs>', symbols.rstrip('\n') + '\n  </defs>')
    # labels squeezed into a strip under 70 pt between a panel and the screen edge are hidden like labels a panel cuts,
    # and labels the screen edge or the side inset would slice are hidden in the final pass (screen 4 R's rules)
    old_cut = """    function cutBox(x0, y0, x1, y1) {
      if (x1 <= 0 || x0 >= W || y1 <= 0 || y0 >= H) return false;"""
    sub(old_cut, """    /* a panel that leaves less than 70 pt to a screen edge counts as reaching it: a label in that strip is squeezed */
    var EDGE = 70;
    function cutBox(x0, y0, x1, y1) {
      if (x1 <= 0 || x0 >= W || y1 <= 0 || y0 >= H) return false;
      for (var e = 0; e < obs.length; e++) {
        var p = obs[e], sx0 = p.left < EDGE ? 0 : p.left, sx1 = W - p.right < EDGE ? W : p.right;
        if ((sx0 !== p.left || sx1 !== p.right) && x1 > sx0 && x0 < sx1 && y1 > p.top - 2 && y0 < p.bottom + 2 && (x0 < p.left || x1 > p.right)) return true;
      }""")
    old_hide = """      if (cutBox(b[0], b[1], b[2], b[3])) { u.forEach(function (e) { e.classList.add('cut'); }); hidden.push(u[0].textContent); }"""
    sub(old_hide, """      if (cutBox(b[0], b[1], b[2], b[3]) || edgeCut(b)) { u.forEach(function (e) { e.classList.add('cut'); }); hidden.push(u[0].textContent); }""")
    old_hw = """    /* hide what is still cut, measured on the rendered labels and dots */"""
    sub(old_hw, """    /* hide what is still cut, measured on the rendered labels and dots; also a label the screen edge or the side inset
       (the notch, the Dynamic Island) would slice. That last rule is for this final pass only, so the map does not move. */
    function edgeCut(b) {
      var sx = Math.max(d.SIDE, 0);
      if (b[2] <= 0 || b[0] >= W || b[3] <= 0 || b[1] >= H) return false;
      return b[0] < sx || b[2] > W - sx || b[1] < 0 || b[3] > H;
    }""" + '\n' + old_hw)
    for old, new in extra_subs:
        sub(old, new)
    (Path(D) / 'index.html').write_text(t, encoding='utf-8')
    print('assembled', Path(D) / 'index.html')
