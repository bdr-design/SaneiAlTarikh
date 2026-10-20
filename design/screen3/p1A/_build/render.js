// Render screen 3 page 1 variant A (اختيار السيناريو) on every iPhone in ../../../shared/devices.json
// (no arguments = all 7: se mini i14 i16 i16pro i11 i16promax) and run the checks on every device:
// type / spacing / icon tokens, 44 pt hit boxes, safe areas, overlaps, clipped, wrapped or ellipsised text,
// the hero + locked-card rules of page 1, screen corners, contrast over the real backdrop.
// Output: ../<id>.png (page folder, device scale factor 3), <id>_hit.png and report.json here in _build.
// Usage: NODE_PATH=.../tools/node_modules node render.js [ids...]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const want = process.argv.slice(2);
const IDS = want.length ? want : ALL.map((d) => d.id);
const DEVICES = IDS.map((id) => { const d = ALL.find((x) => x.id === id); if (!d) throw new Error('unknown device ' + id); return d; });
const TYPE = { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] };

async function measure(p, d) {
  return p.evaluate(({ d, TYPE }) => {
    const R = (r) => ({ x0: +r.left.toFixed(2), y0: +r.top.toFixed(2), x1: +r.right.toFixed(2), y1: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    const issues = [], W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01;
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const q = (s) => document.querySelector(s);
    // glass + heights + radii
    document.querySelectorAll('.ui .glass').forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost');
      const tint = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (tint !== 'rgba(9, 17, 25, 0.66)') issues.push('glass tint ' + g.className + ' ' + tint);
      if (cs.borderTopWidth !== '1px') issues.push('border width ' + g.className);
      if (!g.classList.contains('sel') && cs.borderTopColor !== 'rgba(127, 233, 255, 0.14)') issues.push('border colour ' + g.className + ' ' + cs.borderTopColor);
      const rad = parseFloat(cs.borderTopLeftRadius); if (Math.abs(rad - 12) > 0.05) issues.push('radius ' + g.className + ' ' + rad);
    });
    const hh = (s) => q(s).getBoundingClientRect().height;
    if (Math.abs(hh('.hdr') - 36) > 0.05) issues.push('header height ' + hh('.hdr'));
    if (Math.abs(hh('.next') - 44) > 0.05) issues.push('next height ' + hh('.next'));
    if (Math.abs(hh('.back') - 32) > 0.05) issues.push('back height ' + hh('.back'));
    // type + text placement + clipping
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
      if (!(fs in TYPE)) issues.push(`font size ${fs} for "${t}"`);
      else if (!TYPE[fs].includes(fw)) issues.push(`font weight ${fs}/${fw} for "${t}"`);
      if (fs === 18 && !el.closest('.ttl h1')) issues.push('18 pt outside the page title: ' + t);
      if (el.scrollWidth > el.clientWidth + 0.5 && getComputedStyle(el).overflow !== 'visible') issues.push(`clipped text "${t}" ${el.scrollWidth}>${el.clientWidth}`);
      rr.forEach((r) => {
        texts.push({ t, fs, color: cs.color, r: R(r) });
        if (r.left < S - eps || r.right > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (r.bottom > H - B + eps) issues.push(`text in bottom inset: ${t}`);
        if (r.left < 0 || r.right > W || r.top < 0) issues.push(`text off screen: ${t}`);
      });
    }
    // text must stay inside its card
    document.querySelectorAll('.sc, .desc, .hdr, .next').forEach((c) => {
      const cr = c.getBoundingClientRect();
      c.querySelectorAll('b, span, p').forEach((e) => {
        if (e.closest('.frost') || !visible(e)) return;
        const r = document.createRange(); r.selectNodeContents(e); const b = r.getBoundingClientRect();
        if (b.width && (b.left < cr.left - 0.5 || b.right > cr.right + 0.5 || b.top < cr.top - 0.5 || b.bottom > cr.bottom + 0.5)) issues.push(`text outside its box: ${e.textContent.trim().slice(0, 20)}`);
      });
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
    const blocks = ['.hdr', '.ttl', '.cards', '.foot'].map((s) => ({ s, r: q(s).getBoundingClientRect() }));
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i].r, b = blocks[j].r;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) issues.push(`overlap ${blocks[i].s} / ${blocks[j].s}`);
    }
    const cards = [...document.querySelectorAll('.sc')].map((c) => R(c.getBoundingClientRect()));
    const row = q('.cards').getBoundingClientRect();
    cards.forEach((c, i) => { if (c.y0 < row.top - 0.5 || c.y1 > row.bottom + 0.5 || c.x0 < row.left - 0.5 || c.x1 > row.right + 0.5) issues.push('card ' + i + ' outside the row'); });

    // ---- extra checks (all devices) ----
    const near = (a, b) => Math.abs(a - b) < 0.05;
    // icons 16 pt, stroke 1.75 (the primary button's arrow is drawn at 2 on purpose)
    document.querySelectorAll('.ui svg.i').forEach((s) => {
      if (!s.getClientRects().length) return;
      const r = s.getBoundingClientRect(), use = s.querySelector('use').getAttribute('href');
      if (!near(r.width, 16) || !near(r.height, 16)) issues.push(`icon size ${use} ${r.width}x${r.height}`);
      const sw = parseFloat(getComputedStyle(s).strokeWidth);
      if (!(near(sw, 1.75) || (s.closest('.next') && near(sw, 2)))) issues.push(`icon stroke ${use} ${sw}`);
    });
    // flex/grid gaps on the 0/4/8/12 scale, paddings on 0/4/8/10/12 (the step digit's 1 pt optical nudge is allowed)
    document.querySelectorAll('.ui *').forEach((e) => {
      if (!visible(e) || e.closest('.frost')) return;
      const cs = getComputedStyle(e);
      if (/flex|grid/.test(cs.display)) [cs.columnGap, cs.rowGap].forEach((g) => { const v = g === 'normal' ? 0 : parseFloat(g); if (![0, 4, 8, 12].some((x) => near(x, v))) issues.push(`gap off scale ${e.className} ${v}`); });
      ['paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight'].forEach((k) => {
        const v = parseFloat(cs[k]);
        if (e.matches('.step .n') && k === 'paddingTop' && near(v, 1)) return;
        // the header holds the 32 pt back chip 2 pt inside the 36 pt bar (10 pt radius concentric with the bar's 12), as on p2B / p3B
        if (e.matches('.hdr') && (k === 'paddingLeft' || k === 'paddingRight') && near(v, 2)) return;
        if (![0, 4, 8, 10, 12].some((x) => near(x, v))) issues.push(`padding off scale ${e.className} ${k} ${v}`);
      });
      if (cs.textOverflow === 'ellipsis') issues.push(`ellipsis on ${e.className}`);
    });
    // radii: cards 12, controls 10 (primary button), chips 8 as in the approved screens
    if (!near(parseFloat(getComputedStyle(q('.next')).borderTopLeftRadius), 10)) issues.push('next radius');
    // 13 pt numbers are tabular
    document.querySelectorAll('.ui *').forEach((e) => {
      if (!visible(e) || e.closest('.frost') || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
      const cs = getComputedStyle(e);
      if (near(parseFloat(cs.fontSize), 13) && !/tabular-nums/.test(cs.fontVariantNumeric)) issues.push(`13 pt not tabular: ${e.textContent.trim().slice(0, 16)}`);
      if (/[٠-٩۰-۹]/.test(e.textContent)) issues.push(`Eastern Arabic digits: ${e.textContent.trim().slice(0, 16)}`);
    });
    if (document.documentElement.dir !== 'rtl' || document.documentElement.lang !== 'ar') issues.push('page not ar/rtl');
    // line count of a range: rects on one line overlap vertically (mixed sizes on a baseline differ in top)
    const lineCount = (rg) => {
      const rs = [...rg.getClientRects()].filter((r) => r.width > 0).sort((a, b) => a.top - b.top);
      let n = 0, bottom = -1e9;
      rs.forEach((r) => { if (r.top >= bottom - 2) { n++; bottom = r.bottom; } else bottom = Math.max(bottom, r.bottom); });
      return n;
    };
    // one-line labels must stay on one line (no wrapped Arabic words)
    const oneLine = ['.back span', '.step .l', '.ttl h1', '.ttl p', '.sc .t', '.sc .y', '.chip span', '.d1', '.next span'];
    oneLine.forEach((sel) => document.querySelectorAll(sel).forEach((e) => {
      if (!visible(e)) return;
      const rg = document.createRange(); rg.selectNodeContents(e);
      if (lineCount(rg) > 1) issues.push(`wrapped: ${e.textContent.trim().slice(0, 20)}`);
    }));
    // the description may use at most two lines and must be fully inside its bar
    { const rg = document.createRange(); rg.selectNodeContents(q('.d2'));
      const n = lineCount(rg); if (n > 2) issues.push('description wraps to ' + n + ' lines'); }
    // page 1: the 2011 card is the hero; locked cards keep a readable title, the lock and "قريبًا" inside the image
    const sel = q('.sc.sel').getBoundingClientRect(), locks = [...document.querySelectorAll('.sc.lock')];
    if (window.__cards.fit > 1) issues.push('locked titles fell back to 10 pt (fit 2)');
    locks.forEach((c) => { const t = c.querySelector('.t'); if (parseFloat(getComputedStyle(t).fontSize) < 11.5) issues.push('locked title below 11.5 pt: ' + t.textContent); });
    locks.forEach((c, i) => {
      const r = c.getBoundingClientRect();
      if (sel.width < r.width * 1.5 - 0.05) issues.push(`hero not dominant: ${sel.width.toFixed(1)} vs locked ${r.width.toFixed(1)}`);
      if (sel.height < r.height - 0.05) issues.push('hero shorter than a locked card');
      const ph = c.querySelector('.ph').getBoundingClientRect(), chip = c.querySelector('.chip'), cr2 = chip.getBoundingClientRect();
      if (!visible(chip) || !chip.querySelector('use[href="#i-lock"]') || chip.textContent.trim() !== 'قريبًا') issues.push('locked card ' + i + ' lost its lock + قريبًا');
      if (cr2.left < ph.left + 4 - eps || cr2.right > ph.right - 4 + eps || cr2.top < ph.top - eps || cr2.bottom > ph.bottom - 4 + eps) issues.push('lock chip ' + i + ' cut by its image');
      const cap = c.querySelector('.cap'), cs = getComputedStyle(cap), cb = cap.getBoundingClientRect();
      ['.t', '.y'].forEach((s) => {
        const rg = document.createRange(); rg.selectNodeContents(cap.querySelector(s)); const b = rg.getBoundingClientRect();
        if (b.left < cb.left + parseFloat(cs.paddingLeft) - 0.5 || b.right > cb.right - parseFloat(cs.paddingRight) + 0.5) issues.push(`locked caption cut: ${cap.querySelector(s).textContent}`);
      });
      if (ph.height < 40) issues.push('locked image too small ' + ph.height.toFixed(1));
    });
    { const cap = q('.sc.sel .cap'), cs = getComputedStyle(cap), cb = cap.getBoundingClientRect();
      ['.t', '.y'].forEach((s) => { const rg = document.createRange(); rg.selectNodeContents(cap.querySelector(s)); const b = rg.getBoundingClientRect();
        if (b.left < cb.left + parseFloat(cs.paddingLeft) - 0.5 || b.right > cb.right - parseFloat(cs.paddingRight) + 0.5) issues.push(`hero caption cut: ${cap.querySelector(s).textContent}`); });
      const ch = q('.sc.sel .chip').getBoundingClientRect(), ph = q('.sc.sel .ph').getBoundingClientRect();
      if (ch.left < ph.left + 4 - eps || ch.bottom > ph.bottom - 4 + eps) issues.push('hero chip cut'); }
    // the whole visible UI stays inside the rounded screen (4 pt clear of the corner arc) and clear of the cutout
    const RC = d.cutout === 'none' ? 0 : 39;
    const inCorner = (x, y) => { const cx = x < RC ? RC : x > W - RC ? W - RC : x, cy = y < RC ? RC : y > H - RC ? H - RC : y; return Math.hypot(x - cx, y - cy) > RC - 4; };
    document.querySelectorAll('.ui .glass, .ui .next, .ttl h1, .ttl p').forEach((e) => {
      const r = e.getBoundingClientRect();
      if (RC && [[r.left, r.top], [r.right, r.top], [r.left, r.bottom], [r.right, r.bottom]].some(([x, y]) => inCorner(x, y))) issues.push(`in a rounded corner: ${e.className}`);
      if (d.cutout !== 'none') { const cw = d.cutout === 'island' ? 48 : 30; if (r.left < cw + 8 && r.bottom > H / 2 - 105 && r.top < H / 2 + 105) issues.push(`crowds the ${d.cutout}: ${e.className}`); }
      if (r.left < S - eps || r.right > W - S + eps) issues.push(`box in side inset: ${e.className}`);
    });
    // the primary button keeps its spot: bottom-left (RTL end) of the safe box, bottom line shared with the description bar
    { const n = q('.next').getBoundingClientRect(), ds = q('.desc').getBoundingClientRect(), ui = q('.ui').getBoundingClientRect();
      if (Math.abs(n.left - ui.left) > 0.5) issues.push('next not at the RTL end');
      if (Math.abs(n.bottom - ds.bottom) > 0.5) issues.push('next and description not on one bottom line');
      if (ds.left < n.right - 0.05) issues.push('description overlaps next'); }
    // steps centred on the bar
    const st = q('.steps').getBoundingClientRect(), hd = q('.hdr').getBoundingClientRect();
    const dc = (st.left + st.right) / 2 - (hd.left + hd.right) / 2;
    if (Math.abs(dc) > 0.5) issues.push('steps off centre by ' + dc.toFixed(1));
    if (st.right > q('.back').getBoundingClientRect().left - 8) issues.push('steps too close to back');
    return { issues, typeSeen, texts, cards, layout: Object.fromEntries(blocks.map((b) => [b.s, R(b.r)])), cardsInfo: window.__cards, map: window.__map,
      hits: taps.map((t) => ({ l: t.label, ...Object.fromEntries(Object.entries(t.hit).map(([k, v]) => [k, +v.toFixed(1)])) })) };
  }, { d, TYPE });
}

async function contrast(p, texts) {
  await p.addStyleTag({ content: '.ui, .ui * { color: transparent !important; text-shadow: none !important; } .ui svg, .dev, .link { visibility: hidden !important; } .step .n { box-shadow: none !important; }' });
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
      // dark text (the primary button) is checked against the darkest backdrop pixel, light text against the brightest
      const worst = lt > 0.3 ? ls[ls.length - 1] : ls[0];
      const real = lt > 0.3 ? cr(lt, worst) : cr(lt, worst);
      return { t: t.t.slice(0, 18), fs: t.fs, worst: +real.toFixed(2) };
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
  let report = {};
  if (want.length) { try { report = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8')); } catch (e) { report = {}; } }
  for (const d of DEVICES) {
    const qs = `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const p = await open(ctx, PAGE + qs);
    await p.screenshot({ path: path.join(OUT, d.id + '.png') });
    const m = await measure(p, d);
    const ph = await open(ctx, PAGE + qs + '&hit=1');
    await ph.screenshot({ path: path.join(__dirname, d.id + '_hit.png') });
    await ph.close();
    const c = await contrast(p, m.texts);
    c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} for "${x.t}"`));
    report[d.id] = { ...m, contrast: c };
    console.log(`\n== ${d.id} ${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`);
    console.log('cards', JSON.stringify(m.cardsInfo));
    console.log('layout', JSON.stringify(m.layout));
    console.log('card boxes', JSON.stringify(m.cards));
    console.log('type', JSON.stringify(m.typeSeen));
    console.log('hits', JSON.stringify(m.hits));
    console.log('contrast min', Math.min(...c.map((x) => x.worst)), c.sort((a, b) => a.worst - b.worst).slice(0, 4).map((x) => `${x.t}:${x.worst}`).join(' | '));
    console.log(m.issues.length ? 'ISSUES:\n  ' + m.issues.join('\n  ') : 'no issues');
    await ctx.close();
  }
  const order = ALL.map((d) => d.id).filter((id) => report[id]);
  const sorted = Object.fromEntries(order.map((id) => [id, report[id]]));
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(sorted, null, 1));
  console.log('\nSUMMARY ' + order.map((id) => `${id}:${sorted[id].issues.length}`).join(' '));
  await b.close();
})();
