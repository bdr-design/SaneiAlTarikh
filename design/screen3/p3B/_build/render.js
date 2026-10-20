// Render screen 3 page 3 variant B (campaign settings) on every iPhone in shared/devices.json (or the ids given) and run the checks:
// glass / height / radius tokens, type tokens, 44 pt hit boxes (no overlap), safe areas, overlaps, clipped text,
// text inside its card, contrast over the real backdrop.
// Usage: NODE_PATH=.../tools/node_modules node render.js [ids...]   (no ids: all 7 devices)
// Writes <id>.png to the page folder, <id>_hit.png and report.json to _build.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const want = process.argv.slice(2);
const IDS = want.length ? want : ALL.map((d) => d.id);
const DEVICES = IDS.map((id) => ALL.find((d) => d.id === id) || (() => { throw new Error('unknown device ' + id); })());
const TYPE = { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] };

async function measure(p, d) {
  return p.evaluate(({ d, TYPE }) => {
    const R = (r) => ({ x0: +r.left.toFixed(2), y0: +r.top.toFixed(2), x1: +r.right.toFixed(2), y1: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    const issues = [], W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01;
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(visible);
    const near = (a, b) => Math.abs(a - b) < 0.05;
    // glass + radii
    qa('.ui .glass').forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost');
      const tint = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (tint !== 'rgba(9, 17, 25, 0.66)') issues.push('glass tint ' + g.className + ' ' + tint);
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== 'rgba(127, 233, 255, 0.14)') issues.push('border ' + g.className + ' ' + cs.borderTopWidth + ' ' + cs.borderTopColor);
      const rad = parseFloat(cs.borderTopLeftRadius); if (!near(rad, 12)) issues.push('radius ' + g.className + ' ' + rad);
    });
    // control heights: only 32 / 36 / 44
    const hh = (e) => e.getBoundingClientRect().height;
    if (!near(hh(q('.hdr')), 36)) issues.push('header height ' + hh(q('.hdr')));
    if (!near(hh(q('.next')), 44)) issues.push('start height ' + hh(q('.next')));
    if (!near(hh(q('.sum')), 44)) issues.push('summary height ' + hh(q('.sum')));
    if (!near(hh(q('.back')), 32)) issues.push('back height ' + hh(q('.back')));
    qa('.ch, .tg').forEach((e) => { if (!near(hh(e), 32)) issues.push('choice height ' + hh(e) + ' ' + e.textContent.trim()); });
    qa('.ch, .back, .next').forEach((e) => { const r = parseFloat(getComputedStyle(e).borderTopLeftRadius); if (!near(r, 10)) issues.push('control radius ' + r + ' ' + e.textContent.trim()); });
    // spacing: flex/grid gaps on the 4 / 8 / 12 scale (the 2 pt level-bar gap is a glyph detail)
    document.querySelectorAll('.ui *').forEach((e) => {
      if (!visible(e) || e.closest('.frost') || e.classList.contains('lvl')) return;
      const cs = getComputedStyle(e);
      if (!/flex|grid/.test(cs.display)) return;
      [cs.columnGap, cs.rowGap].forEach((g) => { const v = g === 'normal' ? 0 : parseFloat(g); if (![0, 4, 8, 12].some((s) => near(s, v))) issues.push(`gap ${v} on ${e.className}`); });
    });
    // icons 16
    qa('.ui svg.i').forEach((s) => { const r = s.getBoundingClientRect(); if (!near(r.width, 16) || !near(r.height, 16)) issues.push('icon size ' + r.width + 'x' + r.height); });
    // type + text placement + clipping
    const typeSeen = {}, texts = [];
    const walker = document.createTreeWalker(q('.ui'), NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      if (!tn.textContent.trim()) continue;
      const el = tn.parentElement, cs = getComputedStyle(el);
      if (!visible(el)) continue;
      const range = document.createRange(); range.selectNodeContents(tn);
      const rr = [...range.getClientRects()].filter((r) => r.width > 0);
      if (!rr.length) continue;
      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight, t = tn.textContent.trim();
      typeSeen[`${fs}/${fw}`] = (typeSeen[`${fs}/${fw}`] || 0) + 1;
      if (!(fs in TYPE)) issues.push(`font size ${fs} for "${t}"`);
      else if (!TYPE[fs].includes(fw)) issues.push(`font weight ${fs}/${fw} for "${t}"`);
      rr.forEach((r) => {
        texts.push({ t, fs, color: cs.color, r: R(r) });
        if (r.left < S - eps || r.right > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (r.bottom > H - B + eps) issues.push(`text in bottom inset: ${t}`);
        if (r.left < 0 || r.right > W || r.top < 0) issues.push(`text off screen: ${t}`);
      });
    }
    // every text and icon stays inside its card / control with room to spare
    qa('.opt, .hdr, .sum, .next, .ch, .tg, .back').forEach((c) => {
      const cr = c.getBoundingClientRect();
      const pad = c.matches('.opt, .sum') ? parseFloat(getComputedStyle(c).paddingLeft) - 0.05 : c.matches('.ch') ? 9.95 : 0;   // the card padding is 8 pt at fit 2
      c.querySelectorAll('b, span, p, h2, svg').forEach((e) => {
        if (e.closest('.frost') || !visible(e) || e.closest('.lvl') || e.classList.contains('sw')) return;
        let b;
        if (e.tagName === 'svg') b = e.getBoundingClientRect(); else { const r = document.createRange(); r.selectNodeContents(e); b = r.getBoundingClientRect(); }
        if (!b.width) return;
        if (b.left < cr.left + pad - 0.5 || b.right > cr.right - pad + 0.5 || b.top < cr.top - 0.5 || b.bottom > cr.bottom + 0.5)
          issues.push(`content outside its box (${c.className.split(' ')[0]}): ${(e.textContent || e.tagName).trim().slice(0, 24)} ${R(b).x0}..${R(b).x1} / ${R(cr).x0}..${R(cr).x1} y ${R(b).y0}..${R(b).y1} / ${R(cr).y0}..${R(cr).y1}`);
      });
    });
    // no clipped or ellipsised text anywhere (overflow hidden / text-overflow on a text element)
    document.querySelectorAll('.ui *').forEach((e) => {
      if (!visible(e) || e.closest('.frost') || !e.textContent.trim()) return;
      const cs = getComputedStyle(e);
      if (cs.textOverflow === 'ellipsis') issues.push(`ellipsis on: ${e.textContent.trim().slice(0, 24)}`);
      if (/hidden|clip|scroll|auto/.test(cs.overflowX + cs.overflowY) && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1))
        issues.push(`clipped content in ${e.className}: ${e.textContent.trim().slice(0, 24)}`);
    });
    // cards: list + note inside the card's content box, notes aligned, lists aligned
    const opts = qa('.opt');
    const notes = opts.map((c) => c.querySelector('.note').getBoundingClientRect());
    const lists = opts.map((c) => c.querySelector('.list').getBoundingClientRect());
    opts.forEach((c, i) => {
      const r = c.getBoundingClientRect(), cs = getComputedStyle(c), pb = parseFloat(cs.paddingBottom);
      if (notes[i].bottom > r.bottom - 1 - pb + 0.05) issues.push(`note overflows card ${i} by ${(notes[i].bottom - (r.bottom - 1 - pb)).toFixed(2)}`);
      if (notes[i].top < lists[i].bottom + 3.95) issues.push(`note too close to list in card ${i}`);
      if (Math.abs(lists[i].top - lists[0].top) > 0.05) issues.push('lists not aligned');
    });
    // hit boxes
    const taps = [...document.querySelectorAll('.tap')].filter(visible).map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const hw = parseFloat(ps.width), hh2 = parseFloat(ps.height);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e;
      const y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      return { label: (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), vis: R(r), hit: { x0, x1: x0 + hw, y0, y1: y0 + hh2 } };
    });
    const lu = 1 / 32;
    taps.forEach((t) => {
      const h = t.hit, v = t.vis;
      if (h.x1 - h.x0 < 44 - eps || h.y1 - h.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      if (h.x0 > v.x0 + lu || h.x1 < v.x1 - lu || h.y0 > v.y0 + lu || h.y1 < v.y1 - lu) issues.push(`hit box does not cover: ${t.label}`);
      if (h.x0 < S - eps || h.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      if (h.y1 > H - B + lu || h.y0 < -eps) issues.push(`tap in bottom inset/off top: ${t.label} ${h.y0.toFixed(1)}..${h.y1.toFixed(1)}`);
    });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) {
      const a = taps[i].hit, b = taps[j].hit;
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.05 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.05) issues.push(`hit overlap ${taps[i].label} / ${taps[j].label}`);
    }
    // block overlaps
    const blocks = ['.hdr', '.cards', '.foot'].map((s) => ({ s, r: q(s).getBoundingClientRect() }));
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i].r, b = blocks[j].r;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) issues.push(`overlap ${blocks[i].s} / ${blocks[j].s}`);
    }
    // steps centred on the bar, clear of back
    const st = q('.steps').getBoundingClientRect(), hd = q('.hdr').getBoundingClientRect();
    const dc = (st.left + st.right) / 2 - (hd.left + hd.right) / 2;
    if (Math.abs(dc) > 0.5) issues.push('steps off centre by ' + dc.toFixed(1));
    if (st.right > q('.back').getBoundingClientRect().left - 8) issues.push('steps too close to back');
    // RTL: back at the right end, start button at the left end
    if (q('.back').getBoundingClientRect().right < hd.right - 4) issues.push('back not at the RTL start');
    if (Math.abs(q('.next').getBoundingClientRect().left - q('.ui').getBoundingClientRect().left) > 0.05) issues.push('start not at the RTL end');
    return { issues, typeSeen, texts, fit: window.__fit, layout: Object.fromEntries(blocks.map((b) => [b.s, R(b.r)])),
      cards: opts.map((c) => R(c.getBoundingClientRect())), notes: notes.map(R),
      hits: taps.map((t) => ({ l: t.label, ...Object.fromEntries(Object.entries(t.hit).map(([k, v]) => [k, +v.toFixed(1)])) })) };
  }, { d, TYPE });
}

async function contrast(p, texts) {
  await p.addStyleTag({ content: '.ui, .ui * { color: transparent !important; text-shadow: none !important; } .ui svg, .dev, .sep, .sw, .lvl { visibility: hidden !important; } .step .n { box-shadow: none !important; }' });
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
      const cr = (a, bb) => (Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05);
      const worst = lt > 0.3 ? ls[ls.length - 1] : ls[0];
      return { t: t.t.slice(0, 18), fs: t.fs, worst: +cr(lt, worst).toFixed(2) };
    });
  }, { b64: buf.toString('base64'), texts });
}

async function open(ctx, url) {
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true);
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  await p.waitForTimeout(500);
  return p;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  // a run on some ids updates those entries and keeps the others (each entry carries its render time)
  let report = {};
  if (want.length) { try { report = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8')); } catch (e) { report = {}; } }
  for (const d of DEVICES) {
    const qs = `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const p = await open(ctx, PAGE + qs);
    const outName = path.join(OUT, d.id + '.png');
    await p.screenshot({ path: outName });
    const m = await measure(p, d);
    const ph = await open(ctx, PAGE + qs + '&hit=1');
    await ph.screenshot({ path: path.join(__dirname, d.id + '_hit.png') });
    await ph.close();
    const c = await contrast(p, m.texts);
    c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} for "${x.t}"`));
    report[d.id] = { device: `${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`, renderedAt: new Date().toISOString(), issueCount: m.issues.length, ...m, contrast: c };
    console.log(`\n== ${d.id} ${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`);
    console.log('fit', JSON.stringify(m.fit));
    console.log('layout', JSON.stringify(m.layout));
    console.log('cards', JSON.stringify(m.cards));
    console.log('type', JSON.stringify(m.typeSeen));
    console.log('contrast min', Math.min(...c.map((x) => x.worst)), c.sort((a, b) => a.worst - b.worst).slice(0, 4).map((x) => `${x.t}:${x.worst}`).join(' | '));
    console.log(m.issues.length ? 'ISSUES:\n  ' + m.issues.join('\n  ') : 'no issues');
    await ctx.close();
  }
  const ordered = {};
  ALL.forEach((d) => { if (report[d.id]) ordered[d.id] = report[d.id]; });
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(ordered, null, 1));
  console.log('\nissues per device:', Object.entries(ordered).map(([k, v]) => `${k} ${v.issues.length}`).join(', '));
  await b.close();
})();
