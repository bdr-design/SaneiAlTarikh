// Screen 30 variant A (the start tour, «جولة البداية»; onboarding): render the iPhones and run the checks with the shared
// panel checker (design/shared/check/panelcheck.js), in the «المزيد» section. This file adds the tour's own rules: the
// game paused (the play button shows play, read as paused); five steps in order, each «الخطوة n من 5 · title»; «التالي»
// the one primary, naming the next step, the last «ابدأ الحملة» resuming at 1×; the skip and the close end the tour and say
// it stays in the help; each step rings exactly the HUD element it speaks about (a white 2 pt outline), visible, on
// screen and clear of the sheet, the sections' step none; the step texts agree with the HUD: the six indicators by their
// labels, the seven sections the dock's (names and icons), the speeds the speed menu's, the first news the toast's; no
// dialog and nothing dimming the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');
const STEPS = [['s1', 'بلدك', '.nation'], ['s2', 'المؤشرات', '.stats'], ['s3', 'الأقسام', null], ['s4', 'الوقت', '.date'], ['s5', 'الأحداث', '.toast']];
const HEAD = ['جولة البداية', 'اللعبة متوقفة · 1 يناير 2011'];
const T = {
  s1: 'أنت تحكم مصر من 1 يناير 2011. اضغط أي محافظة على الخريطة لتفتح بطاقتها، وأي دولة لتعرف حالها وعلاقتك بها.',
  s2: 'في الأعلى الخزينة والاستقرار والشرعية والقوة البشرية والنفوذ والبحث. السهم يبيّن الاتجاه؛ اضغط أي مؤشر لتعرف لماذا يتغير.',
  s3: 'تحكم من سبعة أقسام في الشريط السفلي:',
  s4: 'يمضي الوقت يومًا بعد يوم، من 1× إلى «أقصى». أوقفه متى شئت؛ ما تأمر به وأنت متوقف يُنفَّذ عند الاستئناف.',
  s5: 'أخبار العالم تصلك هنا، والقرارات المهمة توقف الوقت حتى تختار. أول خبر: احتجاجات واسعة في تونس.',
};
const BRIEF = Object.fromEntries(STEPS.map(([k, h], i) => [k, HEAD.concat(['الخطوة ' + (i + 1) + ' من 5 · ' + h, T[k], i < 4 ? 'التالي' : 'ابدأ الحملة', i < 4 ? STEPS[i + 1][1] : 'يستأنف الوقت بسرعة 1×'])]));
STEPS.slice(0, 4).forEach(([k]) => { BRIEF['reach_' + k] = ['تخطي الجولة', 'تعود إليها من المزيد › المساعدة']; });

const screenChecks = `
const { issues, qa, q, T, DATA, tab } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const B = (t) => q('.r-body[data-tab="' + t + '"]');
const ST = DATA.steps, i = ST.findIndex((s) => s[0] === tab), body = B(tab);
// header, emblem, close (the close skips the tour, the game stays paused)
if (W(T(q('.sheet .r-name'))) !== 'جولة البداية' || W(T(q('.sheet .r-sub'))) !== 'اللعبة متوقفة · 1 يناير 2011') issues.push('the header is not the start tour, paused, on 1 January 2011');
if (!q('.sheet .s-emb use[href="#i-tour"]')) issues.push('the emblem is not the tour\\'s');
if (q('.sheet .r-x').getAttribute('aria-label') !== 'تخطي الجولة، العودة إلى الخريطة واللعبة متوقفة') issues.push('a11y: the close does not say it skips the tour and the game stays paused');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal, [aria-modal="true"], .scrim, .dim')) issues.push('a dialog or a dimmer over the map (mapCentral)');
// the game paused: the play button shows play and is read as paused
{ const p = document.querySelector('.hud .play'); if (!p || !p.querySelector('use[href="#i-play"]') || p.getAttribute('aria-label') !== 'تشغيل (اللعبة متوقفة)') issues.push('the game is not shown paused (the play button)'); }
// the step: its number and title, its text the brief's
{ const h = W(T(body.querySelector('.r-sec h3'))); if (h !== 'الخطوة ' + (i + 1) + ' من 5 · ' + ST[i][1]) issues.push('the step heading is not «الخطوة ' + (i + 1) + ' من 5 · ' + ST[i][1] + '»: ' + h);
  if (W(T(body.querySelector('.d-text'))) !== DATA.text[tab]) issues.push('the step text is not the brief\\'s'); }
// the actions: one primary; «التالي» naming the next step, or «ابدأ الحملة» resuming at 1×; the skip on every step but the last
{ const prim = [...body.querySelectorAll('.r-first')]; const want = i < 4 ? ['التالي', ST[i + 1][1], 'التالي: ' + ST[i + 1][1] + '، الخطوة ' + (i + 2) + ' من 5'] : ['ابدأ الحملة', 'يستأنف الوقت بسرعة 1×', 'ابدأ الحملة: يستأنف الوقت بسرعة 1×'];
  if (prim.length !== 1 || W(T(prim[0].querySelector('.r-at b'))) !== want[0] || W(T(prim[0].querySelector('.r-at > span'))) !== want[1] || prim[0].getAttribute('aria-label') !== want[2]) issues.push('the primary is not «' + want[0] + ' · ' + want[1] + '» read as «' + want[2] + '»');
  const sk = body.querySelector('.r-link'); if ((i < 4) !== !!sk || (sk && (W(T(sk.querySelector('.r-at b'))) !== 'تخطي الجولة' || !/المساعدة/.test(sk.getAttribute('aria-label') || '')))) issues.push('the skip is missing, misplaced or does not say the tour stays in the help'); }
// the ring: exactly the step's HUD element, a white 2 pt outline; visible, on screen and clear of the sheet; none on the sections' step
{ const rings = qa('.hud *').filter((e) => { const c = getComputedStyle(e); return c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0 && e.getClientRects().length; });
  const want = ST[i][2], tgt = want && document.querySelector('.hud ' + want);
  if (!want) { if (rings.length) issues.push('a ring on the sections\\' step'); }
  else { if (rings.length !== 1 || rings[0] !== tgt) issues.push('the ring is not on the step\\'s element ' + want + ': ' + rings.map((e) => e.className).join(', '));
    const c = getComputedStyle(tgt); if (parseFloat(c.outlineWidth) !== 2 || c.outlineColor !== X.TOK.t1) issues.push('the ring is not a white 2 pt outline');
    const r = tgt.getBoundingClientRect(), o = parseFloat(c.outlineOffset) + 2, sh = q('.sheet').getBoundingClientRect();
    if (r.left - o < 0 || r.right + o > innerWidth || r.top - o < 0 || r.bottom + o > innerHeight) issues.push('the ringed element ' + want + ' runs off the screen');
    if (!(r.right + o <= sh.left || r.left - o >= sh.right || r.bottom + o <= sh.top || r.top - o >= sh.bottom)) issues.push('the ringed element ' + want + ' is under the sheet'); } }
// the texts agree with the HUD
if (tab === 's2') { const labels = qa('.hud .stat .lbl').map((e) => W(T(e))), t = DATA.text.s2;
  const named = ['الخزينة', 'الاستقرار', 'الشرعية', 'القوة البشرية', 'النفوذ', 'البحث']; if (named.join('|') !== labels.join('|')) issues.push('the indicators named are not the HUD\\'s: ' + labels.join('، '));
  named.forEach((n) => { if (!t.includes(n)) issues.push('the indicators text leaves out ' + n); }); }
if (tab === 's3') { const dock = [...document.querySelectorAll('.dock .dock-item')].filter((e) => W(T(e)) !== 'المزيد').map((e) => [e.querySelector('use').getAttribute('href'), W(T(e))]);
  const shown = [...body.querySelectorAll('.t-secs li')].map((e) => [e.querySelector('use').getAttribute('href'), W(T(e))]);
  if (JSON.stringify(dock) !== JSON.stringify(shown)) issues.push('the sections are not the dock\\'s seven, in its order, with its icons');
  if (!/سبعة أقسام/.test(DATA.text.s3) || dock.length !== 7) issues.push('the sections\\' count is not seven'); }
if (tab === 's4') { const rows = [...document.querySelectorAll('#speedmenu .mrow')].map((e) => W(T(e)));
  if (rows[1] !== '1×' || rows[rows.length - 1] !== 'أقصى' || !DATA.text.s4.includes('من 1× إلى «أقصى»')) issues.push('the speeds are not the speed menu\\'s, 1× to «أقصى»'); }
if (tab === 's5') { const tx = W(T(document.querySelector('.hud .alert-prev .txt'))); if (!DATA.text.s5.endsWith('أول خبر: ' + tx + '.')) issues.push('the first news is not the toast\\'s «' + tx + '»'); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'المزيد', tabs: STEPS.map((s) => s[0]), noTabs: true, fitTab: 's3', longTab: 's3',
  inputs: ['_build/tour.css', '../../shared/paused_hud.py'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [['.t-secs svg', 16]], size: [] },
  HEAD, BRIEF, screenChecks, DATA: { steps: STEPS, text: T },
  // no headline numbers, status table, «لماذا؟», chip or arrowed value here, and the section colour is the «المزيد» grey:
  // those generic plants move to the tour's own targets below or do not apply
  skipGeneric: ['section colour on data', 'section colour on a rule', 'closed dock item coloured', 'brief text hidden', '18 pt misuse', 'gap', 'text overlap', 'clipped text', 'faint text', 'why without its subject', 'amber value without its icon', 'chip arrow against its sign', '% before its number', 'text into a control', 'emblem drawn grey', 'chip not white', 'hint chevron missing (no tabs)', 'hint over the content (no tabs)'],
  cases: (d, se) => [
    ['brief text hidden (s1)', d, '&tab=s1', '', /brief text not fully visible/, () => { document.querySelector('.r-body[data-tab="s1"] .d-text').style.opacity = '0'; }],
    ['18 pt misuse (s1)', d, '&tab=s1', '.d-text { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['text overlap (s1)', d, '&tab=s1', '.r-body[data-tab="s1"] .r-act .r-at > span { transform: translateY(-14px) !important; }', /text overlap|icon over text|hit overlap/],
    ['clipped text (s1)', d, '&tab=s1', '.r-body[data-tab="s1"] .r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding/],
    ['faint text (s1)', d, '&tab=s1', '.d-text { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['gap (s1)', d, '&tab=s1', '.r-body[data-tab="s1"] { gap: 6px !important; }', /gap 6 on/],
    ['% before its number (s1)', d, '&tab=s1', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="s1"] .d-text').textContent = 'نسبة 20%'; }],
    ['hint chevron missing (forced overflow)', se, '&tab=s1', '.r-body[data-tab="s1"] > :first-child { margin-top: 200px !important; } .r-hint { display: none !important; }', /scroll hint chevron missing with content below/, () => { document.documentElement.dataset.fbot = '1'; }],
    ['hint over the content (forced overflow)', se, '&tab=s1', '.r-body[data-tab="s1"] > :first-child { margin-top: 200px !important; } .r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/, () => { document.documentElement.dataset.fbot = '1'; }],
    ['text into a control (header)', d, '&tab=s1', '.r-sub { position: relative; left: -170px; }', /text over a control/],
    ['two steps shown', d, '&tab=s2', '.r-body[data-tab="s1"] { display: flex !important; }', /tab bodies shown/],
    ['header off', d, '&tab=s1', '', /the header is not the start tour/, () => { document.querySelector('.r-sub').textContent = 'الخطوة الأولى'; }],
    ['emblem off', d, '&tab=s1', '', /the emblem is not the tour's/, () => { document.querySelector('.s-emb use').setAttribute('href', '#i-more'); }],
    ['close unclear', d, '&tab=s1', '', /a11y: the close does not say it skips the tour/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['a dimmer', d, '&tab=s1', '', /a dialog or a dimmer over the map/, () => { const e = document.createElement('div'); e.className = 'scrim'; document.body.appendChild(e); }],
    ['game running', d, '&tab=s1', '', /the game is not shown paused/, () => { document.querySelector('.hud .play use').setAttribute('href', '#i-pause'); }],
    ['step heading off', d, '&tab=s2', '', /the step heading is not «الخطوة 2 من 5 · المؤشرات»/, () => { document.querySelector('.r-body[data-tab="s2"] h3').innerHTML = 'الخطوة <span class="ltr">3</span> من <span class="ltr">5</span> · المؤشرات'; }],
    ['step text off', d, '&tab=s1', '', /the step text is not the brief's/, () => { document.querySelector('.r-body[data-tab="s1"] .d-text').textContent = 'أنت تحكم مصر.'; }],
    ['next unnamed', d, '&tab=s1', '', /the primary is not «التالي · المؤشرات»/, () => { document.querySelector('.r-body[data-tab="s1"] .r-act').setAttribute('aria-label', 'التالي'); }],
    ['last step without start', d, '&tab=s5', '', /the primary is not «ابدأ الحملة/, () => { document.querySelector('.r-body[data-tab="s5"] .r-act .r-at b').textContent = 'التالي'; }],
    ['skip gone', d, '&tab=s2', '', /the skip is missing/, () => { document.querySelector('.r-body[data-tab="s2"] .r-link').remove(); }],
    ['ring on the wrong element', d, '&tab=s2', '.hud .stats { outline: none !important; } .hud .nation { outline: 2px solid #EAF2F7 !important; }', /the ring is not on the step's element \.stats/],
    ['ring not white', d, '&tab=s4', '.hud .date { outline-color: #7FE9FF !important; }', /the ring is not a white 2 pt outline/],
    ['ring on the sections step', d, '&tab=s3', '.hud .dock { outline: 2px solid #EAF2F7 !important; }', /a ring on the sections' step/],
    ['ringed under the sheet', d, '&tab=s1', '.hud .nation { position: fixed !important; top: 200px !important; right: 40px !important; }', /the ringed element \.nation is under the sheet/],
    ['indicators off', d, '&tab=s2', '', /the indicators named are not the HUD's/, () => { document.querySelector('.hud .stat .lbl').textContent = 'المال'; }],
    ['sections off', d, '&tab=s3', '', /the sections are not the dock's seven/, () => { const l = document.querySelector('.t-secs'); l.appendChild(l.firstElementChild); }],
    ['speeds off', d, '&tab=s4', '', /the speeds are not the speed menu's/, () => { const r = document.querySelectorAll('#speedmenu .mrow'); r[r.length - 1].querySelector('span').textContent = '20×'; }],
    ['first news off', d, '&tab=s5', '', /the first news is not the toast's/, () => { document.querySelector('.hud .alert-prev .txt').textContent = 'انتخابات في السودان'; }],
  ],
});
