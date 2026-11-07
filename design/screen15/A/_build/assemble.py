"""Build design/screen15/A/index.html (the decision sheet) with the shared panel builder (design/shared/check/
panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS and markup (decision.css,
sheet.html). One body, no tab row, no section: no dock item is open, the identity is the neutral grey. The game is
paused for the decision (the clock shows play). The map stays central and visible (the owner's rule mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-flame" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.3 2.3-5.4 3.8-7.3.3 1.8 1.2 3 2.4 3.6-.2-3.2 1.2-5.9 3.4-7.6.4 3 2.1 4.6 3.3 6.4 1 1.4 1.6 2.9 1.6 4.9C20 18.4 16.5 21 12 21z"/></symbol>
    <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>
    <symbol id="i-wheat" viewBox="0 0 24 24"><path d="M12 21V8"/><path d="M12 12c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 12c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z"/><path d="M12 16.5c-2.5 0-4-1.5-4-4 2.5 0 4 1.5 4 4zM12 16.5c2.5 0 4-1.5 4-4-2.5 0-4 1.5-4 4z"/><path d="M12 7.5c-1.4-.9-1.9-2.4-1.3-4 1.6.6 2.1 2.1 1.3 4z"/></symbol>
    <symbol id="i-hands" viewBox="0 0 24 24"><path d="M2.5 11.5 6 8l3 1.5 3-2 3 2 3-1.5 3.5 3.5"/><path d="M6 8v5.5l4.5 4a1.5 1.5 0 0 0 2.1 0l5.4-4.75V8"/><path d="M9.5 13.5l2 1.75M12 11.5l2.5 2"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>"""
# the game is paused for the decision: the clock's button shows play and says so
PAUSED = ('<button class="play tap" aria-label="إيقاف مؤقت (اللعبة تعمل)"><svg class="i"><use href="#i-pause"/></svg></button>',
          '<button class="play tap" aria-label="تشغيل (اللعبة متوقفة للقرار)"><svg class="i"><use href="#i-play"/></svg></button>')
# the bell reads its count; the centre is closed
BELL = ('<button class="bell tap" aria-label="الإشعارات">', '<button class="bell tap" aria-label="الإشعارات، 3 غير مقروءة" aria-expanded="false">')
panel_page.build(R, S, D, title='قرار', sec='decision', tabs=['event'], fit_tab=None, css=['decision.css'], symbols=SYMBOLS, extra_subs=[PAUSED, BELL])
