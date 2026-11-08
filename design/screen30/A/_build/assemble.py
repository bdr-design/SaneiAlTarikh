"""Build design/screen30/A/index.html (the start tour, «جولة البداية»: onboarding, §6.1's pending list and M8; its cards the
cut list's «onboarding cards») with the shared panel builder (design/shared/check/panel_page.py): the approved B3 play
screen, the approved panels' CSS, and this sheet's CSS and markup (tour.css, sheet.html). It opens by itself when a new
campaign starts, the game paused, and again from «المزيد» › «حول» › «المساعدة»: a side sheet in the «المزيد» section's frame (help
lives there; its own emblem), the map central and never dimmed (mapCentral). Five steps, one body each and no tab row
(&tab=s1..s5); each step rings the HUD element it speaks about (a white outline around it, nothing over the map).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
sys.path.insert(0, str(R / 'design/shared'))
import panel_page  # noqa: E402
import paused_hud  # noqa: E402

SYMBOLS = ('    ' + paused_hud.PLAY_SYM + '\n'
           '    <symbol id="i-tour" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.75"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/></symbol>\n'
           '    <symbol id="i-next" viewBox="0 0 24 24"><path d="M19 12H5"/><path d="M10 7l-5 5 5 5"/></symbol>\n'
           '    <symbol id="i-skip" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></symbol>\n'
           '    <symbol id="i-play2" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>')
# the game is paused while the tour is open: the play button shows play (no orders are pending at the start)
SUBS = [(paused_hud.PLAY, '<button class="play tap" aria-label="تشغيل (اللعبة متوقفة)"><svg class="i"><use href="#i-play"/></svg></button>')]
panel_page.build(R, S, D, title='جولة البداية', sec='more', dock_label='المزيد', dock_icon='i-more',
                 tabs=['s1', 's2', 's3', 's4', 's5'], fit_tab='s3', css=['tour.css'], symbols=SYMBOLS, extra_subs=SUBS)
