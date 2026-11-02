// Screen 8 variant A (the internal and politics panel «الداخلية والسياسة»): render the iPhones and run the checks, with the
// shared panel checker (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png
// (the overview) to the variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds
// the panel's own rules: the brief's strings per tab; the unrest rows (worst first, the bar at its value, the arrow and
// colour by the trend, the label with its numbers); the numbers agreeing (the average over 29 provinces, the count above
// 60, Cairo = the province card's 64, the seats adding to 518 with the state panel's NDP, the share bars at their parts);
// the laws shown as the state panel sets them (read from its sheet); movements and groups read whole by VoiceOver.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

// the approved panels' numbers this panel repeats, read from their sheets (not copied)
function approved() {
  const s5 = fs.readFileSync(path.join(OUT, '../../screen5/A/_build/sheet.html'), 'utf8');
  const law = (name) => { const m = s5.match(new RegExp('aria-label="' + name + '"><button[\\s\\S]*?s-sg tap on" role="radio" aria-checked="true">([^<]+)<'));
    if (!m) throw new Error('screen 5: cannot read the law ' + name); return m[1]; };
  const seats = s5.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').match(/الحزب الوطني: نحو (\d+) من (\d+) مقعدًا/);
  const r = fs.readFileSync(path.join(OUT, '../../screen4/R/_build/sheet.html'), 'utf8');
  const cairo = r.match(/الاضطرابات<\/span>\s*<span class="r-kv"><b class="ltr r-amber">(\d+)<\/b>/);
  if (!seats || !cairo) throw new Error('cannot read the NDP seats or Cairo\'s unrest');
  return { emergency: law('حالة الطوارئ'), protest: law('التظاهر'), parties: law('الأحزاب'), ndp: +seats[1], seats: +seats[2], cairo: +cairo[1] };
}
const A = approved();

const HEAD = ['الداخلية والسياسة', 'مصر · 29 محافظة', 'نظرة عامة', 'الاضطرابات', 'الأحزاب', 'الحركات'];
const BRIEF = {
  overview: HEAD.concat(['السكان', '79.7', 'مليون', '+180 ألف شهريًا', '45', '/ 100', '+2 شهريًا', 'فوق 60', '3', 'محافظات', 'من 29', 'لماذا؟',
    'الحزب الحاكم', 'الحزب الوطني', 'الطوارئ', 'شاملة', 'التظاهر', 'محظور', 'الأحزاب', 'بترخيص']),
  reach_overview: ['الأكثر اضطرابًا', 'القاهرة', '64', 'السويس', '63', 'الإسكندرية', '61', 'فتح حوار وطني', 'الكلفة: 20 · مرة في السنة', 'الاضطرابات −3'],
  unrest: HEAD.concat(['المحافظات، الأعلى أولًا', 'القاهرة', '64']),
  reach_unrest: ['المحافظات، الأعلى أولًا', 'القاهرة', '64', 'السويس', '63', 'الإسكندرية', '61', 'الغربية', '58', 'الجيزة', '55', 'بورسعيد', '52',
    'الإسماعيلية', '50', 'شمال سيناء', '49', '21 محافظة أخرى بين 32 و48. اضغط محافظة لفتح بطاقتها.', 'مناطق الطوارئ',
    'لا توجد مناطق طوارئ، وتُعلن لكل محافظة على حدة. حالة الطوارئ الوطنية شاملة منذ 1981، وتُغيَّر من الدولة › السياسات.', 'إعلان منطقة طوارئ',
    'الكلفة: 15 · الشرعية −2', 'الاضطرابات −6'],
  parties: HEAD.concat(['مجلس الشعب · 518 مقعدًا', 'الحزب الوطني', '420']),
  reach_parties: ['مجلس الشعب · 518 مقعدًا', 'الحزب الوطني', '420', 'مستقلون', '69', 'المعارضة: الوفد 6 · التجمع 5 · أخرى 8', '19', 'معيّنون بقرار الرئيس', '10',
    'التأييد في البلد', 'الحزب الوطني 58%', 'مستقلون 27%', 'أخرى 15%', 'القادمة', 'رئاسية · سبتمبر 2011', 'مجلس الشعب', '2015', 'مجلس الشورى', 'نصفه في 2013',
    'النظام', 'فردي بجولتين', 'نصف المقاعد على الأقل للعمال والفلاحين، و64 مقعدًا للنساء.', 'قانون الأحزاب: بترخيص', 'يُغيَّر من الدولة › السياسات'],
  groups: HEAD.concat(['حركات المعارضة', 'الإخوان المسلمون', 'محظورة · شبكة واسعة', 'عالية']),
  reach_groups: ['حركات المعارضة', 'الإخوان المسلمون', 'محظورة · شبكة واسعة', 'عالية', 'الجمعية الوطنية للتغيير', 'غير مرخصة · حول البرادعي', 'متوسطة',
    'حركة 6 أبريل', 'شبابية · على الإنترنت والشارع', 'كلنا خالد سعيد', 'صفحة على الإنترنت', 'كفاية', 'غير مرخصة', 'منخفضة',
    'تظهر حركة جديدة إذا تجاوز اضطراب محافظة 60 والحريات مقيدة.', 'جماعات المصالح · الرضا', 'الجيش', '72', 'رجال الأعمال', '68', 'الأزهر', '60',
    'الكنيسة القبطية', '55', 'القضاة', '47', 'العمال', '41'],
};

// the panel's own checks, run in the page with the shared helpers (X)
const screenChecks = `
const { issues, qa, q, T, nums, TOK, tab, bd, DATA, order, visible } = X;
// unrest and satisfaction rows: the bar at the value out of 100, the arrow by the trend in the label, amber for a worsening
qa('.sheet .i-row').forEach((r) => { const name = T(r.querySelector('span')), v = nums(T(r.querySelector('b')))[0], al = r.getAttribute('aria-label') || '';
  const bar = r.querySelector('.i-bar'), bw = bar.getBoundingClientRect().width, fw = parseFloat(getComputedStyle(bar, '::after').width);
  if (Math.abs(fw - bw * v / 100) > 0.6) issues.push('row «' + name + '»: the bar is not drawn at ' + v + ' / 100');
  if (!al.startsWith(name + ': ' + v + ' من 100، ')) issues.push('a11y: row «' + name + '» does not read its value');
  const dir = /تزيد/.test(al) ? 'up' : /تنخفض/.test(al) ? 'down' : /دون تغير/.test(al) ? 'flat' : '', use = r.querySelector('b use');
  if (!use || use.getAttribute('href') !== '#t-' + dir) issues.push('row «' + name + '»: the arrow does not show the trend «' + dir + '»');
  const worse = r.closest('[data-tab="groups"]') ? dir === 'down' : dir === 'up', col = getComputedStyle(r.querySelector('b')).color;
  if ((col === TOK.amber) !== worse) issues.push('row «' + name + '»: amber must mark a worsening, and only that'); });
// the provinces worst first, Cairo the province card's value; the average over 29 and the count above 60 agree with the list
{ const rows = qa('.sheet [data-tab="unrest"] .i-row'), vals = rows.map((r) => nums(T(r.querySelector('b')))[0]);
  if (tab === 'unrest') {
    for (let k = 1; k < vals.length; k++) if (vals[k] > vals[k - 1]) issues.push('the provinces are not worst first');
    if (T(rows[0] && rows[0].querySelector('span')) !== 'القاهرة' || vals[0] !== DATA.cairo) issues.push('Cairo is not the province card\\'s ' + DATA.cairo);
    const rest = nums(T(bd.querySelector('.r-sec .s-note'))), n = vals.length + rest[0], mid = (rest[1] + rest[2]) / 2;
    if (n !== 29) issues.push('the provinces listed and summed up are ' + n + ', not 29');
    if (Math.round((vals.reduce((a, b) => a + b, 0) + rest[0] * mid) / n) !== DATA.avg) issues.push('the average over 29 provinces is not the headline ' + DATA.avg);
    if (vals.filter((v) => v > 60).length !== DATA.above) issues.push('the provinces above 60 are not the headline ' + DATA.above); }
  if (tab === 'overview') { const top = qa('.sheet [data-tab="overview"] .i-row').map((r) => T(r.querySelector('span')) + nums(T(r.querySelector('b')))[0]);
    const kv = qa('.sheet .r-kv b').map((b) => nums(T(b))[0]);
    if (kv[1] !== DATA.avg || kv[2] !== DATA.above) issues.push('the headline numbers are not ' + DATA.avg + ' and ' + DATA.above);
    if (top.join(',') !== DATA.top) issues.push('the overview\\'s worst three are not the unrest tab\\'s first three: ' + top.join(',')); } }
// the laws shown are the state panel's settings (one owner per law)
if (tab === 'overview') { const st = Object.fromEntries(qa('.sheet [data-tab="overview"] .r-sc').map((c) => [T(c.querySelector('dt')), T(c.querySelector('dd'))]));
  if (st['الطوارئ'] !== DATA.emergency || st['التظاهر'] !== DATA.protest || st['الأحزاب'] !== DATA.parties) issues.push('the laws shown are not the state panel\\'s settings'); }
// seats: the parts add up to the chamber and the NDP is the state panel's; the share bars at their parts, keys matching
if (tab === 'parties') { const seats = qa('.sheet [data-tab="parties"] .r-sec:first-child .p-grp b').map((b) => nums(T(b))[0]);
  if (seats.reduce((a, b) => a + b, 0) !== DATA.seats || seats[0] !== DATA.ndp) issues.push('the seats do not add up to ' + DATA.seats + ' with the NDP\\'s ' + DATA.ndp);
  const opp = nums(T(qa('.sheet [data-tab="parties"] .p-grp')[2].querySelector('span')));
  if (opp.reduce((a, b) => a + b, 0) !== seats[2]) issues.push('the opposition parties do not add up to their ' + seats[2]);
  qa('.sheet [data-tab="parties"] .p-split').forEach((s, i) => { const parts = nums(s.getAttribute('aria-label')), segs = [...s.children], tot = segs.reduce((x, e) => x + e.getBoundingClientRect().width, 0), sum = parts.reduce((x, y) => x + y, 0);
    segs.forEach((e, k) => { if (Math.abs(e.getBoundingClientRect().width - tot * parts[k] / sum) > 0.6) issues.push('share bar ' + (i + 1) + ': part ' + (k + 1) + ' not drawn at ' + parts[k]); });
    for (let k = 1; k < segs.length; k++) if (!(segs[k].getBoundingClientRect().right <= segs[k - 1].getBoundingClientRect().left + 0.5)) issues.push('share bar ' + (i + 1) + ': parts not right to left');
    const keys = [...s.closest('section').querySelectorAll('.p-key')];
    if (keys.length !== segs.length || keys.some((k, j) => getComputedStyle(k).backgroundColor !== getComputedStyle(segs[j]).backgroundColor)) issues.push('share bar ' + (i + 1) + ': the keys do not match its parts'); }); }
// movements read whole, strength in words; rows order name | strength
qa('.sheet .i-grp').forEach((g, i) => { const al = g.getAttribute('aria-label') || '', nm = T(g.querySelector('.r-at b')), st = T(g.querySelector('.i-str'));
  if (!al.startsWith(nm + ': ') || !al.includes('القوة ' + st)) issues.push('a11y: movement «' + nm + '» does not read its status and strength');
  order(g, ['.r-at', '.i-str'], 'movement ' + (i + 1)); });
qa('.sheet .i-row').forEach((r, i) => order(r, ['span', '.i-bar', 'b'], 'row ' + (i + 1)));
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الداخلية والسياسة', tabs: ['overview', 'unrest', 'parties', 'groups'], longTab: 'unrest',
  inputs: ['_build/internal.css', '../../screen4/R/_build/sheet.html', '../../screen5/A/_build/sheet.html'],
  TOK: { sec: 'rgb(160, 140, 255)', ctlH: {}, sheetIcon: [['.s-cost svg', 10]], size: [['.i-row', null, 22], ['.i-grp', null, 36], ['.p-split', null, 6]] },
  HEAD, BRIEF, screenChecks,
  DATA: Object.assign({}, A, { avg: 45, above: 3, top: 'القاهرة64,السويس63,الإسكندرية61' }),
  cases: (d, se) => [
    ['bar off its value', d, '&tab=unrest', '', /row «القاهرة»: the bar is not drawn at 64/, () => { document.querySelector('[data-tab="unrest"] .i-bar').style.setProperty('--v', '40%'); }],
    ['row silent', d, '&tab=unrest', '', /a11y: row «السويس» does not read its value/, () => { document.querySelectorAll('[data-tab="unrest"] .i-row')[1].removeAttribute('aria-label'); }],
    ['arrow against the trend', d, '&tab=unrest', '', /row «الغربية»: the arrow does not show the trend/, () => { document.querySelectorAll('[data-tab="unrest"] .i-row')[3].querySelector('use').setAttribute('href', '#t-down'); }],
    ['amber on a calm row', d, '&tab=unrest', '', /row «الإسماعيلية»: amber must mark a worsening/, () => { document.querySelectorAll('[data-tab="unrest"] .i-row')[6].querySelector('b').classList.add('r-amber'); }],
    ['not worst first', d, '&tab=unrest', '', /the provinces are not worst first/, () => { const r = document.querySelectorAll('[data-tab="unrest"] .i-row'); r[0].before(r[2]); }],
    ['Cairo off the card', d, '&tab=unrest', '', /Cairo is not the province card's 64/, () => { const b = document.querySelector('[data-tab="unrest"] .i-row b .ltr'); b.textContent = '66'; }],
    ['29 provinces', d, '&tab=unrest', '', /the provinces listed and summed up are 30, not 29/, () => { document.querySelector('[data-tab="unrest"] .r-sec .s-note .ltr').textContent = '22'; }],
    ['average off', d, '&tab=unrest', '', /the average over 29 provinces is not the headline 45/, () => { document.querySelectorAll('[data-tab="unrest"] .r-sec .s-note .ltr')[2].textContent = '58'; }],
    ['count above 60 off', d, '&tab=unrest', '', /the provinces above 60 are not the headline 3/, () => { const b = document.querySelectorAll('[data-tab="unrest"] .i-row b .ltr')[3]; b.textContent = '60.5'; }],
    ['headline off', d, '', '', /the headline numbers are not 45 and 3/, () => { document.querySelectorAll('.r-kv b')[1].textContent = '52'; }],
    ['overview top three off', d, '', '', /the overview's worst three are not/, () => { document.querySelectorAll('[data-tab="overview"] .i-row span')[2].textContent = 'الجيزة'; }],
    ['law off the state panel', d, '', '', /the laws shown are not the state panel's settings/, () => { document.querySelectorAll('[data-tab="overview"] .r-sc dd')[2].textContent = 'بإخطار'; }],
    ['seats off', d, '&tab=parties', '', /the seats do not add up to 518/, () => { document.querySelectorAll('[data-tab="parties"] .p-grp b')[1].textContent = '70'; }],
    ['opposition off', d, '&tab=parties', '', /the opposition parties do not add up/, () => { document.querySelectorAll('[data-tab="parties"] .p-grp')[2].querySelectorAll('.ltr')[0].textContent = '7'; }],
    ['seat bar off', d, '&tab=parties', '', /share bar 1: part 1 not drawn at 420/, () => { document.querySelector('[data-tab="parties"] .p-split i').style.setProperty('--w', '60%'); }],
    ['seat keys off', d, '&tab=parties', '', /share bar 1: the keys do not match its parts/, () => { document.querySelectorAll('[data-tab="parties"] .p-key')[3].classList.remove('p-k4'); }],
    ['movement silent', d, '&tab=groups', '', /a11y: movement «كفاية» does not read/, () => { document.querySelectorAll('.i-grp')[4].removeAttribute('aria-label'); }],
    ['movement reversed', d, '&tab=groups', '.i-grp { flex-direction: row-reverse !important; }', /movement 1: order must be/],
    ['action silent', d, '', '', /a11y: «فتح حوار وطني» does not read its numbers/, () => { document.querySelector('[data-tab="overview"] .r-act').removeAttribute('aria-label'); }],
  ],
});
