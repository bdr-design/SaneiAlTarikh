// Screen 13 variant A (the «المزيد» panel: saves, settings, log, about): render the iPhones and run the checks, with the
// shared panel checker (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png
// (the saves tab) to the variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds
// the panel's own rules: the brief's strings per tab; every setting as [name, line, its three choices in order, the
// chosen one] (a swap cannot pass), a radio group named exactly as its row, exactly one chosen (the generic rule); the
// speed cap reaches the HUD's «أقصى» (D-16); no music setting (decision 2); no digit setting (Western always); the log
// newest first, each event dated; every link row says where it leads (a word after «يفتح»); the mirror copy a folder
// the player picks (D-28).
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['المزيد', 'حملة مصر · 1 يناير 2011', 'الحفظ', 'الإعدادات', 'السجل', 'حول'];
// each setting as [name, line, the three choices in order, the chosen one] (a swap cannot pass)
const SETTINGS = [['الجودة', 'التوفير أخف على البطارية', ['توفير', 'متوازن', 'أعلى'], 'متوازن'], ['حد السرعة', 'تقل تلقائيًا إذا سخن الجهاز', ['×5', '×10', 'أقصى'], 'أقصى'],
  ['الأصوات', 'أصوات الأزرار والتنبيهات', ['كاملة', 'خفيفة', 'متوقفة'], 'كاملة'], ['الاهتزاز', 'عند الأحداث والأوامر', ['كامل', 'خفيف', 'متوقف'], 'كامل'],
  ['الحركة', 'تتبع خيار تقليل الحركة', ['حسب الجهاز', 'كاملة', 'مخففة'], 'حسب الجهاز']];
const BRIEF = {
  saves: HEAD.concat(['حفظ الآن', 'حفظ جديد · مصر · 1 يناير 2011', 'ملفات الحفظ في هذه الحملة', 'حفظ تلقائي']),
  reach_saves: ['حفظ الآن', 'حفظ جديد · مصر · 1 يناير 2011', 'ملفات الحفظ في هذه الحملة', 'حفظ تلقائي', '1 يناير 2011 · مصر · 2 ميغابايت', 'يُحفظ تلقائيًا أول كل شهر وعند الخروج من اللعبة.',
    'نسخة في مجلد آخر', 'لم يُختر مجلد · تحمي الحفظ إذا حُذفت اللعبة', 'استيراد حفظ أو تصديره', 'عبر تطبيق الملفات'],
  settings: HEAD.concat(['الأداء', 'الجودة']),
  reach_settings: ['الأداء', 'الصوت واللمس والحركة'].concat(SETTINGS.map((s) => [s[0], s[1]]).flat(), ['الأرقام غربية دائمًا، والمبالغ بالدولار الأمريكي.']),
  log: HEAD.concat(['الأحداث، الأحدث أولًا', 'احتجاجات واسعة في تونس']),
  reach_log: ['الأحداث، الأحدث أولًا', 'احتجاجات واسعة في تونس', '1 يناير 2011 · الجوار', 'بدأت الحملة', '1 يناير 2011 · مصر · الوضع واقعي', 'الإحصاءات', 'الناتج والاضطرابات والخزينة عبر الزمن'],
  about: HEAD.concat(['المصادر والحقوق', 'البيانات والخرائط ورخصها · قيم تصميمية']),
  reach_about: ['المصادر والحقوق', 'البيانات والخرائط ورخصها · قيم تصميمية', 'المساعدة', 'كيف تلعب · الخريطة والأقسام والأوامر', 'الخصوصية', 'لا نجمع أي بيانات · لا حساب ولا تتبع',
    'تصدير التشخيص', 'ملف تشاركه عند مشكلة · بلا بيانات شخصية', 'صانع التاريخ · الإصدار 1.0 · لا إعلانات · يعمل دون إنترنت.'],
};

const screenChecks = `
const { issues, qa, q, T, tab, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
// every setting row: a radio group named as its row, its three choices in the brief's order, the brief's choice
if (tab === 'settings') { const rows = qa('.sheet .s-pol');
  if (rows.length !== DATA.settings.length) issues.push('the settings are not the brief\\'s ' + DATA.settings.length);
  rows.forEach((r, i) => { const nm = W(T(r.querySelector('.r-at b'))), ln = W(T(r.querySelector('.r-at > span'))), g = r.querySelector('.s-seg'), w = DATA.settings[i] || [];
    const ch = g ? [...g.querySelectorAll('.s-sg')].map((s) => W(T(s))) : [], on = g ? W(T(g.querySelector('.s-sg.on'))) : '';
    if (nm !== w[0] || ln !== w[1] || ch.join('|') !== (w[2] || []).join('|') || on !== w[3]) issues.push('setting ' + (i + 1) + ' is not «' + [w[0], w[1], (w[2] || []).join('/'), w[3]].join(' · ') + '»: «' + [nm, ln, ch.join('/'), on].join(' · ') + '»'); }); }
qa('.sheet .s-pol').forEach((r) => { const nm = W(T(r.querySelector('.r-at b'))), g = r.querySelector('.s-seg');
  if (!g || g.getAttribute('role') !== 'radiogroup' || g.getAttribute('aria-label') !== nm || g.querySelectorAll('[role="radio"]').length !== 3) issues.push('setting «' + nm + '» is not a named group of three choices'); });
// the HUD's top speed «أقصى» (D-16) stays reachable: a speed cap must offer it
qa('.sheet .s-pol').filter((r) => /السرعة/.test(T(r.querySelector('.r-at b')))).forEach((r) => { if (![...r.querySelectorAll('.s-sg')].some((s) => W(T(s)) === 'أقصى')) issues.push('the speed cap cannot reach the HUD\\'s «أقصى» (D-16)'); });
// no music setting (decision 2), no digit setting (Western always)
{ const all = q('.sheet').textContent; if (/الموسيقى|موسيقى/.test(all)) issues.push('a music setting (no music in v1)');
  qa('.sheet .s-pol').forEach((r) => { if (/الأرقام|أرقام|مشرقية|هندية/.test(T(r))) issues.push('a digit setting (Western digits always)'); }); }
// the log: newest first, each event dated
if (tab === 'log') { const M = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const ds = qa('.sheet .r-body[data-tab="log"] .r-sec .r-link').map((l) => { const s = W(T(l.querySelector('.r-at > span'))), m = s.match(/^(\\d+) (\\S+) (\\d{4})/);
    if (!m || M.indexOf(m[2]) < 0) { issues.push('event «' + W(T(l.querySelector('.r-at b'))) + '» is not dated'); return null; } return +m[3] * 400 + M.indexOf(m[2]) * 32 + +m[1]; });
  for (let k = 1; k < ds.length; k++) if (ds[k] !== null && ds[k - 1] !== null && ds[k] > ds[k - 1]) issues.push('the log is not newest first'); }
// every link row says where it leads
qa('.sheet .r-link').forEach((l) => { if (!/يفتح \\S+/.test(l.getAttribute('aria-label') || '')) issues.push('a11y: «' + T(l.querySelector('.r-at b')) + '» does not say where it leads'); });
// D-28: the mirror copy goes to a folder the player picks (it survives deleting the game), never «ملفات الجهاز» alone
if (tab === 'saves') { const m = qa('.sheet .r-body[data-tab="saves"] .r-link').find((l) => /مجلد/.test(T(l)));
  if (!m || !/اختيار المجلد/.test(m.getAttribute('aria-label') || '') || /ملفات الجهاز/.test(T(q('.r-body[data-tab="saves"]')))) issues.push('the mirror copy is not a folder the player picks (D-28)'); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'المزيد', tabs: ['saves', 'settings', 'log', 'about'], longTab: 'settings',
  inputs: ['_build/more.css'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [], size: [] },
  HEAD, BRIEF, screenChecks, DATA: { settings: SETTINGS },
  // the saves tab has no headline numbers, status table, «لماذا؟» or arrowed chip: their plants move to other targets
  skipGeneric: ['section colour on data', 'section colour on a rule', 'closed dock item coloured', 'brief text hidden', '18 pt misuse', 'gap', 'text overlap', 'clipped text', 'faint text', 'why without its subject', 'amber value without its icon', 'chip arrow against its sign', '% before its number', 'text into a control'],
  cases: (d, se) => [
    ['brief text hidden (saves)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-body[data-tab="saves"] .r-act .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (saves)', d, '', '.r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['text overlap (saves)', d, '', '.r-body[data-tab="saves"] .r-act .r-at > span { transform: translateY(-14px) !important; }', /text overlap|icon over text|hit overlap/],
    ['clipped text (saves)', d, '', '.r-body[data-tab="saves"] .r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)/],
    ['faint text (saves)', d, '', '.r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (saves)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="saves"] .s-note').textContent = 'نسبة 20%'; }],
    ['setting without its group', d, '&tab=settings', '', /setting «الجودة» is not a named group of three choices/, () => { document.querySelector('.r-body[data-tab="settings"] .s-seg').removeAttribute('role'); }],
    ['group named wrong', d, '&tab=settings', '', /setting «حد السرعة» is not a named group/, () => { document.querySelectorAll('.r-body[data-tab="settings"] .s-seg')[1].setAttribute('aria-label', 'حد الجودة'); }],
    ['two chosen', d, '&tab=settings', '', /setting 1: 2 chosen segments/, () => { const s = document.querySelectorAll('.r-body[data-tab="settings"] .s-sg')[2]; s.classList.add('on'); s.setAttribute('aria-checked', 'true'); }],
    ['none chosen', d, '&tab=settings', '', /setting 1: 0 chosen segments/, () => { document.querySelectorAll('.r-body[data-tab="settings"] .s-pol')[0].querySelectorAll('.s-sg').forEach((s) => { s.classList.remove('on'); s.setAttribute('aria-checked', 'false'); }); }],
    ['settings choices swapped', d, '&tab=settings', '', /setting 1 is not/, () => { const g = document.querySelectorAll('.r-body[data-tab="settings"] .s-seg'), x = g[0].innerHTML; g[0].innerHTML = g[1].innerHTML; g[1].innerHTML = x; }],
    ['settings lines swapped', d, '&tab=settings', '', /setting 2 is not/, () => { const s = document.querySelectorAll('.r-body[data-tab="settings"] .s-pol .r-at > span'), x = s[0].innerHTML; s[0].innerHTML = s[1].innerHTML; s[1].innerHTML = x; }],
    ['speed capped at ×10', d, '&tab=settings', '', /the speed cap cannot reach the HUD's «أقصى»/, () => { const s = document.querySelectorAll('.r-body[data-tab="settings"] .s-pol')[1].querySelectorAll('.s-sg')[2]; s.textContent = '×20'; }],
    ['a music setting', d, '&tab=settings', '', /a music setting/, () => { document.querySelector('.r-body[data-tab="settings"] .s-note').textContent = 'الموسيقى: متوقفة'; }],
    ['a digit setting', d, '&tab=settings', '', /a digit setting/, () => { const r = document.querySelectorAll('.r-body[data-tab="settings"] .s-pol')[4]; r.querySelector('.r-at b').textContent = 'الأرقام'; }],
    ['log not newest first', d, '&tab=log', '', /the log is not newest first/, () => { const l = document.querySelectorAll('.r-body[data-tab="log"] .r-sec .r-link'); l[0].querySelector('.r-at > span').innerHTML = '<span class="ltr">1</span> يناير <span class="ltr">2010</span> · الجوار'; l[0].setAttribute('aria-label', 'احتجاجات واسعة في تونس، 1 يناير 2010، الجوار. يفتح لماذا'); }],
    ['an event undated', d, '&tab=log', '', /event «بدأت الحملة» is not dated/, () => { const l = document.querySelectorAll('.r-body[data-tab="log"] .r-sec .r-link')[1]; l.querySelector('.r-at > span').textContent = 'مصر'; l.setAttribute('aria-label', 'بدأت الحملة، مصر. يفتح لماذا'); }],
    ['link silent on where it leads', d, '&tab=about', '', /a11y: «المساعدة» does not say where it leads/, () => { document.querySelectorAll('.r-body[data-tab="about"] .r-link')[1].setAttribute('aria-label', 'المساعدة: كيف تلعب، الخريطة والأقسام والأوامر. يفتح'); }],
    ['action row read in part', d, '', '', /a11y: «حفظ الآن: 1 يناير 2011» does not read all it shows/, () => { document.querySelector('.r-body[data-tab="saves"] .r-act').setAttribute('aria-label', 'حفظ الآن: 1 يناير 2011'); }],
    ['mirror on the device', d, '', '', /the mirror copy is not a folder the player picks/, () => { const l = document.querySelectorAll('.r-body[data-tab="saves"] > .r-link')[0]; l.querySelector('.r-at > span').textContent = 'في ملفات الجهاز · كل أسبوع'; l.setAttribute('aria-label', 'نسخة في مجلد آخر: في ملفات الجهاز، كل أسبوع. يفتح اختيار المجلد'); }],
  ],
});
