// Screen 13 variant A (the «المزيد» panel: saves, settings, log, about): render the iPhones and run the checks, with the
// shared panel checker (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png
// (the saves tab) to the variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds
// the panel's own rules: the brief's strings per tab; every setting a 3-segment row with exactly its one choice (the
// generic rule) and a VoiceOver group name; no music setting (decision 2: no music in v1); digits always Western (no
// digit setting); the log newest first, each event dated; every link row says where it leads.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['المزيد', 'حملة مصر · 1 يناير 2011', 'الحفظ', 'الإعدادات', 'السجل', 'حول'];
const SETTINGS = [['الجودة', 'التوفير أخف على البطارية', 'توفير', 'متوازن', 'أعلى'], ['أقصى سرعة', 'تقل إذا سخن الجهاز', '×2', '×5', '×10'],
  ['الاهتزاز', 'عند الأحداث والأوامر', 'مفعّل', 'خفيف', 'متوقف'], ['الحركة', 'حسب إعداد الجهاز', 'النظام', 'كاملة', 'قليلة']];
const BRIEF = {
  saves: HEAD.concat(['حفظ الآن', 'حفظ جديد · مصر · 1 يناير 2011', 'جديد', 'حفظ هذه الحملة', 'حفظ تلقائي']),
  reach_saves: ['حفظ الآن', 'حفظ جديد · مصر · 1 يناير 2011', 'جديد', 'حفظ هذه الحملة', 'حفظ تلقائي', '1 يناير 2011 · مصر · 2 ميغابايت', 'يُحفظ تلقائيًا أول كل شهر وعند الخروج من اللعبة.',
    'نسخة احتياطية', 'في ملفات الجهاز · كل أسبوع', 'أسبوعية', 'يومية', 'متوقفة'],
  settings: HEAD.concat(['الأداء', 'الجودة']),
  reach_settings: ['الأداء', 'الإحساس'].concat(SETTINGS.flat(), ['الأرقام غربية دائمًا، والمبالغ بالدولار الأمريكي.']),
  log: HEAD.concat(['الأحداث، الأحدث أولًا', 'احتجاجات واسعة في تونس']),
  reach_log: ['الأحداث، الأحدث أولًا', 'احتجاجات واسعة في تونس', '1 يناير 2011 · الجوار', 'بدأت الحملة', '1 يناير 2011 · مصر · واقعي', 'الإحصاءات', 'الناتج والاضطرابات والخزينة عبر الزمن'],
  about: HEAD.concat(['المصادر والحقوق', 'البيانات والخرائط والصور ورخصها']),
  reach_about: ['المصادر والحقوق', 'البيانات والخرائط والصور ورخصها', 'قيم تصميمية', 'الأرقام المقدّرة وسبب كل منها', 'المساعدة', 'كيف تلعب · الخريطة والأقسام والأوامر',
    'تصدير التشخيص', 'ملف يُرسل عند مشكلة · بلا بيانات شخصية', 'صانع التاريخ · لا إعلانات ولا اتصال بالإنترنت.'],
};

const screenChecks = `
const { issues, qa, q, T, tab } = X;
// every setting row: a radio group named as its row, three choices
qa('.sheet .s-pol').forEach((r) => { const nm = T(r.querySelector('.r-at b')), g = r.querySelector('.s-seg');
  if (!g || g.getAttribute('role') !== 'radiogroup' || !(g.getAttribute('aria-label') || '').startsWith(nm.split(' ')[0]) || g.querySelectorAll('[role="radio"]').length !== 3) issues.push('setting «' + nm + '» is not a named group of three choices'); });
// no music setting (decision 2), no digit setting (Western always)
{ const all = q('.sheet').textContent; if (/الموسيقى|موسيقى/.test(all)) issues.push('a music setting (no music in v1)'); if (/الأرقام الهندية|أرقام هندية/.test(all)) issues.push('a digit setting (Western digits always)'); }
// every link row says where it leads
qa('.sheet .r-link').forEach((l) => { if (!/يفتح/.test(l.getAttribute('aria-label') || '')) issues.push('a11y: «' + T(l.querySelector('.r-at b')) + '» does not say where it leads'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'المزيد', tabs: ['saves', 'settings', 'log', 'about'], longTab: 'settings',
  inputs: ['_build/more.css'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [], size: [] },
  HEAD, BRIEF, screenChecks, DATA: {},
  // the saves tab has no headline numbers, status table, «لماذا؟» or arrowed chip: their plants move to other targets
  skipGeneric: ['section colour on data', 'section colour on a rule', 'closed dock item coloured', 'brief text hidden', '18 pt misuse', 'gap', 'text overlap', 'clipped text', 'faint text', 'why without its subject', 'amber value without its icon', 'chip arrow against its sign', '% before its number'],
  cases: (d, se) => [
    ['brief text hidden (saves)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-body[data-tab="saves"] .r-act .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (saves)', d, '', '.r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['text overlap (saves)', d, '', '.r-body[data-tab="saves"] .r-chip { margin-inline-start: -120px !important; }', /text overlap|icon over text|hit overlap/],
    ['clipped text (saves)', d, '', '.r-body[data-tab="saves"] .r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)/],
    ['faint text (saves)', d, '', '.r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (saves)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="saves"] .s-note').textContent = 'نسبة 20%'; }],
    ['setting without its group', d, '&tab=settings', '', /setting «الجودة» is not a named group of three choices/, () => { document.querySelector('.s-seg').removeAttribute('role'); }],
    ['a music setting', d, '&tab=settings', '', /a music setting/, () => { document.querySelector('.r-body[data-tab="settings"] .s-note').textContent = 'الموسيقى: متوقفة'; }],
    ['link silent on where it leads', d, '&tab=about', '', /a11y: «المساعدة» does not say where it leads/, () => { document.querySelectorAll('.r-body[data-tab="about"] .r-link')[2].setAttribute('aria-label', 'المساعدة: كيف تلعب'); }],
  ],
});
