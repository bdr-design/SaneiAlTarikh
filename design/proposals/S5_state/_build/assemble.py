"""Build design/proposals/S5_state/index.html: variant A's base page (the approved B3 play screen with opaque panels,
map placement and label handling) + the approved province panel's CSS (screen 4 R) + the state panel's CSS and markup.
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


css = (R / 'design/screen4/R/_build/panel.css').read_text(encoding='utf-8') + (S / 'state.css').read_text(encoding='utf-8')
t0 = t.index('<style>\n  /* ================= Screen 4, variant A')
t1 = t.index('</style>', t0) + len('</style>')
t = t[:t0] + '<style>\n' + css + '</style>' + t[t1:]
m0 = t.index('  <!-- Province panel: tabbed side sheet from the right -->')
m1 = t.index('  </section>', t.index('<section class="sheet glass"', m0)) + len('  </section>')
t = t[:m0] + (S / 'sheet.html').read_text(encoding='utf-8').rstrip('\n') + t[m1:]

sub('<title>لوحة المحافظة A</title>', '<title>لوحة الدولة</title>')
sub("     &tab=politics|society|economy|security opens that tab of the province sheet (default politics = «السياسة»).\n",
    "     &tab=overview|leader|projects opens that tab of the state panel (default «نظرة عامة»), &scroll=end scrolls it to its end.\n")
sub("    r.dataset.tab = ['politics', 'society', 'economy', 'security'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'politics';\n",
    "    r.dataset.tab = ['overview', 'leader', 'projects'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'overview';\n"
    "    window.__scrollEnd = q.get('scroll') === 'end';\n")
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
    for (lv = 0; lv <= 5; lv++) {
      root.dataset.rfit = String(lv);
      var over = b.scrollHeight - b.clientHeight;
      tried.push([lv, over]);
      if (over <= 0.5) break;
    }
    if (lv > 5) lv = 5;
    root.dataset.rfit = String(lv);
    root.dataset.tab = tab;
    window.__sheetfit = { level: lv, tried: tried, fits: tried[tried.length - 1][1] <= 0.5 };
  }

  /* The open tab scrolls inside the sheet when it is taller than the sheet; fades mark the edges that hide content. */
  function fitBody() {
    var root = document.documentElement, b = $('.r-body[data-tab="' + root.dataset.tab + '"]');
    b.scrollTop = window.__scrollEnd ? b.scrollHeight : 0;
    var over = b.scrollHeight - b.clientHeight;
    root.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0';
    root.dataset.fbot = b.scrollTop < over - 0.5 ? '1' : '0';
    window.__body = { tab: root.dataset.tab, shown: b.clientHeight, full: b.scrollHeight, over: over, top: b.scrollTop };
  }

''')
sub('.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(placeMap)',
    '.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(fitBody).then(placeMap)')
sub('  </defs>', '''    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5v10"/></symbol>
    <symbol id="i-crown" viewBox="0 0 24 24"><path d="M4.5 19h15"/><path d="M5 16 4 7.5l4.5 3.5L12 5.5l3.5 5.5L20 7.5 19 16z"/></symbol>
    <symbol id="i-capital" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.25l1.45 2.95 3.25.45-2.35 2.3.55 3.2L12 14.6l-2.9 1.55.55-3.2-2.35-2.3 3.25-.45z"/></symbol>
    <symbol id="i-unlock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.75a3.5 3.5 0 0 1 6.75-1.3"/><path d="M12 14.25v2.5"/></symbol>
    <symbol id="i-swap" viewBox="0 0 24 24"><path d="M5 8.5h13.5L15 5"/><path d="M19 15.5H5.5L9 19"/></symbol>
    <symbol id="i-bus" viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="15" rx="2.5"/><path d="M5 7.25h14M5 12h14"/><path d="M8 18.5v2M16 18.5v2"/><path d="M8.5 15.25h.01M15.5 15.25h.01" stroke-width="2.4"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.25 3.5h8.25l3.25 3.25V20.5H6.25z"/><path d="M14.25 3.5v3.5h3.5"/><path d="M9 11h6M9 14h6M9 17h3.5"/></symbol>
    <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 3.5c3 3.9 6 7.3 6 10.6a6 6 0 0 1-12 0c0-3.3 3-6.7 6-10.6z"/><path d="M9.25 14.5a2.75 2.75 0 0 0 2.75 2.75"/></symbol>
    <symbol id="i-atom" viewBox="0 0 24 24"><circle cx="12" cy="12" r="1.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-60 12 12)"/></symbol>
  </defs>''')
(D / 'index.html').write_text(t, encoding='utf-8')
print('assembled', D / 'index.html')
