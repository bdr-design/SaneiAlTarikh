// Screen 11 variant A (the intelligence panel «الاستخبارات»): render the iPhones and run the checks, with the shared panel
// checker (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png (the overview)
// to the variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds the panel's own
// rules: the brief's strings per tab; the agency named generically (D-13: no real agency name); the networks strongest
// first, each bar at its level, each read whole with the month of its last refresh (§5.6's intel epoch); the running
// operations within the capacity and matching the headline, each bar at its progress; the 9 operation types and none of
// them a killing (§5.6, D-14); every row read whole and never a control.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['الاستخبارات', 'سري', 'مصر · جهاز الاستخبارات', 'نظرة عامة', 'الشبكات', 'العمليات', 'المكافحة'];
const NETS = [['غزة والضفة', 'آخر تحديث: ديسمبر 2010 · الانكشاف منخفض', '8'], ['السودان', 'آخر تحديث: ديسمبر 2010 · الانكشاف منخفض', '7'],
  ['ليبيا', 'آخر تحديث: نوفمبر 2010 · الانكشاف منخفض', '6'], ['إسرائيل', 'آخر تحديث: نوفمبر 2010 · الانكشاف متوسط', '5'], ['إيران', 'آخر تحديث: أكتوبر 2010 · الانكشاف مرتفع', '3']];
const TYPES = 'جمع معلومات · تخريب · هجوم إلكتروني · دعم معارضة · دعم متمردين · تأثير في انتخابات · دعم انقلاب · دعاية · سرقة تقنية';
const BRIEF = {
  overview: HEAD.concat(['الجهاز', '7', '/ 10', 'دون تغير', 'المكافحة', '8', 'العمليات', '2', 'من 4', 'الطاقة المتاحة', 'لماذا؟',
    'الإلكتروني', '4 / 10', 'الميزانية', '400 مليون $', 'تبادل المعلومات', 'الولايات المتحدة', 'الانكشاف', 'منخفض']),
  reach_overview: ['رفع ميزانية الجهاز', '100 مليون $ سنويًا', 'الإلكتروني +1'],
  networks: HEAD.concat(['الشبكات، الأقوى أولًا', NETS[0][0]]),
  reach_networks: ['الشبكات، الأقوى أولًا'].concat(NETS.flat(), ['صورة كل دولة تقدير بهامش، ويُحدَّث شهريًا أو عند نجاح عملية جمع معلومات.']),
  ops: HEAD.concat(['عمليات جارية · 2 من 4', 'جمع معلومات · ليبيا']),
  reach_ops: ['عمليات جارية · 2 من 4', 'جمع معلومات · ليبيا', 'تكتمل في فبراير 2011 · خطر منخفض', '60%', 'تفكيك شبكة · القاهرة', 'تكتمل في مارس 2011 · خطر منخفض', '35%',
    'عملية جديدة', TYPES, 'لا توجد عمليات اغتيال في اللعبة.', 'جمع معلومات · السودان', '60 مليون $ · 3 أشهر · خطر منخفض', 'الدقة'],
  counter: HEAD.concat(['عمليات أجنبية مكشوفة', 'شبكة تجسس · سيناء']),
  reach_counter: ['عمليات أجنبية مكشوفة', 'شبكة تجسس · سيناء', 'دولة غير مؤكدة · نوفمبر 2010', 'فُككت', 'تمويل جماعة مسلحة · غزة', 'مصدر خارجي · أكتوبر 2010', 'قيد المتابعة',
    'سجل الانكشاف', 'لم تُكشف أي عملية لنا منذ سنة.', 'تهديد داخلي', 'متوسط', 'تهديد إلكتروني', 'منخفض'],
};

const screenChecks = `
const { issues, qa, q, T, nums, tab, order, DATA } = X;
// the agency is named generically (D-13): no real agency name
{ const txt = q('.sheet').innerText; if (/المخابرات العامة|المخابرات الحربية|أمن الدولة|الموساد|سي آي إيه|\\bCIA\\b|MI6|KGB/.test(txt)) issues.push('a real agency name in the panel'); }
// networks: strongest first; each bar at its level out of 10; each read whole with the month of its last refresh
if (tab === 'networks') { const rows = qa('.sheet .n-row'), vals = rows.map((r) => nums(T(r.querySelector('.n-v')))[0]);
  for (let k = 1; k < vals.length; k++) if (vals[k] > vals[k - 1]) issues.push('the networks are not strongest first');
  rows.forEach((r, i) => { const nm = T(r.querySelector('.r-at b')), bar = r.querySelector('.i-bar'), al = r.getAttribute('aria-label') || '';
    if (Math.abs(parseFloat(getComputedStyle(bar, '::after').width) - bar.getBoundingClientRect().width * vals[i] / 10) > 0.6) issues.push('network «' + nm + '»: the bar is not at ' + vals[i] + ' / 10');
    if (!al.startsWith(nm + ': الشبكة ' + vals[i] + ' من 10') || !/آخر تحديث \\S+ \\d{4}/.test(al) || r.getAttribute('role') !== 'img') issues.push('a11y: network «' + nm + '» is not read whole with its refresh'); }); }
// operations: as many as the headline and within the capacity; each bar at its progress; the 9 types, no killing
if (tab === 'ops') { const rows = qa('.sheet .r-body[data-tab="ops"] .n-op'), h = nums(T(q('.r-body[data-tab="ops"] .r-sec h3')));
  if (rows.length !== h[0] || h[0] > h[1] || h[1] !== DATA.capacity) issues.push('the running operations are not the headline ' + h[0] + ' within the capacity ' + DATA.capacity);
  rows.forEach((r) => { const v = nums(T(r.querySelector('.n-v')))[0], pr = r.querySelector('.n-pr'), i = pr.querySelector('i');
    if (Math.abs(i.getBoundingClientRect().width - pr.getBoundingClientRect().width * v / 100) > 0.6) issues.push('operation «' + T(r.querySelector('.r-at b')) + '»: the bar is not at ' + v + '%'); });
  const types = T(q('.n-types')).split(' · ');
  if (types.length !== 9) issues.push('the operation types are not the 9 of §5.6: ' + types.length);
  if (types.some((x) => /اغتيال|قتل|تصفية/.test(x))) issues.push('an operation type that kills a person (§5.6, D-14)'); }
// every operation and case row read whole, never a control
qa('.sheet .n-op').forEach((r, i) => { const nm = T(r.querySelector('.r-at b')), al = r.getAttribute('aria-label') || '';
  if (!al || r.getAttribute('role') !== 'img' || nums(T(r)).some((x) => !nums(al).includes(x))) issues.push('a11y: row «' + nm + '» is not read whole');
  if (r.matches('button, [role=button], [tabindex], .tap') || r.querySelector('button, [role=button], [tabindex], .tap')) issues.push('row «' + nm + '» is a control'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الاستخبارات', tabs: ['overview', 'networks', 'ops', 'counter'], longTab: 'networks',
  inputs: ['_build/intel.css'],
  TOK: { sec: 'rgb(200, 115, 214)', ctlH: {}, sheetIcon: [['.n-wi', 10], ['.m-empty svg', 16]], size: [['.n-row', null, 36], ['.n-op', null, 36]] },
  HEAD, BRIEF, screenChecks, DATA: { capacity: 4 },
  cases: (d, se) => [
    ['a real agency name', d, '', '', /a real agency name in the panel/, () => { document.querySelector('.r-sub').lastChild.textContent = 'المخابرات العامة'; }],
    ['networks not strongest first', d, '&tab=networks', '', /the networks are not strongest first/, () => { const r = document.querySelectorAll('.n-row'); r[0].before(r[2]); }],
    ['network bar off', d, '&tab=networks', '', /network «السودان»: the bar is not at 7/, () => { document.querySelectorAll('.n-row .i-bar')[1].style.setProperty('--v', '30%'); }],
    ['network without its refresh', d, '&tab=networks', '', /a11y: network «ليبيا» is not read whole with its refresh/, () => { document.querySelectorAll('.n-row')[2].setAttribute('aria-label', 'ليبيا: الشبكة 6 من 10'); }],
    ['operations over the capacity', d, '&tab=ops', '', /the running operations are not the headline/, () => { document.querySelector('.r-body[data-tab="ops"] .r-sec h3').innerHTML = 'عمليات جارية · <span class="ltr">3</span> من <span class="ltr">4</span>'; }],
    ['operation bar off', d, '&tab=ops', '', /operation «جمع معلومات · ليبيا»: the bar is not at 60%/, () => { document.querySelector('.n-pr i').style.setProperty('--v', '20%'); }],
    ['a killing operation type', d, '&tab=ops', '', /an operation type that kills a person|the operation types are not the 9/, () => { const n = document.querySelector('.n-types'); n.textContent = n.textContent + ' · اغتيال'; }],
    ['case as a button', d, '&tab=counter', '', /row «شبكة تجسس · سيناء» is a control/, () => { document.querySelector('.r-body[data-tab="counter"] .n-op').setAttribute('role', 'button'); }],
  ],
});
