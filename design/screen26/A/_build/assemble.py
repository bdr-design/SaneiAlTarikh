"""Build design/screen26/A/index.html (the pending orders, §6.4 and §6.5) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS and markup
(orders.css, sheet.html). The game is paused: the HUD's play button reads «استئناف» and carries the count of pending
orders; the toast slot holds «3 أوامر معلّقة · تبدأ عند الاستئناف» while paused and opens this list. A side sheet of no dock section, its own identity (sheetIdentity), the map central
(mapCentral). Two bodies and no tab row: the list (&tab=list, default) and the list after one order is cancelled (&tab=less).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-queue" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/><path d="M3.5 4.5l2 2M20.5 4.5l-2 2"/></symbol>
    <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>"""
SUBS = [  # paused: the play button resumes and counts the orders that will start; the toast slot holds the pending orders
        # (it stays while paused, in place of the 3 s toasts) and opens this list
        ('<button class="play tap" aria-label="إيقاف مؤقت (اللعبة تعمل)"><svg class="i"><use href="#i-pause"/></svg></button>',
         '<button class="play tap" aria-label="استئناف (اللعبة موقوفة)، تبدأ 3 أوامر معلّقة"><svg class="i"><use href="#i-play"/></svg><span class="o-badge" aria-hidden="true">3</span></button>'),
        ('<button class="alert-prev tap"><svg class="i"><use href="#i-warn"/></svg><span class="txt">احتجاجات واسعة في تونس</span></button>',
         '<button class="alert-prev tap o-toast" aria-label="3 أوامر معلّقة تنتظر الاستئناف" aria-expanded="true" aria-controls="orders"><svg class="i"><use href="#i-queue"/></svg><span class="txt">3 أوامر تنتظر الاستئناف</span></button>'),
        ('<section class="sheet glass" aria-label="أوامر معلّقة">', '<section class="sheet glass" id="orders" aria-label="أوامر معلّقة">')]
panel_page.build(R, S, D, title='أوامر معلّقة', sec='orders', tabs=['list', 'less'], fit_tab='list', css=['orders.css'], symbols=SYMBOLS, extra_subs=SUBS)
