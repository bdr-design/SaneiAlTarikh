"""Build design/screen8/A/index.html (the internal and politics panel) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this panel's CSS and
markup (internal.css, sheet.html). The fit level is the loosest at which the overview fits.
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5v10"/></symbol>
    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.75-2.6-6.75-6.3 0-3.2 2.2-5.1 3.6-7.4.3 1.9 1.3 3 2.4 3.5C11 7.6 12.2 5 14.6 3c-.2 3 1.3 4.6 2.6 6.2 1.1 1.4 1.55 2.9 1.55 4.5C18.75 18.4 15.9 21 12 21z"/><path d="M12 21c-1.6 0-2.75-1.1-2.75-2.6 0-1.7 1.4-2.6 2.1-4 .9 1.1 3.4 2.3 3.4 4 0 1.5-1.15 2.6-2.75 2.6z"/></symbol>
    <symbol id="i-podium" viewBox="0 0 24 24"><path d="M4.5 10h15"/><path d="M6.5 10 8 20.5h8L17.5 10"/><path d="M12 10V6"/><circle cx="12" cy="4.5" r="1.5"/><path d="M10 14h4"/></symbol>
    <symbol id="i-doc" viewBox="0 0 24 24"><path d="M6.25 3.5h8.25l3.25 3.25V20.5H6.25z"/><path d="M14.25 3.5v3.5h3.5"/><path d="M9 11h6M9 14h6M9 17h3.5"/></symbol>
    <symbol id="i-capital" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.25l1.45 2.95 3.25.45-2.35 2.3.55 3.2L12 14.6l-2.9 1.55.55-3.2-2.35-2.3 3.25-.45z"/></symbol>"""
panel_page.build(R, S, D, title='الداخلية والسياسة', sec='pol', dock_label='الداخلية والسياسة', dock_icon='i-pol',
                 tabs=['overview', 'unrest', 'parties', 'groups'], fit_tab='overview', css=['internal.css'], symbols=SYMBOLS)
