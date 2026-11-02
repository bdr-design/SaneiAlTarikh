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
const PROV = [['القاهرة', '64'], ['السويس', '63'], ['الإسكندرية', '61'], ['الغربية', '58'], ['الجيزة', '55'], ['بورسعيد', '52'], ['الإسماعيلية', '50'], ['شمال سيناء', '49']];
const MOVES = ['الإخوان المسلمون', 'الجمعية الوطنية للتغيير', 'حركة 6 أبريل', 'كلنا خالد سعيد', 'كفاية'];
const GROUPS = ['الجيش', 'رجال الأعمال', 'الأزهر', 'الكنيسة القبطية', 'القضاة', 'العمال'];
const BRIEF = {
  overview: HEAD.concat(['السكان', '79.7', 'مليون', '+180 ألف شهريًا', '45', '/ 100', '+1 شهريًا', 'اضطراب فوق 60', '3', 'محافظات', 'من 29', 'لماذا؟',
    'الأكثر اضطرابًا', 'القاهرة', '64', 'السويس', '63', 'الإسكندرية', '61', 'فتح حوار وطني', 'الكلفة: 20 · مرة في السنة', 'الاضطرابات −3']),
  unrest: HEAD.concat(['المحافظات، الأعلى أولًا', 'القاهرة', '64']),
  reach_unrest: ['المحافظات، الأعلى أولًا'].concat(PROV.flat(), ['21 محافظة أخرى بين 32 و48.', 'مناطق الطوارئ', 'لا توجد مناطق طوارئ. تُعلن لكل محافظة على حدة: اختر المحافظة بعد الضغط.',
    'منطقة طوارئ الشرعية −2', 'الكلفة: 15 لكل محافظة', 'الاضطرابات −6', 'حالة الطوارئ: محدودة منذ 2010', 'قانون وطني · يُغيَّر من الدولة › السياسات']),
  parties: HEAD.concat(['مجلس الشعب · 518 مقعدًا', 'الحزب الوطني', '420']),
  reach_parties: ['مجلس الشعب · 518 مقعدًا', 'الحزب الوطني', '420', 'مستقلون', '73', 'المعارضة: الوفد 6 · التجمع 5 · أخرى 4', '15', 'معيّنون بقرار الرئيس', '10',
    'التأييد في البلد', 'الحزب الوطني 58%', 'الإخوان 20%', 'أخرى 22%', 'مرشحو الإخوان يترشحون مستقلين لأن الجماعة محظورة.', 'الانتخابات', 'القادمة', 'رئاسية · سبتمبر 2011',
    'مجلس الشعب', '2015', 'مجلس الشورى', 'نصفه في 2013', 'النظام', 'فردي بجولتين', 'نصف المقاعد على الأقل للعمال والفلاحين، و64 مقعدًا للنساء.', 'قانون الأحزاب: بترخيص', 'يُغيَّر من الدولة › السياسات'],
  groups: HEAD.concat(['حركات المعارضة · القوة', 'الإخوان المسلمون', 'محظورة · شبكة واسعة', 'عالية']),
  reach_groups: ['حركات المعارضة · القوة'].concat(MOVES, ['محظورة · شبكة واسعة', 'عالية', 'غير مرخصة · حول البرادعي', 'متوسطة', 'شبابية · على الإنترنت والشارع', 'صفحة على الإنترنت',
    'غير مرخصة', 'منخفضة', 'تظهر حركة جديدة إذا تجاوز اضطراب محافظة 60 والحريات مقيدة.', 'جماعات المصالح · الرضا'], GROUPS, ['72', '68', '60', '55', '47', '41']),
};

// the panel's own checks, run in the page with the shared helpers (X)
const screenChecks = `
const { issues, qa, q, T, nums, TOK, tab, DATA, order } = X;
const B = (t) => '.sheet .r-body[data-tab="' + t + '"] ';
// unrest and satisfaction rows (read-only) and province rows (open the card): the bar at the value, the arrow by the
// trend in the label, amber only for a worsening (a rise in unrest, a fall in satisfaction)
qa('.sheet .i-row, .sheet .i-prov').forEach((r) => { const name = T(r.querySelector('span')), v = nums(T(r.querySelector('b')))[0], al = r.getAttribute('aria-label') || '';
  const bar = r.querySelector('.i-bar'), bw = bar.getBoundingClientRect().width, fw = parseFloat(getComputedStyle(bar, '::after').width);
  if (Math.abs(fw - bw * v / 100) > 0.6) issues.push('row «' + name + '»: the bar is not drawn at ' + v + ' / 100');
  if (!al.startsWith(name + ': ' + v + ' من 100، ')) issues.push('a11y: row «' + name + '» does not read its value');
  const dir = /ترتفع/.test(al) ? 'up' : /تنخفض/.test(al) ? 'down' : /دون تغير/.test(al) ? 'flat' : '', use = r.querySelector('b use');
  if (!use || use.getAttribute('href') !== '#t-' + dir) issues.push('row «' + name + '»: the arrow does not show the trend «' + dir + '»');
  const worse = r.closest('[data-tab="groups"]') ? dir === 'down' : dir === 'up', col = getComputedStyle(r.querySelector('b')).color;
  if ((col === TOK.amber) !== worse) issues.push('row «' + name + '»: amber must mark a worsening, and only that');
  if (r.classList.contains('i-prov') && (!r.classList.contains('tap') || r.getAttribute('role') !== 'button' || !/يفتح بطاقتها$/.test(al) || !r.querySelector('.r-chev'))) issues.push('province «' + name + '» does not open its card (a 44 pt button with its chevron)');
  if (r.classList.contains('i-row') && (r.getAttribute('role') !== 'img' || r.classList.contains('tap'))) issues.push('row «' + name + '» must be read-only, read whole'); });
// the provinces worst first, Cairo the province card's value; the average over 29 and the count above 60 agree with the list
{ const rows = qa(B('unrest') + '.i-prov'), vals = rows.map((r) => nums(T(r.querySelector('b')))[0]);
  if (tab === 'unrest') {
    for (let k = 1; k < vals.length; k++) if (vals[k] > vals[k - 1]) issues.push('the provinces are not worst first');
    if (T(rows[0] && rows[0].querySelector('span')) !== 'القاهرة' || vals[0] !== DATA.cairo) issues.push('Cairo is not the province card\\'s ' + DATA.cairo);
    const rest = nums(T(q(B('unrest') + '.r-sec .s-note'))), n = vals.length + rest[0], mid = (rest[1] + rest[2]) / 2;
    if (n !== 29) issues.push('the provinces listed and summed up are ' + n + ', not 29');
    if (Math.round((vals.reduce((a, b) => a + b, 0) + rest[0] * mid) / n) !== DATA.avg) issues.push('the average over 29 provinces is not the headline ' + DATA.avg);
    if (vals.filter((v) => v > 60).length !== DATA.above) issues.push('the provinces above 60 are not the headline ' + DATA.above);
    const em = T(q(B('unrest') + '.r-link .r-at b'));
    if (!em.includes(DATA.emergency)) issues.push('the emergency law shown is not the state panel\\'s «' + DATA.emergency + '»'); }
  if (tab === 'overview') { const top = qa(B('overview') + '.i-row').map((r) => T(r.querySelector('span')) + nums(T(r.querySelector('b')))[0]);
    const kv = qa('.sheet .r-kv b').map((b) => nums(T(b))[0]);
    if (kv[1] !== DATA.avg || kv[2] !== DATA.above) issues.push('the headline numbers are not ' + DATA.avg + ' and ' + DATA.above);
    if (top.join(',') !== DATA.top) issues.push('the overview\\'s worst three are not the unrest tab\\'s first three: ' + top.join(','));
    // the unrest headline is amber (a worsening, its flame and its rising arrow); the other two are not
    const k = qa('.sheet .r-kpi'), amb = (e) => e && getComputedStyle(e).color === TOK.amber;
    if (!amb(k[1].querySelector('.r-kv b')) || !amb(k[1].querySelector('.r-kl svg')) || !amb(k[1].querySelector('.r-kr')) || (k[1].querySelector('.r-kr use') || {}).getAttribute?.('href') !== '#t-up') issues.push('the unrest headline is not amber with its flame and rising arrow');
    [k[0], k[2]].forEach((x) => { if (amb(x.querySelector('.r-kv b')) || amb(x.querySelector('.r-kr'))) issues.push('amber on a headline that is not a worsening'); }); } }
// seats: the parts add up to the chamber and the NDP is the state panel's; the share bars at their keyed rows' parts
if (tab === 'parties') { const sec = qa(B('parties') + '.r-sec');
  const seats = [...sec[0].querySelectorAll('.p-grp > b')].map((b) => nums(T(b))[0]);
  if (seats.reduce((a, b) => a + b, 0) !== DATA.seats || seats[0] !== DATA.ndp) issues.push('the seats do not add up to ' + DATA.seats + ' with the NDP\\'s ' + DATA.ndp);
  const opp = nums(T(sec[0].querySelectorAll('.p-grp')[2].querySelector('span')));
  if (opp.reduce((a, b) => a + b, 0) !== seats[2]) issues.push('the opposition parties do not add up to their ' + seats[2]);
  const support = [...sec[1].querySelectorAll('.p-grp > span')].map((s) => nums(T(s))[0]);
  [[sec[0], seats], [sec[1], support]].forEach(([s, parts], i) => { const bar = s.querySelector('.p-split'), segs = [...bar.children], tot = segs.reduce((x, e) => x + e.getBoundingClientRect().width, 0), sum = parts.reduce((x, y) => x + y, 0);
    segs.forEach((e, k) => { if (Math.abs(e.getBoundingClientRect().width - tot * parts[k] / sum) > 0.6) issues.push('share bar ' + (i + 1) + ': part ' + (k + 1) + ' not drawn at its row\\'s ' + parts[k]); });
    if (JSON.stringify(nums(bar.getAttribute('aria-label'))) !== JSON.stringify(parts)) issues.push('share bar ' + (i + 1) + ': VoiceOver does not read its rows\\' numbers');
    for (let k = 1; k < segs.length; k++) if (!(segs[k].getBoundingClientRect().right <= segs[k - 1].getBoundingClientRect().left + 0.5)) issues.push('share bar ' + (i + 1) + ': parts not right to left');
    const keys = [...s.querySelectorAll('.p-key')];
    if (keys.length !== segs.length || keys.some((k, j) => getComputedStyle(k).backgroundColor !== getComputedStyle(segs[j]).backgroundColor)) issues.push('share bar ' + (i + 1) + ': the keys do not match its parts'); });
  qa(B('parties') + '.p-grp').forEach((g, i) => { if (g.querySelector(':scope > b')) order(g, ['span', 'b'], 'party row ' + (i + 1)); g.querySelectorAll(':scope > span').forEach((s) => { if (s.querySelector('.p-key')) { const k = s.querySelector('.p-key').getBoundingClientRect(), r = document.createRange(); r.selectNodeContents(s); r.setStartAfter(s.querySelector('.p-key')); if (!(k.left >= r.getBoundingClientRect().right - 0.5)) issues.push('party row ' + (i + 1) + ': the key must be right of its name'); } }); }); }
// movements read whole: the name, the status as shown, «القوة» and the strength word; a rise is amber with the up arrow
// and «في صعود», all three or none; the brief's order of movements and groups
if (tab === 'groups') { const mv = qa('.sheet .i-grp');
  mv.forEach((g, i) => { const al = g.getAttribute('aria-label') || '', nm = T(g.querySelector('.r-at b')), st = T(g.querySelector('.r-at > span')).replace(/ · /g, '، '), str = g.querySelector('.i-str');
    const strW = T(str), up = !!str.querySelector('use[href="#t-up"]'), amber = getComputedStyle(str).color === TOK.amber, rising = /، في صعود$/.test(al);
    if (al.replace(/، في صعود$/, '') !== nm + ': ' + st + '. القوة ' + strW || g.getAttribute('role') !== 'img') issues.push('a11y: movement «' + nm + '» is not read as shown');
    if (!(up === amber && amber === rising)) issues.push('movement «' + nm + '»: a rise is amber, its up arrow and «في صعود» together');
    order(g, ['.r-at', '.i-str'], 'movement ' + (i + 1)); });
  if (mv.map((g) => T(g.querySelector('.r-at b'))).join('|') !== DATA.moves) issues.push('the movements are not in the brief\\'s order');
  if (qa(B('groups') + '.i-row').map((r) => T(r.querySelector('span'))).join('|') !== DATA.groups) issues.push('the interest groups are not in the brief\\'s order'); }
qa('.sheet .i-row, .sheet .i-prov').forEach((r, i) => order(r, ['span', '.i-bar', 'b'], 'row ' + (i + 1)));
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الداخلية والسياسة', tabs: ['overview', 'unrest', 'parties', 'groups'], longTab: 'unrest',
  inputs: ['_build/internal.css', '../../screen4/R/_build/sheet.html', '../../screen5/A/_build/sheet.html'],
  TOK: { sec: 'rgb(160, 140, 255)', ctlH: { '.i-prov': 44 }, sheetIcon: [['.s-cost svg', 10]], size: [['.i-row', null, 22], ['.i-prov', null, 44], ['.i-grp', null, 36], ['.p-split', null, 6]] },
  HEAD, BRIEF, screenChecks,
  DATA: Object.assign({}, A, { avg: 45, above: 3, top: 'القاهرة64,السويس63,الإسكندرية61', moves: MOVES.join('|'), groups: GROUPS.join('|') }),
  cases: (d, se) => {
    const U = '.r-body[data-tab="unrest"] ', P = '.r-body[data-tab="parties"] ', G = '.r-body[data-tab="groups"] ';
    return [
      ['bar off its value', d, '&tab=unrest', '', /row «القاهرة»: the bar is not drawn at 64/, new Function("document.querySelector('" + U + ".i-bar').style.setProperty('--v', '40%');")],
      ['row silent', d, '&tab=unrest', '', /a11y: row «السويس» does not read its value/, new Function("document.querySelectorAll('" + U + ".i-prov')[1].setAttribute('aria-label', 'السويس');")],
      ['arrow against the trend', d, '&tab=unrest', '', /row «الغربية»: the arrow does not show the trend/, new Function("document.querySelectorAll('" + U + ".i-prov')[3].querySelector('use').setAttribute('href', '#t-down');")],
      ['amber on a calm row', d, '&tab=unrest', '', /row «الإسماعيلية»: amber must mark a worsening/, new Function("document.querySelectorAll('" + U + ".i-prov')[6].querySelector('b').classList.add('r-amber');")],
      ['province not a button', d, '&tab=unrest', '', /province «القاهرة» does not open its card/, new Function("const r = document.querySelector('" + U + ".i-prov'); r.removeAttribute('role'); r.classList.remove('tap');")],
      ['not worst first', d, '&tab=unrest', '', /the provinces are not worst first/, new Function("const r = document.querySelectorAll('" + U + ".i-prov'); r[0].before(r[2]);")],
      ['Cairo off the card', d, '&tab=unrest', '', /Cairo is not the province card's 64/, new Function("document.querySelector('" + U + ".i-prov b .ltr').textContent = '66';")],
      ['29 provinces', d, '&tab=unrest', '', /the provinces listed and summed up are 30, not 29/, new Function("document.querySelector('" + U + ".r-sec .s-note .ltr').textContent = '22';")],
      ['average off', d, '&tab=unrest', '', /the average over 29 provinces is not the headline 45/, new Function("document.querySelectorAll('" + U + ".r-sec .s-note .ltr')[2].textContent = '60';")],
      ['count above 60 off', d, '&tab=unrest', '', /the provinces above 60 are not the headline 3/, new Function("document.querySelectorAll('" + U + ".i-prov b .ltr')[3].textContent = '60.5';")],
      ['emergency off the state', d, '&tab=unrest', '', /the emergency law shown is not the state panel's/, new Function("document.querySelector('" + U + ".r-link .r-at b').firstChild.textContent = 'حالة الطوارئ: شاملة منذ ';")],
      ['headline off', d, '', '', /the headline numbers are not 45 and 3/, () => { document.querySelectorAll('.r-kv b')[1].textContent = '52'; }],
      ['overview top three off', d, '', '', /the overview's worst three are not/, () => { document.querySelectorAll('.r-body[data-tab="overview"] .i-row span')[2].textContent = 'الجيزة'; }],
      ['unrest headline not amber', d, '', '.r-kpi:nth-child(2) .r-kv b, .r-kpi:nth-child(2) .r-kr, .r-kpi:nth-child(2) .r-kl svg { color: var(--t1) !important; }', /the unrest headline is not amber/],
      ['amber on population', d, '', '.r-kpi:first-child .r-kr { color: var(--amber) !important; }', /amber on a headline that is not a worsening|colour alone/],
      ['seats off', d, '&tab=parties', '', /the seats do not add up to 518/, new Function("document.querySelectorAll('" + P + ".p-grp > b')[1].textContent = '70';")],
      ['opposition off', d, '&tab=parties', '', /the opposition parties do not add up/, new Function("document.querySelectorAll('" + P + ".p-grp')[2].querySelectorAll('.ltr')[0].textContent = '7';")],
      ['stale seat bar', d, '&tab=parties', '', /share bar 1: part 1 not drawn at its row's 420|VoiceOver does not read its rows/, new Function("document.querySelector('" + P + ".p-split').setAttribute('aria-label', 'مقاعد مجلس الشعب: الحزب الوطني 400، مستقلون 93، المعارضة 15، معيّنون 10'); document.querySelector('" + P + ".p-split i').style.setProperty('--w', '77.2%'); document.querySelectorAll('" + P + ".p-split i')[1].style.setProperty('--w', '17.95%');")],
      ['stale support bar', d, '&tab=parties', '', /share bar 2: part 1 not drawn at its row's 58/, new Function("const s = document.querySelectorAll('" + P + ".p-split')[1]; s.children[0].style.setProperty('--w', '50%'); s.children[1].style.setProperty('--w', '28%');")],
      ['seat keys off', d, '&tab=parties', '', /share bar 1: the keys do not match its parts/, new Function("document.querySelectorAll('" + P + ".p-key')[3].classList.remove('p-k4');")],
      ['party row reversed', d, '&tab=parties', '.p-grp { flex-direction: row-reverse !important; }', /party row 1: order must be/],
      ['movement silent', d, '&tab=groups', '', /a11y: movement «كفاية» is not read as shown/, new Function("document.querySelectorAll('" + G + ".i-grp')[4].removeAttribute('aria-label');")],
      ['movement status off', d, '&tab=groups', '', /a11y: movement «الجمعية الوطنية للتغيير» is not read as shown/, new Function("document.querySelectorAll('" + G + ".i-grp')[1].setAttribute('aria-label', 'الجمعية الوطنية للتغيير: محظورة. القوة متوسطة');")],
      ['movement rise unsaid', d, '&tab=groups', '', /movement «حركة 6 أبريل»: a rise is amber/, new Function("const g = document.querySelectorAll('" + G + ".i-grp')[2]; g.setAttribute('aria-label', 'حركة 6 أبريل: شبابية، على الإنترنت والشارع. القوة متوسطة');")],
      ['steady movement in amber', d, '&tab=groups', '', /movement «كفاية»: a rise is amber/, new Function("document.querySelectorAll('" + G + ".i-grp')[4].querySelector('.i-str').classList.add('r-amber');")],
      ['movement reversed', d, '&tab=groups', '.i-grp { flex-direction: row-reverse !important; }', /movement 1: order must be/],
      ['movements out of order', d, '&tab=groups', '', /the movements are not in the brief's order/, new Function("const r = document.querySelectorAll('" + G + ".i-grp'); r[0].before(r[4]);")],
      ['groups out of order', d, '&tab=groups', '', /the interest groups are not in the brief's order/, new Function("const r = document.querySelectorAll('" + G + ".i-row'); r[1].before(r[2]);")],
      ['action silent', d, '', '', /a11y: «فتح حوار وطني» does not read its numbers/, () => { document.querySelector('.r-body[data-tab="overview"] .r-act').removeAttribute('aria-label'); }],
    ];
  },
});
