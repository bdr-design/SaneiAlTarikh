// Render screen 2 variant B (main menu) on i16promax, i14 and se and run the checks:
// token audit, 44 pt hit boxes, safe areas, overlaps, overflow, text contrast over the real backdrop.
// Usage: NODE_PATH=.../tools/node_modules node render.js [ids...]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const IDS = ALL.map((d) => d.id);
const DEVICES = IDS.map((id) => ALL.find((d) => d.id === id));

const TOK = {
  heights: [32, 36, 44], rCtl: 10, rCard: 12, space: [0, 4, 8, 12],
  type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700], 36: [700] },
  icon: 16, stroke: 1.75,
  border: 'rgba(127, 233, 255, 0.14)', glass: 'rgba(9, 17, 25, 0.66)',
};

async function measure(p, d) {
  return p.evaluate(({ d, TOK }) => {
    const R = (r) => ({ x0: +r.left.toFixed(2), y0: +r.top.toFixed(2), x1: +r.right.toFixed(2), y1: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    const issues = [];
    const W = d.w, H = d.h, S = d.side, B = d.bottom;
    const eps = 0.01, near = (a, b) => Math.abs(a - b) < 0.05;
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const off = (what, el, got, want) => issues.push(`OFF-TOKEN ${what}: ${el} = ${got} (want ${want})`);
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(visible);
    const audit = {};

    // glass look
    qa('.ui .glass').forEach((g, i) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost');
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== TOK.border) off('border', g.className, `${cs.borderTopWidth} ${cs.borderTopColor}`, TOK.border);
      const tint = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (tint !== TOK.glass) off('glass', g.className, tint, TOK.glass);
    });
    // heights + radii
    const card = q('.continue'), cta = q('.cta'), acts = qa('.act');
    const cr = card.getBoundingClientRect(), tr = cta.getBoundingClientRect();
    if (!near(parseFloat(getComputedStyle(card).borderTopLeftRadius), TOK.rCard)) off('radius', 'card', getComputedStyle(card).borderTopLeftRadius, TOK.rCard);
    if (!near(tr.height, 44)) off('height', 'cta', tr.height, 44);
    if (!near(parseFloat(getComputedStyle(cta).borderTopLeftRadius), TOK.rCtl)) off('radius', 'cta', getComputedStyle(cta).borderTopLeftRadius, TOK.rCtl);
    // the 44 pt action sits 8 pt inside the card on top, bottom and the left end
    const inT = tr.top - cr.top - 1, inB = cr.bottom - 1 - tr.bottom, inL = tr.left - cr.left - 1;
    if (!near(inT, 8) || !near(inB, 8) || !near(inL, 8)) off('cta inset', 'cta', `${inT.toFixed(1)}/${inB.toFixed(1)}/${inL.toFixed(1)}`, 8);
    audit.card = R(cr); audit.cta = R(tr);
    const aw = acts.map((a) => a.getBoundingClientRect());
    acts.forEach((a, i) => {
      if (!near(aw[i].height, 36)) off('height', 'act' + i, aw[i].height, 36);
      if (!near(parseFloat(getComputedStyle(a).borderTopLeftRadius), TOK.rCtl)) off('radius', 'act' + i, getComputedStyle(a).borderTopLeftRadius, TOK.rCtl);
      if (Math.abs(aw[i].width - aw[0].width) > 0.05) issues.push(`action buttons not equal: ${aw.map((r) => r.width.toFixed(2)).join('/')}`);
      const over = window.__actClip(a);
      if (over > 0.05) issues.push(`action label clipped by ${over.toFixed(2)}: ${a.textContent.trim()}`);
      const ink = [...a.querySelectorAll(':scope > span:not(.frost), :scope > svg')].filter(visible).map((e) => e.getBoundingClientRect());
      const inkL = Math.min(...ink.map((r) => r.left)), inkR = Math.max(...ink.map((r) => r.right));
      if (inkL < aw[i].left + 1 + 9.95 || inkR > aw[i].right - 1 - 9.95) issues.push(`action content closer than 10 pt to its edge: ${a.textContent.trim()} (${(inkL - aw[i].left - 1).toFixed(1)}/${(aw[i].right - 1 - inkR).toFixed(1)})`);
    });
    for (let i = 1; i < aw.length; i++) { const g = aw[i - 1].left - aw[i].right; if (!near(g, 8)) off('action gap', 'act' + i, g.toFixed(2), 8); }
    audit.actions = aw.map(R);
    audit.fit = window.__fit; audit.cardAlign = window.__card;
    // the action row sits on the home indicator inset with its hit boxes (or 8 pt on SE)
    const rowBottom = Math.max(...aw.map((r) => r.bottom));
    audit.rowBottomGap = +(H - rowBottom).toFixed(2);
    // flex / grid gaps on the spacing scale (spacers are flex-grow free space, not gaps)
    document.querySelectorAll('.ui *').forEach((e) => {
      if (!visible(e) || e.closest('.frost')) return;
      const cs = getComputedStyle(e);
      if (!/flex|grid/.test(cs.display)) return;
      [cs.columnGap, cs.rowGap].forEach((g) => { const v = g === 'normal' ? 0 : parseFloat(g); if (!TOK.space.some((s) => near(s, v))) off('gap', e.className, v, TOK.space.join('/')); });
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach((k) => { const v = parseFloat(cs[k]); if (![0, 4, 8, 10, 12].some((s) => near(s, v))) off('padding', e.className + ' ' + k, v, '0/4/8/10/12'); });
    });
    // icons 16, stroke 1.75
    const iconSizes = new Set();
    document.querySelectorAll('.ui svg').forEach((s) => {
      if (!s.getClientRects().length) return;
      const r = s.getBoundingClientRect(); iconSizes.add(`${r.width}x${r.height}`);
      if (!near(r.width, TOK.icon) || !near(r.height, TOK.icon)) off('icon size', s.querySelector('use').getAttribute('href'), `${r.width}x${r.height}`, TOK.icon);
      if (!near(parseFloat(getComputedStyle(s).strokeWidth), TOK.stroke)) off('stroke', s.querySelector('use').getAttribute('href'), getComputedStyle(s).strokeWidth, TOK.stroke);
    });
    audit.icons = [...iconSizes];
    // type
    const typeSeen = {}, texts = [];
    const walker = document.createTreeWalker(q('.ui'), NodeFilter.SHOW_TEXT);
    let tn;
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
      if (fs === 36 && !el.closest('.wordmark')) off('display size outside the wordmark', t, fs, 'wordmark only');
      if (fs === 13 && !/tabular-nums/.test(cs.fontVariantNumeric)) off('tabular nums', t, cs.fontVariantNumeric, 'tabular-nums');
      rr.forEach((r) => {
        texts.push({ t, fs, color: cs.color, r: R(r), onGlass: !!el.closest('.glass') });
        if (r.left < S - eps || r.right > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (r.bottom > H - B + eps) issues.push(`text in bottom inset: ${t}`);
        if (r.left < 0 || r.right > W || r.top < 0) issues.push(`text off screen: ${t}`);
      });
    }
    // hit boxes: 44 x 44, inside the safe area, no overlaps
    const taps = [...document.querySelectorAll('.tap')].filter(visible).map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const hw = parseFloat(ps.width), hh = parseFloat(ps.height);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e;
      const y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      return { label: (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), vis: R(r), hit: { x0, x1: x0 + hw, y0, y1: y0 + hh } };
    });
    const lu = 1 / 32;
    taps.forEach((t) => {
      const h = t.hit, v = t.vis;
      if (h.x1 - h.x0 < 44 - eps || h.y1 - h.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      if (h.x0 > v.x0 + lu || h.x1 < v.x1 - lu || h.y0 > v.y0 + lu || h.y1 < v.y1 - lu) issues.push(`hit box does not cover the control: ${t.label}`);
      if (h.x0 < S - eps || h.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      if (h.y1 > H - B + lu || h.y0 < -eps) issues.push(`tap in bottom inset/off top: ${t.label} y ${h.y0.toFixed(2)}..${h.y1.toFixed(2)}`);
    });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) {
      const a = taps[i].hit, b = taps[j].hit;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 0.05 && oy > 0.05) issues.push(`hit overlap ${taps[i].label} / ${taps[j].label}`);
    }
    // overflow + overlaps between blocks (wordmark, subtitle, version, card, row)
    document.querySelectorAll('.ui .glass, .ui .glass *').forEach((e) => {
      if (e.closest('.frost') || !visible(e)) return;
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') issues.push(`overflow: ${e.className}`);
    });
    const blocks = ['.ver', '.wordmark', '.sub', '.continue', '.actions'].map((s) => ({ s, r: q(s).getBoundingClientRect() }));
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i].r, b = blocks[j].r;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) issues.push(`overlap ${blocks[i].s} / ${blocks[j].s}`);
    }
    // the wordmark's real ink must stay clear of the version label
    const wm = q('.wordmark'), rg = document.createRange(); rg.selectNodeContents(wm);
    const ink = rg.getBoundingClientRect(), vr = q('.ver').getBoundingClientRect();
    audit.layout = Object.fromEntries(blocks.map((b) => [b.s, R(b.r)]));
    audit.wordmarkInk = R(ink);
    audit.upperThird = { brandCentre: +((q('.brand').getBoundingClientRect().top + q('.brand').getBoundingClientRect().bottom) / 2).toFixed(1), third: +(H / 3).toFixed(1) };
    if (audit.upperThird.brandCentre > H / 3) issues.push(`brand centre ${audit.upperThird.brandCentre} is below the upper third (${(H / 3).toFixed(1)})`);
    // centred horizontally on the screen
    ['.brand', '.continue', '.actions'].forEach((s) => { const r = q(s).getBoundingClientRect(); const c = (r.left + r.right) / 2; if (Math.abs(c - W / 2) > 0.5) issues.push(`${s} not centred: ${c.toFixed(1)} vs ${W / 2}`); });
    return { issues, audit, typeSeen, texts, hits: taps.map((t) => ({ l: t.label, ...Object.fromEntries(Object.entries(t.hit).map(([k, v]) => [k, +v.toFixed(2)])) })) };
  }, { d, TOK });
}

async function contrast(p, texts) {
  // hide all text, icons and the device overlay, keep the panels, read the real backdrop behind every glyph run
  await p.addStyleTag({ content: '.ui, .ui * { color: transparent !important; text-shadow: none !important; } .ui svg, .ui .flag, .dev, .rule { visibility: hidden !important; }' });
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
      const iy = t.r.h * 0.15;
      const x0 = Math.floor(t.r.x0 * k), y0 = Math.floor((t.r.y0 + iy) * k), w = Math.max(1, Math.ceil(t.r.w * k)), h = Math.max(1, Math.ceil((t.r.h - 2 * iy) * k));
      const d = g.getImageData(x0, y0, w, h).data; const ls = [];
      for (let i = 0; i < d.length; i += 4) ls.push(L(d[i], d[i + 1], d[i + 2]));
      ls.sort((a, b) => a - b);
      const [r, gg, b] = parse(t.color); const lt = L(r, gg, b);
      const worst = ls[ls.length - 1], p95 = ls[Math.floor(ls.length * 0.95)];
      const cr = (a, bb) => (Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05);
      return { t: t.t, fs: t.fs, onGlass: t.onGlass, worst: +cr(lt, worst).toFixed(2), p95: +cr(lt, p95).toFixed(2) };
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

(async () => {
  const only = process.argv.slice(2);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const report = {};
  for (const d of DEVICES) {
    if (only.length && !only.includes(d.id)) continue;
    const qs = `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const p = await open(ctx, PAGE + qs);
    await p.screenshot({ path: path.join(OUT, d.id + '.png') });
    const m = await measure(p, d);
    const ph = await open(ctx, PAGE + qs + '&hit=1');
    await ph.screenshot({ path: path.join(__dirname, d.id + '_hit.png') });
    await ph.close();
    const c = await contrast(p, m.texts);
    c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} (p95 ${x.p95}) for "${x.t}"`));
    report[d.id] = { issues: m.issues, audit: m.audit, typeSeen: m.typeSeen, hits: m.hits, contrast: c };
    console.log(`\n== ${d.id} ${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`);
    console.log('fit', JSON.stringify(m.audit.fit), 'card', JSON.stringify(m.audit.cardAlign), 'rowBottomGap', m.audit.rowBottomGap);
    console.log('layout', JSON.stringify(m.audit.layout));
    console.log('upper third', JSON.stringify(m.audit.upperThird), 'wordmark ink', JSON.stringify(m.audit.wordmarkInk));
    console.log('type', JSON.stringify(m.typeSeen), 'icons', JSON.stringify(m.audit.icons));
    console.log('contrast', c.map((x) => `${x.t}:${x.worst}`).join(' | '));
    console.log(m.issues.length ? 'ISSUES:\n  ' + m.issues.join('\n  ') : 'no issues');
    await ctx.close();
  }
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 1));
  await b.close();
})();
