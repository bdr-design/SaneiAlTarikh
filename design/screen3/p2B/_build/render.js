// Render screen 3 / page 2 variant B (country picker) and run the checks:
// tokens, 44 pt hit boxes, safe areas, overlaps, clipping, text contrast over the real backdrop.
// Usage: NODE_PATH=.../tools/node_modules node render.js [ids...]   (default: all 7 devices in shared/devices.json)
//        NODE_PATH=.../tools/node_modules node render.js --selftest  (plants known defects and checks that they are caught)
// Writes <id>.png (device scale factor 3) to the page folder, <id>_hit.png and report.json to _build.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));

const TOK = {
  type: { 10: [500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] },
  border: 'rgba(127, 233, 255, 0.14)', glass: 'rgba(9, 17, 25, 0.66)',
};

async function measure(p, d) {
  return p.evaluate(({ d, TOK }) => {
    const R = (r) => ({ x0: +r.left.toFixed(2), y0: +r.top.toFixed(2), x1: +r.right.toFixed(2), y1: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    const issues = [], audit = {};
    const W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01, near = (a, b) => Math.abs(a - b) < 0.05;
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(visible);
    const strip = q('.strip').getBoundingClientRect();
    // The strip's mask, read back from the computed style (not from the page's own numbers): alpha at a screen x.
    const maskStops = (() => {
      const g = getComputedStyle(q('.strip')).maskImage, m = g.match(/^linear-gradient\(to right, (.*)\)$/);
      if (!m) return null;
      return m[1].split(/,(?![^(]*\))/).map((t) => { const c = t.trim().match(/^(rgba?\(([^)]*)\))\s+([\d.]+)px$/); if (!c) return null; const v = c[2].split(',').map(Number); return { a: v.length > 3 ? v[3] : 1, x: strip.left + +c[3] }; });
    })();
    if (!maskStops || maskStops.some((x) => !x)) issues.push(`strip mask not understood: ${getComputedStyle(q('.strip')).maskImage}`);
    const alphaAt = (x) => {
      const st = maskStops || [];
      if (!st.length) return 1;
      if (x <= st[0].x) return st[0].a;
      for (let i = 1; i < st.length; i++) if (x <= st[i].x) return st[i].x === st[i - 1].x ? st[i].a : st[i - 1].a + (st[i].a - st[i - 1].a) * (x - st[i - 1].x) / (st[i].x - st[i - 1].x);
      return st[st.length - 1].a;
    };
    // A chip's name at the faded RTL end is either fully shown, a readable hint (at least HINT at its left end, as the
    // approved iPhone 17 Pro Max shows اليمن), or fully out (nothing left at its right end). Anything between reads as a cut word.
    const HINT = 0.55;
    const nameState = (chip) => {
      const t = chip.querySelector('.tx').getBoundingClientRect();
      if (t.right <= strip.left + eps || t.left >= strip.right) return { s: 'out', aL: 0, aR: 0 };
      const aL = t.left < strip.left - eps ? 0 : alphaAt(t.left), aR = alphaAt(t.right);
      if (aL >= 0.999) return { s: 'shown', aL, aR };
      if (aR <= 0.02) return { s: 'out', aL, aR };
      if (aL >= HINT - 0.005) return { s: 'hint', aL, aR };
      return { s: 'cut', aL, aR };
    };
    const inStrip = (r) => r.left >= strip.left - eps && r.right <= strip.right + eps;   // the whole chip box lies inside the strip (not scrolled out)
    const nameShown = (chip) => ['shown', 'hint'].includes(nameState(chip).s);

    qa('.ui .glass').forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost');
      if (!g.classList.contains('on') && (cs.borderTopWidth !== '1px' || cs.borderTopColor !== TOK.border)) issues.push(`border off: ${g.className}`);
      const tint = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (tint !== TOK.glass) issues.push(`glass off: ${g.className} ${tint}`);
      const rad = parseFloat(cs.borderTopLeftRadius), h = g.getBoundingClientRect().height;
      if (![10, 12].includes(rad)) issues.push(`radius off: ${g.className} ${rad}`);
      if (!g.classList.contains('sel') && ![32, 36, 44].some((x) => near(x, h))) issues.push(`height off: ${g.className} ${h}`);
    });
    ['.back', '.next'].forEach((s) => { const h = q(s).getBoundingClientRect().height; if (![32, 36, 44].some((x) => near(x, h))) issues.push(`height off ${s} ${h}`); });

    // type
    const typeSeen = {}, texts = [];
    const walker = document.createTreeWalker(q('.ui'), NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      if (!tn.textContent.trim()) continue;
      const el = tn.parentElement, cs = getComputedStyle(el);
      if (cs.visibility === 'hidden' || !visible(el)) continue;
      const range = document.createRange(); range.selectNodeContents(tn);
      const rr = [...range.getClientRects()].filter((r) => r.width > 0);
      if (!rr.length) continue;
      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight, t = tn.textContent.trim();
      typeSeen[`${fs}/${fw}`] = (typeSeen[`${fs}/${fw}`] || 0) + 1;
      if (!(fs in TOK.type)) issues.push(`font size off: ${t} ${fs}`);
      else if (!TOK.type[fs].includes(fw)) issues.push(`font weight off: ${t} ${fs}/${fw}`);
      if (fs === 13 && !/tabular-nums/.test(cs.fontVariantNumeric)) issues.push(`not tabular: ${t}`);
      rr.forEach((r) => {
        const chip = el.closest('.chip');
        if (chip && !nameShown(chip)) return;
        const hint = chip && nameState(chip).s === 'hint';
        texts.push({ t, fs, color: cs.color, r: R(r), onGlass: !!el.closest('.glass'), mask: hint ? maskStops.map((x) => ({ a: x.a, x: x.x })) : null });
        if (r.left < S - eps || r.right > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (r.bottom > H - B + eps) issues.push(`text in bottom inset: ${t}`);
      });
    }
    // icons
    document.querySelectorAll('.ui svg.i').forEach((s) => {
      if (!s.getClientRects().length) return;
      const r = s.getBoundingClientRect();
      if (!near(r.width, 16) || !near(r.height, 16)) issues.push(`icon size ${r.width}x${r.height}`);
    });
    // hit boxes
    const taps = [...document.querySelectorAll('.tap')].filter(visible).map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const hw = parseFloat(ps.width), hh = parseFloat(ps.height);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e;
      const y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      const hit = { x0, x1: x0 + hw, y0, y1: y0 + hh };
      if (e.classList.contains('chip')) { hit.x0 = Math.max(hit.x0, strip.left); hit.x1 = Math.min(hit.x1, strip.right); }   // the strip clips its chips (and their hit testing)
      return { el: e, label: (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), vis: R(r), hit };
    }).filter((t) => !t.el.classList.contains('chip') || t.vis.x1 > strip.left);   // chips scrolled out of the strip are not on screen
    taps.forEach((t) => {
      const h = t.hit, v = t.vis;
      const clipped = t.el.classList.contains('chip') && (t.vis.x0 < strip.left || t.vis.x1 > strip.right);
      if (clipped) return;   // partly scrolled out at the strip's faded end
      if (h.x1 - h.x0 < 44 - eps || h.y1 - h.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      if (h.x0 > v.x0 + 0.04 || h.x1 < v.x1 - 0.04 || h.y0 > v.y0 + 0.04 || h.y1 < v.y1 - 0.04) issues.push(`hit box does not cover: ${t.label}`);
      if (!t.el.classList.contains('chip') || t.vis.x0 > strip.left) {
        if (h.x0 < S - eps || h.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      }
      if (h.y1 > H - B + 0.04 || h.y0 < -eps) issues.push(`tap in bottom inset/off top: ${t.label} ${h.y0.toFixed(1)}..${h.y1.toFixed(1)}`);
    });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) {
      const a = taps[i].hit, b = taps[j].hit;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
      if (ox > 0.05 && oy > 0.05) issues.push(`hit overlap ${taps[i].label} / ${taps[j].label}`);
    }
    // blocks must not overlap
    const blocks = ['.top', '.search', '.sel', '.bottom'].map((s) => ({ s, r: q(s).getBoundingClientRect() }));
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i].r, b = blocks[j].r;
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0) issues.push(`overlap ${blocks[i].s} / ${blocks[j].s}`);
    }
    // clipped text inside the card / header / chips
    document.querySelectorAll('.ui .glass *, .next *').forEach((e) => {
      if (e.closest('.frost') || !visible(e) || e.tagName === 'svg' || e.closest('svg')) return;
      const r = e.getBoundingClientRect(), p = e.parentElement.getBoundingClientRect();
      if (e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflow !== 'visible') issues.push(`overflow: ${e.className}`);
      const chip = e.closest('.strip > .chip.glass');
      if (r.width && (r.left < p.left - 0.5 || r.right > p.right + 0.5) && !e.classList.contains('frost') && (!chip || (inStrip(chip.getBoundingClientRect()) && nameShown(chip)))) issues.push(`sticks out of parent: ${e.className || e.tagName} ${e.textContent.trim().slice(0, 20)}`);
      if (getComputedStyle(e).textOverflow === 'ellipsis') issues.push(`ellipsis: ${e.className}`);
    });
    // Egypt fully visible (inside the safe area) and not under any panel, with air around it
    const eg = window.__map.egypt;
    qa('.ui .glass, .next').forEach((g) => { const o = g.getBoundingClientRect(); if (!(eg.x1 <= o.left || eg.x0 >= o.right || eg.y1 <= o.top || eg.y0 >= o.bottom)) issues.push(`Egypt under ${g.className}`); });
    if (eg.x0 < S || eg.x1 > W - S || eg.y0 < 0 || eg.y1 > H - B) issues.push('Egypt not fully on screen');
    {
      const c = q('.sel').getBoundingClientRect();
      if (c.left - eg.x1 < 12 - eps) issues.push(`Egypt too close to the card: ${(c.left - eg.x1).toFixed(1)} pt`);
      if (c.left < S - eps || c.right > W - S + eps || c.top < 0 || c.bottom > H - B + eps) issues.push('card not fully in the safe area');
    }
    // the map covers the whole screen (no empty backdrop at an edge)
    {
      const m = window.__map;
      if (m.L > eps || m.T > eps || m.L + 2400 * m.s < W - eps || m.T + 1202 * m.s < H - eps) issues.push('map does not cover the screen');
    }
    // the lead line from Egypt to the card crosses no other panel
    {
      const ln = document.getElementById('leadLine'), y = +ln.getAttribute('y1'), xa = Math.min(+ln.getAttribute('x1'), +ln.getAttribute('x2')), xb = Math.max(+ln.getAttribute('x1'), +ln.getAttribute('x2'));
      ['.top', '.search', '.bottom'].forEach((s) => { const o = q(s).getBoundingClientRect(); if (y >= o.top && y <= o.bottom && xb > o.left && xa < o.right) issues.push(`lead line crosses ${s}`); });
      if (Math.abs(xb - q('.sel').getBoundingClientRect().left) > 0.5) issues.push('lead line does not reach the card');
    }
    // every panel stays inside the safe area, clear of the drawn camera cutout and of the rounded screen corners
    {
      const C = d.cutout === 'none' ? 0 : 39;
      const cut = d.cutout === 'island' ? { x0: 11, x1: 48, y0: H / 2 - 63, y1: H / 2 + 63 } : d.cutout === 'notch' ? { x0: 0, x1: 30, y0: H / 2 - 105, y1: H / 2 + 105 } : null;
      const boxes = [...['.top', '.search', '.sel', '.next'].map((s) => [s, q(s)]), ...qa('.chip').filter((c) => inStrip(c.getBoundingClientRect())).map((c) => ['chip ' + c.textContent.trim().slice(0, 10), c])];
      boxes.forEach(([s, e]) => {
        const r = e.getBoundingClientRect();
        if (r.left < S - eps || r.right > W - S + eps || r.top < -eps || r.bottom > H - B + eps) issues.push(`outside the safe area: ${s}`);
        if (cut && r.left < cut.x1 + 8 && r.right > cut.x0 - 8 && r.top < cut.y1 + 8 && r.bottom > cut.y0 - 8) issues.push(`crowds the ${d.cutout}: ${s}`);
        if (C) [[r.left, r.top, C, C], [r.right, r.top, W - C, C], [r.left, r.bottom, C, H - C], [r.right, r.bottom, W - C, H - C]].forEach(([x, yy, cx, cy]) => {
          const inZone = (x < C && yy < C) || (x > W - C && yy < C) || (x < C && yy > H - C) || (x > W - C && yy > H - C);
          if (inZone && Math.hypot(x - cx, yy - cy) > C - 4) issues.push(`in a rounded screen corner: ${s}`);
        });
      });
    }
    // nothing that takes touches (scrollers and panels included, not only the 44 pt boxes) reaches into the bottom inset
    document.querySelectorAll('.ui, .ui *').forEach((e) => {
      if (e.closest('svg') || e.closest('.frost') || !visible(e) || getComputedStyle(e).pointerEvents === 'none') return;
      const r = e.getBoundingClientRect();
      if (r.width && r.height && r.bottom > H - B + 0.04) issues.push(`touchable box in the bottom inset: ${e.className || e.tagName} to ${r.bottom.toFixed(1)}`);
    });
    // header: back, steps and context keep at least 8 pt between them
    {
      const bk = q('.back').getBoundingClientRect(), st = q('.steps').getBoundingClientRect(), cx = q('.ctx');
      if (bk.left - st.right < 8 - eps) issues.push(`header: back too close to the steps (${(bk.left - st.right).toFixed(1)})`);
      if (visible(cx)) { const c = cx.getBoundingClientRect(); if (st.left - c.right < 8 - eps) issues.push(`header: context too close to the steps (${(st.left - c.right).toFixed(1)})`); }
    }
    // search field stays usable: wide enough, its placeholder and count fully inside and apart
    {
      const sr = q('.search').getBoundingClientRect(), ph = q('.search .ph').getBoundingClientRect(), cn = q('.search .cnt').getBoundingClientRect();
      if (sr.width < 200) issues.push(`search field too narrow: ${sr.width}`);
      [ph, cn].forEach((r, i) => { if (r.left < sr.left + 1 || r.right > sr.right - 1) issues.push(`search ${i ? 'count' : 'placeholder'} clipped`); });
      if (ph.left - cn.right < 8 - eps) issues.push('search placeholder runs into the count');
    }
    // the strip signals that it scrolls: more chips than fit, and one chip shows partly in the faded RTL end
    {
      const cs = qa('.chip').map((c) => c.getBoundingClientRect());
      if (!cs.some((r) => r.left < strip.left - eps)) issues.push('strip: every chip fits, nothing scrolls');
      if (!cs.some((r) => alphaAt(Math.max(r.left, strip.left)) < 0.999 && alphaAt(Math.min(r.right, strip.right)) > 0.1)) issues.push('strip: no chip runs into the fade (scrolling not signalled)');
      const sel = q('.chip.on');
      if (!inStrip(sel.getBoundingClientRect()) || nameState(sel).s !== 'shown') issues.push('strip: the selected chip is not fully shown');
      // no name fades across: it is shown, a readable hint, or fully out
      qa('.chip').forEach((c) => { const n = nameState(c); if (n.s === 'cut') issues.push(`strip: the fade cuts across a name: ${c.querySelector('.nm').textContent} (alpha ${n.aL.toFixed(2)}..${n.aR.toFixed(2)})`); });
      audit.stripEnd = qa('.chip').map((c) => [c.querySelector('.nm').textContent, nameState(c)]).filter(([, n]) => n.s !== 'shown' && (n.aR > 0 || n.aL > 0)).map(([t, n]) => `${t} ${n.s} ${n.aL.toFixed(2)}..${n.aR.toFixed(2)}`);
    }
    // map names (overlay) that stay drawn must not be cut by the top edge of the bottom row, nor show inside the
    // strip's clear/faded end at the chips' height (where they read as a chip's name): uses the page's ink boxes
    {
      const m = window.__map, chip = q('.strip .chip').getBoundingClientRect(), nx = q('.next').getBoundingClientRect();
      // names actually taken out: read back from the overlay's computed mask (holes in the shape of those names)
      const mk = getComputedStyle(q('.map img.ov')).maskImage, hid = new Set();
      if (mk && mk !== 'none') { const svg = decodeURIComponent(mk.replace(/^url\("data:image\/svg\+xml,/, '').replace(/"\)$/, '')); (svg.match(/<text[^>]*>[^<]*<\/text>/g) || []).forEach((t) => hid.add(t.replace(/<[^>]*>/g, ''))); }
      const cv = document.createElement('canvas').getContext('2d');
      let fadeEnd = strip.left; for (let x = strip.left; x < strip.right; x += 1) { if (alphaAt(x) >= 0.999) { fadeEnd = x; break; } }
      if (!Array.isArray(window.LABELS) || !window.LABELS.length) issues.push('map names not checked: the page has no label table (LABELS)');
      (window.LABELS || []).forEach((lb) => {
        if (hid.has(lb[3])) return;
        cv.font = '700 ' + lb[2] + 'px ' + window.LABEL_FONT; cv.textAlign = 'center';
        const tm = cv.measureText(lb[3]), h = 2 * m.s;
        const x0 = m.L + (lb[0] - tm.actualBoundingBoxLeft) * m.s, x1 = m.L + (lb[0] + tm.actualBoundingBoxRight) * m.s;
        const y0 = m.T + (lb[1] - tm.actualBoundingBoxAscent) * m.s, y1 = m.T + (lb[1] + tm.actualBoundingBoxDescent) * m.s;
        const cut = (a, b, edge) => x1 + h > a && x0 - h < b && y0 < edge - 1 && y1 > edge + 4;
        if (cut(fadeEnd - 64, strip.right, chip.top) || cut(nx.left, nx.right, nx.top)) issues.push(`map name cut by the bottom row: ${lb[3]}`);
        if (x1 + h > strip.left && x0 - h < fadeEnd && y1 > chip.top + 4 && y0 < chip.bottom - 4) issues.push(`map name inside the strip's faded end: ${lb[3]}`);
      });
      audit.mapNamesHidden = [...hid];
    }
    // no two text runs overlap (rects trimmed by 20% top and bottom: line boxes of stacked lines may touch)
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].r, b = texts[j].r, ia = a.h * 0.2, ib = b.h * 0.2;
      const ox = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), oy = Math.min(a.y1 - ia, b.y1 - ib) - Math.max(a.y0 + ia, b.y0 + ib);
      if (ox > 0.5 && oy > 0.5 && !(near(a.x0, b.x0) && near(a.y0, b.y0) && texts[i].t === texts[j].t)) issues.push(`text overlap: ${texts[i].t} / ${texts[j].t}`);
    }
    audit.layout = Object.fromEntries(blocks.map((b) => [b.s, R(b.r)]));
    audit.map = window.__map; audit.card = window.__card; audit.fit = window.__fit;
    audit.chipsShown = qa('.chip').filter((c) => nameState(c).s === 'shown').length;
    return { issues, audit, typeSeen, texts };
  }, { d, TOK });
}

async function contrast(p, texts) {
  await p.addStyleTag({ content: '.ui *, .next * { color: transparent !important; text-shadow: none !important; } .ui svg, .ui .flag, .ui .meter, .dev { visibility: hidden !important; } .next { color: transparent !important; }' });
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
      if (!t.mask) return { t: t.t, fs: t.fs, worst: +Math.min(cr(lt, ls[ls.length - 1]), cr(lt, ls[0])).toFixed(2), p95: +cr(lt, ls[Math.floor(ls.length * 0.95)]).toFixed(2) };
      // a name in the strip's faded end: the mask fades the text as well, so each pixel's text colour is the text colour
      // blended with that pixel's backdrop by the mask alpha. Scored per pixel; the last 12 pt at the faded (left) end
      // is the scroll hint and is scored apart (the approved iPhone 17 Pro Max: about 3.2:1 there, 4.5:1 and up elsewhere).
      const st = t.mask, alpha = (x) => { if (x <= st[0].x) return st[0].a; for (let i = 1; i < st.length; i++) if (x <= st[i].x) return st[i].x === st[i - 1].x ? st[i].a : st[i - 1].a + (st[i].a - st[i - 1].a) * (x - st[i - 1].x) / (st[i].x - st[i - 1].x); return st[st.length - 1].a; };
      const body = [], tail = [];
      for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) {
        const i = (yy * w + xx) * 4, px = (x0 + xx + 0.5) / k, a = alpha(px);
        const bl = L(d[i], d[i + 1], d[i + 2]), tl = L(a * r + (1 - a) * d[i], a * gg + (1 - a) * d[i + 1], a * b + (1 - a) * d[i + 2]);
        (px < t.r.x0 + 12 ? tail : body).push(cr(tl, bl));
      }
      const p5 = (v) => { if (!v.length) return 99; v.sort((a, bb) => a - bb); return v[Math.floor(v.length * 0.05)]; };
      return { t: t.t, fs: t.fs, faded: true, p95: +p5(body).toFixed(2), tail12: +p5(tail).toFixed(2) };
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

async function selftest(b) {
  const d = ALL.find((x) => x.id === 'i14');
  const qs = `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 });
  const cases = [
    ['.card.sel { right: 300px !important; }', [/Egypt under card sel/, /Egypt too close to the card/, /lead line does not reach the card/]],
    ['.search { width: 150px !important; }', [/search field too narrow/]],
    ['.chip:nth-child(n+5) { display: none !important; }', [/strip: every chip fits/, /no chip runs into the fade/]],
    ['.bottom { bottom: 2px !important; }', [/outside the safe area: \.next/, /tap in bottom inset/]],
    ['.top { left: 4px !important; }', [/outside the safe area: \.top/, /in a rounded screen corner: \.top/, /text in side inset/]],
    ['.ctx { transform: translateX(200px); }', [/header: context too close to the steps/, /text overlap/]],
    ['.fact .v { font-size: 12px !important; } .sel .nm { text-overflow: ellipsis; overflow: hidden; }', [/font size off/, /ellipsis: nm/]],
    // the fade lands across a chip's name (as it did on iPhone 11 / 13 mini)
    ['.strip { -webkit-mask-image: linear-gradient(to right, rgba(0,0,0,0) 0, #000 120px) !important; mask-image: linear-gradient(to right, rgba(0,0,0,0) 0, #000 120px) !important; }', [/the fade cuts across a name: العراق/]],
    // the colliding map names are drawn again (no overlay mask)
    ['.map img.ov { -webkit-mask-image: none !important; mask-image: none !important; }', [/map name cut by the bottom row: نيجيريا/]],
  ];
  let failed = 0;
  for (const [css, want] of cases) {
    const p = await open(ctx, PAGE + qs);
    await p.addStyleTag({ content: css });
    await p.waitForTimeout(100);
    const m = await measure(p, d);
    const missed = want.filter((re) => !m.issues.some((i) => re.test(i)));
    if (missed.length) { failed++; console.log('NOT CAUGHT', css, missed.map(String), '\n  got:', m.issues.slice(0, 8)); }
    await p.close();
  }
  await ctx.close();
  console.log(failed ? `selftest FAILED (${failed} of ${cases.length})` : `selftest OK: all ${cases.length} planted defects were caught`);
}

(async () => {
  if (process.argv[2] === '--selftest') {
    const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
    await selftest(b); await b.close(); return;
  }
  const only = process.argv.slice(2).length ? process.argv.slice(2) : ['se', 'mini', 'i14', 'i16', 'i16pro', 'i11', 'i16promax'];
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const report = {};
  for (const id of only) {
    const d = ALL.find((x) => x.id === id);
    const qs = `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const p = await open(ctx, PAGE + qs);
    await p.screenshot({ path: path.join(OUT, id + '.png') });
    const m = await measure(p, d);
    const ph = await open(ctx, PAGE + qs + '&hit=1');
    await ph.screenshot({ path: path.join(__dirname, id + '_hit.png') });
    await ph.close();
    const cr = await contrast(p, m.texts);
    // names fully shown: 4.5:1. A name at the strip's faded end is a deliberately fading scroll hint; its bar is the
    // approved iPhone 17 Pro Max (اليمن / صعبة جدًا there: 4.26 over the name, 2.75 in its last 12 pt, measured this way)
    const low = cr.filter((c) => (c.faded ? c.p95 < 4.0 || c.tail12 < 2.5 : c.p95 < 4.5));
    low.forEach((c) => m.issues.push(c.faded ? `low contrast at the faded end ${c.p95} (last 12 pt ${c.tail12}): ${c.t}` : `low contrast ${c.p95}: ${c.t}`));
    report[id] = { issues: m.issues, lowContrast: low, audit: m.audit, typeSeen: m.typeSeen };
    console.log(`\n== ${id} ==`);
    console.log('issues:', m.issues.length ? m.issues : 'none');
    console.log('low contrast (p95 < 4.5):', low.length ? low : 'none');
    console.log('min contrast:', Math.min(...cr.map((c) => c.p95)).toFixed(2), 'type:', JSON.stringify(m.typeSeen));
    const fadedC = cr.filter((c) => c.faded); if (fadedC.length) console.log('faded-end names (p95 body / last 12 pt):', JSON.stringify(fadedC));
    m.audit.fadedContrast = fadedC;
    console.log('audit:', JSON.stringify(m.audit));
    await ctx.close();
  }
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 1));
  await b.close();
})();
