"""Build design/screen20/A/index.html (the markets panel, §5.1) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this panel's CSS and
markup (markets.css, sheet.html). The economy section: its identity, its dock item open. Three tabs; the fit level is the
loosest at which the goods tab fits.
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-price" viewBox="0 0 24 24"><path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l8.5 8.5a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0z"/><circle cx="7.75" cy="7.75" r="1.25"/><path d="M12.5 16v-5.5M10.25 12.75l2.25-2.25 2.25 2.25"/></symbol>
    <symbol id="i-ship" viewBox="0 0 24 24"><path d="M3.5 15.5h17l-2.5 4.5H6z"/><path d="M6 15.5V9.5h12v6"/><path d="M9 9.5V6h6v3.5"/><path d="M12 3.5V6"/></symbol>
    <symbol id="i-wheat" viewBox="0 0 24 24"><path d="M12 21V8"/><path d="M12 12c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 12c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z"/><path d="M12 16.5c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 16.5c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z"/><path d="M12 7.5c-1.4-.9-1.9-2.4-1.3-4 1.6.6 2.1 2.1 1.3 4z"/></symbol>
    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5v10"/></symbol>"""
panel_page.build(R, S, D, title='الأسواق', sec='econ', dock_label='الاقتصاد', dock_icon='i-econ',
                 tabs=['goods', 'industry', 'routes'], fit_tab=None, css=['markets.css'], symbols=SYMBOLS)
