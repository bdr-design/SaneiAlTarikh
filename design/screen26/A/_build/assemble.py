"""Build design/screen26/A/index.html (the pending orders, §6.4 and §6.7) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, the paused HUD
(design/shared/paused_hud.css and .py: the play button carries the count; the toast slot holds the orders and opens this
list), and this sheet's CSS and markup (orders.css, sheet.html). A side sheet of no dock section, its own identity
(sheetIdentity), the map central (mapCentral). Two bodies and no tab row: the list (&tab=list, default, 3 orders) and the
list after one cancel (&tab=less, 2 orders: the HUD's counts follow).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import json
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
sys.path.insert(0, str(R / 'design/shared'))
import panel_page  # noqa: E402
import paused_hud  # noqa: E402

SYMBOLS = '    ' + paused_hud.QUEUE + '\n    ' + paused_hud.PLAY_SYM
SUBS = paused_hud.subs(3, controls='orders', expanded=True) + [
    # the bell: 2 unread at this moment, as screen 16 has it (so no third «3» beside the orders' counts)
    ('<button class="bell tap" aria-label="الإشعارات، غير المقروءة 3"><svg class="i"><use href="#i-bell"/></svg><span class="badge">3</span></button>',
     '<button class="bell tap" aria-label="الإشعارات، غير المقروءة 2"><svg class="i"><use href="#i-bell"/></svg><span class="badge">2</span></button>'),
    ('<section class="sheet glass" aria-label="أوامر معلّقة">', '<section class="sheet glass" id="orders" aria-label="أوامر معلّقة">')]
# after a cancel (&tab=less) the HUD's counts follow the list: 2
F2 = paused_hud.forms(2)
INIT = ("    if (r.dataset.tab === 'less') document.addEventListener('DOMContentLoaded', function () {\n"
        "      var p = document.querySelector('.date .play'), b = p.querySelector('.o-badge'), t = document.querySelector('.o-toast .txt');\n"
        "      p.setAttribute('aria-label', %s); b.textContent = '2'; t.textContent = %s;\n"
        "    });\n") % (json.dumps(F2['play'], ensure_ascii=False), json.dumps(F2['toast'], ensure_ascii=False))
panel_page.build(R, S, D, title='أوامر معلّقة', sec='orders', tabs=['list', 'less'], fit_tab='list',
                 css=['../../../shared/paused_hud.css', 'orders.css'], symbols=SYMBOLS, init_js=INIT, extra_subs=SUBS)
