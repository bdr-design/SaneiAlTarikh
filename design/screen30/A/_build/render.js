// Screen 30 variant A (the start tour, «جولة البداية»; onboarding): render the iPhones and run the checks with the shared
// panel checker (design/shared/check/panelcheck.js), in the «المزيد» section. This file adds the tour's own rules: the
// game paused (the play button shows play, read as paused); five steps in order, each «الخطوة n من 5 · title»; each step
// body holds exactly its text, one primary (with its bar) and, on steps 1 to 4, the skip; «التالي» names the next step,
// the last «ابدأ الحملة» opens the first decision; the skip and the close end the tour and say it stays in the help
// (المزيد › حول › المساعدة); each step rings exactly the HUD element it speaks about, and nothing else on the page is
// ringed (any outline, or a white border or shadow of 1 pt or more, on an element or its ::before or ::after, the map
// included) and no layer is added: a solid white 2 pt outline 3 pt outside and no second white ring on it,
// the element inside the side insets, the ring on screen and clear of the sheet, the sections' step none; the step texts
// agree with the HUD: the date and the country, the six indicators by their labels, the dock's eight sections (names
// and icons, two rows of four), the speed button and the speed menu, the first decision the alert's and the bell; no
// dialog and nothing dimming the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');
const STEPS = [['s1', 'بلدك', '.nation'], ['s2', 'المؤشرات', '.stats'], ['s3', 'الأقسام', null], ['s4', 'الوقت', '.date'], ['s5', 'الأحداث', '.toast']];
const HEAD = ['جولة البداية', 'اللعبة متوقفة · 1 يناير 2011'];
const T = {
  s1: 'أنت تحكم مصر من 1 يناير 2011، وبطاقة مصر في الأعلى تفتح لوحة الدولة. اضغط أي محافظة في مصر لتفتح بطاقتها، وأي دولة أخرى لتعرف حالها وعلاقتك بها.',
  s2: 'في الأعلى الخزينة والاستقرار والشرعية والقوة البشرية والنفوذ والبحث. السهم يبيّن الاتجاه؛ اضغط أي مؤشر لتعرف لماذا يتغير.',
  s3: 'تحكم من ثمانية أقسام في الشريط السفلي:',
  s4: 'يمضي الوقت يومًا بعد يوم. اضغط 1× لتختار السرعة حتى «أقصى»، وزر التشغيل والإيقاف لتوقفه متى شئت؛ ما تأمر به والوقت متوقف يُنفَّذ عند الاستئناف.',
  s5: 'الأخبار تصلك هنا، والجرس يجمع كل الإشعارات. القرارات العاجلة توقف الوقت حتى تختار أو تؤجلها، وهذا الخبر أول قرار ينتظرك.',
};
const LAST = ['ابدأ الحملة', 'يفتح أول قرار: احتجاجات في تونس', 'ابدأ الحملة: يفتح أول قرار، احتجاجات في تونس'];
const HELP = 'تعود إليها من المزيد › حول › المساعدة';
const CLOSE = 'تخطي الجولة، تعود إليها من المزيد، حول، المساعدة. ثم يفتح أول قرار، احتجاجات في تونس';
const DECISION = 'احتجاجات في تونس';   // screen 15's title
const BRIEF = Object.fromEntries(STEPS.map(([k, h], i) => [k, HEAD.concat(['الخطوة ' + (i + 1) + ' من 5 · ' + h, T[k], i < 4 ? 'التالي' : LAST[0], i < 4 ? STEPS[i + 1][1] : LAST[1]])]));
STEPS.slice(0, 4).forEach(([k]) => { BRIEF['reach_' + k] = ['تخطي الجولة', HELP]; });

const screenChecks = `
const { issues, qa, q, T, DATA, tab } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const B = (t) => q('.r-body[data-tab="' + t + '"]');
const ST = DATA.steps, i = ST.findIndex((s) => s[0] === tab), body = B(tab);
// header, emblem, close (the close skips the tour, the game stays paused)
if (W(T(q('.sheet .r-name'))) !== 'جولة البداية' || W(T(q('.sheet .r-sub'))) !== 'اللعبة متوقفة · 1 يناير 2011') issues.push('the header is not the start tour, paused, on 1 January 2011');
if (!q('.sheet .s-emb use[href="#i-tour"]')) issues.push('the emblem is not the tour\\'s');
if (q('.sheet .r-x').getAttribute('aria-label') !== DATA.close || !/المزيد، حول، المساعدة/.test(q('.sheet .r-x').getAttribute('aria-label') || '')) issues.push('a11y: the close does not say it skips the tour, stays in the help and the game stays paused');
// the header's and step 1's date and country are the HUD's
{ const dmy = W(T(document.querySelector('.hud .date .dmy'))), nm = W(T(document.querySelector('.hud .nation .nm')));
  if (!W(T(q('.sheet .r-sub'))).endsWith(' · ' + dmy)) issues.push('the header\\'s date is not the HUD\\'s «' + dmy + '»');
  if (tab === 's1' && !DATA.text.s1.startsWith('أنت تحكم ' + nm + ' من ' + dmy + '،')) issues.push('step 1\\'s country and date are not the HUD\\'s «' + nm + '», «' + dmy + '»'); }
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal, [aria-modal="true"], .scrim, .dim')) issues.push('a dialog or a dimmer over the map (mapCentral)');
// the game paused: the play button shows play and is read as paused
{ const p = document.querySelector('.hud .play'); if (!p || !p.querySelector('use[href="#i-play"]') || p.getAttribute('aria-label') !== 'تشغيل (اللعبة متوقفة)') issues.push('the game is not shown paused (the play button)'); }
// the step: its number and title, its text the brief's
{ const h = W(T(body.querySelector('.r-sec h3'))); if (h !== 'الخطوة ' + (i + 1) + ' من 5 · ' + ST[i][1]) issues.push('the step heading is not «الخطوة ' + (i + 1) + ' من 5 · ' + ST[i][1] + '»: ' + h);
  if (W(T(body.querySelector('.d-text'))) !== DATA.text[tab]) issues.push('the step text is not the brief\\'s'); }
// the body: exactly its text section, one primary and (steps 1 to 4) the skip, in that order; the primary's white bar drawn
{ const kids = [...body.children].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.matches('.r-sec') ? 'sec' : e.matches('.r-act.r-first') ? 'primary' : e.matches('.r-link') ? 'skip' : (e.className || e.tagName));
  const want = i < 4 ? 'sec,primary,skip' : 'sec,primary'; if (kids.join(',') !== want) issues.push('the step body is not «' + want + '»: ' + kids.join(','));
  // and nothing more inside: the controls are the primary and the skip; the text section holds its heading, its text and (s3) the list
  const tapSel = 'button, a, .tap, input, select, textarea, summary, label, [onclick], [tabindex]:not([tabindex="-1"]), [contenteditable]:not([contenteditable="false"]), '
    + ['button', 'link', 'tab', 'menuitem', 'menuitemradio', 'menuitemcheckbox', 'switch', 'checkbox', 'radio', 'option', 'slider', 'combobox', 'textbox', 'searchbox', 'spinbutton'].map((r) => '[role="' + r + '"]').join(', ');
  const cand = [...body.querySelectorAll('*')].filter((e) => e.getClientRects().length && (e.matches(tapSel) || getComputedStyle(e).cursor === 'pointer'));
  const ctl = cand.filter((e) => !cand.some((o) => o !== e && o.contains(e)));   // a tappable thing counted once, at its outermost element
  if (ctl.length !== (i < 4 ? 2 : 1)) issues.push('the step body holds ' + ctl.length + ' controls, not ' + (i < 4 ? 2 : 1));
  const sec = body.querySelector('.r-sec'), inSec = sec ? [...sec.children].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.tagName === 'H3' ? 'h3' : e.matches('p.d-text') ? 'text' : e.matches('ul.t-secs') ? 'list' : (e.className || e.tagName)) : [];
  if (inSec.join(',') !== (tab === 's3' ? 'h3,text,list' : 'h3,text')) issues.push('the step text section is not its heading and text: ' + inSec.join(','));
  const pf = body.querySelector('.r-first'); if (pf) { const a = getComputedStyle(pf, '::after'); if (a.content === 'none' || a.display === 'none' || a.visibility === 'hidden' || parseFloat(a.opacity) < 0.99 || a.backgroundColor !== X.TOK.t1 || (parseFloat(a.width) || 0) <= 0 || (parseFloat(a.height) || 0) <= 0) issues.push('the primary\\'s white bar is not drawn'); } }
// the actions: one primary; «التالي» naming the next step, or «ابدأ الحملة» opening the first decision; the skip on every step but the last
{ const prim = [...body.querySelectorAll('.r-first')]; const want = i < 4 ? ['التالي', ST[i + 1][1], 'التالي: ' + ST[i + 1][1] + '، الخطوة ' + (i + 2) + ' من 5'] : DATA.last;
  if (prim.length !== 1 || W(T(prim[0].querySelector('.r-at b'))) !== want[0] || W(T(prim[0].querySelector('.r-at > span'))) !== want[1] || prim[0].getAttribute('aria-label') !== want[2]) issues.push('the primary is not «' + want[0] + ' · ' + want[1] + '» read as «' + want[2] + '»');
  const sk = body.querySelector('.r-link'); if ((i < 4) !== !!sk || (sk && (W(T(sk.querySelector('.r-at b'))) !== 'تخطي الجولة' || W(T(sk.querySelector('.r-at > span'))) !== DATA.help || sk.getAttribute('aria-label') !== 'تخطي الجولة: تعود إليها من المزيد، حول، المساعدة. ثم يفتح أول قرار، ' + DATA.decision))) issues.push('the skip is missing, misplaced or does not say the tour stays in the help and the first decision follows'); }
// the ring: exactly the step's HUD element, and nothing else on the page ringed (an outline, a box-shadow spread or a white
// border, the map included); a solid white 2 pt outline 3 pt outside; the element inside the side insets, the ring on
// screen and clear of the sheet; none on the sections' step. A ring may be drawn by the element or its ::before or ::after,
// by any outline, or a border, box-shadow layer (1 pt spread, or 2 pt blur), drop-shadow, border image or SVG stroke in any
// colour that is visible (alpha ≥ 0.3) and not dark, on any element, its ::before or ::after, the map's included, and a
// sheet part that paints outside the sheet; the HUD's own shadows are dark and its hairlines under 0.25, so they are not rings
{ const white = (c) => c === X.TOK.t1;
  // any CSS colour, read as sRGB and alpha by painting it on a 1×1 canvas (rgb, color(), oklch, lab, display-p3 alike)
  const cv = document.createElement('canvas'); cv.width = cv.height = 1; const cx = cv.getContext('2d', { willReadFrequently: true }), seenCol = new Map();
  const whiteish = (col) => { if (!col || col === 'transparent' || col === 'none') return false; if (seenCol.has(col)) return seenCol.get(col);
    cx.clearRect(0, 0, 1, 1); cx.fillStyle = 'rgba(0, 0, 0, 0)'; cx.fillStyle = col; cx.fillRect(0, 0, 1, 1); const [r, g, b, a] = cx.getImageData(0, 0, 1, 1).data;
    // a ring colour: visible (alpha ≥ 0.3) and not dark (the HUD's own shadows and halos are dark; its hairlines, the flags'
    // rim and the speed button's edge, are under 0.25)
    const w = a >= 77 && Math.max(r, g, b) > 60; seenCol.set(col, w); return w; };
  const layers = (bs) => { const out = []; let depth = 0, cur = ''; for (const ch of bs) { if (ch === '(') depth++; if (ch === ')') depth--; if (ch === ',' && !depth) { out.push(cur); cur = ''; } else cur += ch; } if (cur.trim()) out.push(cur); return out; };
  const ringStyle = (c) => { if (!c || c.display === 'none' || c.visibility === 'hidden') return false;
    if (c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) > 0) return true;
    if (c.boxShadow && c.boxShadow !== 'none' && layers(c.boxShadow).some((l) => { const col = (/[a-z-]+\\([^()]*(\\([^()]*\\)[^()]*)*\\)/.exec(l) || [''])[0], px = l.replace(col, '').match(/-?[\\d.]+px/g) || []; return whiteish(col) && px.length >= 3 && (parseFloat(px[3] || '0') >= 1 || parseFloat(px[2]) >= 2); })) return true;
    // a white drop-shadow filter or any border image paints a ring too
    if (c.filter && c.filter !== 'none' && (c.filter.match(/drop-shadow\\(([^()]*(\\([^()]*\\))?[^()]*)\\)/g) || []).some((f) => whiteish((/[a-z-]+\\([^()]*\\)/.exec(f.slice(12)) || [''])[0]))) return true;
    if (c.borderImageSource && c.borderImageSource !== 'none') return true;
    return ['Top', 'Right', 'Bottom', 'Left'].some((sd) => parseFloat(c['border' + sd + 'Width']) >= 1 && c['border' + sd + 'Style'] !== 'none' && whiteish(c['border' + sd + 'Color'])); };
  const ringed = (e) => { if (!e.getClientRects().length || getComputedStyle(e).visibility === 'hidden') return false;
    if (ringStyle(getComputedStyle(e))) return true;
    return ['::before', '::after'].some((ps) => { const c = getComputedStyle(e, ps); return c.content !== 'none' && c.content !== 'normal' && ringStyle(c); }); };
  // no added layer: the page's top level is the icon sprite, the map, the HUD (the sheet inside it) and the device frame
  // (the sprite is known by its content: only <symbol> and <defs>), and the device frame holds only its own parts
  const sprite = (e) => e.tagName.toLowerCase() === 'svg' && [...e.children].every((k) => /^(symbol|defs)$/i.test(k.tagName));
  const added = (e, ok) => !/^(SCRIPT|STYLE|LINK)$/.test(e.tagName) && !ok(e);
  [...document.body.children].filter((e) => added(e, (x) => x.matches('.map, .hud, .dev') || sprite(x)))
    .concat([...(document.querySelector('.dev') || document.createElement('i')).children].filter((e) => added(e, (x) => x.matches('.corners, .cutout, .homebar, .safe'))))
    .forEach((e) => issues.push('a layer added over the page: ' + (e.className && e.className.baseVal !== undefined ? e.tagName : (e.className || e.tagName))));
  [document.documentElement, document.body].forEach((e) => ['::before', '::after'].forEach((ps) => { const c = getComputedStyle(e, ps); if (c.content !== 'none' && c.content !== 'normal') issues.push('a layer added over the page: ' + e.tagName.toLowerCase() + ps); }));
  // a drawn SVG shape outside the icon sprite with a visible, not dark stroke is a ring too (the map's dots are stroked dark)
  const shaped = (e) => /^(rect|circle|ellipse|path|polygon|polyline|line)$/i.test(e.tagName) && !e.closest('symbol, defs') && e.getClientRects().length
    && whiteish(getComputedStyle(e).stroke) && parseFloat(getComputedStyle(e).strokeWidth) >= 1;
  // the sheet's own parts count only where they paint outside the sheet
  const shR = q('.sheet').getBoundingClientRect();
  const outside = (e) => { const r = e.getBoundingClientRect(); return r.left < shR.left - 8 || r.right > shR.right + 8 || r.top < shR.top - 8 || r.bottom > shR.bottom + 8; };
  const rings = [...document.body.querySelectorAll('*')].filter((e) => (!e.closest('.sheet') || outside(e)) && (ringed(e) || shaped(e)));
  const want = ST[i][2], tgt = want && document.querySelector('.hud ' + want);
  if (!want) { if (rings.length) issues.push('a ring on the sections\\' step: ' + rings.map((e) => e.className || e.tagName).join(', ')); }
  else { if (rings.length !== 1 || rings[0] !== tgt) issues.push('the ring is not on the step\\'s element ' + want + ' alone: ' + rings.map((e) => e.className || e.tagName).join(', '));
    const noOutline = (cs) => ringStyle(Object.assign({}, { display: cs.display, visibility: cs.visibility, outlineStyle: 'none', outlineWidth: '0px', boxShadow: cs.boxShadow,
      borderTopWidth: cs.borderTopWidth, borderRightWidth: cs.borderRightWidth, borderBottomWidth: cs.borderBottomWidth, borderLeftWidth: cs.borderLeftWidth,
      borderTopStyle: cs.borderTopStyle, borderRightStyle: cs.borderRightStyle, borderBottomStyle: cs.borderBottomStyle, borderLeftStyle: cs.borderLeftStyle,
      borderTopColor: cs.borderTopColor, borderRightColor: cs.borderRightColor, borderBottomColor: cs.borderBottomColor, borderLeftColor: cs.borderLeftColor }));
    if (noOutline(getComputedStyle(tgt)) || ['::before', '::after'].some((ps) => { const pc = getComputedStyle(tgt, ps); return pc.content !== 'none' && pc.content !== 'normal' && ringStyle(pc); })) issues.push('the step\\'s element ' + want + ' carries a second white ring besides its outline');
    const c = getComputedStyle(tgt); if (c.outlineStyle !== 'solid' || parseFloat(c.outlineWidth) !== 2 || parseFloat(c.outlineOffset) !== 3 || c.outlineColor !== X.TOK.t1) issues.push('the ring is not a solid white 2 pt outline 3 pt outside');
    const r = tgt.getBoundingClientRect(), o = parseFloat(c.outlineOffset) + parseFloat(c.outlineWidth), sh = q('.sheet').getBoundingClientRect(), S = +(new URLSearchParams(location.search).get('side') || 0);
    if (r.left < S - 0.5 || r.right > innerWidth - S + 0.5) issues.push('the ringed element ' + want + ' is not inside the side insets');
    if (r.left - o < 0 || r.right + o > innerWidth || r.top - o < 0 || r.bottom + o > innerHeight) issues.push('the ringed element ' + want + ' runs off the screen');
    if (!(r.right + o <= sh.left || r.left - o >= sh.right || r.bottom + o <= sh.top || r.top - o >= sh.bottom)) issues.push('the ringed element ' + want + ' is under the sheet'); } }
// the texts agree with the HUD
if (tab === 's2') { const labels = qa('.hud .stat .lbl').map((e) => W(T(e))), t = DATA.text.s2;
  const named = ['الخزينة', 'الاستقرار', 'الشرعية', 'القوة البشرية', 'النفوذ', 'البحث']; if (named.join('|') !== labels.join('|')) issues.push('the indicators named are not the HUD\\'s: ' + labels.join('، '));
  named.forEach((n) => { if (!t.includes(n)) issues.push('the indicators text leaves out ' + n); }); }
if (tab === 's3') { const dock = [...document.querySelectorAll('.dock .dock-item')].map((e) => [e.querySelector('use').getAttribute('href'), W(T(e))]);
  const items = [...body.querySelectorAll('.t-secs li')], shown = items.map((e) => [e.querySelector('use').getAttribute('href'), W(T(e))]);
  if (JSON.stringify(dock) !== JSON.stringify(shown)) issues.push('the sections are not the dock\\'s eight, in its order, with its icons');
  if (!/ثمانية أقسام/.test(DATA.text.s3) || dock.length !== 8 || !/الثمانية/.test(body.querySelector('.t-secs').getAttribute('aria-label') || '')) issues.push('the sections\\' count is not eight');
  const tops = new Set(items.map((e) => Math.round(e.getBoundingClientRect().top))); if (tops.size !== 2) issues.push('the sections are not two rows of four: ' + tops.size + ' rows'); }
if (tab === 's4') { const rows = [...document.querySelectorAll('#speedmenu .mrow')].map((e) => W(T(e))), spd = W(T(document.querySelector('.hud .spd')));
  if (rows[1] !== '1×' || rows[rows.length - 1] !== 'أقصى' || spd !== '1×' || !DATA.text.s4.includes('اضغط ' + spd + ' لتختار السرعة حتى «' + rows[rows.length - 1] + '»') || !/وزر التشغيل والإيقاف لتوقفه/.test(DATA.text.s4)) issues.push('the speeds are not the speed button\\'s and menu\\'s, 1× to «أقصى», or the pause is not named'); }
if (tab === 's5') { const tx = W(T(document.querySelector('.hud .alert-prev .txt')));
  // the ringed alert is the first decision: its words carry the decision's title (screen 15), which the primary names
  if (!DATA.text.s5.endsWith('وهذا الخبر أول قرار ينتظرك.') || DATA.decision.split(' ').some((w) => !tx.split(' ').includes(w)) || !DATA.last[1].endsWith(': ' + DATA.decision)) issues.push('the first decision is not the alert\\'s «' + tx + '»');
  if (!/الجرس/.test(DATA.text.s5) || !document.querySelector('.hud .toast .bell')) issues.push('the step does not name the bell its ring holds'); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'المزيد', tabs: STEPS.map((s) => s[0]), noTabs: true, fitTab: 's3', longTab: 's3',
  inputs: ['_build/tour.css', '../../shared/paused_hud.py'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [['.t-secs svg', 16]], size: [] },
  HEAD, BRIEF, screenChecks, DATA: { steps: STEPS, text: T, last: LAST, help: HELP, close: CLOSE, decision: DECISION },
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
    ['ring not white', d, '&tab=s4', '.hud .date { outline-color: #7FE9FF !important; }', /the ring is not a solid white 2 pt outline/],
    ['ring at offset 0', d, '&tab=s1', '.hud .nation { outline-offset: 0px !important; }', /the ring is not a solid white 2 pt outline 3 pt outside/],
    ['ring dashed', d, '&tab=s5', '.hud .toast { outline-style: dashed !important; }', /the ring is not a solid white 2 pt outline/],
    ['second ring by shadow', d, '&tab=s2', '.hud .nation { box-shadow: 0 0 0 5px #EAF2F7 !important; }', /the ring is not on the step's element \.stats alone/],
    ['second ring by border', d, '&tab=s4', '.hud .toast { border: 2px solid #EAF2F7 !important; }', /the ring is not on the step's element \.date alone/],
    ['ring over the map', d, '&tab=s3', '', /a ring on the sections' step/, () => { const e = document.createElement('div'); e.style.cssText = 'position:fixed;left:300px;top:150px;width:120px;height:80px;outline:2px solid #EAF2F7;outline-offset:3px'; document.body.appendChild(e); }],
    ['map outlined', d, '&tab=s3', '.map { outline: 2px solid #EAF2F7 !important; outline-offset: -40px !important; }', /a ring on the sections' step/],
    ['extra action row', d, '&tab=s1', '', /the step body is not «sec,primary,skip»/, () => { const b = document.querySelector('.r-body[data-tab="s1"]'), a = b.querySelector('.r-act').cloneNode(true); a.classList.remove('r-first'); b.insertBefore(a, b.querySelector('.r-link')); }],
    ['primary bar hidden', d, '&tab=s1', '.r-first::after { content: none !important; }', /the primary's white bar is not drawn/],
    ['close without the help', d, '&tab=s1', '', /a11y: the close does not say it skips the tour, stays in the help/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'تخطي الجولة، العودة إلى الخريطة واللعبة متوقفة'); }],
    ['skip without the decision', d, '&tab=s1', '', /the skip is missing, misplaced or does not say the tour stays in the help/, () => { document.querySelector('.r-body[data-tab="s1"] .r-link').setAttribute('aria-label', 'تخطي الجولة: تعود إليها من المزيد، حول، المساعدة. يغلق الجولة واللعبة متوقفة'); }],
    ['skip naming another decision', d, '&tab=s1', '', /the skip is missing, misplaced or does not say the tour stays in the help/, () => { document.querySelector('.r-body[data-tab="s1"] .r-link').setAttribute('aria-label', 'تخطي الجولة: تعود إليها من المزيد، حول، المساعدة. ثم يفتح أول قرار، انتخابات في السودان'); }],
    ['control inside the text', d, '&tab=s1', '', /the step body holds 3 controls|the step text section is not/, () => { const b = document.createElement('button'); b.className = 'tap'; b.textContent = 'زر'; b.setAttribute('aria-label', 'زر'); document.querySelector('.r-body[data-tab="s1"] .r-sec').appendChild(b); }],
    ['second paragraph', d, '&tab=s1', '', /the step text section is not its heading and text/, () => { const p = document.createElement('p'); p.className = 'd-text'; p.textContent = 'نص إضافي'; document.querySelector('.r-body[data-tab="s1"] .r-sec').appendChild(p); }],
    ['ring by a pseudo-element', d, '&tab=s3', '.hud .date { position: relative; } .hud .date::after { content: ""; position: absolute; inset: -5px; border: 2px solid #EAF2F7; }', /a ring on the sections' step/],
    ['ring by an offset shadow', d, '&tab=s2', '.hud .nation { box-shadow: 0 1px 0 3px rgba(234, 242, 247, .9) !important; }', /the ring is not on the step's element \.stats alone/],
    ['inset white ring', d, '&tab=s2', '.hud .nation { box-shadow: inset 0 0 0 2px #EAF2F7 !important; }', /the ring is not on the step's element \.stats alone/],
    ['1 pt white ring', d, '&tab=s2', '.hud .nation { box-shadow: 0 0 0 1px #EAF2F7 !important; }', /the ring is not on the step's element \.stats alone/],
    ['ring in color-mix', d, '&tab=s4', '.hud .toast { box-shadow: 0 0 0 2px color-mix(in srgb, #EAF2F7 80%, transparent) !important; }', /the ring is not on the step's element \.date alone/],
    ['second ring on the step element', d, '&tab=s2', '.hud .stats { box-shadow: 0 0 0 8px #EAF2F7 !important; }', /carries a second white ring besides its outline/],
    ['text as a link', d, '&tab=s1', '', /the step body holds 3 controls/, () => { const t = document.querySelector('.r-body[data-tab="s1"] .d-text'); t.innerHTML = '<span role="link" tabindex="0">' + t.innerHTML + '</span>'; }],
    ['SVG ring layer', d, '&tab=s2', '', /a layer added over the page/, () => { const n = document.querySelector('.hud .nation').getBoundingClientRect(), ns = 'http://www.w3.org/2000/svg', v = document.createElementNS(ns, 'svg'); v.setAttribute('style', 'position:fixed;left:' + (n.left - 5) + 'px;top:' + (n.top - 5) + 'px;width:' + (n.width + 10) + 'px;height:' + (n.height + 10) + 'px'); const r = document.createElementNS(ns, 'rect'); r.setAttribute('x', 1); r.setAttribute('y', 1); r.setAttribute('width', n.width + 8); r.setAttribute('height', n.height + 8); r.setAttribute('fill', 'none'); r.setAttribute('stroke', '#EAF2F7'); r.setAttribute('stroke-width', 2); v.appendChild(r); document.body.appendChild(v); }],
    ['zero-size SVG ring', d, '&tab=s2', '', /a layer added over the page/, () => { const n = document.querySelector('.hud .nation').getBoundingClientRect(), ns = 'http://www.w3.org/2000/svg', v = document.createElementNS(ns, 'svg'); v.setAttribute('style', 'position:fixed;left:0;top:0;width:0;height:0;overflow:visible'); const r = document.createElementNS(ns, 'rect'); r.setAttribute('x', n.left - 5); r.setAttribute('y', n.top - 5); r.setAttribute('width', n.width + 10); r.setAttribute('height', n.height + 10); r.setAttribute('fill', 'none'); r.setAttribute('stroke', '#EAF2F7'); r.setAttribute('stroke-width', 2); v.appendChild(r); document.body.appendChild(v); }],
    ['layer in the device frame', d, '&tab=s2', '', /a layer added over the page/, () => { const e = document.createElement('div'); e.style.cssText = 'position:absolute;left:100px;top:100px;width:50px;height:50px;border:2px solid #EAF2F7'; document.querySelector('.dev').appendChild(e); }],
    ['body pseudo ring', d, '&tab=s3', 'body::after { content: ""; position: fixed; left: 300px; top: 150px; width: 80px; height: 40px; border: 2px solid #EAF2F7; }', /a layer added over the page: body::after/],
    ['display-p3 ring', d, '&tab=s2', '.hud .nation { box-shadow: 0 0 0 2px color(display-p3 1 1 1) !important; }', /the ring is not on the step's element \.stats alone/],
    ['drop-shadow ring', d, '&tab=s2', '.hud .nation { filter: drop-shadow(2px 0 0 #EAF2F7) drop-shadow(-2px 0 0 #EAF2F7) !important; }', /the ring is not on the step's element \.stats alone/],
    ['white glow', d, '&tab=s2', '.hud .nation { box-shadow: 0 0 6px 0 #fff !important; }', /the ring is not on the step's element \.stats alone/],
    ['text made clickable', d, '&tab=s1', '.r-body[data-tab="s1"] .d-text { cursor: pointer !important; }', /the step body holds 3 controls/],
    ['SVG ring in the map', d, '&tab=s3', '', /a ring on the sections' step/, () => { const ns = 'http://www.w3.org/2000/svg', v = document.createElementNS(ns, 'svg'); v.setAttribute('viewBox', '0 0 1688 1097'); v.setAttribute('style', 'position:absolute;inset:0;width:100%;height:100%'); const c = document.createElementNS(ns, 'ellipse'); [['cx', 760], ['cy', 640], ['rx', 130], ['ry', 110], ['fill', 'none'], ['stroke', '#EAF2F7'], ['stroke-width', 4]].forEach(([k, v2]) => c.setAttribute(k, v2)); v.appendChild(c); document.querySelector('.map').appendChild(v); }],
    ['SVG ring in the frame', d, '&tab=s1', '', /the ring is not on the step's element \.nation alone/, () => { const ns = 'http://www.w3.org/2000/svg', v = document.createElementNS(ns, 'svg'); v.setAttribute('style', 'position:absolute;left:300px;top:150px;width:120px;height:80px'); const c = document.createElementNS(ns, 'rect'); [['x', 2], ['y', 2], ['width', 116], ['height', 76], ['fill', 'none'], ['stroke', '#EAF2F7'], ['stroke-width', 2]].forEach(([k, v2]) => c.setAttribute(k, v2)); v.appendChild(c); document.querySelector('.dev .safe').appendChild(v); }],
    ['ring from inside the sheet', d, '&tab=s2', '', /the ring is not on the step's element \.stats alone/, () => { const n = document.querySelector('.hud .nation').getBoundingClientRect(), e = document.createElement('div'); e.style.cssText = 'position:fixed;left:' + (n.left - 5) + 'px;top:' + (n.top - 5) + 'px;width:' + (n.width + 10) + 'px;height:' + (n.height + 10) + 'px;border:2px solid #EAF2F7;box-sizing:border-box;pointer-events:none'; document.querySelector('.sheet .r-in').appendChild(e); }],
    ['cyan second ring', d, '&tab=s2', '.hud .nation { box-shadow: 0 0 0 2px #7FE9FF !important; }', /the ring is not on the step's element \.stats alone/],
    ['primary bar faded', d, '&tab=s1', '.r-first::after { opacity: 0 !important; }', /the primary's white bar is not drawn/],
    ['skip path without «حول»', d, '&tab=s2', '', /the skip is missing, misplaced or does not say the tour stays in the help/, () => { document.querySelector('.r-body[data-tab="s2"] .r-link .r-at > span').textContent = 'تعود إليها من المزيد › المساعدة'; }],
    ['HUD date changed', d, '&tab=s1', '', /the header's date is not the HUD's/, () => { document.querySelector('.hud .date .dmy').textContent = '14 يناير 2011'; }],
    ['HUD country changed', d, '&tab=s1', '', /step 1's country and date are not the HUD's/, () => { document.querySelector('.hud .nation .nm').textContent = 'تونس'; }],
    ['HUD speed changed', d, '&tab=s4', '', /the speeds are not the speed button's/, () => { const w = document.createTreeWalker(document.querySelector('.hud .spd'), NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) n.textContent = n.textContent.replace('1×', '2×'); }],
    ['ringed element in the inset', d, '&tab=s1', '.hud .nation { position: relative !important; left: 30px !important; }', /is not inside the side insets|runs off the screen/],
    ['sections in three columns', d, '&tab=s3', '.t-secs { grid-template-columns: repeat(3, 1fr) !important; }', /the sections are not two rows of four/],
    ['bell not named', d, '&tab=s5', '', /the step does not name the bell/, () => { document.querySelector('.hud .toast .bell').remove(); }],
    ['ring on the sections step', d, '&tab=s3', '.hud .dock { outline: 2px solid #EAF2F7 !important; }', /a ring on the sections' step/],
    ['ringed under the sheet', d, '&tab=s1', '.hud .nation { position: fixed !important; top: 200px !important; right: 40px !important; }', /the ringed element \.nation is under the sheet/],
    ['indicators off', d, '&tab=s2', '', /the indicators named are not the HUD's/, () => { document.querySelector('.hud .stat .lbl').textContent = 'المال'; }],
    ['sections off', d, '&tab=s3', '', /the sections are not the dock's eight/, () => { const l = document.querySelector('.t-secs'); l.appendChild(l.firstElementChild); }],
    ['speeds off', d, '&tab=s4', '', /the speeds are not the speed button's and menu's/, () => { const r = document.querySelectorAll('#speedmenu .mrow'); r[r.length - 1].querySelector('span').textContent = '20×'; }],
    ['first decision off', d, '&tab=s5', '', /the first decision is not the alert's/, () => { document.querySelector('.hud .alert-prev .txt').textContent = 'انتخابات في السودان'; }],
  ],
});
