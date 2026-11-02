// Screen 15 variant A (the decision sheet): render the iPhones and run the checks with the shared panel checker
// (design/shared/check/panelcheck.js: every generic rule of the approved panels, here for a sheet with one body, no tab
// row and no section). Writes <id>.png to the variant folder; the end view, <id>_hit.png and report.json to _build.
// This file adds the decision's own rules: the game shown paused; the text the brief's (≤90 words) and the title
// short; the four options in the brief's order, each with its cost line, its effects (arrow, sign or words; costs amber
// with their arrow; the main effect a white chip), exactly one default named on screen and in VoiceOver, each effect's
// own clause in VoiceOver with its direction and better or worse; the numbers against the approved panels (the bread
// line, the deficit, political capital, unrest, legitimacy); «لاحقًا» and the close button put it off, with the expiry.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

function approved() {
  const flat = (f) => fs.readFileSync(path.join(OUT, f), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const s5 = flat('../../screen5/A/_build/sheet.html'), s6 = flat('../../screen6/A/_build/sheet.html'), s8 = flat('../../screen8/A/_build/sheet.html');
  const bread = s6.match(/دعم الخبز والتموين [^$]*?([\d.]+) مليار \$/), pc = s5.match(/رأس المال السياسي (\d+)/), unrest = s8.match(/لماذا؟ الاضطرابات (\d+)/), deficit = s6.match(/العجز[^0-9]{0,20}([\d.]+) مليار/);
  if (!bread || !pc || !unrest || !deficit || !/الأمن الداخلي/.test(s6)) throw new Error('cannot read the approved panels\' lines');
  return { bread: +bread[1], capital: +pc[1], unrest: +unrest[1], deficit: +deficit[1] };
}
const A = approved();
const HEAD = ['احتجاجات في تونس', 'قرار · احتجاجات وثورات · الوقت متوقف'];
const TEXT = 'تتسع الاحتجاجات في تونس منذ 17 ديسمبر بعد أن أحرق شاب نفسه في سيدي بوزيد. يطالب المحتجون بفرص عمل وبخفض الأسعار، وتنقل القنوات العربية ما يجري كل يوم. يرى مستشاروك أن البطالة وارتفاع الأسعار في مصر قد يجعلان الشارع يتأثر بما يحدث.';
// the options in order: title, cost line (without its amber effect), the chip [arrow, word, number], the amber costs
const OPS = [
  ['توسيع دعم الخبز', '500 مليون $ سنويًا', ['down', 'الاضطرابات', -3], [['up', 'العجز', 0.5]]],
  ['تشديد الانتشار الأمني', 'لا كلفة إضافية', ['down', 'الاضطرابات', -2], [['down', 'الشرعية', -2]]],
  ['حوار مع النقابات والأحزاب', 'الكلفة: 10 من رأس المال السياسي', ['down', 'الاضطرابات', -1], []],
  ['المتابعة دون إجراء', 'الافتراضي · لا كلفة', null, [['up', 'خطر الاضطرابات', null]]],
];
const BRIEF = {
  event: HEAD.concat([TEXT, 'خياراتك', 'توسيع دعم الخبز العجز +0.5']),
  reach_event: [TEXT, 'خياراتك', 'توسيع دعم الخبز العجز +0.5'].concat(OPS.slice(1).map((o) => o[0]), ['لاحقًا', 'يبقى في الإشعارات · الافتراضي بعد 7 أيام']),
};

const screenChecks = `
const { issues, qa, q, T, nums, tab, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
// the game is paused for the decision
{ const pl = q('.play'); if (pl.querySelector('use').getAttribute('href') !== '#i-play' || !/متوقفة/.test(pl.getAttribute('aria-label') || '')) issues.push('the game is not shown paused (play glyph and words)');
  if (!/الوقت متوقف/.test(W(T(q('.r-sub'))))) issues.push('the sheet does not say the time is stopped'); }
// the title short, the text the brief's and ≤90 words
{ const t = W(T(q('.r-name'))), p = W(T(q('.d-text')));
  if (t.length > 60) issues.push('the title is longer than 60 characters');
  if (p.split(' ').length > 90) issues.push('the text is longer than 90 words');
  if (p !== DATA.text) issues.push('the text is not the brief\\'s'); }
// the options: the brief's order, cost lines, effects and colours, one default, VoiceOver clause by clause
const ops = [...document.querySelectorAll('.sheet .r-act')];
if (ops.length !== DATA.ops.length) issues.push('options shown: ' + ops.length + ' (want ' + DATA.ops.length + ')');
const dirOf = (e) => { const u = e && e.querySelector('use'); return u ? (u.getAttribute('href') === '#t-up' ? 'up' : u.getAttribute('href') === '#t-down' ? 'down' : '?') : 'none'; };
const bare = (e) => W([...e.childNodes].filter((n) => !(n.nodeType === 1 && n.classList.contains('p-cost'))).map((n) => n.textContent).join('')).replace(/ ·$/, '');
ops.forEach((o, i) => { const w = DATA.ops[i] || ['', '', null, []], b = o.querySelector('.r-at b'), sub = o.querySelector('.r-at > span'), al = o.getAttribute('aria-label') || '';
  const nm = bare(b), costs = [...o.querySelectorAll('.r-at .p-cost')], line = bare(sub);
  if (nm !== w[0] || line !== w[1]) issues.push('option ' + (i + 1) + ' is «' + nm + ' · ' + line + '» (want «' + w[0] + ' · ' + w[1] + '»)');
  const chip = o.querySelector('.r-chip');
  if (!!chip !== !!w[2]) issues.push('option ' + (i + 1) + (chip ? ' has an effect chip it should not' : ' has no effect chip'));
  if (chip && w[2] && (dirOf(chip) !== w[2][0] || !T(chip).includes(w[2][1]) || nums(T(chip))[0] !== w[2][2])) issues.push('option ' + (i + 1) + ': the chip is «' + dirOf(chip) + ' ' + W(T(chip)) + '» (want «' + w[2].join(' ') + '»)');
  if (costs.length !== w[3].length) issues.push('option ' + (i + 1) + ' shows ' + costs.length + ' costs (want ' + w[3].length + ')');
  costs.forEach((c, k) => { const e = w[3][k] || [], n = nums(T(c))[0], col = getComputedStyle(c).color, ac = c.querySelector('svg') ? getComputedStyle(c.querySelector('svg')).color : '';
    if (dirOf(c) !== e[0] || !T(c).includes(e[1]) || (e[2] === null ? n !== undefined : n !== e[2])) issues.push('option ' + (i + 1) + ': the cost is «' + dirOf(c) + ' ' + W(T(c)) + '» (want «' + e.join(' ') + '»)');
    if (col !== 'rgb(242, 177, 76)' || ac !== col) issues.push('option ' + (i + 1) + ': a cost not amber with its arrow'); });
  [chip].concat(costs).filter(Boolean).forEach((e) => { const n = nums(T(e))[0]; if (n !== undefined && n !== 0 && (n > 0) !== (dirOf(e) === 'up')) issues.push('option ' + (i + 1) + ': an arrow against its sign'); });
  // VoiceOver: each effect in its own clause, its direction and better or worse
  const clauses = al.split('. ').slice(1).join('. ').split('؛'), effects = (w[2] ? [[w[2][0], w[2][1], false]] : []).concat(w[3].map((e) => [e[0], e[1], true]));
  effects.forEach((e) => { const cl = clauses.find((c) => c.includes(e[1].replace('خطر ', ''))) || '';
    if (!(e[0] === 'up' ? /ترتفع|يرتفع/ : /تنخفض|ينخفض/).test(cl) || !(e[2] ? /أسوأ/ : /أفضل/).test(cl) || (e[2] ? /أفضل/ : /أسوأ/).test(cl)) issues.push('a11y: option ' + (i + 1) + ' does not say «' + e[1] + '»\\'s direction and whether it is better or worse'); }); });
const defs = ops.filter((o) => o.dataset.default === '1');
if (defs.length !== 1 || !/^الافتراضي/.test(W(T(defs[0].querySelector('.r-at > span')))) || !/الافتراضي/.test(defs[0].getAttribute('aria-label') || '') || ops.filter((o) => /الافتراضي/.test(T(o))).length !== 1) issues.push('the default is not exactly one option, named on screen and in VoiceOver');
// the numbers: the extra bread subsidy a part of the economy panel's line, the deficit's rise the same amount; political
// capital within the state panel's; unrest and legitimacy stay within 0..100
if (ops.length === 4) {
  const add = nums(W(T(ops[0].querySelector('.r-at > span'))))[0] / 1000, def = DATA.ops[0][3][0][2], cap = nums(W(T(ops[2].querySelector('.r-at > span'))))[0];
  if (Math.abs(add - def) > 1e-9) issues.push('the deficit\\'s rise (' + def + ' مليار) is not the subsidy\\'s ' + add + ' مليار');
  if (!(add > 0 && add < DATA.A.bread)) issues.push('the extra bread subsidy is not a part of the economy panel\\'s ' + DATA.A.bread + ' مليار line');
  if (!(cap > 0 && cap <= DATA.A.capital)) issues.push('the dialogue\\'s ' + cap + ' political capital is more than the state panel\\'s ' + DATA.A.capital);
  const legit = nums(T([...document.querySelectorAll('.top .stat')].find((s) => /الشرعية/.test(s.textContent)).querySelector('.num')))[0];
  DATA.ops.forEach((o, i) => [o[2]].concat(o[3]).filter(Boolean).forEach((e) => { const base = e[1] === 'الاضطرابات' ? DATA.A.unrest : e[1] === 'الشرعية' ? legit : null;
    if (base !== null && e[2] !== null && !(base + e[2] >= 0 && base + e[2] <= 100 && Math.abs(e[2]) <= 10)) issues.push('option ' + (i + 1) + ': «' + e[1] + '» ' + base + ' ' + e[2] + ' leaves 0..100 or moves more than 10'); })); }
// «لاحقًا» (a row) and the close button put the decision off, with the expiry
{ const later = [...document.querySelectorAll('.sheet .r-link')].find((l) => W(T(l.querySelector('.r-at b'))) === 'لاحقًا'), x = q('.r-x');
  if (!later || !/الإشعارات/.test(later.getAttribute('aria-label') || '') || !/7 أيام/.test(later.getAttribute('aria-label') || '') || !/الافتراضي/.test(T(later))) issues.push('no «لاحقًا» that keeps the decision in the notifications with its expiry');
  if (!/^لاحقًا: تأجيل القرار/.test(x.getAttribute('aria-label') || '') || !/7 أيام/.test(x.getAttribute('aria-label') || '')) issues.push('a11y: the close button does not say it puts the decision off'); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['event'], noTabs: true, fitTab: false, longTab: 'event',
  inputs: ['_build/decision.css', 'event_header.jpg', '../../screen5/A/_build/sheet.html', '../../screen6/A/_build/sheet.html', '../../screen8/A/_build/sheet.html'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [], size: [] },
  HEAD, BRIEF, screenChecks, DATA: { text: TEXT, ops: OPS, A },
  // the neutral grey identity is the text grey, so the «identity on data» plants cannot tell (as screen 13)
  skipGeneric: ['section colour on data', 'section colour on a rule', 'emblem drawn grey', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text'],
  cases: (d, se) => [
    ['brief text hidden (decision)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-name').style.opacity = '0'; }],
    ['18 pt misuse (decision)', d, '', '.d-text { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (decision)', d, '', '.d-text { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding/],
    ['gap (decision)', d, '', '.p-cost { gap: 6px !important; }', /gap 6 on/],
    ['faint text (decision)', d, '', '.d-text { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (decision)', d, '', '', /% shown before its number/, () => { document.querySelector('.d-text').textContent = 'نسبة 20%'; }],
    ['game running', d, '', '', /the game is not shown paused/, () => { document.querySelector('.play use').setAttribute('href', '#i-pause'); }],
    ['pause unsaid', d, '', '', /the sheet does not say the time is stopped/, () => { document.querySelector('.r-sub').lastChild.textContent = 'الآن'; }],
    ['text not the brief', d, '', '', /the text is not the brief's|longer than 90 words/, () => { const p = document.querySelector('.d-text'); p.textContent = p.textContent + ' ' + p.textContent; }],
    ['options reordered', d, '', '', /option 1 is «تشديد/, () => { const s = document.querySelector('.r-sec'), o = s.querySelectorAll('.r-act'); s.insertBefore(o[1], o[0]); }],
    ['chip arrow against its sign', d, '', '', /an arrow against its sign|the chip is «up/, () => { document.querySelector('.r-act .r-chip use').setAttribute('href', '#t-up'); }],
    ['a cost not amber', d, '', '.r-act .p-cost { color: var(--t1) !important; }', /a cost not amber with its arrow/],
    ['a cost arrow not amber', d, '', '.r-act .p-cost svg { color: var(--t1) !important; }', /a cost not amber with its arrow/],
    ['effects heard backwards', d, '', '', /a11y: option 1 does not say/, () => { document.querySelector('.r-act').setAttribute('aria-label', 'توسيع دعم الخبز والتموين: 500 مليون دولار سنويًا. ترتفع الاضطرابات 3 نقاط، أسوأ؛ ينخفض العجز 0.5 مليار دولار، أفضل'); }],
    ['better and worse swapped', d, '', '', /a11y: option 2 does not say/, () => { document.querySelectorAll('.r-act')[1].setAttribute('aria-label', 'تشديد الانتشار الأمني: لا كلفة إضافية. تنخفض الاضطرابات بمقدار 2، أسوأ؛ تنخفض الشرعية 2، أفضل'); }],
    ['two defaults', d, '', '', /the default is not exactly one option/, () => { document.querySelector('.r-act').dataset.default = '1'; }],
    ['deficit off the subsidy', d, '', '', /the deficit's rise .* is not the subsidy's 0\.6/, () => { document.querySelector('.r-act .r-at > span .ltr').textContent = '600'; }],
    ['capital beyond the panel', d, '', '', /the dialogue's 100 political capital is more than/, () => { document.querySelectorAll('.r-act')[2].querySelector('.r-at > span .ltr').textContent = '100'; }],
    ['no later', d, '', '', /no «لاحقًا»/, () => { document.querySelector('.r-link').remove(); }],
    ['close silent on putting off', d, '', '', /a11y: the close button does not say it puts the decision off/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
  ],
});
