"""Build design/screen23/A/index.html (the save-file sheet, §6.5 and decisions «saves», D-4, D-28) with the shared panel
builder (design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS
and markup (save.css, sheet.html). Opened from the «المزيد» panel's saves tab (its autosave row): the «المزيد» section's
identity, its dock item open. Two bodies and no tab row: the file (&tab=file, default) and the delete confirmation
(&tab=confirm), both in the sheet, the map central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-save" viewBox="0 0 24 24"><path d="M5 4.5h11.5L19.5 7.5v12H5z"/><path d="M8 4.5v4.5h7V4.5"/><rect x="8" y="13" width="8" height="6.5" rx="1"/></symbol>
    <symbol id="i-share" viewBox="0 0 24 24"><path d="M12 3.5v11"/><path d="M8 7.25 12 3.5l4 3.75"/><path d="M6.5 11H5v9.5h14V11h-1.5"/></symbol>
    <symbol id="i-load" viewBox="0 0 24 24"><path d="M4.75 12a7.25 7.25 0 1 0 2.1-5.1"/><path d="M4.75 3.75v4.5h4.5"/><path d="M12 8.5V12l2.75 1.75"/></symbol>
    <symbol id="i-trash" viewBox="0 0 24 24"><path d="M4.5 6.5h15"/><path d="M9.5 6.5V4.5h5v2"/><path d="M6.5 6.5l1 13.5h9l1-13.5"/><path d="M10 10.5v6M14 10.5v6"/></symbol>"""
panel_page.build(R, S, D, title='حفظ تلقائي', sec='more', dock_label='المزيد', dock_icon='i-more',
                 tabs=['file', 'confirm'], fit_tab='file', css=['save.css'], symbols=SYMBOLS)
