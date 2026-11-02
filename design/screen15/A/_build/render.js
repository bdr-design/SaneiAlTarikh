// Screen 15 variant A (the event and decision modal, the notification centre): render the 7 iPhones and run the checks.
// Writes <id>.png (the decision modal) to the variant folder; the centre (top and end), <id>_hit.png and report.json to
// _build. Generic rules as screen 14 (opaque panels, sizes, gaps, icons, type, insets, overlaps, 44 pt hit boxes, contrast
// >= 4.5:1, the HUD at its B3 place). This screen's own rules: the game paused (play glyph and words); with the modal, the
// HUD and map inert under a full scrim; the modal a dialog, centred in the safe screen, as wide as the rule says, its
// image column on the left with the category in words, its head, title (≤60 characters) and text (≤90 words) as the
// brief; four options in a 2 × 2 grid in the brief's order, each read whole, each effect an arrow with its sign or its
// words, costs amber with their arrow, exactly one default named in words and in VoiceOver, the expiry; the numbers
// against the economy and internal panels. The centre: under the toast, down to 8 pt above the dock, the map-mode and
// my-country buttons yielding to it; its sections in order; the badge = the unread rows; the pending order a group with
// its own cancel button; every row read whole; the fades follow the scroll; every brief string shown clear in a view.
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
const STATIC_INPUTS = ['index.html', '_build/render.js', '_build/assemble.py', '_build/event.css', '_build/event.html', '_build/center.html', '_build/event.js', 'event_protests.jpg',
  '../../screen4/A/index.html', '../../screen1/B3/index.html', '../../screen5/A/_build/sheet.html', '../../screen6/A/_build/sheet.html', '../../screen8/A/_build/sheet.html', '../../shared/devices.json'];
let INPUTS = STATIC_INPUTS.slice();
const inputsHash = () => crypto.createHash('sha1').update(Buffer.concat(INPUTS.map((f) => fs.readFileSync(path.join(OUT, f))))).digest('hex');
const qs = (d) => `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
const B3 = 'file://' + path.resolve(OUT, '../../screen1/B3/index.html');
const VIEWS = [['', '', 'event'], ['_center', '&state=center', 'center'], ['_center_mid', '&state=center&scroll=mid', 'center_mid'], ['_center_end', '&state=center&scroll=end', 'center_end']];

// the brief's strings (each must be an element's whole text somewhere in its views) and the numbers the options repeat
const BRIEF = {
  event: ['قرار · تونس · 1 يناير 2011 · الوقت متوقف', 'احتجاجات واسعة في تونس', 'احتجاجات وثورات', 'توسيع دعم الخبز والتموين', '500 مليون $ سنويًا', 'تشديد الانتشار الأمني في المدن', 'لا كلفة إضافية · من بند الأمن الداخلي', 'لاحقًا',
    'حوار مع النقابات والأحزاب', 'الكلفة: 10 من رأس المال السياسي', 'المتابعة دون إجراء الافتراضي', 'الافتراضي', 'لا كلفة', 'إن لم تختر، يُختار الافتراضي بعد 7 أيام.'],
  center: ['الإشعارات', 'قرارات تنتظرك', 'أوامر معلقة', 'مهم', 'للعلم', 'احتجاجات واسعة في تونس', 'قرار · يُختار الافتراضي بعد 7 أيام', 'المنطقة الغربية إلى سيوة', 'يُنفَّذ عند استئناف الوقت', 'إلغاء',
    'السودان: استفتاء الجنوب بعد 8 أيام', '9 يناير 2011 · الجوار', 'أسعار القمح العالمية عند أعلى مستوى منذ 2008', 'السلع · ديسمبر 2010'],
};
const TEXT = 'تتسع الاحتجاجات في تونس منذ 17 ديسمبر بعد أن أحرق شاب نفسه في سيدي بوزيد. يطالب المحتجون بفرص عمل وبخفض الأسعار، وتنقل القنوات العربية ما يجري كل يوم. يرى مستشاروك أن البطالة وارتفاع الأسعار في مصر قد يجعلان الشارع يتأثر بما يحدث.';
// the options in order: title, cost line, effects as [arrow, words, number or null, amber]
const OPS = [
  ['توسيع دعم الخبز والتموين', '500 مليون $ سنويًا', [['down', 'الاضطرابات', -3, false], ['up', 'العجز', 0.5, true]]],
  ['تشديد الانتشار الأمني في المدن', 'لا كلفة إضافية · من بند الأمن الداخلي', [['down', 'الاضطرابات', -2, false], ['down', 'الشرعية', -2, true]]],
  ['حوار مع النقابات والأحزاب', 'الكلفة: 10 من رأس المال السياسي', [['down', 'الاضطرابات', -1, false], ['up', 'الشرعية', 1, false]]],
  ['المتابعة دون إجراء', 'لا كلفة', [['up', 'خطر الاضطرابات', null, true]]],
];
// the approved panels' words and lines these options rest on, read from their sheets
function approved() {
  const flat = (f) => fs.readFileSync(path.join(OUT, f), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const s5 = flat('../../screen5/A/_build/sheet.html'), s6 = flat('../../screen6/A/_build/sheet.html'), s8 = flat('../../screen8/A/_build/sheet.html');
  const bread = s6.match(/دعم الخبز والتموين [^$]*?([\d.]+) مليار \$/), sec = /الأمن الداخلي/.test(s6), pc = s5.match(/رأس المال السياسي (\d+)/), unrest = s8.match(/لماذا؟ الاضطرابات (\d+)/), deficit = s6.match(/العجز[^0-9]{0,20}([\d.]+) مليار/);
  if (!bread || !sec || !pc || !unrest || !deficit) throw new Error('cannot read the approved panels\' lines');
  return { bread: +bread[1], capital: +pc[1], unrest: +unrest[1], deficit: +deficit[1] };
}
const A = approved();
const DATA = { BRIEF, TEXT, OPS, A };

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
      type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700] }, stroke: 1.75, teal: 'rgb(63, 224, 208)', amber: 'rgb(242, 177, 76)', t1: 'rgb(234, 242, 247)', t2: 'rgb(169, 188, 203)', dark: 'rgb(11, 18, 24)' };
    const issues = [], W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01, lu = 1 / 32, root = document.documentElement;
    const near = (a, b, t = 0.05) => Math.abs(a - b) < t;
    const effOp = (e) => { let o = 1; for (let a = e; a && a.nodeType === 1; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity); return o; };
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && effOp(e) > 0.05;
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(visible);
    const box = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    const inter = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.05 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.05;
    const label = (e) => (e.getAttribute('aria-label') || e.textContent || e.className.baseVal || e.className || e.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 26);
    const T = (e) => (e ? e.innerText || e.textContent : '').replace(/\s+/g, ' ').trim();
    // the centre's list scrolls: what its clip hides is not on screen, and what sits in a fade is not read for contrast
    const listR = () => { const l = q('.nc-b'); return l && l.getClientRects().length ? l.getBoundingClientRect() : null; };
    const hidden = (e) => { const L = e.closest('.nc-b') && listR(); if (!L) return false; const r = e.getBoundingClientRect(); return r.bottom <= L.top + 0.5 || r.top >= L.bottom - 0.5; };
    const inFade = (b, el) => { const L = el.closest('.nc-b') && listR(); if (!L) return false; const nc = q('.nc'); return (nc.dataset.ftop === '1' && b.y0 < L.top + 24) || (nc.dataset.fbot === '1' && b.y1 > L.bottom - 24); };
    const cutByList = (b, el) => { const L = el.closest('.nc-b') && listR(); return !!L && (b.y0 < L.top - 0.5 || b.y1 > L.bottom + 0.5); };
    const nums = (s) => (String(s).replace(/−/g, '-').match(/-?\d+(\.\d+)?/g) || []).map(Number);
    const ev = view === 'event', SCOPE = ev ? '.ev' : '.hud', TAPS = ev ? '.ev .tap' : '.hud .tap';
    // ---------- 1. panels: opaque (D-3), border, radius; no overlap; inside the safe area ----------
    const panels = (ev ? qa('.ev') : qa('.hud .glass')).filter((e) => !e.classList.contains('menu'));
    panels.forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost'), fill = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (fill !== TOK.panel) issues.push(`panel not opaque: ${label(g)} ${fill}`);
      if (effOp(g) < 0.999) issues.push(`panel not opaque (opacity ${effOp(g).toFixed(2)}): ${label(g)}`);
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== TOK.border) issues.push(`panel border ${label(g)}: ${cs.borderTopWidth} ${cs.borderTopColor}`);
      const r = parseFloat(cs.borderTopLeftRadius), w = g.classList.contains('ctl') ? TOK.rCtl : TOK.rCard;   // the modal and the centre are cards (12)
      if (!near(r, w)) issues.push(`panel radius ${label(g)}: ${r} (want ${w})`);
    });
    const prs = panels.map((e) => ({ l: label(e), r: box(e.getBoundingClientRect()) }));
    for (let i = 0; i < prs.length; i++) for (let j = i + 1; j < prs.length; j++) if (inter(prs[i].r, prs[j].r)) issues.push(`panel overlap ${prs[i].l} / ${prs[j].l}`);
    prs.forEach((pp) => { if (pp.r.x0 < S - eps || pp.r.x1 > W - S + eps || pp.r.y1 > H - B + eps) issues.push(`panel in an inset: ${pp.l}`); });
    // ---------- 2. control heights, token and bar sizes, radii ----------
    qa(TAPS).forEach((e) => {
      const h = e.getBoundingClientRect().height, bar = e.parentElement.closest('.glass, .cap');
      if (e.matches('.ev-op')) { if (h < 60 - 0.05) issues.push(`option height ${h.toFixed(2)} (want at least 60): ${label(e)}`); return; }
      if (e.matches('.nc-r')) { if (!near(h, 44)) issues.push(`row height ${h.toFixed(2)} (want 44): ${label(e)}`); return; }
      if (e.matches('.nc-x, .nc-close')) { if (!near(h, 32)) issues.push(`control height ${h.toFixed(2)} (want 32): ${label(e)}`); return; }
      const fills = bar && TOK.heights.some((x) => near(bar.getBoundingClientRect().height, x)) && near(h, bar.getBoundingClientRect().height - 2);
      if (!TOK.heights.some((x) => near(h, x)) && !fills) issues.push(`control height ${h.toFixed(2)}: ${label(e)}`);
    });
    [['.cap', 32], ['.toast', 32], ['.dock', 44]].forEach(([s, v]) => qa(s).forEach((e) => { if (!near(e.getBoundingClientRect().height, v)) issues.push(`control height ${e.getBoundingClientRect().height.toFixed(2)} for ${s} (want ${v})`); }));
    [['.ev-op', 10], ['.nc-r', 10], ['.nc-x', 8], ['.ev-cat', 6], ['.ev-def', 4], ['.nc-ic', 6]].forEach(([s, v]) => qa(s).forEach((e) => { const r = parseFloat(getComputedStyle(e).borderTopLeftRadius); if (!near(r, v)) issues.push(`radius ${r} for ${s} (want ${v})`); }));
    qa('.nc-close').forEach((e) => { const r = e.getBoundingClientRect(); if (!near(r.width, 32) || !near(r.height, 32) || getComputedStyle(e).borderTopLeftRadius !== '50%') issues.push('the close button is not a 32 pt circle'); });
    // ---------- 3. gaps ----------
    document.querySelectorAll(ev ? '.ev *' : '.hud *').forEach((e) => {
      if (!visible(e) || e.closest('.frost')) return;
      const cs = getComputedStyle(e); if (!/flex|grid/.test(cs.display)) return;
      [cs.columnGap, cs.rowGap].forEach((g) => { const v = g === 'normal' ? 0 : parseFloat(g); if (!TOK.space.some((s) => near(s, v))) issues.push(`gap ${v} on ${label(e)}`); });
    });
    // ---------- 4. icons ----------
    document.querySelectorAll(ev ? '.ev svg.i, .ev svg.r-arr' : '.hud svg.i, .hud svg.trend').forEach((s) => {
      if (!s.getClientRects().length || s.closest('.frost')) return;
      const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      const want = s.classList.contains('trend') || s.classList.contains('r-arr') || s.closest('.ev-cat') ? 10 : s.closest('.stat') ? 14 : s.closest('.dock') ? 17 : 16;
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
          if (hidden(el) || (el.closest('.nc-b') && (() => { const L = listR(); return b.y1 <= L.top + 0.5 || b.y0 >= L.bottom - 0.5; })())) return;
          const faded = inFade(b, el);
          if (cutByList(b, el) && !faded) issues.push(`text cut by the list's edge without a fade: "${t}"`);
          texts.push({ t, fs, color: cs.color, op: effOp(el), faded, r: { x0: b.x0, y0: b.y0, w: r.width, h: r.height }, line: { x0: b.x0, x1: b.x1, y0: mid - lh / 2, y1: mid + lh / 2 } });
          if (b.x0 < S - eps || b.x1 > W - S + eps) issues.push(`text in side inset: ${t}`);
          if (b.y1 > H - B + eps) issues.push(`text in bottom inset: ${t}`); });
      }
    }
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].line, b = texts[j].line;
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5) issues.push(`text overlap "${texts[i].t}" / "${texts[j].t}"`);
    }
    // icons as drawn: an icon in the centre's list is cut to the list's visible rect (or left out where scrolled away)
    const clipL = (e, r) => { const L = e.closest('.nc-b') && listR(); return L ? { x0: Math.max(r.x0, L.left), x1: Math.min(r.x1, L.right), y0: Math.max(r.y0, L.top), y1: Math.min(r.y1, L.bottom) } : r; };
    const icons = [...document.querySelectorAll(ev ? '.ev svg' : '.hud svg')].filter((s) => s.getClientRects().length && !s.closest('.frost') && getComputedStyle(s).visibility !== 'hidden')
      .map((s) => ({ s, r: clipL(s, box(s.getBoundingClientRect())) })).filter((o) => o.r.x1 - o.r.x0 > 0.05 && o.r.y1 - o.r.y0 > 0.05);
    texts.forEach((t) => icons.forEach((o) => { if (o.s.closest('.badge') || o.s.closest('.bell')) return; const a = t.line, b = o.r;
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5) issues.push(`icon over text: ${label(o.s)} / "${t.t}"`); }));
    // content inside its control
    qa(ev ? '.ev .tap, .ev-cat' : '.nc .tap').forEach((c) => { const cr = c.getBoundingClientRect(); if (c.closest('.nc-b') && hidden(c)) return;
      c.querySelectorAll('span, svg, b').forEach((e) => { if (!visible(e)) return; let b; if (e.tagName === 'svg') b = e.getBoundingClientRect(); else { const r = document.createRange(); r.selectNodeContents(e); b = r.getBoundingClientRect(); }
        if (b.width && (b.left < cr.left - 0.5 || b.right > cr.right + 0.5 || b.top < cr.top - 0.5 || b.bottom > cr.bottom + 0.5)) issues.push(`content outside its control (${label(c)}): ${(e.textContent || e.tagName).trim().slice(0, 20)}`); }); });
    document.querySelectorAll(ev ? '.ev, .ev *' : '.hud .glass, .hud .glass *').forEach((e) => { if (e.closest('.frost') || !visible(e)) return; const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1) issues.push(`horizontal overflow in ${label(e)}`); });
    // ---------- 6. hit boxes ----------
    const taps = qa(TAPS).filter((e) => !hidden(e)).map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e, y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      const raw = { x0, x1: x0 + parseFloat(ps.width), y0, y1: y0 + parseFloat(ps.height) };
      return { e, label: label(e), vis: box(r), raw, hit: clipL(e, raw) };   // a touch reaches a control in the list only inside the list
    });
    taps.forEach((t) => { const h = t.raw, v = t.vis;
      if (h.x1 - h.x0 < 44 - eps || h.y1 - h.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      if (h.x0 > v.x0 + lu || h.x1 < v.x1 - lu || h.y0 > v.y0 + lu || h.y1 < v.y1 - lu) issues.push(`hit box does not cover: ${t.label}`);
      if (h.x0 < S - eps || h.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      if (h.y1 > H - B + lu || h.y0 < -eps) issues.push(`tap in bottom inset/off top: ${t.label}`); });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) { const a = taps[i], b = taps[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue; if (inter(a.hit, b.hit)) issues.push(`hit overlap ${a.label} / ${b.label}`); }
    // ---------- 7. the HUD at its B3 place ----------
    // with the modal, only the top row shows above it (the left stack and the dock are out of the way)
    if (ev && ['.lstack', '.dock'].some((s) => getComputedStyle(q(s)).visibility !== 'hidden')) issues.push('the left stack or the dock shows around the modal');
    ['.top > .nation', '.top > .stats', '.top > .date'].concat(ev ? [] : ['.toast']).forEach((s) => { const e = q(s), ref = b3[s][0], rr = e.getBoundingClientRect();
      if (!e.getClientRects().length) { issues.push(`HUD element hidden: ${s}`); return; }
      if (Math.max(Math.abs(rr.left - ref.x0), Math.abs(rr.top - ref.y0), Math.abs(rr.right - ref.x1), Math.abs(rr.bottom - ref.y1)) > 0.5) issues.push(`HUD element moved from its B3 position: ${s}`); });
    if (!ev) { const dk = q('.dock'), r = dk.getBoundingClientRect(), ref = b3['.dock'][0]; if (!dk.getClientRects().length || Math.max(Math.abs(r.left - ref.x0), Math.abs(r.top - ref.y0), Math.abs(r.right - ref.x1)) > 0.5) issues.push('the dock is not at its B3 place'); }
    // the bell reads its count (the badge), and whether the centre is open
    { const bl = q('.bell'), n = nums(T(q('.badge')))[0]; if (!new RegExp('^الإشعارات، ' + n + ' غير مقروءة$').test(bl.getAttribute('aria-label') || '') || bl.getAttribute('aria-expanded') !== String(!ev)) issues.push('a11y: the bell does not read its count and state'); }
    // the game is paused: the play button shows play and says the game is stopped
    { const pl = q('.play'); if (pl.querySelector('use').getAttribute('href') !== '#i-play' || !/متوقفة/.test(pl.getAttribute('aria-label') || '')) issues.push('the game is not shown paused (play glyph and words)'); }
    const clearNow = [];
    const W2 = (s) => (s || '').replace(/\s+/g, ' ').trim();
    const allClear = (sel) => [...document.querySelectorAll(sel)].filter((e) => visible(e) && !hidden(e)).forEach((e) => { const r = e.getBoundingClientRect(); if (!inFade(box(r), e)) clearNow.push(W2(e.innerText)); });
    if (ev) {
      // ---------- 8. the modal ----------
      const m = q('.ev'), mr = m.getBoundingClientRect(), sc = q('.scrim');
      if (!visible(sc) || Math.abs(sc.getBoundingClientRect().width - W) > 0.5 || Math.abs(sc.getBoundingClientRect().height - H) > 0.5) issues.push('the scrim does not cover the screen');
      ['.hud', '.map'].forEach((s) => { const e = q(s); if (!e.hasAttribute('inert') || e.getAttribute('aria-hidden') !== 'true') issues.push(`${s} is not inert under the modal`); });
      if (m.getAttribute('role') !== 'dialog' || m.getAttribute('aria-modal') !== 'true' || q('#' + m.getAttribute('aria-labelledby')) !== q('.ev-t') || q('#' + m.getAttribute('aria-describedby')) !== q('.ev-p')) issues.push('a11y: the modal is not a labelled modal dialog');
      const g = Math.max(S, 8), wantW = W - 2 * g, tb = q('.top').getBoundingClientRect(), room = H - B - 8 - (tb.bottom + 8);
      if (!near(mr.width, wantW, 0.6)) issues.push(`modal width ${mr.width.toFixed(1)} (want the safe width ${wantW})`);
      if (Math.abs(mr.left - g) > 0.75) issues.push('the modal is not centred across the screen');
      if (Math.abs(mr.top - Math.round(tb.bottom + 8 + Math.max(0, (room - mr.height) / 2))) > 0.75) issues.push('the modal is not centred in the height between the top row and the home indicator');
      if (parseFloat((getComputedStyle(sc).backgroundColor.match(/[\d.]+\)$/) || ['1)'])[0]) < 0.4) issues.push('the scrim does not dim the game (alpha below 0.4)');
      if (!/الوقت متوقف/.test(W2(q('.ev-k').innerText))) issues.push('the modal does not say the time is stopped');
      { const lt = q('.ev-later'); if (!lt || W2(lt.innerText) !== 'لاحقًا' || !/تأجيل/.test(lt.getAttribute('aria-label') || '') || !/7 أيام/.test(lt.getAttribute('aria-label') || '') || !near(lt.getBoundingClientRect().height, 32)) issues.push('no «لاحقًا» that puts the decision off to the centre'); }
      if (mr.left < Math.max(S, 8) - eps || mr.right > W - Math.max(S, 8) + eps || mr.top < 8 - eps || mr.bottom > H - B - 8 + eps) issues.push('the modal leaves the safe screen');
      if (getComputedStyle(m).backgroundColor !== TOK.panel || parseFloat(getComputedStyle(m).borderTopLeftRadius) !== 12) issues.push('the modal is not the opaque 12 pt panel');
      // the image column: on the left (RTL), full height, the owner's image, a third of the width at most 220; the category on it
      const pic = q('.ev-pic'), pr = pic.getBoundingClientRect(), im = q('.ev-pic img'), cat = q('.ev-cat'), cr = cat.getBoundingClientRect();
      if (!near(pr.left, mr.left + 1, 0.6) || !near(pr.top, mr.top + 1, 0.6) || !near(pr.bottom, mr.bottom - 1, 0.6) || !near(pr.width, Math.round(Math.min(220, wantW * 0.32)), 0.6)) issues.push('the image column is not on the left, full height, a third of the modal (≤220)');
      if (im.getAttribute('src') !== 'event_protests.jpg' || !im.complete || !im.naturalWidth || getComputedStyle(im).objectFit !== 'cover') issues.push('the category image is not the owner\'s protest image, covering its column');
      if (W2(cat.innerText) !== 'احتجاجات وثورات' || !cat.querySelector('svg') || cr.left < pr.left || cr.right > pr.right || cr.bottom > pr.bottom) issues.push('the category is not named in words on its image');
      // head, title, text
      const title = W2(q('.ev-t').innerText), body = W2(q('.ev-p').innerText);
      if (title.length > 60) issues.push(`the title is ${title.length} characters (≤60)`);
      if (body.split(' ').length > 90) issues.push(`the text is ${body.split(' ').length} words (≤90)`);
      if (body !== DATA.TEXT) issues.push('the text is not the brief\'s');
      // the options: 2 × 2, right to left then down, in the brief's order, each read whole, each effect with its arrow
      const ops = qa('.ev-op'), rs = ops.map((o) => o.getBoundingClientRect());
      if (ops.length !== DATA.OPS.length) issues.push(`options shown: ${ops.length} (want ${DATA.OPS.length})`);
      if (rs.length === 4 && !(near(rs[0].top, rs[1].top, 0.5) && rs[1].right <= rs[0].left + 0.5 && near(rs[2].top, rs[3].top, 0.5) && rs[2].top >= rs[0].bottom - 0.5 && near(rs[0].left, rs[2].left, 0.5))) issues.push('the options are not a 2 × 2 grid, right to left then down');
      ops.forEach((o, i) => { const w = DATA.OPS[i] || ['', '', []], nm = W2(o.querySelector('b').firstChild.textContent), cost = W2(o.querySelector('.ev-c').innerText), al = o.getAttribute('aria-label') || '';
        if (nm !== w[0] || cost !== w[1]) issues.push(`option ${i + 1} is «${nm} · ${cost}» (want «${w[0]} · ${w[1]}»)`);
        const fx = [...o.querySelectorAll('.ev-fx > span')];
        if (fx.length !== w[2].length) issues.push(`option ${i + 1} shows ${fx.length} effects (want ${w[2].length})`);
        fx.forEach((f, k) => { const e = w[2][k] || [], u = f.querySelector('use'), dir = u ? (u.getAttribute('href') === '#t-up' ? 'up' : u.getAttribute('href') === '#t-down' ? 'down' : '?') : 'none';
          const n = nums(T(f))[0], amber = f.classList.contains('r-amber');
          if (dir !== e[0] || !T(f).includes(e[1]) || (e[2] === null ? n !== undefined : Math.abs(n - e[2]) > 1e-9) || amber !== e[3]) issues.push(`option ${i + 1} effect ${k + 1} is «${dir} ${T(f)}»${amber ? ' amber' : ''} (want «${e[0]} ${e[1]} ${e[2] === null ? '' : e[2]}»${e[3] ? ' amber' : ''})`);
          if (n !== undefined && n !== 0 && (n > 0) !== (dir === 'up')) issues.push(`option ${i + 1}: an arrow against its sign`);
          // the colour as drawn: amber exactly on the costs, white on the benefits, the arrow in its words' colour
          const col = getComputedStyle(f).color, ac = u ? getComputedStyle(u.closest('svg')).color : col;
          if (col !== (e[3] ? TOK.amber : TOK.t1) || ac !== col) issues.push(`option ${i + 1} effect ${k + 1}: drawn ${col} with its arrow ${ac} (want ${e[3] ? 'amber' : 'white'}, the arrow alike)`); });
        if (o.tagName !== 'BUTTON' || (o.getAttribute('role') && o.getAttribute('role') !== 'button')) issues.push(`a11y: option ${i + 1} is not a button`);
        // VoiceOver: every word and number shown, and each effect's direction in words with better or worse
        const shown = T(o).replace(/[·،:؛]|\.(?!\d)/g, ' '), al2 = al.replace(/[،:؛]|\.(?!\d)/g, ' ');
        // a point count may be said in words (نقطة واحدة, نقطتين), as the approved panels do
        const heard = nums(al).map(Math.abs).concat(/نقطة واحدة/.test(al) ? [1] : [], /نقطتين/.test(al) ? [2] : []);
        const missW = shown.split(/\s+/).filter((x) => x.length > 1 && !/^[\d.%+−-]+$/.test(x) && x !== '$').filter((x) => !al2.includes(x)), missN = nums(shown).map(Math.abs).filter((x) => !heard.includes(x));
        if (missW.length || missN.length) issues.push(`a11y: option ${i + 1} does not read all it shows: ${missW.concat(missN).slice(0, 4).join(' ')}`);
        if (/\$/.test(T(o)) && !/دولار/.test(al)) issues.push(`a11y: option ${i + 1} does not say «دولار»`);
        // each effect's own clause says its direction and whether it is better or worse
        const clauses = (al.split('. ').slice(1).join('. ') || '').split('؛');
        w[2].forEach((e) => { const cl = clauses.find((c) => c.includes(e[1].replace('خطر ', ''))) || '';
          if (!(e[0] === 'up' ? /ترتفع|يرتفع/ : /تنخفض|ينخفض/).test(cl) || !(e[3] ? /أسوأ/ : /أفضل/).test(cl) || (e[3] ? /أفضل/ : /أسوأ/).test(cl)) issues.push(`a11y: option ${i + 1} does not say «${e[1]}»'s direction and whether it is better or worse`); }); });
      // exactly one default, named on screen and in VoiceOver, and the expiry that picks it
      const defs = ops.filter((o) => o.dataset.default === '1');
      if (defs.length !== 1 || !defs[0].querySelector('.ev-def') || W2(defs[0].querySelector('.ev-def').innerText) !== 'الافتراضي' || !/الافتراضي/.test(defs[0].getAttribute('aria-label') || '') || ops.filter((o) => o.querySelector('.ev-def')).length !== 1) issues.push('the default is not exactly one option, named on screen and in VoiceOver');
      if (!/يُختار الافتراضي بعد \d+ (أيام|يومًا|يومين|يوم)/.test(W2(q('.ev-foot').innerText))) issues.push('the expiry and its default answer are not stated');
      // the numbers: the extra subsidy is a part of the economy panel's bread line; the deficit grows by the same amount
      { const add = nums(W2(ops[0].querySelector('.ev-c').innerText))[0] / 1000, def = DATA.OPS[0][2][1][2];
        if (Math.abs(add - def) > 1e-9) issues.push(`the deficit's rise (${def} مليار) is not the subsidy's ${add} مليار`);
        if (!(add > 0 && add < DATA.A.bread)) issues.push(`the extra bread subsidy is not a part of the economy panel's ${DATA.A.bread} مليار line`);
        // political capital within the state panel's; unrest and legitimacy (0..100) stay in range after each effect
        const cap = nums(W2(ops[2].querySelector('.ev-c').innerText))[0];
        if (!(cap > 0 && cap <= DATA.A.capital)) issues.push(`the dialogue's ${cap} political capital is more than the state panel's ${DATA.A.capital}`);
        const legit = nums(T([...document.querySelectorAll('.top .stat')].find((s) => /الشرعية/.test(s.textContent)).querySelector('.num')))[0];
        DATA.OPS.forEach((o, i) => o[2].forEach((e) => { const base = e[1] === 'الاضطرابات' ? DATA.A.unrest : e[1] === 'الشرعية' ? legit : null;
          if (base !== null && e[2] !== null && !(base + e[2] >= 0 && base + e[2] <= 100 && Math.abs(e[2]) <= 10)) issues.push(`option ${i + 1}: «${e[1]}» ${base} ${e[2]} leaves 0..100 or moves more than 10`); })); }
      allClear('.ev-k, .ev-t, .ev-cat, .ev-op b, .ev-op .ev-c, .ev-def, .ev-foot, .ev-later');
      // the modal's own text and controls only: nothing of the HUD's above it
      if ([...document.querySelectorAll('.hud .tap')].some((e) => { const r = e.getBoundingClientRect(); return r.width && inter(box(r), box(mr)) && document.elementFromPoint((Math.max(r.left, mr.left) + Math.min(r.right, mr.right)) / 2, (Math.max(r.top, mr.top) + Math.min(r.bottom, mr.bottom)) / 2) === e; })) issues.push('a HUD control shows through the modal');
    } else {
      // ---------- 8. the centre ----------
      const nc = q('.nc'), r = nc.getBoundingClientRect(), t = q('.toast').getBoundingClientRect(), dk = q('.dock').getBoundingClientRect();
      if (!near(r.left, t.left, 0.5) || !near(r.top, t.bottom + 8, 0.5) || !near(r.bottom, dk.top - 8, 0.5) || !near(r.width, Math.max(340, Math.round(t.width)), 0.5)) issues.push(`the centre is not under the toast down to 8 pt above the dock: x ${r.left.toFixed(1)} y ${r.top.toFixed(1)}..${r.bottom.toFixed(1)} w ${r.width.toFixed(1)}`);
      ['.btn.mode', '.btn.home'].forEach((s) => { if (visible(q(s))) issues.push(`${s} shows under the centre`); });
      const hs = qa('.nc-b h3').map((h) => W2(h.innerText));
      if (hs.join('|') !== 'قرارات تنتظرك|أوامر معلقة|مهم|للعلم') issues.push(`the sections are «${hs.join('، ')}»`);
      const unread = [...document.querySelectorAll('.nc-b [data-unread="1"]')], badge = nums(T(q('.badge')))[0];
      if (badge !== unread.length || badge !== 3) issues.push(`the badge says ${badge}, the unread notifications are ${unread.length} (the brief's 3)`);
      // each row under its own section (§6.7's tiers); unread rows are notification buttons, never the pending order
      const tierOf = (e) => { let h = e.previousElementSibling; while (h && h.tagName !== 'H3') h = h.previousElementSibling; return h ? W2(h.innerText) : ''; };
      const want = [['احتجاجات واسعة في تونس', 'قرارات تنتظرك'], ['المنطقة الغربية إلى سيوة', 'أوامر معلقة'], ['السودان: استفتاء الجنوب بعد 8 أيام', 'مهم'], ['أسعار القمح العالمية عند أعلى مستوى منذ 2008', 'للعلم']];
      const rows = [...document.querySelectorAll('.nc-b .nc-r')];
      want.forEach(([nm, sec]) => { const r = rows.find((x) => W2(x.querySelector('b').innerText) === nm); if (!r || tierOf(r) !== sec) issues.push(`«${nm}» is not under «${sec}»`); });
      unread.forEach((e) => { if (!e.matches('button.nc-r') || tierOf(e) === 'أوامر معلقة') issues.push('an unread mark on something that is not a notification'); });
      rows.forEach((e) => { const u = e.dataset.unread === '1', nm = W2(e.querySelector('b').innerText);
        if (!e.querySelector('.nc-ic svg')) issues.push(`«${nm}» has no icon`);
        if (e.matches('button') && !e.querySelector('.nc-chev')) issues.push(`«${nm}» has no chevron`);
        if (u !== !!e.querySelector('.nc-dot') || u !== /^غير مقروء/.test(e.getAttribute('aria-label') || '')) issues.push(`«${nm}»: the unread dot and words do not match its state`); });
      const po = [...document.querySelectorAll('.nc-b .nc-r')].find((e) => !e.matches('button'));
      if (!po || po.getAttribute('role') !== 'group' || po.matches('.tap') || !po.querySelector('button.nc-x') || W2(po.querySelector('.nc-x').innerText) !== 'إلغاء' || !/إلغاء أمر/.test(po.querySelector('.nc-x').getAttribute('aria-label') || '')) issues.push('the pending order is not a group with its own cancel button');
      [...document.querySelectorAll('.nc-b .nc-r')].forEach((e) => { const al = (e.getAttribute('aria-label') || '').replace(/[،.:؛]/g, ' '), shown = W2(e.querySelector('.nc-at').innerText).replace(/[·،.:؛]/g, ' ');
        const missW = shown.split(/\s+/).filter((x) => x.length > 1 && !/^[\d.%+−-]+$/.test(x)).filter((x) => !al.includes(x)), missN = nums(shown).filter((x) => !nums(al).includes(x));
        if (missW.length || missN.length) issues.push(`a11y: «${W2(e.querySelector('b').innerText)}» does not read all it shows: ${missW.concat(missN).slice(0, 4).join(' ')}`);
        if (e.matches('button') && !/يفتح \S+/.test(e.getAttribute('aria-label') || '')) issues.push(`a11y: «${W2(e.querySelector('b').innerText)}» does not say where it leads`); });
      const bd = q('.nc-b'), over = bd.scrollHeight - bd.clientHeight;
      if ((nc.dataset.ftop === '1') !== (bd.scrollTop > 0.5) || (nc.dataset.fbot === '1') !== (bd.scrollTop < over - 0.5)) issues.push('the centre\'s fades do not match its scroll');
      if (/_end/.test(view) && over > 0.5 && bd.scrollTop < over - 0.5) issues.push('the _end view is not scrolled to the end');
      allClear('.nc-h h2, .nc-b h3, .nc-r b, .nc-at > span, .nc-x');
    }
    // map labels: never cut by a panel edge, never sliced by the screen edge or the side inset
    document.querySelectorAll('.labels text, .labels circle').forEach((t) => {
      if (!t.getClientRects().length) return;
      const mk = q('.map').getBoundingClientRect().width / 1688, r = t.getBoundingClientRect(), sw = parseFloat(t.getAttribute('stroke-width') || 0) / 2 * mk, b = { x0: r.left - sw - 2, y0: r.top - sw - 2, x1: r.right + sw + 2, y1: r.bottom + sw + 2 };
      if (r.right + sw <= 0 || r.left - sw >= W || r.bottom + sw <= 0 || r.top - sw >= H) return;
      const what = t.tagName === 'text' ? `label ${t.textContent}` : `city dot ${t.getAttribute('data-city')}`;
      const under = prs.some((o) => r.left - sw >= o.r.x0 && r.right + sw <= o.r.x1 && r.top - sw >= o.r.y0 && r.bottom + sw <= o.r.y1);
      if (!under && prs.some((o) => inter(b, o.r))) issues.push(`map ${what} cut by a panel edge`);
      if (r.left - sw < Math.max(S, 0) || r.right + sw > W - Math.max(S, 0) || r.top - sw < 0 || r.bottom + sw > H) issues.push(`map ${what} sliced by the screen edge or the side inset`);
    });
    return { issues, texts, typeSeen, clearNow, map: window.__map, ev: window.__ev, nc: window.__nc, hits: taps.map((t) => ({ l: t.label, x0: +t.hit.x0.toFixed(1), x1: +t.hit.x1.toFixed(1), y0: +t.hit.y0.toFixed(1), y1: +t.hit.y1.toFixed(1) })) };
  }, { d, b3, view, DATA, HUDSEL });
}

async function contrast(p, texts) {
  await p.addStyleTag({ content: ':root body .hud, :root body .hud *, :root body .ev, :root body .ev * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } :root body .hud svg, :root body .ev svg, :root body .flag, .dev { visibility: hidden !important; }' });
  await p.waitForTimeout(150);
  const buf = await p.screenshot({ scale: 'css' });
  return p.evaluate(async ({ b64, texts }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const k = img.width / innerWidth, lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b), parse = (s) => s.match(/[\d.]+/g).map(Number), parseA = (s) => { const v = parse(s); return v.length > 3 ? v : v.concat([1]); };
    return texts.filter((t) => !t.faded).map((t) => {
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


// every brief string must be some element's whole text, shown clear (not hidden by the list's scroll, not in a fade), in
// one of its state's views
function coverage(clear) {
  return Object.entries(BRIEF).map(([st, list]) => list.filter((s) => !(clear[st] || new Set()).has(s)).map((s) => `${st}: never shown clear: ${s}`)).flat();
}
const stOf = (view) => (view === 'event' ? 'event' : 'center');

async function selftest(b) {
  const d = ALL.find((x) => x.id === 'i16promax'), se = ALL.find((x) => x.id === 'se');
  const ref = { i16promax: await b3Rects(b, d), se: await b3Rects(b, se) };
  const ctxs = {};
  for (const x of [d, se]) ctxs[x.id] = await b.newContext({ viewport: { width: x.w, height: x.h }, deviceScaleFactor: 1 });
  const V = (extra) => (VIEWS.find((v) => v[1] === extra) || VIEWS[0])[2], C = '&state=center';
  const cases = [
    ['modal not opaque', d, '', '.ev { background: rgba(9, 17, 25, 0.66) !important; }', /the modal is not the opaque 12 pt panel/],
    ['type size', d, '', '.ev-t { font-size: 17px !important; }', /font size 17 for/],
    ['font weight', d, '', '.ev-op b { font-weight: 700 !important; }', /font weight 11\.5\/700/],
    ['modal off centre', d, '', '', /the modal is not centred across the screen/, () => { const m = document.querySelector('.ev'); m.style.left = (parseFloat(m.style.left) + 20) + 'px'; }],
    ['modal too wide', se, '', ':root { --ev-w: 700px !important; }', /modal width 700|leaves the safe screen/],
    ['scrim missing', d, '', '.scrim { display: none !important; }', /the scrim does not cover the screen/],
    ['HUD live under the modal', d, '', '', /\.hud is not inert under the modal/, () => { document.querySelector('.hud').removeAttribute('inert'); }],
    ['not a dialog', d, '', '', /a11y: the modal is not a labelled modal dialog/, () => { document.querySelector('.ev').removeAttribute('aria-modal'); }],
    ['image on the right', d, '', '.ev { direction: ltr; }', /the image column is not on the left/],
    ['image swapped', d, '', '', /the category image is not the owner's protest image/, () => { document.querySelector('.ev-pic img').setAttribute('src', '../../generated/event_flood.png'); }],
    ['category unnamed', d, '', '', /the category is not named in words on its image/, () => { document.querySelector('.ev-cat').lastChild.textContent = ''; }],
    ['title too long', d, '', '', /the title is \d+ characters/, () => { document.querySelector('.ev-t').textContent = 'احتجاجات واسعة في تونس تمتد إلى مدن الساحل والجنوب وتطالب بإسقاط الحكومة والرئيس'; }],
    ['text too long', d, '', '', /the text is \d+ words|the text is not the brief's/, () => { const p = document.querySelector('.ev-p'); p.textContent = (p.textContent + ' ').repeat(3); }],
    ['options reordered', d, '', '', /option 1 is «تشديد/, () => { const g = document.querySelector('.ev-ops'), o = g.querySelectorAll('.ev-op'); g.insertBefore(o[1], o[0]); }],
    ['options in one column', d, '', '.ev-ops { grid-template-columns: 1fr !important; }', /the options are not a 2 × 2 grid/],
    ['an effect without its arrow', d, '', '', /option 1 effect 1 is «none/, () => { document.querySelector('.ev-op .ev-fx > span svg').remove(); }],
    ['arrow against its sign', d, '', '', /an arrow against its sign|option 3 effect 1 is «up/, () => { document.querySelectorAll('.ev-op')[2].querySelector('.ev-fx use').setAttribute('href', '#t-down'); }],
    ['cost not amber', d, '', '', /option 1 effect 2 is .*\(want .* amber\)/, () => { document.querySelectorAll('.ev-op')[0].querySelectorAll('.ev-fx > span')[1].classList.remove('r-amber'); }],
    ['option read in part', d, '', '', /a11y: option 2 does not read all it shows/, () => { document.querySelectorAll('.ev-op')[1].setAttribute('aria-label', 'تشديد الانتشار الأمني'); }],
    ['option silent on better or worse', d, '', '', /a11y: option 3 does not say «(الشرعية|الاضطرابات)»'s direction/, () => { const o = document.querySelectorAll('.ev-op')[2]; o.setAttribute('aria-label', o.getAttribute('aria-label').replace('، أفضل', '')); }],
    ['option says $', d, '', '', /a11y: option 1 does not say «دولار»/, () => { const o = document.querySelectorAll('.ev-op')[0]; o.setAttribute('aria-label', o.getAttribute('aria-label').replace(/دولار/g, '$')); }],
    ['two defaults', d, '', '', /the default is not exactly one option/, () => { const o = document.querySelectorAll('.ev-op')[0]; o.dataset.default = '1'; }],
    ['default unnamed', d, '', '.ev-def { display: none !important; }', /the default is not exactly one option|never shown clear: الافتراضي/],
    ['no expiry', d, '', '', /the expiry and its default answer are not stated/, () => { document.querySelector('.ev-foot').textContent = 'اختر خيارًا.'; }],
    ['deficit off the subsidy', d, '', '', /the deficit's rise .* is not the subsidy's 0\.6/, () => { document.querySelector('.ev-op .ev-c .ltr').textContent = '600'; }],
    ['game running', d, '', '', /the game is not shown paused/, () => { document.querySelector('.play use').setAttribute('href', '#i-pause'); }],
    ['effects heard backwards', d, '', '', /a11y: option 1 does not say/, () => { document.querySelectorAll('.ev-op')[0].setAttribute('aria-label', 'توسيع دعم الخبز والتموين: 500 مليون دولار سنويًا. ترتفع الاضطرابات 3 نقاط، أسوأ؛ ينخفض العجز 0.5 مليار دولار، أفضل'); }],
    ['better and worse swapped', d, '', '', /a11y: option 2 does not say/, () => { document.querySelectorAll('.ev-op')[1].setAttribute('aria-label', 'تشديد الانتشار الأمني في المدن: لا كلفة إضافية، من بند الأمن الداخلي. تنخفض الاضطرابات نقطتين، أسوأ؛ تنخفض الشرعية 2، أفضل'); }],
    ['a benefit drawn amber', d, '', '.ev-op[data-op="dialogue"] .ev-fx > span { color: rgb(242, 177, 76) !important; }', /option 3 effect \d: drawn rgb\(242, 177, 76\)/],
    ['a cost arrow not amber', d, '', '.ev-fx .r-amber svg { color: rgb(234, 242, 247) !important; }', /option 1 effect 2: drawn .* with its arrow rgb\(234, 242, 247\)/],
    ['an option not a button', d, '', '', /a11y: option 1 is not a button/, () => { document.querySelectorAll('.ev-op')[0].setAttribute('role', 'presentation'); }],
    ['scrim clear', d, '', '.scrim { background: rgba(4, 8, 12, .1) !important; }', /the scrim does not dim the game/],
    ['pause unsaid', d, '', '', /the modal does not say the time is stopped/, () => { const k = document.querySelector('.ev-k'); k.lastChild.textContent = ''; }],
    ['no later', d, '', '', /no «لاحقًا»/, () => { document.querySelector('.ev-later').remove(); }],
    ['left stack showing', d, '', '[data-state="event"] .lstack { visibility: visible !important; }', /the left stack or the dock shows around the modal/],
    ['capital beyond the panel', d, '', '', /the dialogue's 100 political capital is more than/, () => { document.querySelectorAll('.ev-op')[2].querySelector('.ev-c .ltr').textContent = '100'; }],
    ['bell silent', d, '', '', /a11y: the bell does not read its count/, () => { document.querySelector('.bell').setAttribute('aria-label', 'الإشعارات'); }],
    ['label cut by the modal', d, '', '.labels .cut { display: inline !important; }', /map (label|city dot) .* (cut by a panel edge|sliced)/],
    ['faint text', d, '', '.ev-p { opacity: .3 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['text overlap', d, '', '.ev-t { margin-top: -18px !important; }', /text overlap/],
    ['option too short', d, '', '.ev-op { min-height: 40px !important; height: 40px !important; }', /option height 40/],
    ['centre misplaced', d, C, '.nc { margin-top: 12px !important; }', /the centre is not under the toast/],
    ['buttons under the centre', d, C, '[data-state="center"] .btn.mode { visibility: visible !important; }', /\.btn\.mode shows under the centre/],
    ['sections reordered', d, C, '', /the sections are/, () => { const h = document.querySelectorAll('.nc-b h3'); h[2].textContent = 'للعلم'; h[3].textContent = 'مهم'; }],
    ['badge off', d, C, '', /the badge says 4, the unread notifications are 3/, () => { document.querySelector('.badge').textContent = '4'; }],
    ['order not cancellable', d, C, '', /the pending order is not a group with its own cancel button/, () => { document.querySelector('.nc-x').remove(); }],
    ['row read in part', d, C, '', /a11y: «السودان: استفتاء الجنوب بعد 8 أيام» does not read all it shows/, () => { document.querySelectorAll('.nc-b button.nc-r')[1].setAttribute('aria-label', 'السودان. يفتح الخبر'); }],
    ['row silent on where it leads', d, C, '', /does not say where it leads/, () => { const r = document.querySelectorAll('.nc-b button.nc-r')[0]; r.setAttribute('aria-label', r.getAttribute('aria-label').replace('. يفتح القرار', '')); }],
    ['fades wrong', se, C, '', /the centre's fades do not match its scroll/, () => { document.querySelector('.nc').dataset.fbot = '0'; }],
    ['list cut without a fade', se, C, '', /text cut by the list's edge without a fade/, () => { const n = document.querySelector('.nc'), b = n.querySelector('.nc-b'); b.scrollTop = 7; n.dataset.ftop = '0'; n.dataset.fbot = '0'; }],
    ['close not round', d, C, '.nc-close { border-radius: 4px !important; }', /the close button is not a 32 pt circle/],
    ['HUD moved', d, C, '.lstack { margin-left: 8px; }', /HUD element moved from its B3 position/],
    ['map label cut', d, C, '.labels .cut { display: inline !important; }', /map (label|city dot) .* (cut by a panel edge|sliced)/],
    ['hit overlap', d, C, '.nc-x.tap::before { height: 120px !important; }', /hit overlap/],
    ['badge and unread changed together', d, C, '', /the badge says 2, the unread notifications are 2 \(the brief's 3\)/, () => { document.querySelector('.badge').textContent = '2'; document.querySelectorAll('.nc-b [data-unread="1"]')[1].removeAttribute('data-unread'); document.querySelector('.bell').setAttribute('aria-label', 'الإشعارات، 2 غير مقروءة'); }],
    ['the order counted unread', d, C, '', /an unread mark on something that is not a notification/, () => { document.querySelector('.nc-b div.nc-r').dataset.unread = '1'; }],
    ['tiers swapped', d, C, '', /is not under «مهم»|is not under «للعلم»/, () => { const r = document.querySelectorAll('.nc-b button.nc-r'), a = r[1], b = r[2], x = a.nextSibling; b.after(a); x ? x.before(b) : null; const p = a.parentNode, ra = a, rb = b, na = document.createElement('i'); p.replaceChild(na, ra); p.replaceChild(ra, rb); p.replaceChild(rb, na); }],
    ['chevrons gone', d, C, '', /has no chevron/, () => { document.querySelectorAll('.nc-chev').forEach((c) => c.remove()); }],
    ['icons gone', d, C, '', /has no icon/, () => { document.querySelectorAll('.nc-ic').forEach((c) => c.remove()); }],
    ['unread dot missing', d, C, '', /the unread dot and words do not match/, () => { document.querySelector('.nc-dot').remove(); }],
  ];
  const results = [];
  for (const [name, x, extra, css, re, js] of cases) {
    const p = await open(ctxs[x.id], PAGE + qs(x) + extra);
    if (css) await p.addStyleTag({ content: css });
    if (js) await p.evaluate(js);
    await p.waitForTimeout(80);
    const { m } = await check(p, x, ref[x.id], V(extra));
    const cov = /never shown clear/.test(String(re)) ? coverage({ [stOf(V(extra))]: new Set(m.clearNow) }) : [];
    const ok = m.issues.concat(cov).some((i) => re.test(i));
    results.push({ name, ok, sample: m.issues.slice(0, 3) });
    console.log(`${ok ? 'caught ' : 'MISSED '} ${name}${ok ? '' : '  -> ' + m.issues.slice(0, 4).join(' || ')}`);
    await p.close();
  }
  const clean = {};
  for (const x of [d, se]) {
    const clear = {};
    for (const [suffix, extra, view] of VIEWS) {
      const p = await open(ctxs[x.id], PAGE + qs(x) + extra), { m } = await check(p, x, ref[x.id], view);
      (clear[stOf(view)] = clear[stOf(view)] || new Set()); m.clearNow.forEach((s) => clear[stOf(view)].add(s));
      clean[x.id + suffix] = m.issues; console.log(`clean page ${x.id}${suffix}: ${m.issues.length} issues${m.issues.length ? ' -> ' + m.issues.slice(0, 4).join(' || ') : ''}`); await p.close();
    }
    clean[x.id + ' coverage'] = coverage(clear);
    if (x === se) { const k = 'center', had = BRIEF[k]; BRIEF[k] = had.concat(['نص غير معروض للاختبار']); const miss = coverage(clear); BRIEF[k] = had;
      const ok = miss.some((m) => m.includes('نص غير معروض للاختبار')); results.push({ name: 'coverage reports a string no view shows', ok }); console.log(`${ok ? 'caught ' : 'MISSED '} coverage reports a string no view shows`); }
  }
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
    const clear = {};
    for (const [suffix, extra, view] of VIEWS) {
      const p = await open(ctx, PAGE + qs(d) + extra);
      const png = suffix ? path.join(OUT, '_build', d.id + suffix + '.png') : path.join(OUT, d.id + '.png');
      await p.screenshot({ path: png });
      entry.pngs.push(path.relative(OUT, png));
      entry.pngSha1[path.relative(OUT, png)] = crypto.createHash('sha1').update(fs.readFileSync(png)).digest('hex');
      if (!suffix) { const hp = path.join(OUT, '_build', d.id + '_hit.png'), ph = await open(ctx, PAGE + qs(d) + extra + '&hit=1'); await ph.screenshot({ path: hp }); await ph.close();
        entry.pngSha1[path.relative(OUT, hp)] = crypto.createHash('sha1').update(fs.readFileSync(hp)).digest('hex'); }
      const { m, c } = await check(p, d, b3, view);
      (clear[stOf(view)] = clear[stOf(view)] || new Set()); m.clearNow.forEach((s) => clear[stOf(view)].add(s));
      m.issues.forEach((i) => entry.issues.push(`${view}: ${i}`));
      entry.views[view] = { issueCount: m.issues.length, png: true, map: m.map, ev: m.ev, nc: m.nc, typeSeen: m.typeSeen, hits: m.hits, minContrast: Math.min(...c.map((x) => x.worst)), contrast: c };
      console.log(`== ${d.id} ${view} minContrast ${entry.views[view].minContrast}`);
      console.log(m.issues.length ? '  ISSUES:\n    ' + m.issues.join('\n    ') : '  no issues');
      await p.close();
    }
    const cov = coverage(clear);
    cov.forEach((i) => entry.issues.push(`coverage: ${i}`));
    entry.views.coverage = { issueCount: cov.length };
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
