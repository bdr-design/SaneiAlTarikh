// Screen 10 variant A (the foreign panel «الخارجية»): render the iPhones and run the checks, with the shared panel checker
// (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png (the overview) to the
// variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds the panel's own rules:
// the brief's strings per tab; influence = the HUD's; the relations best first, each value in −100..100 with its sign,
// its trend arrow agreeing with its label, amber only for a worsening and blue only for an improvement, read whole by
// VoiceOver and never a control here (a tap opens the relation); the Security Council with its 15 seats (5 permanent,
// 5 + 5 elected); treaties and agenda items read whole.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['الخارجية', 'معترف بها', 'مصر · عضو في الأمم المتحدة', 'نظرة عامة', 'العلاقات', 'المعاهدات', 'مجلس الأمن'];
const RELS = [['الولايات المتحدة', 'حليف · معونة عسكرية', '+62'], ['السعودية', 'شريك · عمالة واستثمار', '+58'], ['الاتحاد الأوروبي', 'اتفاقية شراكة', '+44'],
  ['الصين', 'تجارة واستثمار', '+30'], ['إسرائيل', 'سلام بارد · معاهدة 1979', '+12'], ['إثيوبيا', 'خلاف مياه النيل', '−22'], ['قطر', 'توتر إعلامي', '−30'], ['إيران', 'بلا سفارات منذ 1980', '−48']];
const BRIEF = {
  overview: HEAD.concat(['النفوذ', '62', '/ 100', '+1 شهريًا', 'علاقات جيدة', '41', 'دولة', 'فوق +40', 'متوترة', '3', 'دول', 'تحت −40', 'لماذا؟',
    'الدولة', 'الحكومة', 'العقوبات', 'لا توجد', 'عدم الانحياز', 'الرئاسة']),
  reach_overview: ['وساطة بين الفصائل الفلسطينية', 'الكلفة: 10 من النفوذ · 6 أشهر', 'النفوذ +4'],
  relations: HEAD.concat(['العلاقات، الأفضل أولًا', RELS[0][0]]),
  reach_relations: ['العلاقات، الأفضل أولًا'].concat(RELS.flat(), ['من −100 إلى +100. اضغط دولة لفتح علاقتها: الاتفاقيات والمساعدات والسلاح والعقوبات.']),
  treaties: HEAD.concat(['التكتلات', 'الجامعة العربية', 'دولة المقر']),
  reach_treaties: ['التكتلات', 'الجامعة العربية', 'دولة المقر', 'الاتحاد الأفريقي', 'عضو', 'عدم الانحياز', 'الرئاسة', 'التعاون الإسلامي', 'معاهدات واتفاقيات',
    'السلام مع إسرائيل', '1979 · قيود على القوات في سيناء', 'الشراكة مع الاتحاد الأوروبي', '2004 · تجارة حرة صناعية', 'المناطق الصناعية المؤهلة', '2004 · السوق الأمريكية دون جمارك',
    'مياه النيل مع السودان', '1959 · حصة مصر 55.5 مليار م³', 'معونة واردة', '1.6 مليار $ سنويًا', 'سلاح وارد', 'الولايات المتحدة', 'معونة صادرة', 'لا توجد', 'سلاح صادر', 'لا يوجد'],
  un: HEAD.concat(['مجلس الأمن 2011', 'دائمون بحق النقض']),
  reach_un: ['مجلس الأمن 2011', 'دائمون بحق النقض', 'الولايات المتحدة · روسيا · الصين · بريطانيا · فرنسا', 'منتخبون حتى 2011', 'البوسنة · البرازيل · الغابون · لبنان · نيجيريا',
    'منتخبون حتى 2012', 'ألمانيا · الهند · البرتغال · جنوب أفريقيا · كولومبيا', 'مصر', 'ليست عضوًا', 'آخر عضوية', '1996–1997', 'المقعد العربي', 'لبنان', 'الترشح القادم', '2016',
    'على جدول الأعمال', 'السودان', 'استفتاء الجنوب في 9 يناير', 'إيران', 'العقوبات · القرار 1929', 'حشد التأييد لمشروع قرار', 'الكلفة: 15 من النفوذ', 'مع لبنان والغابون'],
};

const screenChecks = `
const { issues, qa, q, T, nums, TOK, tab, order } = X;
// influence is the HUD's
if (tab === 'overview') { const hud = [...document.querySelectorAll('.top .stat')].find((s) => /النفوذ/.test(s.textContent)), kv = nums(T(qa('.sheet .r-kv b')[0]))[0];
  if (!hud || nums(hud.textContent).indexOf(kv) < 0) issues.push('influence is not the HUD\\'s'); }
// relations: best first, in −100..100, the arrow agreeing with the label's trend, amber only for a fall, blue only for a rise
if (tab === 'relations') { const rows = qa('.sheet .f-rel'), vals = rows.map((r) => nums(T(r.querySelector('.f-v')))[0]);
  for (let k = 1; k < vals.length; k++) if (vals[k] > vals[k - 1]) issues.push('the relations are not best first');
  rows.forEach((r, i) => { const nm = T(r.querySelector('.r-at b')), v = vals[i], al = r.getAttribute('aria-label') || '', b = r.querySelector('.f-v'), use = b.querySelector('use');
    if (!(v >= -100 && v <= 100)) issues.push('relation «' + nm + '» outside −100..100');
    const dir = /تزيد/.test(al) ? 'up' : /تنخفض/.test(al) ? 'down' : /دون تغير/.test(al) ? 'flat' : '';
    if (!use || use.getAttribute('href') !== '#t-' + dir) issues.push('relation «' + nm + '»: the arrow does not show its trend');
    const col = getComputedStyle(b).color;
    if ((col === TOK.amber) !== (dir === 'down') || (col === TOK.blue) !== (dir === 'up')) issues.push('relation «' + nm + '»: amber marks a fall and blue a rise, and only those');
    if (!al.startsWith(nm + ': ') || !nums(al).map(Math.abs).includes(Math.abs(v)) || (v < 0 && !/سالب/.test(al)) || r.getAttribute('role') !== 'img') issues.push('a11y: relation «' + nm + '» is not read whole with its sign');
    order(r, ['.r-at', '.f-v'], 'relation ' + (i + 1)); }); }
// the Security Council: 5 permanent and 5 + 5 elected
if (tab === 'un') { const n = qa('.sheet .f-un > span:last-child').map((s) => T(s).split(' · ').length);
  if (n.join(',') !== '5,5,5') issues.push('the Security Council is not 5 permanent and 5 + 5 elected: ' + n.join(',')); }
// treaties and agenda items read whole
qa('.sheet .f-tr').forEach((r) => { const nm = T(r.querySelector('.r-at b')), al = r.getAttribute('aria-label') || '';
  if (!al.includes(nm) || nums(T(r.querySelector('.r-at > span'))).some((x) => !nums(al).includes(x)) || r.getAttribute('role') !== 'img') issues.push('a11y: «' + nm + '» is not read whole'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الخارجية', tabs: ['overview', 'relations', 'treaties', 'un'], longTab: 'relations',
  inputs: ['_build/foreign.css'],
  TOK: { sec: 'rgb(91, 134, 242)', ctlH: {}, sheetIcon: [], size: [['.f-rel', null, 36], ['.f-tr', null, 36]] },
  HEAD, BRIEF, screenChecks, DATA: {},
  cases: (d, se) => [
    ['influence off the HUD', d, '', '', /influence is not the HUD's/, () => { document.querySelector('.r-kv b').textContent = '65'; }],
    ['relations not best first', d, '&tab=relations', '', /the relations are not best first/, () => { const r = document.querySelectorAll('.f-rel'); r[0].before(r[3]); }],
    ['relation arrow wrong', d, '&tab=relations', '', /relation «إثيوبيا»: the arrow does not show its trend/, () => { document.querySelectorAll('.f-rel')[5].querySelector('use').setAttribute('href', '#t-flat'); }],
    ['amber on a steady relation', d, '&tab=relations', '', /relation «قطر»: amber marks a fall/, () => { document.querySelectorAll('.f-rel')[6].querySelector('.f-v').classList.add('r-amber'); }],
    ['relation without its sign in words', d, '&tab=relations', '', /a11y: relation «إيران» is not read whole with its sign/, () => { document.querySelectorAll('.f-rel')[7].setAttribute('aria-label', 'إيران: 48، بلا سفارات، دون تغير'); }],
    ['relation reversed', d, '&tab=relations', '.f-rel { flex-direction: row-reverse !important; }', /relation 1: order must be/],
    ['council short', d, '&tab=un', '', /the Security Council is not 5 permanent/, () => { document.querySelectorAll('.f-un > span:last-child')[1].textContent = 'البوسنة · البرازيل · الغابون · لبنان'; }],
    ['treaty silent', d, '&tab=treaties', '', /a11y: «مياه النيل مع السودان» is not read whole/, () => { document.querySelectorAll('.f-tr')[3].setAttribute('aria-label', 'مياه النيل مع السودان'); }],
  ],
});
