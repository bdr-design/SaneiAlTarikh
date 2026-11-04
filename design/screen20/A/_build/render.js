// Screen 20 variant A (the markets panel, §5.1): render the iPhones and run the checks with the shared panel checker
// (design/shared/check/panelcheck.js), in the economy section. This file adds the panel's own rules: the three tabs; the
// goods: a world price that rises is amber when Egypt imports the good and blue when it exports it, its arrow agreeing
// with its sign, said in words with «أسوأ لنا» or «أفضل لنا»; the wheat headline amber with its icon; the industries
// sorted by capacity used, each bar drawn at its share, a weak margin below 70% amber with its arrow; the chokepoints'
// shares; the Suez fees and the trade lines the same as the economy panel's (read from its source).
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

const S6 = (() => { const s = fs.readFileSync(path.join(OUT, '../../screen6/A/_build/sheet.html'), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const suez = s.match(/قناة السويس رسوم العبور · ممر ملاحي تملكه مصر ([\d.]+)/), imp = s.match(/الواردات (قمح · [^ ]+[^0-9]*?) \d/);
  if (!suez || !imp) throw new Error('cannot read the economy panel'); return { suez: +suez[1], imports: imp[1].trim() }; })();
const GOODS = [['حبوب', 'نستورد 60% · الخبز مدعوم', 71], ['نفط خام', 'نصدّر 25% من الإنتاج', 22], ['مشتقات نفطية', 'نستورد 30% · الوقود مدعوم', 18],
  ['غاز طبيعي', 'نصدّر 30% من الإنتاج', 5], ['كيماويات وأسمدة', 'نصدّر 40% من الإنتاج', 15], ['آلات ومعدات', 'نستورد 70%', 3]];
const INDS = [['النفط والغاز', 92], ['الزراعة والصيد', 88], ['التكرير', 85], ['الكيماويات والأسمدة', 81], ['الأغذية المصنعة', 79], ['المنسوجات والملابس', 64]];
const CPS = [['قناة السويس', 45], ['باب المندب', 30], ['مضيق هرمز', 5]];
const HEAD = ['الأسواق', 'مصر · السلع والصناعات والممرات'];
const BRIEF = {
  goods: HEAD.concat(['القمح عالميًا', '330', 'تضخم الغذاء', '17.2%', 'النقص', '0']),
  reach_goods: ['أهم سلعنا · السعر العالمي سنويًا'].concat(GOODS.map((g) => g[0]), GOODS.map((g) => g[1]), ['كل السلع', '20 سلعة متداولة']),
  industry: HEAD.concat(['تشغيل الطاقة الإنتاجية']),
  reach_industry: INDS.map((i) => i[0]).concat(['يتبع التشغيل هامش الربح: الهامش الضعيف يخفضه.']),
  routes: HEAD.concat(['حصة تجارتنا عبر كل ممر']),
  reach_routes: CPS.map((c) => c[0]).concat(['الأسواق على الخريطة', 'الأسعار والنقص والممرات']),
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const vis = (s) => [...document.querySelectorAll(s)].filter((e) => e.getClientRects().length);
const tab = document.documentElement.dataset.tab;
if (tab === 'goods') {
  const rows = vis('.sheet .g-row');
  if (rows.map((r) => W(T(r.querySelector('.w-n b')))).join('|') !== DATA.goods.map((g) => g[0]).join('|')) issues.push('the goods are not the brief\\'s six in order');
  rows.forEach((r, i) => { const g = DATA.goods[i]; if (!g) return; const v = nums(T(r.querySelector('.w-v')))[0], line = W(T(r.querySelector('.w-n > span'))), imp = /^نستورد/.test(line), bad = imp === (v > 0);
    if (line !== g[1] || v !== g[2]) issues.push('«' + g[0] + '» shows «' + line + '» ' + v + ', the brief «' + g[1] + '» ' + g[2]);
    const u = r.querySelector('.w-v use'), col = getComputedStyle(r.querySelector('.w-v')).color;
    if (!u || u.getAttribute('href') !== (v > 0 ? '#t-up' : '#t-down')) issues.push('«' + g[0] + '»: the arrow does not agree with its sign');
    if (col !== (bad ? X.TOK.amber : X.TOK.blue)) issues.push('«' + g[0] + '»: ' + (bad ? 'a rise in an import not amber' : 'a rise in an export not blue'));
    if (!(r.getAttribute('aria-label') || '').endsWith(bad ? 'أسوأ لنا' : 'أفضل لنا')) issues.push('a11y: «' + g[0] + '» does not say whether it helps or hurts'); });
  // the wheat headline: a worsening, amber with its icon; grain the first good, its rise the same
  { const k = vis('.sheet .r-kpi')[0], v = nums(T(k.querySelector('.r-kr')))[0];
    if (getComputedStyle(k.querySelector('.r-kv b')).color !== X.TOK.amber || v !== DATA.goods[0][2]) issues.push('the wheat headline is not amber with the grain row\\'s rise (' + DATA.goods[0][2] + '%)'); }
  if (!/^قمح/.test(DATA.imports)) issues.push('the economy panel does not import wheat first');
}
if (tab === 'industry') {
  const rows = vis('.sheet .g-ind'), us = rows.map((r) => nums(T(r.querySelector('.g-u')))[0]);
  if (rows.map((r) => W(T(r.querySelector('.w-n b')))).join('|') !== DATA.inds.map((i) => i[0]).join('|') || us.join(',') !== DATA.inds.map((i) => i[1]).join(',')) issues.push('the industries are not the brief\\'s');
  if (us.some((u, i) => i && u > us[i - 1])) issues.push('the industries are not sorted by capacity used');
  rows.forEach((r, i) => { const bar = r.querySelector('.i-bar'), a = getComputedStyle(bar, '::after'), share = parseFloat(a.width) / bar.getBoundingClientRect().width * 100;
    if (Math.abs(share - us[i]) > 1) issues.push('«' + W(T(r.querySelector('.w-n b'))) + '»: the bar shows ' + share.toFixed(0) + '%, the row ' + us[i] + '%');
    const low = us[i] < 70, b = r.querySelector('.g-u');
    if (low !== (getComputedStyle(b).color === X.TOK.amber) || low !== !!b.querySelector('use[href="#t-down"]')) issues.push('«' + W(T(r.querySelector('.w-n b'))) + '»: a share under 70% must be amber with its arrow, and only then'); });
}
if (tab === 'routes') {
  const rows = vis('.sheet .g-row');
  if (rows.map((r) => W(T(r.querySelector('.w-n b'))) + ' ' + nums(T(r.querySelector('.g-cp b')))[0]).join('|') !== DATA.cps.map((c) => c[0] + ' ' + c[1]).join('|')) issues.push('the chokepoints are not the brief\\'s');
  const sz = rows[0] && nums(W(T(rows[0].querySelector('.w-n > span'))))[0]; if (sz !== DATA.suez) issues.push('the Suez fees ' + sz + ' are not the economy panel\\'s ' + DATA.suez);
}
qa('.sheet .r-link').forEach((r) => { if (!/\\. يفتح /.test(r.getAttribute('aria-label') || '') || !r.querySelector('.r-chev')) issues.push('a11y: a link row does not say where it leads'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الاقتصاد', tabs: ['goods', 'industry', 'routes'], fitTab: false, longTab: 'goods',
  inputs: ['_build/markets.css', '../../screen6/A/_build/sheet.html'],
  TOK: { sec: 'rgb(67, 192, 138)', ctlH: {}, sheetIcon: [], size: [['.g-row', null, 32], ['.g-ind', null, 32]] },
  HEAD, BRIEF, screenChecks, DATA: { goods: GOODS, inds: INDS, cps: CPS, suez: S6.suez, imports: S6.imports },
  cases: (d, se) => [
    ['import rise in blue', d, '', '', /«حبوب»: a rise in an import not amber/, () => { document.querySelector('.g-row .w-v').classList.replace('r-amber', 'r-blue'); }],
    ['export rise in amber', d, '', '', /«نفط خام»: a rise in an export not blue/, () => { document.querySelectorAll('.g-row .w-v')[1].classList.replace('r-blue', 'r-amber'); }],
    ['good arrow against its sign', d, '', '', /«غاز طبيعي»: the arrow does not agree/, () => { document.querySelectorAll('.g-row .w-v use')[3].setAttribute('href', '#t-down'); }],
    ['good silent on its effect', d, '', '', /a11y: «آلات ومعدات» does not say whether it helps or hurts/, () => { const r = document.querySelectorAll('.g-row')[5]; r.setAttribute('aria-label', r.getAttribute('aria-label').replace('، أسوأ لنا', '')); }],
    ['wheat off the grain row', d, '', '', /the wheat headline is not amber with the grain row's rise/, () => { document.querySelector('.r-kpi .r-kr .ltr').textContent = '+60%'; }],
    ['a good changed', d, '', '', /«حبوب» shows/, () => { document.querySelector('.g-row .w-n > span').textContent = 'نستورد 40% · الخبز مدعوم'; }],
    ['industries unsorted', d, '&tab=industry', '', /not sorted by capacity used|not the brief's/, () => { const s = document.querySelector('.r-body[data-tab="industry"] .r-sec'); s.appendChild(s.querySelector('.g-ind')); }],
    ['bar off its share', d, '&tab=industry', '', /the bar shows/, () => { document.querySelector('.g-ind .i-bar').style.setProperty('--v', '50%'); }],
    ['weak margin not amber', d, '&tab=industry', '', /a share under 70% must be amber/, () => { const b = [...document.querySelectorAll('.g-ind .g-u')].pop(); b.classList.remove('r-amber'); b.querySelector('svg').remove(); }],
    ['Suez fees off', d, '&tab=routes', '', /the Suez fees 5\.2 are not the economy panel's/, () => { document.querySelector('.r-body[data-tab="routes"] .g-row .w-n > span .ltr').textContent = '5.2'; }],
    ['a chokepoint lost', d, '&tab=routes', '', /the chokepoints are not the brief's/, () => { document.querySelectorAll('.r-body[data-tab="routes"] .g-row')[2].remove(); }],
    ['link silent', d, '&tab=routes', '', /a11y: a link row does not say where it leads/, () => { const r = document.querySelector('.r-body[data-tab="routes"] .r-link'); r.setAttribute('aria-label', 'الأسواق على الخريطة: الأسعار والنقص والممرات'); }],
  ],
});
