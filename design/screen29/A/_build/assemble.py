"""Build design/screen29/A/index.html (the sources and rights sheet, «المصادر والحقوق»: §4.8 Attribution, R5 «قيم تصميمية»,
§6.5) with the shared panel builder (design/shared/check/panel_page.py): the approved B3 play screen, the approved
panels' CSS, and this sheet's CSS and markup (credits.css, sheet.html). Opened from the «المزيد» panel's about tab: the
«المزيد» section's identity, its dock item open. A tab row of three: the data (&tab=data, default), the maps and images
(&tab=maps) and the design values (&tab=values), the map central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.25 3.5h8.25l3.25 3.25V20.5H6.25z"/><path d="M14.25 3.5v3.5h3.5"/><path d="M9 11h6M9 14h6M9 17h3.5"/></symbol>
    <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M5 16.5l4.5-4.5 3.5 3 6-6.5"/><path d="M15 8.5h4v4"/></symbol>
    <symbol id="i-map" viewBox="0 0 24 24"><path d="M3.5 6.5 9 4.5l6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/></symbol>
    <symbol id="i-dial" viewBox="0 0 24 24"><path d="M4.5 7h9M17.5 7h2M4.5 12h3M11.5 12h8M4.5 17h7M15.5 17h4"/><circle cx="15.5" cy="7" r="2"/><circle cx="9.5" cy="12" r="2"/><circle cx="13.5" cy="17" r="2"/></symbol>"""
panel_page.build(R, S, D, title='المصادر والحقوق', sec='more', dock_label='المزيد', dock_icon='i-more',
                 tabs=["data", "maps", "values"], fit_tab="values", css=['credits.css'], symbols=SYMBOLS)
