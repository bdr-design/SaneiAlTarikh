"""Build design/screen18/C/index.html (the government dissolved, §5.11) with the shared panel builder (design/shared/check/panel_page.py): the
approved B3 play screen, the approved panels' CSS, and this sheet's CSS and markup (end.css, sheet.html). One body, no tab
row, no section: no dock item open, its own identity (sheetIdentity). The clock waits for the choice (stopped, it cannot be resumed until then). The date is 12 أغسطس 2031; the nation card names no real
person after 2011 (المجلس الانتقالي). The map stays central (mapCentral).
Usage: python3 -I assemble.py <repo> <this _build dir> <out dir>"""
import sys
from pathlib import Path
R, S, D = map(Path, sys.argv[1:4])
sys.path.insert(0, str(R / 'design/shared/check'))
import panel_page  # noqa: E402
import end_hud  # noqa: E402

SYMBOLS = """    <symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>
    <symbol id="i-hands" viewBox="0 0 24 24"><path d="M2.5 11.5 6 8l3 1.5 3-2 3 2 3-1.5 3.5 3.5"/><path d="M6 8v5.5l4.5 4a1.5 1.5 0 0 0 2.1 0l5.4-4.75V8"/><path d="M9.5 13.5l2 1.75M12 11.5l2.5 2"/></symbol>"""
SUBS = [('<button class="spd tap" aria-label="السرعة 1×" aria-haspopup="menu" aria-controls="speedmenu">', '<button class="spd tap" aria-label="السرعة 1× (غير متاحة)" aria-disabled="true">'),
        ('<button class="play tap" aria-label="إيقاف مؤقت (اللعبة تعمل)"><svg class="i"><use href="#i-pause"/></svg></button>',
         '<button class="play tap" aria-label="الوقت متوقف حتى تختار" aria-disabled="true"><svg class="i"><use href="#i-play"/></svg></button>'),
        ('<span class="dow">السبت</span><span class="dmy">1 يناير 2011</span>', '<span class="dow">الثلاثاء</span><span class="dmy">12 أغسطس 2031</span>'),
        ('aria-label="الدولة: مصر، حسني مبارك، جمهورية رئاسية"', 'aria-label="الدولة: مصر، المجلس الانتقالي، حكم انتقالي"'),
        ('<span class="txt">احتجاجات واسعة في تونس</span>', '<span class="txt">ثورة: سقطت الحكومة</span>'),
        ('<span class="ldr">حسني مبارك</span>', '<span class="ldr">المجلس</span>'),
        ('<span class="rg">جمهورية رئاسية</span>', '<span class="rg">حكم انتقالي</span>'),
        ('<span class="num ltr">58%</span>', '<span class="num ltr">31%</span>'),
        ('<svg class="i"><use href="#i-seal"/></svg><span class="num">44</span>', '<svg class="i"><use href="#i-seal"/></svg><span class="num">35</span>')]
# the HUD at the end moment: its values, and no trend while the clock is stopped (shared/check/end_hud.py)
SUBS += end_hud.end_subs({'الخزينة': '<span class="num">18.4<span class="unit"> مليار $</span></span>', 'القوة البشرية': '<span class="num">2.7<span class="unit"> مليون</span></span>', 'النفوذ': '<span class="num">51</span>', 'البحث': '<span class="num"><span class="ltr">+12</span><span class="unit"> / شهر</span></span>'})
panel_page.build(R, S, D, title='سقطت حكومتك', sec='end', tabs=['fallen'], fit_tab=None, css=['end.css'], symbols=SYMBOLS, extra_subs=SUBS)
