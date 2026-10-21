"""Build design/screen6/A/index.html (the economy panel): screen 4 A's base page (the approved B3 play screen with opaque
panels, map placement and label handling) + the approved province panel's CSS (screen 4 R) + the shared section identity
(design/shared/section_identity.css) + the approved state panel's tab and note rules (screen 5 A) + the economy panel's
CSS and markup.
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
t = (R / 'design/screen4/A/index.html').read_text(encoding='utf-8')


def sub(old, new, n=1):
    global t
    assert t.count(old) == n, (old[:60], t.count(old))
    t = t.replace(old, new)


def cut(start, end, new):
    global t
    a = t.index(start)
    b = t.index(end, a)
    assert t.count(start) == 1
    t = t[:a] + new + t[b:]


css = ''.join((f).read_text(encoding='utf-8') for f in [R / 'design/screen4/R/_build/panel.css', R / 'design/shared/section_identity.css',
                                                         R / 'design/screen5/A/_build/state.css', S / 'econ.css'])
t0 = t.index('<style>\n  /* ================= Screen 4, variant A')
t1 = t.index('</style>', t0) + len('</style>')
t = t[:t0] + '<style>\n' + css + '</style>' + t[t1:]
m0 = t.index('  <!-- Province panel: tabbed side sheet from the right -->')
m1 = t.index('  </section>', t.index('<section class="sheet glass"', m0)) + len('  </section>')
t = t[:m0] + (S / 'sheet.html').read_text(encoding='utf-8').rstrip('\n') + t[m1:]

sub('<title>لوحة المحافظة A</title>', '<title>لوحة الاقتصاد</title>')
sub("     &tab=politics|society|economy|security opens that tab of the province sheet (default politics = «السياسة»).\n",
    "     &tab=overview|budget|taxes|trade opens that tab of the economy panel (default «نظرة عامة»), &scroll=end scrolls\n"
    "     it to its end and &scroll=<pt> to that offset.\n")
sub("    r.dataset.tab = ['politics', 'society', 'economy', 'security'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'politics';\n",
    "    r.dataset.tab = ['overview', 'budget', 'taxes', 'trade'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'overview';\n"
    "    r.dataset.sec = 'econ';\n"
    "    window.__scroll = q.get('scroll') === 'end' ? 'end' : (isFinite(parseFloat(q.get('scroll'))) ? parseFloat(q.get('scroll')) : 0);\n")
# the dock shows «الاقتصاد» as the open section
sub('<button class="dock-item tap"><svg class="i"><use href="#i-econ"/></svg><span>الاقتصاد</span></button>',
    '<button class="dock-item tap on" aria-current="page"><svg class="i"><use href="#i-econ"/></svg><span>الاقتصاد</span></button>')
# no province is selected: drop Cairo's selection layer (the map keeps the player's country outline and Cairo's label)
s0 = t.index('  <!-- the tapped province: Cairo Governorate')
s1 = t.index('  </svg>', s0) + len('  </svg>\n')
t = t[:s0] + t[s1:]

cut('  /* ---------- Province sheet ---------- */', '  /* Place the map so Cairo and the Nile delta', '''  /* ---------- Economy sheet (the province details' full-height side sheet) ---------- */
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

  /* The loosest fit level (the province panel's) at which «نظرة عامة» shows everything without scrolling. */
  function fitSheet() {
    var root = document.documentElement, tab = root.dataset.tab, b = $('.r-body[data-tab="overview"]'), tried = [], lv;
    root.dataset.tab = 'overview';
    for (lv = 0; lv <= 6; lv++) {
      root.dataset.rfit = String(lv);
      var over = b.scrollHeight - b.clientHeight;
      tried.push([lv, over]);
      if (over <= 0.5) break;
    }
    if (lv > 6) lv = 6;
    root.dataset.rfit = String(lv);
    root.dataset.tab = tab;
    window.__sheetfit = { level: lv, tried: tried, fits: tried[tried.length - 1][1] <= 0.5 };
  }

  /* The open tab scrolls inside the sheet when it is taller than the sheet; fades mark the edges that hide content. */
  function fitBody() {
    var root = document.documentElement, b = $('.r-body[data-tab="' + root.dataset.tab + '"]');
    b.scrollTop = window.__scroll === 'end' ? b.scrollHeight : window.__scroll;
    var over = b.scrollHeight - b.clientHeight;
    root.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0';
    root.dataset.fbot = b.scrollTop < over - 0.5 ? '1' : '0';
    window.__body = { tab: root.dataset.tab, shown: b.clientHeight, full: b.scrollHeight, over: over, top: b.scrollTop };
  }

''')
sub('.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(placeMap)',
    '.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(fitBody).then(placeMap)')
sub('  </defs>', '''    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5v10"/></symbol>
    <symbol id="i-pie" viewBox="0 0 24 24"><path d="M12 3.5a8.5 8.5 0 1 0 8.5 8.5H12z"/><path d="M15 3.9a8.5 8.5 0 0 1 5.1 5.1H15z"/></symbol>
    <symbol id="i-percent" viewBox="0 0 24 24"><path d="M18.5 5.5 5.5 18.5"/><circle cx="7.5" cy="7.5" r="2.5"/><circle cx="16.5" cy="16.5" r="2.5"/></symbol>
    <symbol id="i-ship" viewBox="0 0 24 24"><path d="M3.5 15.5h17l-2.5 4.5H6z"/><path d="M6 15.5V9.5h12v6"/><path d="M9 9.5V6h6v3.5"/><path d="M12 3.5V6"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.75a3.5 3.5 0 0 1 7 0v2.75"/></symbol>
    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.75-2.6-6.75-6.3 0-3.2 2.2-5.1 3.6-7.4.3 1.9 1.3 3 2.4 3.5C11 7.6 12.2 5 14.6 3c-.2 3 1.3 4.6 2.6 6.2 1.1 1.4 1.55 2.9 1.55 4.5C18.75 18.4 15.9 21 12 21z"/><path d="M12 21c-1.6 0-2.75-1.1-2.75-2.6 0-1.7 1.4-2.6 2.1-4 .9 1.1 3.4 2.3 3.4 4 0 1.5-1.15 2.6-2.75 2.6z"/></symbol>
  </defs>''')
# labels squeezed into a strip under 70 pt between a panel and the screen edge are hidden like labels a panel cuts
# (the same rule as the province panel, screen 4 R)
old_cut = """    function cutBox(x0, y0, x1, y1) {
      if (x1 <= 0 || x0 >= W || y1 <= 0 || y0 >= H) return false;"""
assert t.count(old_cut) == 1
t = t.replace(old_cut, """    /* a panel that leaves less than 70 pt to a screen edge counts as reaching it: a label in that strip is squeezed */
    var EDGE = 70;
    function cutBox(x0, y0, x1, y1) {
      if (x1 <= 0 || x0 >= W || y1 <= 0 || y0 >= H) return false;
      for (var e = 0; e < obs.length; e++) {
        var p = obs[e], sx0 = p.left < EDGE ? 0 : p.left, sx1 = W - p.right < EDGE ? W : p.right;
        if ((sx0 !== p.left || sx1 !== p.right) && x1 > sx0 && x0 < sx1 && y1 > p.top - 2 && y0 < p.bottom + 2 && (x0 < p.left || x1 > p.right)) return true;
      }""")
old_hide = """      if (cutBox(b[0], b[1], b[2], b[3])) { u.forEach(function (e) { e.classList.add('cut'); }); hidden.push(u[0].textContent); }"""
assert t.count(old_hide) == 1
t = t.replace(old_hide, """      if (cutBox(b[0], b[1], b[2], b[3]) || edgeCut(b)) { u.forEach(function (e) { e.classList.add('cut'); }); hidden.push(u[0].textContent); }""")
old_hw = """    /* hide what is still cut, measured on the rendered labels and dots */"""
assert t.count(old_hw) == 1
t = t.replace(old_hw, """    /* hide what is still cut, measured on the rendered labels and dots; also a label the screen edge or the side inset
       (the notch, the Dynamic Island) would slice. That last rule is for this final pass only, so the map does not move. */
    function edgeCut(b) {
      var sx = Math.max(d.SIDE, 0);
      if (b[2] <= 0 || b[0] >= W || b[3] <= 0 || b[1] >= H) return false;
      return b[0] < sx || b[2] > W - sx || b[1] < 0 || b[3] > H;
    }""" + '\n' + old_hw)
(D / 'index.html').write_text(t, encoding='utf-8')
print('assembled', D / 'index.html')
