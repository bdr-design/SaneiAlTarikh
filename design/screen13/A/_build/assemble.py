"""Build design/screen13/A/index.html (the «المزيد» panel: saves, settings, log, about) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this panel's CSS and
markup (more.css, sheet.html). The fit level is the loosest at which the log tab fits (the saves tab scrolls on the smaller phones).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-save" viewBox="0 0 24 24"><path d="M5 4.5h11.5L19.5 7.5v12H5z"/><path d="M8 4.5v4.5h7V4.5"/><rect x="8" y="13" width="8" height="6.5" rx="1"/></symbol>
    <symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.25M12 18.25v2.25M3.5 12h2.25M18.25 12h2.25M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/><circle cx="12" cy="12" r="6.25"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.25 3.5h8.25l3.25 3.25V20.5H6.25z"/><path d="M14.25 3.5v3.5h3.5"/><path d="M9 11h6M9 14h6M9 17h3.5"/></symbol>
    <symbol id="i-info" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5"/><path d="M12 7.75h.01" stroke-width="2.4"/></symbol>
    <symbol id="i-share" viewBox="0 0 24 24"><path d="M12 3.5v11"/><path d="M8 7.25 12 3.5l4 3.75"/><path d="M6.5 11H5v9.5h14V11h-1.5"/></symbol>
    <symbol id="i-flag" viewBox="0 0 24 24"><path d="M5.5 21V3.5"/><path d="M5.5 4.5h11l-2.5 4 2.5 4h-11"/></symbol>
    <symbol id="i-folder" viewBox="0 0 24 24"><path d="M3.5 6.5h6l2 2h9v10.5h-17z"/><path d="M3.5 11h17"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></symbol>
    <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M5 16.5l4.5-4.5 3.5 3 6-6.5"/><path d="M15 8.5h4v4"/></symbol>"""
panel_page.build(R, S, D, title='المزيد', sec='more', dock_label='المزيد', dock_icon='i-more',
                 tabs=['saves', 'settings', 'log', 'about'], fit_tab='log', css=['more.css'], symbols=SYMBOLS)
