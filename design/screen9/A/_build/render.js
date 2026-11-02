// Screen 9 variant A (the military panel «الجيش»): render the iPhones and run the checks, with the shared panel checker
// (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png (the overview) to the
// variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds the panel's own rules:
// the brief's strings per tab; the armies' formations adding up to the headline and within the quota (40 + population
// / 1.5 million, §5.4, with the internal panel's population); the defence budget = the economy panel's line, conscription
// = the state panel's law, the Republican Guard's organization = the province panel's (all read from their sheets);
// army and equipment rows read whole by VoiceOver and never controls; the equipment stock adding up, its bars at the
// modern share; equipment generic (no real weapon names or model codes); the mobilization's formations = its personnel
// over the nominal 10,000.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

// the approved panels' numbers this panel repeats, read from their sheets (not copied)
function approved() {
  const flat = (f) => fs.readFileSync(path.join(OUT, f), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const s6 = flat('../../screen6/A/_build/sheet.html'), s8 = flat('../../screen8/A/_build/sheet.html'), r = flat('../../screen4/R/_build/sheet.html');
  const s5 = fs.readFileSync(path.join(OUT, '../../screen5/A/_build/sheet.html'), 'utf8');
  const def = s6.match(/الدفاع ([\d.]+) مليار \$/), pop = s8.match(/السكان ([\d.]+) مليون/), guard = r.match(/فرقة مشاة الحرس الجمهوري التنظيم (\d+)%/);
  const law = s5.match(/aria-label="التجنيد"><button[\s\S]*?s-sg tap on" role="radio" aria-checked="true">([^<]+)</);
  if (!def || !pop || !guard || !law) throw new Error('cannot read the approved panels\' numbers');
  return { defence: +def[1], pop: +pop[1], guard: +guard[1], conscription: law[1] };
}
const A = approved();

const HEAD = ['الجيش', 'لا حروب', 'مصر · القوات المسلحة', 'نظرة عامة', 'القوات', 'المعدات', 'الحروب'];
const ARMIES = [['الجيش الثاني الميداني', 'القناة وشمال سيناء · 14 تشكيلًا', 'التنظيم 80%'], ['الجيش الثالث الميداني', 'السويس وجنوب سيناء · 12 تشكيلًا', 'التنظيم 78%'],
  ['المنطقة المركزية', 'القاهرة والدلتا · 10 تشكيلات', 'التنظيم 82%'], ['المنطقة الشمالية', 'الإسكندرية والساحل · 8 تشكيلات', 'التنظيم 75%'],
  ['المنطقة الغربية', 'مطروح وحدود ليبيا · 7 تشكيلات', 'التنظيم 76%'], ['المنطقة الجنوبية', 'الصعيد · 6 تشكيلات', 'التنظيم 72%'],
  ['الحرس الجمهوري', 'القاهرة · 4 تشكيلات', 'التنظيم 95%'], ['الاحتياط العام', 'غير مخصص · 11 تشكيلًا', 'التنظيم 60%']];
const EQ = [['البرية', '14 مليار $', 'حديث 40%'], ['الجوية', '9 مليارات $', 'حديث 55%'], ['الدفاع الجوي', '5 مليارات $', 'حديث 30%'], ['البحرية', '3 مليارات $', 'حديث 20%'], ['الصواريخ', '1 مليار $', 'حديث 10%']];
const BRIEF = {
  overview: HEAD.concat(['العاملون', '469', 'ألف', 'دون تغير', 'الاحتياط', '479', '+2 ألف شهريًا', 'التشكيلات', '72', 'من 94', 'الحد حسب السكان', 'لماذا؟',
    'التجنيد', 'إلزامي', 'الميزانية', '4.0 مليار $', 'المعونة', '1.3 مليار $ سنويًا', 'الحروب', 'لا توجد']),
  reach_overview: ['تعبئة جزئية النمو', '40 ألفًا · 150 مليون $ شهريًا', 'التشكيلات +4'],
  forces: HEAD.concat(['الجيوش · 72 تشكيلًا', ARMIES[0][0]]),
  reach_forces: ['الجيوش · 72 تشكيلًا'].concat(ARMIES.flat(), ['تُدار الجيوش من الخريطة: اضغط الجيش ثم وجهته، وأمره تقدّم أو هجوم أو توقف.',
    'الجوية', '14 مجموعة', 'البحرية', 'أسطولان', 'الدفاع الجوي', '5 فرق', 'السيطرة الجوية', 'مصر']),
  equipment: HEAD.concat(['المخزون · 32 مليار $ تقريبًا', 'البرية']),
  reach_equipment: ['المخزون · 32 مليار $ تقريبًا'].concat(EQ.flat(), ['تقديرات بهامش ±20%. «حديث»: من الجيلين الأحدث المتاحين.', 'المشتريات', '1.1 مليار $ سنويًا',
    'من المعونة', '1.3 مليار $', 'إنتاج محلي', 'الهيئة العربية', 'التجميع', 'دبابات قتال رئيسية', '20 مقاتلة من الجيل الرابع', '2.5 مليار $ · تسليم 2013',
    'الحديث +10', 'التجنيد: إلزامي', 'يُغيَّر من الدولة › السياسات']),
  wars: HEAD.concat(['الحروب والجبهات', 'لا حروب ولا جبهات الآن. تظهر الجبهة على الخريطة عند أول حرب.']),
  reach_wars: ['الحروب والجبهات', 'لا حروب ولا جبهات الآن. تظهر الجبهة على الخريطة عند أول حرب.', 'ما يقيّد القوات', 'سيناء', 'قيود معاهدة 1979', 'النووي', 'لا يوجد',
    'عدم الانتشار', 'طرف', 'الشريك', 'الولايات المتحدة', 'معاهدة السلام تحدد عدد القوات في كل منطقة من سيناء، وتغييرها يمر بالخارجية.', 'الحرب والتحالفات', 'تُعلن من قسم الخارجية'],
};

const screenChecks = `
const { issues, qa, q, T, nums, TOK, tab, DATA, order } = X;
// the armies: formations add up to the headline and the section, within the quota; each read whole; never a control
if (tab === 'forces') {
  const rows = qa('.sheet .m-army'), counts = rows.map((r) => nums(T(r.querySelector('.r-at > span')))[0]), sum = counts.reduce((a, b) => a + b, 0);
  if (sum !== DATA.formations || nums(T(q('.r-body[data-tab="forces"] .r-sec h3')))[0] !== sum) issues.push('the armies\\' formations (' + sum + ') are not the headline ' + DATA.formations);
  rows.forEach((r, i) => { const al = r.getAttribute('aria-label') || '', nm = T(r.querySelector('.r-at b'));
    if (!al.startsWith(nm + ': ') || nums(al).indexOf(counts[i]) < 0 || !al.includes(T(r.querySelector('.p-rdy b'))) || r.getAttribute('role') !== 'img') issues.push('a11y: army «' + nm + '» is not read whole');
    if (r.matches('button, a, [role=button], [tabindex], .tap') || r.querySelector('button, a, [role=button], [tabindex], .tap')) issues.push('army «' + nm + '» is a control (armies are moved on the map)');
    order(r, ['.r-at', '.p-rdy'], 'army ' + (i + 1)); });
  const guard = rows.find((r) => T(r.querySelector('.r-at b')) === 'الحرس الجمهوري');
  if (!guard || nums(T(guard.querySelector('.p-rdy b')))[0] !== DATA.guard) issues.push('the Republican Guard\\'s organization is not the province panel\\'s ' + DATA.guard + '%'); }
// the overview: formations within the quota (40 + population / 1.5 million), the budget and conscription as their owners have them
if (tab === 'overview') {
  const kv = qa('.sheet .r-kv'), f = nums(T(kv[2])), quota = Math.ceil(40 + DATA.pop / 1.5);
  if (f[0] !== DATA.formations || f[1] !== quota) issues.push('the formations are not ' + DATA.formations + ' of the quota ' + quota);
  const st = Object.fromEntries(qa('.sheet .r-body[data-tab="overview"] .r-sc').map((c) => [T(c.querySelector('dt')), T(c.querySelector('dd'))]));
  if (nums(st['الميزانية'])[0] !== DATA.defence) issues.push('the defence budget is not the economy panel\\'s ' + DATA.defence);
  if (st['التجنيد'] !== DATA.conscription) issues.push('conscription is not the state panel\\'s «' + DATA.conscription + '»');
  const mob = q('.r-body[data-tab="overview"] .r-act'), per = nums(T(mob.querySelector('.r-at > span')))[0], ch = nums(T(mob.querySelector('.r-chip')))[0];
  if (Math.round(per * 1000 / 10000) !== ch) issues.push('the mobilization\\'s formations are not its personnel over 10,000'); }
// the equipment: the categories add up to the stock, each bar at its modern share, each read whole
if (tab === 'equipment') {
  const rows = qa('.sheet .m-eq'), vals = rows.map((r) => nums(T(r.querySelector('b')))[0]), tot = nums(T(q('.r-body[data-tab="equipment"] .r-sec h3')))[0];
  if (vals.reduce((a, b) => a + b, 0) !== tot) issues.push('the equipment categories do not add up to the stock ' + tot);
  rows.forEach((r) => { const nm = T(r.querySelector('span')), sh = nums(T(r.querySelector('em')))[0], bar = r.querySelector('.i-bar');
    if (Math.abs(parseFloat(getComputedStyle(bar, '::after').width) - bar.getBoundingClientRect().width * sh / 100) > 0.6) issues.push('equipment «' + nm + '»: the bar is not at its modern share');
    const al = r.getAttribute('aria-label') || '';
    if (!al.startsWith(nm + ': ') || !nums(al).includes(sh) || r.getAttribute('role') !== 'img') issues.push('a11y: equipment «' + nm + '» is not read whole'); }); }
// equipment stays generic (the owner's decision): no real weapon names or model codes in Latin letters
{ const txt = q('.sheet').innerText + ' ' + [...document.querySelectorAll('.sheet [aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ');
  if (/[A-Za-z]/.test(txt)) issues.push('a real weapon name or model code in the panel: ' + (txt.match(/\\S*[A-Za-z]\\S*/) || [''])[0]); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الجيش', tabs: ['overview', 'forces', 'equipment', 'wars'], longTab: 'forces',
  inputs: ['_build/military.css', '../../screen4/R/_build/sheet.html', '../../screen5/A/_build/sheet.html', '../../screen6/A/_build/sheet.html', '../../screen8/A/_build/sheet.html'],
  TOK: { sec: 'rgb(189, 180, 106)', ctlH: {}, sheetIcon: [['.m-empty svg', 16]], size: [['.m-army', null, 36], ['.m-eq', null, 22]] },
  HEAD, BRIEF, screenChecks,
  DATA: Object.assign({}, A, { formations: 72 }),
  cases: (d, se) => [
    ['armies off the headline', d, '&tab=forces', '', /the armies' formations \(73\) are not the headline 72/, () => { document.querySelector('.m-army .r-at > span .ltr').textContent = '15'; }],
    ['army silent', d, '&tab=forces', '', /a11y: army «الجيش الثالث الميداني» is not read whole/, () => { document.querySelectorAll('.m-army')[1].removeAttribute('aria-label'); }],
    ['army as a button', d, '&tab=forces', '', /army «الجيش الثاني الميداني» is a control/, () => { const r = document.querySelector('.m-army'); r.setAttribute('role', 'button'); r.setAttribute('tabindex', '0'); }],
    ['guard off the province', d, '&tab=forces', '', /the Republican Guard's organization is not the province panel's 95%/, () => { document.querySelectorAll('.m-army')[6].querySelector('.p-rdy b').textContent = '90%'; }],
    ['army reversed', d, '&tab=forces', '.m-army { flex-direction: row-reverse !important; }', /army 1: order must be/],
    ['quota off', d, '', '', /the formations are not 72 of the quota 94/, () => { document.querySelectorAll('.r-kv')[2].querySelector('span .ltr').textContent = '100'; }],
    ['budget off the economy', d, '', '', /the defence budget is not the economy panel's 4/, () => { document.querySelectorAll('[data-tab="overview"] .r-sc dd')[1].querySelector('.ltr').textContent = '4.5'; }],
    ['conscription off the state', d, '', '', /conscription is not the state panel's «إلزامي»/, () => { document.querySelector('[data-tab="overview"] .r-sc dd').textContent = 'تطوعي'; }],
    ['mobilization off', d, '', '', /the mobilization's formations are not its personnel over 10,000/, () => { document.querySelector('[data-tab="overview"] .r-act .r-chip .ltr').textContent = '+6'; }],
    ['stock off', d, '&tab=equipment', '', /the equipment categories do not add up to the stock 32/, () => { document.querySelector('.m-eq b .ltr').textContent = '16'; }],
    ['equipment bar off', d, '&tab=equipment', '', /equipment «الجوية»: the bar is not at its modern share/, () => { document.querySelectorAll('.m-eq .i-bar')[1].style.setProperty('--v', '20%'); }],
    ['equipment silent', d, '&tab=equipment', '', /a11y: equipment «البحرية» is not read whole/, () => { document.querySelectorAll('.m-eq')[3].removeAttribute('aria-label'); }],
    ['a real weapon name', d, '&tab=equipment', '', /a real weapon name or model code in the panel: F-16/, () => { document.querySelector('[data-tab="equipment"] .r-act .r-at b').insertAdjacentHTML('beforeend', ' <span class="ltr">F-16</span>'); }],
  ],
});
