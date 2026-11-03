// Shared checker for the full-height dock panels (screens 8 onward), built from the approved panels' checkers (screens 5,
// 6 and 7) so every new panel is held to the same rules. A screen's render.js gives: its views and tabs, its tokens
// (size tables, the section colour), its brief strings, the source of its own page checks and its self-test plants.
// The library renders the 7 iPhones, checks every view (saved PNG views, each tab's end and middle scroll offsets),
// the coverage of every tab's strings, re-hashes its inputs, and runs the self-test.
// Generic checks: opaque panels (D-3); control heights from the size table; radii; gaps; icon sizes and strokes; type
// sizes, weights and colours; 44 pt hit boxes (cover, no overlap, clipped by every clip); safe insets; panels never
// overlap; text over text, icons over text, clipped text (only at a faded scroll edge), % after its digits; contrast
// >= 4.5:1 per pixel over the rendered backdrop; the sheet's geometry, the dock beside it or hidden, the rest of the HUD
// at its B3 place; the fit level the loosest that fits; one tab body, the open tab marked and a tab list; the fades and
// the scroll hint in its strip; the section identity on chrome only (dock item, top line, emblem, open tab) and never on
// data; the white touches; the brief's sizes; the money rule over the shown text; signs inside their numbers and left of
// them; colour never alone (amber, blue or red data text beside an arrow or an icon); VoiceOver labels on every
// action and link row with the numbers they show and «دولار»; no image but the flag and the header strip; header and
// row order (RTL); each brief string matched as an element's whole text; the map: Egypt and the delta clear, no label
// cut, squeezed or sliced.
// Usage (from a screen's render.js): require(<repo>/design/shared/check/panelcheck.js)(cfg). See makeChecker below.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { execFileSync } = require('child_process');

module.exports = function makeChecker(cfg) {
  const OUT = cfg.OUT, PAGE = 'file://' + path.join(OUT, 'index.html');
  const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
  const args = process.argv.slice(2), SELFTEST = args.includes('--selftest'), want = args.filter((a) => !a.startsWith('--'));
  const DEVICES = (want.length ? want : ALL.map((d) => d.id)).map((id) => ALL.find((d) => d.id === id) || (() => { throw new Error('unknown device ' + id); })());
  const REPO = path.resolve(OUT, '../../..');
  const STATIC_INPUTS = ['index.html', '_build/render.js', '_build/sheet.html', '_build/assemble.py', '../../shared/check/panelcheck.js', '../../shared/check/panel_page.py',
    '../../screen4/R/_build/panel.css', '../../shared/section_identity.css', '../../screen5/A/_build/state.css', '../../screen4/A/index.html', '../../screen1/B3/index.html',
    '../../shared/devices.json'].concat(cfg.inputs || []);
  let INPUTS = STATIC_INPUTS.slice();
  const inputsHash = () => crypto.createHash('sha1').update(Buffer.concat(INPUTS.map((f) => fs.readFileSync(path.join(OUT, f))))).digest('hex');
  const TABS = cfg.tabs, tabQ = (tb) => '&tab=' + tb;
  // the saved views: each tab's top and end (where it scrolls), plus the screen's own (states, ...)
  const VIEWS = TABS.map((tb, i) => [[i ? '_' + tb : '', tabQ(tb)], ['_' + tb + '_end', tabQ(tb) + '&scroll=end']]).flat().concat(cfg.views || []);
  const viewOf = (extra) => { const tb = (extra.match(/tab=(\w+)/) || [0, TABS[0]])[1], s = (extra.match(/scroll=(\w+)/) || [0, ''])[1];
    return tb + (s === 'end' ? '_end' : s ? '_at' + s : '') + (/states=1/.test(extra) ? '_states' : ''); };
  const seqOf = (view) => view.replace(/_(end|at\d+)$/, '');
  const TOK = Object.assign({
    heights: [32, 36, 44], hudSpace: [0, 4, 8, 12], rCtl: 10, rCard: 12,
    type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] },
    icon: { ctl: 16, stat: 14, dock: 17, glyph: 10 }, stroke: 1.75,
    panel: 'rgb(12, 20, 28)', border: 'rgba(127, 233, 255, 0.14)',
    t1: 'rgb(234, 242, 247)', t2: 'rgb(169, 188, 203)', dark: 'rgb(11, 18, 24)', amber: 'rgb(242, 177, 76)', red: 'rgb(242, 112, 90)',
    blue: 'rgb(111, 182, 255)', teal: 'rgb(63, 224, 208)', cyan: 'rgb(127, 233, 255)',
    wLine: 'rgba(234, 242, 247, 0.5)', wLineDim: 'rgba(234, 242, 247, 0.28)',
    sheetSpace: [0, 2, 4, 8, 12, 16], fade: 24, strip: 22, overlap: 56,
  }, cfg.TOK);
  TOK.colors = ['rgb(234, 242, 247)', 'rgb(169, 188, 203)', 'rgb(127, 233, 255)', 'rgb(63, 224, 208)', 'rgb(242, 177, 76)', 'rgb(242, 112, 90)', 'rgb(111, 182, 255)', TOK.sec, TOK.dark];
  TOK.ctlH = Object.assign({ '.r-x': 32, '.r-why': 14, '.r-act': 44, '.r-tab': 44, '.r-link': 44, '.r-btn': 24, '.s-sg': 26 }, cfg.TOK.ctlH || {});
  TOK.radius = Object.assign({ '.sheet': 12, '.r-chip': 6, '.r-cap': 10, '.s-emb': 10, '.r-act': 10, '.r-link': 10, '.r-tile': 6, '.r-btn': 6, '.s-seg': 6 }, cfg.TOK.radius || {});
  TOK.sheetIcon = [['.r-cap svg', 10], ['.r-arr', 10], ['.r-kl svg', 14], ['.r-x svg', 16], ['.r-hint svg', 16], ['.r-chev', 16], ['.s-emb svg', 16], ['.r-tile svg', 17], ['.r-tab svg', 17]].concat(cfg.TOK.sheetIcon || []);
  TOK.size = [['.s-emb', 32, 32], ['.r-tabs', null, 45], ['.s-sg', 60, 26]].concat(cfg.TOK.size || []);
  TOK.title18 = ['.r-name', '.r-kv b'].concat(cfg.TOK.title18 || []);
  const BRIEF = cfg.BRIEF, HEAD = cfg.HEAD;
  const HUDSEL = ['.top > .nation', '.top > .stats', '.top > .date', '.toast', '.btn.mode', '.btn.home', '.dock', '.dock-item'];
  const HUDSEL_REST = HUDSEL.slice(0, 6);
  const B3 = 'file://' + path.resolve(OUT, '../../screen1/B3/index.html');
  const qs = (d) => `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
  async function open(ctx, url) {
    const p = await ctx.newPage();
    await p.goto(url);
    await p.waitForFunction(() => window.__ready === true);
    await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
    await p.waitForTimeout(400);
    return p;
  }
  async function recordInputs(b) {
    const d = ALL.find((x) => x.id === 'i16promax'), seen = new Set();
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h } });
    ctx.on('request', (r) => { if (r.url().startsWith('file://')) seen.add(path.relative(OUT, decodeURIComponent(new URL(r.url()).pathname))); });
    for (const u of [B3 + qs(d)].concat(TABS.map((tb) => PAGE + qs(d) + tabQ(tb)))) { const p = await open(ctx, u); await p.close(); }
    await ctx.close();
    INPUTS = [...new Set(STATIC_INPUTS.concat([...seen].sort()))];
  }
  function assertAssembled() {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'panel-'));
    try {
      execFileSync('python3', ['-I', path.join(OUT, '_build/assemble.py'), REPO, path.join(OUT, '_build'), tmp], { stdio: 'pipe' });
      if (!fs.readFileSync(path.join(tmp, 'index.html')).equals(fs.readFileSync(path.join(OUT, 'index.html')))) throw new Error('index.html is not the current output of assemble.py: run assemble.py first');
    } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
  }
  async function hudRects(p) {
    return p.evaluate((HUDSEL) => {
      const o = {};
      HUDSEL.forEach((s) => { o[s] = [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; }); });
      o.hud = (() => { const r = document.querySelector('.hud').getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; })();
      o.dockLook = [...document.querySelectorAll('.dock-item')].map((e) => { const s = e.querySelector('svg'), l = e.querySelector('span');
        return { label: getComputedStyle(l).color, icon: getComputedStyle(s).color, op: getComputedStyle(s).opacity }; });
      return o;
    }, HUDSEL);
  }
  async function b3Rects(b, d) {
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 });
    const p = await open(ctx, B3 + qs(d));
    const r = await hudRects(p);
    await ctx.close();
    return r;
  }

  async function measure(p, d, b3, view) {
    return p.evaluate(({ d, TOK, BRIEF, HEAD, b3, view, HUDSEL_REST, DATA, SCREEN, DOCK }) => {
    const R = (r) => ({ x0: +r.left.toFixed(2), y0: +r.top.toFixed(2), x1: +r.right.toFixed(2), y1: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    const issues = [], W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01, lu = 1 / 32;
    const root = document.documentElement;
    const near = (a, b, t = 0.05) => Math.abs(a - b) < t;
    // the opacity an element is drawn with (its own times every ancestor's)
    const effOp = (e) => { let o = 1; for (let a = e; a && a.nodeType === 1; a = a.parentElement) o *= parseFloat(getComputedStyle(a).opacity); return o; };
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden' && effOp(e) > 0.05;
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(visible);
    const inter = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.05 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.05;
    const box = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    const label = (e) => (e.getAttribute('aria-label') || e.textContent || e.className.baseVal || e.className || e.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 26);
    // the rectangle the clipping ancestors let through, and the scroll area (with its faded edges)
    const clipOf = (e) => {
      let c = { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 }, scroller = null;
      for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
        const cs = getComputedStyle(a);
        if (cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
          const r = a.getBoundingClientRect();
          c = { x0: Math.max(c.x0, r.left), y0: Math.max(c.y0, r.top), x1: Math.min(c.x1, r.right), y1: Math.min(c.y1, r.bottom) };
          if (/auto|scroll/.test(cs.overflowY) && !scroller) scroller = a;
        }
      }
      let ftop = false, fbot = false;
      if (scroller) {
        const sc = getComputedStyle(scroller), mk = sc.webkitMaskImage && sc.webkitMaskImage !== 'none' ? sc.webkitMaskImage : (sc.maskImage || 'none');
        const clr = '(?:rgba\\(0, 0, 0, 0\\)|transparent)';
        ftop = root.dataset.ftop === '1' && new RegExp('^linear-gradient\\((?:[^,()]*deg, )?' + clr + ', ').test(mk) && /\) 24px/.test(mk);
        // the bottom fade runs 46..22 pt above the edge and the last 22 pt (the hint's strip) are clear
        fbot = root.dataset.fbot === '1' && new RegExp('calc\\(100% - ' + (TOK.fade + TOK.strip) + 'px\\), ' + clr + ' calc\\(100% - ' + TOK.strip + 'px\\)\\)$').test(mk);
      }
      return { c, scroller, ftop, fbot };
    };
    const hiddenByScroll = (r, e) => { const { c, scroller } = clipOf(e); return !!scroller && (r.y0 >= c.y1 - 0.05 || r.y1 <= c.y0 + 0.05); };
    // a box cut by its clip rect: allowed only where the cut edge is a faded scroll edge
    const badCut = (r, e) => {
      const { c, ftop, fbot } = clipOf(e);
      if (r.x0 < c.x0 - 0.5 || r.x1 > c.x1 + 0.5) return 'sides';
      if (r.y0 < c.y0 - 0.5 && !ftop) return 'top';
      if (r.y1 > c.y1 + 0.5 && !fbot) return 'bottom';
      return '';
    };
    const inFade = (r, e) => { const { c, ftop, fbot } = clipOf(e); return (ftop && r.y0 < c.y0 + TOK.fade) || (fbot && r.y1 > c.y1 - TOK.fade - TOK.strip); };

    // ---------- 1. panels: opaque (D-3), border, radius ----------
    const panels = qa('.hud .glass').filter((e) => !e.classList.contains('menu') || root.classList.contains('menu-open'));
    panels.forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost');
      const fill = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (fill !== TOK.panel) issues.push(`panel not opaque: ${label(g)} ${fill}`);
      if (effOp(g) < 0.999) issues.push(`panel not opaque (opacity ${effOp(g).toFixed(2)}): ${label(g)}`);
      if (cs.backdropFilter !== 'none' && cs.backdropFilter !== '') issues.push(`panel blur: ${label(g)} ${cs.backdropFilter}`);
      if (f && getComputedStyle(f.firstChild).display !== 'none') issues.push(`panel shows the blurred map copy: ${label(g)}`);
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== TOK.border) issues.push(`panel border ${label(g)}: ${cs.borderTopWidth} ${cs.borderTopColor}`);
      const r = parseFloat(cs.borderTopLeftRadius), w = g.classList.contains('ctl') ? TOK.rCtl : TOK.rCard;
      if (!near(r, w)) issues.push(`panel radius ${label(g)}: ${r} (want ${w})`);
    });
    // ---------- 2. control heights and radii ----------
    const hh = (e) => e.getBoundingClientRect().height;
    qa('.hud .tap').forEach((e) => {
      const h = hh(e);
      if (e.closest('.sheet')) {
        const k = Object.keys(TOK.ctlH).find((s) => e.matches(s));
        if (!k) issues.push(`sheet control without a size in the table: ${label(e)}`);
        else if (!near(h, TOK.ctlH[k])) issues.push(`control height ${h.toFixed(2)} for ${k} (want ${TOK.ctlH[k]}): ${label(e)}`);
        return;
      }
      const bar = e.parentElement.closest('.glass, .cap');
      const fills = bar && TOK.heights.some((x) => near(hh(bar), x)) && near(h, hh(bar) - 2 * parseFloat(getComputedStyle(bar).borderTopWidth));
      if (!TOK.heights.some((x) => near(h, x)) && !fills) issues.push(`control height ${h.toFixed(2)}: ${label(e)}`);
    });
    [['.cap', 32], ['.toast', 32], ['.dock', 44]].forEach(([s, v]) => qa(s).forEach((e) => { if (!near(hh(e), v)) issues.push(`control height ${hh(e).toFixed(2)} for ${s} (want ${v})`); }));
    qa('.top > .glass').forEach((e) => { if (!near(hh(e), 36)) issues.push(`top row height ${hh(e)} for ${label(e)}`); });
    Object.entries(TOK.radius).forEach(([s, v]) => qa(s).forEach((e) => { const r = parseFloat(getComputedStyle(e).borderTopLeftRadius); if (!near(r, v)) issues.push(`radius ${r} for ${s} (want ${v})`); }));
    { const x = q('.r-x'), xr = x.getBoundingClientRect();
      if ((getComputedStyle(x).borderTopLeftRadius !== '50%' && !near(parseFloat(getComputedStyle(x).borderTopLeftRadius), hh(x) / 2)) || !near(xr.width, xr.height)) issues.push('close button is not round'); }
    // ---------- 3. spacing: flex/grid gaps ----------
    document.querySelectorAll('.hud *').forEach((e) => {
      if (!visible(e) || e.closest('.frost')) return;
      const cs = getComputedStyle(e);
      if (!/flex|grid/.test(cs.display)) return;
      const allowed = e.closest('.sheet') ? TOK.sheetSpace : TOK.hudSpace;
      [cs.columnGap, cs.rowGap].forEach((g) => { const v = g === 'normal' ? 0 : parseFloat(g); if (!allowed.some((s) => near(s, v))) issues.push(`gap ${v} on ${label(e)}`); });
    });
    // ---------- 4. icons ----------
    document.querySelectorAll('.hud svg').forEach((s) => {
      if (!s.getClientRects().length || s.closest('.frost')) return;
      const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      let want;
      if (s.closest('.sheet')) { const k = TOK.sheetIcon.find(([sel]) => s.matches(sel)); if (!k) { issues.push(`sheet icon without a size in the table: ${label(s)}`); return; } want = k[1]; }
      else want = TOK.icon[s.classList.contains('trend') ? 'glyph' : s.closest('.stat') ? 'stat' : s.closest('.dock') ? 'dock' : 'ctl'];
      if (!near(r.width, want) || !near(r.height, want)) issues.push(`icon size ${r.width}x${r.height} (want ${want}): ${label(s)}`);
      if (!near(parseFloat(cs.strokeWidth), TOK.stroke)) issues.push(`icon stroke ${cs.strokeWidth}: ${label(s)}`);
    });
    // ---------- 5. type, colour, placement, clipping of every text run ----------
    const typeSeen = {}, texts = [], elOf = new Map();   // elOf: each text record's element (kept out of the returned records)
    const walker = document.createTreeWalker(q('.hud'), NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      if (!tn.textContent.trim()) continue;
      const el = tn.parentElement, cs = getComputedStyle(el);
      if (!visible(el)) continue;
      const range = document.createRange(); range.selectNodeContents(tn);
      const rr = [...range.getClientRects()].filter((r) => r.width > 0);
      if (!rr.length) continue;
      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight, t = tn.textContent.trim();
      const inSheet = !!el.closest('.sheet');
      if (rr.every((r) => hiddenByScroll(box(r), el))) continue;
      typeSeen[`${fs}/${fw}`] = (typeSeen[`${fs}/${fw}`] || 0) + 1;
      if (!(fs in TOK.type)) issues.push(`font size ${fs} for "${t}"`);
      else if (!TOK.type[fs].includes(fw)) issues.push(`font weight ${fs}/${fw} for "${t}"`);
      if (fs === 18 && !TOK.title18.some((c) => el.closest(c))) issues.push(`18 pt is for the panel's name and the adjusted values only: "${t}"`);
      if (fs === 13 && !/tabular-nums/.test(cs.fontVariantNumeric)) issues.push(`13 pt not tabular: "${t}"`);
      if (inSheet && !TOK.colors.includes(cs.color)) issues.push(`text colour off-token ${cs.color}: "${t}"`);
      if (cs.textOverflow === 'ellipsis') issues.push(`ellipsis on "${t}"`);
      const cl = clipOf(el).c;
      rr.forEach((r) => {
        const b = box(r), lh = parseFloat(cs.lineHeight), mid = (b.y0 + b.y1) / 2;
        const vb = { x0: Math.max(b.x0, cl.x0), x1: Math.min(b.x1, cl.x1), y0: Math.max(b.y0, cl.y0), y1: Math.min(b.y1, cl.y1) };   // the part on screen
        if (vb.x1 - vb.x0 <= 0.05 || vb.y1 - vb.y0 <= 0.05) return;
        const faded = inSheet && inFade(b, el);
        texts.push({ t, fs, color: cs.color, op: effOp(el), sheet: inSheet, faded, badge: !!el.closest('.badge'), chrome: !!el.closest('.r-tab.on, .s-emb'), r: R(r),
          line: { x0: vb.x0, x1: vb.x1, y0: Math.max(mid - lh / 2, cl.y0), y1: Math.min(mid + lh / 2, cl.y1) } });
        elOf.set(texts[texts.length - 1], el);
        if (vb.x0 < S - eps || vb.x1 > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (vb.y1 > H - B + eps) issues.push(`text in bottom inset: ${t}`);
        const cutAt = badCut(b, el);
        if (cutAt) issues.push(`clipped text (${cutAt}): "${t}" ${R(r).x0}..${R(r).x1} y ${R(r).y0}..${R(r).y1}`);
        const sr = q('.sheet').getBoundingClientRect();
        if (inSheet && (b.x0 < sr.left + 1 + 12 - 0.5 || b.x1 > sr.right - 1 - 12 + 0.5)) issues.push(`text outside the sheet's 12 pt padding: "${t}"`);
      });
    }
    const st = texts.filter((x) => x.sheet);
    for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
      const a = st[i].line, b = st[j].line;
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5) issues.push(`text overlap "${st[i].t}" / "${st[j].t}"`);
    }
    // text running into a chip, a «لماذا؟» button, a segment group or the close button it is not part of
    const ctls = [...document.querySelectorAll('.sheet .r-chip, .sheet .r-why, .sheet .s-seg, .sheet .r-x')].filter((c) => c.getClientRects().length);
    st.forEach((x) => ctls.forEach((c) => { if (c.contains(elOf.get(x))) return; const cb = c.getBoundingClientRect(), cc = clipOf(c).c, a = x.line;   // the part of the control its scroll area shows
      const r = { left: Math.max(cb.left, cc.x0), right: Math.min(cb.right, cc.x1), top: Math.max(cb.top, cc.y0), bottom: Math.min(cb.bottom, cc.y1) }; if (r.right - r.left <= 0.5 || r.bottom - r.top <= 0.5) return;
      if (Math.min(a.x1, r.right) - Math.max(a.x0, r.left) > 0.5 && Math.min(a.y1, r.bottom) - Math.max(a.y0, r.top) > 0.5) issues.push(`text over a control: "${x.t}" runs into «${(c.textContent || c.getAttribute('aria-label') || '').trim().slice(0, 20)}»`); }));
    const icons = [...document.querySelectorAll('.hud svg')].filter((s) => s.getClientRects().length && !s.closest('.frost') && !s.closest('.r-hint') && getComputedStyle(s).visibility !== 'hidden')   // the scroll hint sits in the fade by design
      .map((s) => { const r = box(s.getBoundingClientRect()), c = clipOf(s).c; return { s, r: { x0: Math.max(r.x0, c.x0), x1: Math.min(r.x1, c.x1), y0: Math.max(r.y0, c.y0), y1: Math.min(r.y1, c.y1) } }; })
      .filter((o) => o.r.x1 - o.r.x0 > 0.05 && o.r.y1 - o.r.y0 > 0.05);
    texts.forEach((t) => {
      if (t.badge) return;
      icons.forEach((o) => { const a = t.line, b = o.r; if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5) issues.push(`icon over text: ${label(o.s)} / "${t.t}"`); });
    });
    { const w2 = document.createTreeWalker(q('.hud'), NodeFilter.SHOW_TEXT); let n2;
      while ((n2 = w2.nextNode())) {
        const s = n2.textContent; if (!s.includes('%') || !visible(n2.parentElement)) continue;
        for (let i = s.indexOf('%'); i >= 0; i = s.indexOf('%', i + 1)) {
          if (i === 0 || !/[0-9]/.test(s[i - 1])) { issues.push(`% without its digits right before it: "${s.trim()}"`); continue; }
          const r1 = document.createRange(); r1.setStart(n2, i - 1); r1.setEnd(n2, i);
          const r2 = document.createRange(); r2.setStart(n2, i); r2.setEnd(n2, i + 1);
          if (!(r2.getBoundingClientRect().left >= r1.getBoundingClientRect().right - 0.5)) issues.push(`% shown before its number: "${s.trim()}"`);
        }
      } }
    // content stays inside its control
    qa('.sheet .tap, .r-cap, .r-chip').forEach((c) => {
      const cr = c.getBoundingClientRect(); if (hiddenByScroll(box(cr), c) || c.classList.contains('a-track')) return;   // the track's marks overhang it by design (the stepper rules check them)
      c.querySelectorAll('span, svg, b, i').forEach((e) => {
        if (!visible(e) || (c.classList.contains('tap') && e.closest('.tap') !== c)) return;   // a nested control is checked on its own
        let b; if (e.tagName === 'svg' || e.tagName === 'I') b = e.getBoundingClientRect(); else { const r = document.createRange(); r.selectNodeContents(e); b = r.getBoundingClientRect(); }
        if (!b.width) return;
        if (b.left < cr.left - 0.5 || b.right > cr.right + 0.5 || b.top < cr.top - 0.5 || b.bottom > cr.bottom + 0.5) issues.push(`content outside its control (${label(c)}): ${(e.textContent || e.tagName).trim().slice(0, 20)}`);
      });
    });
    // overflow anywhere (other than the declared scroll areas scrolling vertically)
    document.querySelectorAll('.hud .glass, .hud .glass *').forEach((e) => {
      if (e.closest('.frost') || !visible(e)) return;
      const cs = getComputedStyle(e);
      if (cs.overflowX !== 'visible' && e.scrollWidth > e.clientWidth + 1) issues.push(`horizontal overflow in ${label(e)}`);
      if (cs.overflowY !== 'visible' && e.scrollHeight > e.clientHeight + 1 && !/auto|scroll/.test(cs.overflowY)) issues.push(`vertical overflow in ${label(e)}`);
    });
    // ---------- 6. hit boxes (a touch reaches a control only inside its scroll area) ----------
    const taps = qa('.hud .tap').map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e, y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      const raw = { x0, x1: x0 + parseFloat(ps.width), y0, y1: y0 + parseFloat(ps.height) };
      const { c, scroller } = clipOf(e);
      const hit = { x0: Math.max(raw.x0, c.x0), x1: Math.min(raw.x1, c.x1), y0: Math.max(raw.y0, c.y0), y1: Math.min(raw.y1, c.y1) };
      return { e, label: label(e), vis: box(r), raw, hit, scroller, scrolled: hiddenByScroll(box(r), e) };
    }).filter((t) => !t.scrolled);
    taps.forEach((t) => {
      const h = t.raw, v = t.vis;
      if (h.x1 - h.x0 < 44 - eps || h.y1 - h.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      if (h.x0 > v.x0 + lu || h.x1 < v.x1 - lu || h.y0 > v.y0 + lu || h.y1 < v.y1 - lu) issues.push(`hit box does not cover: ${t.label}`);
      if (t.hit.x0 < S - eps || t.hit.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      if (t.hit.y1 > H - B + lu || t.hit.y0 < -eps) issues.push(`tap in bottom inset/off top: ${t.label} ${t.hit.y0.toFixed(1)}..${t.hit.y1.toFixed(1)}`);
      const cutAt = badCut(v, t.e);
      if (cutAt) issues.push(`control cut by its scroll area (${cutAt}): ${t.label}`);
      // a control in the sheet keeps its whole hit box unless it sits at a faded scroll edge
      if (t.e.closest('.sheet') && !(t.scroller && inFade(v, t.e)) && (t.hit.y1 - t.hit.y0 < h.y1 - h.y0 - eps || t.hit.x1 - t.hit.x0 < h.x1 - h.x0 - eps)) issues.push(`hit box shaved by its clip: ${t.label}`);
    });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) {
      const a = taps[i], b = taps[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;                    // a button inside a row: the inner one wins
      if (inter(a.hit, b.hit)) issues.push(`hit overlap ${a.label} / ${b.label}`);
    }
    // ---------- 7. panels: no overlap, inside the safe area ----------
    const prs = panels.map((e) => ({ l: label(e), r: box(e.getBoundingClientRect()) }));
    for (let i = 0; i < prs.length; i++) for (let j = i + 1; j < prs.length; j++) if (inter(prs[i].r, prs[j].r)) issues.push(`panel overlap ${prs[i].l} / ${prs[j].l}`);
    prs.forEach((p) => { if (p.r.x0 < S - eps || p.r.x1 > W - S + eps) issues.push(`panel in side inset: ${p.l}`); });
    // ---------- 8. sheet geometry, dock, the rest of the HUD ----------
    // ---------- 8. sheet geometry, dock, fit, identity, RTL order ----------
    const sheet = q('.sheet'), sr = sheet.getBoundingClientRect();
    const gut = Math.max(S, 8), top = q('.top').getBoundingClientRect(), hud = q('.hud').getBoundingClientRect();
    const safeW = W - 2 * S, dockW = b3 && b3['.dock'][0] ? b3['.dock'][0].x1 - b3['.dock'][0].x0 : 0, room = Math.floor(hud.width - 4 - dockW - 8);
    let wantW = Math.round(Math.min(380, Math.max(340, 0.43 * safeW)));
    if (room < wantW && room >= 330) wantW = room;                          // narrower, so the dock keeps its place beside it
    if (Math.abs(sr.width - wantW) > 0.5) issues.push(`sheet width ${sr.width} (want round(clamp(43% of ${safeW}, 340, 380)), or the room the dock leaves if 330..: ${wantW})`);
    if (!near(sr.right, W - gut)) issues.push(`sheet not at the right safe edge: ${sr.right} (want ${W - gut})`);
    if (!near(sr.top, top.bottom + 8)) issues.push(`sheet top ${sr.top} (want 8 pt under the top row: ${top.bottom + 8})`);
    if (!near(sr.bottom, hud.bottom, 0.6) || sr.bottom > H - B + eps) issues.push(`sheet bottom ${sr.bottom} (want the dock line ${hud.bottom})`);
    // the dock: left end of its line, 4 pt in, when it clears the sheet by 8 pt; else hidden while the sheet is open
    { const ref = b3 && b3['.dock'] && b3['.dock'][0], dk = q('.dock'), shown = visible(dk);
      if (ref) {
        const w = ref.x1 - ref.x0, x0 = hud.left + 4, fits = x0 + w <= sr.left - 8 + eps;
        if (fits && !shown) issues.push('dock hidden although it fits left of the sheet');
        if (!fits && shown) issues.push('dock shown although it does not fit left of the sheet');
        if (shown) {
          const rr = dk.getBoundingClientRect();
          if (!near(rr.left, x0, 0.5) || !near(rr.width, w, 0.5) || !near(rr.top, ref.y0, 0.5) || !near(rr.height, ref.y1 - ref.y0, 0.5)) issues.push(`dock not 4 pt in from the left end of its B3 line: x ${rr.left.toFixed(1)} w ${rr.width.toFixed(1)} y ${rr.top.toFixed(1)} (want x ${x0} w ${w.toFixed(1)} y ${ref.y0.toFixed(1)})`);
          if (rr.right > sr.left - 8 + eps) issues.push(`dock closer than 8 pt to the sheet: ${rr.right.toFixed(1)} vs ${sr.left.toFixed(1)}`);
          const items = [...dk.querySelectorAll('.dock-item')], dx = rr.left - ref.x0;
          items.forEach((e, i) => { const a = e.getBoundingClientRect(), bb = b3['.dock-item'][i]; if (!near(a.left, bb.x0 + dx, 0.5) || !near(a.width, bb.x1 - bb.x0, 0.5) || !near(a.top, bb.y0, 0.5)) issues.push(`dock item ${i + 1} changed`); });
        }
      } }
    // the rest of the HUD stays exactly where it is on B3
    if (!b3) issues.push('B3 reference not measured');
    else HUDSEL_REST.forEach((sel) => {
      const refs = b3[sel], cur = [...document.querySelectorAll(sel)];
      if (cur.length !== refs.length) { issues.push(`HUD element count ${sel}: ${cur.length} (B3 has ${refs.length})`); return; }
      cur.forEach((e, i) => {
        const nm = sel + (refs.length > 1 ? ` #${i + 1}` : ''), ref = refs[i], rr = e.getBoundingClientRect();
        if (!visible(e) || getComputedStyle(e).opacity === '0') { issues.push(`HUD element hidden: ${nm}`); return; }
        const dev = Math.max(Math.abs(rr.left - ref.x0), Math.abs(rr.top - ref.y0), Math.abs(rr.right - ref.x1), Math.abs(rr.bottom - ref.y1));
        if (dev > 0.5) issues.push(`HUD element moved from its B3 position: ${nm} x ${rr.left.toFixed(1)}..${rr.right.toFixed(1)} y ${rr.top.toFixed(1)}..${rr.bottom.toFixed(1)}`);
      });
    });
    // ---------- 8b. fit, the open tab, fades and the scroll hint ----------
    const tab = view.split('_')[0], fit = window.__sheetfit, body = window.__body, bd = q(`.r-body[data-tab="${tab}"]`);
    if (root.dataset.tab !== tab) issues.push(`open tab ${root.dataset.tab} (want ${tab})`);
    { const bodies = qa('.sheet .r-body'); if (bodies.length !== 1 || bodies[0] !== bd) issues.push(`tab bodies shown: ${bodies.map((e) => e.dataset.tab).join(', ')} (want only ${tab})`); }
    // the fit level is the loosest at which the fit tab's body fits (screen 6's rule), the same for every tab
    if (fit && fit.tried && fit.tried.length) { const lv = +root.dataset.rfit, firstFit = fit.tried.findIndex((x) => x[1] <= 0.5);
      if (lv !== (firstFit < 0 ? 6 : fit.tried[firstFit][0])) issues.push(`fit level ${lv} is not the loosest that fits: ${JSON.stringify(fit.tried)}`); }
    // the fit tab (the overview) shows whole, without scrolling, on every phone (screens 5 and 6's rule); measured now
    if (tab === SCREEN.fitTab && bd.scrollHeight - bd.clientHeight > 0.5) issues.push(`${tab} needs scrolling: ${(bd.scrollHeight - bd.clientHeight).toFixed(1)} pt over`);
    { const over = bd.scrollHeight - bd.clientHeight, wantTop = bd.scrollTop > 0.5, wantBot = bd.scrollTop < over - 0.5;
      if ((root.dataset.ftop === '1') !== wantTop || (root.dataset.fbot === '1') !== wantBot) issues.push(`fades ${root.dataset.ftop}/${root.dataset.fbot} do not match the scroll state (top ${bd.scrollTop}, over ${over.toFixed(1)})`);
      if (/_end/.test(view) && over > 0.5 && bd.scrollTop < over - 0.5) issues.push('the _end render is not scrolled to the end'); }
    // scroll hint: shown exactly when the bottom edge hides content, centred in the clear strip under the fade, over no
    // legible text
    { const c = bd.getBoundingClientRect(), fb = c.bottom - TOK.strip;
      if ((root.dataset.fbot === '1') !== visible(q('.r-hint'))) issues.push(`scroll hint chevron ${visible(q('.r-hint')) ? 'shown without' : 'missing with'} content below`);
      const h = q('.r-hint');
      if (visible(h)) {
        const hb = h.getBoundingClientRect();
        if (hb.top < fb - 0.5 || hb.bottom > c.bottom + 0.5 || Math.abs((hb.left + hb.right) / 2 - (c.left + c.right) / 2) > 0.6) issues.push(`scroll hint not centred in the clear strip under the fade: y ${hb.top.toFixed(1)}..${hb.bottom.toFixed(1)} (strip ${fb.toFixed(1)}..${c.bottom.toFixed(1)})`);
        texts.filter((x) => x.sheet && !x.faded).forEach((x) => { if (inter(x.line, box(hb))) issues.push(`scroll hint over text: "${x.t}"`); });
      } }
    // the tabs: a tab list right to left in the brief's order, exactly the open one selected
    // (a sheet with one body and no tab row, such as a decision or a dialog: SCREEN.noTabs; it has no tab list at all)
    if (SCREEN.noTabs) { if (q('.r-tabs') || document.querySelectorAll('.r-tab').length) issues.push('a tab row on a sheet that has one body'); }
    else { const tl = q('.r-tabs'), tabs = qa('.r-tab');
      if (!tl || tl.getAttribute('role') !== 'tablist' || [...document.querySelectorAll('.r-tab')].some((e) => e.getAttribute('role') !== 'tab')) issues.push('a11y: the tabs are not a tab list');
      if (tabs.map((e) => e.dataset.for).join(',') !== SCREEN.tabs.join(',')) issues.push(`tabs must be ${SCREEN.tabs.join(', ')} in that order`);
      for (let k = 1; k < tabs.length; k++) if (!(tabs[k].getBoundingClientRect().right <= tabs[k - 1].getBoundingClientRect().left + 0.5)) issues.push(`tab ${k + 1} is not left of tab ${k}`);
      const ons = qa('.r-tab.on'); if (ons.length !== 1 || ons[0].dataset.for !== tab || ons[0].getAttribute('aria-selected') !== 'true' || qa('.r-tab[aria-selected="true"]').length !== 1) issues.push('exactly the open tab must be selected'); }
    // ---------- 8c. section identity: the open dock item, the top line, the emblem and the open tab, never data ----------
    { const on = qa('.dock-item.on'), drawn = (cs) => cs.content !== 'none' && cs.content !== 'normal' && cs.display !== 'none';
      // a sheet that belongs to no section (a decision, a dialog: DOCK null) marks no dock item
      if (visible(q('.dock')) && !DOCK) { if (on.length) issues.push('a dock item is marked open under a sheet of no section'); }
      else if (visible(q('.dock'))) {
        if (on.length !== 1 || on[0].textContent.trim() !== DOCK || on[0].getAttribute('aria-current') !== 'page') issues.push(`the open section «${DOCK}» is not marked in the dock`);
        else {
          const ul = getComputedStyle(on[0], '::after');
          if (getComputedStyle(on[0]).color !== TOK.sec || getComputedStyle(on[0].querySelector('svg')).color !== TOK.sec || getComputedStyle(on[0].querySelector('span')).color !== TOK.sec) issues.push(`dock item «${DOCK}» not in the section colour: ${getComputedStyle(on[0].querySelector('span')).color}`);
          if (!drawn(ul) || ul.backgroundColor !== TOK.sec || ul.width !== '16px' || ul.height !== '2px') issues.push(`dock underline missing or off: ${ul.content} ${ul.width}x${ul.height} ${ul.backgroundColor} (want 16 x 2 in the section colour)`);
        }
        [...document.querySelectorAll('.dock-item')].forEach((e, i) => {
          const ref = b3 && b3.dockLook && b3.dockLook[i]; if (!ref || e.classList.contains('on')) return;
          const s = e.querySelector('svg'), l = e.querySelector('span');
          if (getComputedStyle(l).color !== ref.label || getComputedStyle(s).color !== ref.icon || getComputedStyle(s).opacity !== ref.op) issues.push(`dock item ${i + 1} (closed) not neutral as on B3: ${getComputedStyle(l).color} / ${getComputedStyle(s).color}`);
        });
      }
      const inr = q('.r-in'), ln = getComputedStyle(inr, '::before');
      if (!drawn(ln) || ln.backgroundColor !== TOK.sec || ln.height !== '2px' || ln.top !== '0px') issues.push(`panel top line ${ln.content} ${ln.backgroundColor} ${ln.height} (want the section colour, 2 pt, at the top)`);
      else if (Math.abs(parseFloat(ln.width) - inr.clientWidth) > 0.5 || ln.left !== '0px') issues.push(`panel top line width ${ln.width} at ${ln.left} (want the panel's ${inr.clientWidth} pt)`);
      const em = q('.s-emb'); if (!em || !visible(em) || getComputedStyle(em).color !== TOK.sec || !em.querySelector('svg') || getComputedStyle(em.querySelector('svg')).color !== TOK.sec) issues.push('section emblem missing or not in the section colour');
      const tb = q('.r-tab.on');
      if (tb && (getComputedStyle(tb).color !== TOK.sec || !getComputedStyle(tb).boxShadow.includes(TOK.sec))) issues.push('open tab not in the section colour');
      if (tb && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(tb).backgroundColor)) issues.push('open tab without its fill');
      qa('.r-tab:not(.on)').forEach((e) => { if (getComputedStyle(e).color !== TOK.t2) issues.push(`closed tab not in the secondary grey: ${e.textContent.trim()} ${getComputedStyle(e).color}`); }); }
    // (المزيد's identity is the text grey itself, so for that section the rule cannot tell chrome from data and is skipped)
    if (TOK.sec !== TOK.t2) texts.filter((x) => x.sheet && !x.chrome && x.color === TOK.sec).forEach((x) => issues.push(`section colour on data text: "${x.t}"`));
    if (TOK.sec !== TOK.t2) qa('.sheet *').filter((e) => !e.closest('.r-tab.on, .s-emb, .frost')).forEach((e) => { const cs = getComputedStyle(e);
      const borders = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(cs['border' + s + 'Width']) > 0).map((s) => cs['border' + s + 'Color']);
      if (borders.concat([cs.backgroundColor, parseFloat(cs.outlineWidth) > 0 ? cs.outlineColor : '']).includes(TOK.sec) || cs.boxShadow.includes(TOK.sec) || (e.closest('svg') && [cs.color, cs.stroke, cs.fill].includes(TOK.sec))) issues.push(`section colour on data chrome: ${label(e)}`); });
    // the brief's sizes
    TOK.size.forEach(([s, w, h]) => qa('.sheet ' + s).forEach((e) => { const r = e.getBoundingClientRect(); if (hiddenByScroll(box(r), e)) return;
      if ((w && !near(r.width, w)) || (h && !near(r.height, h))) issues.push(`size ${r.width.toFixed(1)}x${r.height.toFixed(1)} for ${s} (want ${w || 'any'} x ${h || 'any'})`); }));
    // the white touches: white-outlined chips and the header chip, the chosen segment filled white
    { const wt = (sel, want, skip) => qa('.sheet ' + sel).filter((e) => !(skip && e.matches(skip))).forEach((e) => { const cs = getComputedStyle(e);
        Object.entries(want).forEach(([k, v]) => { if (cs[k] !== v) issues.push(`white touch off: ${sel} ${k} ${cs[k]} (want ${v})`); }); });
      wt('.r-chip', { borderTopColor: TOK.wLine, color: TOK.t1 }, '.e-bad, .p-bad');
      wt('.r-tile', { color: TOK.t1 });
      wt('.s-sg.on', { backgroundColor: TOK.t1, color: TOK.dark }, '[data-states="1"] .s-wait-1 *');
      wt('.r-cap', { borderTopColor: TOK.wLine, color: TOK.t1 }); }
    // ---------- 8d. words and numbers ----------
    const T = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
    const nums = (s) => [...String(s).replace(/−/g, '-').matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => parseFloat(m[0]));
    // the money rule over the text as shown: under 1 billion in millions, never 1000 millions or more
    { const all = q('.sheet').innerText.replace(/\s+/g, ' ');
      for (const m of all.matchAll(/(\d+(?:\.\d+)?) مليار/g)) if (parseFloat(m[1]) < 1) issues.push(`money unit: «${m[0]}» (under 1 billion is written in millions)`);
      for (const m of all.matchAll(/(\d+(?:\.\d+)?) (?:مليون|ملايين) \$/g)) if (parseFloat(m[1]) >= 1000) issues.push(`money unit: «${m[0]}» (1000 millions and more are billions)`); }
    // signs sit inside the left-to-right number spans, drawn left of their digits
    { const w3 = document.createTreeWalker(q('.sheet'), NodeFilter.SHOW_TEXT); let n3;
      while ((n3 = w3.nextNode())) { const s = n3.textContent; if (!visible(n3.parentElement)) continue;
        for (let i = 0; i < s.length; i++) { if (!/[+−]/.test(s[i])) continue;
          const nx = n3.nextSibling;
          if (!s.slice(i + 1).trim() && nx && nx.nodeType === 1 && nx.matches('.ltr') && /^\d/.test(nx.textContent)) { issues.push(`a sign outside its number: «${s.trim()}${nx.textContent}»`); continue; }
          if (!/\d/.test(s[i + 1] || '')) continue;
          if (!n3.parentElement.closest('.ltr')) issues.push(`a sign not in a left-to-right number: «${s.trim()}»`);
          const r1 = document.createRange(); r1.setStart(n3, i); r1.setEnd(n3, i + 1); const r2 = document.createRange(); r2.setStart(n3, i + 1); r2.setEnd(n3, i + 2);
          if (r1.getBoundingClientRect().right > r2.getBoundingClientRect().left + 0.5) issues.push(`a sign drawn right of its number: «${s.trim()}»`); } } }
    // colour never alone: amber, blue or red data text sits beside an arrow or an icon (or is a word that says it)
    qa('.sheet .r-body *').filter((e) => [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && [TOK.amber, TOK.blue, TOK.red].includes(getComputedStyle(e).color) && !e.closest('.r-btn, .r-why'))
      .forEach((e) => { const col = getComputedStyle(e).color, kpi = e.closest('.r-kpi');
        if (kpi && e.closest('.r-kv')) { const ic = kpi.querySelector('.r-kl svg'); if (!ic || getComputedStyle(ic).color !== col) issues.push(`colour alone: «${T(e)}» (its label's icon is not in its colour)`); return; }
        const host = (kpi && (e.closest('.r-kr') || e.closest('.r-kl'))) || e.closest('b, dd, p, .r-chip, .r-at, .p-warn, .s-word') || e;
        if (!host.querySelector('svg') && !host.closest('.s-word')) issues.push(`colour alone: «${T(e)}» has no arrow or icon`); });
    // «لماذا؟» names its subject: the headline it explains
    qa('.sheet .r-kpi').forEach((k) => { const w = k.querySelector('.r-why'), kl = T(k.querySelector('.r-kl'));
      if (w && !((w.getAttribute('aria-label') || '').startsWith('لماذا؟ ') && (w.getAttribute('aria-label') || '').includes(kl))) issues.push(`a11y: «لماذا؟» does not name its subject «${kl}»`); });
    // bars are data: teal, filling from the right (RTL)
    qa('.sheet .i-bar, .sheet .p-meter').forEach((b) => { const a = getComputedStyle(b, '::after');
      if (a.backgroundColor !== TOK.teal || a.right !== '0px') issues.push(`a bar not teal from the right: ${a.backgroundColor} right ${a.right}`); });
    qa('.sheet .n-pr i, .sheet .s-prog i').forEach((b) => { const cs = getComputedStyle(b); if (cs.backgroundColor !== TOK.teal || Math.abs(b.getBoundingClientRect().right - b.parentElement.getBoundingClientRect().right) > 0.6) issues.push('a progress bar not teal from the right'); });
    // VoiceOver: every action and link row reads whole, with the numbers it shows and «دولار», never «$»
    // (a count may be said in words, as Arabic does for one and two: «نقطة واحدة», «نقطتين»)
    const said = (al) => nums(al).map(Math.abs).concat(/(نقطة|تشكيل|سفينة|طائرة) واحدة?|واحدة\b/.test(al) ? [1] : [], /نقطتين|تشكيلين|اثنتين|اثنين/.test(al) ? [2] : []);
    qa('.sheet .r-act, .sheet .r-link').forEach((a) => { const al = a.getAttribute('aria-label') || '', at = a.querySelector('.r-at'), want = nums(at.innerText).concat(a.querySelector('.r-chip') ? nums(a.querySelector('.r-chip').innerText) : []);
      if (!al || want.some((x) => !said(al).includes(Math.abs(x)))) issues.push(`a11y: «${T(at && at.querySelector('b'))}» does not read its numbers`);
      if (al.includes('$')) issues.push(`a11y: «${T(at && at.querySelector('b'))}» reads «$» (say «دولار»)`);
      if (at && at.innerText.includes('$') && !al.includes('دولار')) issues.push(`a11y: «${T(at.querySelector('b'))}» does not say «دولار»`);
      const chip = a.querySelector('.r-chip'), use = chip && chip.querySelector('use');
      if (use && /#t-(up|down)/.test(use.getAttribute('href'))) { const up = use.getAttribute('href') === '#t-up', sg = nums(chip.innerText).slice(-1)[0];
        if (sg !== undefined && sg !== 0 && (sg > 0) !== up) issues.push(`«${T(at.querySelector('b'))}»: the chip's arrow does not agree with its sign`);
        if (!(up ? /ترفع|ترتفع|تزيد|يرفع|يزيد|يرتفع/ : /تخفض|تنخفض|تقل|يخفض|ينخفض|يقل/).test(al)) issues.push(`a11y: «${T(at.querySelector('b'))}» does not say the chip's direction in words`); } });
    // a row read as one element (role img, or a row button) reads everything it shows: every number and every word
    // of its visible text is in its label (the separator «·» aside)
    qa('.sheet [role="img"], .sheet .tap[role="button"], .sheet .r-act[aria-label]').filter((e) => e.innerText.trim() && !e.matches('.r-tab')).forEach((e) => { const al = (e.getAttribute('aria-label') || '').replace(/[،.:؛]/g, ' '), shown = e.innerText.replace(/[·،.:؛]/g, ' ');
      const words = shown.split(/\s+/).filter((w) => w.length > 1 && !/^[\d.%+−-]+$/.test(w)), missW = words.filter((w) => !al.includes(w.replace(/[«»]/g, '')));
      const missN = nums(shown).filter((x) => !said(al).includes(Math.abs(x)));
      if (missW.length || missN.length) issues.push(`a11y: «${(e.getAttribute('aria-label') || '').slice(0, 24)}» does not read all it shows: ${missW.concat(missN).slice(0, 4).join(' ')}`); });
    // a trend line's arrow agrees with its sign
    qa('.sheet .r-kr').forEach((k) => { const u = k.querySelector('use'), n = nums(k.innerText)[0]; if (u && n !== undefined && n !== 0 && /#t-(up|down)/.test(u.getAttribute('href')) && (u.getAttribute('href') === '#t-up') !== (n > 0)) issues.push(`the arrow of «${T(k)}» does not agree with its sign`); });
    // a VoiceOver label only on an element that can carry a name (a role, a control, a landmark): VoiceOver skips the
    // label of a plain element and reads its pieces instead
    qa('.sheet [aria-label]').filter((e) => !e.getAttribute('role') && !['BUTTON', 'SECTION', 'NAV', 'DL', 'A', 'IMG'].includes(e.tagName) && !e.classList.contains('tap'))
      .forEach((e) => issues.push(`a11y: a label VoiceOver may skip (no role): «${(e.getAttribute('aria-label') || '').slice(0, 30)}»`));
    // no image in the sheet but the flag and the header strip
    [...q('.sheet').querySelectorAll('*')].forEach((e) => {
      if (e.closest('.frost')) return;
      if (e.tagName === 'IMG' && !e.closest('.r-flag')) issues.push('an image in the sheet');
      if (/url\(/.test(getComputedStyle(e).backgroundImage) && !e.matches('.r-hd')) issues.push(`a background image in the sheet (${label(e)})`); });
    // RTL order: header flag | name ... emblem | close; action rows tile | text | chip; link rows tile | text | chevron
    { const fl = q('.r-flag').getBoundingClientRect(), nm = q('.r-name').getBoundingClientRect(), em = q('.s-emb').getBoundingClientRect(), xb = q('.r-x').getBoundingClientRect();
      if (!(fl.left >= nm.right - 0.5 && em.right <= nm.left && xb.right <= em.left + 0.5)) issues.push('header order must be flag, name, ..., emblem, close (right to left)'); }
    const order = (row, sels, what) => { const bx = sels.map((s) => row.querySelector(s)).filter(Boolean).map((e) => e.getBoundingClientRect());
      for (let k = 1; k < bx.length; k++) if (!(bx[k].right <= bx[k - 1].left + 0.5)) { issues.push(`${what}: order must be ${sels.join(', ')} (right to left)`); return; } };
    qa('.sheet .r-act').forEach((a, i) => order(a, ['.r-tile', '.r-at', '.r-chip'], `action row ${i + 1}`));
    qa('.sheet .r-link').forEach((a, i) => order(a, ['.r-tile', '.r-at', '.r-chev'], `link row ${i + 1}`));
    qa('.sheet .s-pol').forEach((a, i) => { order(a, ['.r-at', '.s-seg'], `setting ${i + 1}`);
      const sg = [...a.querySelectorAll('.s-sg')]; for (let k = 1; k < sg.length; k++) if (!(sg[k].getBoundingClientRect().right <= sg[k - 1].getBoundingClientRect().left + 0.5)) issues.push(`setting ${i + 1}: choices not right to left`);
      const on = sg.filter((e) => e.classList.contains('on')), ck = sg.filter((e) => e.getAttribute('aria-checked') === 'true');
      if (on.length !== 1 || ck.length !== 1) issues.push(`setting ${i + 1}: ${on.length} chosen segments (${ck.length} aria-checked), not one`);
      else if (on[0] !== ck[0]) issues.push(`setting ${i + 1}: the chosen segment is not the aria-checked one`); });
    { const f = q('.r-flag').getBoundingClientRect(); if (!near(f.width / f.height, 4 / 3, 0.01)) issues.push('flag is not 4:3'); }
    // ---------- 8e. the screen's own checks ----------
    try { new Function('X', SCREEN.src)({ issues, q, qa, visible, effOp, near, box, inter, label, clipOf, inFade, hiddenByScroll, texts, taps, prs, order, T, nums, root, TOK, BRIEF, view, tab, bd, DATA, sr }); }
    catch (e) { issues.push('screen checks failed to run: ' + e.message); }
    // ---------- 9. the brief's content: fully visible in this render ----------
    const leafs = (s) => { const cands = [...q('.sheet').querySelectorAll('*')].filter((e) => e.getClientRects().length && e.innerText && e.innerText.replace(/\s+/g, ' ').trim() === s);
      return cands.filter((e) => !cands.some((o) => o !== e && e.contains(o))); };
    const clearShown = (e) => { const r = box(e.getBoundingClientRect()), { c } = clipOf(e);
      return r.y0 >= c.y0 - 0.5 && r.y1 <= c.y1 + 0.5 && r.x0 >= c.x0 - 0.5 && r.x1 <= c.x1 + 0.5 && !inFade(r, e) && effOp(e) >= 0.99; };
    (BRIEF[view] || HEAD).forEach((s) => { const L = leafs(s); if (!L.length) issues.push(`brief text missing: ${s}`); else if (!L.some(clearShown)) issues.push(`brief text not fully visible: ${s}`); });
    // the tab's strings: each must fit between the fades, and the ones shown clear here are reported (each must be
    // shown clear in one of the tab's views: checked across the views)
    const reach = BRIEF['reach_' + view.replace(/_(end|at\d+)$/, '')] || [], clearNow = [];
    reach.forEach((s) => {
      const L = leafs(s); if (!L.length) { issues.push(`brief text missing: ${s}`); return; }
      const ok = L.some((e) => { const { scroller } = clipOf(e); return scroller ? e.getBoundingClientRect().height <= scroller.clientHeight - 2 * TOK.fade - TOK.strip + 0.5 && effOp(e) >= 0.99 : clearShown(e); });
      if (!ok) issues.push(`brief text cannot be scrolled clear of the fades: ${s}`);
      if (L.some(clearShown)) clearNow.push(s); });
    const all = q('.sheet').textContent.replace(/\s+/g, ' ');
    Object.values(BRIEF).flat().forEach((s) => { if (!all.includes(s)) issues.push(`brief text missing: ${s}`); });
    // ---------- 10. map: Egypt and the delta clear of every panel and hit box ----------
    const m = window.__map, mr = q('.map').getBoundingClientRect(), mk = mr.width / 1688;
    const live = (x0, y0, x1, y1) => ({ x0: mr.left + x0 * mk, y0: mr.top + y0 * mk, x1: mr.left + x1 * mk, y1: mr.top + y1 * mk });   // map-space box -> screen, as drawn now
    const cover = (rr, what) => {
      prs.forEach((pp) => { if (inter(rr, pp.r)) issues.push(`${what} covered by panel ${pp.l}`); });
      taps.forEach((t) => { if (inter(rr, t.hit)) issues.push(`${what} under the hit box of ${t.label}`); });
      if (rr.x0 < S - eps || rr.x1 > W - S + eps || rr.y0 < 0 || rr.y1 > H - B + eps) issues.push(`${what} outside the safe screen`);
    };
    cover(live(722, 428, 836, 492), 'Nile delta');      // the boxes placeMap keeps clear (index.html: DELTA and EG)
    cover(live(583, 424, 945, 732), 'Egypt');
    const me = q('.map').getBoundingClientRect();
    if (me.left > 0.5 || me.top > 0.5 || me.right < W - 0.5 || me.bottom < H - 0.5) issues.push('map not full-bleed');
    // map labels and city dots never cut by a panel edge (2 pt margin, halo included), squeezed against a panel, or
    // sliced by the screen edge or the side inset (the notch, the Dynamic Island)
    const hiddenLabels = [];
    document.querySelectorAll('.labels text, .labels circle').forEach((t) => {
      const what = t.tagName === 'text' ? `label ${t.textContent}` : `city dot ${t.getAttribute('data-city')}`;
      if (!t.getClientRects().length) { if (t.tagName === 'text') hiddenLabels.push(t.textContent); return; }
      if (t.tagName === 'circle' && !document.querySelector(`.labels text[data-city="${t.getAttribute('data-city')}"]`).getClientRects().length) issues.push(`map city dot shown without its name: ${t.getAttribute('data-city')}`);
      const r = t.getBoundingClientRect(), sw = parseFloat(t.getAttribute('stroke-width') || 0) / 2 * m.s;
      const b = { x0: r.left - sw - 2, y0: r.top - sw - 2, x1: r.right + sw + 2, y1: r.bottom + sw + 2 };
      if (r.right + sw <= 0 || r.left - sw >= W || r.bottom + sw <= 0 || r.top - sw >= H) return;      // off screen
      const under = prs.some((o) => r.left - sw >= o.r.x0 && r.right + sw <= o.r.x1 && r.top - sw >= o.r.y0 && r.bottom + sw <= o.r.y1);
      if (!under && prs.some((o) => inter(b, o.r))) issues.push(`map ${what} cut by a panel edge`);
      if (r.left - sw < Math.max(S, 0) || r.right + sw > W - Math.max(S, 0) || r.top - sw < 0 || r.bottom + sw > H) issues.push(`map ${what} sliced by the screen edge or the side inset`);
      prs.forEach((o) => { const sx0 = o.r.x0 < 70 ? 0 : o.r.x0, sx1 = W - o.r.x1 < 70 ? W : o.r.x1;
        if ((sx0 !== o.r.x0 || sx1 !== o.r.x1) && b.x1 > sx0 && b.x0 < sx1 && b.y1 > o.r.y0 && b.y0 < o.r.y1 && (r.left - sw < o.r.x0 || r.right + sw > o.r.x1)) issues.push(`map ${what} squeezed between a panel and the screen edge`); });
    });


      return { issues, typeSeen, texts, clearNow, fit: { top: window.__fit, sheet: fit, sheetPos: window.__sheetpos, body }, map: m, hiddenLabels,
        sheet: R(sr), hits: taps.map((t) => ({ l: t.label, x0: +t.hit.x0.toFixed(1), x1: +t.hit.x1.toFixed(1), y0: +t.hit.y0.toFixed(1), y1: +t.hit.y1.toFixed(1) })) };
    }, { d, TOK, BRIEF, HEAD, b3, view, HUDSEL_REST, DATA: cfg.DATA || {}, SCREEN: { src: cfg.screenChecks || '', tabs: TABS, fitTab: cfg.fitTab === false ? null : (cfg.fitTab || TABS[0]), noTabs: !!cfg.noTabs }, DOCK: cfg.dock || null });
  }

  async function contrast(p, texts) {
    await p.addStyleTag({ content: ':root body .hud, :root body .hud * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } :root body .hud svg, :root body .hud .flag, :root body .hud .r-flag, .dev { visibility: hidden !important; }' });
    await p.waitForTimeout(150);
    const buf = await p.screenshot({ scale: 'css' });
    return p.evaluate(async ({ b64, texts }) => {
      const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const g = c.getContext('2d'); g.drawImage(img, 0, 0);
      const k = img.width / innerWidth;
      const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
      const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
      const parse = (s) => s.match(/[\d.]+/g).map(Number);
      const parseA = (s) => { const v = parse(s); return v.length > 3 ? v : v.concat([1]); };
      return texts.filter((t) => !t.faded).map((t) => {
        const iy = t.r.h * 0.15;
        const x0 = Math.floor(t.r.x0 * k), y0 = Math.floor((t.r.y0 + iy) * k), w = Math.max(1, Math.ceil(t.r.w * k)), h = Math.max(1, Math.ceil((t.r.h - 2 * iy) * k));
        const d = g.getImageData(x0, y0, w, h).data;
        const [r, gg, b, a0] = parseA(t.color), a = a0 * (t.op == null ? 1 : t.op);       // the text is drawn at this alpha over each pixel
        const cr = (p, q2) => (Math.max(p, q2) + 0.05) / (Math.min(p, q2) + 0.05);
        let worst = Infinity;
        for (let i = 0; i < d.length; i += 4) {
          const lb = L(d[i], d[i + 1], d[i + 2]), lt = L(a * r + (1 - a) * d[i], a * gg + (1 - a) * d[i + 1], a * b + (1 - a) * d[i + 2]);
          worst = Math.min(worst, cr(lt, lb));
        }
        return { t: t.t.slice(0, 24), fs: t.fs, worst: +worst.toFixed(2) };
      });
    }, { b64: buf.toString('base64'), texts });
  }

  function midScrolls(h, over) {
    const out = [], band = h - TOK.fade - TOK.fade - TOK.strip;
    if (over <= 0.5 || band <= TOK.overlap) return out;
    let end = h - TOK.fade - TOK.strip;
    while (over + TOK.fade > end - TOK.overlap) {
      const s = Math.round(end - TOK.overlap - TOK.fade);
      if (s >= over) break;
      out.push(s); end = s + h - TOK.fade - TOK.strip;
    }
    return out;
  }
  // every view of a phone: the saved ones, then each sequence's end (if not saved) and middle offsets (checks only)
  async function viewsFor(ctx, d) {
    const out = VIEWS.map(([suffix, extra]) => ({ suffix, extra, png: true }));
    for (const tb of TABS) {
      const p = await open(ctx, PAGE + qs(d) + tabQ(tb)), bo = await p.evaluate(() => window.__body); await p.close();
      midScrolls(bo.shown, bo.over).forEach((s) => out.push({ suffix: '_' + tb + '_at' + s, extra: tabQ(tb) + '&scroll=' + s, png: false }));
    }
    return out;
  }
  function coverage(clearBy) {
    return TABS.map((tb) => (BRIEF['reach_' + tb] || []).filter((s) => !(clearBy[tb] && clearBy[tb].has(s))).map((s) => `${tb}: never shown clear of the fades in any view: ${s}`)).flat();
  }
  const addClear = (clearBy, view, list) => { if (/_states$/.test(view)) return; const k = seqOf(view); if (!BRIEF['reach_' + k]) return; (clearBy[k] = clearBy[k] || new Set()); list.forEach((s) => clearBy[k].add(s)); };
  async function check(p, d, b3, view) {
    const m = await measure(p, d, b3, view);
    const c = await contrast(p, m.texts);
    c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} for "${x.t}"`));
    return { m, c };
  }

  // the self-test: the generic plants (every panel) and the screen's own; the clean pages must have 0 issues, and the
  // coverage check must miss a string when the middle views are left out
  async function selftest(b) {
    const d = ALL.find((x) => x.id === 'i16promax'), se = ALL.find((x) => x.id === 'se');
    const ref = { i16promax: await b3Rects(b, d), se: await b3Rects(b, se) };
    const ctxs = {};
    for (const x of [d, se]) ctxs[x.id] = await b.newContext({ viewport: { width: x.w, height: x.h }, deviceScaleFactor: 1 });
    const long = cfg.longTab || TABS[1];
    const generic = [
      ['type size', d, '', '.r-name { font-size: 17px !important; }', /font size 17 for/],
      ['font weight', d, '', '.r-tab span { font-weight: 700 !important; }', /font weight 11\.5\/700/],
      ['off-token colour', d, '', '.r-name { color: #8899aa !important; }', /text colour off-token/],
      ['radius', d, '', '.sheet { border-radius: 6px !important; }', /radius 6 for \.sheet|panel radius/],
      ['tap in the side inset', d, '', '.sheet { right: -30px !important; }', /tap in side inset/],
      ['panel in the side inset', d, '', '.sheet { right: -30px !important; }', /panel in side inset/],
      ['panel not opaque', d, '', '.sheet > .frost::after { background: rgba(9, 17, 25, 0.66) !important; }', /panel not opaque/],
      ['see-through panel', d, '', '.sheet { opacity: .6 !important; }', /panel not opaque \(opacity 0\.60\)/],
      ['Egypt covered', d, '', ':root { --map-cx: 760px !important; }', /Egypt covered by panel/],
      ['sheet width', d, '', ':root { --sheet-w: 330px !important; }', /sheet width 330/],
      ['sheet top', d, '', '.sheet { top: 30px !important; }', /sheet top [\d.]+ \(want 8 pt under the top row/],
      ['dock hidden although it fits', d, '', '[data-dock="left"] .dock { display: none !important; }', /dock hidden although it fits/],
      ['dock shown on the SE', se, '', '[data-dock="hidden"] .dock { display: flex !important; }', /dock shown although it does not fit/],
      ['left stack moved', d, '', '.lstack { margin-left: 8px; }', /HUD element moved from its B3 position: \.toast/],
      ['fit not the loosest', d, '', '', /fit level 6 is not the loosest that fits/, () => { document.documentElement.dataset.rfit = '6'; }],
      ['two tab bodies', d, '', '.r-body[data-tab="' + TABS[1] + '"] { display: flex !important; }', /tab bodies shown/],
      ['two tabs selected', d, '', '', /exactly the open tab must be selected/, () => { document.querySelectorAll('.r-tab')[1].classList.add('on'); }],
      ['tabs not a tab list', d, '', '', /a11y: the tabs are not a tab list/, () => { document.querySelector('.r-tabs').removeAttribute('role'); }],
      ['tabs reversed', d, '', '.r-tabs { direction: ltr; }', /tab 2 is not left of tab 1/],
      ['fades wrong', d, tabQ(long), '', /fades .* do not match the scroll state/, () => { document.documentElement.dataset.fbot = '0'; }],
      ['hint chevron missing', d, tabQ(long), '.r-hint { display: none !important; }', /scroll hint chevron missing with content below/],
      ['hint over the content', d, tabQ(long), '.r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/],
      ['map label cut', d, '', '.labels .cut { display: inline !important; }', /map (label|city dot) .* (cut by a panel edge|sliced by the screen edge)/],
      ['contrast', d, '', '.r-body { background: rgb(234, 242, 247) !important; }', /^contrast [0-3](\.\d+)? for/],
      ['dock item not marked', d, '', '', new RegExp('the open section «' + cfg.dock + '» is not marked in the dock'), () => { document.querySelector('.dock-item.on').classList.remove('on'); }],
      ['identity line missing', d, '', '[data-sec] .r-in::before { content: none !important; }', /panel top line none/],
      ['emblem drawn grey', d, '', '.s-emb svg { color: var(--t2) !important; }', /section emblem missing or not in the section colour/],
      ['open tab neutral', d, '', '[data-sec] .r-tab.on { color: var(--t1) !important; }', /open tab not in the section colour/],
      ['section colour on data', d, '', '.r-sub { color: var(--sec) !important; }', /section colour on data text/],
      ['section colour on a rule', d, '', '.r-tabs { border-bottom-color: var(--sec) !important; }', /section colour on data chrome/],
      ['money unit', d, '', '', /money unit: «0\.4 مليار»/, () => { const b = [...document.querySelectorAll('.r-body')].find((e) => e.getClientRects().length); const s = document.createElement('p'); s.innerHTML = '<span class="ltr">0.4</span> مليار $'; s.className = 's-note'; b.prepend(s); }],
      ['sign outside its number', d, '', '', /a sign outside its number/, () => { const b = [...document.querySelectorAll('.r-body')].find((e) => e.getClientRects().length); const s = document.createElement('p'); s.className = 's-note'; s.innerHTML = 'تغير +<span class="ltr">3</span>'; b.prepend(s); }],
      ['colour alone', d, '', '', /colour alone: «تراجع»/, () => { const b = [...document.querySelectorAll('.r-body')].find((e) => e.getClientRects().length); const s = document.createElement('p'); s.className = 's-note r-amber'; s.textContent = 'تراجع'; b.prepend(s); }],
      ['an image in the sheet', d, '', '', /an image in the sheet/, () => { const i = document.createElement('img'); i.src = '../../shared/flags/eg.svg'; i.style.cssText = 'width:17px;height:17px'; [...document.querySelectorAll('.r-body')].find((e) => e.getClientRects().length).prepend(i); }],
      ['close not round', d, '', '.r-x { width: 40px !important; }', /close button is not round/],
      ['label without a role', d, '', '', /a11y: a label VoiceOver may skip/, () => { const b = [...document.querySelectorAll('.r-body')].find((e) => e.getClientRects().length); const s = document.createElement('div'); s.className = 's-note'; s.setAttribute('aria-label', 'اختبار'); s.textContent = 'اختبار'; b.prepend(s); }],
      ['brief text hidden', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-kv b').style.opacity = '0'; }],
      ['overview scrolls', se, tabQ(cfg.fitTab || TABS[0]), '.r-body > :first-child { margin-top: 400px !important; }', new RegExp((cfg.fitTab || TABS[0]) + ' needs scrolling')],
      ['18 pt misuse', d, '', '.r-kr { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
      ['control height', d, '', '.r-tab { height: 40px !important; }', /control height 40.00 for \.r-tab/],
      ['gap', d, '', '.r-kpi { display: flex !important; gap: 6px !important; }', /gap 6 on/],
      ['icon size', d, '', '.r-tab svg.i { width: 19px !important; height: 19px !important; }', /icon size 19x19/],
      ['text overlap', d, '', '.r-sub { transform: translateY(-14px) !important; }', /text overlap|icon over text/],
      ['text into a control', d, '', '.r-body .r-act .r-chip { transform: translateX(100px) !important; }', /text over a control|text overlap/],
      ['clipped text', d, '', '.r-kpis { margin-inline-start: -40px !important; }', /clipped text \(sides\)/],
      ['dock underline missing', d, '', '.dock-item.on::after { content: none !important; }', /dock underline missing/],
      ['closed dock item coloured', d, '', '.dock-item:not(.on) span { color: var(--sec) !important; }', /dock item \d \(closed\) not neutral/],
      ['identity line colour', d, '', '[data-sec] .r-in::before { background: var(--teal) !important; }', /panel top line/],
      ['closed tabs like the open one', d, '', '[data-sec] .r-tab { color: var(--t1) !important; }', /closed tab not in the secondary grey/],
      ['emblem size', d, '', '.s-emb { width: 28px !important; }', /size 28.0x32.0 for \.s-emb/],
      ['chip not white', d, '', '.r-chip { border-color: var(--teal) !important; color: var(--teal) !important; }', /white touch off: \.r-chip/],
      ['tile icons cyan', d, '', '[data-sec] .r-tile { color: rgb(127, 233, 255) !important; }', /white touch off: \.r-tile/],
      ['faint text', d, '', '.r-kr { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
      ['why without its subject', d, '', '', /a11y: «لماذا؟» does not name its subject/, () => { document.querySelectorAll('.r-why')[1].removeAttribute('aria-label'); }],
      ['amber value without its icon', d, '', '', /colour alone: .* \(its label's icon is not in its colour\)/, () => { const b = document.querySelector('.r-kv b'); b.classList.add('r-amber'); }],
      ['chip arrow against its sign', d, '', '', /the chip's arrow does not agree with its sign|does not say the chip's direction/, () => { const u = document.querySelector('.r-act .r-chip use'); if (u) u.setAttribute('href', u.getAttribute('href') === '#t-up' ? '#t-down' : '#t-up'); }],
      ['row read in part', d, '', '', /does not read all it shows/, () => { const r = [...document.querySelectorAll('.sheet [role="img"], .sheet .tap[role="button"]:not(.r-tab), .sheet .r-act[aria-label]')].find((e) => e.getClientRects().length && e.innerText.trim()); r.setAttribute('aria-label', 'جزء'); }],
      ['% before its number', d, '', '', /% shown before its number/, () => { document.querySelector('.r-kr').textContent = 'نسبة 20%'; }],
    ];
    // a panel whose first tab has no headline numbers or status table (المزيد) leaves out the plants aimed at them and
    // brings its own
    // a sheet with no tab row and no section (a decision, a dialog) leaves out the plants aimed at them and gets the same
    // defects planted on its own elements
    const noTab = cfg.noTabs ? ['font weight', 'two tab bodies', 'two tabs selected', 'tabs not a tab list', 'tabs reversed', 'fades wrong', 'hint chevron missing', 'hint over the content', 'control height', 'icon size', 'open tab neutral', 'closed tabs like the open one', 'section colour on a rule'] : [];
    const noDock = (cfg.dock ? [] : ['dock item not marked', 'dock underline missing', 'closed dock item coloured']).concat(cfg.fitTab === false ? ['overview scrolls', 'fit not the loosest'] : []);   // (fitTab false: no body must fit whole)
    const alt = [].concat(cfg.noTabs ? [
      ['font weight (no tabs)', d, '', '.r-sub { font-weight: 700 !important; }', /font weight 11\.5\/700/],
      ['a tab row on a one-body sheet', d, '', '', /a tab row on a sheet that has one body/, () => { const n = document.createElement('nav'); n.className = 'r-tabs'; n.setAttribute('role', 'tablist'); document.querySelector('.r-in').insertBefore(n, document.querySelector('.r-body')); }],
      ['control height (no tabs)', d, '', '.r-x { height: 40px !important; }', /control height 40.00 for \.r-x/],
      ['icon size (no tabs)', d, '', '.r-x svg.i { width: 19px !important; height: 19px !important; }', /icon size 19x19/],
      ['fades wrong (no tabs)', se, '', '', /fades .* do not match the scroll state/, () => { document.documentElement.dataset.fbot = document.documentElement.dataset.fbot === '1' ? '0' : '1'; }],
    ] : [], cfg.dock ? [] : [
      ['a dock item marked open', d, '', '', /a dock item is marked open under a sheet of no section/, () => { const e = document.querySelectorAll('.dock-item')[1]; e.classList.add('on'); }],
    ]);
    const cases = generic.filter((c) => !(cfg.skipGeneric || []).concat(noTab, noDock).includes(c[0])).concat(alt, cfg.cases ? cfg.cases(d, se) : []);
    const results = [];
    for (const [name, x, extra, css, re, js] of cases) {
      const p = await open(ctxs[x.id], PAGE + qs(x) + extra);
      if (css) await p.addStyleTag({ content: css });
      if (js) await p.evaluate(js);
      await p.waitForTimeout(80);
      const { m } = await check(p, x, ref[x.id], viewOf(extra));
      const ok = m.issues.some((i) => re.test(i));
      results.push({ name, ok, sample: m.issues.slice(0, 3) });
      console.log(`${ok ? 'caught ' : 'MISSED '} ${name}${ok ? '' : '  -> ' + m.issues.slice(0, 4).join(' || ')}`);
      await p.close();
    }
    const clean = {};
    for (const x of [d, se]) {
      const clearBy = {}, skipMid = {};
      for (const v of await viewsFor(ctxs[x.id], x)) {
        const p0 = await open(ctxs[x.id], PAGE + qs(x) + v.extra), view = viewOf(v.extra);
        const { m } = await check(p0, x, ref[x.id], view);
        clean[x.id + v.suffix] = m.issues;
        addClear(clearBy, view, m.clearNow);
        if (!/_at\d+$/.test(view)) addClear(skipMid, view, m.clearNow);
        console.log(`clean page ${x.id}${v.suffix}: ${m.issues.length} issues${m.issues.length ? ' -> ' + m.issues.slice(0, 4).join(' || ') : ''}`);
        await p0.close();
      }
      clean[x.id + ' coverage'] = coverage(clearBy);
      console.log(`clean coverage ${x.id}: ${clean[x.id + ' coverage'].length} issues ${clean[x.id + ' coverage'].slice(0, 3).join(' || ')}`);
      if (x === se) {
        // the coverage check must report a brief string no view shows (a planted one); what the middle views add is kept
        // in the record (on short panels the top and end views already show everything)
        const k0 = 'reach_' + TABS[0], had = BRIEF[k0], probe = 'نص غير معروض للاختبار';
        BRIEF[k0] = (had || []).concat([probe]); const miss = coverage(clearBy); if (had) BRIEF[k0] = had; else delete BRIEF[k0];
        const ok = miss.some((m) => m.includes(probe));
        results.push({ name: 'coverage reports a string no view shows', ok, sample: miss.slice(0, 3), midViewsAdd: coverage(skipMid).slice(0, 3) });
        console.log(`${ok ? 'caught ' : 'MISSED '} coverage reports a string no view shows`);
      }
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
      const ctx1 = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 });
      const entry = { device: `${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`, renderedAt: new Date().toISOString(), inputs: { files: INPUTS, sha1: inputsHash() },
        issues: [], views: {}, pngs: [], pngSha1: {}, env: { chromium: b.version() } };
      const clearBy = {};
      for (const { suffix, extra, png: save } of await viewsFor(ctx1, d)) {
        const view = viewOf(extra), p = await open(ctx, PAGE + qs(d) + extra);
        if (save) {
          const png = suffix ? path.join(OUT, '_build', d.id + suffix + '.png') : path.join(OUT, d.id + '.png');
          await p.screenshot({ path: png });
          entry.pngs.push(path.relative(OUT, png));
          entry.pngSha1[path.relative(OUT, png)] = crypto.createHash('sha1').update(fs.readFileSync(png)).digest('hex');
        }
        if (!suffix) { const hp = path.join(OUT, '_build', d.id + '_hit.png'), ph = await open(ctx, PAGE + qs(d) + '&hit=1'); await ph.screenshot({ path: hp }); await ph.close();
          entry.pngSha1[path.relative(OUT, hp)] = crypto.createHash('sha1').update(fs.readFileSync(hp)).digest('hex'); }
        const { m, c } = await check(p, d, b3, view);
        addClear(clearBy, view, m.clearNow);
        m.issues.forEach((i) => entry.issues.push(`${view}: ${i}`));
        entry.views[view] = { issueCount: m.issues.length, png: save, fit: m.fit, sheet: m.sheet, map: { ok: m.map.ok, egyptClear: m.map.egyptClear, zoom: m.map.zoom }, hiddenLabels: m.hiddenLabels,
          typeSeen: m.typeSeen, hits: m.hits, minContrast: Math.min(...c.map((x) => x.worst)), contrast: c };
        console.log(`== ${d.id} ${view}${save ? '' : ' (checks only)'} fit ${JSON.stringify(m.fit.sheet)} dock ${m.fit.sheetPos.dock} body ${JSON.stringify(m.fit.body)} minContrast ${entry.views[view].minContrast}`);
        console.log(m.issues.length ? '  ISSUES:\n    ' + m.issues.join('\n    ') : '  no issues');
        await p.close();
      }
      const cov = coverage(clearBy);
      cov.forEach((i) => entry.issues.push(`coverage: ${i}`));
      entry.views.coverage = { issueCount: cov.length, sequences: Object.fromEntries(Object.entries(clearBy).map(([k, v]) => [k, v.size])) };
      console.log(`== ${d.id} coverage: ${cov.length ? cov.join(' || ') : 'every brief string shown clear in some view'}`);
      await ctx1.close();
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
};
