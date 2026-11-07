"""Build design/screen22/A/index.html (the new-operation sheet, §5.6) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS and markup
(newop.css, sheet.html). The intelligence section: its identity, its dock item open; one body, no tab row. The map stays
central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-target" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="4"/><path d="M12 2.5v4M12 17.5v4M2.5 12h4M17.5 12h4"/></symbol>
    <symbol id="i-net" viewBox="0 0 24 24"><circle cx="12" cy="5.5" r="2"/><circle cx="5.5" cy="18" r="2"/><circle cx="18.5" cy="18" r="2"/><path d="M11 7.3 6.5 16.2M13 7.3l4.5 8.9M7.5 18h9"/></symbol>
    <symbol id="i-hands" viewBox="0 0 24 24"><path d="M2.5 11.5 6 8l3 1.5 3-2 3 2 3-1.5 3.5 3.5"/><path d="M6 8v5.5l4.5 4a1.5 1.5 0 0 0 2.1 0l5.4-4.75V8"/><path d="M9.5 13.5l2 1.75M12 11.5l2.5 2"/></symbol>
    <symbol id="i-podium" viewBox="0 0 24 24"><path d="M4.5 10h15"/><path d="M6.5 10 8 20.5h8L17.5 10"/><path d="M12 10V6"/><circle cx="12" cy="4.5" r="1.5"/><path d="M10 14h4"/></symbol>
    <symbol id="i-flag" viewBox="0 0 24 24"><path d="M5.5 21V3.5"/><path d="M5.5 4.5h11l-2.5 4 2.5 4h-11"/></symbol>
    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.8-7.3.3 1.8 1.2 3 2.4 3.6-.2-3.2 1.2-5.9 3.4-7.6.4 3 2.1 4.6 3.3 6.4 1 1.4 1.6 2.9 1.6 4.9C20 18.4 16.5 21 12 21z"/></symbol>"""
panel_page.build(R, S, D, title='عملية جديدة', sec='intel', dock_label='الاستخبارات', dock_icon='i-eye',
                 tabs=['newop'], fit_tab=None, css=['newop.css'], symbols=SYMBOLS)
