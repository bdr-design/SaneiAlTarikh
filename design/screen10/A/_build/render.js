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
  ['الصين', 'تجارة واستثمار', '+30'], ['السودان', 'مياه النيل · حلايب', '+18'], ['إسرائيل', 'سلام بارد · معاهدة 1979', '+12'], ['إثيوبيا', 'خلاف مياه النيل', '−22'], ['قطر', 'توتر إعلامي', '−30'],
  ['الجزائر', 'أزمة مباراة 2009', '−41'], ['سوريا', 'فتور منذ 2006', '−44'], ['إيران', 'بلا سفارات منذ 1980', '−48']];
// the pairs a swap must not pass: each label with its value, per tab
const PAIRS = {
  overview: [['الدولة', 'معترف بها'], ['الحكومة', 'معترف بها'], ['العقوبات', 'لا توجد'], ['عدم الانحياز', 'الرئاسة']],
  treaties: [['الجامعة العربية', 'دولة المقر'], ['الاتحاد الأفريقي', 'عضو'], ['عدم الانحياز', 'الرئاسة'], ['المؤتمر الإسلامي', 'عضو'], ['الاتحاد المتوسطي', 'رئاسة مشتركة'],
    ['الكوميسا', 'عضو'], ['معونة واردة', '1.6 مليار $ سنويًا'], ['سلاح وارد', 'الولايات المتحدة'], ['معونة صادرة', 'فنية لأفريقيا'], ['سلاح صادر', 'لا يوجد']],
  un: [['مصر', 'ليست عضوًا'], ['آخر عضوية', '1996–1997'], ['المقعد العربي', 'لبنان'], ['أقرب عضوية', '2016–2017'],
    ['دائمون بحق النقض', 'الولايات المتحدة · روسيا · الصين · بريطانيا · فرنسا'], ['منتخبون حتى 2011', 'البوسنة · البرازيل · الغابون · لبنان · نيجيريا'],
    ['منتخبون حتى 2012', 'ألمانيا · الهند · البرتغال · جنوب أفريقيا · كولومبيا']],
};
const BRIEF = {
  overview: HEAD.concat(['النفوذ', '62', '/ 100', '+1 شهريًا', 'علاقات جيدة', '41', 'دولة', 'فوق +40', 'متوترة', '3', 'دول', 'تحت −40', 'لماذا؟',
    'الدولة', 'الحكومة', 'العقوبات', 'لا توجد', 'عدم الانحياز', 'الرئاسة']),
  reach_overview: ['وساطة بين الفصائل الفلسطينية', 'الكلفة: 10 من النفوذ · 6 أشهر', 'النفوذ +4'],
  relations: HEAD.concat(['العلاقات، الأفضل أولًا', RELS[0][0]]),
  reach_relations: ['العلاقات، الأفضل أولًا'].concat(RELS.flat(), ['من −100 إلى +100. العلاقة: الاتفاقيات والمساعدات والسلاح والعقوبات.']),
  treaties: HEAD.concat(['التكتلات', 'الجامعة العربية', 'دولة المقر']),
  reach_treaties: ['التكتلات', 'معاهدات واتفاقيات', 'السلام مع إسرائيل', '1979 · قيود على القوات في سيناء', 'الشراكة مع الاتحاد الأوروبي', '2004 · تجارة حرة صناعية',
    'المناطق الصناعية المؤهلة', '2004 · السوق الأمريكية دون جمارك بمكوّن إسرائيلي', 'مياه النيل مع السودان', '1959 · حصة مصر 55.5 مليار م³', 'المعونة الواردة منها 1.3 مليار $ عسكرية.']
    .concat(PAIRS.treaties.flat()),
  un: HEAD.concat(['مجلس الأمن 2011', 'دائمون بحق النقض']),
  reach_un: ['مجلس الأمن 2011', 'على جدول الأعمال', 'السودان', 'استفتاء الجنوب في 9 يناير', 'إيران', 'العقوبات · القرار 1929', 'مشروع قرار بشأن فلسطين',
    '15 من النفوذ · مع لبنان والغابون', 'الأصوات +2'].concat(PAIRS.un.flat()),
};

const screenChecks = `
const { issues, qa, q, T, nums, TOK, tab, order, DATA } = X;
const B = (t) => '.sheet .r-body[data-tab="' + t + '"] ';
// influence is the HUD's, rising: blue with its up arrow
if (tab === 'overview') { const hud = [...document.querySelectorAll('.top .stat')].find((s) => /النفوذ/.test(s.textContent)), kv = nums(T(qa('.sheet .r-kv b')[0]))[0];
  if (!hud || nums(hud.textContent).indexOf(kv) < 0) issues.push('influence is not the HUD\\'s');
  const kr = qa('.sheet .r-kr')[0]; if (getComputedStyle(kr).color !== TOK.blue || !kr.querySelector('use[href="#t-up"]')) issues.push('influence\\'s rise is not blue with its up arrow'); }
// each label with its own value (a swap must not pass)
(DATA.pairs[tab] || []).forEach(([k, v]) => { const dt = qa(B(tab) + '.r-sc dt, ' + B(tab) + '.f-l').find((e) => T(e) === k);
  const dd = dt && (dt.tagName === 'DT' ? dt.nextElementSibling : dt.parentElement.lastElementChild);
  if (!dd || T(dd) !== v) issues.push('«' + k + '» is not «' + v + '»: ' + (dd ? T(dd) : 'missing')); });
// relations: best first, in −100..100; a rise blue with its up arrow, a fall amber with its down arrow, a steady one with
// no arrow; each a 44 pt row (a button) that opens the relation, read whole with «سالب» exactly for a negative value
if (tab === 'relations') { const rows = qa(B('relations') + '.f-rel'), vals = rows.map((r) => nums(T(r.querySelector('.f-v')))[0]);
  for (let k = 1; k < vals.length; k++) if (vals[k] > vals[k - 1]) issues.push('the relations are not best first');
  if (JSON.stringify(rows.map((r) => [T(r.querySelector('.r-at b')), T(r.querySelector('.r-at > span')), T(r.querySelector('.f-v'))])) !== JSON.stringify(DATA.rels)) issues.push('the relations differ from the brief (names, standings, values)');
  rows.forEach((r, i) => { const nm = T(r.querySelector('.r-at b')), v = vals[i], al = r.getAttribute('aria-label') || '', b = r.querySelector('.f-v'), use = b.querySelector('use');
    if (!(v >= -100 && v <= 100)) issues.push('relation «' + nm + '» outside −100..100');
    const dir = /ترتفع/.test(al) ? 'up' : /تنخفض/.test(al) ? 'down' : /دون تغير/.test(al) ? 'flat' : '';
    if (dir === 'flat' ? !!use : (!use || use.getAttribute('href') !== '#t-' + dir)) issues.push('relation «' + nm + '»: the arrow does not show its trend');
    const col = getComputedStyle(b).color;
    if ((col === TOK.amber) !== (dir === 'down') || (col === TOK.blue) !== (dir === 'up')) issues.push('relation «' + nm + '»: amber marks a fall and blue a rise, and only those');
    if ((v < 0) !== /سالب/.test(al)) issues.push('a11y: relation «' + nm + '» does not say its sign right');
    if (!r.classList.contains('tap') || r.getAttribute('role') !== 'button' || !r.querySelector('.r-chev') || !/يفتح علاقتها$/.test(al)) issues.push('relation «' + nm + '» does not open (a 44 pt button with its chevron)');
    order(r, ['.r-at', '.f-v', '.r-chev'], 'relation ' + (i + 1)); });
  const strained = vals.filter((v) => v < -40).length; if (strained !== DATA.strained) issues.push('the strained relations listed (' + strained + ') are not the overview\\'s ' + DATA.strained); }
// the Security Council: 5 permanent and 5 + 5 elected; the lobbying action reads its partners
if (tab === 'un') { const n = qa('.sheet .f-un > span:last-child').map((s) => T(s).split(' · ').length);
  if (n.join(',') !== '5,5,5') issues.push('the Security Council is not 5 permanent and 5 + 5 elected: ' + n.join(','));
  const act = q(B('un') + '.r-act'), sub = T(act.querySelector('.r-at > span')).split(' · ').pop();
  if (!(act.getAttribute('aria-label') || '').includes(sub)) issues.push('the lobbying action does not read its partners'); }
// treaties and agenda items read whole (the shared rule) and never controls
qa('.sheet .f-tr').forEach((r) => { if (r.matches('.tap, button, [role=button], [tabindex]')) issues.push('«' + T(r.querySelector('.r-at b')) + '» is a control'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الخارجية', tabs: ['overview', 'relations', 'treaties', 'un'], longTab: 'relations',
  inputs: ['_build/foreign.css'],
  TOK: { sec: 'rgb(91, 134, 242)', ctlH: { '.f-rel': 44 }, sheetIcon: [], size: [['.f-rel', null, 44], ['.f-tr', null, 36]] },
  HEAD, BRIEF, screenChecks, DATA: { pairs: PAIRS, rels: RELS, strained: 3 },
  cases: (d, se) => { const R = '.r-body[data-tab="relations"] ', T2 = '.r-body[data-tab="treaties"] ', U = '.r-body[data-tab="un"] ', O = '.r-body[data-tab="overview"] ';
    return [
    ['influence off the HUD', d, '', '', /influence is not the HUD's/, () => { document.querySelector('.r-kv b').textContent = '65'; }],
    ['influence rise in amber', d, '', '.r-kpi:first-child .r-kr { color: var(--amber) !important; }', /influence's rise is not blue with its up arrow/],
    ['recognition swapped', d, '', '', /«الحكومة» is not «معترف بها»/, new Function("document.querySelectorAll('" + O + ".r-sc dd')[1].textContent = 'غير معترف بها';")],
    ['relations not best first', d, '&tab=relations', '', /the relations are not best first/, new Function("const r = document.querySelectorAll('" + R + ".f-rel'); r[0].before(r[3]);")],
    ['standings swapped', d, '&tab=relations', '', /the relations differ from the brief/, new Function("const r = document.querySelectorAll('" + R + ".f-rel'); const a = r[6].querySelector('.r-at > span'), b = r[7].querySelector('.r-at > span'), x = a.innerHTML; a.innerHTML = b.innerHTML; b.innerHTML = x;")],
    ['relation arrow wrong', d, '&tab=relations', '', /relation «إثيوبيا»: the arrow does not show its trend/, new Function("document.querySelectorAll('" + R + ".f-rel')[6].querySelector('use').setAttribute('href', '#t-up');")],
    ['arrow on a steady relation', d, '&tab=relations', '', /relation «قطر»: the arrow does not show its trend/, new Function("document.querySelectorAll('" + R + ".f-rel')[7].querySelector('.f-v').insertAdjacentHTML('afterbegin', '<svg class=\"r-arr\" aria-hidden=\"true\"><use href=\"#t-flat\"/></svg>');")],
    ['amber on a steady relation', d, '&tab=relations', '', /relation «قطر»: amber marks a fall/, new Function("document.querySelectorAll('" + R + ".f-rel')[7].querySelector('.f-v').classList.add('r-amber');")],
    ['positive read as negative', d, '&tab=relations', '', /a11y: relation «الولايات المتحدة» does not say its sign right/, new Function("document.querySelector('" + R + ".f-rel').setAttribute('aria-label', 'الولايات المتحدة: سالب 62، حليف، معونة عسكرية، دون تغير. يفتح علاقتها');")],
    ['relation not a button', d, '&tab=relations', '', /relation «السعودية» does not open/, new Function("const r = document.querySelectorAll('" + R + ".f-rel')[1]; r.classList.remove('tap'); r.setAttribute('role', 'img');")],
    ['strained count off', d, '&tab=relations', '', /the strained relations listed \(2\) are not the overview's 3/, new Function("document.querySelectorAll('" + R + ".f-rel')[8].remove();")],
    ['relation reversed', d, '&tab=relations', '.f-rel { flex-direction: row-reverse !important; }', /relation 1: order must be/],
    ['blocs swapped', d, '&tab=treaties', '', /«الجامعة العربية» is not «دولة المقر»/, new Function("const dd = document.querySelectorAll('" + T2 + ".r-sc dd'); dd[0].textContent = 'عضو'; dd[1].textContent = 'دولة المقر';")],
    ['council lists swapped', d, '&tab=un', '', /«منتخبون حتى 2011» is not/, new Function("const s = document.querySelectorAll('" + U + ".f-un > span:last-child'); const x = s[1].textContent; s[1].textContent = s[2].textContent; s[2].textContent = x;")],
    ['council short', d, '&tab=un', '', /the Security Council is not 5 permanent/, new Function("document.querySelectorAll('" + U + ".f-un > span:last-child')[1].textContent = 'البوسنة · البرازيل · الغابون · لبنان';")],
    ['lobbying partners unsaid', d, '&tab=un', '', /the lobbying action does not read its partners/, new Function("document.querySelector('" + U + ".r-act').setAttribute('aria-label', 'مشروع قرار بشأن فلسطين: الكلفة 15 من النفوذ، مع روسيا والصين. ترفع الأصوات المؤيدة 2، أفضل');")],
    ['treaty read in part', d, '&tab=treaties', '', /does not read all it shows/, new Function("document.querySelectorAll('" + T2 + ".f-tr')[3].setAttribute('aria-label', 'مياه النيل مع السودان، 1959، 55.5');")],
    ];
  },
});
