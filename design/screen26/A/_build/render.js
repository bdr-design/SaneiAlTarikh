// Screen 26 variant A (the pending orders, §6.4 and §6.7): render the iPhones and run the checks with the shared panel
// checker (design/shared/check/panelcheck.js), a sheet of no dock section. This file adds the sheet's own rules: the game
// paused in the HUD (design/shared/paused_hud: the play button carries the count of the open body's orders in the counted
// form, its badge in the sheet's colour on the date's side; the toast slot holds them in the counted form, its name its
// visible text, and opens this list); the bell's 2; the header's date the HUD's; each order from its approved screen
// (screen 7's fuel subsidy, screen 22's operation, screen 14's army order), in the order given on screen, its tile the white
// icon of its section's dock item, its line opening with that section's name, screen 16's «إلغاء» naming it at the row's
// end; the note; «استئناف الوقت» the one primary after the list, in the counted form; after a cancel, the status with its
// «تراجع»; the identity on the chrome alone; no red; no dialog over the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');

// the counted forms (design/shared/paused_hud.py, the same rules)
const WORDS = { 3: 'الثلاثة', 4: 'الأربعة', 5: 'الخمسة', 6: 'الستة', 7: 'السبعة', 8: 'الثمانية', 9: 'التسعة', 10: 'العشرة' };
const FORMS = (n) => n === 1 ? { toast: 'أمر واحد ينتظر الاستئناف', play: 'يُنفَّذ أمر معلّق واحد', resume: 'يُنفَّذ الأمر' }
  : n === 2 ? { toast: 'أمران ينتظران الاستئناف', play: 'يُنفَّذ أمران معلّقان', resume: 'يُنفَّذ الأمران' }
  : n <= 10 ? { toast: n + ' أوامر تنتظر الاستئناف', play: 'تُنفَّذ ' + n + ' أوامر معلّقة', resume: 'تُنفَّذ الأوامر ' + WORDS[n] }
  : { toast: n + ' أمرًا ينتظر الاستئناف', play: 'يُنفَّذ ' + n + ' أمرًا معلّقًا', resume: 'تُنفَّذ الأوامر الـ' + n };
// the orders, read from the approved screens they were given on
const SRC = (() => {
  const s7 = rd('../../screen7/A/_build/sheet.html'), sub = s7.match(/<b>دعم الوقود<\/b>[^]*?<span class="r-chip a-delta"><span class="ltr">([−+]\d+%)<\/span><\/span>[^]*?class="a-step" data-min="[\d.]+" data-max="[\d.]+" data-now="([\d.]+)" data-new="([\d.]+)"/);
  const s22 = rd('../../screen22/A/_build/sheet.html'), op = s22.match(/aria-label="بدء العملية: الكلفة (\d+) مليون دولار/),
    dur = s22.match(/<button class="s-sg tap on" role="radio" aria-checked="true"><span class="ltr">(\d+)<\/span> أشهر<\/button>/),
    kind = s22.match(/role="radio" aria-checked="true"[^>]*>(?:<svg[^]*?<\/svg>)?<span>(جمع معلومات)<\/span>/),
    tgt = s22.match(/<span class="r-at"><b>([^<]+)<\/b><span>الشبكة /);
  const s14 = rd('../../screen14/A/index.html'), west = s14.match(/west: +\{ kind: 'army', name: '(المنطقة الغربية)', n: (\d+),/),
    brief14 = rd('../../shared/SCREEN14_BRIEF.md'), eta = brief14.match(/to the Siwa oasis[^]*?«الوصول بعد (\d+) أيام»/);
  if (!sub || !op || !dur || !kind || !tgt || !west || !eta || !/سيوة/.test(s14)) throw new Error('cannot read the orders from screens 7, 22 and 14: ' + [!!sub, !!op, !!dur, !!kind, !!tgt, !!west, !!eta]);
  return [
    { sec: 'الاقتصاد', icon: '#i-econ', title: 'دعم الوقود ' + sub[1], sub: 'الاقتصاد · ' + sub[2] + ' إلى ' + sub[3] + ' مليار $' },
    { sec: 'الاستخبارات', icon: '#i-eye', title: kind[1] + ' في ' + tgt[1], sub: 'الاستخبارات · ' + dur[1] + ' أشهر · ' + op[1] + ' مليون $' },
    { sec: 'الجيش', icon: '#i-army', title: west[1] + ' إلى سيوة', sub: 'الجيش · ' + west[2] + ' تشكيلات · الوصول بعد ' + eta[1] + ' أيام' },
  ]; })();
const HEAD = ['أوامر معلّقة', 'اللعبة متوقفة · 1 يناير 2011'];
const BRIEF = {
  list: HEAD.concat(['تُنفَّذ عند استئناف الوقت', 'استئناف الوقت', FORMS(3).resume, 'إلغاء']).concat(SRC.flatMap((o) => [o.title, o.sub])),
  reach_list: ['لا يُخصم شيء ولا يتحرك شيء قبل الاستئناف. الأمر الملغى لا يكلّف شيئًا.'],
  less: HEAD.concat(['تُنفَّذ عند استئناف الوقت', 'أُلغي: جمع معلومات في السودان. لم يُخصم شيء.', 'تراجع', 'استئناف الوقت', FORMS(2).resume]).concat([SRC[0], SRC[2]].flatMap((o) => [o.title, o.sub])),
};

const screenChecks = `
const { issues, qa, q, T, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const FORMS = new Function('return ' + DATA.forms)();
const lst = q('.r-body[data-tab="list"]'), less = q('.r-body[data-tab="less"]'), tab = document.documentElement.dataset.tab;
const open = q('.r-body[data-tab="' + tab + '"]'), n = open ? open.querySelectorAll('.o-list > .o-row').length : 0, F = FORMS(n);
// the game paused in the HUD, counting the open body's orders: the play button (its label, its badge in the sheet's colour
// on the date's side of the glyph); the toast slot (its name its visible text, the queue icon in the sheet's colour,
// opening this list); the bell 2
{ const pl = q('.date .play'), bd = q('.date .play .o-badge'), to = q('.toast .o-toast');
  if (!pl || pl.getAttribute('aria-label') !== 'تشغيل (اللعبة متوقفة)، ' + F.play || !pl.querySelector('use[href="#i-play"]')) issues.push('the HUD does not show the game paused (the play button «تشغيل», saying «' + F.play + '»)');
  if (!bd || W(T(bd)) !== String(n) || getComputedStyle(bd).backgroundColor !== X.TOK.sec || bd.getBoundingClientRect().width < 15.5) issues.push('the HUD badge does not count the ' + n + ' orders in the sheet\\'s colour');
  else { const g = pl.querySelector('svg').getBoundingClientRect(), b = bd.getBoundingClientRect(), dt = q('.date .dtext').getBoundingClientRect();
    if (Math.sign((b.left + b.right) / 2 - (g.left + g.right) / 2) !== Math.sign((dt.left + dt.right) / 2 - (g.left + g.right) / 2) || b.left < g.right - 0.5) issues.push('the HUD badge is not on the date\\'s side of the glyph, clear of it');
    if (b.top < q('.date').getBoundingClientRect().top - 3.5) issues.push('the HUD badge overhangs the date pill more than the bell\\'s badge (3 pt)');
    // a two-digit count (up to the queue's 64) grows toward the date, still clear of the glyph
    const keep = bd.textContent; bd.textContent = '64'; const b2 = bd.getBoundingClientRect(); bd.textContent = keep;
    if (b2.left < g.right - 0.5) issues.push('a two-digit HUD badge runs onto the glyph'); }
  if (!to || to.tagName !== 'BUTTON' || to.getAttribute('aria-expanded') !== 'true' || to.getAttribute('aria-controls') !== 'orders' || !q('.sheet#orders')) issues.push('the toast slot does not open this list (a button, expanded, controlling the sheet)');
  else { if (W(T(to.querySelector('.txt'))) !== F.toast || to.hasAttribute('aria-label')) issues.push('the toast does not say «' + F.toast + '» as its name');
    if (!to.querySelector('use[href="#i-queue"]') || getComputedStyle(to.querySelector('svg')).color !== X.TOK.sec) issues.push('the toast\\'s icon is not the queue in the sheet\\'s colour'); }
  const bl = q('.bell'); if (!bl || bl.getAttribute('aria-label') !== 'الإشعارات، غير المقروءة 2' || W(T(bl.querySelector('.badge'))) !== '2') issues.push('the bell is not 2 (as screen 16 at this moment)');
  if (W(T(q('.sheet .r-sub'))) !== 'اللعبة متوقفة · ' + W(T(q('.date .dmy')))) issues.push('the header does not say the game is paused on the HUD\\'s date'); }
{ const f = q('.sheet .r-flag img'); if (!f || !(f.getAttribute('src') || '').endsWith('/eg.svg') || f.getAttribute('alt') !== 'علم مصر') issues.push('the header flag is not the player\\'s (مصر)'); }
if (!q('.sheet .s-emb use[href="#i-queue"]')) issues.push('the emblem is not the queue');
if (q('.sheet .r-x').getAttribute('aria-label') !== 'إغلاق، العودة إلى الخريطة واللعبة متوقفة') issues.push('a11y: the close does not say the game stays paused');
if (!lst || !less || [lst, less].some((b) => !b.closest('.sheet'))) issues.push('the list and the list after a cancel are not bodies of the sheet');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal, [aria-modal="true"]')) issues.push('a dialog over the map (mapCentral)');
// the orders: each from its approved screen, in the order given (on screen too), its tile its section's dock icon in
// white, its line opening with the section; screen 16's «إلغاء» at the row's end naming it
const dockIcon = (name) => { const it = [...document.querySelectorAll('.dock .dock-item')].find((d) => W(T(d.querySelector('span'))) === name); return it ? it.querySelector('use').getAttribute('href') : null; };
[[lst, DATA.src], [less, [DATA.src[0], DATA.src[2]]]].forEach(([b, want]) => { if (!b) return;
  const rows = [...b.querySelectorAll('.o-list > .o-row')], ol = b.querySelector('.o-list'), shown = b === open;
  if (!ol || ol.tagName !== 'OL' || ol.getAttribute('role') !== 'list' || ol.getAttribute('aria-label') !== 'الأوامر المعلّقة، ' + want.length) issues.push('a11y: the «' + b.dataset.tab + '» list is not an ordered list named with its count (' + want.length + ')');
  if (rows.length !== want.length) issues.push('the «' + b.dataset.tab + '» list has ' + rows.length + ' orders, not ' + want.length);
  let prevTop = -1;
  rows.forEach((r, i) => { const o = want[i]; if (!o) return; const t = W(T(r.querySelector('.r-at b'))), s = W(T(r.querySelector('.r-at > span'))), ic = r.querySelector('.r-tile use');
    if (t !== o.title || s !== o.sub) issues.push('the order «' + t + '» is not its screen\\'s («' + o.title + '» · «' + o.sub + '»)');
    if (!ic || ic.getAttribute('href') !== o.icon || dockIcon(o.sec) !== o.icon) issues.push('the order «' + t + '»: its tile is not the dock icon of «' + o.sec + '»');
    if (getComputedStyle(r.querySelector('.r-tile svg')).color !== X.TOK.t1) issues.push('the order «' + t + '»: its tile icon is not white');
    const x = r.querySelector('button.r-btn');
    if (!x || W(T(x)) !== 'إلغاء' || x.getAttribute('aria-label') !== 'إلغاء أمر ' + o.title) issues.push('a11y: the cancel on «' + t + '» is not screen 16\\'s «إلغاء» naming its order («إلغاء أمر ' + o.title + '»)');
    if (!shown) return;
    const rb = r.getBoundingClientRect(), fitLv = +(document.documentElement.dataset.rfit || 0);
    if (Math.abs(rb.height - (fitLv >= 2 ? 40 : 44)) > 0.1) issues.push('an order row is ' + rb.height.toFixed(1) + ' pt (44, or 40 from fit level 2)');
    if (rb.top <= prevTop) issues.push('the orders are not shown in the order given («' + t + '»)'); prevTop = rb.top;
    if (x && x.getBoundingClientRect().left > r.querySelector('.r-at').getBoundingClientRect().left) issues.push('the cancel on «' + t + '» is not at the row\\'s end'); });
  // the resume: the one primary, after the list, in the counted form
  const acts = [...b.querySelectorAll('.r-act')], prim = [...b.querySelectorAll('.r-first')], fr = FORMS(want.length).resume;
  if (acts.length !== 1 || prim.length !== 1 || prim[0] !== acts[0] || W(T(acts[0].querySelector('b'))) !== 'استئناف الوقت' || W(T(acts[0].querySelector('.r-at > span'))) !== fr || acts[0].getAttribute('aria-label') !== 'استئناف الوقت: ' + fr) issues.push('the «' + b.dataset.tab + '» resume is not the one primary «استئناف الوقت · ' + fr + '»');
  else if (shown && acts[0].getBoundingClientRect().top < ol.getBoundingClientRect().bottom) issues.push('the resume is not after the list'); });
// the note: nothing spent or moved before resuming; a cancelled order costs nothing
{ const nt = W(T(lst.querySelector('.s-note'))); if (!/لا يُخصم شيء/.test(nt) || !/لا يتحرك شيء/.test(nt) || !/قبل الاستئناف/.test(nt) || !/الأمر الملغى لا يكلّف شيئًا/.test(nt)) issues.push('the note does not say nothing is spent or moved before resuming and a cancelled order costs nothing'); }
// after a cancel: what was cancelled, at once to VoiceOver, nothing spent, and its undo naming it
{ const d = less && less.querySelector('.o-done'), st = d && d.querySelector('[role="status"]'), u = d && d.querySelector('button.r-btn');
  if (!st || W(T(st)) !== 'أُلغي: ' + DATA.src[1].title + '. لم يُخصم شيء.') issues.push('the list after a cancel does not say, at once, what was cancelled and that nothing was spent');
  if (!u || W(T(u)) !== 'تراجع' || u.getAttribute('aria-label') !== 'تراجع عن إلغاء أمر ' + DATA.src[1].title) issues.push('the cancel has no undo «تراجع» naming the order'); }
// no red here (any red: hue near 0, saturated); the identity only on the chrome (the top line, the emblem, the badge, the toast's icon)
{ const isRed = (c) => { const m = (c || '').match(/rgba?\\((\\d+), (\\d+), (\\d+)/); if (!m) return false; const [r, g, b] = m.slice(1).map((v) => +v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0; if (mx !== r || sat < 0.45 || mx < 0.25) return false;
    const hue = 60 * ((g - b) / (mx - mn)); return Math.abs(hue) <= 15; };   // hue within 15° of red, saturated, not near black
  const reds = (c) => (c || '').match(/rgba?\\([^)]*\\)/g) || [], yel = X.TOK.sec;
  qa('.sheet *, .date .play *, .o-toast, .o-toast *').forEach((e) => { const cs = getComputedStyle(e);
    if ([cs.color, cs.backgroundColor, cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor, cs.outlineColor, cs.stroke, cs.fill].concat(reds(cs.boxShadow)).some(isRed)) issues.push('red in the pending orders: ' + (e.className && e.className.baseVal === undefined ? e.className : e.tagName));
    if (!e.closest('.s-emb') && !e.matches('.o-badge') && !e.closest('.o-toast svg') && [cs.color, cs.backgroundColor, cs.boxShadow].some((c) => (c || '').includes(yel.slice(4, -1)))) issues.push('the identity colour off the chrome: ' + (e.className && e.className.baseVal === undefined ? e.className : e.tagName)); }); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['list', 'less'], noTabs: true, fitTab: 'list', longTab: 'list',
  inputs: ['_build/orders.css', '../../shared/paused_hud.css', '../../shared/paused_hud.py', '../../screen7/A/_build/sheet.html', '../../screen22/A/_build/sheet.html', '../../screen14/A/index.html', '../../shared/SCREEN14_BRIEF.md'],
  TOK: { sec: 'rgb(240, 231, 60)', ctlH: {}, sheetIcon: [], size: [], radius: { '.o-row': 10 } },
  HEAD, BRIEF, screenChecks, DATA: { src: SRC, forms: FORMS.toString().replace(/WORDS\[n\]/, '(' + JSON.stringify(WORDS) + ')[n]') },
  skipGeneric: ['section colour on a rule', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white', 'hint chevron missing (no tabs)', 'hint over the content (no tabs)'],
  cases: (d, se) => [
    ['brief text hidden (list)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-body[data-tab="list"] .o-row .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (list)', d, '', '.r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (list)', d, '', '.r-body[data-tab="list"] .o-row:first-child .r-at { flex: none !important; width: 40px; overflow: hidden !important; }', /clipped text \(sides\)/],
    ['gap (list)', d, '', '.r-body[data-tab="list"] { gap: 6px !important; }', /gap 6 on/],
    ['faint text (list)', d, '', '.o-row .r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (list)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="list"] .s-note').textContent = 'نسبة 20%'; }],
    // (the shared «text over a control» rule covers chips, «لماذا؟», segments and the close; the cancel is a labelled
    //  button, so its text running into the order's text is the text-overlap rule's)
    ['text into a control (row)', d, '', '.r-body[data-tab="list"] .o-row:first-child .r-btn { position: absolute; right: 60px; }', /text overlap "دعم الوقود" \/ "إلغاء"/],
    ['hint chevron missing (forced overflow)', se, '', '.r-body[data-tab="list"] > :first-child { margin-top: 200px !important; } .r-hint { display: none !important; }', /scroll hint chevron missing with content below/, () => { document.documentElement.dataset.fbot = '1'; }],
    ['hint over the content (forced overflow)', se, '', '.r-body[data-tab="list"] > :first-child { margin-top: 200px !important; } .r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/, () => { document.documentElement.dataset.fbot = '1'; }],
    ['running, not paused', d, '', '', /the HUD does not show the game paused/, () => { const p = document.querySelector('.date .play'); p.setAttribute('aria-label', 'إيقاف مؤقت (اللعبة تعمل)'); p.querySelector('use').setAttribute('href', '#i-pause'); }],
    ['play count form wrong', d, '', '', /the HUD does not show the game paused/, () => { document.querySelector('.date .play').setAttribute('aria-label', 'تشغيل (اللعبة متوقفة)، تبدأ 3 أوامر معلّقة'); }],
    ['badge wrong', d, '', '', /the HUD badge does not count the 3 orders/, () => { document.querySelector('.o-badge').textContent = '2'; }],
    ['badge red', d, '', '.o-badge { background: var(--red) !important; }', /the HUD badge does not count the 3 orders in the sheet's colour|red in the pending orders/],
    ['badge away from the date', d, '', '.play .o-badge { right: auto !important; left: -10px !important; }', /the HUD badge is not on the date's side of the glyph/],
    ['badge grows onto the glyph', d, '', '.play .o-badge { left: auto !important; right: -10px !important; }', /a two-digit HUD badge runs onto the glyph/],
    ['red outline (other border)', d, '', '.o-row:first-child { border-left: 2px solid #8B0000 !important; }', /red in the pending orders: o-row/],
    ['badge too high', d, '', '.play .o-badge { top: -9px !important; }', /the HUD badge overhangs the date pill/],
    ['less HUD stale', d, '&tab=less', '', /the HUD badge does not count the 2 orders|the HUD does not show the game paused/, () => { document.querySelector('.o-badge').textContent = '3'; document.querySelector('.date .play').setAttribute('aria-label', 'تشغيل (اللعبة متوقفة)، تُنفَّذ 3 أوامر معلّقة'); }],
    ['less toast stale', d, '&tab=less', '', /the toast does not say «أمران ينتظران الاستئناف»/, () => { document.querySelector('.o-toast .txt').textContent = '3 أوامر تنتظر الاستئناف'; }],
    ['toast not the entry', d, '', '', /the toast slot does not open this list/, () => { document.querySelector('.o-toast').removeAttribute('aria-controls'); }],
    ['toast name not its text', d, '', '', /the toast does not say «3 أوامر تنتظر الاستئناف» as its name/, () => { document.querySelector('.o-toast').setAttribute('aria-label', '3 أوامر معلّقة تنتظر الاستئناف'); }],
    ['toast icon amber', d, '', '.o-toast svg.i { color: var(--amber) !important; }', /the toast's icon is not the queue in the sheet's colour/],
    ['bell 3', d, '', '', /the bell is not 2/, () => { document.querySelector('.bell .badge').textContent = '3'; }],
    ['header date off', d, '', '', /the header does not say the game is paused on the HUD's date/, () => { document.querySelectorAll('.sheet .r-sub .ltr')[1].textContent = '2012'; }],
    ['wrong flag', d, '', '', /the header flag is not the player's/, () => { document.querySelector('.r-flag img').setAttribute('src', '../../shared/flags/ly.svg'); }],
    ['emblem not the queue', d, '', '', /the emblem is not the queue/, () => { document.querySelector('.s-emb use').setAttribute('href', '#i-play'); }],
    ['close unclear', d, '', '', /a11y: the close does not say the game stays paused/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['list in a dialog', d, '', '', /a dialog over the map/, () => { document.querySelector('.r-body[data-tab="list"]').setAttribute('role', 'alertdialog'); }],
    ['sheet modal', d, '', '', /a dialog over the map/, () => { document.querySelector('.sheet').setAttribute('aria-modal', 'true'); }],
    ['order not its screen', d, '', '', /the order «دعم الوقود −10%» is not its screen's/, () => { document.querySelector('.r-body[data-tab="list"] .o-row .r-at > span .ltr:last-child').textContent = '10.0'; }],
    ['rows reversed on screen', d, '', '.r-body[data-tab="list"] .o-list { flex-direction: column-reverse !important; }', /the orders are not shown in the order given/],
    ['tile not the section', d, '', '', /its tile is not the dock icon of «الجيش»/, () => { document.querySelectorAll('.r-body[data-tab="list"] .o-row .r-tile use')[2].setAttribute('href', '#i-eye'); }],
    ['tile icon cyan', d, '', '.o-row .r-tile svg { color: rgb(127, 233, 255) !important; }', /its tile icon is not white/],
    ['cancel unnamed', d, '', '', /a11y: the cancel on «جمع معلومات في السودان» is not screen 16's «إلغاء»/, () => { document.querySelectorAll('.r-body[data-tab="list"] .o-row .r-btn')[1].setAttribute('aria-label', 'إلغاء'); }],
    ['cancel as a glyph', d, '', '', /a11y: the cancel on «المنطقة الغربية إلى سيوة» is not screen 16's «إلغاء»/, () => { document.querySelectorAll('.r-body[data-tab="list"] .o-row .r-btn')[2].textContent = '✕'; }],
    ['cancel at the start', d, '', '.o-row .r-btn { order: -1; }', /the cancel on «.*» is not at the row's end/],
    ['an order lost', d, '', '', /the «list» list has 2 orders, not 3/, () => { document.querySelectorAll('.r-body[data-tab="list"] .o-row')[2].remove(); }],
    ['list unnamed', d, '', '', /a11y: the «list» list is not an ordered list named with its count/, () => { document.querySelector('.r-body[data-tab="list"] .o-list').setAttribute('aria-label', 'الأوامر'); }],
    ['resume count off', d, '', '', /the «list» resume is not the one primary/, () => { document.querySelector('.r-body[data-tab="list"] .r-act .r-at > span').textContent = 'تبدأ الأوامر'; }],
    ['resume not primary', d, '', '', /the «list» resume is not the one primary/, () => { document.querySelector('.r-body[data-tab="list"] .r-act').classList.remove('r-first'); }],
    ['resume above the list', d, '', '.r-body[data-tab="list"] .r-act { order: -1; }', /the resume is not after the list/],
    ['row height off', d, '', '.o-row { height: 36px !important; }', /an order row is 36\.0 pt/],
    ['note unsaid', d, '', '', /the note does not say nothing is spent/, () => { document.querySelector('.r-body[data-tab="list"] .s-note').textContent = 'الأوامر تنتظر.'; }],
    ['cancel unsaid', d, '&tab=less', '', /the list after a cancel does not say, at once/, () => { document.querySelector('.o-done [role="status"]').removeAttribute('role'); }],
    ['undo lost', d, '&tab=less', '', /the cancel has no undo «تراجع» naming the order/, () => { document.querySelector('.o-done .r-btn').remove(); }],
    ['less count off', d, '&tab=less', '', /the «less» list has 3 orders, not 2/, () => { const l = document.querySelector('.r-body[data-tab="less"] .o-list'); l.appendChild(l.firstElementChild.cloneNode(true)); }],
    ['red cancel (token)', d, '', '.o-row .r-btn { color: var(--red) !important; }', /red in the pending orders/],
    ['red cancel (other red)', d, '', '.o-row .r-btn { color: #ff3b30 !important; }', /red in the pending orders/],
    ['identity on a row', d, '', '.o-row .r-at b { color: var(--sec) !important; }', /the identity colour off the chrome/],
  ],
});
