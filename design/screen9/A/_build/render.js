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
  const guardCount = (r.match(/الحرس الجمهوري التنظيم/g) || []).length;   // the guard's formations stationed in Cairo
  const law = s5.match(/aria-label="التجنيد"><button[\s\S]*?s-sg tap on" role="radio" aria-checked="true">([^<]+)</);
  if (!def || !pop || !guard || !law) throw new Error('cannot read the approved panels\' numbers');
  return { defence: +def[1], pop: +pop[1], guard: +guard[1], guardCount, conscription: law[1] };
}
const A = approved();

const HEAD = ['الجيش', 'لا حروب', 'مصر · القوات المسلحة', 'نظرة عامة', 'القوات', 'المعدات', 'الحروب'];
const ARMIES = [['الجيش الثاني الميداني', 'القناة وشمال سيناء · 7 تشكيلات', 'التنظيم 80%'], ['الجيش الثالث الميداني', 'السويس وجنوب سيناء · 6 تشكيلات', 'التنظيم 78%'],
  ['المنطقة المركزية', 'القاهرة والدلتا · 5 تشكيلات', 'التنظيم 82%'], ['المنطقة الشمالية', 'الإسكندرية والساحل · 4 تشكيلات', 'التنظيم 75%'],
  ['المنطقة الغربية', 'مطروح وحدود ليبيا · 4 تشكيلات', 'التنظيم 76%'], ['المنطقة الجنوبية', 'الصعيد · 3 تشكيلات', 'التنظيم 72%'],
  ['الحرس الجمهوري', 'القاهرة · 1 تشكيل', 'التنظيم 95%'], ['احتياط القيادة العامة', 'غير مخصص · 6 تشكيلات', 'التنظيم 60%']];
const EQ = [['البرية', '14 مليار $', 'حديث 40%'], ['الجوية', '9 مليارات $', 'حديث 55%'], ['الدفاع الجوي', '5 مليارات $', 'حديث 30%'], ['البحرية', '3 مليارات $', 'حديث 20%'], ['الصواريخ', '1 مليار $', 'حديث 10%']];
const BRIEF = {
  overview: HEAD.concat(['القوات العاملة', '469', 'ألف', 'دون تغير', 'الاحتياط', '479', '+2 ألف شهريًا', 'التشكيلات', '36', 'من 93', 'الحد حسب السكان', 'لماذا؟',
    'التجنيد', 'إلزامي', 'الميزانية', '4.0 مليار $', 'المعونة', '1.3 مليار $ سنويًا', 'الحروب', 'لا توجد', 'تعبئة جزئية النمو −0.2', 'من الاحتياط · 150 مليون $ شهريًا', 'القوام +40 ألفًا']),
  forces: HEAD.concat(['الجيوش · 36 تشكيلًا', ARMIES[0][0]]),
  reach_forces: ['الجيوش · 36 تشكيلًا'].concat(ARMIES.flat(), ['تُدار الجيوش من الخريطة: اضغط الجيش ثم وجهته، واختر أمره: تقدّم أو هجوم أو توقّف، مع نقاط عبور.',
    'الجوية', '14 مجموعة', 'البحرية', 'أسطولان', 'الدفاع الجوي', '5 فرق', 'السيطرة الجوية', 'كاملة فوق مصر']),
  equipment: HEAD.concat(['المخزون · 32 مليار $ تقريبًا', 'البرية']),
  reach_equipment: ['المخزون · 32 مليار $ تقريبًا'].concat(EQ.flat(), ['تقديرات بهامش ±20%. «حديث»: من الجيلين الأحدث المتاحين.', 'التسليح سنويًا', 'من الميزانية', '1.1 مليار $',
    'المعونة', '1.3 مليار $', 'إنتاج محلي', 'مصانع حربية', 'التجميع', 'دبابات قتال', 'قيد التسليم: 20 مقاتلة من الجيل الرابع', 'من المعونة · من 2013',
    'طلب منظومات دفاع جوي', '1.2 مليار $ · تسليم 2014', 'الدفاع الجوي +8', 'التجنيد: إلزامي', 'يُغيَّر من الدولة › السياسات']),
  wars: HEAD.concat(['الحروب والجبهات', 'لا حروب ولا جبهات الآن. تظهر الجبهة على الخريطة عند أول حرب.']),
  reach_wars: ['الحروب والجبهات', 'لا حروب ولا جبهات الآن. تظهر الجبهة على الخريطة عند أول حرب.', 'ما يقيّد القوات', 'سيناء', 'قيود معاهدة 1979', 'النووي', 'لا يوجد',
    'عدم الانتشار', 'طرف', 'الشريك', 'الولايات المتحدة', 'معاهدة السلام تحدد عدد القوات في كل منطقة من سيناء، وتغييرها يمر بالخارجية.', 'الحرب والتحالفات', 'تُعلن من قسم الخارجية'],
};

const screenChecks = `
const { issues, qa, q, T, nums, TOK, tab, DATA, order } = X;
const B = (t) => '.sheet .r-body[data-tab="' + t + '"] ';
// the armies: formations add up to the headline and the section, within the quota; each a 44 pt row that shows the army
// on the map (the unassigned formations open «make an army»); the guard as the province panel has it (count and %)
if (tab === 'forces') {
  const rows = qa(B('forces') + '.m-army'), counts = rows.map((r) => nums(T(r.querySelector('.r-at > span')))[0]), sum = counts.reduce((a, b) => a + b, 0);
  if (sum !== DATA.formations || nums(T(q(B('forces') + '.r-sec h3')))[0] !== sum) issues.push('the armies\\' formations (' + sum + ') are not the headline ' + DATA.formations);
  rows.forEach((r, i) => { const al = r.getAttribute('aria-label') || '', nm = T(r.querySelector('.r-at b'));
    if (!r.classList.contains('tap') || r.getAttribute('role') !== 'button' || !r.querySelector('.r-chev') || !/(يعرضه على الخريطة|يفتح إنشاء جيش منه)$/.test(al)) issues.push('army «' + nm + '» does not lead to the map (a 44 pt button with its chevron)');
    order(r, ['.r-at', '.p-rdy', '.r-chev'], 'army ' + (i + 1)); });
  const guard = rows.find((r) => T(r.querySelector('.r-at b')) === 'الحرس الجمهوري');
  if (!guard || nums(T(guard.querySelector('.p-rdy b')))[0] !== DATA.guard || nums(T(guard.querySelector('.r-at > span')))[0] !== DATA.guardCount) issues.push('the Republican Guard is not the province panel\\'s (' + DATA.guardCount + ' formation, ' + DATA.guard + '%)'); }
// the overview: formations within the quota (40 + population / 1.5 million, rounded down), the budget and conscription
// as their owners have them; mobilization fills the existing formations (§5.4), its growth cost amber with its down arrow
if (tab === 'overview') {
  const kv = qa('.sheet .r-kv'), f = nums(T(kv[2])), quota = Math.floor(40 + DATA.pop / 1.5);
  if (f[0] !== DATA.formations || f[1] !== quota) issues.push('the formations are not ' + DATA.formations + ' of the quota ' + quota);
  const st = Object.fromEntries(qa(B('overview') + '.r-sc').map((c) => [T(c.querySelector('dt')), T(c.querySelector('dd'))]));
  if (nums(st['الميزانية'])[0] !== DATA.defence) issues.push('the defence budget is not the economy panel\\'s ' + DATA.defence);
  if (st['التجنيد'] !== DATA.conscription) issues.push('conscription is not the state panel\\'s «' + DATA.conscription + '»');
  const mob = q(B('overview') + '.r-act'), chip = mob.querySelector('.r-chip'), cost = mob.querySelector('.p-cost'), al = mob.getAttribute('aria-label') || '';
  if (!/القوام/.test(T(chip)) || nums(T(chip))[0] !== 40 || /التشكيلات/.test(T(chip))) issues.push('mobilization must fill the existing formations (§5.4): its chip is the strength added');
  if (!cost || getComputedStyle(cost).color !== TOK.amber || !cost.querySelector('use[href="#t-down"]') || !/ينخفض النمو/.test(al)) issues.push('mobilization\\'s growth cost is not amber with its down arrow and said'); }
// the equipment: the categories add up to the stock, each bar at its modern share, each read whole with «دولار», never a
// control; the order being delivered is a row, not a button; conscription in its link as the state panel has it
if (tab === 'equipment') {
  const rows = qa(B('equipment') + '.m-eq'), vals = rows.map((r) => nums(T(r.querySelector('b')))[0]), tot = nums(T(q(B('equipment') + '.r-sec:first-child h3')))[0];
  if (vals.reduce((a, b) => a + b, 0) !== tot) issues.push('the equipment categories do not add up to the stock ' + tot);
  rows.forEach((r, i) => { const nm = T(r.querySelector('span')), sh = nums(T(r.querySelector('em')))[0], bar = r.querySelector('.i-bar'), al = r.getAttribute('aria-label') || '';
    if (Math.abs(parseFloat(getComputedStyle(bar, '::after').width) - bar.getBoundingClientRect().width * sh / 100) > 0.6) issues.push('equipment «' + nm + '»: the bar is not at its modern share');
    if (!al.startsWith(nm + ': ') || !nums(al).includes(sh) || !nums(al).includes(vals[i]) || !al.includes('دولار') || al.includes('$') || r.getAttribute('role') !== 'img') issues.push('a11y: equipment «' + nm + '» is not read whole');
    if (r.matches('button, a, [role=button], [tabindex], .tap') || r.querySelector('button, a, [role=button], [tabindex], .tap')) issues.push('equipment «' + nm + '» is a control'); });
  const del = q(B('equipment') + '.f-tr');
  if (!del || del.matches('.tap, button, [role=button]') || !/قيد التسليم/.test(T(del))) issues.push('the order being delivered must be a row, not a button');
  const lk = q(B('equipment') + '.r-link');
  if (!lk || !T(lk.querySelector('b')).includes(DATA.conscription) || !(lk.getAttribute('aria-label') || '').includes(DATA.conscription)) issues.push('the conscription link is not the state panel\\'s «' + DATA.conscription + '»'); }
// equipment stays generic (the owner's decision): no real weapon name or model code, in Latin or Arabic letters, in the
// text, VoiceOver or the page's markup
{ const txt = q('.sheet').innerText + ' ' + [...document.querySelectorAll('.sheet [aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ') + ' ' + q('.sheet').outerHTML.replace(/<[^>]+>/g, ' ');
  const latin = (q('.sheet').innerText + ' ' + [...document.querySelectorAll('.sheet [aria-label]')].map((e) => e.getAttribute('aria-label')).join(' ')).match(/\\S*[A-Za-z]\\S*/);
  if (latin) issues.push('a real weapon name or model code in the panel: ' + latin[0]);
  const ar = txt.match(/إف-|ميغ|ميراج|رافال|سوخوي|أبرامز|باتريوت|سكود|أباتشي|هوك|تي-\\d|[\\u0621-\\u064A]+-\\d+/);
  if (ar) issues.push('a real weapon name or model code in the panel: ' + ar[0]);
  if (/F-16|M1A1|Abrams|Block 52/.test(document.documentElement.outerHTML)) issues.push('a real weapon name in the page\\'s markup'); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الجيش', tabs: ['overview', 'forces', 'equipment', 'wars'], longTab: 'forces',
  inputs: ['_build/military.css', '../../screen4/R/_build/sheet.html', '../../screen5/A/_build/sheet.html', '../../screen6/A/_build/sheet.html', '../../screen8/A/_build/sheet.html'],
  TOK: { sec: 'rgb(189, 180, 106)', ctlH: { '.m-army': 44 }, sheetIcon: [['.m-empty svg', 16]], size: [['.m-army', null, 44], ['.m-eq', null, 22], ['.f-tr', null, 36]] },
  HEAD, BRIEF, screenChecks,
  DATA: Object.assign({}, A, { formations: 36 }),
  cases: (d, se) => { const F = '.r-body[data-tab="forces"] ', E = '.r-body[data-tab="equipment"] ', O = '.r-body[data-tab="overview"] ';
    return [
    ['armies off the headline', d, '&tab=forces', '', /the armies' formations \(37\) are not the headline 36/, new Function("document.querySelector('" + F + ".m-army .r-at > span .ltr').textContent = '8';")],
    ['army not to the map', d, '&tab=forces', '', /army «الجيش الثالث الميداني» does not lead to the map/, new Function("const r = document.querySelectorAll('" + F + ".m-army')[1]; r.classList.remove('tap'); r.removeAttribute('role');")],
    ['army read in part', d, '&tab=forces', '', /does not read all it shows/, new Function("document.querySelector('" + F + ".m-army').setAttribute('aria-label', 'الجيش الثاني الميداني: الصعيد، 7 تشكيلات، التنظيم 80%. يعرضه على الخريطة');")],
    ['guard off the province', d, '&tab=forces', '', /the Republican Guard is not the province panel's/, new Function("document.querySelectorAll('" + F + ".m-army')[6].querySelector('.r-at > span .ltr').textContent = '4';")],
    ['army reversed', d, '&tab=forces', '.m-army { flex-direction: row-reverse !important; }', /army 1: order must be/],
    ['quota off', d, '', '', /the formations are not 36 of the quota 93/, () => { document.querySelectorAll('.r-kv')[2].querySelector('span .ltr').textContent = '94'; }],
    ['budget off the economy', d, '', '', /the defence budget is not the economy panel's 4/, new Function("document.querySelectorAll('" + O + ".r-sc dd')[1].querySelector('.ltr').textContent = '4.5';")],
    ['conscription off the state', d, '', '', /conscription is not the state panel's «إلزامي»/, new Function("document.querySelector('" + O + ".r-sc dd').textContent = 'تطوعي';")],
    ['mobilization makes formations', d, '', '', /mobilization must fill the existing formations/, new Function("document.querySelector('" + O + ".r-act .r-chip').innerHTML = 'التشكيلات <span class=\"ltr\">+4</span>';")],
    ['mobilization cost unmarked', d, '', '', /mobilization's growth cost is not amber/, new Function("document.querySelector('" + O + ".p-cost use').setAttribute('href', '#t-up');")],
    ['stock off', d, '&tab=equipment', '', /the equipment categories do not add up to the stock 32/, new Function("document.querySelector('" + E + ".m-eq b .ltr').textContent = '16';")],
    ['equipment bar off', d, '&tab=equipment', '', /equipment «الجوية»: the bar is not at its modern share/, new Function("document.querySelectorAll('" + E + ".m-eq .i-bar')[1].style.setProperty('--v', '20%');")],
    ['equipment label off', d, '&tab=equipment', '', /a11y: equipment «البرية» is not read whole/, new Function("document.querySelector('" + E + ".m-eq').setAttribute('aria-label', 'البرية: 9 مليار دولار تقريبًا، الحديث 40%');")],
    ['equipment as a control', d, '&tab=equipment', '', /equipment «البرية» is a control/, new Function("document.querySelector('" + E + ".m-eq').setAttribute('tabindex', '0');")],
    ['delivery as a button', d, '&tab=equipment', '', /the order being delivered must be a row/, new Function("document.querySelector('" + E + ".f-tr').setAttribute('role', 'button');")],
    ['conscription link stale', d, '&tab=equipment', '', /the conscription link is not the state panel's/, new Function("document.querySelector('" + E + ".r-link').setAttribute('aria-label', 'التجنيد: تطوعي. يُغيَّر من الدولة › السياسات، يفتحها');")],
    ['a real weapon name (Latin)', d, '&tab=equipment', '', /a real weapon name or model code in the panel: F-16/, new Function("document.querySelector('" + E + ".r-act .r-at b').insertAdjacentHTML('beforeend', ' <span class=\"ltr\">F-16</span>');")],
    ['a real weapon name (Arabic)', d, '&tab=equipment', '', /a real weapon name or model code in the panel: أبرامز|a real weapon name or model code in the panel/, new Function("document.querySelectorAll('" + E + ".r-sc dd')[3].textContent = 'أبرامز';")],
    ];
  },
});
