// Screen 15 variant A (the decision sheet): render the iPhones and run the checks with the shared panel checker
// (design/shared/check/panelcheck.js: every generic rule of the approved panels, here for a sheet with one body, no tab
// row and no section). Writes <id>.png to the variant folder; the end view, <id>_hit.png and report.json to _build.
// This file adds the decision's own rules: the game shown paused; the text the brief's (≤90 words) and the title
// short; the four options in the brief's order, each with its cost line, its effects (arrow, sign or words; costs amber
// with their arrow; the main effect a white chip), exactly one default named on screen and in VoiceOver, each effect's
// own clause in VoiceOver with its direction and better or worse; the numbers against the approved panels (the bread
// line, political capital, unrest, legitimacy); every cost line and chip shown clear; the owner's category image as the header strip; «لاحقًا» and the close button put it off and resume time, with the expiry.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

function approved() {
  const flat = (f) => fs.readFileSync(path.join(OUT, f), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const s5 = flat('../../screen5/A/_build/sheet.html'), s6 = flat('../../screen6/A/_build/sheet.html'), s8 = flat('../../screen8/A/_build/sheet.html');
  const bread = s6.match(/دعم الخبز والتموين [^$]*?([\d.]+) مليار \$/), pc = s5.match(/رأس المال السياسي (\d+)/), unrest = s8.match(/لماذا؟ الاضطرابات (\d+)/);
  if (!bread || !pc || !unrest) throw new Error('cannot read the approved panels\' lines');
  return { bread: +bread[1], capital: +pc[1], unrest: +unrest[1] };
}
const A = approved();
const HEAD = ['احتجاجات في تونس', 'الوقت متوقف · الافتراضي بعد 7 أيام'];
const TEXT = 'تتسع الاحتجاجات في تونس منذ 17 ديسمبر بعد أن أحرق شاب نفسه في سيدي بوزيد. يطالب المحتجون بفرص عمل وبخفض الأسعار، وتنقل القنوات العربية ما يجري كل يوم. يرى مستشاروك أن البطالة وارتفاع الأسعار في مصر قد يجعلان الشارع يتأثر بما يحدث.';
// the options in order: title, cost line (without its amber effect), the chip [arrow, word, number], the amber costs
const OPS = [
  ['دعم أكبر للخبز', '', ['down', 'الاضطرابات', -3], [['up', 'العجز', 500]]],
  ['تشديد الانتشار الأمني', 'لا كلفة', ['down', 'الاضطرابات', -2], [['down', 'الشرعية', -2]]],
  ['حوار مع النقابات والأحزاب', '10 من رأس المال السياسي', ['down', 'الاضطرابات', -1], []],
  ['المتابعة دون إجراء', 'الافتراضي · لا كلفة', null, [['up', 'الاضطرابات', 1]]],
];
const BRIEF = {
  event: HEAD.concat([TEXT, 'خياراتك', 'دعم أكبر للخبز']),
  // every option's whole cost line and chip must show clear in some view
  reach_event: [TEXT, 'خياراتك'].concat(OPS.map((o) => o[0]), ['العجز +500 مليون $ سنويًا', 'لا كلفة · الشرعية −2', '10 من رأس المال السياسي', 'الافتراضي · لا كلفة · الاضطرابات +1',
    'الاضطرابات −3', 'الاضطرابات −2', 'الاضطرابات −1', 'لاحقًا', 'يبقى في الإشعارات · يستأنف الوقت']),
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
  // the extra subsidy is the deficit's rise, in مليون $ a year, shown once
  const add = nums(W(T(ops[0].querySelector('.r-at > span .p-cost'))))[0], cap = nums(W(T(ops[2].querySelector('.r-at > span'))))[0];
  if (!/مليون \\$ سنويًا$/.test(W(T(ops[0].querySelector('.r-at > span .p-cost'))))) issues.push('the deficit\\'s rise is not shown with its unit and period (مليون $ سنويًا)');
  if (!(add > 0 && add / 1000 < DATA.A.bread)) issues.push('the extra bread subsidy is not a part of the economy panel\\'s ' + DATA.A.bread + ' مليار line');
  if (!(cap > 0 && cap <= DATA.A.capital)) issues.push('the dialogue\\'s ' + cap + ' political capital is more than the state panel\\'s ' + DATA.A.capital);
  const legit = nums(T([...document.querySelectorAll('.top .stat')].find((s) => /الشرعية/.test(s.textContent)).querySelector('.num')))[0];
  DATA.ops.forEach((o, i) => [o[2]].concat(o[3]).filter(Boolean).forEach((e) => { const base = e[1] === 'الاضطرابات' ? DATA.A.unrest : e[1] === 'الشرعية' ? legit : null;
    if (base !== null && e[2] !== null && !(base + e[2] >= 0 && base + e[2] <= 100 && Math.abs(e[2]) <= 10)) issues.push('option ' + (i + 1) + ': «' + e[1] + '» ' + base + ' ' + e[2] + ' leaves 0..100 or moves more than 10'); })); }
// «لاحقًا» (a row) and the close button put the decision off, with the expiry
{ const later = [...document.querySelectorAll('.sheet .r-link')].find((l) => W(T(l.querySelector('.r-at b'))) === 'لاحقًا'), x = q('.r-x');
  if (!later || !/الإشعارات/.test(later.getAttribute('aria-label') || '') || !/7 أيام/.test(later.getAttribute('aria-label') || '') || !/يستأنف الوقت/.test(later.getAttribute('aria-label') || '') || !/يستأنف الوقت/.test(T(later))) issues.push('no «لاحقًا» that keeps the decision in the notifications, resumes time and says the expiry');
  if (!/^لاحقًا: تأجيل القرار/.test(x.getAttribute('aria-label') || '') || !/7 أيام/.test(x.getAttribute('aria-label') || '') || !/يستأنف الوقت/.test(x.getAttribute('aria-label') || '')) issues.push('a11y: the close button does not say it puts the decision off and resumes time');
  // the expiry and its default are on screen from the first view, in the header's line
  if (!/الافتراضي بعد \\d+ (أيام|يومًا|يومين|يوم)/.test(W(T(q('.r-sub'))))) issues.push('the header does not show the expiry and its default');
  // the four options are equal: no accent marks one of them as the main choice
  if (ops.some((o) => o.classList.contains('r-first'))) issues.push('an option is marked as the main choice');
  // the owner's category image is the header strip
  if (!/event_header\.jpg/.test(getComputedStyle(q('.r-hd')).backgroundImage)) issues.push('the header strip is not the owner\\'s category image');
  { const bl = q('.bell'); if ((bl.getAttribute('aria-label') || '') !== 'الإشعارات، ' + nums(T(q('.badge')))[0] + ' غير مقروءة' || bl.getAttribute('aria-expanded') !== 'false') issues.push('a11y: the bell does not read its count'); } }
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
    ['pause unsaid', d, '', '', /the sheet does not say the time is stopped/, () => { document.querySelector('.r-sub').firstChild.textContent = 'الآن'; }],
    ['text not the brief', d, '', '', /the text is not the brief's|longer than 90 words/, () => { const p = document.querySelector('.d-text'); p.textContent = p.textContent + ' ' + p.textContent; }],
    ['options reordered', d, '', '', /option 1 is «تشديد/, () => { const s = document.querySelector('.r-sec'), o = s.querySelectorAll('.r-act'); s.insertBefore(o[1], o[0]); }],
    ['chip arrow against its sign', d, '', '', /an arrow against its sign|the chip is «up/, () => { document.querySelector('.r-act .r-chip use').setAttribute('href', '#t-up'); }],
    ['a cost not amber', d, '', '.r-act .p-cost { color: var(--t1) !important; }', /a cost not amber with its arrow/],
    ['a cost arrow not amber', d, '', '.r-act .p-cost svg { color: var(--t1) !important; }', /a cost not amber with its arrow/],
    ['effects heard backwards', d, '', '', /a11y: option 1 does not say/, () => { document.querySelector('.r-act').setAttribute('aria-label', 'دعم أكبر للخبز والتموين: 500 مليون دولار سنويًا. ينخفض العجز 500 مليون دولار سنويًا، أفضل؛ ترتفع الاضطرابات 3 نقاط، أسوأ'); }],
    ['better and worse swapped', d, '', '', /a11y: option 2 does not say/, () => { document.querySelectorAll('.r-act')[1].setAttribute('aria-label', 'تشديد الانتشار الأمني: لا كلفة إضافية. تنخفض الاضطرابات نقطتين، أسوأ؛ تنخفض الشرعية نقطتين، أفضل'); }],
    ['two defaults', d, '', '', /the default is not exactly one option/, () => { document.querySelector('.r-act').dataset.default = '1'; }],
    ['deficit without its unit', d, '', '', /the deficit's rise is not shown with its unit/, () => { const c = document.querySelector('.r-act .p-cost'); c.lastChild.textContent = ''; }],
    ['the subsidy beyond the bread line', d, '', '', /the extra bread subsidy is not a part of/, () => { document.querySelector('.r-act .p-cost .ltr').textContent = '+3500'; }],
    ['expiry off the header', d, '', '', /the header does not show the expiry/, () => { const s = document.querySelector('.r-sub'); s.innerHTML = 'الوقت متوقف'; }],
    ['an option marked main', d, '', '', /an option is marked as the main choice/, () => { document.querySelector('.r-act').classList.add('r-first'); }],
    ['header without its image', d, '', '.r-hd { background-image: none !important; }', /the header strip is not the owner's category image/],
    ['a cost line hidden', d, '', '.r-act:nth-of-type(3) .r-at > span { visibility: hidden !important; }', /brief text (not fully visible|missing: 10 من رأس المال السياسي)|never shown clear/],
    ['a chip hidden', d, '', '.r-act:nth-of-type(2) .r-chip { opacity: 0 !important; }', /brief text (not fully visible|cannot be scrolled clear of the fades): الاضطرابات −2|never shown clear|contrast/],
    ['bell silent', d, '', '', /a11y: the bell does not read its count/, () => { document.querySelector('.bell').setAttribute('aria-label', 'الإشعارات'); }],
    ['capital beyond the panel', d, '', '', /the dialogue's 100 political capital is more than/, () => { document.querySelectorAll('.r-act')[2].querySelector('.r-at > span .ltr').textContent = '100'; }],
    ['later silent on time', d, '', '', /no «لاحقًا» that keeps the decision/, () => { const l = document.querySelector('.r-link'); l.setAttribute('aria-label', l.getAttribute('aria-label').replace(' ويستأنف الوقت', '')); }],
    ['no later', d, '', '', /no «لاحقًا»/, () => { document.querySelector('.r-link').remove(); }],
    ['close silent on putting off', d, '', '', /a11y: the close button does not say it puts the decision off/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
  ],
});
