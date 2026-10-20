"""Build design/screen4/R/index.html from variant A's page (the approved B3 play screen with opaque panels, the map
placement and the label handling), the reference-based sheet (sheet.html) and its CSS (panel.css).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import re
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
t = (R / 'design/screen4/A/index.html').read_text(encoding='utf-8')


def sub(old, new, n=1):
    global t
    assert t.count(old) == n, (old[:60], t.count(old))
    t = t.replace(old, new)


def cut(start, end, new):
    """Replace t[start:end] (both found exactly once) with new."""
    global t
    a = t.index(start)
    b = t.index(end, a)
    assert t.count(start) == 1
    t = t[:a] + new + t[b:]


# the panel's CSS replaces variant A's; the sheet markup replaces A's sheet
t0 = t.index('<style>\n  /* ================= Screen 4, variant A')
t1 = t.index('</style>', t0) + len('</style>')
t = t[:t0] + '<style>\n' + (S / 'panel.css').read_text(encoding='utf-8') + '</style>' + t[t1:]
m0 = t.index('  <!-- Province panel: tabbed side sheet from the right -->')
m1 = t.index('  </section>', t.index('<section class="sheet glass"', m0)) + len('  </section>')
t = t[:m0] + (S / 'sheet.html').read_text(encoding='utf-8').rstrip('\n') + t[m1:]

sub('<title>لوحة المحافظة A</title>', '<title>لوحة المحافظة R</title>')
sub("     &tab=politics|society|economy|security opens that tab of the province sheet (default politics = «السياسة»).\n",
    "     &view=govern opens «تفاصيل المحافظة» (the governance tab) instead of the overview, &scroll=end scrolls the open\n"
    "     view to its end.\n")
sub("    r.dataset.tab = ['politics', 'society', 'economy', 'security'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'politics';\n",
    "    r.dataset.view = q.get('view') === 'govern' ? 'govern' : 'overview';\n"
    "    window.__scrollEnd = q.get('scroll') === 'end';\n")

# the sheet's layout functions (A's fitStatus / fitSheet were for A's markup)
cut('  /* ---------- Province sheet ---------- */', '  /* Place the map so Cairo and the Nile delta', '''  /* ---------- Province sheet ---------- */
  var $ = function (sel) { return document.querySelector(sel); };

  /* Width = clamp(43% of the safe width, 340, 380) pt, rounded to whole points (the owner's image: about 37% of the
     whole screen, which is 43% of the safe width on the 17 Pro Max). Where the section dock would just miss the room
     left of the sheet (4 pt in + dock + 8 pt), the sheet narrows to make that room, down to 330 pt at the least. */
  function sizeSheet() {
    var d = window.__dev, safe = d.W - 2 * d.SIDE, want = Math.round(Math.min(380, Math.max(340, 0.43 * safe)));
    var hud = $('.hud').getBoundingClientRect(), room = Math.floor(hud.width - 4 - $('.dock').getBoundingClientRect().width - 8);
    if (room < want && room >= 330) want = room;
    document.documentElement.style.setProperty('--sheet-w', want + 'px');
    window.__sheet = { safe: safe, want: want, roomForDock: room };
  }

  /* The sheet runs from 8 pt under the top row down to the dock line. The section dock moves to the left end of its
     line, 4 pt in; where it would still come closer than 8 pt to the sheet (the 375 pt phones), it hides while the
     sheet is open (closing the sheet brings it back). */
  function placeSheet() {
    var root = document.documentElement;
    root.style.setProperty('--sheet-b', '0px');
    root.dataset.dock = 'left';
    var dk = $('.dock').getBoundingClientRect(), sh = $('.sheet').getBoundingClientRect();
    if (dk.right > sh.left - 8) root.dataset.dock = 'hidden';
    window.__sheetpos = { dock: root.dataset.dock, dockRight: dk.right, sheetLeft: sh.left };
  }

  /* Pick the loosest fit level (panel.css) at which the overview shows everything without scrolling. Both views
     share the level, so the header does not change size when the player opens the details. */
  function fitSheet() {
    var root = document.documentElement, view = root.dataset.view, b = $('.r-body.r-ov'), tried = [], lv;
    root.dataset.view = 'overview';
    for (lv = 0; lv <= 5; lv++) {
      root.dataset.rfit = String(lv);
      var over = b.scrollHeight - b.clientHeight;
      tried.push([lv, over]);
      if (over <= 0.5) break;
    }
    if (lv > 5) lv = 5;
    root.dataset.rfit = String(lv);
    root.dataset.view = view;
    window.__sheetfit = { level: lv, tried: tried, fits: tried[tried.length - 1][1] <= 0.5 };
  }

  /* The open view's body scrolls inside the sheet when it is taller than the sheet (?scroll=end shows its end);
     fades mark the edges that hide content. */
  function fitBody() {
    var root = document.documentElement, b = $(root.dataset.view === 'govern' ? '.r-body.r-gv' : '.r-body.r-ov');
    b.scrollTop = window.__scrollEnd ? b.scrollHeight : 0;
    var over = b.scrollHeight - b.clientHeight;
    root.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0';
    root.dataset.fbot = b.scrollTop < over - 0.5 ? '1' : '0';
    window.__body = { view: root.dataset.view, shown: b.clientHeight, full: b.scrollHeight, over: over, top: b.scrollTop };
  }

''')
sub('.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(placeMap)',
    '.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(fitBody).then(placeMap)')

# icons the panel adds
sub('  </defs>', '''    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.75-2.6-6.75-6.3 0-3.2 2.2-5.1 3.6-7.4.3 1.9 1.3 3 2.4 3.5C11 7.6 12.2 5 14.6 3c-.2 3 1.3 4.6 2.6 6.2 1.1 1.4 1.55 2.9 1.55 4.5C18.75 18.4 15.9 21 12 21z"/><path d="M12 21c-1.6 0-2.75-1.1-2.75-2.6 0-1.7 1.4-2.6 2.1-4 .9 1.1 3.4 2.3 3.4 4 0 1.5-1.15 2.6-2.75 2.6z"/></symbol>
    <symbol id="i-pylon" viewBox="0 0 24 24"><path d="M12 2.75 7 21.25M12 2.75l5 18.5"/><path d="M5 7h14M6.5 11.5h11M8.45 16h7.1"/><path d="M5 7v2.25M19 7v2.25M6.5 11.5v2M17.5 11.5v2"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.25 3.5h8.25l3.25 3.25V20.5H6.25z"/><path d="M14.25 3.5v3.5h3.5"/><path d="M9 11h6M9 14h6M9 17h3.5"/></symbol>
    <symbol id="i-bus" viewBox="0 0 24 24"><rect x="5" y="3.5" width="14" height="15" rx="2.5"/><path d="M5 7.25h14M5 12h14"/><path d="M8 18.5v2M16 18.5v2"/><path d="M8.5 15.25h.01M15.5 15.25h.01" stroke-width="2.4"/></symbol>
  </defs>''')

# the tapped province as in the owner's images: a blue-violet halo and fill, a white ring, a white name pill.
# One soft halo + one outline, drawn only for the selected province (in the app: one pre-blurred sprite, no live blur).
s0 = t.index('  <svg class="sel" viewBox="0 0 1688 1097">')
s1 = t.index('  </svg>', s0) + len('  </svg>')
t = t[:s0] + '''  <svg class="sel" viewBox="0 0 1688 1097">
    <defs><radialGradient id="selhalo"><stop offset="0" stop-color="#7A6CFF" stop-opacity=".75"/><stop offset=".55" stop-color="#6458FF" stop-opacity=".35"/><stop offset="1" stop-color="#5A4FFF" stop-opacity="0"/></radialGradient></defs>
    <circle class="halo" cx="787" cy="477" r="38" fill="url(#selhalo)"/>
    <path id="cairo" d="M795,467L797,485L779,486L777,474Z" fill="#6E6BFF" fill-opacity="0.75" stroke="#D2CEFF" stroke-width="2.5"/>
    <circle class="ring" cx="787" cy="477" r="7" fill="#3E63F2" stroke="#FFFFFF" stroke-width="3.5"/>
    <g class="pin">
      <rect x="808" y="458" width="78" height="32" rx="8" fill="#FFFFFF"/>
      <text x="847" y="480" text-anchor="middle" font-size="18" font-weight="700" fill="#0B1218">القاهرة</text>
    </g>
  </svg>''' + t[s1:]
# Cairo's own dot and name give way to the selection ring and pill
n0 = len(t)
t = re.sub(r'\n    <circle data-city="0"[^\n]*/>\n    <text data-city="0"[^\n]*</text>', '', t)
assert len(t) < n0
(D / 'index.html').write_text(t, encoding='utf-8')
print('assembled', D / 'index.html')
