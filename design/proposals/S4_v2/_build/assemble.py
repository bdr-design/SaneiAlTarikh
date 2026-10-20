"""Build design/proposals/S4_v2/index.html from variant A's page, the proposal sheet and the themes."""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
t = (R / 'design/screen4/A/index.html').read_text(encoding='utf-8')
a0 = t.index('<style>\n  /* ================= Screen 4, variant A')
a1 = t.index('</style>', a0) + len('</style>')
t = t[:a0] + '<style>\n' + (S / 'themes.css').read_text(encoding='utf-8') + '</style>' + t[a1:]
m0 = t.index('  <!-- Province panel: tabbed side sheet from the right -->')
m1 = t.index('  </section>', t.index('<section class="sheet glass"', m0)) + len('  </section>')
t = t[:m0] + (S / 'sheet.html').read_text(encoding='utf-8').rstrip('\n') + t[m1:]
old = '.then(fitTop).then(sizeSheet).then(placeSheet).then(fitSheet).then(placeMap)'
assert t.count(old) == 1
t = t.replace(old, '.then(fitTop).then(sizeSheet).then(placeSheet).then(placeMap)')
dev = "    window.__dev = { W: W, H: H, SIDE: SIDE, BOTTOM: BOTTOM, CUT: CUT };"
assert t.count(dev) == 1
t = t.replace(dev, dev + "\n    document.documentElement.dataset.theme = q.get('theme') || '8';")
flame = '    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.75-2.6-6.75-6.3 0-3.2 2.2-5.1 3.6-7.4.3 1.9 1.3 3 2.4 3.5C11 7.6 12.2 5 14.6 3c-.2 3 1.3 4.6 2.6 6.2 1.1 1.4 1.55 2.9 1.55 4.5C18.75 18.4 15.9 21 12 21z"/><path d="M12 21c-1.6 0-2.75-1.1-2.75-2.6 0-1.7 1.4-2.6 2.1-4 .9 1.1 3.4 2.3 3.4 4 0 1.5-1.15 2.6-2.75 2.6z"/></symbol>\n  </defs>'
assert t.count('  </defs>') == 1
t = t.replace('  </defs>', flame)
old_w = 'want = Math.min(440, Math.max(340, 0.42 * safe))'
assert t.count(old_w) == 1
t = t.replace(old_w, 'want = Math.min(480, Math.max(360, 0.52 * safe))')   # version 2: a wider sheet (owner: too small)
(D / 'index.html').write_text(t, encoding='utf-8')
print('assembled')
