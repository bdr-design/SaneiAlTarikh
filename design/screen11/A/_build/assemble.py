"""Build design/screen11/A/index.html (the intelligence panel) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this panel's CSS and
markup (intel.css, sheet.html). The fit level is the loosest at which the overview fits.
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5v10"/></symbol>
    <symbol id="i-net" viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="2"/><circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/><path d="M11 7.3 6.5 16.2M13 7.3l4.5 8.9M7.5 18h9"/></symbol>
    <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></symbol>
    <symbol id="i-lock" viewBox="0 0 24 24"><rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8.5 10.5V7.75a3.5 3.5 0 0 1 7 0v2.75"/></symbol>"""
panel_page.build(R, S, D, title='الاستخبارات', sec='intel', dock_label='الاستخبارات', dock_icon='i-eye',
                 tabs=['overview', 'networks', 'ops', 'counter'], fit_tab='overview', css=['intel.css'], symbols=SYMBOLS)
