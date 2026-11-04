"""Build design/screen18/A/index.html (the end of the campaign: «تقرير الأمة», 31 December 2100) with the shared panel
builder (design/shared/check/panel_page.py): the approved B3 play screen, the approved panels' CSS, and this sheet's CSS
and markup (end.css, sheet.html). One body, no tab row, no section: no dock item open, the neutral grey identity. The
clock is stopped for good (the campaign is over); the date is 31 December 2100, and the HUD's stability and influence
show the report's 2100 values. The map stays central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402

SYMBOLS = """    <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>
    <symbol id="i-chart" viewBox="0 0 24 24"><path d="M4 20h16"/><path d="M5 16.5l4.5-4.5 3.5 3 6-6.5"/><path d="M15 8.5h4v4"/></symbol>"""
SUBS = [('<button class="play tap" aria-label="إيقاف مؤقت (اللعبة تعمل)"><svg class="i"><use href="#i-pause"/></svg></button>',
         '<button class="play tap" aria-label="الحملة منتهية (الوقت متوقف)" aria-disabled="true"><svg class="i"><use href="#i-play"/></svg></button>'),
        ('<span class="dow">السبت</span><span class="dmy">1 يناير 2011</span>', '<span class="dow">الجمعة</span><span class="dmy">31 ديسمبر 2100</span>'),
        ('aria-label="الدولة: مصر، حسني مبارك، جمهورية رئاسية"', 'aria-label="الدولة: مصر، رئيس الجمهورية، جمهورية رئاسية"'),
        ('<span class="ldr">حسني مبارك</span>', '<span class="ldr">رئيس الجمهورية</span>'),
        ('<span class="txt">احتجاجات واسعة في تونس</span>', '<span class="txt">انتهت الحملة في 2100</span>'),
        ('<span class="num ltr">58%</span>', '<span class="num ltr">71%</span>'),
        ('<svg class="i"><use href="#i-signal"/></svg><span class="num">62</span>', '<svg class="i"><use href="#i-signal"/></svg><span class="num">70</span>')]
panel_page.build(R, S, D, title='تقرير الأمة', sec='more', tabs=['report'], fit_tab=None, css=['end.css'], symbols=SYMBOLS, extra_subs=SUBS)
