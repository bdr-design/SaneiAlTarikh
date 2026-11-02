"""Build design/proposals/S5_identity/index.html: the state panel proposal (S5_state) with the section identity and the
white touches (identity.css, ?theme=touch|light). Reuses S5_state's assembler, sheet markup (with the emblem and the
primary buttons marked) and state CSS. Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import subprocess
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
s5 = R / 'design/proposals/S5_state/_build'
gen = S / 'state.css'                       # generated for the build only: S5's state CSS + the identity CSS
gen.write_text((s5 / 'state.css').read_text(encoding='utf-8') + (S / 'identity.css').read_text(encoding='utf-8'), encoding='utf-8')
try:
    subprocess.run([sys.executable, '-I', str(s5 / 'assemble.py'), str(R), str(S), str(D)], check=True)
finally:
    gen.unlink()
p = D / 'index.html'
t = p.read_text(encoding='utf-8')
a = "    window.__scrollEnd = q.get('scroll') === 'end';\n"
assert t.count(a) == 1
t = t.replace(a, a + "    r.dataset.theme = q.get('theme') === 'light' ? 'light' : 'touch';\n")
assert t.count('<title>لوحة الدولة</title>') == 1
t = t.replace('<title>لوحة الدولة</title>', '<title>هوية الأقسام: الدولة</title>')
p.write_text(t, encoding='utf-8')
print('identity page built')
