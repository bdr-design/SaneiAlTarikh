"""The HUD at an end moment (screen 18's variants): the clock is stopped, so no indicator moves: every trend glyph is
the flat one, read «دون تغيير»; and the values are the end moment's, not 1 January 2011's (the errors review, 2026-11-07).
end_subs(values) gives (old, new) pairs for panel_page.build's extra_subs; values maps an indicator's label to its new
shown value (the HTML of its .num), for the ones the variant changes."""
LABELS = ['الخزينة', 'الاستقرار', 'الشرعية', 'القوة البشرية', 'النفوذ', 'البحث']
TREND = {'الخزينة': 'down', 'الاستقرار': 'down', 'الشرعية': 'down', 'القوة البشرية': 'flat', 'النفوذ': 'up', 'البحث': 'up'}
WORD = {'down': 'في انخفاض', 'up': 'في ارتفاع', 'flat': 'دون تغيير'}
NUM = {'الخزينة': '<svg class="i"><use href="#i-coins"/></svg><span class="num">36.0<span class="unit"> مليار $</span></span>',
       'الاستقرار': '<svg class="i"><use href="#i-anchor"/></svg><span class="num ltr">58%</span>',
       'الشرعية': '<svg class="i"><use href="#i-seal"/></svg><span class="num">44</span>',
       'القوة البشرية': '<svg class="i"><use href="#i-people"/></svg><span class="num">2.4<span class="unit"> مليون</span></span>',
       'النفوذ': '<svg class="i"><use href="#i-signal"/></svg><span class="num">62</span>',
       'البحث': '<svg class="i"><use href="#i-flask"/></svg><span class="num"><span class="ltr">+18</span><span class="unit"> / شهر</span></span>'}


def end_subs(values):
    out = []
    for l in LABELS:
        t = TREND[l]
        if t != 'flat':
            out.append(('<span class="lbl">' + l + '</span><svg class="trend ' + t + '" role="img" aria-label="' + WORD[t] + '"><use href="#t-' + t + '"/></svg>',
                        '<span class="lbl">' + l + '</span><svg class="trend flat" role="img" aria-label="دون تغيير"><use href="#t-flat"/></svg>'))
        if l in values:
            old = NUM[l]
            out.append((old, old[:old.index('<span class="num')] + values[l]))
    return out
