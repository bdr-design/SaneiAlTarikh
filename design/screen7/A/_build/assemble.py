"""Build design/screen7/A/index.html (the economy adjusters): screen 4 A's base page (the approved B3 play screen with
opaque panels, map placement and label handling) + the approved panels' CSS (screen 4 R, the shared section identity,
screen 5 A's notes and segments, screen 6 A's economy rules) + the adjusters' CSS and markup. The sheet's header is
taken from screen 6's sheet, so the two cannot drift.
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
                                                         R / 'design/screen5/A/_build/state.css', R / 'design/screen6/A/_build/econ.css', S / 'adjust.css'])
t0 = t.index('<style>\n  /* ================= Screen 4, variant A')
t1 = t.index('</style>', t0) + len('</style>')
t = t[:t0] + '<style>\n' + css + '</style>' + t[t1:]
m0 = t.index('  <!-- Province panel: tabbed side sheet from the right -->')
m1 = t.index('  </section>', t.index('<section class="sheet glass"', m0)) + len('  </section>')
sheet = (S / 'sheet.html').read_text(encoding='utf-8').rstrip('\n')
e6 = (R / 'design/screen6/A/_build/sheet.html').read_text(encoding='utf-8')
h0 = e6.index('      <header class="r-hd">')
h1 = e6.index('      </header>', h0) + len('      </header>')
assert sheet.count('<!--HEADER-->') == 1
sheet = sheet.replace('<!--HEADER-->', e6[h0:h1])
# the stepper's marks: the current and the new value as a share of the range, from the right (the minimum's end in RTL)
import re
def marks(m):
    d = dict(re.findall(r'data-(min|max|now|new)="([\d.]+)"', m.group(0)))
    lo, hi = float(d['min']), float(d['max'])
    pct = lambda v: round((float(v) - lo) / (hi - lo) * 100, 2)
    return m.group(0)[:-1] + f' style="--now: {pct(d["now"])}%; --new: {pct(d["new"])}%">'
sheet, n = re.subn(r'<div class="a-step"[^>]*>', marks, sheet)
assert n == 4
t = t[:m0] + sheet + t[m1:]

sub('<title>لوحة المحافظة A</title>', '<title>ضبط الاقتصاد</title>')
sub("     &tab=politics|society|economy|security opens that tab of the province sheet (default politics = «السياسة»).\n",
    "     &adjust=tax|line|subsidy|money opens that adjuster of the economy panel (default tax), &scroll=end scrolls its\n"
    "     body to its end and &scroll=<pt> to that offset.\n")
sub("    r.dataset.tab = ['politics', 'society', 'economy', 'security'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'politics';\n",
    "    r.dataset.adjust = ['tax', 'line', 'subsidy', 'money'].indexOf(q.get('adjust')) >= 0 ? q.get('adjust') : 'tax';\n"
    "    r.dataset.sec = 'econ';\n"
    "    window.__scroll = q.get('scroll') === 'end' ? 'end' : (isFinite(parseFloat(q.get('scroll'))) ? parseFloat(q.get('scroll')) : 0);\n")
# the dock shows «الاقتصاد» as the open section
sub('<button class="dock-item tap"><svg class="i"><use href="#i-econ"/></svg><span>الاقتصاد</span></button>',
    '<button class="dock-item tap on" aria-current="page"><svg class="i"><use href="#i-econ"/></svg><span>الاقتصاد</span></button>')
# no province is selected: drop Cairo's selection layer (the map keeps the player's country outline and Cairo's label)
s0 = t.index('  <!-- the tapped province: Cairo Governorate')
s1 = t.index('  </svg>', s0) + len('  </svg>\n')
t = t[:s0] + t[s1:]

cut('  /* ---------- Province sheet ---------- */', '  /* Place the map so Cairo and the Nile delta', '''  /* ---------- Economy sheet with an adjuster (the province details' full-height side sheet) ---------- */
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

  /* A pushed view: the header collapses to its compact height (fit level 6, 44 pt) and the body scrolls. */
  function fitSheet() {
    document.documentElement.dataset.rfit = '6';
    window.__sheetfit = { level: 6, tried: [], fits: true };
  }

  /* The open adjuster's body scrolls between the back control and the footer; fades mark the edges that hide content. */
  function fitBody() {
    var root = document.documentElement, b = $('.a-view[data-adjust="' + root.dataset.adjust + '"] > .r-body');
    b.scrollTop = window.__scroll === 'end' ? b.scrollHeight : window.__scroll;
    var over = b.scrollHeight - b.clientHeight;
    root.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0';
    root.dataset.fbot = b.scrollTop < over - 0.5 ? '1' : '0';
    window.__body = { adjust: root.dataset.adjust, shown: b.clientHeight, full: b.scrollHeight, over: over, top: b.scrollTop };
  }

''')
sub('.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(placeMap)',
    '.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(fitBody).then(placeMap)')
sub('  </defs>', '''    <symbol id="i-plus" viewBox="0 0 24 24"><path d="M12 5.5v13M5.5 12h13"/></symbol>
    <symbol id="i-minus" viewBox="0 0 24 24"><path d="M5.5 12h13"/></symbol>
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
