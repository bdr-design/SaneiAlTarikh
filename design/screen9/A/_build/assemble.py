"""Build design/screen9/A/index.html (the military panel) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this panel's CSS and
markup (military.css, sheet.html). The fit level is the loosest at which the overview fits.
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5v10"/></symbol>
    <symbol id="i-gear" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M12 3.5v2.25M12 18.25v2.25M3.5 12h2.25M18.25 12h2.25M6 6l1.6 1.6M16.4 16.4 18 18M6 18l1.6-1.6M16.4 7.6 18 6"/><circle cx="12" cy="12" r="6.25"/></symbol>
    <symbol id="i-flag" viewBox="0 0 24 24"><path d="M5.5 21V3.5"/><path d="M5.5 4.5h11l-2.5 4 2.5 4h-11"/></symbol>
    <symbol id="i-plane" viewBox="0 0 24 24"><path d="M12 3c.9 0 1.5.8 1.5 1.8V9.5l7 4v2l-7-2v4.25l2.25 1.75v1.5L12 20l-3.75 1v-1.5l2.25-1.75V13.5l-7 2v-2l7-4V4.8C10.5 3.8 11.1 3 12 3z"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.25 3.5h8.25l3.25 3.25V20.5H6.25z"/><path d="M14.25 3.5v3.5h3.5"/><path d="M9 11h6M9 14h6M9 17h3.5"/></symbol>"""
panel_page.build(R, S, D, title='الجيش', sec='army', dock_label='الجيش', dock_icon='i-army',
                 tabs=['overview', 'forces', 'equipment', 'wars'], fit_tab='overview', css=['military.css'], symbols=SYMBOLS)
