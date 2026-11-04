"""Build design/screen18/B/index.html (the nuclear end, §5.11 rung 5) with the shared panel builder (design/shared/check/panel_page.py): the
approved B3 play screen, the approved panels' CSS, and this sheet's CSS and markup (end.css, sheet.html). One body, no tab
row, no section: no dock item open, the neutral grey identity. The clock is stopped for good (the campaign is over). The date is 15 مارس 2034; the nation card names no real
person after 2011 (رئيس الدولة). The map stays central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>
    <symbol id="i-clock" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></symbol>"""
SUBS = [('<button class="spd tap" aria-label="السرعة 1×" aria-haspopup="menu" aria-controls="speedmenu">', '<button class="spd tap" aria-label="السرعة 1× (غير متاحة)" aria-disabled="true">'),
        ('<button class="play tap" aria-label="إيقاف مؤقت (اللعبة تعمل)"><svg class="i"><use href="#i-pause"/></svg></button>',
         '<button class="play tap" aria-label="الحملة منتهية (الوقت متوقف)" aria-disabled="true"><svg class="i"><use href="#i-play"/></svg></button>'),
        ('<span class="dow">السبت</span><span class="dmy">1 يناير 2011</span>', '<span class="dow">الأربعاء</span><span class="dmy">15 مارس 2034</span>'),
        ('aria-label="الدولة: مصر، حسني مبارك، جمهورية رئاسية"', 'aria-label="الدولة: مصر، رئيس الدولة، جمهورية رئاسية"'),
        ('<span class="txt">احتجاجات واسعة في تونس</span>', '<span class="txt">انتهت الحملة</span>'),
        ('<span class="ldr">حسني مبارك</span>', '<span class="ldr">رئيس الدولة</span>')]
panel_page.build(R, S, D, title='نهاية الحملة', sec='more', tabs=['nuclear'], fit_tab=None, css=['end.css'], symbols=SYMBOLS, extra_subs=SUBS)
