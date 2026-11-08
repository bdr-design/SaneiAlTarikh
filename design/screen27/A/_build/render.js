// Screen 27 variant A (the front and its sectors, §5.4, RH-11, under the owner's decision «military»): render the iPhones
// and run the checks with the shared panel checker (design/shared/check/panelcheck.js), in the army section. This file adds
// the screen's own rules: the map placed on the front (the line, both sector bands and the front's names in view, clear of
// every panel and inside the safe area); the line amber and dashed, static; the bands on the coalition's (east) side of
// the line, the player's teal, the partner's not; the names at a constant size, none cut, none over another; no unit
// tokens (screen 14's, the owner's); the sheet: the player's sector told apart (teal), its posture one radio choice
// تثبيت | هجوم that yields to an army's own order; the partner's sector read-only (no control in it, said in words and to
// VoiceOver); the enemy an estimate (D-19); the Arabic counts; the HUD's date and its weekday; no red; no dialog.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
const FRONT = JSON.parse(fs.readFileSync(path.join(__dirname, 'front.json'), 'utf8'));

const HEAD = ['جبهة شرق ليبيا', 'التحالف ضد حكومة القذافي · قطاعان'];
const BRIEF = {
  front: HEAD.concat(['قطاعك', 'قطاع الصحراء', 'من أجدابيا إلى جالو · جيشان · 11 تشكيلًا', 'وضع القطاع', 'للجيوش بلا أمر خاص', 'تثبيت', 'هجوم',
    'قطاع الحليف', 'قطاع الساحل', 'المجلس الوطني الانتقالي · الوضع: هجوم', 'للعرض فقط']),
  // below the fold on the smaller phones: reached by scrolling
  reach_front: ['أمر الجيش الخاص (تقدّم، هجوم، توقّف) يتقدم على وضع القطاع.', 'أمام الجبهة', 'قوات حكومة القذافي', 'نحو 6 إلى 9 تشكيلات · تقدير'],
};

const screenChecks = `
const { issues, qa, q, T, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const d = window.__dev, SW = innerWidth, SH = innerHeight, SX = Math.max(d.SIDE, 0), SB = d.BOTTOM;
const panels = qa('.hud .glass').map((e) => [e.className, e.getBoundingClientRect()]);
const hits = (b, pad) => panels.filter(([, o]) => b.right > o.left - pad && b.left < o.right + pad && b.bottom > o.top - pad && b.top < o.bottom + pad).map(([n]) => n);
const inSafe = (b) => b.left >= SX - 0.5 && b.right <= SW - SX + 0.5 && b.top >= -0.5 && b.bottom <= SH - SB + 0.5;
// the front on the map: the line and both bands in view, inside the safe area and clear of every panel
const line = q('.front-lay .f-line'), mine = q('.front-lay .f-mine'), partner = q('.front-lay .f-partner');
if (!line || !mine || !partner) issues.push('the front layer lacks the line or a sector band');
else {
  [[line, 'the front line'], [mine, 'the player\\'s sector'], [partner, 'the partner\\'s sector']].forEach(([e, n]) => { const b = e.getBoundingClientRect();
    if (!inSafe(b)) issues.push(n + ' is not wholly on screen in the safe area');
    const h = hits(b, 0); if (h.length) issues.push(n + ' runs under a panel: ' + h.join(', ')); });
  // the line: amber, dashed, static; the bands: the player's teal, the partner's not; both on the coalition's (east) side
  const lc = getComputedStyle(line), mc = getComputedStyle(mine), pc = getComputedStyle(partner);
  if (lc.stroke !== X.TOK.amber || lc.strokeDasharray === 'none' || !lc.strokeDasharray) issues.push('the front line is not amber and dashed');
  if (mc.stroke !== X.TOK.teal) issues.push('the player\\'s sector band is not the player\\'s teal');
  if (pc.stroke === X.TOK.teal || pc.stroke === mc.stroke) issues.push('the partner\\'s band is not told apart from the player\\'s');
  const lb = line.getBoundingClientRect(), mb = mine.getBoundingClientRect(), pb = partner.getBoundingClientRect();
  if ((mb.left + mb.right) / 2 <= (lb.left + lb.right) / 2 - 0.5 && (pb.left + pb.right) / 2 <= (lb.left + lb.right) / 2) issues.push('the sector bands are not on the coalition\\'s (east) side of the line');
  if (mb.top < pb.top) issues.push('the sectors are not in their places (the partner\\'s on the coast, the player\\'s south of it)');
  if ([line, mine, partner, q('.front-lay')].some((e) => e.getAnimations().length) || [line, mine, partner].some((e) => getComputedStyle(e).animationName !== 'none')) issues.push('the front marks move (they must be static, L6)'); }
// the front's names: the ones that tell the front are shown, at the constant size; none cut, under a panel or over another
{ const shown = qa('.f-labels .f-lbl').filter((l) => !l.classList.contains('cut'));
  DATA.must.forEach((n) => { if (!shown.some((l) => W(T(l)) === n)) issues.push('the front\\'s name «' + n + '» is not shown'); });
  shown.forEach((l) => { const b = l.getBoundingClientRect(), cs = getComputedStyle(l);
    if (cs.fontSize !== '11.5px') issues.push('the map name «' + W(T(l)) + '» is ' + cs.fontSize + ', not the constant 11.5');
    if (!inSafe(b)) issues.push('the map name «' + W(T(l)) + '» is cut by the screen edge');
    const h = hits(b, 1); if (h.length) issues.push('the map name «' + W(T(l)) + '» is under a panel: ' + h.join(', ')); });
  for (let i = 0; i < shown.length; i++) for (let j = i + 1; j < shown.length; j++) { const a = shown[i].getBoundingClientRect(), b = shown[j].getBoundingClientRect();
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) issues.push('the map names «' + W(T(shown[i])) + '» and «' + W(T(shown[j])) + '» overlap'); }
  qa('.f-labels .f-dot').forEach((dt) => { const l = dt.nextElementSibling; if (!l || l.classList.contains('cut') !== dt.classList.contains('cut')) issues.push('a place dot without its name, or a name without its dot'); });
  const own = shown.find((l) => W(T(l)) === 'قطاعك'); if (own && getComputedStyle(own).color !== X.TOK.teal) issues.push('the map name «قطاعك» is not the player\\'s teal'); }
// no unit tokens here: they are screen 14's, the owner's to supervise
if (document.querySelector('.map .unit, .map img[src*="units/"], .units')) issues.push('unit tokens drawn (screen 14\\'s, the owner\\'s)');
// the HUD's date: 10 April 2011, its weekday right
{ const dw = W(T(q('.date .dow'))), dm = W(T(q('.date .dmy'))); const wd = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'][new Date(Date.UTC(2011, 3, 10)).getUTCDay()];
  if (dm !== '10 أبريل 2011' || dw !== wd) issues.push('the HUD date is not 10 April 2011 on its weekday (' + wd + '): ' + dw + ' ' + dm); }
// the sheet: header, emblem, close
{ const f = q('.sheet .r-flag img'); if (!f || !(f.getAttribute('src') || '').endsWith('/eg.svg') || f.getAttribute('alt') !== 'علم مصر') issues.push('the header flag is not the player\\'s (مصر)'); }
if (!q('.sheet .s-emb use[href="#i-front"]')) issues.push('the emblem is not the front');
if (q('.sheet .r-x').getAttribute('aria-label') !== 'إغلاق، العودة إلى الخريطة') issues.push('a11y: the close does not say where it returns');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal, [aria-modal="true"]')) issues.push('a dialog over the map (mapCentral)');
// the player's sector: told apart (teal), read whole; its posture one radio choice of two, one chosen, yielding to an army's own order
{ const o = q('.f-sec.f-own'); if (!o || !/^قطاعك: /.test(o.getAttribute('aria-label') || '') || getComputedStyle(o).boxShadow.indexOf('63, 224, 208') < 0) issues.push('the player\\'s sector is not told apart (teal) or not read as «قطاعك»');
  const g = q('.s-seg[aria-label="وضع القطاع"]'), opts = g ? [...g.querySelectorAll('[role="radio"]')] : [];
  if (!g || g.getAttribute('role') !== 'radiogroup' || opts.map((b) => W(T(b))).join('|') !== 'تثبيت|هجوم' || opts.filter((b) => b.getAttribute('aria-checked') === 'true').length !== 1) issues.push('the posture is not one radio choice تثبيت | هجوم with one chosen');
  else if (opts.some((b) => (b.getAttribute('aria-checked') === 'true') !== b.classList.contains('on'))) issues.push('the chosen posture is not the one drawn');
  const n = W(T(o && o.closest('.r-sec').querySelector('.s-note'))); if (!/أمر الجيش الخاص/.test(n) || !/يتقدم على وضع القطاع/.test(n)) issues.push('the posture does not say it yields to an army\\'s own order (the decision «military»)'); }
// the partner's sector: read-only, said on screen and to VoiceOver; its flag the NTC's
{ const ps = qa('.f-sec').filter((e) => !e.classList.contains('f-own') && /الحليف/.test(W(T(e.closest('.r-sec').querySelector('h3')))));
  if (ps.length !== 1) issues.push('not one partner sector');
  else { const p = ps[0];
    if (p.querySelector('button, [role="radio"], [role="button"], a, input, .tap')) issues.push('a control in the partner\\'s sector (read-only)');
    if (W(T(p.querySelector('.f-ro'))) !== 'للعرض فقط' || !(p.getAttribute('aria-label') || '').endsWith('. للعرض فقط')) issues.push('the partner\\'s sector does not say it is read-only');
    if (!(p.querySelector('.f-flag img').getAttribute('src') || '').endsWith('/ly.svg')) issues.push('the partner\\'s flag is not the National Transitional Council\\'s'); } }
// the enemy: an estimate (D-19), a range, the 2011 government's flag
{ const e = qa('.f-sec').find((x) => /أمام الجبهة/.test(W(T(x.closest('.r-sec').querySelector('h3')))));
  if (!e || !/نحو \\d+ إلى \\d+ تشكيلات · تقدير$/.test(W(T(e.querySelector('.r-at > span')))) || !/تقدير$/.test(e.getAttribute('aria-label') || '')) issues.push('the enemy is not given as an estimated range (D-19)');
  else if (!(e.querySelector('.f-flag img').getAttribute('src') || '').endsWith('/ly_2011.svg')) issues.push('the enemy\\'s flag is not the 2011 government\\'s'); }
// every group reads all it shows
qa('.f-sec[role="group"]').forEach((g) => { const al = g.getAttribute('aria-label') || '', ln = W(T(g.querySelector('.r-at > span'))).split(' · ').map((x) => x.replace(/^الوضع: /, ''));
  if (!al.includes(W(T(g.querySelector('.r-at b')))) || ln.some((x) => !al.includes(x.replace(/^نحو /, '').split(' ')[0]))) issues.push('a11y: «' + W(T(g.querySelector('.r-at b'))) + '» does not read all it shows'); });
// no red here
{ const isRed = (c) => { const m = (c || '').match(/rgba?\\((\\d+), (\\d+), (\\d+)/); if (!m) return false; const [r, g, b] = m.slice(1).map((v) => +v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0; if (mx !== r || sat < 0.45 || mx < 0.25) return false; return Math.abs(60 * ((g - b) / (mx - mn))) <= 15; };
  qa('.sheet *, .front-lay *, .f-labels *').forEach((e) => { if (e.closest('.r-flag')) return; const cs = getComputedStyle(e);
    if ([cs.color, cs.backgroundColor, cs.borderTopColor, cs.stroke, cs.fill].some(isRed)) issues.push('red in the front: ' + (e.className && e.className.baseVal === undefined ? e.className : (e.getAttribute('class') || e.tagName))); }); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الجيش', tabs: ['front'], noTabs: true, fitTab: false, longTab: 'front',
  inputs: ['_build/front.css', '_build/front.json', '../../shared/flags/ly.svg', '../../shared/flags/ly_2011.svg', '../../shared/flags/eg.svg', '../../shared/map_mena_d1.jpg'],
  TOK: { sec: 'rgb(189, 180, 106)', amber: 'rgb(242, 177, 76)', teal: 'rgb(63, 224, 208)', ctlH: {}, sheetIcon: [], size: [], radius: { '.f-sec': 10 } },
  // the map's focus is the front (front.json, map space), not Egypt: the shared checker keeps it clear of every panel and hit box
  mapFocus: [[FRONT.box.x0 + 14, FRONT.box.y0 + 8, FRONT.box.x1 - 10, FRONT.box.y1 - 2, 'the front line'], [FRONT.box.x0, FRONT.box.y0, FRONT.box.x1, FRONT.box.y1, 'the front and its names']],
  HEAD, BRIEF, screenChecks, DATA: { must: ['أجدابيا', 'البريقة', 'جالو', 'قطاعك', 'قطاع الحليف'] },
  skipGeneric: ['Egypt covered', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white', 'hint chevron missing (no tabs)', 'hint over the content (no tabs)'],
  cases: (d, se) => [
    ['brief text hidden (front)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.f-own .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (front)', d, '', '.r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (front)', d, '', '.f-own .r-at { flex: none !important; width: 40px; overflow: hidden !important; }', /clipped text \(sides\)/],
    ['gap (front)', d, '', '.r-body[data-tab="front"] { gap: 6px !important; }', /gap 6 on/],
    ['faint text (front)', d, '', '.f-sec .r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (front)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="front"] .s-note').textContent = 'نسبة 20%'; }],
    ['text into a control (posture)', d, '', '.s-pol .r-at { transform: translateX(-120px) !important; }', /text over a control/],
    ['hint chevron missing', se, '', '.r-hint { display: none !important; }', /scroll hint chevron missing with content below/],
    ['hint over the content', se, '', '.r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/],
    ['front covered', d, '', '', /the front and its names covered by panel/, () => { const m = document.querySelector('.map'); m.style.left = (parseFloat(getComputedStyle(m).left) + 300) + 'px'; }],
    ['line under the sheet', d, '', '', /the front line runs under a panel/, () => { const m = document.querySelector('.map'); m.style.left = (parseFloat(getComputedStyle(m).left) + 380) + 'px'; }],
    ['line off screen', d, '', '', /the front line is not wholly on screen/, () => { const m = document.querySelector('.map'); m.style.left = (parseFloat(getComputedStyle(m).left) - 700) + 'px'; }],
    ['line solid', d, '', '.f-line { stroke-dasharray: none !important; }', /the front line is not amber and dashed/],
    ['line red', d, '', '.f-line { stroke: rgb(242, 112, 90) !important; }', /the front line is not amber and dashed|red in the front/],
    ['own band not teal', d, '', '.f-mine { stroke: #EAF2F7 !important; }', /the player's sector band is not the player's teal/],
    ['partner band teal', d, '', '.f-partner { stroke: var(--teal) !important; }', /the partner's band is not told apart/],
    ['bands swapped', d, '', '', /the sectors are not in their places/, () => { const a = document.querySelector('.f-mine'), b = document.querySelector('.f-partner'), t = a.getAttribute('d'); a.setAttribute('d', b.getAttribute('d')); b.setAttribute('d', t); }],
    ['front moving', d, '', '@keyframes fdash { to { stroke-dashoffset: -24; } } .f-line { animation: fdash 1s linear infinite; }', /the front marks move/],
    ['a name hidden', d, '', '', /the front's name «جالو» is not shown/, () => { [...document.querySelectorAll('.f-lbl')].find((l) => l.textContent === 'جالو').classList.add('cut'); }],
    ['a name scaled', d, '', '.f-lbl { font-size: 20px !important; }', /is 20px, not the constant 11.5/],
    ['a name under a panel', d, '', '', /the map name «.*» is under a panel/, () => { const l = [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'أجدابيا'); const s = document.querySelector('.sheet').getBoundingClientRect(), m = document.querySelector('.map').getBoundingClientRect(), k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--map-s')); l.style.setProperty('--x', (s.left + 20 - m.left) / k); }],
    ['names overlap', d, '', '', /the map names «.*» and «.*» overlap/, () => { const a = [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'قطاعك'), b = [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'قطاع الحليف'); b.style.cssText = a.style.cssText; }],
    ['dot alone', d, '', '', /a place dot without its name/, () => { [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'جالو').classList.add('cut'); }],
    ['own name not teal', d, '', '.f-lbl.sec-mine { color: #FFFFFF !important; }', /the map name «قطاعك» is not the player's teal/],
    ['units drawn', d, '', '', /unit tokens drawn/, () => { const i = document.createElement('img'); i.className = 'unit'; document.querySelector('.map').appendChild(i); }],
    ['date weekday off', d, '', '', /the HUD date is not 10 April 2011 on its weekday/, () => { document.querySelector('.date .dow').textContent = 'السبت'; }],
    ['wrong flag', d, '', '', /the header flag is not the player's/, () => { document.querySelector('.r-flag img').setAttribute('src', '../../shared/flags/ly.svg'); }],
    ['emblem not the front', d, '', '', /the emblem is not the front/, () => { document.querySelector('.s-emb use').setAttribute('href', '#i-army'); }],
    ['close unclear', d, '', '', /a11y: the close does not say where it returns/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['sheet modal', d, '', '', /a dialog over the map/, () => { document.querySelector('.sheet').setAttribute('aria-modal', 'true'); }],
    ['own not apart', d, '', '.f-own { box-shadow: inset 0 0 0 1px var(--stroke) !important; background: var(--card) !important; }', /the player's sector is not told apart/],
    ['three postures', d, '', '', /the posture is not one radio choice/, () => { const g = document.querySelector('.s-seg[aria-label="وضع القطاع"]'); const b = g.lastElementChild.cloneNode(true); b.textContent = 'انسحاب'; g.appendChild(b); }],
    ['posture drawn wrong', d, '', '', /the chosen posture is not the one drawn/, () => { document.querySelectorAll('.s-seg[aria-label="وضع القطاع"] .s-sg')[1].classList.add('on'); }],
    ['posture overrides', d, '', '', /the posture does not say it yields to an army's own order/, () => { document.querySelector('.f-own').closest('.r-sec').querySelector('.s-note').textContent = 'وضع القطاع يسري على كل الجيوش.'; }],
    ['partner controllable', d, '', '', /a control in the partner's sector/, () => { const b = document.createElement('button'); b.className = 'r-btn tap'; b.textContent = 'هجوم'; [...document.querySelectorAll('.f-sec')][1].appendChild(b); }],
    ['partner not read-only', d, '', '', /the partner's sector does not say it is read-only/, () => { [...document.querySelectorAll('.f-sec')][1].querySelector('.f-ro').remove(); }],
    ['partner flag', d, '', '', /the partner's flag is not the National Transitional Council's/, () => { [...document.querySelectorAll('.f-sec')][1].querySelector('img').setAttribute('src', '../../shared/flags/ly_2011.svg'); }],
    ['enemy exact', d, '', '', /the enemy is not given as an estimated range/, () => { [...document.querySelectorAll('.f-sec')][2].querySelector('.r-at > span').textContent = '8 تشكيلات'; }],
    ['group unread', d, '', '', /a11y: «قطاع الصحراء» does not read all it shows/, () => { document.querySelector('.f-own').setAttribute('aria-label', 'قطاعك: قطاع الصحراء'); }],
    ['red in the sheet', d, '', '.f-ro { color: #E0302A !important; }', /red in the front/],
  ],
});
