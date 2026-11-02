// Screen 11 variant A (the intelligence panel «الاستخبارات»): render the iPhones and run the checks, with the shared panel
// checker (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png (the overview)
// to the variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds the panel's own
// rules: the brief's strings per tab; every row as its parts in order (headlines, status cells, networks, operations,
// cases: a swap cannot pass); the agency named generically in text and VoiceOver (D-13); the networks strongest first,
// each bar at its level, read whole; the last refresh the month before the game date (§5.6's monthly intel epoch); amber
// with its icon exactly on high exposure, high threat and open cases; the running operations within the capacity, each
// one of the 9 types with its bar and «أُنجز»; no killing type (§5.6, D-14); every row read whole and never a control.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['الاستخبارات', 'سري', 'مصر · جهاز الاستخبارات', 'نظرة عامة', 'الشبكات', 'العمليات', 'المكافحة'];
// each row as its parts, in order (a swap cannot pass): networks [name, level, exposure]; operations [name, progress, line];
// cases [name, line, status]; headlines [label, value, line]; status cells [label, value]
const NETS = [['غزة والضفة', 8, 'منخفض'], ['السودان', 7, 'منخفض'], ['ليبيا', 6, 'منخفض'], ['إسرائيل', 5, 'متوسط'], ['إثيوبيا', 4, 'منخفض'], ['إيران', 3, 'مرتفع']];
const OPS = [['جمع معلومات · ليبيا', 60, 'تكتمل في فبراير 2011 · خطر منخفض'], ['جمع معلومات · إثيوبيا', 35, 'تكتمل في مارس 2011 · خطر منخفض']];
const CASES = [['شبكة تجسس · سيناء', 'الجهة الراعية غير مؤكدة · نوفمبر 2010', 'فُككت'], ['شبكة تجسس · القاهرة', 'جهة أجنبية · ديسمبر 2010', 'قيد التفكيك'],
  ['تمويل جماعة مسلحة · غزة', 'مصدر خارجي · أكتوبر 2010', 'قيد المتابعة']];
const KPIS = [['الجهاز', '7 / 10', 'دون تغير'], ['مكافحة التجسس', '8 / 10', 'دون تغير'], ['العمليات', '2 من 4', 'قيد التنفيذ']];
const CELLS = { overview: [['السيبراني', '4 / 10'], ['الميزانية', '400 مليون $ سنويًا'], ['الشبكات', '6 دول'], ['الانكشاف', 'منخفض']],
  counter: [['تهديد داخلي', 'مرتفع'], ['تهديد سيبراني', 'منخفض']] };
const TYPES = 'جمع معلومات، تخريب، هجوم إلكتروني، دعم معارضة، دعم متمردين، تأثير في انتخابات، دعم انقلاب، دعاية، سرقة التقنية.';
const NOTE = 'صورة كل دولة تقدير له هامش خطأ، وتُحدَّث أول كل شهر أو عند نجاح عملية جمع معلومات. آخر تحديث: ديسمبر 2010.';
const BRIEF = {
  overview: HEAD.concat(['الجهاز', '7', '/ 10', 'دون تغير', 'مكافحة التجسس', '8', 'العمليات', '2', 'من 4', 'قيد التنفيذ', 'لماذا؟',
    'السيبراني', '4 / 10', 'الميزانية', '400 مليون $ سنويًا', 'الشبكات', '6 دول', 'الانكشاف', 'منخفض']),
  reach_overview: ['تمويل القدرات السيبرانية', '100 مليون $ سنويًا · خلال سنة', 'السيبراني +1'],
  networks: HEAD.concat(['الشبكات، الأقوى أولًا', NETS[0][0]]),
  reach_networks: ['الشبكات، الأقوى أولًا'].concat(NETS.map((x) => x[0]), [NOTE]),
  ops: HEAD.concat(['عمليات جارية · 2 من 4', 'جمع معلومات · ليبيا']),
  reach_ops: ['عمليات جارية · 2 من 4'].concat(OPS.map((x) => x[0]), OPS.map((x) => x[2]), ['أنواع العمليات المتاحة', TYPES, 'لا توجد عمليات اغتيال في اللعبة.', 'جمع معلومات · السودان', '60 مليون $ · 3 أشهر · خطر منخفض', 'الدقة']),
  counter: HEAD.concat(['عمليات أجنبية مكشوفة', 'شبكة تجسس · سيناء']),
  reach_counter: ['عمليات أجنبية مكشوفة'].concat(CASES.flat(), ['سجل الانكشاف', 'لم تُكشف أي عملية لنا منذ سنة.', 'تهديد داخلي', 'مرتفع', 'تهديد سيبراني', 'منخفض']),
};
// D-13: no real agency name, in the text or in what VoiceOver reads
const AGENCIES = 'المخابرات العامة|المخابرات الحربية|المخابرات المركزية|أمن الدولة|الأمن الوطني|الموساد|الشاباك|الشين بيت|السافاك|سي آي إيه|\\bCIA\\b|MI5|MI6|KGB|\\bFSB\\b|\\bSVR\\b|\\bISI\\b|\\bBND\\b|DGSE|Mossad|Shin Bet';

const screenChecks = `
const { issues, qa, q, T, nums, tab, order, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
// the agency is named generically (D-13): no real agency name in the text or any VoiceOver label
{ const all = q('.sheet').textContent + ' ' + [q('.sheet'), ...q('.sheet').querySelectorAll('[aria-label]')].map((e) => e.getAttribute('aria-label') || '').join(' ');
  if (new RegExp(DATA.agencies).test(all)) issues.push('a real agency name in the panel'); }
// amber with its warning icon exactly on a high exposure, a high threat and a case still open, and on nothing else
qa('.sheet .r-body .r-at > span, .sheet .r-body dd, .sheet .r-body .n-st').forEach((e) => { const s = W(T(e)), hot = /مرتفع$|قيد المتابعة|قيد التفكيك/.test(s), am = e.matches('.r-amber') || !!e.querySelector('.r-amber');
  if (hot !== am || hot !== !!e.querySelector('.n-wi')) issues.push('«' + s + '»: ' + (hot ? 'a warning not amber with its icon' : 'amber or a warning icon on a calm value')); });
// headlines and status cells as pairs
if (tab === 'overview') qa('.sheet .r-kpi').forEach((k, i) => { const got = [W(T(k.querySelector('.r-kl'))), [...k.querySelector('.r-kv').children].map((c) => W(T(c))).join(' '), W(T(k.querySelector('.r-kr')))];
  if (!DATA.kpis[i] || got.join('|') !== DATA.kpis[i].join('|')) issues.push('headline ' + (i + 1) + ' is not «' + (DATA.kpis[i] || []).join(' ') + '»: «' + got.join(' ') + '»'); });
if (DATA.cells[tab]) { const got = qa('.sheet .r-body[data-tab="' + tab + '"] .r-sc').map((c) => [W(T(c.querySelector('dt'))), W(T(c.querySelector('dd')))]);
  if (got.length !== DATA.cells[tab].length) issues.push('the status cells are not the brief\\'s ' + DATA.cells[tab].length);
  got.forEach((g, i) => { if (!DATA.cells[tab][i] || g.join('|') !== DATA.cells[tab][i].join('|')) issues.push('status ' + (i + 1) + ' is not «' + (DATA.cells[tab][i] || []).join(' ') + '»: «' + g.join(' ') + '»'); }); }
// networks: the brief's, in order (strongest first), each bar at its level, read whole; the refresh month (the note) is the month before the game date
if (tab === 'networks') { const rows = qa('.sheet .n-row'), vals = rows.map((r) => nums(T(r.querySelector('.n-v')))[0]);
  if (rows.length !== DATA.nets.length) issues.push('the networks are not the brief\\'s ' + DATA.nets.length);
  for (let k = 1; k < vals.length; k++) if (vals[k] > vals[k - 1]) issues.push('the networks are not strongest first');
  rows.forEach((r, i) => { const nm = W(T(r.querySelector('.r-at b'))), heat = W(T(r.querySelector('.r-at > span'))).replace('الانكشاف ', ''), bar = r.querySelector('.i-bar'), al = r.getAttribute('aria-label') || '', w = DATA.nets[i] || [];
    if (nm !== w[0] || vals[i] !== w[1] || heat !== w[2]) issues.push('network ' + (i + 1) + ' is not «' + w.join(' ') + '»: «' + [nm, vals[i], heat].join(' ') + '»');
    if (Math.abs(parseFloat(getComputedStyle(bar, '::after').width) - bar.getBoundingClientRect().width * vals[i] / 10) > 0.6) issues.push('network «' + nm + '»: the bar is not at ' + vals[i] + ' / 10');
    if (al !== nm + ': الشبكة ' + vals[i] + ' من 10، الانكشاف ' + heat || r.getAttribute('role') !== 'img') issues.push('a11y: network «' + nm + '» is not read whole'); });
  const M = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const g = W(T(q('.top .date .dmy'))).match(/(\\d+) (\\S+) (\\d{4})/), n = W(T(q('.r-body[data-tab="networks"] .s-note'))).match(/آخر تحديث: (\\S+) (\\d{4})/);
  const want = g ? (M.indexOf(g[2]) === 0 ? ['ديسمبر', +g[3] - 1] : [M[M.indexOf(g[2]) - 1], +g[3]]) : [];
  if (!n || n[1] !== want[0] || +n[2] !== want[1]) issues.push('the last refresh is not the month before the game date (' + want.join(' ') + ')'); }
// operations: the brief's, as many as the headline and within the capacity; each bar at its progress; the 9 types, no killing
if (tab === 'ops') { const rows = qa('.sheet .r-body[data-tab="ops"] .n-op'), h = nums(T(q('.r-body[data-tab="ops"] .r-sec h3')));
  if (rows.length !== h[0] || h[0] > h[1] || h[1] !== DATA.capacity) issues.push('the running operations are not the headline ' + h[0] + ' within the capacity ' + DATA.capacity);
  rows.forEach((r, i) => { const nm = W(T(r.querySelector('.r-at b'))), v = nums(T(r.querySelector('.n-v')))[0], ln = W(T(r.querySelector('.r-at > span'))), pr = r.querySelector('.n-pr'), b = pr.querySelector('i'), w = DATA.ops[i] || [];
    if (nm !== w[0] || v !== w[1] || ln !== w[2]) issues.push('operation ' + (i + 1) + ' is not «' + w.join(' ') + '»: «' + [nm, v, ln].join(' ') + '»');
    if (!/^أُنجز/.test(W(T(r.querySelector('.n-v')))) || !/أُنجز \\d+%/.test(r.getAttribute('aria-label') || '')) issues.push('operation «' + nm + '»: its % does not say it is the progress');
    if (Math.abs(b.getBoundingClientRect().width - pr.getBoundingClientRect().width * v / 100) > 0.6) issues.push('operation «' + nm + '»: the bar is not at ' + v + '%'); });
  const types = W(T(q('.n-types'))).replace(/\\.$/, '').split('، ');
  if (types.length !== 9) issues.push('the operation types are not the 9 of §5.6: ' + types.length);
  if (types.some((x) => /اغتيال|قتل|تصفية/.test(x))) issues.push('an operation type that kills a person (§5.6, D-14)');
  if (types.some((x) => /^(تفكيك|مكافحة)/.test(x)) || rows.some((r) => !types.includes(W(T(r.querySelector('.r-at b'))).split(' · ')[0]))) issues.push('a running operation is not one of the 9 types'); }
// the cases caught: the brief's, each with its line and status
if (tab === 'counter') { const rows = qa('.sheet .r-body[data-tab="counter"] .n-op');
  if (rows.length !== DATA.cases.length) issues.push('the cases are not the brief\\'s ' + DATA.cases.length);
  rows.forEach((r, i) => { const got = [W(T(r.querySelector('.r-at b'))), W(T(r.querySelector('.r-at > span'))), W(T(r.querySelector('.n-st')))], w = DATA.cases[i] || [];
    if (got.join('|') !== w.join('|')) issues.push('case ' + (i + 1) + ' is not «' + w.join(' ') + '»: «' + got.join(' ') + '»'); }); }
// every network, operation and case row read whole, never a control
qa('.sheet .n-row, .sheet .n-op').forEach((r) => { const nm = T(r.querySelector('.r-at b')), al = r.getAttribute('aria-label') || '';
  if (!al || r.getAttribute('role') !== 'img' || nums(T(r)).some((x) => !nums(al).includes(x))) issues.push('a11y: row «' + nm + '» is not read whole');
  if (r.matches('button, [role=button], [tabindex], .tap') || r.querySelector('button, [role=button], [tabindex], .tap')) issues.push('row «' + nm + '» is a control'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الاستخبارات', tabs: ['overview', 'networks', 'ops', 'counter'], longTab: 'networks',
  inputs: ['_build/intel.css'],
  TOK: { sec: 'rgb(200, 115, 214)', ctlH: {}, sheetIcon: [['.n-wi', 10], ['.m-empty svg', 16]], size: [['.n-row', null, 36], ['.n-op', null, 36]] },
  HEAD, BRIEF, screenChecks, DATA: { capacity: 4, nets: NETS, ops: OPS, cases: CASES, kpis: KPIS, cells: CELLS, agencies: AGENCIES },
  cases: (d, se) => [
    ['a real agency name', d, '', '', /a real agency name in the panel/, () => { document.querySelector('.r-sub').lastChild.textContent = 'المخابرات العامة'; }],
    ['an agency name heard only', d, '', '', /a real agency name in the panel/, () => { document.querySelector('.r-act').setAttribute('aria-label', 'رفع ميزانية المخابرات العامة: 100 مليون دولار سنويًا، خلال سنة. يرفع السيبراني 1، أفضل'); }],
    ['a Latin agency name', d, '&tab=counter', '', /a real agency name in the panel/, () => { const p = document.createElement('p'); p.className = 's-note'; p.textContent = 'Mossad'; document.querySelector('.r-body[data-tab="counter"]').appendChild(p); }],
    ['headline values swapped', d, '', '', /headline 1 is not/, () => { const k = document.querySelectorAll('.r-kpi b.ltr'); k[0].textContent = '8'; k[1].textContent = '7'; }],
    ['status values swapped', d, '', '', /status 3 is not/, () => { const dd = document.querySelectorAll('.r-body[data-tab="overview"] dd'), x = dd[2].innerHTML; dd[2].innerHTML = dd[3].innerHTML; dd[3].innerHTML = x; }],
    ['networks not strongest first', d, '&tab=networks', '', /the networks are not strongest first/, () => { const r = document.querySelectorAll('.n-row'); r[0].before(r[2]); }],
    ['network names swapped', d, '&tab=networks', '', /network 1 is not/, () => { const b = document.querySelectorAll('.n-row .r-at b'), x = b[0].textContent; b[0].textContent = b[1].textContent; b[1].textContent = x; }],
    ['network bar off', d, '&tab=networks', '', /network «السودان»: the bar is not at 7/, () => { document.querySelectorAll('.n-row .i-bar')[1].style.setProperty('--v', '30%'); }],
    ['network read in part', d, '&tab=networks', '', /a11y: network «ليبيا» is not read whole/, () => { document.querySelectorAll('.n-row')[2].setAttribute('aria-label', 'ليبيا: الشبكة 6 من 10'); }],
    ['refresh month stale', d, '&tab=networks', '', /the last refresh is not the month before the game date/, () => { const n = document.querySelector('.r-body[data-tab="networks"] .s-note'); n.innerHTML = n.innerHTML.replace('ديسمبر', 'أكتوبر'); }],
    ['high exposure drawn calm', d, '&tab=networks', '', /«الانكشاف مرتفع»: a warning not amber/, () => { const h = document.querySelector('.n-heat'); h.classList.remove('r-amber'); h.querySelector('svg').remove(); }],
    ['calm exposure in amber', d, '&tab=networks', '', /«الانكشاف منخفض»: amber or a warning icon on a calm value/, () => { const s = document.querySelector('.n-row .r-at > span'); s.innerHTML = '<span class="r-amber n-heat"><svg class="i n-wi" aria-hidden="true"><use href="#i-warn"/></svg>الانكشاف منخفض</span>'; }],
    ['a network row focusable', d, '&tab=networks', '', /row «غزة والضفة» is a control/, () => { document.querySelector('.n-row').setAttribute('tabindex', '0'); }],
    ['operations over the capacity', d, '&tab=ops', '', /the running operations are not the headline/, () => { document.querySelector('.r-body[data-tab="ops"] .r-sec h3').innerHTML = 'عمليات جارية · <span class="ltr">3</span> من <span class="ltr">4</span>'; }],
    ['operation progress swapped', d, '&tab=ops', '', /operation 1 is not/, () => { const v = document.querySelectorAll('.n-op .n-v .ltr'), b = document.querySelectorAll('.n-op .n-pr i'); v[0].textContent = '35%'; v[1].textContent = '60%'; b[0].style.setProperty('--v', '35%'); b[1].style.setProperty('--v', '60%'); }],
    ['operation % unnamed', d, '&tab=ops', '', /its % does not say it is the progress/, () => { const v = document.querySelector('.n-op .n-v'); v.firstChild.textContent = ''; }],
    ['operation bar off', d, '&tab=ops', '', /operation «جمع معلومات · ليبيا»: the bar is not at 60%/, () => { document.querySelector('.n-pr i').style.setProperty('--v', '20%'); }],
    ['a killing operation type', d, '&tab=ops', '', /an operation type that kills a person|the operation types are not the 9/, () => { const n = document.querySelector('.n-types'); n.textContent = n.textContent.replace('.', '، اغتيال.'); }],
    ['a running op not a type', d, '&tab=ops', '', /a running operation is not one of the 9 types/, () => { document.querySelectorAll('.n-op .r-at b')[1].textContent = 'تفكيك شبكة · القاهرة'; }],
    ['case statuses swapped', d, '&tab=counter', '', /case 1 is not/, () => { const s = document.querySelectorAll('.r-body[data-tab="counter"] .n-st'), x = s[0].innerHTML; s[0].innerHTML = s[2].innerHTML; s[2].innerHTML = x; s[0].classList.add('r-amber'); s[2].classList.remove('r-amber'); }],
    ['open case drawn calm', d, '&tab=counter', '', /«قيد المتابعة»: a warning not amber/, () => { const s = document.querySelectorAll('.r-body[data-tab="counter"] .n-st')[2]; s.classList.remove('r-amber'); s.querySelector('svg').remove(); }],
    ['threats swapped', d, '&tab=counter', '', /status 1 is not/, () => { const dd = document.querySelectorAll('.r-body[data-tab="counter"] dd'), x = dd[0].innerHTML; dd[0].innerHTML = dd[1].innerHTML; dd[1].innerHTML = x; }],
    ['case as a button', d, '&tab=counter', '', /row «شبكة تجسس · سيناء» is a control/, () => { document.querySelector('.r-body[data-tab="counter"] .n-op').setAttribute('role', 'button'); }],
  ],
});
