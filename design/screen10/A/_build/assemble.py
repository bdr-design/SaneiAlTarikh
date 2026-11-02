"""Build design/screen10/A/index.html (the foreign panel) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this panel's CSS and
markup (foreign.css, sheet.html). The fit level is the loosest at which the overview fits.
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5v10"/></symbol>
    <symbol id="i-hands" viewBox="0 0 24 24"><path d="M2.5 11.5 6 8l3 1.5 3-2 3 2 3-1.5 3.5 3.5"/><path d="M6 8v5.5l4.5 4a1.5 1.5 0 0 0 2.1 0l5.4-4.75V8"/><path d="M9.5 13.5l2 1.75M12 11.5l2.5 2"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.25 3.5h8.25l3.25 3.25V20.5H6.25z"/><path d="M14.25 3.5v3.5h3.5"/><path d="M9 11h6M9 14h6M9 17h3.5"/></symbol>"""
panel_page.build(R, S, D, title='الخارجية', sec='foreign', dock_label='الخارجية', dock_icon='i-globe',
                 tabs=['overview', 'relations', 'treaties', 'un'], fit_tab='overview', css=['foreign.css'], symbols=SYMBOLS)
