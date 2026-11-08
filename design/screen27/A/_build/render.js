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
  front: HEAD.concat(['قطاعك', 'قطاع الصحراء', 'من جنوب أجدابيا إلى جالو · جيشان · 11 تشكيلًا', 'وضع القطاع', 'للجيوش بلا أمر خاص', 'تثبيت', 'هجوم',
    'قطاع الحليف', 'قطاع الساحل', 'المجلس الوطني الانتقالي · الوضع: هجوم', 'للعرض فقط']),
  // below the fold on the smaller phones: reached by scrolling
  reach_front: ['أمر الجيش الخاص (تقدّم، هجوم، توقّف) له الأولوية على وضع القطاع.', 'أمام الجبهة', 'قوات حكومة القذافي', 'نحو 6 إلى 9 تشكيلات · تقدير'],
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
const pts = (e) => (e.getAttribute('d') || '').slice(1).split('L').map((p) => p.split(',').map(Number));
const lineXat = (y0) => { const L = pts(line), y = Math.min(Math.max(y0, L[0][1]), L[L.length - 1][1]); for (let i = 1; i < L.length; i++) { const [x0, y0] = L[i - 1], [x1, y1] = L[i]; if ((y - y0) * (y - y1) <= 0 && y1 !== y0) return x0 + (x1 - x0) * (y - y0) / (y1 - y0); } return null; };
const half = (e) => parseFloat(getComputedStyle(e).strokeWidth) / 2;
const padBox = (e) => { const b = e.getBoundingClientRect(), h = half(e); return { left: b.left - h, right: b.right + h, top: b.top - h, bottom: b.bottom + h }; };
if (!line || !mine || !partner) issues.push('the front layer lacks the line or a sector band');
else {
  [[line, 'the front line', 2.5], [mine, 'the player\\'s sector', 9], [partner, 'the partner\\'s sector', 9]].forEach(([e, n, w]) => { const b = padBox(e), cs = getComputedStyle(e);
    if (!inSafe(b)) issues.push(n + ' is not wholly on screen in the safe area');
    const h = hits(b, 0); if (h.length) issues.push(n + ' runs under a panel: ' + h.join(', '));
    if (Math.abs(parseFloat(cs.strokeWidth) - w) > 0.05) issues.push(n + ' is ' + cs.strokeWidth + ' wide, not ' + w);
    // drawn: shown, and strong enough to see (the partner's 0.45 is the quietest)
    let op = parseFloat(cs.strokeOpacity) * parseFloat(cs.opacity); for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) op *= parseFloat(getComputedStyle(a).opacity);
    if (cs.visibility !== 'visible' || cs.display === 'none' || op < 0.3) issues.push(n + ' is not drawn (hidden or faint: ' + op.toFixed(2) + ')'); });
  // the line: amber, dashed, static; the bands: the player's teal, the partner's not
  const lc = getComputedStyle(line), mc = getComputedStyle(mine), pc = getComputedStyle(partner);
  if (lc.stroke !== X.TOK.amber || lc.strokeDasharray === 'none' || !lc.strokeDasharray) issues.push('the front line is not amber and dashed');
  if (mc.stroke !== X.TOK.teal) issues.push('the player\\'s sector band is not the player\\'s teal');
  if (pc.stroke === X.TOK.teal || pc.stroke === mc.stroke) issues.push('the partner\\'s band is not told apart from the player\\'s');
  // each band, vertex by vertex, east of the line at that latitude (the coalition's side)
  [[mine, 'the player\\'s sector'], [partner, 'the partner\\'s sector']].forEach(([e, n]) => { if (pts(e).some(([x, y]) => { const lx = lineXat(y); return lx === null || x <= lx + 1; })) issues.push(n + ' is not wholly on the coalition\\'s (east) side of the line'); });
  // the sectors where the sheet says: the coast's north of the player's; the player's from south of Ajdabiya to Jalu
  const P = DATA.places, M = pts(mine), Pa = pts(partner);
  if (Math.min(...M.map((p) => p[1])) < Math.max(...Pa.map((p) => p[1])) - 0.5) issues.push('the sectors are not in their places (the partner\\'s on the coast, the player\\'s south of it)');
  if (Math.min(...M.map((p) => p[1])) <= P['أجدابيا'][1] || Math.hypot(M[M.length - 1][0] - P['جالو'][0], M[M.length - 1][1] - P['جالو'][1]) > 16) issues.push('the player\\'s band does not run from south of Ajdabiya to Jalu (as the sheet says)');
  // a place west of the line is held by the other side: its dot hollow
  Object.entries(P).forEach(([n, [x, y]]) => { const lx = lineXat(Math.min(Math.max(y, pts(line)[0][1]), pts(line)[pts(line).length - 1][1])), dot = [...document.querySelectorAll('.f-labels .f-dot')].find((d) => d.nextElementSibling && d.nextElementSibling.textContent === n);
    if (dot && (x < lx) !== dot.classList.contains('enemy')) issues.push('the place «' + n + '» is ' + (x < lx ? 'on the other side but its dot is not hollow' : 'on the coalition\\'s side but drawn hollow')); });
  if ([...document.querySelectorAll('.front-lay, .front-lay *, .f-labels *')].some((e) => e.getAnimations().length || getComputedStyle(e).animationName !== 'none')) issues.push('the front marks or names move (they must be static, L6)'); }
// the zoom: never past the engine's maximum 1.0 km/pt (one map unit about 3.24 km here)
if (3.24 / parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--map-s')) < 1.0 - 1e-3) issues.push('the map is zoomed past 1.0 km/pt');
// the front's names: the ones that tell the front are shown, places at the play map's city size, tags at 11.5; none cut,
// under a panel (6 pt), over another, or on the line or a band (2 pt clear); dots with their names, on screen and clear
{ const k = 0.63 * SH / 390, shown = qa('.f-labels .f-lbl').filter((l) => !l.classList.contains('cut')), dots = qa('.f-labels .f-dot').filter((x) => !x.classList.contains('cut'));
  DATA.must.forEach((n) => { if (!shown.some((l) => W(T(l)) === n)) issues.push('the front\\'s name «' + n + '» is not shown'); });
  const marks = [line, mine, partner].filter(Boolean).map((e) => { const L = e.getTotalLength(), M = e.getScreenCTM(), out = []; for (let t = 0; t <= L; t += 1) { const p = e.getPointAtLength(t); out.push([M.a * p.x + M.c * p.y + M.e, M.b * p.x + M.d * p.y + M.f]); } return [e, out, half(e)]; });
  shown.concat(dots).forEach((l) => { const b = l.getBoundingClientRect(), cs = getComputedStyle(l), isDot = l.classList.contains('f-dot'), nm = isDot ? 'the dot of «' + W(T(l.nextElementSibling)) + '»' : 'the map name «' + W(T(l)) + '»';
    if (!isDot) { const want = l.classList.contains('tag') ? 11.5 : 21 * k; if (Math.abs(parseFloat(cs.fontSize) - want) > 0.1) issues.push(nm + ' is ' + cs.fontSize + ', not ' + want.toFixed(2) + 'px'); }
    if (!inSafe(b)) issues.push(nm + ' is cut by the screen edge');
    const h = hits(b, 6); if (h.length) issues.push(nm + ' is under a panel: ' + h.join(', '));
    if (!isDot) marks.forEach(([e, P, hw]) => { if (P.some(([x, y]) => x > b.left - hw - 2 && x < b.right + hw + 2 && y > b.top - hw - 2 && y < b.bottom + hw + 2)) issues.push(nm + ' is on the ' + (e === line ? 'front line' : 'sector band')); }); });
  const all = shown.concat(dots);
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) { const pair = (x, y) => x.classList.contains('f-dot') && x.nextElementSibling === y; if (pair(all[i], all[j]) || pair(all[j], all[i])) continue;   /* a dot and its own name */ const a = all[i].getBoundingClientRect(), b = all[j].getBoundingClientRect();
    if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5) issues.push('the map names «' + W(T(all[i])) + '» and «' + W(T(all[j])) + '» overlap'); }
  qa('.f-labels .f-dot').forEach((dt) => { const l = dt.nextElementSibling; if (!l || l.classList.contains('cut') !== dt.classList.contains('cut')) issues.push('a place dot without its name, or a name without its dot'); });
  // a hidden name must really be cut (edge or 6 pt of a panel)
  [...document.querySelectorAll('.f-labels .f-lbl.cut')].forEach((l) => { l.classList.remove('cut'); const b = l.getBoundingClientRect(), bad = !inSafe(b) || hits(b, 6).length; l.classList.add('cut'); if (!bad) issues.push('the map name «' + W(T(l)) + '» is hidden though it fits'); });
  const own = shown.find((l) => W(T(l)) === 'قطاعك'); if (own && getComputedStyle(own).color !== X.TOK.teal) issues.push('the map name «قطاعك» is not the player\\'s teal'); }
// the HUD's alert: the day's («هجوم على أجدابيا»), not the 1 January one
if (W(T(q('.toast .alert-prev .txt'))) !== 'هجوم على أجدابيا') issues.push('the HUD alert is not the day\\'s («هجوم على أجدابيا»)');
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
// the player's sector: told apart (teal), read whole; its posture the sheet's one radio choice, in the player's sector,
// two options (two segments wide), one chosen, open (a war), yielding to an army's own order
{ const o = q('.f-sec.f-own'); if (!o || !/^قطاعك: /.test(o.getAttribute('aria-label') || '') || getComputedStyle(o).boxShadow.indexOf('63, 224, 208') < 0) issues.push('the player\\'s sector is not told apart (teal) or not read as «قطاعك»');
  const groups = qa('.sheet [role="radiogroup"]'), g = q('.s-seg[aria-label="وضع القطاع"]'), opts = g ? [...g.querySelectorAll('[role="radio"]')] : [];
  if (groups.length !== 1 || !g || groups[0] !== g || !o || !o.closest('.r-sec').contains(g)) issues.push('the posture is not the sheet\\'s one choice, in the player\\'s sector');
  if (!g || g.getAttribute('role') !== 'radiogroup' || opts.map((b) => W(T(b))).join('|') !== 'تثبيت|هجوم' || opts.filter((b) => b.getAttribute('aria-checked') === 'true').length !== 1) issues.push('the posture is not one radio choice تثبيت | هجوم with one chosen');
  else { if (opts.some((b) => (b.getAttribute('aria-checked') === 'true') !== b.classList.contains('on'))) issues.push('the chosen posture is not the one drawn');
    if (Math.abs(g.getBoundingClientRect().width - opts.reduce((a, b) => a + b.getBoundingClientRect().width, 0)) > 0.5) issues.push('the posture\\'s track is wider than its options (an empty slot)');
    if (opts.some((b) => b.disabled || b.getAttribute('aria-disabled') === 'true' || b.querySelector('use[href*="lock"]') || b.classList.contains('lock'))) issues.push('the posture is locked though this is a war'); }
  const n = W(T(o && o.closest('.r-sec').querySelector('.s-note'))); if (!/أمر الجيش الخاص/.test(n) || !/له الأولوية على وضع القطاع/.test(n)) issues.push('the posture does not say an army\\'s own order has priority (the decision «military»)'); }
// the partner's sector: read-only, said on screen and to VoiceOver; its flag the NTC's
{ const ps = qa('.f-sec').filter((e) => !e.classList.contains('f-own') && /الحليف/.test(W(T(e.closest('.r-sec').querySelector('h3')))));
  if (ps.length !== 1) issues.push('not one partner sector');
  else { const p = ps[0];
    if (p.closest('.r-sec').querySelector('button, [role="radio"], [role="radiogroup"], [role="button"], a, input, .tap')) issues.push('a control in the partner\\'s sector (read-only)');
    if (W(T(p.querySelector('.f-ro'))) !== 'للعرض فقط' || !(p.getAttribute('aria-label') || '').endsWith('. للعرض فقط')) issues.push('the partner\\'s sector does not say it is read-only');
    if (!(p.querySelector('.f-flag img').getAttribute('src') || '').endsWith('/ly.svg')) issues.push('the partner\\'s flag is not the National Transitional Council\\'s'); } }
// the enemy: an estimate (D-19), a range, the 2011 government's flag
{ const e = qa('.f-sec').find((x) => /أمام الجبهة/.test(W(T(x.closest('.r-sec').querySelector('h3')))));
  if (!e || !/نحو \\d+ إلى \\d+ تشكيلات · تقدير$/.test(W(T(e.querySelector('.r-at > span')))) || !/تقدير$/.test(e.getAttribute('aria-label') || '')) issues.push('the enemy is not given as an estimated range (D-19)');
  else if (!(e.querySelector('.f-flag img').getAttribute('src') || '').endsWith('/ly_2011.svg')) issues.push('the enemy\\'s flag is not the 2011 government\\'s'); }
// every group reads all it shows: its title and every word and number of its line
qa('.f-sec[role="group"]').forEach((g) => { const al = (g.getAttribute('aria-label') || '').replace(/[،:.]/g, ' '), words = (W(T(g.querySelector('.r-at b'))) + ' ' + W(T(g.querySelector('.r-at > span')))).replace(/[·:]/g, ' ').split(/\\s+/).filter(Boolean);
  const miss = words.filter((w) => !al.split(/\\s+/).includes(w)); if (miss.length) issues.push('a11y: «' + W(T(g.querySelector('.r-at b'))) + '» does not read all it shows (' + miss.join('، ') + ')'); });
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
  HEAD, BRIEF, screenChecks, DATA: { must: ['أجدابيا', 'البريقة', 'جالو', 'قطاعك', 'قطاع الحليف', 'قوات القذافي'], places: FRONT.places },
  skipGeneric: ['Egypt covered', 'row read in part', 'tap in the side inset', 'map label cut', 'tile icons cyan', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white', 'hint chevron missing (no tabs)', 'hint over the content (no tabs)'],
  cases: (d, se) => [
    ['brief text hidden (front)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.f-own .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (front)', d, '', '.r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (front)', d, '', '.f-own .r-at { flex: none !important; width: 40px; overflow: hidden !important; }', /clipped text \(sides\)/],
    ['gap (front)', d, '', '.r-body[data-tab="front"] { gap: 6px !important; }', /gap 6 on/],
    ['faint text (front)', d, '', '.f-sec .r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (front)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="front"] .s-note').textContent = 'نسبة 20%'; }],
    ['text into a control (posture)', d, '', '.s-pol .r-at { transform: translateX(-120px) !important; }', /text over a control|order must be \.r-at, \.s-seg/],
    ['hint chevron missing', se, '', '.r-hint { display: none !important; }', /scroll hint chevron missing with content below/],
    ['hint over the content', se, '', '.r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/],
    ['front covered', d, '', '', /the front and its names covered by panel/, () => { const m = document.querySelector('.map'); m.style.left = (parseFloat(getComputedStyle(m).left) + 300) + 'px'; }],
    // the shared plants moved to this sheet and map: the posture's segments pushed into the side inset; the front's names
    // that the hide pass took out shown again (Egypt's play-map labels are not drawn here, and there are no tiles)
    ['tap in the side inset (posture)', d, '', '.sheet { right: -300px !important; }', /tap in side inset/],
    ['front name cut', d, '', '', /the map name «رأس لانوف» is (under a panel|cut by the screen edge)/, () => { document.querySelectorAll('.f-labels .cut').forEach((e) => e.classList.remove('cut')); }],
    ['line under the sheet', d, '', '', /the front line runs under a panel/, () => { const m = document.querySelector('.map'); m.style.left = (parseFloat(getComputedStyle(m).left) + 380) + 'px'; }],
    ['line off screen', d, '', '', /the front line is not wholly on screen/, () => { const m = document.querySelector('.map'); m.style.left = (parseFloat(getComputedStyle(m).left) - 700) + 'px'; }],
    ['line solid', d, '', '.f-line { stroke-dasharray: none !important; }', /the front line is not amber and dashed/],
    ['line red', d, '', '.f-line { stroke: rgb(242, 112, 90) !important; }', /the front line is not amber and dashed|red in the front/],
    ['own band not teal', d, '', '.f-mine { stroke: #EAF2F7 !important; }', /the player's sector band is not the player's teal/],
    ['partner band teal', d, '', '.f-partner { stroke: var(--teal) !important; }', /the partner's band is not told apart/],
    ['bands swapped', d, '', '', /the sectors are not in their places/, () => { const a = document.querySelector('.f-mine'), b = document.querySelector('.f-partner'), t = a.getAttribute('d'); a.setAttribute('d', b.getAttribute('d')); b.setAttribute('d', t); }],
    ['front moving', d, '', '@keyframes fdash { to { stroke-dashoffset: -24; } } .f-line { animation: fdash 1s linear infinite; }', /the front marks or names move/],
    ['a name hidden', d, '', '', /the front's name «جالو» is not shown/, () => { [...document.querySelectorAll('.f-lbl')].find((l) => l.textContent === 'جالو').classList.add('cut'); }],
    ['a name scaled', d, '', '.f-lbl.city { font-size: 20px !important; }', /the map name «أجدابيا» is 20px, not 1\d\.\d+px/],
    ['a tag scaled', d, '', '.f-lbl.tag { font-size: 14px !important; }', /the map name «قطاعك» is 14px, not 11\.50px/],
    ['a name under a panel', d, '', '', /the map name «.*» is under a panel/, () => { const l = [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'أجدابيا'); const s = document.querySelector('.sheet').getBoundingClientRect(), m = document.querySelector('.map').getBoundingClientRect(), k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--map-s')); l.style.setProperty('--x', (s.left + 20 - m.left) / k); }],
    ['names overlap', d, '', '', /the map names «.*» and «.*» overlap/, () => { const a = [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'قطاعك'), b = [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'قطاع الحليف'); b.className = a.className; b.style.cssText = a.style.cssText; }],
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
    ['posture overrides', d, '', '', /the posture does not say an army's own order has priority/, () => { document.querySelector('.f-own').closest('.r-sec').querySelector('.s-note').textContent = 'وضع القطاع يسري على كل الجيوش.'; }],
    ['partner band west', d, '', '', /the partner's sector is not wholly on the coalition's \(east\) side of the line/, () => { const e = document.querySelector('.f-partner'); e.setAttribute('d', 'M' + e.getAttribute('d').slice(1).split('L').map((q) => { const [x, y] = q.split(',').map(Number); return (x - 16) + ',' + y; }).join('L')); }],
    ['own band west', d, '', '', /the player's sector is not wholly on the coalition's \(east\) side of the line/, () => { const e = document.querySelector('.f-mine'); e.setAttribute('d', 'M' + e.getAttribute('d').slice(1).split('L').map((q) => { const [x, y] = q.split(',').map(Number); return (x - 12) + ',' + y; }).join('L')); }],
    ['own band short of Jalu', d, '', '', /the player's band does not run from south of Ajdabiya to Jalu/, () => { const e = document.querySelector('.f-mine'), P = e.getAttribute('d').slice(1).split('L'); e.setAttribute('d', 'M' + P.slice(0, -2).join('L')); }],
    ['enemy town drawn ours', d, '', '', /the place «البريقة» is on the other side but its dot is not hollow/, () => { [...document.querySelectorAll('.f-dot')].find((x) => x.nextElementSibling.textContent === 'البريقة').classList.remove('enemy'); }],
    ['partner band hidden', d, '', '.f-partner { stroke-opacity: 0 !important; }', /the partner's sector is not drawn/],
    ['own band invisible', d, '', '.f-mine { visibility: hidden !important; }', /the player's sector is not drawn/],
    ['band too wide', d, '', '.f-band { stroke-width: 140px !important; }', /the player's sector is 140px wide, not 9/],
    ['zoom past 1 km/pt', d, '', ':root { --map-s: 3.5 !important; }', /the map is zoomed past 1\.0 km\/pt/],
    ['posture in the partner section', d, '', '', /the posture is not the sheet's one choice, in the player's sector|a control in the partner's sector/, () => { const s = document.querySelector('.s-pol'), r = [...document.querySelectorAll('.f-sec')][1].closest('.r-sec'); r.appendChild(s); }],
    ['attack locked', d, '', '', /the posture is locked though this is a war/, () => { const b = document.querySelectorAll('.s-seg[aria-label="وضع القطاع"] .s-sg')[1]; b.setAttribute('aria-disabled', 'true'); }],
    ['posture slot empty', d, '', '.s-pol .s-seg { grid-template-columns: repeat(3, 60px) !important; }', /the posture's track is wider than its options/],
    ['own reads the wrong places', d, '', '', /a11y: «قطاع الصحراء» does not read all it shows \(.*أجدابيا/, () => { document.querySelector('.f-own').setAttribute('aria-label', 'قطاعك: قطاع الصحراء، من مصر، جيشان، 11 تشكيلًا'); }],
    ['enemy bound dropped', d, '', '', /a11y: «قوات حكومة القذافي» does not read all it shows \(.*9/, () => { [...document.querySelectorAll('.f-sec')][2].setAttribute('aria-label', 'قوات حكومة القذافي: نحو 6 تشكيلات، تقدير'); }],
    ['dot under the sheet', d, '', '', /the dot of «جالو» is under a panel/, () => { const dt = [...document.querySelectorAll('.f-dot')].find((x) => x.nextElementSibling.textContent === 'جالو'); const s = document.querySelector('.sheet').getBoundingClientRect(), m = document.querySelector('.map').getBoundingClientRect(), k = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--map-s')); dt.style.setProperty('--x', (s.left + 30 - m.left) / k); }],
    ['names animated', d, '', '@keyframes pz { to { opacity: .5; } } .f-lbl { animation: pz 1s linear infinite; }', /the front marks or names move/],
    ['name hidden though it fits', d, '', '', /the map name «جالو» is hidden though it fits/, () => { const l = [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'جالو'); l.classList.add('cut'); l.previousElementSibling.classList.add('cut'); }],
    ['name on the band', d, '', '', /the map name «جالو» is on the (sector band|front line)/, () => { [...document.querySelectorAll('.f-lbl')].find((x) => x.textContent === 'جالو').classList.remove('east'); }],
    ['alert of January', d, '', '', /the HUD alert is not the day's/, () => { document.querySelector('.toast .alert-prev .txt').textContent = 'احتجاجات واسعة في تونس'; }],
    ['partner controllable', d, '', '', /a control in the partner's sector/, () => { const b = document.createElement('button'); b.className = 'r-btn tap'; b.textContent = 'هجوم'; [...document.querySelectorAll('.f-sec')][1].appendChild(b); }],
    ['partner not read-only', d, '', '', /the partner's sector does not say it is read-only/, () => { [...document.querySelectorAll('.f-sec')][1].querySelector('.f-ro').remove(); }],
    ['partner flag', d, '', '', /the partner's flag is not the National Transitional Council's/, () => { [...document.querySelectorAll('.f-sec')][1].querySelector('img').setAttribute('src', '../../shared/flags/ly_2011.svg'); }],
    ['enemy exact', d, '', '', /the enemy is not given as an estimated range/, () => { [...document.querySelectorAll('.f-sec')][2].querySelector('.r-at > span').textContent = '8 تشكيلات'; }],
    ['group unread', d, '', '', /a11y: «قطاع الصحراء» does not read all it shows/, () => { document.querySelector('.f-own').setAttribute('aria-label', 'قطاعك: قطاع الصحراء'); }],
    ['red in the sheet', d, '', '.f-ro { color: #E0302A !important; }', /red in the front/],
  ],
});
