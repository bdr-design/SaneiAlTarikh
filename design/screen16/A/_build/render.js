// Screen 16 variant A (the notification centre): render the iPhones and run the checks with the shared panel checker
// (design/shared/check/panelcheck.js: every generic rule of the approved panels, for a sheet with one body and no
// section). This file adds the centre's own rules: the game shown paused; the sections of §6.7 in words and in order,
// each row under its own section; the badge, the header's count and the bell's VoiceOver label = the unread rows (the
// brief's 2: the decision was read and waits), the bell shown open; unread rows with their dot and «غير مقروء», no other row; the pending order a group,
// not a notification, with its own «إلغاء»; every row with its icon, and its chevron where it opens something.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['الإشعارات', 'غير المقروءة: 2 · 1 يناير 2011'];
const ROWS = [['احتجاجات في تونس', 'قرار · الافتراضي بعد 7 أيام', 'قرارات تنتظرك', false], ['المنطقة الغربية إلى سيوة', 'يُنفَّذ عند استئناف الوقت', 'أوامر معلقة', false],
  ['السودان: استفتاء الجنوب بعد 8 أيام', '9 يناير 2011 · الجوار', 'مهم', true], ['القمح عالميًا في أعلى مستوى منذ 2008', 'السلع · ديسمبر 2010', 'للعلم', true]];
const SECTIONS = ['قرارات تنتظرك', 'أوامر معلقة', 'مهم', 'للعلم'];
const BRIEF = {
  center: HEAD.concat(SECTIONS.slice(0, 1), [ROWS[0][0]]),
  reach_center: SECTIONS.concat(ROWS.map((r) => r[0]), ROWS.map((r) => r[1]), ['إلغاء']),
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
{ const pl = q('.play'); if (pl.querySelector('use').getAttribute('href') !== '#i-play' || !/متوقفة/.test(pl.getAttribute('aria-label') || '')) issues.push('the game is not shown paused (play glyph and words)'); }
// screen 26's paused HUD with the one pending order of this sheet: the play button and its badge count it, the toast slot holds it
{ const n = document.querySelectorAll('.sheet .n-ord').length, pl = q('.play'), bd = q('.play .o-badge'), to = q('.toast .o-toast');
  if (n !== 1 || pl.getAttribute('aria-label') !== 'تشغيل (اللعبة متوقفة)، يُنفَّذ أمر معلّق واحد' || !bd || W(T(bd)) !== '1' || !to || W(T(to.querySelector('.txt'))) !== 'أمر واحد ينتظر الاستئناف' || !to.querySelector('use[href="#i-queue"]'))
    issues.push('the paused HUD does not count the one pending order (screen 26: the play button, its badge, the toast slot)'); }
// the sections in order; each row under its own
const hs = [...document.querySelectorAll('.sheet .r-sec h3')].map((h) => W(T(h)));
if (hs.join('|') !== DATA.sections.join('|')) issues.push('the sections are «' + hs.join('، ') + '»');
const rows = [...document.querySelectorAll('.sheet .r-sec .r-link, .sheet .r-sec .n-ord')];
const secOf = (e) => W(T(e.closest('.r-sec').querySelector('h3')));
DATA.rows.forEach(([nm, line, sec, unread], i) => { const r = rows.find((x) => W(T(x.querySelector('.r-at b'))) === nm);
  if (!r) { issues.push('row «' + nm + '» missing'); return; }
  if (secOf(r) !== sec) issues.push('«' + nm + '» is not under «' + sec + '»');
  if (W(T(r.querySelector('.r-at > span'))) !== line) issues.push('«' + nm + '»\\'s line is not «' + line + '»');
  if ((r.dataset.unread === '1') !== unread) issues.push('«' + nm + '» is ' + (unread ? 'not ' : '') + 'marked unread');
  if (!r.querySelector('.r-tile svg')) issues.push('«' + nm + '» has no icon'); });
// unread: dot and words exactly on the unread rows, never on the pending order; the counts all agree with the brief's 3
const unread = rows.filter((r) => r.dataset.unread === '1'), badge = nums(T(q('.badge')))[0], head = nums(W(T(q('.r-sub'))))[0];
if (badge !== unread.length || head !== unread.length || unread.length !== 2) issues.push('the badge says ' + badge + ', the header ' + head + ', the unread rows are ' + unread.length + ' (the brief\\'s 2)');
{ const bl = q('.bell'); if ((bl.getAttribute('aria-label') || '') !== 'الإشعارات، غير المقروءة ' + badge || bl.getAttribute('aria-expanded') !== 'true') issues.push('a11y: the bell does not read its count and show the centre open'); }
rows.forEach((r) => { const u = r.dataset.unread === '1', nm = W(T(r.querySelector('.r-at b')));
  if (u !== !!r.querySelector('.n-dot') || u !== /^غير مقروء، /.test(r.getAttribute('aria-label') || '')) issues.push('«' + nm + '»: the unread dot and words do not match its state');
  if (secOf(r) === 'قرارات تنتظرك' && !/^قرار ينتظرك: /.test(r.getAttribute('aria-label') || '')) issues.push('«' + nm + '» does not say it waits for a decision');
  if (r.matches('.r-link') && !r.querySelector('.r-chev')) issues.push('«' + nm + '» has no chevron');
  // the unread dot: visible, 6 pt, teal, between the text and the chevron (right to left: tile, text, dot, chevron)
  const dot = r.querySelector('.n-dot');
  if (dot) { const dr = dot.getBoundingClientRect(), cs = getComputedStyle(dot), at = r.querySelector('.r-at').getBoundingClientRect(), ch = r.querySelector('.r-chev').getBoundingClientRect();
    if (cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.99 || Math.abs(dr.width - 6) > 0.05 || Math.abs(dr.height - 6) > 0.05 || cs.backgroundColor !== 'rgb(63, 224, 208)') issues.push('«' + nm + '»: the unread dot is not a visible 6 pt teal dot');
    if (!(dr.right <= at.left + 0.5 && ch.right <= dr.left + 0.5)) issues.push('«' + nm + '»: the unread dot is not between the text and the chevron'); }
  // a row that opens something says what in VoiceOver
  if (r.matches('.r-link') && !/\. يفتح (القرار|الخبر)$/.test(r.getAttribute('aria-label') || '')) issues.push('a11y: «' + nm + '» does not say where it leads'); });
// the pending order: a group (not a button, not a notification) with its own «إلغاء»
{ const o = q('.sheet .n-ord'), b = o && o.querySelector('button.r-btn');
  if (!o || o.getAttribute('role') !== 'group' || o.matches('.tap, [tabindex]') || o.dataset.unread === '1' || !b || W(T(b)) !== 'إلغاء' || !/^إلغاء أمر /.test(b.getAttribute('aria-label') || '')) issues.push('the pending order is not a group with its own «إلغاء»');
  if (o && (o.getAttribute('aria-label') || '') !== 'أمر معلق: المنطقة الغربية إلى سيوة، يُنفَّذ عند استئناف الوقت') issues.push('a11y: the pending order does not read whole'); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['center'], noTabs: true, fitTab: false, longTab: 'center',
  inputs: ['_build/center.css', '../../shared/paused_hud.css', '../../shared/paused_hud.py'],
  TOK: { sec: 'rgb(198, 186, 232)', ctlH: {}, sheetIcon: [], size: [['.n-ord', null, 44]], radius: { '.n-ord': 10 } },
  HEAD, BRIEF, screenChecks, DATA: { rows: ROWS, sections: SECTIONS },
  skipGeneric: ['section colour on a rule', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white'],
  cases: (d, se) => [
    ['brief text hidden (centre)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-name').style.opacity = '0'; }],
    ['18 pt misuse (centre)', d, '', '.r-sec h3 { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (centre)', d, '', '.r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding/],
    ['gap (centre)', d, '', '.n-ord { gap: 6px !important; }', /gap 6 on/],
    ['faint text (centre)', d, '', '.r-sec h3 { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (centre)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-sec h3').textContent = 'نسبة 20%'; }],
    ['paused HUD stale', d, '', '', /the paused HUD does not count the one pending order/, () => { document.querySelector('.play .o-badge').textContent = '3'; }],
    ['game running', d, '', '', /the game is not shown paused/, () => { document.querySelector('.play use').setAttribute('href', '#i-pause'); }],
    ['sections reordered', d, '', '', /the sections are/, () => { const h = document.querySelectorAll('.r-sec h3'); h[2].textContent = 'للعلم'; h[3].textContent = 'مهم'; }],
    ['rows swapped between tiers', d, '', '', /is not under «مهم»|is not under «للعلم»/, () => { const s = document.querySelectorAll('.r-sec'), a = s[2].querySelector('.r-link'), b = s[3].querySelector('.r-link'); s[2].appendChild(b); s[3].appendChild(a); }],
    ['badge off', d, '', '', /the badge says 4/, () => { document.querySelector('.badge').textContent = '4'; }],
    ['counts changed together', d, '', '', /the unread rows are 1 \(the brief's 2\)/, () => { document.querySelector('.badge').textContent = '1'; document.querySelector('.r-sub .ltr').textContent = '1'; document.querySelector('.bell').setAttribute('aria-label', 'الإشعارات، غير المقروءة 1'); document.querySelectorAll('[data-unread="1"]')[1].removeAttribute('data-unread'); }],
    ['the decision not said waiting', d, '', '', /does not say it waits for a decision/, () => { const r = document.querySelector('.r-sec .r-link'); r.setAttribute('aria-label', r.getAttribute('aria-label').replace('قرار ينتظرك: ', 'قرار: ')); }],
    ['bell silent', d, '', '', /a11y: the bell does not read its count/, () => { document.querySelector('.bell').setAttribute('aria-label', 'الإشعارات'); }],
    ['order counted unread', d, '', '', /marked unread|unread dot and words/, () => { document.querySelector('.n-ord').dataset.unread = '1'; }],
    ['order not cancellable', d, '', '', /the pending order is not a group with its own «إلغاء»/, () => { document.querySelector('.n-ord .r-btn').remove(); }],
    ['order read in part', d, '', '', /a11y: the pending order does not read whole/, () => { document.querySelector('.n-ord').setAttribute('aria-label', 'أمر معلق'); }],
    ['dot recoloured and grown', d, '', '.n-dot { background: rgb(242, 112, 90) !important; width: 12px !important; height: 12px !important; }', /the unread dot is not a visible 6 pt teal dot/],
    ['dot hidden', d, '', '.n-dot { visibility: hidden !important; }', /the unread dot is not a visible 6 pt teal dot/],
    ['dot past the chevron', d, '', '.n-dot { order: 9 !important; }', /the unread dot is not between the text and the chevron/],
    ['row silent on where it leads', d, '', '', /a11y: «احتجاجات في تونس» does not say where it leads/, () => { const r = document.querySelector('.r-sec .r-link'); r.setAttribute('aria-label', r.getAttribute('aria-label').replace('. يفتح القرار', '')); }],
    ['unread dot missing', d, '', '', /the unread dot and words do not match/, () => { document.querySelector('.n-dot').remove(); }],
    ['chevron missing', d, '', '', /has no chevron/, () => { document.querySelector('.r-link .r-chev').remove(); }],
    ['icon missing', d, '', '', /has no icon/, () => { document.querySelector('.r-link .r-tile svg').remove(); }],
    ['a line wrong', d, '', '', /line is not/, () => { document.querySelectorAll('.r-link .r-at > span')[1].textContent = '10 يناير 2011 · الجوار'; }],
  ],
});
