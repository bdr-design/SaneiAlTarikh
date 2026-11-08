// Screen 26 variant A (the pending orders, §6.4 and §6.5): render the iPhones and run the checks with the shared panel
// checker (design/shared/check/panelcheck.js), a sheet of no dock section. This file adds the sheet's own rules: the game
// paused in the HUD (the play button reads «استئناف», the date opens this list, expanded, and its badge counts the rows);
// the header's date the HUD's; each order from its approved screen (screen 7's fuel subsidy, screen 22's operation,
// screen 14's army order), its tile the icon of its dock section and its line opening with that section's name; each row's
// cancel names its order; the note says nothing is spent or moved before time resumes and a cancelled order costs nothing;
// «استئناف الوقت» the one primary, after the list, counting the orders in words; the list after a cancel: two rows, the
// cancel said at once (a status); the identity on the chrome alone; no red; no dialog over the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');

// the orders, read from the approved screens they were given on
const SRC = (() => {
  const s7 = rd('../../screen7/A/_build/sheet.html').match(/<b>دعم الوقود<\/b>[^]*?class="a-step" data-min="[\d.]+" data-max="[\d.]+" data-now="([\d.]+)" data-new="([\d.]+)"/);
  const s22 = rd('../../screen22/A/_build/sheet.html'), op = s22.match(/aria-label="بدء العملية: الكلفة (\d+) مليون دولار/),
    dur = s22.match(/<button class="s-sg tap on" role="radio" aria-checked="true"><span class="ltr">(\d+)<\/span> أشهر<\/button>/),
    kind = s22.match(/role="radio" aria-checked="true"[^>]*>(?:<svg[^]*?<\/svg>)?<span>(جمع معلومات)<\/span>/);
  const s14 = rd('../../shared/SCREEN14_BRIEF.md'), army = s14.match(/the Western Region army from Marsa Matruh[^]*?to the Siwa oasis[^]*?«الوصول بعد (\d+) أيام»/),
    n14 = s14.match(/المنطقة الغربية (\d+) \(Marsa Matruh\)/);
  if (!s7 || !op || !dur || !kind || !army || !n14) throw new Error('cannot read the orders from screens 7, 22 and 14: ' + [!!s7, !!op, !!dur, !!kind, !!army, !!n14]);
  return [
    { sec: 'الاقتصاد', icon: '#i-econ', title: 'دعم الوقود −10%', sub: 'الاقتصاد · ' + s7[1] + ' إلى ' + s7[2] + ' مليار $' },
    { sec: 'الاستخبارات', icon: '#i-eye', title: kind[1] + ' في السودان', sub: 'الاستخبارات · ' + dur[1] + ' أشهر · ' + op[1] + ' مليون $' },
    { sec: 'الجيش', icon: '#i-army', title: 'المنطقة الغربية إلى سيوة', sub: 'الجيش · ' + n14[1] + ' تشكيلات · الوصول بعد ' + army[1] + ' أيام' },
  ]; })();
const HEAD = ['أوامر معلّقة', 'الوقت موقوف · 1 يناير 2011'];
const BRIEF = {
  list: HEAD.concat(['تبدأ عند استئناف الوقت', 'استئناف الوقت', 'تبدأ الأوامر الثلاثة']).concat(SRC.flatMap((o) => [o.title, o.sub])),
  reach_list: ['لا يُخصم شيء ولا يتحرك شيء قبل الاستئناف. الأمر الملغى لا يكلّف شيئًا.'],
  less: HEAD.concat(['تبدأ عند استئناف الوقت', 'أُلغي: جمع معلومات في السودان. لم يُخصم شيء.', 'استئناف الوقت', 'يبدأ الأمران']).concat([SRC[0], SRC[2]].flatMap((o) => [o.title, o.sub])),
};

const screenChecks = `
const { issues, qa, q, T, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const lst = q('.r-body[data-tab="list"]'), less = q('.r-body[data-tab="less"]');
const COUNT = { 3: 'تبدأ الأوامر الثلاثة', 2: 'يبدأ الأمران' };
// the game paused in the HUD: the play button resumes and counts the orders that will start (its badge, the sheet's
// colour); the toast slot holds the pending orders and opens this list (expanded, controlling the sheet)
{ const pl = q('.date .play'), bd = q('.date .play .o-badge'), to = q('.toast .o-toast'), n = lst ? lst.querySelectorAll('.o-row').length : 0;
  if (!pl || pl.getAttribute('aria-label') !== 'استئناف (اللعبة موقوفة)، تبدأ ' + n + ' أوامر معلّقة' || !pl.querySelector('use[href="#i-play"]')) issues.push('the HUD does not show the game paused (the play button «استئناف», saying the ' + n + ' orders)');
  if (!bd || W(T(bd)) !== String(n) || getComputedStyle(bd).backgroundColor !== X.TOK.sec || bd.getBoundingClientRect().width < 15.5) issues.push('the HUD badge does not count the ' + n + ' orders in the sheet\\'s colour');
  if (!to || to.tagName !== 'BUTTON' || to.getAttribute('aria-expanded') !== 'true' || to.getAttribute('aria-controls') !== 'orders' || !q('.sheet#orders')) issues.push('the toast slot does not open this list (a button, expanded, controlling the sheet)');
  else { if (W(T(to.querySelector('.txt'))) !== n + ' أوامر تنتظر الاستئناف' || to.getAttribute('aria-label') !== n + ' أوامر معلّقة تنتظر الاستئناف') issues.push('the toast does not say the ' + n + ' pending orders and when they start');
    if (!to.querySelector('use[href="#i-queue"]') || getComputedStyle(to.querySelector('svg')).color !== X.TOK.sec) issues.push('the toast\\'s icon is not the queue in the sheet\\'s colour'); }
  // the header's date is the HUD's
  if (W(T(q('.sheet .r-sub'))) !== 'الوقت موقوف · ' + W(T(q('.date .dmy')))) issues.push('the header does not say time is paused on the HUD\\'s date'); }
{ const f = q('.sheet .r-flag img'); if (!f || !(f.getAttribute('src') || '').endsWith('/eg.svg') || f.getAttribute('alt') !== 'علم مصر') issues.push('the header flag is not the player\\'s (مصر)'); }
if (!q('.sheet .s-emb use[href="#i-queue"]')) issues.push('the emblem is not the queue');
if (q('.sheet .r-x').getAttribute('aria-label') !== 'إغلاق، العودة إلى الخريطة والوقت موقوف') issues.push('a11y: the close does not say time stays paused');
if (!lst || !less || [lst, less].some((b) => !b.closest('.sheet'))) issues.push('the list and the list after a cancel are not bodies of the sheet');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal')) issues.push('a dialog over the map (mapCentral)');
// the orders: each from its approved screen, its tile its section's dock icon (white), its line opening with the section;
// each row's cancel names it
const dockIcon = (name) => { const it = [...document.querySelectorAll('.dock .dock-item')].find((d) => W(T(d.querySelector('span'))) === name); return it ? it.querySelector('use').getAttribute('href') : null; };
[[lst, DATA.src], [less, [DATA.src[0], DATA.src[2]]]].forEach(([b, want]) => { if (!b) return;
  const rows = [...b.querySelectorAll('.o-list > .o-row')], ol = b.querySelector('.o-list');
  if (!ol || ol.tagName !== 'OL' || ol.getAttribute('aria-label') !== 'الأوامر المعلّقة، ' + want.length) issues.push('a11y: the «' + b.dataset.tab + '» list is not an ordered list named with its count (' + want.length + ')');
  if (rows.length !== want.length) issues.push('the «' + b.dataset.tab + '» list has ' + rows.length + ' orders, not ' + want.length);
  rows.forEach((r, i) => { const o = want[i]; if (!o) return; const rh = r.getBoundingClientRect().height, fitLv = +(document.documentElement.dataset.rfit || 0);
    if (r.getClientRects().length && Math.abs(rh - (fitLv ? 40 : 44)) > 0.1) issues.push('an order row is ' + rh.toFixed(1) + ' pt (44, or 40 at a fit level)'); const t = W(T(r.querySelector('.r-at b'))), s = W(T(r.querySelector('.r-at > span'))), ic = r.querySelector('.r-tile use');
    if (t !== o.title || s !== o.sub) issues.push('the order «' + t + '» is not its screen\\'s («' + o.title + '» · «' + o.sub + '»)');
    if (!ic || ic.getAttribute('href') !== o.icon || dockIcon(o.sec) !== o.icon) issues.push('the order «' + t + '»: its tile is not the dock icon of «' + o.sec + '»');
    if (getComputedStyle(r.querySelector('.r-tile')).color !== X.TOK.t1) issues.push('the order «' + t + '»: its tile icon is not white');
    const x = r.querySelector('button.o-x'); if (!x || !(x.getAttribute('aria-label') || '').startsWith('إلغاء الأمر: ' + o.title.replace(' −10%', ' −10%'))) issues.push('a11y: the cancel on «' + t + '» does not name its order');
    if (x && x.getBoundingClientRect().left > r.querySelector('.r-at').getBoundingClientRect().left) issues.push('the cancel on «' + t + '» is not at the row\\'s end'); });
  // the resume: the one primary, after the list, counting the orders in words
  const acts = [...b.querySelectorAll('.r-act')], prim = [...b.querySelectorAll('.r-first')];
  if (acts.length !== 1 || prim.length !== 1 || prim[0] !== acts[0] || W(T(acts[0].querySelector('b'))) !== 'استئناف الوقت' || W(T(acts[0].querySelector('.r-at > span'))) !== COUNT[want.length] || acts[0].getAttribute('aria-label') !== 'استئناف الوقت: ' + COUNT[want.length]) issues.push('the «' + b.dataset.tab + '» resume is not the one primary «استئناف الوقت · ' + COUNT[want.length] + '»');
  else if (acts[0].getBoundingClientRect().top < ol.getBoundingClientRect().bottom) issues.push('the resume is not after the list'); });
// the note: nothing spent or moved before resuming; a cancelled order costs nothing
{ const n = W(T(lst.querySelector('.s-note'))); if (!/لا يُخصم شيء/.test(n) || !/لا يتحرك شيء/.test(n) || !/قبل الاستئناف/.test(n) || !/الأمر الملغى لا يكلّف شيئًا/.test(n)) issues.push('the note does not say nothing is spent or moved before resuming and a cancelled order costs nothing'); }
// the list after a cancel: says what was cancelled, at once to VoiceOver, and that nothing was spent
{ const d = less && less.querySelector('.o-done'), t = W(T(d)); if (!d || d.getAttribute('role') !== 'status' || t !== 'أُلغي: ' + DATA.src[1].title + '. لم يُخصم شيء.') issues.push('the list after a cancel does not say, at once, what was cancelled and that nothing was spent'); }
// no red here; the identity only on the chrome (top line, emblem, badge): not on a row, a tile or a text
{ const redIn = (c) => /242, 112, 90/.test(c || ''), yel = X.TOK.sec;
  qa('.sheet *, .date .play *, .o-toast, .o-toast *').forEach((e) => { if (e.closest('svg') && !e.matches('svg')) return; const cs = getComputedStyle(e);
    if ([cs.color, cs.backgroundColor, cs.boxShadow, cs.borderTopColor].some(redIn)) issues.push('red in the pending orders: ' + (e.className && e.className.baseVal === undefined ? e.className : e.tagName));
    if (!e.closest('.s-emb') && !e.matches('.o-badge') && !e.closest('.o-toast svg') && [cs.color, cs.backgroundColor, cs.boxShadow].some((c) => (c || '').includes(yel.slice(4, -1)))) issues.push('the identity colour off the chrome: ' + (e.className && e.className.baseVal === undefined ? e.className : e.tagName)); }); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['list', 'less'], noTabs: true, fitTab: 'list', longTab: 'list',
  inputs: ['_build/orders.css', '../../screen7/A/_build/sheet.html', '../../screen22/A/_build/sheet.html', '../../shared/SCREEN14_BRIEF.md'],
  TOK: { sec: 'rgb(240, 231, 60)', ctlH: { '.o-x': 32 }, sheetIcon: [['.o-x svg', 16]], size: [], radius: { '.o-row': 10 } },
  HEAD, BRIEF, screenChecks, DATA: { src: SRC },
  skipGeneric: ['section colour on a rule', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white'],
  cases: (d, se) => [
    ['brief text hidden (list)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-body[data-tab="list"] .o-row .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (list)', d, '', '.r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (list)', d, '', '.r-body[data-tab="list"] .r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding/],
    ['gap (list)', d, '', '.r-body[data-tab="list"] { gap: 6px !important; }', /gap 6 on/],
    ['faint text (list)', d, '', '.o-row .r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (list)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="list"] .s-note').textContent = 'نسبة 20%'; }],
    ['text into a control (row)', d, '', '.o-row .r-at { transform: translateX(-60px) !important; }', /text over a control|text overlap|hit overlap/],
    ['running, not paused', d, '', '', /the HUD does not show the game paused/, () => { const p = document.querySelector('.date .play'); p.setAttribute('aria-label', 'إيقاف مؤقت (اللعبة تعمل)'); p.querySelector('use').setAttribute('href', '#i-pause'); }],
    ['play count unsaid', d, '', '', /the HUD does not show the game paused/, () => { document.querySelector('.date .play').setAttribute('aria-label', 'استئناف (اللعبة موقوفة)'); }],
    ['badge wrong', d, '', '', /the HUD badge does not count the 3 orders/, () => { document.querySelector('.o-badge').textContent = '2'; }],
    ['badge red', d, '', '.o-badge { background: var(--red) !important; }', /the HUD badge does not count the 3 orders in the sheet's colour|red in the pending orders/],
    ['toast not the entry', d, '', '', /the toast slot does not open this list/, () => { document.querySelector('.o-toast').removeAttribute('aria-controls'); }],
    ['toast unsaid', d, '', '', /the toast does not say the 3 pending orders/, () => { document.querySelector('.o-toast .txt').textContent = 'أوامر معلّقة'; }],
    ['toast icon amber', d, '', '.o-toast svg.i { color: var(--amber) !important; }', /the toast's icon is not the queue in the sheet's colour/],
    ['header date off', d, '', '', /the header does not say time is paused on the HUD's date/, () => { document.querySelectorAll('.sheet .r-sub .ltr')[1].textContent = '2012'; }],
    ['wrong flag', d, '', '', /the header flag is not the player's/, () => { document.querySelector('.r-flag img').setAttribute('src', '../../shared/flags/ly.svg'); }],
    ['emblem not the queue', d, '', '', /the emblem is not the queue/, () => { document.querySelector('.s-emb use').setAttribute('href', '#i-play'); }],
    ['close unclear', d, '', '', /a11y: the close does not say time stays paused/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['list in a dialog', d, '', '', /a dialog over the map/, () => { document.querySelector('.r-body[data-tab="list"]').setAttribute('role', 'alertdialog'); }],
    ['order not its screen', d, '', '', /the order «دعم الوقود −10%» is not its screen's/, () => { document.querySelector('.r-body[data-tab="list"] .o-row .r-at > span .ltr:last-child').textContent = '10.0'; }],
    ['tile not the section', d, '', '', /its tile is not the dock icon of «الجيش»/, () => { document.querySelectorAll('.r-body[data-tab="list"] .o-row .r-tile use')[2].setAttribute('href', '#i-eye'); }],
    ['tile cyan', d, '', '.o-row .r-tile { color: var(--cyan) !important; }', /its tile icon is not white/],
    ['cancel unnamed', d, '', '', /a11y: the cancel on «جمع معلومات في السودان» does not name its order/, () => { document.querySelectorAll('.r-body[data-tab="list"] .o-x')[1].setAttribute('aria-label', 'إلغاء'); }],
    ['cancel at the start', d, '', '.o-x { order: -1; }', /the cancel on «.*» is not at the row's end/],
    ['an order lost', d, '', '', /the «list» list has 2 orders, not 3/, () => { document.querySelectorAll('.r-body[data-tab="list"] .o-row')[2].remove(); }],
    ['list unnamed', d, '', '', /a11y: the «list» list is not an ordered list named with its count/, () => { document.querySelector('.r-body[data-tab="list"] .o-list').setAttribute('aria-label', 'الأوامر'); }],
    ['resume count off', d, '', '', /the «list» resume is not the one primary/, () => { document.querySelector('.r-body[data-tab="list"] .r-act .r-at > span').textContent = 'تبدأ الأوامر'; }],
    ['resume not primary', d, '', '', /the «list» resume is not the one primary/, () => { document.querySelector('.r-body[data-tab="list"] .r-act').classList.remove('r-first'); }],
    ['row height off', d, '', '.o-row { height: 36px !important; }', /an order row is 36\.0 pt/],
    ['resume above the list', d, '', '.r-body[data-tab="list"] .r-act { order: -1; }', /the resume is not after the list/],
    ['note unsaid', d, '', '', /the note does not say nothing is spent/, () => { document.querySelector('.r-body[data-tab="list"] .s-note').textContent = 'الأوامر تنتظر.'; }],
    ['cancel unsaid', d, '&tab=less', '', /the list after a cancel does not say, at once/, () => { document.querySelector('.o-done').removeAttribute('role'); }],
    ['less count off', d, '&tab=less', '', /the «less» list has 3 orders, not 2/, () => { const l = document.querySelector('.r-body[data-tab="less"] .o-list'); l.appendChild(l.firstElementChild.cloneNode(true)); }],
    ['red cancel', d, '', '.o-x { color: var(--red) !important; }', /red in the pending orders/],
    ['identity on a row', d, '', '.o-row .r-at b { color: var(--sec) !important; }', /the identity colour off the chrome/],
  ],
});
