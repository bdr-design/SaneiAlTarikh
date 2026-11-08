"""Build design/screen16/A/index.html (the notification centre) with the shared panel builder (design/shared/check/
panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS and markup (center.css,
sheet.html). One body, no tab row, no section: no dock item open, its own identity (sheetIdentity). The player paused the game
(the clock shows play, with screen 26's paused HUD: the play button counts the one pending order, the toast slot holds it); the bell reads its count and is shown open. The map stays central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

sys.path.insert(0, str(R / 'design/shared'))
import paused_hud  # noqa: E402
SYMBOLS = '    ' + paused_hud.PLAY_SYM + '\n    ' + paused_hud.QUEUE
# paused with one pending order (the western army to Siwa): screen 26's paused HUD, the play button with its count and the
# toast slot holding the order (its list closed here: the notification centre is open)
SUBS = paused_hud.subs(1) + [
        ('<button class="bell tap" aria-label="الإشعارات، غير المقروءة 3"><svg class="i"><use href="#i-bell"/></svg><span class="badge">3</span></button>', '<button class="bell tap" aria-label="الإشعارات، غير المقروءة 2" aria-expanded="true"><svg class="i"><use href="#i-bell"/></svg><span class="badge">2</span></button>')]
panel_page.build(R, S, D, title='الإشعارات', sec='notify', tabs=['center'], fit_tab=None, css=['../../../shared/paused_hud.css', 'center.css'], symbols=SYMBOLS, extra_subs=SUBS)
