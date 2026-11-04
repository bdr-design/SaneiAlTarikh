// Screen 21 variant A (the relation sheet, §5.5: Egypt and Ethiopia): render the iPhones and run the checks with the shared
// panel checker (design/shared/check/panelcheck.js), in the foreign section. This file adds the sheet's own rules: the
// other country's flag and name; the relation, its line and its trend the same as screen 10's row (read from its source),
// and our influence the same as screen 10's; the causes add up to the relation, said the same in the headline and the sum
// row; each cause's sign, arrow, colour and words; the causes by size within their sign; the actions' chips agree with
// their words.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

const S10 = (() => { const s = fs.readFileSync(path.join(OUT, '../../screen10/A/_build/sheet.html'), 'utf8');
  const row = s.match(/aria-label="إثيوبيا: سالب (\d+)، ([^،]+)، (تنخفض|ترتفع|دون تغير)\./), inf = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').match(/النفوذ (\d+) \/ 100/);
  if (!row || !inf) throw new Error('cannot read screen 10'); return { rel: -row[1], line: row[2], trend: row[3], influence: +inf[1] }; })();
const TERMS = [['اتفاقية عنتيبي لمياه النيل', 'وقّعتها إثيوبيا في 2010', -14], ['حصص مياه النيل', 'اتفاقية 1959 مع السودان', -10], ['تصريحات إعلامية', 'في الشهر الأخير', -3],
  ['التجارة', '400 مليون $ سنويًا', 3], ['الاتحاد الأفريقي', 'عضوان معًا', 2]];
const STATUS = [['الدولة', 'نعترف بها'], ['الحكومة', 'نعترف بها'], ['المعاهدات', 'لا توجد'], ['العقوبات', 'لا توجد']];
const ACTS = [['زيارة رسمية', 'الكلفة: 5 من النفوذ', 6], ['لجنة مشتركة لمياه النيل', 'الكلفة: 15 من النفوذ · مدتها سنة', 12], ['خفض التمثيل الدبلوماسي', 'ضغط · لا كلفة من النفوذ', -15]];
const HEAD = ['إثيوبيا', 'علاقتنا · خلاف مياه النيل'];
const BRIEF = {
  relation: HEAD.concat(['العلاقة', '−22', 'التجارة', '400', 'نفوذنا', '62', 'الدولة', 'نعترف بها', 'المعاهدات', 'لا توجد']),
  reach_relation: ['ما يحرك العلاقة'].concat(TERMS.map((t) => t[0]), TERMS.map((t) => t[1]), ['زيارة رسمية', 'لجنة مشتركة لمياه النيل', 'خفض التمثيل الدبلوماسي', 'تنخفض نقطة كل شهر ما دام خلاف مياه النيل قائمًا.']),
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
// the other country: its flag and name
{ const f = q('.r-hd .r-flag img'); if (!/flags\\/et\\.svg$/.test(f.getAttribute('src')) || f.getAttribute('alt') !== 'علم إثيوبيا' || W(T(q('.r-name'))) !== 'إثيوبيا') issues.push('the header is not Ethiopia\\'s flag and name'); }
// the relation, its line and trend as screen 10's row; our influence as screen 10's
{ const k = [...document.querySelectorAll('.sheet .r-kpi')], rel = nums(T(k[0].querySelector('.r-kv b')))[0], tr = k[0].querySelector('.r-kr'), u = tr.querySelector('use');
  if (rel !== DATA.s10.rel) issues.push('the relation ' + rel + ' is not screen 10\\'s ' + DATA.s10.rel);
  if (!W(T(q('.r-sub'))).endsWith(DATA.s10.line)) issues.push('the header line is not screen 10\\'s «' + DATA.s10.line + '»');
  if (nums(T(tr))[0] !== -1) issues.push('the monthly trend is not the brief\\'s −1');
  const down = DATA.s10.trend === 'تنخفض'; if (!u || u.getAttribute('href') !== (down ? '#t-down' : '#t-up') || getComputedStyle(tr).color !== (down ? X.TOK.amber : X.TOK.blue) || (down ? !(nums(T(tr))[0] < 0) : !(nums(T(tr))[0] > 0))) issues.push('the trend does not agree with screen 10 («' + DATA.s10.trend + '»)');
  if (nums(T(k[2].querySelector('.r-kv b')))[0] !== DATA.s10.influence) issues.push('our influence is not screen 10\\'s ' + DATA.s10.influence); }
// the status cells: recognition, treaties, sanctions as the brief
{ const sc = [...document.querySelectorAll('.sheet .r-sc')].map((c) => [W(T(c.querySelector('dt'))), W(T(c.querySelector('dd')))]);
  if (sc.map((x) => x.join(':')).join('|') !== DATA.status.map((x) => x.join(':')).join('|')) issues.push('the status cells are not the brief\\'s: ' + sc.map((x) => x.join(':')).join('، ')); }
// the actions: the brief's three, each cost within our influence, each chip its effect
{ const a = [...document.querySelectorAll('.sheet .r-act')], inf = nums(T([...document.querySelectorAll('.sheet .r-kpi .r-kv b')][2]))[0];
  if (a.length !== DATA.acts.length) issues.push('the actions are ' + a.length + ', the brief\\'s ' + DATA.acts.length);
  a.forEach((e, i) => { const o = DATA.acts[i]; if (!o) return; const nm = W(T(e.querySelector('.r-at b'))), line = W(T(e.querySelector('.r-at > span'))), chip = nums(T(e.querySelector('.r-chip')))[0], cost = (line.match(/الكلفة: (\\d+) من النفوذ/) || [])[1];
    if (nm !== o[0] || line !== o[1] || chip !== o[2]) issues.push('action ' + (i + 1) + ' is «' + nm + ' · ' + line + ' · ' + chip + '», the brief «' + o.join(' · ') + '»');
    if (cost !== undefined && +cost > inf) issues.push('«' + nm + '» costs ' + cost + ', more than our influence ' + inf); }); }
// the causes: the brief's, by size within their sign, signed, coloured, said; their sum = the relation = the sum row
{ const rows = [...document.querySelectorAll('.sheet .w-t')], val = (r) => nums(T(r.querySelector('.w-v')))[0];
  if (rows.map((r) => W(T(r.querySelector('.w-n b'))) + ' · ' + W(T(r.querySelector('.w-n > span'))) + ' ' + val(r)).join('|') !== DATA.terms.map((t) => t[0] + ' · ' + t[1] + ' ' + t[2]).join('|')) issues.push('the causes are not the brief\\'s');
  const word = (n) => n === 1 ? 'نقطة واحدة' : n === 2 ? 'نقطتين' : n <= 10 ? n + ' نقاط' : n + ' نقطة';
  rows.forEach((r) => { const v = val(r), b = r.querySelector('.w-v'), u = b.querySelector('use'), nm = W(T(r.querySelector('.w-n b')));
    if (!u || u.getAttribute('href') !== (v > 0 ? '#t-up' : '#t-down') || getComputedStyle(b).color !== (v > 0 ? X.TOK.blue : X.TOK.amber)) issues.push('«' + nm + '»: sign, arrow and colour disagree');
    if (!(r.getAttribute('aria-label') || '').endsWith((v > 0 ? 'يرفع ' : 'يخفض ') + word(Math.abs(v)))) issues.push('a11y: «' + nm + '» does not say its share in words'); });
  const neg = rows.map(val).filter((v) => v < 0), pos = rows.map(val).filter((v) => v > 0);
  if (neg.some((v, i) => i && Math.abs(v) > Math.abs(neg[i - 1])) || pos.some((v, i) => i && v > pos[i - 1])) issues.push('the causes are not sorted by size within their sign');
  const sum = rows.reduce((a, r) => a + val(r), 0), sr = nums(T(q('.sheet .w-sum b')))[0], kv = nums(T(q('.sheet .r-kpi .r-kv b')))[0];
  if (sum !== sr || sr !== kv) issues.push('the causes add up to ' + sum + ', the sum row says ' + sr + ', the headline ' + kv);
  // the sum after the causes' section and its rule, the same colour as the headline
  { const sec = q('.sheet .r-sec'), s = q('.sheet .w-sum'); if (s.closest('.r-sec') || !(s.getBoundingClientRect().top >= sec.getBoundingClientRect().bottom - 0.5)) issues.push('the sum is not after the causes and their rule');
    if (getComputedStyle(s.querySelector('b')).color !== getComputedStyle(q('.sheet .r-kpi .r-kv b')).color) issues.push('the sum and the headline draw the relation differently'); }
  // each headline read whole as one element
  [...document.querySelectorAll('.sheet .r-kpi')].forEach((k) => { if (k.getAttribute('role') !== 'img' || !k.getAttribute('aria-label')) issues.push('a11y: a headline is not read as one'); });
  if ((q('.sheet .w-sum').getAttribute('aria-label') || '') !== 'المجموع: العلاقة ' + (sr < 0 ? 'سالب ' : '') + Math.abs(sr)) issues.push('a11y: the sum row does not read the relation'); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الخارجية', tabs: ['relation'], noTabs: true, fitTab: false, longTab: 'relation',
  inputs: ['_build/relation.css', '../../screen10/A/_build/sheet.html', '../../shared/flags/et.svg'],
  TOK: { sec: 'rgb(91, 134, 242)', ctlH: {}, sheetIcon: [], size: [['.w-t', null, 32], ['.w-sum', null, 24]] },
  HEAD, BRIEF, screenChecks, DATA: { terms: TERMS, s10: S10, status: STATUS, acts: ACTS },
  skipGeneric: ['section colour on data', 'section colour on a rule', 'emblem drawn grey', 'why without its subject', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text'],
  cases: (d, se) => [
    ['brief text hidden (relation)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-name').style.opacity = '0'; }],
    ['18 pt misuse (relation)', d, '', '.r-sec h3 { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (relation)', d, '', '.r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding|a cell runs out/],
    ['gap (relation)', d, '', '.w-t { gap: 6px !important; }', /gap 6 on/],
    ['faint text (relation)', d, '', '.w-n > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (relation)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-sec h3').textContent = 'نسبة 20%'; }],
    ['our flag', d, '', '', /the header is not Ethiopia's flag and name/, () => { document.querySelector('.r-hd .r-flag img').setAttribute('src', '../../shared/flags/eg.svg'); }],
    ['relation off screen 10', d, '', '', /the relation -20 is not screen 10's -22/, () => { document.querySelector('.r-kv b').textContent = '−20'; }],
    ['trend up', d, '', '', /the trend does not agree with screen 10/, () => { document.querySelector('.r-kpi .r-kr use').setAttribute('href', '#t-up'); }],
    ['influence off', d, '', '', /our influence is not screen 10's 62/, () => { document.querySelectorAll('.r-kpi .r-kv b')[2].textContent = '60'; }],
    ['a cause changed', d, '', '', /the causes are not the brief's|the causes add up/, () => { document.querySelector('.w-t .w-v .ltr').textContent = '−12'; }],
    ['causes unsorted', d, '', '', /not sorted by size within their sign/, () => { const s = document.querySelector('.r-sec'), r = s.querySelectorAll('.w-t'); s.insertBefore(r[1], r[0]); }],
    ['a rise in amber', d, '', '', /«التجارة»: sign, arrow and colour disagree/, () => { [...document.querySelectorAll('.w-t')].find((r) => r.textContent.includes('التجارة')).querySelector('.w-v').classList.replace('r-blue', 'r-amber'); }],
    ['share unsaid', d, '', '', /a11y: «الاتحاد الأفريقي» does not say its share in words/, () => { const r = [...document.querySelectorAll('.w-t')].pop(); r.setAttribute('aria-label', r.getAttribute('aria-label').replace('نقطتين', '2')); }],
    ['sum off', d, '', '', /the sum row says -20/, () => { document.querySelector('.w-sum b').textContent = '−20'; }],
    ['sanctions on', d, '', '', /the status cells are not the brief's/, () => { document.querySelectorAll('.r-sc dd')[3].textContent = 'سارية'; }],
    ['a visit too dear', d, '', '', /action 1 is|costs 70, more than our influence/, () => { document.querySelector('.r-act .r-at > span .ltr').textContent = '70'; }],
    ['cause lines swapped', d, '', '', /the causes are not the brief's/, () => { const s = document.querySelectorAll('.w-t .w-n > span'), a = s[0].innerHTML; s[0].innerHTML = s[1].innerHTML; s[1].innerHTML = a; }],
    ['trend off', d, '', '', /the monthly trend is not the brief's −1/, () => { document.querySelector('.r-kpi .r-kr .ltr').textContent = '−3'; }],
    ['sum inside the section', d, '', '', /the sum is not after the causes/, () => { document.querySelector('.r-sec').appendChild(document.querySelector('.w-sum')); }],
    ['sum drawn white', d, '', '', /the sum and the headline draw the relation differently/, () => { document.querySelector('.w-sum b').classList.remove('r-amber'); }],
    ['headline read in pieces', d, '', '', /a11y: a headline is not read as one/, () => { document.querySelector('.r-kpi').removeAttribute('role'); }],
    ['sum unsaid', d, '', '', /a11y: the sum row does not read the relation/, () => { document.querySelector('.w-sum').setAttribute('aria-label', 'المجموع'); }],
  ],
});
