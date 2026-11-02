// Screen 12 variant A (the research panel «البحث»): render the iPhones and run the checks, with the shared panel checker
// (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png (the overview) to the
// variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds the panel's own rules:
// the brief's strings per tab; the research rate = the HUD's; the 8 domains of §5.7, each bar at its level out of 15 and
// read whole; their mean = the headline; the focus = the header chip = the project under way; the progress bar at its
// share; agreements read whole.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['البحث', 'التركيز: الطاقة', 'مصر · 8 مجالات', 'نظرة عامة', 'المجالات', 'التعاون'];
const DOMS = [['الطاقة', '4التركيز'], ['الصناعة والتصنيع', '4'], ['الصحة والزراعة', '4'], ['الأنظمة البرية', '4'], ['الحاسوب والذكاء', '3'], ['الجو والبحر والفضاء', '3'], ['الصواريخ والردع', '3'], ['الأمن الإلكتروني', '4']];
const BRIEF = {
  overview: HEAD.concat(['البحث', '+18', 'شهريًا', 'دون تغير', 'الإنفاق', '900', 'مليون $', '0.4% من الناتج', 'المتوسط', '3.6', '/ 15', 'من 8 مجالات', 'لماذا؟']),
  reach_overview: ['قيد البحث', 'الطاقة · المستوى 5', 'يكتمل بعد 14 شهرًا', '62%', 'رفع الإنفاق على البحث', '300 مليون $ سنويًا', 'البحث +6'],
  domains: HEAD.concat(['المجالات · من 15 مستوى', 'الطاقة']),
  reach_domains: ['المجالات · من 15 مستوى'].concat(DOMS.map((x) => x[0]), ['المستويات 1–7 حتى 2025 تقريبًا، و8–11 حتى 2050، و12–15 مُسقَطة.', 'تغيير التركيز', 'الطاقة الآن · مجال واحد في كل مرة']),
  coop: HEAD.concat(['اتفاقيات التعاون', 'روسيا · الطاقة النووية السلمية']),
  reach_coop: ['اتفاقيات التعاون', 'روسيا · الطاقة النووية السلمية', 'دراسات موقع الضبعة', 'أوكرانيا · الأقمار الصناعية', 'قمر للرصد أُطلق في 2007',
    'الاتحاد الأوروبي · البحث العلمي', 'برامج تمويل مشتركة', 'التراخيص', 'الولايات المتحدة · تجميع دبابات', 'منذ 1992', 'تعاون مع الصين · الطاقة', 'الكلفة: 5 من النفوذ', 'التقدم +10%'],
};

const screenChecks = `
const { issues, qa, q, T, nums, tab, DATA } = X;
// the research rate is the HUD's
if (tab === 'overview') { const hud = [...document.querySelectorAll('.top .stat')].find((s) => /البحث/.test(s.textContent)), kv = nums(T(qa('.sheet .r-kv b')[0]))[0];
  if (!hud || nums(hud.textContent).indexOf(kv) < 0) issues.push('the research rate is not the HUD\\'s');
  const b = q('.b-now'), pr = b.querySelector('.n-pr'), v = nums(T(b.querySelector('.n-v')))[0];
  if (Math.abs(pr.querySelector('i').getBoundingClientRect().width - pr.getBoundingClientRect().width * v / 100) > 0.6) issues.push('the project\\'s bar is not at ' + v + '%');
  const dom = T(b.querySelector('.r-at b')).split(' · ')[0], chip = T(q('.r-cap')).replace('التركيز: ', '');
  if (dom !== chip) issues.push('the project under way is not in the focus (' + chip + ')'); }
// the 8 domains: each bar at its level out of 15, read whole; their mean = the headline; the focus marked once
if (tab === 'domains') { const rows = qa('.sheet .b-dom'), lv = rows.map((r) => nums(T(r.querySelector('b')))[0]);
  if (rows.length !== 8) issues.push('the domains are not the 8 of §5.7');
  if (Math.round(lv.reduce((a, b) => a + b, 0) / lv.length * 10) / 10 !== DATA.mean) issues.push('the domains\\' mean is not the headline ' + DATA.mean);
  rows.forEach((r, i) => { const nm = T(r.querySelector('span')), bar = r.querySelector('.i-bar'), al = r.getAttribute('aria-label') || '';
    if (Math.abs(parseFloat(getComputedStyle(bar, '::after').width) - bar.getBoundingClientRect().width * lv[i] / 15) > 0.6) issues.push('domain «' + nm + '»: the bar is not at ' + lv[i] + ' / 15');
    if (!/: المستوى \\d+ من 15/.test(al) || !nums(al).includes(lv[i]) || r.getAttribute('role') !== 'img') issues.push('a11y: domain «' + nm + '» is not read whole'); });
  const foc = rows.filter((r) => r.querySelector('em'));
  if (foc.length !== 1 || !/التركيز/.test(foc[0].getAttribute('aria-label') || '')) issues.push('the focus is not marked once, in words'); }
qa('.sheet .f-tr').forEach((r) => { const nm = T(r.querySelector('.r-at b')), al = r.getAttribute('aria-label') || '';
  if (!al || nums(T(r)).some((x) => !nums(al).includes(x)) || r.getAttribute('role') !== 'img') issues.push('a11y: «' + nm + '» is not read whole'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'البحث', tabs: ['overview', 'domains', 'coop'], longTab: 'domains',
  inputs: ['_build/research.css'],
  TOK: { sec: 'rgb(158, 219, 91)', ctlH: {}, sheetIcon: [], size: [['.b-dom', null, 22], ['.b-now', null, 36], ['.f-tr', null, 36]] },
  HEAD, BRIEF, screenChecks, DATA: { mean: 3.6 },
  cases: (d, se) => [
    ['rate off the HUD', d, '', '', /the research rate is not the HUD's/, () => { document.querySelector('.r-kv b').textContent = '+20'; }],
    ['project bar off', d, '', '', /the project's bar is not at 62%/, () => { document.querySelector('.b-now .n-pr i').style.setProperty('--v', '30%'); }],
    ['project outside the focus', d, '', '', /the project under way is not in the focus/, () => { document.querySelector('.r-cap').lastChild.textContent = 'التركيز: الصناعة والتصنيع'; }],
    ['domain bar off', d, '&tab=domains', '', /domain «الصحة والزراعة»: the bar is not at 4 \/ 15/, () => { document.querySelectorAll('.b-dom .i-bar')[2].style.setProperty('--v', '50%'); }],
    ['mean off', d, '&tab=domains', '', /the domains' mean is not the headline 3.6/, () => { document.querySelectorAll('.b-dom b .ltr')[1].textContent = '7'; }],
    ['domain silent', d, '&tab=domains', '', /a11y: domain «الأمن الإلكتروني» is not read whole/, () => { document.querySelectorAll('.b-dom')[7].setAttribute('aria-label', 'الأمن الإلكتروني'); }],
    ['two focuses', d, '&tab=domains', '', /the focus is not marked once/, () => { const e = document.createElement('em'); e.textContent = 'التركيز'; document.querySelectorAll('.b-dom b')[1].appendChild(e); }],
    ['a domain missing', d, '&tab=domains', '', /the domains are not the 8/, () => { document.querySelectorAll('.b-dom')[7].remove(); }],
  ],
});
