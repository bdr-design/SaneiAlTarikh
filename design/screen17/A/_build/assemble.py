"""Build design/screen17/A/index.html (the «لماذا؟» sheet for stability) with the shared panel builder (design/shared/check/
panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS and markup (why.css,
sheet.html). One body, no tab row, no section: no dock item open, the neutral grey identity. The game is paused (the
clock shows play); the HUD's «الاستقرار» chip is shown as the one that opened the sheet. The map stays central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>"""
SUBS = [('<button class="play tap" aria-label="إيقاف مؤقت (اللعبة تعمل)"><svg class="i"><use href="#i-pause"/></svg></button>',
         '<button class="play tap" aria-label="تشغيل (اللعبة متوقفة)"><svg class="i"><use href="#i-play"/></svg></button>'),
        ('<button class="bell tap" aria-label="الإشعارات"><svg class="i"><use href="#i-bell"/></svg><span class="badge">3</span></button>',
         '<button class="bell tap" aria-label="الإشعارات، غير المقروءة 2" aria-expanded="false"><svg class="i"><use href="#i-bell"/></svg><span class="badge">2</span></button>'),
        ('<button class="stat tap"><span class="stat-in">\n        <span class="lblrow"><span class="lbl">الاستقرار</span>',
         '<button class="stat tap" aria-label="الاستقرار 58%، ينخفض. لماذا؟" aria-expanded="true"><span class="stat-in">\n        <span class="lblrow"><span class="lbl">الاستقرار</span>')]
panel_page.build(R, S, D, title='لماذا؟ الاستقرار', sec='more', tabs=['why'], fit_tab=None, css=['why.css'], symbols=SYMBOLS, extra_subs=SUBS)
