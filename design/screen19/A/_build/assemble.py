"""Build design/screen19/A/index.html (the map-mode chooser, §6.6) with the shared panel builder
(design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS and
markup (modes.css, sheet.html). One body, no tab row, no section: no dock item open, the neutral grey identity. The
chosen mode «الأمن» is drawn on the map at once: its layer (map_mode_security.svg, made by tools/mapmode.py from Natural
Earth) goes between the satellite base and the borders (map_overlay_mode.svg: the approved overlay without the player's
teal fill, so Egypt's bands read as the legend; the glow stays), and the HUD's mode button reads it and shows the sheet open
(its text in B3's width, so the left column stays in place). The map stays central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-flag" viewBox="0 0 24 24"><path d="M5.5 21V3.5"/><path d="M5.5 4.5h11l-2.5 4 2.5 4h-11"/></symbol>
    <symbol id="i-hands" viewBox="0 0 24 24"><path d="M2.5 11.5 6 8l3 1.5 3-2 3 2 3-1.5 3.5 3.5"/><path d="M6 8v5.5l4.5 4a1.5 1.5 0 0 0 2.1 0l5.4-4.75V8"/><path d="M9.5 13.5l2 1.75M12 11.5l2.5 2"/></symbol>
    <symbol id="i-grid" viewBox="0 0 24 24"><rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="M3.5 9.5h17"/><path d="M9.5 9.5v10"/></symbol>
    <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M5 16.5l4.5-4.5 3.5 3 6-6.5"/><path d="M15 8.5h4v4"/></symbol>
    <symbol id="i-price" viewBox="0 0 24 24"><path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l8.5 8.5a1 1 0 0 1 0 1.4l-7.1 7.1a1 1 0 0 1-1.4 0z"/><circle cx="7.75" cy="7.75" r="1.25"/><path d="M12.5 16v-5.5M10.25 12.75l2.25-2.25 2.25 2.25"/></symbol>
    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.8-7.3.3 1.8 1.2 3 2.4 3.6-.2-3.2 1.2-5.9 3.4-7.6.4 3 2.1 4.6 3.3 6.4 1 1.4 1.6 2.9 1.6 4.9C20 18.4 16.5 21 12 21z"/></symbol>
    <symbol id="i-podium" viewBox="0 0 24 24"><path d="M4.5 10h15"/><path d="M6.5 10 8 20.5h8L17.5 10"/><path d="M12 10V6"/><circle cx="12" cy="4.5" r="1.5"/><path d="M10 14h4"/></symbol>
    <symbol id="i-drop" viewBox="0 0 24 24"><path d="M12 3.5c3 3.9 6 7.3 6 10.6a6 6 0 0 1-12 0c0-3.3 3-6.7 6-10.6z"/><path d="M9.25 14.5a2.75 2.75 0 0 0 2.75 2.75"/></symbol>"""
SUBS = [('<img src="map_overlay_cairo.svg" alt="">', '<img class="mode-layer" src="map_mode_security.svg" alt="">\n  <img src="map_overlay_mode.svg" alt="">'),
        ('<button class="btn glass ctl tap mode"><svg class="i"><use href="#i-layers"/></svg><span><span class="k">الخريطة:</span> سياسية</span></button>',
         '<button class="btn glass ctl tap mode" aria-label="الخريطة: الأمن" aria-expanded="true"><svg class="i"><use href="#i-layers"/></svg><span class="m-lbl"><span class="k">الخريطة:</span> الأمن</span></button>')]
panel_page.build(R, S, D, title='أوضاع الخريطة', sec='more', tabs=['modes'], fit_tab=None, css=['modes.css'], symbols=SYMBOLS, extra_subs=SUBS)
