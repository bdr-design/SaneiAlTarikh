"""Build design/screen21/A/index.html (the relation sheet, §5.5: Egypt and Ethiopia) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS and markup
(relation.css, sheet.html). The foreign section: its identity, its dock item open; one body, no tab row. The map stays
central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-hands" viewBox="0 0 24 24"><path d="M2.5 11.5 6 8l3 1.5 3-2 3 2 3-1.5 3.5 3.5"/><path d="M6 8v5.5l4.5 4a1.5 1.5 0 0 0 2.1 0l5.4-4.75V8"/><path d="M9.5 13.5l2 1.75M12 11.5l2.5 2"/></symbol>"""
panel_page.build(R, S, D, title='العلاقة مع إثيوبيا', sec='foreign', dock_label='الخارجية', dock_icon='i-globe',
                 tabs=['relation'], fit_tab=None, css=['relation.css'], symbols=SYMBOLS)
