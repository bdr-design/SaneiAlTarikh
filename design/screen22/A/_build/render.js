// Screen 22 variant A (the new-operation sheet, §5.6): render the iPhones and run the checks with the shared panel checker
// (design/shared/check/panelcheck.js), in the intelligence section. This file adds the sheet's own rules: the nine types
// the same as the intelligence panel's list and in its order, none an assassination (D-14), exactly one chosen, filled
// white; the target's network and exposure as the panel's row; the duration one choice; the cost, the duration and the
// risk as the panel's suggestion; the slots: the header's «2 من 4» the panel's, starting takes the next one; the estimate
// cells as the brief.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

const S11 = (() => { const raw = fs.readFileSync(path.join(OUT, '../../screen11/A/_build/sheet.html'), 'utf8'), s = raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const types = (s.match(/أنواع العمليات المتاحة (.*?)\. لا توجد عمليات اغتيال/) || [])[1], sd = raw.match(/aria-label="السودان: الشبكة (\d+) من 10، الانكشاف ([^"]+)"/),
    sug = raw.match(/aria-label="جمع معلومات في السودان: (\d+) مليون دولار، (\d+) أشهر، خطر الانكشاف ([^.]+)\./), slots = s.match(/العمليات (\d+) من (\d+) قيد التنفيذ/);
  if (!types || !sd || !sug || !slots) throw new Error('cannot read the intelligence panel');
  return { types: types.split('، '), net: +sd[1], exposure: sd[2], cost: +sug[1], months: +sug[2], risk: sug[3], used: +slots[1], cap: +slots[2] }; })();
const HEAD = ['عملية جديدة', 'الاستخبارات · 2 من 4 قيد التنفيذ'];
const CELLS = [['الكلفة', '60 مليون $'], ['الأثر', 'دقة أعلى'], ['النجاح', 'نحو 85%'], ['الانكشاف', 'منخفض']];
const BRIEF = {
  newop: HEAD.concat(['النوع', 'جمع معلومات']),
  reach_newop: S11.types.concat(['لا توجد عمليات اغتيال في اللعبة.', 'الهدف والمدة', 'السودان', 'الشبكة 7 من 10 · الانكشاف منخفض', '3 أشهر', '6 أشهر', 'سنة', 'التقدير', 'بدء العملية', 'الكلفة: 60 مليون $ · تشغل 3 من 4', 'إن كُشفت تنخفض العلاقة مع السودان. التقدير له هامش خطأ.'], CELLS.flat()),
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
// the nine types: the panel's, in its order; none an assassination; one chosen, white; grey icons, dark on the chosen
const tiles = [...document.querySelectorAll('.sheet .m-tile')], on = tiles.filter((t) => t.getAttribute('aria-checked') === 'true');
if (tiles.map((t) => W(T(t))).join('|') !== DATA.s11.types.join('|')) issues.push('the types are not the intelligence panel\\'s nine in order');
if (tiles.some((t) => /اغتيال|تصفية|قتل/.test(T(t)))) issues.push('an assassination among the types (D-14)');
if (on.length !== 1 || W(T(on[0])) !== 'جمع معلومات' || tiles.some((t) => t.classList.contains('on') !== (t === on[0]))) issues.push('not exactly one type chosen («جمع معلومات»), marked and drawn');
else if (getComputedStyle(on[0]).backgroundColor !== X.TOK.t1) issues.push('the chosen type is not filled white');
if (q('.sheet .m-grid').getAttribute('role') !== 'radiogroup' || tiles.some((t) => t.getAttribute('role') !== 'radio')) issues.push('a11y: the types are not a radio group');
tiles.forEach((t) => { const c = getComputedStyle(t.querySelector('svg')).color; if (c !== (t.classList.contains('on') ? 'rgb(11, 18, 24)' : X.TOK.t2)) issues.push('a type tile\\'s icon is not ' + (t.classList.contains('on') ? 'dark' : 'grey')); });
// the target as the panel's row
{ const l = W(T(q('.sheet .r-link .r-at > span'))); if (W(T(q('.sheet .r-link .r-at b'))) !== 'السودان' || nums(l)[0] !== DATA.s11.net || !l.endsWith('الانكشاف ' + DATA.s11.exposure)) issues.push('the target is not the panel\\'s Sudan (network ' + DATA.s11.net + ', exposure ' + DATA.s11.exposure + ')'); }
// the duration: one choice, the panel's
{ const sg = [...document.querySelectorAll('.sheet .s-seg .s-sg')], c = sg.filter((s) => s.getAttribute('aria-checked') === 'true');
  if (c.length !== 1 || !c[0].classList.contains('on') || nums(T(c[0]))[0] !== DATA.s11.months) issues.push('the duration is not one choice of ' + DATA.s11.months + ' months'); }
// the estimate cells as the brief; the cost and the risk as the panel's suggestion
{ const sc = [...document.querySelectorAll('.sheet .r-sc')].map((c) => [W(T(c.querySelector('dt'))), W(T(c.querySelector('dd')))]);
  if (sc.map((x) => x.join(':')).join('|') !== DATA.cells.map((x) => x.join(':')).join('|')) issues.push('the estimate is not the brief\\'s: ' + sc.map((x) => x.join(':')).join('، '));
  const cost = nums((sc.find((x) => x[0] === 'الكلفة') || ['', ''])[1])[0], risk = (sc.find((x) => x[0] === 'الانكشاف') || ['', ''])[1];
  if (cost !== DATA.s11.cost || risk !== DATA.s11.risk) issues.push('the cost or the risk is not the panel\\'s suggestion (' + DATA.s11.cost + ', ' + DATA.s11.risk + ')'); }
// the slots: the header the panel's; starting takes the next one, within the capacity
{ const h = nums(W(T(q('.r-sub')))), a = nums(W(T(q('.sheet .r-act .r-at > span'))));
  if (h[0] !== DATA.s11.used || h[1] !== DATA.s11.cap) issues.push('the header\\'s slots are not the panel\\'s ' + DATA.s11.used + ' of ' + DATA.s11.cap);
  if (a[1] !== DATA.s11.used + 1 || a[2] !== DATA.s11.cap || a[0] !== DATA.s11.cost) issues.push('starting does not take the next slot at the panel\\'s cost');
  if (!/ترفع /.test(q('.sheet .r-act').getAttribute('aria-label') || '')) issues.push('a11y: the start does not say its effect'); }
if (!/\\. يفتح /.test(q('.sheet .r-link').getAttribute('aria-label') || '')) issues.push('a11y: the target row does not say where it leads');
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الاستخبارات', tabs: ['newop'], noTabs: true, fitTab: false, longTab: 'newop',
  inputs: ['_build/newop.css', '../../screen11/A/_build/sheet.html'],
  TOK: { sec: 'rgb(200, 115, 214)', ctlH: { '.m-tile': 36 }, sheetIcon: [['.m-tile svg', 16]], size: [], radius: { '.m-tile': 10 } },
  HEAD, BRIEF, screenChecks, DATA: { s11: S11, cells: CELLS },
  skipGeneric: ['section colour on data', 'section colour on a rule', 'emblem drawn grey', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'chip arrow against its sign', 'tile icons cyan', 'tap in the side inset', 'text into a control'],
  cases: (d, se) => [
    ['brief text hidden (newop)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-name').style.opacity = '0'; }],
    ['18 pt misuse (newop)', d, '', '.r-sec h3 { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (newop)', d, '', '.r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding|a cell runs out/],
    ['gap (newop)', d, '', '.m-grid { gap: 6px !important; }', /gap 6 on/],
    ['faint text (newop)', d, '', '.r-sec h3 { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (newop)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-sec h3').textContent = 'نسبة 20%'; }],
    ['amber value without its icon (newop)', d, '', '', /colour alone/, () => { document.querySelector('.r-sc dd').classList.add('r-amber'); }],
    ['tap in the side inset (newop)', d, '&scroll=end', '.sheet { right: -30px !important; }', /tap in side inset/],
    ['text into a control (newop)', d, '&scroll=end', '.r-body .r-act .r-chip { transform: translateX(100px) !important; }', /text over a control|text overlap/],
    ['tile icons cyan (newop)', d, '', '.m-tile svg.i { color: rgb(127, 233, 255) !important; }', /a type tile's icon is not/],
    ['an assassination type', d, '', '', /an assassination among the types|the types are not/, () => { document.querySelectorAll('.m-tile span')[8].textContent = 'اغتيال'; }],
    ['a type lost', d, '', '', /the types are not the intelligence panel's nine/, () => { document.querySelectorAll('.m-tile')[8].remove(); }],
    ['two types chosen', d, '', '', /not exactly one type chosen/, () => { const t = document.querySelectorAll('.m-tile')[1]; t.classList.add('on'); t.setAttribute('aria-checked', 'true'); }],
    ['chosen not white', d, '', '.m-tile.on { background: var(--card) !important; }', /the chosen type is not filled white/],
    ['target network off', d, '', '', /the target is not the panel's Sudan/, () => { document.querySelector('.r-link .r-at > span .ltr').textContent = '9'; }],
    ['duration off', d, '', '', /the duration is not one choice of 3 months/, () => { const s = document.querySelectorAll('.s-sg'); s[0].classList.remove('on'); s[0].setAttribute('aria-checked', 'false'); s[1].classList.add('on'); s[1].setAttribute('aria-checked', 'true'); }],
    ['cost off', d, '', '', /the estimate is not the brief's|the cost or the risk/, () => { document.querySelector('.r-sc dd .ltr').textContent = '80'; }],
    ['slot off', d, '&scroll=end', '', /starting does not take the next slot/, () => { document.querySelectorAll('.r-act .r-at > span .ltr')[1].textContent = '4'; }],
    ['effect unsaid', d, '&scroll=end', '', /a11y: the start does not say its effect/, () => { const a = document.querySelector('.r-act'); a.setAttribute('aria-label', 'بدء العملية: الكلفة 60 مليون دولار، تشغل 3 من 4'); }],
  ],
});
