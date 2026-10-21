"""Build design/screen5/A/index.html (the state panel): screen 4 A's base page (the approved B3 play screen with opaque
panels, map placement and label handling) + the approved province panel's CSS (screen 4 R) + the shared section identity
(design/shared/section_identity.css) + the state panel's CSS and markup.
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


css = ''.join((f).read_text(encoding='utf-8') for f in [R / 'design/screen4/R/_build/panel.css', R / 'design/shared/section_identity.css', S / 'state.css'])
t0 = t.index('<style>\n  /* ================= Screen 4, variant A')
t1 = t.index('</style>', t0) + len('</style>')
t = t[:t0] + '<style>\n' + css + '</style>' + t[t1:]
m0 = t.index('  <!-- Province panel: tabbed side sheet from the right -->')
m1 = t.index('  </section>', t.index('<section class="sheet glass"', m0)) + len('  </section>')
t = t[:m0] + (S / 'sheet.html').read_text(encoding='utf-8').rstrip('\n') + t[m1:]

sub('<title>لوحة المحافظة A</title>', '<title>لوحة الدولة</title>')
sub("     &tab=politics|society|economy|security opens that tab of the province sheet (default politics = «السياسة»).\n",
    "     &tab=overview|leader|policies|projects opens that tab of the state panel (default «نظرة عامة»), &scroll=end scrolls\n"
    "     it to its end and &scroll=<pt> to that offset; &states=1 draws the later states (see the sheet's comment).\n")
sub("    r.dataset.tab = ['politics', 'society', 'economy', 'security'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'politics';\n",
    "    r.dataset.tab = ['overview', 'leader', 'policies', 'projects'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'overview';\n"
    "    r.dataset.sec = 'state';\n"
    "    r.dataset.states = q.get('states') === '1' ? '1' : '0';\n"
    "    window.__scroll = q.get('scroll') === 'end' ? 'end' : (isFinite(parseFloat(q.get('scroll'))) ? parseFloat(q.get('scroll')) : 0);\n")
# the dock shows «الدولة» as the open section
sub('<button class="dock-item tap end end-r"><svg class="i"><use href="#i-state"/></svg><span>الدولة</span></button>',
    '<button class="dock-item tap end end-r on" aria-current="page"><svg class="i"><use href="#i-state"/></svg><span>الدولة</span></button>')
# no province is selected: drop Cairo's selection layer (the map keeps the player's country outline and Cairo's label)
s0 = t.index('  <!-- the tapped province: Cairo Governorate')
s1 = t.index('  </svg>', s0) + len('  </svg>\n')
t = t[:s0] + t[s1:]

cut('  /* ---------- Province sheet ---------- */', '  /* Place the map so Cairo and the Nile delta', '''  /* ---------- State sheet (the province details' full-height side sheet) ---------- */
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
    /* the states view: the law in its cooldown cannot be tapped */
    Array.prototype.forEach.call(document.querySelectorAll('.s-wait-1 .s-sg'), function (b) {
      if (document.documentElement.dataset.states === '1') b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
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
    <symbol id="i-podium" viewBox="0 0 24 24"><path d="M4.5 10h15"/><path d="M6.5 10 8 20.5h8L17.5 10"/><path d="M12 10V6"/><circle cx="12" cy="4.5" r="1.5"/><path d="M10 14h4"/></symbol>
    <symbol id="i-briefcase" viewBox="0 0 24 24"><rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.75a1.25 1.25 0 0 1 1.25-1.25h3.5A1.25 1.25 0 0 1 15 5.75V7.5"/><path d="M3.5 12.5h17"/><path d="M12 11.5v2"/></symbol>
    <symbol id="i-person" viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.9 3.1-6.5 7-6.5s7 2.6 7 6.5"/></symbol>
    <symbol id="i-mode" viewBox="0 0 24 24"><path d="M4.5 7.5h8M16.5 7.5h3M4.5 16.5h3M11.5 16.5h8"/><circle cx="14.5" cy="7.5" r="2"/><circle cx="9.5" cy="16.5" r="2"/></symbol>
    <symbol id="i-wand" viewBox="0 0 24 24"><path d="M5 19 15 9"/><path d="m13.5 7.5 3 3"/><path d="M18 3.5v3M16.5 5h3M19.5 12.5v2M18.5 13.5h2M9 4.5v2M8 5.5h2"/></symbol>
    <symbol id="i-capital" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.25l1.45 2.95 3.25.45-2.35 2.3.55 3.2L12 14.6l-2.9 1.55.55-3.2-2.35-2.3 3.25-.45z"/></symbol>
    <symbol id="i-unlock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.75a3.5 3.5 0 0 1 6.75-1.3"/><path d="M12 14.25v2.5"/></symbol>
    <symbol id="i-swap" viewBox="0 0 24 24"><path d="M5 8.5h13.5L15 5"/><path d="M19 15.5H5.5L9 19"/></symbol>
    <symbol id="i-train" viewBox="0 0 24 24"><rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 10h12"/><path d="M10 6.5h4"/><path d="M9.25 13.5h.01M14.75 13.5h.01" stroke-width="2.4"/><path d="M9 16.5 7 20.5M15 16.5l2 4"/></symbol>
    <symbol id="i-ship" viewBox="0 0 24 24"><path d="M3.5 15.5h17l-2.5 4.5H6z"/><path d="M6 15.5V9.5h12v6"/><path d="M9 9.5V6h6v3.5"/><path d="M12 3.5V6"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.25 3.5h8.25l3.25 3.25V20.5H6.25z"/><path d="M14.25 3.5v3.5h3.5"/><path d="M9 11h6M9 14h6M9 17h3.5"/></symbol>
    <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 3.5c3 3.9 6 7.3 6 10.6a6 6 0 0 1-12 0c0-3.3 3-6.7 6-10.6z"/><path d="M9.25 14.5a2.75 2.75 0 0 0 2.75 2.75"/></symbol>
    <symbol id="i-atom" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)"/></symbol>
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
