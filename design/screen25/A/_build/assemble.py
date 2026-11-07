"""Build design/screen25/A/index.html (the save mirror prompt, D-28 and design doc §7 «Mirror») with the shared panel
builder (design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS
and markup (mirror.css, sheet.html). Shown once after the first manual save in the «المزيد» panel's saves tab: the
«المزيد» section's identity, its dock item open. Three bodies and no tab row: the ask (&tab=ask, default), the folder
chosen (&tab=done) and the folder gone (&tab=stale), all in the sheet, the map central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3.5 6.5h6l2 2h9v10.5h-17z"/><path d="M3.5 11h17"/></symbol>
    <symbol id="i-later" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/></symbol>"""
panel_page.build(R, S, D, title='نسخة احتياطية', sec='more', dock_label='المزيد', dock_icon='i-more',
                 tabs=['ask', 'done', 'stale'], fit_tab='ask', css=['mirror.css'], symbols=SYMBOLS)
