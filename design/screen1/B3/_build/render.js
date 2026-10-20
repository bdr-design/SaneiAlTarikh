// Render B3 on every device (+ the open speed menu on the 17 Pro Max) and run the checks:
// slim-token audit, 44 pt hit boxes, safe areas, overlaps, Egypt clearance, text contrast.
// Usage: NODE_PATH=.../tools/node_modules node render.js [ids...]   |   node render.js --selftest
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const DEVICES = JSON.parse(fs.readFileSync(path.join(__dirname, 'devices.json'), 'utf8'));

// The uniform slim system. Anything that differs is reported as OFF-TOKEN.
const TOK = {
  row: 36, ctl: 32, dock: 44, top: 8,
  rBar: 12, rCtl: 10,
  padBar: 12, padCtl: 10,
  space: [0, 4, 8, 12], stackGap: 8, rowToStack: 12,
  type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700] },
  icon: { ctl: 16, stat: 14, dock: 17, glyph: 10 }, stroke: 1.75,
  border: 'rgba(127, 233, 255, 0.14)', glass: 'rgba(9, 17, 25, 0.66)',
};

async function measure(p, d, menu) {
  return p.evaluate(({ d, TOK, menu }) => {
    const R = (r) => ({ x0: +r.left.toFixed(2), y0: +r.top.toFixed(2), x1: +r.right.toFixed(2), y1: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    const issues = [];
    const W = d.w, H = d.h, S = d.side, B = d.bottom;
    const eps = 0.01, near = (a, b) => Math.abs(a - b) < 0.05;
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const name = (e) => (e.getAttribute('aria-label') || e.className.baseVal || e.className || e.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 28);

    // ---------- 1. token audit ----------
    const audit = [];
    const off = (what, el, got, want) => { const m = `OFF-TOKEN ${what}: ${el} = ${got} (want ${want})`; issues.push(m); };
    const row = (cls, el, want) => {
      const r = el.getBoundingClientRect(), cs = getComputedStyle(el);
      const rad = parseFloat(cs.borderTopLeftRadius), radR = parseFloat(cs.borderTopRightRadius);
      const a = { cls, h: +r.height.toFixed(2), top: +r.top.toFixed(2), r: Math.max(rad, radR), padL: parseFloat(cs.paddingLeft), padR: parseFloat(cs.paddingRight) };
      if (want.h != null && !near(a.h, want.h)) off('height', cls, a.h, want.h);
      if (want.top != null && !near(a.top, want.top)) off('top offset', cls, a.top, want.top);
      if (want.r != null && !near(a.r, want.r)) off('radius', cls, a.r, want.r);
      if (want.glass) {
        if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== TOK.border) off('border', cls, `${cs.borderTopWidth} ${cs.borderTopColor}`, `1px ${TOK.border}`);
        const g = getComputedStyle(el).getPropertyValue('--glass').trim();
        const tint = el.querySelector(':scope > .frost') ? getComputedStyle(el.querySelector(':scope > .frost'), '::after').backgroundColor : cs.backgroundColor;
        if (tint !== TOK.glass) off('glass', cls, tint, TOK.glass);
      }
      audit.push(a);
      return a;
    };
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(visible);

    // top row: 36 pt, y = 8, radius 12, bars padded 12
    ['.nation', '.stats', '.date'].forEach((s) => row(s, q(s), { h: TOK.row, top: TOK.top, r: TOK.rBar, glass: true }));
    const nat = audit.find((a) => a.cls === '.nation');
    if (!near(nat.padL, TOK.padBar) || !near(nat.padR, TOK.padBar)) off('padding', '.nation', `${nat.padL}/${nat.padR}`, TOK.padBar);
    if (!near(parseFloat(getComputedStyle(q('.date')).paddingRight), TOK.padBar)) off('padding-start', '.date', getComputedStyle(q('.date')).paddingRight, TOK.padBar);
    // indicator strip: 12 pt from the strip edge to the first/last content, 8 pt between indicators
    {
      const st = q('.stats').getBoundingClientRect(), ins = qa('.stat-in').map((e) => e.getBoundingClientRect());
      const stats = qa('.stat').map((e) => e.getBoundingClientRect());
      const endR = st.right - 1 - stats[0].right + parseFloat(getComputedStyle(q('.stat')).paddingRight);
      const endL = stats[stats.length - 1].left - st.left - 1 + parseFloat(getComputedStyle(q('.stat')).paddingLeft);
      if (!near(endR, TOK.padBar) || !near(endL, TOK.padBar)) off('strip end padding', '.stats', `${endR.toFixed(1)}/${endL.toFixed(1)}`, TOK.padBar);
      for (let i = 1; i < stats.length; i++) {
        const g = stats[i - 1].left - stats[i].right; // touching boxes
        if (g > 0.05) off('indicator spacing', '.stat', g.toFixed(2), 0);
      }
      audit.push({ cls: '.stat (each)', h: +stats[0].height.toFixed(2), pad: getComputedStyle(q('.stat')).paddingLeft });
    }
    // speed control inside the pill: 32 pt, radius 10, 2 pt inside the pill
    {
      const c = row('.cap', q('.cap'), { h: TOK.ctl, r: TOK.rCtl });
      const pr = q('.date').getBoundingClientRect(), cr = q('.cap').getBoundingClientRect();
      if (!near(cr.top - pr.top, 2) || !near(pr.bottom - cr.bottom, 2) || !near(cr.left - pr.left, 2)) off('capsule inset', '.cap', `${(cr.top - pr.top).toFixed(1)}/${(pr.bottom - cr.bottom).toFixed(1)}/${(cr.left - pr.left).toFixed(1)}`, 2);
      ['.play', '.spd'].forEach((s) => row(s, q(s), { h: TOK.ctl }));
    }
    // left stack: 32 pt controls, radius 10, padding 10, 8 pt apart, 12 pt under the top row
    const stack = qa('.lstack > *');
    stack.forEach((e) => row('.' + [...e.classList].filter((c) => !['glass', 'ctl', 'tap'].includes(c)).join('.'), e, { h: TOK.ctl, r: TOK.rCtl, glass: true }));
    ['.alert-prev', '.btn.mode', '.btn.home'].forEach((s) => {
      const cs = getComputedStyle(q(s));
      if (!near(parseFloat(cs.paddingLeft), TOK.padCtl) || !near(parseFloat(cs.paddingRight), TOK.padCtl)) off('padding', s, `${cs.paddingLeft}/${cs.paddingRight}`, TOK.padCtl);
    });
    for (let i = 1; i < stack.length; i++) {
      const g = stack[i].getBoundingClientRect().top - stack[i - 1].getBoundingClientRect().bottom;
      if (!near(g, TOK.stackGap)) off('stack gap', `#${i}`, g.toFixed(2), TOK.stackGap);
    }
    {
      const g = stack[0].getBoundingClientRect().top - q('.top').getBoundingClientRect().bottom;
      if (!near(g, TOK.rowToStack)) off('top row -> stack gap', '.toast', g.toFixed(2), TOK.rowToStack);
    }
    // top row gaps: at least 8 (the strip is centred, so one side may be wider)
    {
      const n = q('.nation').getBoundingClientRect(), s = q('.stats').getBoundingClientRect(), t = q('.date').getBoundingClientRect();
      const g1 = n.left - s.right, g2 = s.left - t.right;
      if (g1 < TOK.space[2] - 0.05 || g2 < TOK.space[2] - 0.05) off('top row gap', '.top', `${g1.toFixed(1)}/${g2.toFixed(1)}`, '>= 8');
      audit.push({ cls: 'top gaps', g1: +g1.toFixed(1), g2: +g2.toFixed(1) });
    }
    // dock: 44 pt, radius 12, 12 pt from the inner border edge to the outer label (as the other bars)
    row('.dock', q('.dock'), { h: TOK.dock, r: TOK.rBar, glass: true });
    {
      const dk = q('.dock').getBoundingClientRect();
      const ink = qa('.dock-item').map((e) => { const a = e.querySelector('span').getBoundingClientRect(), b = e.querySelector('svg').getBoundingClientRect(); return { l: Math.min(a.left, b.left), r: Math.max(a.right, b.right) }; });
      const padR = dk.right - 1 - Math.max(...ink.map((i) => i.r)), padL = Math.min(...ink.map((i) => i.l)) - dk.left - 1;
      if (!near(padR, TOK.padBar) || !near(padL, TOK.padBar)) off('dock end padding (to the label)', '.dock', `${padR.toFixed(1)}/${padL.toFixed(1)}`, TOK.padBar);
      audit.push({ cls: 'dock end pad', g1: +padR.toFixed(1), g2: +padL.toFixed(1) });
    }
    // nation card: every fit level that shows text keeps the content the brief requires
    {
      const lv = window.__fit.level, seen = (s) => { const e = q(s); return !!e && visible(e) && getComputedStyle(e).display !== 'none'; };
      const want = lv <= 1 ? ['.nm', '.ldr', '.rg'] : lv === 2 ? ['.nm'] : [];
      want.forEach((s) => { if (!seen(s)) issues.push(`nation card fit ${lv}: ${s} not shown`); });
      if (lv <= 1) { const n = q('.ntext').getBoundingClientRect(); if (n.height > TOK.row - 2) issues.push(`nation text ${n.height} pt tall does not fit the 36 pt card`); }
    }
    // menu
    if (menu) {
      row('.menu', q('.menu'), { r: TOK.rBar, glass: true });
      qa('.mrow').forEach((e, i) => {
        row('.mrow' + i, e, { h: TOK.ctl, r: TOK.rCtl });
        const cs = getComputedStyle(e);
        if (!near(parseFloat(cs.paddingLeft), TOK.padCtl) || !near(parseFloat(cs.paddingRight), TOK.padCtl)) off('padding', '.mrow' + i, `${cs.paddingLeft}/${cs.paddingRight}`, TOK.padCtl);
      });
      const pr = q('.date').getBoundingClientRect(), mr = q('.menu').getBoundingClientRect();
      if (!near(mr.top - pr.bottom, TOK.space[2])) off('menu offset under pill', '.menu', (mr.top - pr.bottom).toFixed(2), 8);
      if (!near(mr.left, pr.left)) off('menu alignment', '.menu', `${mr.left.toFixed(1)} vs pill ${pr.left.toFixed(1)}`, 'same left edge');
      const on = qa('.mrow.on');
      if (on.length !== 1 || on[0].textContent.trim() !== '1×' || getComputedStyle(on[0].querySelector('.chk')).visibility !== 'visible') issues.push('menu: 1× must be the only checked row');
      // the إيقاف | speeds separator must survive frost() (it inserts a .frost first child into every panel)
      const stop = q('.mrow.stop');
      if (!stop || stop.textContent.trim() !== 'إيقاف' || getComputedStyle(stop, '::after').content === 'none') issues.push('menu: separator under إيقاف is not rendered');
    }
    // flex gaps everywhere in the HUD are on the spacing scale
    document.querySelectorAll('.hud *').forEach((e) => {
      if (!visible(e) || e.closest('.frost')) return;
      const cs = getComputedStyle(e);
      if (!/flex|grid/.test(cs.display)) return;
      [cs.columnGap, cs.rowGap].forEach((g) => {
        const v = g === 'normal' ? 0 : parseFloat(g);
        if (!TOK.space.some((s) => near(s, v))) off('gap', name(e), v, TOK.space.join('/'));
      });
    });
    // icons: 16 (controls), 14 (indicators), 17 (dock), 10 (trend glyphs); stroke 1.75
    const icons = { ctl: new Set(), stat: new Set(), dock: new Set(), glyph: new Set() };
    document.querySelectorAll('.hud svg').forEach((s) => {
      if (!s.getClientRects().length) return;
      const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      const kind = s.classList.contains('trend') ? 'glyph' : s.closest('.stat') ? 'stat' : s.closest('.dock') ? 'dock' : 'ctl';
      const want = TOK.icon[kind];
      icons[kind].add(`${r.width}x${r.height}`);
      if (!near(r.width, want) || !near(r.height, want)) off('icon size', `${kind} ${s.querySelector('use') ? s.querySelector('use').getAttribute('href') : ''}`, `${r.width}x${r.height}`, want);
      if (!near(parseFloat(cs.strokeWidth), TOK.stroke)) off('stroke', s.querySelector('use').getAttribute('href'), cs.strokeWidth, TOK.stroke);
    });
    // type: only 10 / 11.5 / 13 semibold tabular / 14 bold
    const typeSeen = {};
    const walker = document.createTreeWalker(document.querySelector('.hud'), NodeFilter.SHOW_TEXT);
    let tn;
    const texts = [];
    while ((tn = walker.nextNode())) {
      if (!tn.textContent.trim()) continue;
      const el = tn.parentElement, cs = getComputedStyle(el);
      const range = document.createRange(); range.selectNodeContents(tn);
      const rr = [...range.getClientRects()].filter((r) => r.width > 0);
      if (!rr.length || cs.visibility === 'hidden') continue;
      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight, t = tn.textContent.trim();
      typeSeen[`${fs}/${fw}`] = (typeSeen[`${fs}/${fw}`] || 0) + 1;
      if (!(fs in TOK.type)) off('font size', t, fs, Object.keys(TOK.type).join('/'));
      else if (!TOK.type[fs].includes(fw)) off('font weight', t, `${fs}/${fw}`, `${fs}/${TOK.type[fs].join('|')}`);
      if (fs === 13 && !/tabular-nums/.test(cs.fontVariantNumeric)) off('tabular nums', t, cs.fontVariantNumeric, 'tabular-nums');
      const underMenu = menu && !el.closest('.menu') && (() => { const m = document.querySelector('.menu').getBoundingClientRect(); return rr.some((r) => !(r.right <= m.left || r.left >= m.right || r.bottom <= m.top || r.top >= m.bottom)); })();
      rr.forEach((r) => {
        if (!underMenu) texts.push({ t, fs, color: cs.color, r: R(r) });
        if (r.left < S - eps || r.right > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (r.bottom > H - B + eps) issues.push(`text in bottom inset: ${t}`);
      });
    }

    // ---------- 2. hit boxes: 44 x 44, inside the safe area, never overlapping ----------
    // the hit box is the real ::before box (its resolved left/top/size plus the translate), so calc()
    // offsets such as the dock end items' --hx are measured, not re-derived
    const taps = [...document.querySelectorAll('.tap')].filter(visible).map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const hw = parseFloat(ps.width), hh = parseFloat(ps.height);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e;
      const y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      return { e, menu: !!e.closest('.menu'), label: (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), vis: R(r), hit: { x0, x1: x0 + hw, y0, y1: y0 + hh } };
    });
    taps.forEach((t) => {
      const h = t.hit, v = t.vis;
      if (h.x1 - h.x0 < 44 - eps || h.y1 - h.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      const lu = 1 / 32; // measured ::before boxes carry Chromium's 1/64 pt layout-unit rounding
      if (h.x0 > v.x0 + lu || h.x1 < v.x1 - lu || h.y0 > v.y0 + lu || h.y1 < v.y1 - lu) issues.push(`hit box does not cover the control: ${t.label}`);
      if (h.x0 < S - eps || h.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label} x ${h.x0.toFixed(1)}..${h.x1.toFixed(1)}`);
      if (h.y1 > H - B + eps || h.y0 < -eps) issues.push(`tap in bottom inset/off top: ${t.label} y ${h.y0.toFixed(1)}..${h.y1.toFixed(1)}`);
    });
    const mr = menu ? q('.menu').getBoundingClientRect() : null;
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) {
      const A = taps[i], Bt = taps[j];
      // with the menu open, controls under the menu panel are covered by it (a tap there hits the menu)
      if (menu && A.menu !== Bt.menu) {
        const other = A.menu ? Bt : A;
        const o = other.vis;
        if (!(o.x1 <= mr.left || o.x0 >= mr.right || o.y1 <= mr.top || o.y0 >= mr.bottom)) continue;
      }
      const a = A.hit, b = Bt.hit;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 0.05 && oy > 0.05) issues.push(`hit overlap ${A.label} / ${Bt.label} (${ox.toFixed(1)}x${oy.toFixed(1)})`);
    }

    // ---------- 3. overflow, panel overlaps, Egypt ----------
    document.querySelectorAll('.hud .glass, .hud .glass *').forEach((e) => {
      if (e.closest('.frost') || !visible(e)) return;
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') issues.push(`overflow: ${name(e)}`);
    });
    const top = q('.top');
    const fit = window.__fit;
    if (fit.need > fit.avail + 0.01) issues.push(`top row does not fit: needs ${fit.need.toFixed(1)} > ${fit.avail}`);
    const panels = [...document.querySelectorAll('.hud .glass')].filter(visible).map((e) => ({ c: name(e).replace(/glass|bar|ctl|tap/g, '').trim(), menu: e.classList.contains('menu'), r: e.getBoundingClientRect() }));
    for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) {
      if (panels[i].menu || panels[j].menu) continue;     // the popover is meant to sit over the stack
      const a = panels[i].r, b = panels[j].r;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) issues.push(`panel overlap ${panels[i].c} / ${panels[j].c}`);
    }
    if (menu) {
      const dk = q('.dock').getBoundingClientRect();
      if (!(mr.right <= dk.left || mr.left >= dk.right || mr.bottom <= dk.top)) issues.push('menu overlaps the dock');
      if (mr.bottom > H - B) issues.push('menu reaches the home indicator');
    }
    const m = window.__map;
    if (!m.ok) issues.push('map: no Egypt position found that is clear of the HUD');
    const eg = m.egypt;
    if (eg.x0 < S || eg.x1 > W - S || eg.y0 < 0 || eg.y1 > H - B) issues.push('Egypt outside the safe screen');
    panels.forEach((p) => { const r = p.r; if (!(eg.x1 <= r.left || eg.x0 >= r.right || eg.y1 <= r.top || eg.y0 >= r.bottom)) issues.push(`Egypt covered by ${p.c}`); });
    taps.forEach((t) => { const r = t.hit; if (!(eg.x1 <= r.x0 || eg.x0 >= r.x1 || eg.y1 <= r.y0 || eg.y0 >= r.y1)) issues.push(`Egypt under the hit box of ${t.label}`); });
    const mapEl = q('.map').getBoundingClientRect();
    if (mapEl.left > 0.5 || mapEl.top > 0.5 || mapEl.right < W - 0.5 || mapEl.bottom < H - 0.5) issues.push('map not full-bleed');

    // HUD coverage (share of the screen under glass)
    const cov = (() => { const k = 2, cols = Math.ceil(W / k), rows = Math.ceil(H / k); let n = 0; const rs = panels.filter((p) => !p.menu).map((p) => p.r);
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) { const px = x * k + 1, py = y * k + 1; if (rs.some((r) => px >= r.left && px < r.right && py >= r.top && py < r.bottom)) n++; } return n / (rows * cols); })();

    const sizes = {};
    sizes.fit = fit; sizes.nation = R(q('.nation').getBoundingClientRect()); sizes.stats = R(q('.stats').getBoundingClientRect()); sizes.date = R(q('.date').getBoundingClientRect());
    sizes.stack = stack.map((e) => R(e.getBoundingClientRect())); sizes.dock = R(q('.dock').getBoundingClientRect());
    if (menu) sizes.menu = R(mr);
    return { issues, audit, typeSeen, icons: Object.fromEntries(Object.entries(icons).map(([k, v]) => [k, [...v]])), sizes, map: m, texts, coverage: +cov.toFixed(3),
      hits: taps.map((t) => ({ l: t.label, y0: +t.hit.y0.toFixed(1), y1: +t.hit.y1.toFixed(1), x0: +t.hit.x0.toFixed(1), x1: +t.hit.x1.toFixed(1) })) };
  }, { d, TOK, menu });
}

async function contrast(p, texts) {
  // hide all HUD text and icons, keep the panels, read the real backdrop behind every glyph run
  await p.addStyleTag({ content: '.hud, .hud * { color: transparent !important; text-shadow: none !important; } .hud svg, .hud .flag, .dev { visibility: hidden !important; }' });
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
    return texts.map((t) => {
      const iy = t.r.h * 0.15; /* glyph ink sits inside the line box; skip its top/bottom 15 % */
      const x0 = Math.floor(t.r.x0 * k), y0 = Math.floor((t.r.y0 + iy) * k), w = Math.max(1, Math.ceil(t.r.w * k)), h = Math.max(1, Math.ceil((t.r.h - 2 * iy) * k));
      const d = g.getImageData(x0, y0, w, h).data; const ls = [];
      for (let i = 0; i < d.length; i += 4) ls.push(L(d[i], d[i + 1], d[i + 2]));
      ls.sort((a, b) => a - b);
      const [r, gg, b] = parse(t.color); const lt = L(r, gg, b);
      const med = ls[Math.floor(ls.length / 2)];
      const light = lt > med;
      const worst = light ? ls[ls.length - 1] : ls[0];
      const p95 = light ? ls[Math.floor(ls.length * 0.95)] : ls[Math.floor(ls.length * 0.05)];
      const cr = (a, bb) => (Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05);
      return { t: t.t, fs: t.fs, worst: +cr(lt, worst).toFixed(2), p95: +cr(lt, p95).toFixed(2) };
    });
  }, { b64: buf.toString('base64'), texts });
}

async function open(ctx, url) {
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true);
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  await p.waitForTimeout(400);
  return p;
}

// Self-test: break a few tokens on purpose and make sure the audit catches every one.
async function selftest(b) {
  const d = DEVICES.find((x) => x.id === 'i14');
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 });
  const p = await open(ctx, PAGE + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`);
  await p.addStyleTag({ content: `.btn.home { height: 34px !important; } .alert-prev .txt { font-size: 12px !important; }
    .btn.mode { border-radius: 8px !important; } .valrow svg.i { width: 16px !important; } .dock-item { gap: 6px !important; }
    .nation { top: 2px !important; } .alert-prev { padding-inline: 8px !important; }` });
  const m = await measure(p, d, false);
  const expect = [/height: .btn.home/, /font size: احتجاجات/, /radius: .btn.mode/, /icon size: stat/, /gap: .*= 6/, /top offset: .nation/, /padding: .alert-prev/];
  const missed = expect.filter((re) => !m.issues.some((i) => re.test(i)));
  console.log('selftest flagged:\n  ' + m.issues.filter((i) => i.startsWith('OFF-TOKEN')).slice(0, 14).join('\n  '));
  console.log(missed.length ? 'SELFTEST FAILED, not caught: ' + missed.join(', ') : 'selftest OK: all 7 planted off-token values were caught');
  // the three defects found in QA: dock ends back to 44 pt boxes (18 pt end padding), regime hidden,
  // menu separator lost, and a glass button hit box that skips its 1 px border
  const p2 = await open(ctx, PAGE + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}&speedmenu=1`);
  await p2.addStyleTag({ content: `.dock-item.end { min-width: 44px !important; --hx: 0px !important; } .ntext .rg { display: none !important; }
    .mrow.stop::after { content: none !important; } .btn.mode::before { width: max(100%, 44px) !important; }` });
  const m2 = await measure(p2, d, true);
  const expect2 = [/dock end padding/, /nation card fit 0: .rg not shown/, /separator under إيقاف/, /hit box does not cover the control: الخريطة/];
  const missed2 = expect2.filter((re) => !m2.issues.some((i) => re.test(i)));
  console.log(missed2.length ? 'SELFTEST FAILED, not caught: ' + missed2.join(', ') : 'selftest OK: all 4 planted QA defects were caught');
  await ctx.close();
}

(async () => {
  if (process.argv[2] === '--selftest') {
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
    await selftest(b); await b.close(); return;
  }
  const only = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const report = {};
  const jobs = [];
  DEVICES.forEach((d) => jobs.push({ d, menu: false, out: d.id }));
  const pm = DEVICES.find((d) => d.id === 'i16promax');
  jobs.push({ d: pm, menu: true, out: 'i16promax_speedmenu' });
  for (const { d, menu, out } of jobs) {
    if (only.length && !only.includes(out) && !only.includes(d.id)) continue;
    const qs = `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}` + (menu ? '&speedmenu=1' : '');
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const p = await open(ctx, PAGE + qs);
    await p.screenshot({ path: path.join(OUT, out + '.png') });
    const m = await measure(p, d, menu);
    const ph = await open(ctx, PAGE + qs + '&hit=1');
    await ph.screenshot({ path: path.join(__dirname, out + '_hit.png') });
    await ph.close();
    const c = await contrast(p, m.texts);
    c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} (p95 ${x.p95}) for "${x.t}"`));
    report[out] = { issues: m.issues, audit: m.audit, typeSeen: m.typeSeen, icons: m.icons, sizes: m.sizes, coverage: m.coverage, map: m.map, hits: m.hits, minContrast: Math.min(...c.map((x) => x.worst)), contrast: c };
    console.log(`\n== ${out} ${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`);
    console.log('fit', JSON.stringify(m.sizes.fit), 'coverage', m.coverage);
    console.log('map', JSON.stringify({ ok: m.map.ok, cx: +m.map.cx.toFixed(1), cy: +m.map.cy.toFixed(1), egypt: Object.fromEntries(Object.entries(m.map.egypt).map(([k, v]) => [k, +v.toFixed(1)])) }));
    console.log('audit', m.audit.map((a) => `${a.cls} h${a.h ?? ''} r${a.r ?? ''}${a.top != null ? ' y' + a.top : ''}${a.g1 != null ? ` ${a.g1}/${a.g2}` : ''}`).join(' | '));
    console.log('type', JSON.stringify(m.typeSeen), 'icons', JSON.stringify(m.icons));
    console.log('min contrast', report[out].minContrast, 'lowest:', c.sort((a, b2) => a.worst - b2.worst).slice(0, 3).map((x) => `${x.t}:${x.worst}`).join(' | '));
    console.log(m.issues.length ? 'ISSUES:\n  ' + m.issues.join('\n  ') : 'no issues');
    await ctx.close();
  }
  const prev = fs.existsSync(path.join(__dirname, 'report.json')) && only.length ? JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8')) : {};
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(Object.assign(prev, report), null, 1));
  await b.close();
})();
