// Screen 17 variant A (the «لماذا؟» sheet for stability): render the iPhones and run the checks with the shared panel
// checker (design/shared/check/panelcheck.js: every generic rule of the approved panels, for a sheet with one body and no
// section). This file adds the sheet's own rules: the game shown paused and the HUD chip shown as the one that opened it;
// the sections in order; each term's sign, arrow and colour by its section, the terms by size; the starting level plus
// the terms = the target, said the same in the header, the cells and the sum; the values the same as on the HUD and the
// other panels; at most 12 terms; every term read whole with its share in words.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
// the values the terms come from, read from the approved panels' sources (so a change there fails this gate)
function approved() {
  const flat = (f) => fs.readFileSync(path.join(OUT, f), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const s5 = flat('../../screen5/A/_build/sheet.html'), s6 = flat('../../screen6/A/_build/sheet.html'), s8 = flat('../../screen8/A/_build/sheet.html'), hud = flat('../../screen4/A/index.html');
  const m = (s, re, what) => { const x = s.match(re); if (!x) throw new Error('cannot read ' + what + ' from the approved panels'); return +x[1]; };
  return { now: m(hud, /الاستقرار ([\d.]+)%/, 'the HUD stability'), stChange: m(s5, /الاستقرار [\d.]+% −([\d.]+) شهريًا/, 'the state panel stability change'),
    'الشرعية': m(s5, /الشرعية ([\d.]+) \/ 100/, 'legitimacy'), 'الاضطرابات': m(s8, /الاضطرابات ([\d.]+) \/ 100/, 'unrest'),
    'البطالة': m(s6, /البطالة ([\d.]+)%/, 'unemployment'), 'التضخم': m(s6, /التضخم ([\d.]+)%/, 'inflation'), 'النمو الاقتصادي': m(s6, /الناتج المحلي [\d.]+ مليار \$ \+([\d.]+)% سنويًا/, 'growth') };
}
const A = approved();

const HEAD = ['الاستقرار', 'لماذا؟ · الآن 58% · يتجه إلى 56%'];
const SECTIONS = ['الأساس', 'ما يرفعه', 'ما يخفضه'];
// [name, the value it comes from, share, section]
const TERMS = [['مستوى البداية', 'مصر في 2011 · يتلاشى ببطء', 55, 'الأساس'],
  ['الأمن والشرطة', 'الإنفاق الأمني', 8, 'ما يرفعه'], ['دعم الخبز والوقود', 'من الموازنة', 5, 'ما يرفعه'], ['النمو الاقتصادي', '5.1% سنويًا', 3, 'ما يرفعه'],
  ['الشرعية', '44 / 100', -5, 'ما يخفضه'], ['الاضطرابات', '45 / 100', -4, 'ما يخفضه'], ['البطالة', '8.9%', -3, 'ما يخفضه'], ['التضخم', '10.3%', -2, 'ما يخفضه'], ['احتجاجات تونس', 'في الجوار', -1, 'ما يخفضه']];
// the status cells: the change a month (the state panel's −1) and the time to reach the target
const CELLS = { change: -1, months: 3 };
const BRIEF = {
  why: HEAD.concat(['الآن', '58%', 'الهدف', '56%', 'التغير', 'يصل خلال']),
  reach_why: SECTIONS.concat(TERMS.map((t) => t[0]), TERMS.map((t) => t[1]), ['يتجه إلى', '55 + 16 − 15', 'لوحة الدولة', 'الاستقرار والشرعية']),
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
{ const pl = q('.play'); if (pl.querySelector('use').getAttribute('href') !== '#i-play' || !/متوقفة/.test(pl.getAttribute('aria-label') || '')) issues.push('the game is not shown paused (play glyph and words)'); }
// the chip that opened the sheet: the HUD's stability, shown open, with the same value
{ const st = [...document.querySelectorAll('.top .stat')], on = st.filter((s) => s.getAttribute('aria-expanded') === 'true');
  if (on.length !== 1 || W(T(on[0].querySelector('.lbl'))) !== 'الاستقرار') issues.push('the HUD chip «الاستقرار» is not the one shown open');
  else if (nums(T(on[0].querySelector('.num')))[0] !== DATA.now || !(on[0].getAttribute('aria-label') || '').includes(DATA.now + '%')) issues.push('the HUD chip does not show and say ' + DATA.now + '%'); }
// the sections in order; each term under its own, with its line; signs, arrows and colours by section
const hs = [...document.querySelectorAll('.sheet .r-sec h3')].map((h) => W(T(h)));
if (hs.join('|') !== DATA.sections.join('|')) issues.push('the sections are «' + hs.join('، ') + '»');
const rows = [...document.querySelectorAll('.sheet .w-t')];
const valOf = (r) => nums(T(r.querySelector('.w-v')))[0];
const word = (n) => n === 1 ? 'نقطة واحدة' : n === 2 ? 'نقطتين' : n <= 10 ? n + ' نقاط' : n + ' نقطة';
DATA.terms.forEach(([nm, line, v, sec]) => { const r = rows.find((x) => W(T(x.querySelector('.w-n b'))) === nm);
  if (!r) { issues.push('term «' + nm + '» missing'); return; }
  const s = W(T(r.closest('.r-sec').querySelector('h3')));
  if (s !== sec) issues.push('«' + nm + '» is not under «' + sec + '»');
  if (W(T(r.querySelector('.w-n > span'))) !== line) issues.push('«' + nm + '»\\'s line is not «' + line + '»');
  if (valOf(r) !== v) issues.push('«' + nm + '»\\'s share is ' + valOf(r) + ', the brief ' + v); });
rows.forEach((r) => { const nm = W(T(r.querySelector('.w-n b'))), s = W(T(r.closest('.r-sec').querySelector('h3'))), v = valOf(r), b = r.querySelector('.w-v'), u = b.querySelector('use'), col = getComputedStyle(b).color, al = r.getAttribute('aria-label') || '';
  if (s === 'الأساس') { if (u || col !== X.TOK.t1 || !(v > 0) || /[+−-]/.test(T(b))) issues.push('the starting level «' + nm + '» is not a plain number'); return; }
  const up = s === 'ما يرفعه';
  if (!(up ? v > 0 : v < 0)) issues.push('«' + nm + '»\\'s share ' + v + ' has the wrong sign for «' + s + '»');
  if (!u || u.getAttribute('href') !== (v > 0 ? '#t-up' : '#t-down')) issues.push('«' + nm + '»: the arrow does not agree with its sign');
  if (col !== (v > 0 ? X.TOK.blue : X.TOK.amber)) issues.push('«' + nm + '»: a ' + (v > 0 ? 'rise not blue' : 'fall not amber'));
  if (!al.endsWith((v > 0 ? 'يرفع ' : 'يخفض ') + word(Math.abs(v)))) issues.push('a11y: «' + nm + '» does not say its share in words'); });
// by size within each section
DATA.sections.forEach((sec) => { const vs = rows.filter((r) => W(T(r.closest('.r-sec').querySelector('h3'))) === sec).map((r) => Math.abs(valOf(r)));
  if (vs.some((x, i) => i && x > vs[i - 1])) issues.push('«' + sec + '» is not sorted by size: ' + vs.join(', ')); });
// at most 12 terms in all, the starting level included (TermBuffer12, R9): beyond that the 12th is «أخرى»
if (rows.length > 12) issues.push(rows.length + ' terms shown (at most 12, the starting level included; fold the rest into «أخرى»)');
// the sum: start + terms = the target, the same in the header, the cells and the sum row; the change agrees
{ const total = rows.reduce((a, r) => a + valOf(r), 0), sum = nums(T(q('.sheet .w-sum b')))[0], hd = nums(W(T(q('.r-sub')))), cell = (k) => { const c = [...document.querySelectorAll('.sheet .r-sc')].find((e) => W(T(e.querySelector('dt'))) === k); return c && nums(T(c.querySelector('dd'))); };
  if (total !== sum || hd[1] !== sum || (cell('الهدف') || [])[0] !== sum) issues.push('the terms add up to ' + total + ', the sum row says ' + sum + ', the header ' + hd[1] + ', the cell ' + (cell('الهدف') || [])[0]);
  if (hd[0] !== DATA.now || (cell('الآن') || [])[0] !== DATA.now) issues.push('the value now is not ' + DATA.now + '% in the header and the cell');
  const ch = cell('التغير'), cu = document.querySelector('.sheet .r-sc dd use');
  if (!ch || !(Math.sign(ch[0]) === Math.sign(sum - DATA.now)) || !cu || cu.getAttribute('href') !== (sum > DATA.now ? '#t-up' : '#t-down')) issues.push('the monthly change does not head toward the target');
  if (!/^المجموع: يتجه إلى /.test(q('.sheet .w-sum').getAttribute('aria-label') || '')) issues.push('a11y: the sum row does not read as the sum');
  { const al = q('.sheet .w-sum').getAttribute('aria-label') || '', sec = (s) => rows.filter((r) => W(T(r.closest('.r-sec').querySelector('h3'))) === s).reduce((a, r) => a + valOf(r), 0);
    if (!al.includes('من ' + sec('الأساس') + ' نقطة') || !al.includes('ترفعه ' + sec('ما يرفعه') + ' نقطة') || !al.includes('تخفضه ' + -sec('ما يخفضه') + ' نقطة')) issues.push('a11y: the sum row does not say the start, the rises and the falls as shown'); }
  // the cells: the change a month and the months to the target, as the brief and the state panel
  if (!ch || ch[0] !== DATA.cells.change || ch[0] !== -DATA.stChange) issues.push('the change cell is not ' + DATA.cells.change + ' a month (the state panel says −' + DATA.stChange + ')');
  if ((cell('يصل خلال') || [])[0] !== DATA.cells.months) issues.push('the time to the target is not ' + DATA.cells.months + ' months');
  // the sum shown on screen: start + the rises − the falls
  const of = (s) => rows.filter((r) => W(T(r.closest('.r-sec').querySelector('h3'))) === s).reduce((a, r) => a + valOf(r), 0), calc = nums(W(T(q('.sheet .w-calc'))));
  if (calc.join(',') !== [of('الأساس'), of('ما يرفعه'), -of('ما يخفضه')].join(',') && calc.join(',') !== [of('الأساس'), of('ما يرفعه'), of('ما يخفضه')].join(',')) issues.push('the sum shown «' + W(T(q('.sheet .w-calc'))) + '» is not start + rises − falls'); }
// the values the terms come from agree with the approved panels (read from their sources)
Object.entries(DATA.elsewhere).forEach(([k, v]) => { if (k === 'now' || k === 'stChange') return; const r = rows.find((x) => W(T(x.querySelector('.w-n b'))) === k); if (r && nums(W(T(r.querySelector('.w-n > span'))))[0] !== v) issues.push('«' + k + '» says «' + W(T(r.querySelector('.w-n > span'))) + '», the approved panels ' + v); });
// the open HUD chip points the way the value moves, in its arrow and its words
{ const on = document.querySelector('.top .stat[aria-expanded="true"]'), tr = on && on.querySelector('.trend use'), sum = nums(T(q('.sheet .w-sum b')))[0], down = sum < DATA.now;
  if (!tr || tr.getAttribute('href') !== (down ? '#t-down' : '#t-up') || !(on.getAttribute('aria-label') || '').includes(down ? 'ينخفض' : 'يرتفع')) issues.push('the HUD chip does not point the way the value moves'); }
// the link says where it leads
qa('.sheet .r-link').forEach((r) => { if (!/\\. يفتح /.test(r.getAttribute('aria-label') || '') || !r.querySelector('.r-chev')) issues.push('a11y: a link row does not say where it leads'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['why'], noTabs: true, fitTab: false, longTab: 'why',
  inputs: ['_build/why.css'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [], size: [['.w-t', null, 32], ['.w-sum', null, 24]] },
  HEAD, BRIEF, screenChecks, DATA: { terms: TERMS, sections: SECTIONS, now: A.now, stChange: A.stChange, elsewhere: A, cells: CELLS },
  skipGeneric: ['section colour on data', 'section colour on a rule', 'emblem drawn grey', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white', 'tap in the side inset'],
  cases: (d, se) => [
    // the first view has no tap at the sheet's right edge (the close button is at its left): plant it at the end view, where the link row is
    ['tap in the side inset (why)', d, '&tab=why&scroll=end', '.sheet { right: -30px !important; }', /tap in side inset/],
    ['brief text hidden (why)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-name').style.opacity = '0'; }],
    ['18 pt misuse (why)', d, '', '.r-sec h3 { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (why)', d, '', '.r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding/],
    ['gap (why)', d, '', '.w-t { gap: 6px !important; }', /gap 6 on/],
    ['faint text (why)', d, '', '.w-n > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (why)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-sec h3').textContent = 'نسبة 20%'; }],
    ['game running', d, '', '', /the game is not shown paused/, () => { document.querySelector('.play use').setAttribute('href', '#i-pause'); }],
    ['chip not shown open', d, '', '', /the HUD chip «الاستقرار» is not the one shown open/, () => { document.querySelector('.stat[aria-expanded]').removeAttribute('aria-expanded'); }],
    ['chip value off', d, '', '', /the HUD chip does not show and say 58%/, () => { document.querySelector('.stat[aria-expanded] .num').textContent = '57%'; }],
    ['sections reordered', d, '', '', /the sections are/, () => { const h = document.querySelectorAll('.r-sec h3'); h[1].textContent = 'ما يخفضه'; h[2].textContent = 'ما يرفعه'; }],
    ['a term moved', d, '', '', /is not under «ما يخفضه»|has the wrong sign/, () => { const s = document.querySelectorAll('.r-sec'); s[1].appendChild(s[2].querySelector('.w-t')); }],
    ['a term lost', d, '', '', /term «التضخم» missing|the terms add up to/, () => { [...document.querySelectorAll('.w-t')].find((r) => r.textContent.includes('التضخم')).remove(); }],
    ['sum off', d, '', '', /the terms add up to 56, the sum row says 57/, () => { document.querySelector('.w-sum b').textContent = '57%'; }],
    ['header target off', d, '', '', /the header 55/, () => { document.querySelectorAll('.r-sub .ltr')[1].textContent = '55%'; }],
    ['now off', d, '', '', /the value now is not 58%/, () => { document.querySelector('.r-sc dd').textContent = '60%'; }],
    ['change the wrong way', d, '', '', /the monthly change does not head toward the target/, () => { document.querySelector('.r-sc dd use').setAttribute('href', '#t-up'); document.querySelector('.r-sc dd.r-amber .ltr').textContent = '+1'; }],
    ['arrow against the sign', d, '', '', /the arrow does not agree with its sign/, () => { document.querySelectorAll('.w-t .w-v use')[0].setAttribute('href', '#t-down'); }],
    ['a rise in amber', d, '', '', /a rise not blue/, () => { document.querySelectorAll('.w-t .w-v')[1].classList.replace('r-blue', 'r-amber'); }],
    ['a fall in blue', d, '', '', /a fall not amber/, () => { [...document.querySelectorAll('.w-v.r-amber')][0].classList.replace('r-amber', 'r-blue'); }],
    ['unsorted', d, '', '', /«ما يخفضه» is not sorted by size/, () => { const s = document.querySelectorAll('.r-sec')[2]; s.appendChild(s.querySelector('.w-t')); }],
    ['starting level with an arrow', d, '', '', /the starting level «مستوى البداية» is not a plain number/, () => { const b = document.querySelector('.w-t .w-v'); b.classList.add('r-blue'); b.insertAdjacentHTML('afterbegin', '<svg class="r-arr" aria-hidden="true"><use href="#t-up"/></svg>'); }],
    ['share unsaid', d, '', '', /a11y: «التضخم» does not say its share in words/, () => { const r = [...document.querySelectorAll('.w-t')].find((x) => x.textContent.includes('التضخم')); r.setAttribute('aria-label', r.getAttribute('aria-label').replace('نقطتين', '2 نقاط')); }],
    ['thirteen terms', d, '', '', /13 terms shown/, () => { const s = document.querySelectorAll('.r-sec')[2], t = s.querySelector('.w-t:last-of-type'); for (let i = 0; i < 4; i++) { const c = t.cloneNode(true); c.querySelector('.w-n b').textContent = 'سبب ' + i; c.querySelector('.w-v .ltr').textContent = '−0'; s.appendChild(c); } }],
    ['shares swapped, sum kept', d, '', '', /«الأمن والشرطة»'s share is 5, the brief 8/, () => { const v = [...document.querySelectorAll('.w-t .w-v .ltr')]; v[1].textContent = '+5'; v[2].textContent = '+8'; }],
    ['change cell off', d, '', '', /the change cell is not -1 a month/, () => { document.querySelector('.r-sc dd.r-amber .ltr').textContent = '−4'; }],
    ['time cell off', d, '', '', /the time to the target is not 3 months/, () => { const c = document.querySelectorAll('.r-sc dd')[3]; c.querySelector('.ltr').textContent = '9'; }],
    ['chip points up', d, '', '', /the HUD chip does not point the way the value moves/, () => { document.querySelector('.stat[aria-expanded] .trend use').setAttribute('href', '#t-up'); }],
    ['chip says it rises', d, '', '', /the HUD chip does not point the way the value moves/, () => { const s = document.querySelector('.stat[aria-expanded]'); s.setAttribute('aria-label', s.getAttribute('aria-label').replace('ينخفض', 'يرتفع')); }],
    ['sum totals unsaid', d, '', '', /a11y: the sum row does not say the start, the rises and the falls/, () => { const s = document.querySelector('.w-sum'); s.setAttribute('aria-label', s.getAttribute('aria-label').replace('ترفعه 16', 'ترفعه 20')); }],
    ['a source value off', d, '', '', /«البطالة» says «9\.1%»/, () => { const r = [...document.querySelectorAll('.w-t')].find((x) => x.textContent.includes('البطالة')); r.querySelector('.w-n > span .ltr').textContent = '9.1%'; }],
    ['link silent', d, '', '', /a11y: a link row does not say where it leads/, () => { const r = document.querySelector('.r-link'); r.setAttribute('aria-label', 'لوحة الدولة: الاستقرار والشرعية'); }],
    ['sum shown wrong', d, '', '', /the sum shown «55 \+ 17 − 15» is not/, () => { document.querySelector('.w-calc').textContent = '55 + 17 − 15'; }],
    ['sum unsaid', d, '', '', /a11y: the sum row does not read as the sum/, () => { document.querySelector('.w-sum').setAttribute('aria-label', 'يتجه إلى 56%'); }],
  ],
});
