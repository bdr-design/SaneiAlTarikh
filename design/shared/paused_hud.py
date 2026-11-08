"""The HUD while paused with pending orders (screen 26 defines it; screen 16 shows it too): the play button carries the
count of orders that will be carried out on resume (a badge in the pending orders' colour), and the toast slot holds them
while paused and opens their list. The Arabic counted forms for any count. Used by the screens' assemble.py.
PLAY and TOAST are B3's markup as the shared panel builder leaves it."""
PLAY = '<button class="play tap" aria-label="إيقاف مؤقت (اللعبة تعمل)"><svg class="i"><use href="#i-pause"/></svg></button>'
TOAST = '<button class="alert-prev tap"><svg class="i"><use href="#i-warn"/></svg><span class="txt">احتجاجات واسعة في تونس</span></button>'
QUEUE = '<symbol id="i-queue" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.25"/><path d="M12 7.5V12l3 2"/><path d="M3.5 4.5l2 2M20.5 4.5l-2 2"/></symbol>'
PLAY_SYM = '<symbol id="i-play" viewBox="0 0 24 24"><path d="M8 5.5v13l10.5-6.5z"/></symbol>'
WORDS = {3: 'الثلاثة', 4: 'الأربعة', 5: 'الخمسة', 6: 'الستة', 7: 'السبعة', 8: 'الثمانية', 9: 'التسعة', 10: 'العشرة'}


def forms(n):
    """toast text, the play button's VoiceOver label, the resume row's line, for n pending orders"""
    if n == 1:
        t, p, r = 'أمر واحد ينتظر الاستئناف', 'يُنفَّذ أمر معلّق واحد', 'يُنفَّذ الأمر'
    elif n == 2:
        t, p, r = 'أمران ينتظران الاستئناف', 'يُنفَّذ أمران معلّقان', 'يُنفَّذ الأمران'
    elif n <= 10:
        t, p, r = f'{n} أوامر تنتظر الاستئناف', f'تُنفَّذ {n} أوامر معلّقة', 'تُنفَّذ الأوامر ' + WORDS[n]
    else:
        t, p, r = f'{n} أمرًا ينتظر الاستئناف', f'يُنفَّذ {n} أمرًا معلّقًا', f'تُنفَّذ الأوامر الـ{n}'
    return {'toast': t, 'play': 'تشغيل (اللعبة متوقفة)، ' + p, 'resume': r}


def subs(n, controls=None, expanded=False):
    f = forms(n)
    toast_attrs = ' aria-expanded="%s"' % ('true' if expanded else 'false') + (' aria-controls="%s"' % controls if controls else '')
    return [(PLAY, '<button class="play tap" aria-label="%s"><svg class="i"><use href="#i-play"/></svg>'
                   '<span class="o-badge" aria-hidden="true">%d</span></button>' % (f['play'], n)),
            (TOAST, '<button class="alert-prev tap o-toast"%s><svg class="i"><use href="#i-queue"/></svg><span class="txt">%s</span></button>'
                    % (toast_attrs, f['toast']))]
