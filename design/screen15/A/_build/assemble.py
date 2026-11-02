"""Build design/screen15/A/index.html (the event and decision modal, the notification centre) from screen 4 A's page
(the approved B3 play screen with opaque panels and the map): the province sheet and Cairo's selection layer come out;
event.css, the scrim and modal (event.html) and the centre (center.html) go in; event.js replaces the sheet and map code.
URL: &state=event (default: the decision modal over the paused game) | center (the notification centre; &scroll=mid|end).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
t = (R / 'design/screen4/A/index.html').read_text(encoding='utf-8')


def sub(old, new, n=1):
    global t
    assert t.count(old) == n, (old[:60], t.count(old))
    t = t.replace(old, new)


def cut(start, end, new, keep_end=True):
    global t
    assert t.count(start) == 1, start[:60]
    a = t.index(start)
    b = t.index(end, a)
    t = t[:a] + new + (t[b:] if keep_end else t[b + len(end):])


sub('<title>لوحة المحافظة A</title>', '<title>الأحداث والإشعارات</title>')
sub("     &tab=politics|society|economy|security opens that tab of the province sheet (default politics = «السياسة»).\n",
    "     &state=event|center: the decision modal (default) or the notification centre (screen 15).\n")
sub("    r.dataset.tab = ['politics', 'society', 'economy', 'security'].indexOf(q.get('tab')) >= 0 ? q.get('tab') : 'politics';\n", "")
sub('</style>\n</head>', (S / 'event.css').read_text(encoding='utf-8') + '</style>\n</head>')
SYMBOLS = """    <!-- screen 15: play (the paused clock), the protests category -->
    <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>
    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.8-7.3.3 1.8 1.2 3 2.4 3.6-.2-3.2 1.2-5.9 3.4-7.6.4 3 2.1 4.6 3.3 6.4 1 1.4 1.6 2.9 1.6 4.9C20 18.4 16.5 21 12 21z"/></symbol>
"""
sub('  </defs>', SYMBOLS + '  </defs>')
cut('  <!-- the tapped province: Cairo Governorate', '</div>\n\n<div class="hud">', '', keep_end=True)
cut('  <!-- Province panel: tabbed side sheet from the right -->', '  </section>\n', '', keep_end=False)
# the centre right after the left stack, so VoiceOver reaches it before the dock
sub('  <!-- Section dock -->', (S / 'center.html').read_text(encoding='utf-8') + '\n  <!-- Section dock -->')
sub('<!-- Device silhouette drawn on top', (S / 'event.html').read_text(encoding='utf-8') + '\n<!-- Device silhouette drawn on top')
cut('  /* ---------- Province sheet ---------- */', '  /* Frosted glass for the mockup render.', (S / 'event.js').read_text(encoding='utf-8') + '\n')
sub('.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(placeMap).then(frost)', '.then(fitTop).then(startEvents).then(placeMap15).then(frost)')
(Path(D) / 'index.html').write_text(t, encoding='utf-8')
print('assembled', Path(D) / 'index.html')
