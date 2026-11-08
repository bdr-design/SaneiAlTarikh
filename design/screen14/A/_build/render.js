// Screen 14 variant A (the military map, D-15: unit tokens that glide along their route): render the 7 iPhones and run
// the checks. Writes <id>.png (the order view: the western army selected and ordered to Siwa) to the variant folder; the
// moving, arrived and idle views, <id>_hit.png and report.json to _build.
// Generic rules (as the approved screens): opaque panels, borders, radii; control heights; gaps; icon sizes and strokes;
// type sizes, weights, colours, tabular 13 pt; no text in the insets; text over text or icons; content inside its
// control; 44 pt hit boxes that cover, stay in the safe area and never overlap; panels never overlap; contrast >= 4.5:1
// per pixel; the HUD at its B3 place; the dock at its B3 place, or the order bar on the dock's line in its place.
// This screen's own rules: each token at its map position (the march share for the moving one, measured on the drawn
// map); every token whole, inside the safe screen and clear of every panel; the route from the token through the
// waypoint still ahead to the destination, with its arrowhead, the waypoint and the destination marks at their places,
// shown only while the army is under way; the HUD date = 1 January 2011 + the whole days marched, with its weekday; the
// bar names the selected army with its strength and «يصل بعد N» (N = the days left, rounded up, in Arabic number
// agreement), the order in force white (move under way, halt on arrival), attack locked (no war), the dock hidden while
// the bar shows; exactly one token selected; every token read whole by VoiceOver; the strengths and organizations are
// the military panel's (read from screen 9's sheet); no real weapon names; map labels never cut by a token, a mark or a
// panel. Lightness (D-15), measured in the live page: ≤30 frames a second while gliding, ≤10 a second in steps at ×10,
// one a game day with Reduce Motion, and none at all once nothing moves.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');

const OUT = path.resolve(__dirname, '..'), PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const args = process.argv.slice(2), SELFTEST = args.includes('--selftest'), want = args.filter((a) => !a.startsWith('--'));
const DEVICES = (want.length ? want : ALL.map((d) => d.id)).map((id) => ALL.find((d) => d.id === id) || (() => { throw new Error('unknown device ' + id); })());
const REPO = path.resolve(OUT, '../../..');
const STATIC_INPUTS = ['index.html', '_build/render.js', '_build/assemble.py', '_build/units.css', '_build/units.html', '_build/orders.html', '_build/units.js', 'units/tank.png', 'units/destroyer.png', 'units/fighter.png',
  '../../screen4/A/index.html', '../../screen1/B3/index.html', '../../screen9/A/_build/sheet.html', '../../shared/devices.json'];
let INPUTS = STATIC_INPUTS.slice();
const inputsHash = () => crypto.createHash('sha1').update(Buffer.concat(INPUTS.map((f) => fs.readFileSync(path.join(OUT, f))))).digest('hex');
const qs = (d) => `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
const B3 = 'file://' + path.resolve(OUT, '../../screen1/B3/index.html');
const VIEWS = [['', '&t=0', 'order'], ['_moving', '&t=0.5', 'moving'], ['_halted', '&t=0.3&halt=1', 'halted'], ['_arrived', '&t=1', 'arrived'], ['_tip', '&t=0&tip=1', 'tip'], ['_idle', '&state=idle', 'idle']];

// the data the page must show, written here independently of units.js: map positions (1688 x 1097 overlay space), the
// route, km per map unit and the march per day; the military panel's armies (strength, organization) read from its sheet
const POS = { west: [659, 434], north: [739, 441], cairo: [777, 478], second: [810, 450], third: [816, 481], fleet: [735, 411], air: [773, 509] };
const ROUTE = [[659, 434], [637, 468], [608, 504]], TO = 'سيوة', KM = { x: 3.23, y: 3.40 }, KMDAY = 40;
// each place against its latitude and longitude through the overlay's own city dots (screen 4 A: Cairo 777,477 at
// 30.04 N 31.24 E; Alexandria 738,439 at 31.20 N 29.92 E; Aswan 826,666): x = 29.62 lon − 148.4, y = 477 − 32.9 (lat −
// 30.04) near the delta; a place more than 5 map units (about 16 km) off its fit is wrong
const GEO = { west: [31.354, 27.237], north: [31.2, 29.92], cairo: [30.04, 31.24], second: [30.85, 32.32], third: [29.97, 32.55], fleet: [32.05, 29.85], air: [29.07, 31.1],
  waypoint: [30.3, 26.5], siwa: [29.203, 25.52] };
const fit = (g) => [29.62 * g[1] - 148.4, 477 - 32.9 * (g[0] - 30.04)];
{ const off = Object.entries({ ...POS, waypoint: ROUTE[1], siwa: ROUTE[2] }).filter(([k, p]) => Math.hypot(p[0] - fit(GEO[k])[0], p[1] - fit(GEO[k])[1]) > 5);
  if (off.length) throw new Error('places off their latitude and longitude: ' + off.map(([k, p]) => k + ' ' + p + ' vs ' + fit(GEO[k]).map(Math.round)).join(', ')); }
if (ROUTE[0][0] !== POS.west[0] || ROUTE[0][1] !== POS.west[1]) throw new Error('the route does not start at the western army');
function armies() {
  const t = fs.readFileSync(path.join(OUT, '../../screen9/A/_build/sheet.html'), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const one = (n) => { const m = t.match(new RegExp(n + ' [^·]*· (\\d+) تشكيل[^ ]* التنظيم (\\d+)%')); if (!m) throw new Error('screen 9 has no row for ' + n); return { n: +m[1], org: +m[2] }; };
  return { west: one('المنطقة الغربية'), north: one('المنطقة الشمالية'), central: one('المنطقة المركزية'), guard: one('الحرس الجمهوري'), second: one('الجيش الثاني الميداني'), third: one('الجيش الثالث الميداني') };
}
const A9 = armies();
const DATA = {
  POS, ROUTE, TO, KM, KMDAY,
  NAMES: { west: 'المنطقة الغربية', north: 'المنطقة الشمالية', cairo: 'القاهرة', second: 'الجيش الثاني الميداني', third: 'الجيش الثالث الميداني', fleet: 'أسطول المتوسط', air: 'مجموعة جوية' },
  PLACE: { west: 'مطروح', north: 'الإسكندرية', second: 'القناة', third: 'السويس', fleet: 'الإسكندرية', air: 'بني سويف' },
  // armies: the military panel's formations; the fleet's ships and the air group's aircraft are this screen's own figures
  // (screen 9 gives only «أسطولان» and «14 مجموعة»)
  STRENGTH: { west: A9.west.n, north: A9.north.n, cairo: A9.central.n + A9.guard.n, second: A9.second.n, third: A9.third.n, fleet: 10, air: 24 },
  PARTS: { central: A9.central.n, guard: A9.guard.n },
  ORG: { west: A9.west.org, north: A9.north.org, second: A9.second.org, third: A9.third.org },
  WEAPONS: 'M1A1|Abrams|أبرامز|F-16|إف-16|F16|T-62|T-55|T-72|ميغ|MiG|Mirage|ميراج|رافال|Rafale|Apache|أباتشي|Patriot|باتريوت|S-300|Scud|سكود|Hawk|هوك|BMP|M113|M60|Chinook|شينوك|Black Hawk',
};

async function open(ctx, url) {
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true);
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  await p.waitForTimeout(300);
  return p;
}
async function recordInputs(b) {
  const d = ALL.find((x) => x.id === 'i16promax'), seen = new Set();
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h } });
  ctx.on('request', (r) => { if (r.url().startsWith('file://')) seen.add(path.relative(OUT, decodeURIComponent(new URL(r.url()).pathname))); });
  for (const u of [B3 + qs(d)].concat(VIEWS.map((v) => PAGE + qs(d) + v[1]))) { const p = await open(ctx, u); await p.close(); }
  await ctx.close();
  INPUTS = [...new Set(STATIC_INPUTS.concat([...seen].sort()))];
}
function assertAssembled() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'map14-'));
  try {
    execFileSync('python3', ['-I', path.join(OUT, '_build/assemble.py'), REPO, path.join(OUT, '_build'), tmp], { stdio: 'pipe' });
    if (!fs.readFileSync(path.join(tmp, 'index.html')).equals(fs.readFileSync(path.join(OUT, 'index.html')))) throw new Error('index.html is not the current output of assemble.py: run assemble.py first');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
const HUDSEL = ['.top > .nation', '.top > .stats', '.top > .date', '.toast', '.btn.mode', '.btn.home', '.dock', '.dock-item'];
async function b3Rects(b, d) {
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 });
  const p = await open(ctx, B3 + qs(d));
  const r = await p.evaluate((HUDSEL) => { const o = {}; HUDSEL.forEach((s) => { o[s] = [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; }); }); return o; }, HUDSEL);
  await ctx.close();
  return r;
}

async function measure(p, d, b3, view) {
  return p.evaluate(({ d, b3, view, DATA, HUDSEL }) => {
    const TOK = { heights: [24, 32, 36, 44], space: [0, 2, 4, 8, 12], rCtl: 10, rCard: 12, panel: 'rgb(12, 20, 28)', border: 'rgba(127, 233, 255, 0.14)',
      type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700] }, stroke: 1.75, teal: 'rgb(63, 224, 208)', t1: 'rgb(234, 242, 247)', t2: 'rgb(169, 188, 203)', dark: 'rgb(11, 18, 24)' };
    const issues = [], W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01, lu = 1 / 32, root = document.documentElement;
    const near = (a, b, t = 0.05) => Math.abs(a - b) < t;
    const effOp = (e) => { let o = 1; for (let a = e; a && a.nodeType === 1; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity); return o; };
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && effOp(e) > 0.05;
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(visible);
    const box = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    const inter = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.05 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.05;
    const label = (e) => (e.getAttribute('aria-label') || e.textContent || e.className.baseVal || e.className || e.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 26);
    const T = (e) => (e ? e.innerText || e.textContent : '').replace(/\s+/g, ' ').trim();
    const nums = (s) => (String(s).replace(/−/g, '-').match(/-?\d+(\.\d+)?/g) || []).map(Number);
    const sel = view === 'idle' ? null : 'west';
    const SCOPE = '.hud, .units';
    // ---------- 1. panels: opaque (D-3), border, radius; no overlap; inside the safe area ----------
    const panels = qa('.hud .glass').filter((e) => !e.classList.contains('menu'));
    panels.forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost'), fill = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (fill !== TOK.panel) issues.push(`panel not opaque: ${label(g)} ${fill}`);
      if (effOp(g) < 0.999) issues.push(`panel not opaque (opacity ${effOp(g).toFixed(2)}): ${label(g)}`);
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== TOK.border) issues.push(`panel border ${label(g)}: ${cs.borderTopWidth} ${cs.borderTopColor}`);
      const r = parseFloat(cs.borderTopLeftRadius), w = g.classList.contains('ctl') ? TOK.rCtl : TOK.rCard;
      if (!near(r, w)) issues.push(`panel radius ${label(g)}: ${r} (want ${w})`);
    });
    const prs = panels.map((e) => ({ l: label(e), r: box(e.getBoundingClientRect()) }));
    for (let i = 0; i < prs.length; i++) for (let j = i + 1; j < prs.length; j++) if (inter(prs[i].r, prs[j].r)) issues.push(`panel overlap ${prs[i].l} / ${prs[j].l}`);
    prs.forEach((pp) => { if (pp.r.x0 < S - eps || pp.r.x1 > W - S + eps || pp.r.y1 > H - B + eps) issues.push(`panel in an inset: ${pp.l}`); });
    // ---------- 2. control heights, token and bar sizes, radii ----------
    qa('.hud .tap, .units .tap').forEach((e) => {
      const h = e.getBoundingClientRect().height, bar = e.parentElement.closest('.glass, .cap');
      if (e.matches('.u-tok')) { if (!near(h, 48)) issues.push(`token height ${h.toFixed(2)} (want the 20 pt tag over the 28 pt image: 48): ${label(e)}`); return; }
      if (e.matches('.o-btn')) { if (!near(h, 36)) issues.push(`order button height ${h.toFixed(2)} (want 36): ${label(e)}`); return; }
      const fills = bar && TOK.heights.some((x) => near(bar.getBoundingClientRect().height, x)) && near(h, bar.getBoundingClientRect().height - 2);
      if (!TOK.heights.some((x) => near(h, x)) && !fills) issues.push(`control height ${h.toFixed(2)}: ${label(e)}`);
    });
    [['.cap', 32], ['.toast', 32], ['.dock', 44], ['.orders', 44]].forEach(([s, v]) => qa(s).forEach((e) => { if (!near(e.getBoundingClientRect().height, v)) issues.push(`control height ${e.getBoundingClientRect().height.toFixed(2)} for ${s} (want ${v})`); }));
    [['.u-tag', 6], ['.o-btn', 10], ['.u-dest', 6]].forEach(([s, v]) => qa(s).forEach((e) => { const r = parseFloat(getComputedStyle(e).borderTopLeftRadius); if (!near(r, v)) issues.push(`radius ${r} for ${s} (want ${v})`); }));
    qa('.u-wp').forEach((e) => { const r = e.getBoundingClientRect(); if (!near(r.width, 20) || !near(r.height, 20) || getComputedStyle(e).borderTopLeftRadius !== '50%') issues.push('the waypoint mark is not a 20 pt circle'); });
    // ---------- 3. gaps ----------
    document.querySelectorAll('.hud *, .units *').forEach((e) => {
      if (!visible(e) || e.closest('.frost')) return;
      const cs = getComputedStyle(e); if (!/flex|grid/.test(cs.display)) return;
      [cs.columnGap, cs.rowGap].forEach((g) => { const v = g === 'normal' ? 0 : parseFloat(g); if (!TOK.space.some((s) => near(s, v))) issues.push(`gap ${v} on ${label(e)}`); });
    });
    // ---------- 4. icons ----------
    document.querySelectorAll('.hud svg.i, .hud svg.trend, .units svg.i').forEach((s) => {
      if (!s.getClientRects().length || s.closest('.frost')) return;
      const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      const want = s.classList.contains('trend') ? 10 : s.closest('.u-dest') ? 10 : s.closest('.o-btn') ? 16 : s.closest('.stat') ? 14 : s.closest('.dock') ? 17 : 16;
      if (!near(r.width, want) || !near(r.height, want)) issues.push(`icon size ${r.width.toFixed(1)}x${r.height.toFixed(1)} (want ${want}): ${label(s)}`);
      if (!near(parseFloat(cs.strokeWidth), TOK.stroke)) issues.push(`icon stroke ${cs.strokeWidth}: ${label(s)}`);
    });
    // ---------- 5. every text run: type, insets, overlap, icons over text ----------
    const texts = [], typeSeen = {};
    for (const scope of document.querySelectorAll(SCOPE)) {
      const wk = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT); let tn;
      while ((tn = wk.nextNode())) {
        if (!tn.textContent.trim()) continue;
        const el = tn.parentElement, cs = getComputedStyle(el); if (!visible(el) || el.closest('.frost')) continue;
        const range = document.createRange(); range.selectNodeContents(tn);
        const rr = [...range.getClientRects()].filter((r) => r.width > 0); if (!rr.length) continue;
        const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight, t = tn.textContent.trim();
        typeSeen[`${fs}/${fw}`] = (typeSeen[`${fs}/${fw}`] || 0) + 1;
        if (!(fs in TOK.type)) issues.push(`font size ${fs} for "${t}"`); else if (!TOK.type[fs].includes(fw)) issues.push(`font weight ${fs}/${fw} for "${t}"`);
        if (fs === 13 && !/tabular-nums/.test(cs.fontVariantNumeric)) issues.push(`13 pt not tabular: "${t}"`);
        rr.forEach((r) => { const b = box(r), lh = parseFloat(cs.lineHeight) || fs * 1.2, mid = (b.y0 + b.y1) / 2;
          texts.push({ t, fs, color: cs.color, op: effOp(el), r: { x0: b.x0, y0: b.y0, w: r.width, h: r.height }, line: { x0: b.x0, x1: b.x1, y0: mid - lh / 2, y1: mid + lh / 2 }, unit: !!el.closest('.units') });
          if (b.x0 < S - eps || b.x1 > W - S + eps) issues.push(`text in side inset: ${t}`);
          if (b.y1 > H - B + eps) issues.push(`text in bottom inset: ${t}`); });
      }
    }
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].line, b = texts[j].line;
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5) issues.push(`text overlap "${texts[i].t}" / "${texts[j].t}"`);
    }
    const icons = [...document.querySelectorAll('.hud svg, .units svg.i')].filter((s) => s.getClientRects().length && !s.closest('.frost') && !s.matches('.route')).map((s) => ({ s, r: box(s.getBoundingClientRect()) }));
    texts.forEach((t) => icons.forEach((o) => { if (o.s.closest('.badge') || o.s.closest('.bell')) return; const a = t.line, b = o.r;
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5) issues.push(`icon over text: ${label(o.s)} / "${t.t}"`); }));
    // content inside its control
    qa('.units .tap, .orders .tap, .u-dest').forEach((c) => { const cr = c.getBoundingClientRect();
      c.querySelectorAll('span, svg, b').forEach((e) => { if (!visible(e)) return; let b; if (e.tagName === 'svg') b = e.getBoundingClientRect(); else { const r = document.createRange(); r.selectNodeContents(e); b = r.getBoundingClientRect(); }
        if (b.width && (b.left < cr.left - 0.5 || b.right > cr.right + 0.5 || b.top < cr.top - 0.5 || b.bottom > cr.bottom + 0.5)) issues.push(`content outside its control (${label(c)}): ${(e.textContent || e.tagName).trim().slice(0, 20)}`); }); });
    document.querySelectorAll('.hud .glass, .hud .glass *').forEach((e) => { if (e.closest('.frost') || !visible(e)) return; const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1) issues.push(`horizontal overflow in ${label(e)}`); });
    // ---------- 6. hit boxes ----------
    const taps = qa('.hud .tap, .units .tap').map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e, y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      return { e, label: label(e), vis: box(r), hit: { x0, x1: x0 + parseFloat(ps.width), y0, y1: y0 + parseFloat(ps.height) } };
    });
    taps.forEach((t) => { const h = t.hit, v = t.vis;
      if (h.x1 - h.x0 < 44 - eps || h.y1 - h.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      if (h.x0 > v.x0 + lu || h.x1 < v.x1 - lu || h.y0 > v.y0 + lu || h.y1 < v.y1 - lu) issues.push(`hit box does not cover: ${t.label}`);
      if (h.x0 < S - eps || h.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      if (h.y1 > H - B + lu || h.y0 < -eps) issues.push(`tap in bottom inset/off top: ${t.label}`); });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) { const a = taps[i], b = taps[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue; if (inter(a.hit, b.hit)) issues.push(`hit overlap ${a.label} / ${b.label}`); }
    // ---------- 7. the HUD at its B3 place; the dock there, or the order bar on its line ----------
    ['.top > .nation', '.top > .stats', '.top > .date', '.toast', '.btn.mode', '.btn.home'].forEach((s) => { const e = q(s), ref = b3[s][0], rr = e.getBoundingClientRect();
      if (!visible(e)) { issues.push(`HUD element hidden: ${s}`); return; }
      // the map-mode chip names the mode («عسكرية» here), so only its width may differ from B3's
      const dx = s === '.btn.mode' ? Math.abs(rr.left - ref.x0) : Math.max(Math.abs(rr.left - ref.x0), Math.abs(rr.right - ref.x1));
      if (Math.max(dx, Math.abs(rr.top - ref.y0), Math.abs(rr.bottom - ref.y1)) > 0.5) issues.push(`HUD element moved from its B3 position: ${s}`); });
    if (T(q('.btn.mode')) !== 'الخريطة: عسكرية') issues.push(`the map mode reads «${T(q('.btn.mode'))}» (want «الخريطة: عسكرية»)`);
    { const dk = q('.dock'), ob = q('.orders'), ref = b3['.dock'][0];
      if (sel) {
        if (visible(dk)) issues.push('the dock shows beside the order bar');
        if (!visible(ob)) issues.push('the order bar is missing with an army selected');
        else { const r = ob.getBoundingClientRect();
          if (!near(r.top, ref.y0, 0.5) || !near(r.bottom, ref.y1, 0.5) || !near((r.left + r.right) / 2, (ref.x0 + ref.x1) / 2, 0.6)) issues.push(`the order bar is not on the dock's line, centred: x ${r.left.toFixed(1)}..${r.right.toFixed(1)} y ${r.top.toFixed(1)}`); }
      } else {
        if (visible(ob)) issues.push('the order bar shows with nothing selected');
        const r = dk.getBoundingClientRect(); if (!visible(dk) || Math.max(Math.abs(r.left - ref.x0), Math.abs(r.top - ref.y0), Math.abs(r.right - ref.x1)) > 0.5) issues.push('the dock is not at its B3 place');
      } }
    // ---------- 8. the units ----------
    const mr = q('.map').getBoundingClientRect(), mk = mr.width / 1688, at = (p) => [mr.left + p[0] * mk, mr.top + p[1] * mk];
    if (mr.left > 0.5 || mr.top > 0.5 || mr.right < W - 0.5 || mr.bottom < H - 0.5) issues.push('map not full-bleed');
    const legs = []; let total = 0;
    for (let i = 1; i < DATA.ROUTE.length; i++) { const a = DATA.ROUTE[i - 1], b = DATA.ROUTE[i], km = Math.hypot((b[0] - a[0]) * DATA.KM.x, (b[1] - a[1]) * DATA.KM.y); legs.push({ a, b, km, from: total }); total += km; }
    const days = total / DATA.KMDAY, share = { moving: 0.5, arrived: 1, halted: 0.3 }[view] || 0, e = view === 'idle' ? null : share * days, halted = view === 'halted';
    const along = (k) => { for (const L of legs) if (k <= L.from + L.km + 1e-9) { const f = (k - L.from) / L.km; return [L.a[0] + (L.b[0] - L.a[0]) * f, L.a[1] + (L.b[1] - L.a[1]) * f]; } return DATA.ROUTE[DATA.ROUTE.length - 1]; };
    const moving = e !== null && e < days - 1e-9;
    const ar = (n, one, two, few, many) => n === 1 ? one : n === 2 ? two : (n >= 3 && n <= 10 ? n + ' ' + few : n + ' ' + many);
    const fm = (n) => ar(n, 'تشكيل واحد', 'تشكيلان', 'تشكيلات', 'تشكيلًا');
    const what = (id) => id === 'fleet' ? ar(DATA.STRENGTH[id], 'سفينة', 'سفينتان', 'سفن', 'سفينة') : id === 'air' ? ar(DATA.STRENGTH[id], 'طائرة', 'طائرتان', 'طائرات', 'طائرة') : fm(DATA.STRENGTH[id]);
    // the arrival counted on the HUD's dates (the frozen views start the march on 1 January): «الوصول بعد N» and the
    // date shown on arrival agree
    const left = e === null ? 0 : Math.floor(days + 1e-9) - Math.floor(e + 1e-9), arrive = left === 0 ? 'الوصول اليوم' : 'الوصول بعد ' + ar(left, 'يوم', 'يومين', 'أيام', 'يومًا');
    const toks = qa('.u-tok');
    if (toks.length !== Object.keys(DATA.POS).length) issues.push(`tokens shown: ${toks.length} (want ${Object.keys(DATA.POS).length})`);
    toks.forEach((t) => { const id = t.dataset.u, r = t.getBoundingClientRect(), ir = t.querySelector('.u-img').getBoundingClientRect(), c = [(ir.left + ir.right) / 2, (ir.top + ir.bottom) / 2];   // the image's centre is the place
      const p = id === 'west' && e !== null ? along(e * DATA.KMDAY) : DATA.POS[id], w = at(p);
      if (Math.hypot(c[0] - w[0], c[1] - w[1]) > 0.75) issues.push(`token «${DATA.NAMES[id]}» not at its map position: ${c.map((x) => x.toFixed(1))} (want ${w.map((x) => x.toFixed(1))})`);
      if (r.left < S + 2 - eps || r.right > W - S - 2 + eps || r.top < 2 - eps || r.bottom > H - B - 2 + eps) issues.push(`token «${DATA.NAMES[id]}» not whole inside the safe screen`);
      prs.forEach((pp) => { if (inter(box(r), pp.r)) issues.push(`token «${DATA.NAMES[id]}» under the panel ${pp.l}`); });
      const n = nums(T(t.querySelector('b')))[0];
      if (n !== DATA.STRENGTH[id]) issues.push(`token «${DATA.NAMES[id]}» shows ${n} (the strength is ${DATA.STRENGTH[id]})`);
      if (!t.querySelector('.u-flag img') || !/flag_eg/.test(t.querySelector('.u-flag img').getAttribute('src'))) issues.push(`token «${DATA.NAMES[id]}» without its flag`);
      // VoiceOver reads the whole unit: name, strength, and where it is or goes
      let want;
      if (id === 'cairo') want = `${DATA.NAMES.cairo}: جيشان، ${fm(DATA.STRENGTH.cairo)}، المنطقة المركزية ${fm(DATA.PARTS.central)} والحرس الجمهوري ${fm(DATA.PARTS.guard)}. يعرض الجيشين`;
      else { let where = DATA.PLACE[id];
        if (id === 'west' && e !== null) where = !moving ? `في ${DATA.TO}` : halted ? `على طريق ${DATA.TO}، الأمر: توقّف` : `في الطريق إلى ${DATA.TO}، ${arrive}`;
        want = `${DATA.NAMES[id]}، مصر: ${what(id)}، ${where}`; }
      if ((t.getAttribute('aria-label') || '') !== want) issues.push(`a11y: token «${DATA.NAMES[id]}» reads «${t.getAttribute('aria-label')}» (want «${want}»)`);
      if (t.getAttribute('aria-pressed') !== String(id === sel)) issues.push(`token «${DATA.NAMES[id]}» selection state wrong (aria-pressed ${t.getAttribute('aria-pressed')})`);
      const tg = getComputedStyle(t.querySelector('.u-tag')), ring = tg.outlineStyle !== 'none' && tg.outlineColor === TOK.teal;
      const ih = t.querySelector('.u-img').getBoundingClientRect().height; if (!near(ih, 28, 0.1)) issues.push(`token «${DATA.NAMES[id]}»: the image is ${ih.toFixed(1)} pt tall (want 28)`);
      const tgr = t.querySelector('.u-tag').getBoundingClientRect(); if (!(tgr.bottom <= ir.top + 0.5) || Math.abs((tgr.left + tgr.right) / 2 - c[0]) > 0.75) issues.push(`token «${DATA.NAMES[id]}»: the tag is not centred above the image`);
      if (ring !== (id === sel)) issues.push(`token «${DATA.NAMES[id]}»: the teal ring ${ring ? 'on an unselected token' : 'missing on the selected one'}`);
      if (getComputedStyle(t).transitionDuration.split(',').some((x) => parseFloat(x) > 0)) issues.push(`token «${DATA.NAMES[id]}» animates its moves with a transition (steps must be steps)`); });
    // the owner's generic unit images (design/generated/units): tanks for armies, the destroyer for the fleet, the fighter for the air group
    { const img = { west: 'tank', north: 'tank', cairo: 'tank', second: 'tank', third: 'tank', fleet: 'destroyer', air: 'fighter' };
      toks.forEach((t) => { const u = t.querySelector('.u-img'); if (!u || u.getAttribute('src') !== 'units/' + img[t.dataset.u] + '.png' || !u.complete || !u.naturalWidth) issues.push(`token «${DATA.NAMES[t.dataset.u]}» has the wrong image`); }); }
    // nothing on the page runs a CSS animation (frames only while a unit moves)
    if (document.getAnimations().length) issues.push(`${document.getAnimations().length} CSS animations running on the map`);
    // the route: shown exactly while the army is under way; from the unit through the waypoint still ahead to the base of
    // the arrowhead at the destination; the halo under the same line
    const rt = q('.route .line'), dst = at(DATA.ROUTE[DATA.ROUTE.length - 1]);
    if (moving !== visible(q('.route'))) issues.push(`the route is ${moving ? 'missing while the army is under way' : 'shown with no army under way'}`);
    if (moving) {
      const P = (s) => (s || '').replace(/^M/, '').replace(/Z$/, '').split('L').map((x) => x.split(',').map(Number));
      const pts = P(rt.getAttribute('d')), k = e * DATA.KMDAY, want = [along(k)].concat(DATA.ROUTE.slice(1).filter((p, i) => legs[i].from + legs[i].km > k + 1e-9)).map(at);
      const z = want[want.length - 1], y = want[want.length - 2], L = Math.hypot(z[0] - y[0], z[1] - y[1]), base = [z[0] - 9 * (z[0] - y[0]) / L, z[1] - 9 * (z[1] - y[1]) / L];
      const wantLine = want.slice(0, -1).concat([base]);
      if (pts.length !== wantLine.length || pts.some((p, i) => Math.hypot(p[0] - wantLine[i][0], p[1] - wantLine[i][1]) > 0.75)) issues.push(`the route is not unit → waypoint ahead → the arrowhead's base: ${JSON.stringify(pts.map((p) => p.map(Math.round)))}`);
      if (q('.route .halo').getAttribute('d') !== rt.getAttribute('d')) issues.push('the route\'s halo is not under its line');
      if (getComputedStyle(rt).stroke !== TOK.teal || getComputedStyle(rt).strokeDasharray === 'none') issues.push('the route is not a dashed teal line');
      const hd = P(q('.route .head').getAttribute('d'));
      const mid = hd.length === 3 ? [(hd[1][0] + hd[2][0]) / 2, (hd[1][1] + hd[2][1]) / 2] : [NaN, NaN];
      if (hd.length !== 3 || Math.hypot(hd[0][0] - dst[0], hd[0][1] - dst[1]) > 0.75 || Math.hypot(mid[0] - base[0], mid[1] - base[1]) > 0.75) issues.push('the arrowhead does not point along the last leg to the destination');
      const wpAhead = legs[0].from + legs[0].km > k + 1e-9, wp = q('.u-wp');
      if (wpAhead !== visible(wp)) issues.push(`the waypoint mark is ${wpAhead ? 'missing' : 'shown after it was passed'}`);
      if (wpAhead) { const r = wp.getBoundingClientRect(), w = at(DATA.ROUTE[1]); if (Math.hypot((r.left + r.right) / 2 - w[0], (r.top + r.bottom) / 2 - w[1]) > 0.75 || T(wp) !== '1') issues.push('the waypoint mark is not «1» at the waypoint'); }
      // the destination's name: 8 pt off the tip on the side away from the last leg, and never over the route
      const ds = q('.u-dest'), dr = ds.getBoundingClientRect(), a2 = DATA.ROUTE[DATA.ROUTE.length - 2], b2 = DATA.ROUTE[DATA.ROUTE.length - 1], ddx = b2[0] - a2[0], ddy = b2[1] - a2[1];
      const side = Math.abs(ddy) >= Math.abs(ddx) ? (ddy > 0 ? 'below' : 'above') : (ddx > 0 ? 'right' : 'left');
      const okSide = { below: near(dr.top, dst[1] + 8, 0.75) && near((dr.left + dr.right) / 2, dst[0], 0.75), above: near(dr.bottom, dst[1] - 8, 0.75) && near((dr.left + dr.right) / 2, dst[0], 0.75),
        right: near(dr.left, dst[0] + 8, 0.75) && near((dr.top + dr.bottom) / 2, dst[1], 0.75), left: near(dr.right, dst[0] - 8, 0.75) && near((dr.top + dr.bottom) / 2, dst[1], 0.75) }[side];
      if (T(ds) !== DATA.TO || !okSide) issues.push(`the destination's name is not «${DATA.TO}» 8 pt ${side} the tip`);
      for (let kk = k; kk <= total; kk += 2) { const c = at(along(kk)); if (c[0] > dr.left - 1 && c[0] < dr.right + 1 && c[1] > dr.top - 1 && c[1] < dr.bottom + 1) { issues.push('the destination\'s name covers the route'); break; } }
      [wp, ds].filter(visible).forEach((m) => { const r = m.getBoundingClientRect();
        if (r.left < S - eps || r.right > W - S + eps || r.top < 0 || r.bottom > H - B) issues.push(`the mark «${T(m)}» is outside the safe screen`);
        prs.forEach((pp) => { if (inter(box(r), pp.r)) issues.push(`the mark «${T(m)}» under the panel ${pp.l}`); }); });
      // the whole route ahead stays clear of the panels, so the gliding unit never passes under one
      for (let kk = k; kk <= total; kk += 4) { const c = at(along(kk)), wt = toks.find((t) => t.dataset.u === 'west'), tw = wt.getBoundingClientRect().width / 2, th = wt.getBoundingClientRect().height, ih = wt.querySelector('.u-img').getBoundingClientRect().height;
        const rb = { x0: c[0] - tw, x1: c[0] + tw, y0: c[1] - (th - ih / 2), y1: c[1] + ih / 2 };
        const hit = prs.find((pp) => inter(rb, pp.r)); if (hit) { issues.push(`the route ahead passes under the panel ${hit.l}`); break; }
        if (rb.x0 < S || rb.x1 > W - S || rb.y0 < 0 || rb.y1 > H - B) { issues.push('the route ahead leaves the safe screen'); break; } }
    }
    // the date: 1 January 2011 plus the whole days marched, with its weekday
    { const day = 1 + (e === null ? 0 : Math.floor(e + 1e-9)), DOW = ['السبت', 'الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
      const shown = q('.date .dmy').dataset.full || T(q('.date .dmy')), dow = q('.date .dow').dataset.dow || T(q('.date .dow'));
      if (shown !== day + ' يناير 2011' || dow !== DOW[(day - 1) % 7]) issues.push(`the date is not ${DOW[(day - 1) % 7]} ${day} يناير 2011: «${dow} ${shown}»`); }
    // the order bar: the military panel's words; the army, its line and the order in force
    if (sel) {
      const words = [...document.querySelectorAll('.o-btn')].map((b) => T(b.querySelector('span'))).join('|');
      if (words !== 'تقدّم|هجوم|توقّف|نقطة عبور|إغلاق') issues.push(`the orders are «${words}» (want the military panel's تقدّم|هجوم|توقّف|نقطة عبور, then إغلاق)`);
      const nm = T(q('.o-name')), sub = T(q('.o-sub'));
      const wantSub = !moving ? `${what('west')} · في ${DATA.TO}` : halted ? `${what('west')} · على طريق ${DATA.TO} · الأمر: توقّف` : `${what('west')} · إلى ${DATA.TO} · ${arrive}`;
      if (nm !== DATA.NAMES.west) issues.push(`the bar names «${nm}», not the selected army`);
      if (sub !== wantSub) issues.push(`the bar's line is «${sub}» (want «${wantSub}»)`);
      const on = [...document.querySelectorAll('.o-btn.on')].map((b) => b.dataset.o), wantOn = moving && !halted ? 'move' : 'halt';
      if (on.length !== 1 || on[0] !== wantOn) issues.push(`the order in force is ${on.join(',') || 'none'} (want ${wantOn})`);
      document.querySelectorAll('.o-btn.on').forEach((b) => { if (getComputedStyle(b).backgroundColor !== TOK.t1) issues.push('the order in force is not white'); });
      const atk = q('.o-btn[data-o="attack"]');
      if (atk.getAttribute('aria-disabled') !== 'true' || !/غير متاح/.test(atk.getAttribute('aria-label') || '') || atk.querySelector('use').getAttribute('href') !== '#i-lock') issues.push('attack is not locked (no war)');
      const ul = q('.o-unit').getAttribute('aria-label') || '';
      if (ul !== nm + '، ' + sub.split(' · ').join('، ')) issues.push('a11y: the bar\'s army does not read all it shows');
      if (q('.o-unit').getAttribute('role') !== 'group') issues.push('a11y: the bar\'s army is not a group');
      // the tip that says why attack is locked: shown in the tip view, 8 pt above the bar, centred on the attack button
      const tip = q('.o-tip');
      if ((view === 'tip') !== visible(tip)) issues.push(`the attack note is ${view === 'tip' ? 'missing' : 'shown unasked'}`);
      if (view === 'tip' && visible(tip)) { const tr = tip.getBoundingClientRect(), xr = atk.getBoundingClientRect(), br = q('.orders').getBoundingClientRect();
        if (T(tip) !== 'لا حرب: يُفتح الهجوم عند إعلان الحرب' || !near((tr.left + tr.right) / 2, (xr.left + xr.right) / 2, 0.75) || !near(tr.bottom, br.top - 8, 0.75)) issues.push('the attack note is not «لا حرب: يُفتح الهجوم عند إعلان الحرب» 8 pt above the bar over the attack button'); }
    }
    if (qa('.u-tok[aria-pressed="true"]').length !== (sel ? 1 : 0)) issues.push(`tokens selected: ${qa('.u-tok[aria-pressed="true"]').length} (want ${sel ? 1 : 0})`);
    // RTL order of the bar: army, separator, move, attack, halt, waypoint, separator, close
    if (sel) { const seq = ['.o-unit', '.o-btn[data-o="move"]', '.o-btn[data-o="attack"]', '.o-btn[data-o="halt"]', '.o-btn[data-o="waypoint"]', '.o-x'].map((s) => q(s).getBoundingClientRect());
      for (let k = 1; k < seq.length; k++) if (!(seq[k].right <= seq[k - 1].left + 0.5)) { issues.push('the order bar is not army, move, attack, halt, waypoint, close (right to left)'); break; } }
    // no real weapon names, in text or VoiceOver
    { const all = document.body.textContent + ' ' + [...document.querySelectorAll('[aria-label]')].map((x) => x.getAttribute('aria-label')).join(' ');
      if (new RegExp(DATA.WEAPONS, 'i').test(all)) issues.push('a real weapon name on the map'); }
    // the main cities keep their names next to their units (a name a unit covers moves under it)
    ['القاهرة', 'الإسكندرية'].forEach((n) => { const l = [...document.querySelectorAll('.labels text')].find((x) => x.textContent === n); if (!l || !l.getClientRects().length) issues.push(`the city name «${n}» is not shown`); });
    // map labels: never cut by a token, a mark or a panel edge, never sliced by the screen edge or the side inset
    const marks = qa('.u-tok, .u-wp, .u-dest').map((x) => box(x.getBoundingClientRect()));
    document.querySelectorAll('.labels text, .labels circle').forEach((t) => {
      if (!t.getClientRects().length) return;
      const r = t.getBoundingClientRect(), sw = parseFloat(t.getAttribute('stroke-width') || 0) / 2 * mk, b = { x0: r.left - sw - 2, y0: r.top - sw - 2, x1: r.right + sw + 2, y1: r.bottom + sw + 2 };
      if (r.right + sw <= 0 || r.left - sw >= W || r.bottom + sw <= 0 || r.top - sw >= H) return;
      const what = t.tagName === 'text' ? `label ${t.textContent}` : `city dot ${t.getAttribute('data-city')}`;
      // a city's name sits west of its dot, never over it (direction rtl on the shared overlay)
      if (t.tagName === 'circle') { const nm = document.querySelector(`.labels text[data-city="${t.getAttribute('data-city')}"]`), a = nm.getBBox(), c = t.getBBox();
        if (nm.getClientRects().length && a.x + a.width > c.x - 2 && a.x < c.x + c.width + 2 && a.y + a.height > c.y && a.y < c.y + c.height) issues.push(`map city dot under its own name: ${t.getAttribute('data-city')}`); }
      if (marks.some((m) => inter(b, m))) issues.push(`map ${what} under a unit or a route mark`);
      const under = prs.some((o) => r.left - sw >= o.r.x0 && r.right + sw <= o.r.x1 && r.top - sw >= o.r.y0 && r.bottom + sw <= o.r.y1);
      if (!under && prs.some((o) => inter(b, o.r))) issues.push(`map ${what} cut by a panel edge`);
      if (r.left - sw < Math.max(S, 0) || r.right + sw > W - Math.max(S, 0) || r.top - sw < 0 || r.bottom + sw > H) issues.push(`map ${what} sliced by the screen edge or the side inset`);
    });
    // last, as it redraws the page: every other unit's bar, drawn in memory (the page's own state, restored after): its line, and for the stack its two
    // armies and no order until one is chosen
    if (window.ST && window.render) { const keep = window.ST.sel;
      Object.keys(DATA.POS).filter((id) => id !== 'west').forEach((id) => { window.ST.sel = id; window.render();
        const nm = T(q('.o-name')), sub = T(q('.o-sub'));
        const want = id === 'cairo' ? [`${DATA.NAMES.cairo}: جيشان`, `المنطقة المركزية ${fm(DATA.PARTS.central)} · الحرس الجمهوري ${fm(DATA.PARTS.guard)}`] : [DATA.NAMES[id], `${what(id)} · ${DATA.PLACE[id]}` + (DATA.ORG[id] ? ` · التنظيم ${DATA.ORG[id]}%` : '')];
        if (nm !== want[0] || sub !== want[1]) issues.push(`the bar for «${DATA.NAMES[id]}» reads «${nm} · ${sub}» (want «${want.join(' · ')}»)`);
        if (id === 'cairo' && ['move', 'halt', 'waypoint'].some((o) => q(`.o-btn[data-o="${o}"]`).getAttribute('aria-disabled') !== 'true')) issues.push('the stack takes orders before one of its armies is chosen');
        if (id !== 'cairo' && q('.o-btn.on')) issues.push(`an order shows in force for «${DATA.NAMES[id]}», which has none`); });
      window.ST.sel = keep; window.render(); }
    return { issues, texts, typeSeen, map: window.__map, units: window.__units, hits: taps.map((t) => ({ l: t.label, x0: +t.hit.x0.toFixed(1), x1: +t.hit.x1.toFixed(1), y0: +t.hit.y0.toFixed(1), y1: +t.hit.y1.toFixed(1) })) };
  }, { d, b3, view, DATA, HUDSEL });
}

async function contrast(p, texts) {
  await p.addStyleTag({ content: ':root body .hud, :root body .hud *, :root body .units, :root body .units * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } :root body .hud svg, :root body .units svg, :root body .flag, :root body .u-flag, .dev { visibility: hidden !important; }' });
  await p.waitForTimeout(150);
  const buf = await p.screenshot({ scale: 'css' });
  return p.evaluate(async ({ b64, texts }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const k = img.width / innerWidth, lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b), parse = (s) => s.match(/[\d.]+/g).map(Number), parseA = (s) => { const v = parse(s); return v.length > 3 ? v : v.concat([1]); };
    return texts.map((t) => {
      const iy = t.r.h * 0.15, x0 = Math.floor(t.r.x0 * k), y0 = Math.floor((t.r.y0 + iy) * k), w = Math.max(1, Math.ceil(t.r.w * k)), h = Math.max(1, Math.ceil((t.r.h - 2 * iy) * k));
      const d = g.getImageData(x0, y0, w, h).data, [r, gg, b, a0] = parseA(t.color), a = a0 * (t.op == null ? 1 : t.op), cr = (p, q2) => (Math.max(p, q2) + 0.05) / (Math.min(p, q2) + 0.05);
      let worst = Infinity;
      for (let i = 0; i < d.length; i += 4) { const lb = L(d[i], d[i + 1], d[i + 2]), lt = L(a * r + (1 - a) * d[i], a * gg + (1 - a) * d[i + 1], a * b + (1 - a) * d[i + 2]); worst = Math.min(worst, cr(lt, lb)); }
      return { t: t.t.slice(0, 24), fs: t.fs, worst: +worst.toFixed(2) };
    });
  }, { b64: buf.toString('base64'), texts });
}
async function check(p, d, b3, view) {
  const m = await measure(p, d, b3, view);
  const c = await contrast(p, m.texts);
  c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} for "${x.t}"`));
  return { m, c };
}

// Lightness (D-15) in the live page. Counted from outside the page's code: every requestAnimationFrame, setTimeout and
// setInterval callback (an init script wraps them), every map frame the page draws (window.__frames), and the CSS
// animations running. Rules: ≤30 map frames and ≤31 animation-frame wakes a second while gliding (×1, ×2, ×5); one map
// frame per game day, ≤10 a second, at ×10, at «أقصى» (3 days a step) and with Reduce Motion (the URL's or the
// system's); with nothing moving no map frame, no animation frame, no interval, and the clock's date at most 4 a
// second; paused, nothing at all; halting the army stops its frames while the clock runs.
const COUNT = () => { const c = window.__cnt = { raf: 0, to: 0, iv: 0 }, R = window.requestAnimationFrame.bind(window), S = window.setTimeout.bind(window), I = window.setInterval.bind(window);
  window.requestAnimationFrame = (f) => R((t) => { c.raf++; f(t); });
  window.setTimeout = (f, ms, ...a) => S(typeof f === 'function' ? (...x) => { c.to++; f(...x); } : f, ms, ...a);
  window.setInterval = (f, ms, ...a) => I(typeof f === 'function' ? (...x) => { c.iv++; f(...x); } : f, ms, ...a); };
async function lightness(b, d, plant, ctxOpts) {
  const issues = [], out = {};
  const run = async (extra, fn, opts) => {
    const ctx = await b.newContext(Object.assign({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 }, opts || {}));
    await ctx.addInitScript(COUNT);
    const p = await ctx.newPage(); await p.goto(PAGE + qs(d) + extra); await p.waitForFunction(() => window.__ready === true);
    if (plant) await p.evaluate(plant);
    const r = await fn(p); await ctx.close(); return r; };
  // what happens in a window of ms (the page's own counter, the wrapped callbacks, and the animations at the end)
  const win = (p, ms) => p.evaluate((ms) => new Promise((res) => { const f0 = window.__frames, c0 = Object.assign({}, window.__cnt);
    setTimeout(() => { const c = window.__cnt; res({ frames: window.__frames - f0, raf: c.raf - c0.raf, to: c.to - c0.to, iv: c.iv - c0.iv, anim: document.getAnimations().length, date: document.querySelector('.date .dmy').textContent, on: [...document.querySelectorAll('.o-btn.on')].map((x) => x.dataset.o).join(','), sub: document.querySelector('.o-sub').textContent, play: document.querySelector('.play use').getAttribute('href') }); }, ms); }), ms);
  // the measuring timer itself is one setTimeout callback: subtract it
  const W = async (p, ms) => { const r = await win(p, ms); r.to = Math.max(0, r.to - 1); return r; };
  for (const sp of ['1', '2', '5']) {
    const r = await run('&loop=0&speed=' + sp, async (p) => { await p.waitForTimeout(150); return W(p, 500); });
    out['glide' + sp] = r;
    if (!(r.frames >= 4 && r.frames <= 16) || r.raf > 16) issues.push(`gliding at ×${sp} draws ${r.frames} map frames and ${r.raf} animation frames in half a second (want 4..15, ≤30 a second)`);
    if (r.anim) issues.push(`${r.anim} CSS animations while gliding at ×${sp}`);
  }
  for (const [k, extra, ms, lo, hi, opts] of [['steps10', '&loop=0&speed=10', 500, 2, 5], ['stepsMax', '&loop=0&speed=max', 400, 1, 4], ['reduce', '&loop=0&motion=reduce', 2100, 1, 3], ['reduceOS', '&loop=0', 2100, 1, 3, { reducedMotion: 'reduce' }]]) {
    const r = await run(extra, async (p) => { await p.waitForTimeout(80); return W(p, ms); }, opts);
    out[k] = r;
    if (!(r.frames >= lo && r.frames <= hi) || r.raf > 0) issues.push(`${k}: ${r.frames} map frames and ${r.raf} animation frames in ${ms} ms (want steps: ${lo}..${hi} frames, no animation frame)`);
  }
  // after arrival (×5): no map frame, no animation frame, no interval, the date's clock at most 4 a second
  out.after = await run('&loop=0&speed=5', async (p) => { await p.waitForFunction(() => window.__units && !window.__units.moving, null, { timeout: 9000 }).catch(() => {}); await p.waitForTimeout(150); return W(p, 1000); });
  if (out.after.frames || out.after.raf || out.after.iv || out.after.to > 4 || out.after.anim) issues.push(`with nothing moving: ${out.after.frames} map frames, ${out.after.raf} animation frames, ${out.after.iv} interval calls, ${out.after.to} timer calls, ${out.after.anim} animations in a second (want 0, 0, 0, ≤4, 0)`);
  // paused: nothing at all, and the play button shows play
  out.paused = await run('&loop=0', async (p) => { await p.click('.play'); await p.waitForTimeout(150); return W(p, 800); });
  if (out.paused.frames || out.paused.raf || out.paused.iv || out.paused.to || out.paused.anim) issues.push(`while paused: ${out.paused.frames} map frames, ${out.paused.raf} animation frames, ${out.paused.iv} interval calls, ${out.paused.to} timer calls (want none)`);
  if (out.paused.play !== '#i-play') issues.push('the play button does not show play while paused');
  // halt: the army stops (no map frame), the clock runs on (the date changes), the bar shows the halt in force
  out.halt = await run('&loop=0&speed=2', async (p) => { await p.waitForTimeout(300); await p.click('.o-btn[data-o="halt"]'); await p.waitForTimeout(100); const d0 = await p.evaluate(() => document.querySelector('.date .dmy').textContent); const r = await W(p, 1300); r.date0 = d0; return r; });
  if (out.halt.frames || out.halt.raf || out.halt.date === out.halt.date0 || out.halt.on !== 'halt' || !/الأمر: توقّف/.test(out.halt.sub)) issues.push(`halting the army: ${out.halt.frames} map frames, ${out.halt.raf} animation frames, the date ${out.halt.date0} → ${out.halt.date}, order ${out.halt.on}, «${out.halt.sub}» (want 0, 0, the clock running, halt in force)`);
  return { issues, out };
}

async function selftest(b) {
  const d = ALL.find((x) => x.id === 'i16promax'), se = ALL.find((x) => x.id === 'se');
  const ref = { i16promax: await b3Rects(b, d), se: await b3Rects(b, se) };
  const ctxs = {};
  for (const x of [d, se]) ctxs[x.id] = await b.newContext({ viewport: { width: x.w, height: x.h }, deviceScaleFactor: 1 });
  const V = (extra) => (VIEWS.find((v) => v[1] === extra) || VIEWS[0])[2];
  const cases = [
    ['panel not opaque', d, '&t=0', '.orders > .frost::after { background: rgba(9, 17, 25, 0.66) !important; }', /panel not opaque/],
    ['type size', d, '&t=0', '.o-tt b { font-size: 12px !important; }', /font size 12 for/],
    ['13 pt not tabular', d, '&t=0', '.u-tok b { font-variant-numeric: normal !important; }', /13 pt not tabular/],
    ['token height', d, '&t=0', '.u-img { height: 34px !important; }', /token height 52|the image is 34/],
    ['order button height', d, '&t=0', '.o-btn { height: 40px !important; }', /order button height 40/],
    ['icon size', se, '&t=0', '.o-btn svg.i { width: 18px !important; height: 18px !important; }', /icon size 18/],
    ['gap', d, '&t=0', '.u-tag { gap: 6px !important; }', /gap 6 on/],
    ['token off its place', d, '&t=0', '', /token «المنطقة الشمالية» not at its map position/, () => { const t = document.querySelector('.u-tok[data-u="north"]'); t.style.left = (parseFloat(t.style.left) + 6) + 'px'; }],
    ['moving token off the route share', d, '&t=0.5', '', /token «المنطقة الغربية» not at its map position/, () => { const t = document.querySelector('.u-tok[data-u="west"]'); t.style.top = (parseFloat(t.style.top) + 5) + 'px'; }],
    ['token in the side inset', d, '&t=0', '', /not whole inside the safe screen|tap in side inset/, () => { const t = document.querySelector('.u-tok[data-u="third"]'); t.style.left = (window.__dev.W - 40) + 'px'; }],
    ['token under a panel', d, '&t=0', '', /under the panel/, () => { const t = document.querySelector('.u-tok[data-u="fleet"]'); t.style.top = '20px'; }],
    ['tokens touching', d, '&t=0', '', /hit overlap/, () => { const a = document.querySelector('.u-tok[data-u="second"]'), c = document.querySelector('.u-tok[data-u="third"]'); c.style.left = a.style.left; c.style.top = (parseFloat(a.style.top) + 20) + 'px'; }],
    ['strength not the panel\'s', d, '&t=0', '', /shows 5 \(the strength is 4\)/, () => { document.querySelector('.u-tok[data-u="north"] b').textContent = '5'; }],
    ['wrong image', d, '&t=0', '', /token «أسطول المتوسط» has the wrong image/, () => { document.querySelector('.u-tok[data-u="fleet"] .u-img').setAttribute('src', 'units/tank.png'); }],
    ['tag off its image', d, '&t=0', '.u-tok[data-u="north"] .u-tag { margin-left: 30px !important; }', /token «المنطقة الشمالية»: the tag is not centred above the image/],
    ['token silent', d, '&t=0', '', /a11y: token «الجيش الثاني الميداني» reads/, () => { document.querySelector('.u-tok[data-u="second"]').setAttribute('aria-label', 'جيش'); }],
    ['token ETA heard wrong', d, '&t=0', '', /a11y: token «المنطقة الغربية» reads/, () => { const t = document.querySelector('.u-tok[data-u="west"]'); t.setAttribute('aria-label', t.getAttribute('aria-label').replace('7 أيام', '8 أيام')); }],
    ['stack parts heard wrong', d, '&t=0', '', /a11y: token «القاهرة» reads/, () => { const t = document.querySelector('.u-tok[data-u="cairo"]'); t.setAttribute('aria-label', t.getAttribute('aria-label').replace('5 تشكيلات', '4 تشكيلات')); }],
    ['place heard wrong', d, '&t=0', '', /a11y: token «المنطقة الشمالية» reads/, () => { const t = document.querySelector('.u-tok[data-u="north"]'); t.setAttribute('aria-label', t.getAttribute('aria-label').replace('الإسكندرية', 'مطروح')); }],
    ['another bar wrong', d, '&t=0', '', /the bar for «المنطقة الشمالية» reads/, () => { const r = window.render; window.render = () => { r(); if (window.ST.sel === 'north') document.querySelector('.o-sub').textContent = '4 تشكيلات · الإسكندرية · التنظيم 57%'; }; }],
    ['stack takes orders', d, '&t=0', '', /the stack takes orders before one of its armies is chosen/, () => { const r = window.render; window.render = () => { r(); if (window.ST.sel === 'cairo') document.querySelector('.o-btn[data-o="move"]').removeAttribute('aria-disabled'); }; }],
    ['two selected', d, '&t=0', '', /tokens selected: 2/, () => { document.querySelector('.u-tok[data-u="air"]').setAttribute('aria-pressed', 'true'); }],
    ['ring missing', d, '&t=0', '.u-tok[aria-pressed="true"] .u-tag { outline: none !important; }', /the teal ring missing/],
    ['route off', d, '&t=0', '', /the route is not unit → waypoint ahead/, () => { const l = document.querySelector('.route .line'); l.setAttribute('d', l.getAttribute('d').replace(/L[\d.]+,[\d.]+/, 'L300,200')); }],
    ['route shown idle', d, '&state=idle', '[data-route="0"] .route { display: block !important; }', /the route is shown with no army under way/],
    ['route plain', d, '&t=0', '.route .line { stroke-dasharray: none !important; }', /not a dashed teal line/],
    ['arrowhead off', d, '&t=0', '', /the arrowhead does not point along the last leg/, () => { document.querySelector('.route .head').setAttribute('d', 'M10,10L20,20L10,20Z'); }],
    ['arrowhead reversed', d, '&t=0', '', /the arrowhead does not point along the last leg/, () => { const h = document.querySelector('.route .head'), P = h.getAttribute('d').replace(/^M/, '').replace(/Z$/, '').split('L').map((s) => s.split(',').map(Number)), m = [(P[1][0] + P[2][0]) / 2, (P[1][1] + P[2][1]) / 2], f = (q) => [2 * P[0][0] - q[0], 2 * P[0][1] - q[1]]; h.setAttribute('d', 'M' + [P[0], f(P[1]), f(P[2])].map((q) => q.join(',')).join('L') + 'Z'); }],
    ['halo off the line', d, '&t=0.5', '', /the route's halo is not under its line/, () => { document.querySelector('.route .halo').setAttribute('d', 'M10,10L300,100'); }],
    ['name over the route', d, '&t=0', '', /the destination's name is not «سيوة»|covers the route/, () => { const s = document.querySelector('.u-dest'); s.style.top = (parseFloat(s.style.top) - 40) + 'px'; s.style.left = (parseFloat(s.style.left) + 20) + 'px'; }],
    ['waypoint shown after passing', d, '&t=0.5', '', /the waypoint mark is shown after it was passed/, () => { document.querySelector('.u-wp').style.display = 'flex'; }],
    ['destination mark off', d, '&t=0', '', /the destination's name is not «سيوة» 8 pt below the tip/, () => { const s = document.querySelector('.u-dest'); s.style.top = (parseFloat(s.style.top) + 30) + 'px'; }],
    ['date not the march', d, '&t=0.5', '', /the date is not الثلاثاء 4 يناير 2011/, () => { window.__setDate(document.querySelector('.date .dow').dataset.dow, '5 يناير 2011'); }],
    ['weekday wrong', d, '&t=0', '', /the date is not السبت 1 يناير 2011/, () => { window.__setDate('الأحد', document.querySelector('.date .dmy').dataset.full); }],
    ['ETA wrong', d, '&t=0', '', /the bar's line is/, () => { const s = document.querySelector('.o-sub'); s.textContent = s.textContent.replace('7 أيام', '8 أيام'); }],
    ['ETA agreement', d, '&t=0.5', '', /the bar's line is/, () => { const s = document.querySelector('.o-sub'); s.textContent = s.textContent.replace('4 أيام', '4 يوم'); }],
    ['bar names another army', d, '&t=0', '', /the bar names «الجيش الثاني الميداني»/, () => { document.querySelector('.o-name').textContent = 'الجيش الثاني الميداني'; }],
    ['halted shown moving', d, '&t=0.3&halt=1', '', /the order in force is move \(want halt\)|the bar's line is/, () => { document.querySelector('.o-btn[data-o="halt"]').classList.remove('on'); document.querySelector('.o-btn[data-o="move"]').classList.add('on'); }],
    ['order words not the panel\'s', d, '&t=0', '', /the orders are «تحرّك/, () => { document.querySelector('.o-btn[data-o="move"] span').textContent = 'تحرّك'; }],
    ['attack note missing', d, '&t=0&tip=1', '.o-tip { display: none !important; }', /the attack note is missing/],
    ['attack note off', d, '&t=0&tip=1', '.o-tip { margin-left: 40px !important; }', /the attack note is not/],
    ['city name hidden', d, '&t=0', '', /the city name «القاهرة» is not shown/, () => { [...document.querySelectorAll('.labels text')].find((x) => x.textContent === 'القاهرة').classList.add('cut'); }],
    ['a CSS animation', d, '&t=0', '@keyframes pulse { to { opacity: .5; } } .u-tok[aria-pressed="true"] .u-tag { animation: pulse 1s infinite; }', /CSS animations running on the map/],
    ['steps that glide', d, '&t=0', '.u-tok { transition: left .1s, top .1s !important; }', /animates its moves with a transition/],
    ['order not in force', d, '&t=0.5', '', /the order in force is halt \(want move\)/, () => { document.querySelector('.o-btn[data-o="move"]').classList.remove('on'); document.querySelector('.o-btn[data-o="halt"]').classList.add('on'); }],
    ['arrived still moving', d, '&t=1', '', /the order in force is move \(want halt\)/, () => { document.querySelector('.o-btn[data-o="halt"]').classList.remove('on'); document.querySelector('.o-btn[data-o="move"]').classList.add('on'); }],
    ['attack open', d, '&t=0', '', /attack is not locked/, () => { document.querySelector('.o-btn[data-o="attack"]').removeAttribute('aria-disabled'); }],
    ['dock beside the bar', d, '&t=0', '[data-sel="1"] .dock { display: flex !important; }', /the dock shows beside the order bar|panel overlap/],
    ['bar off the dock line', d, '&t=0', '.orders { margin-bottom: 6px !important; }', /the order bar is not on the dock's line/],
    ['bar read in part', d, '&t=0', '', /a11y: the bar's army does not read all it shows/, () => { document.querySelector('.o-unit').setAttribute('aria-label', 'المنطقة الغربية'); }],
    ['bar order reversed', d, '&t=0', '.orders { flex-direction: row-reverse !important; }', /the order bar is not army, move/],
    ['a weapon name', d, '&t=0', '', /a real weapon name on the map/, () => { document.querySelector('.u-tok[data-u="air"]').setAttribute('aria-label', 'مجموعة جوية، مصر: 24 طائرة F-16، بني سويف'); }],
    ['city dot under its name', d, '&t=0', '', /map city dot under its own name/, () => { const inView = (e) => { if (!e.getClientRects().length) return false; const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight; }; const t = [...document.querySelectorAll('.labels text[data-city]')].find((e) => inView(e) && inView(document.querySelector(`.labels circle[data-city="${e.getAttribute('data-city')}"]`))); t.removeAttribute('direction'); }],
    ['label under a token', d, '&t=0', '.labels .cut { display: inline !important; }', /map label .* (under a unit|cut by a panel edge|sliced)/],
    ['faint text', d, '&t=0', '.o-tt span { opacity: .3 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['text overlap', d, '&t=0', '.o-tt span { margin-top: -14px !important; }', /text overlap/],
    ['HUD moved', d, '&t=0', '.lstack { margin-left: 8px; }', /HUD element moved from its B3 position/],
    ['dock gone idle', d, '&state=idle', '.dock { display: none !important; }', /the dock is not at its B3 place/],
  ];
  const results = [];
  for (const [name, x, extra, css, re, js] of cases) {
    const p = await open(ctxs[x.id], PAGE + qs(x) + extra);
    if (css) await p.addStyleTag({ content: css });
    if (js) await p.evaluate(js);
    await p.waitForTimeout(80);
    const { m } = await check(p, x, ref[x.id], V(extra));
    const ok = m.issues.some((i) => re.test(i));
    results.push({ name, ok, sample: m.issues.slice(0, 3) });
    console.log(`${ok ? 'caught ' : 'MISSED '} ${name}${ok ? '' : '  -> ' + m.issues.slice(0, 4).join(' || ')}`);
    await p.close();
  }
  // lightness plants, on the page's real work: a loop that keeps moving the dashes forever; an interval left running; a
  // glide at the display's rate (no 30 fps cap); halt that stops the whole clock
  for (const [name, plant, re] of [
    ['an endless animation loop', () => { let o = 0; (function f() { o += 1; const l = document.querySelector('.route .line'); if (l) l.style.strokeDashoffset = o; requestAnimationFrame(f); })(); }, /with nothing moving: .* [1-9]\d* animation frames|while paused: .* [1-9]\d* animation frames/],
    ['an interval left running', () => { setInterval(() => {}, 16); }, /interval calls/],
    ['no frame cap', () => { (function f() { if (window.__units && window.__units.moving && !window.__units.halted) window.render(); requestAnimationFrame(f); })(); }, /gliding at ×\d draws/],
    ['halt stops the clock', () => { const b = document.querySelector('.o-btn[data-o="halt"]'); b.addEventListener('click', (ev) => { ev.stopImmediatePropagation(); window.__live.playing = false; clearTimeout(window.__live.timer); cancelAnimationFrame(window.__live.raf); }, true); }, /halting the army/],
  ]) { const L = await lightness(b, d, plant), ok = L.issues.some((i) => re.test(i)); results.push({ name, ok, sample: L.issues.slice(0, 3) }); console.log(`${ok ? 'caught ' : 'MISSED '} ${name}${ok ? '' : '  -> ' + L.issues.join(' || ')}`); }
  const clean = {};
  for (const x of [d, se]) for (const [suffix, extra, view] of VIEWS) {
    const p = await open(ctxs[x.id], PAGE + qs(x) + extra), { m } = await check(p, x, ref[x.id], view);
    clean[x.id + suffix] = m.issues; console.log(`clean page ${x.id}${suffix}: ${m.issues.length} issues${m.issues.length ? ' -> ' + m.issues.slice(0, 4).join(' || ') : ''}`); await p.close();
  }
  { const L = await lightness(b, d); clean['i16promax lightness'] = L.issues; console.log(`clean lightness: ${JSON.stringify(L.out)} ${L.issues.join(' || ')}`); }
  for (const c of Object.values(ctxs)) await c.close();
  const missed = results.filter((r) => !r.ok).map((r) => r.name), dirty = Object.values(clean).some((v) => v.length);
  fs.writeFileSync(path.join(OUT, '_build/selftest.json'), JSON.stringify({ ranAt: new Date().toISOString(), inputs: { files: INPUTS, sha1: inputsHash() }, cleanIssues: clean, results }, null, 1));
  console.log(missed.length || dirty ? `SELFTEST FAILED (missed: ${missed.join(', ') || 'none'}; clean issues ${Object.values(clean).map((v) => v.length).join('/')})` : `selftest OK: ${results.length} planted defects caught, clean pages 0 issues`);
}

(async () => {
  assertAssembled();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  await recordInputs(b);
  if (SELFTEST) { await selftest(b); await b.close(); return; }
  let report = {};
  try { report = JSON.parse(fs.readFileSync(path.join(OUT, '_build/report.json'), 'utf8')); } catch (e) { report = {}; }
  for (const d of DEVICES) {
    const b3 = await b3Rects(b, d);
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const entry = { device: `${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`, renderedAt: new Date().toISOString(), inputs: { files: INPUTS, sha1: inputsHash() },
      issues: [], views: {}, pngs: [], pngSha1: {}, env: { chromium: b.version() } };
    for (const [suffix, extra, view] of VIEWS) {
      const p = await open(ctx, PAGE + qs(d) + extra);
      const png = suffix ? path.join(OUT, '_build', d.id + suffix + '.png') : path.join(OUT, d.id + '.png');
      await p.screenshot({ path: png });
      entry.pngs.push(path.relative(OUT, png));
      entry.pngSha1[path.relative(OUT, png)] = crypto.createHash('sha1').update(fs.readFileSync(png)).digest('hex');
      if (!suffix) { const hp = path.join(OUT, '_build', d.id + '_hit.png'), ph = await open(ctx, PAGE + qs(d) + extra + '&hit=1'); await ph.screenshot({ path: hp }); await ph.close();
        entry.pngSha1[path.relative(OUT, hp)] = crypto.createHash('sha1').update(fs.readFileSync(hp)).digest('hex'); }
      const { m, c } = await check(p, d, b3, view);
      m.issues.forEach((i) => entry.issues.push(`${view}: ${i}`));
      entry.views[view] = { issueCount: m.issues.length, png: true, map: m.map, units: m.units, typeSeen: m.typeSeen, hits: m.hits, minContrast: Math.min(...c.map((x) => x.worst)), contrast: c };
      console.log(`== ${d.id} ${view} map ${JSON.stringify(m.map)} minContrast ${entry.views[view].minContrast}`);
      console.log(m.issues.length ? '  ISSUES:\n    ' + m.issues.join('\n    ') : '  no issues');
      await p.close();
    }
    // lightness, measured live on this phone (checks only)
    { const L = await lightness(b, d);
      L.issues.forEach((i) => entry.issues.push(`lightness: ${i}`));
      entry.views.lightness = { issueCount: L.issues.length, frames: L.out };
      console.log(`== ${d.id} lightness ${JSON.stringify(L.out)} ${L.issues.join(' || ') || 'ok'}`); }
    entry.issueCount = entry.issues.length;
    report[d.id] = entry;
    await ctx.close();
  }
  const ordered = {};
  ALL.forEach((d) => { if (report[d.id]) ordered[d.id] = report[d.id]; });
  fs.writeFileSync(path.join(OUT, '_build/report.json'), JSON.stringify(ordered, null, 1));
  console.log('\nissues per device:', Object.entries(ordered).map(([k, v]) => `${k} ${v.issues.length}`).join(', '));
  await b.close();
})();
