// Screen 4 variant C (province panel as a compact card that expands): render and check.
// Usage: NODE_PATH=.../tools/node_modules node render.js [ids...] [--selftest]
//   ids: devices from shared/devices.json (default: i16promax se). The expanded sheet is rendered for i16promax.
//   --selftest: only plant known defects on i16promax and prove the checks catch them (no PNG written).
//   NOEXP=1 in the environment skips the three expanded renders while iterating.
// Writes <id>.png (and i16promax_expanded*.png) to the variant folder, <id>_hit.png and report.json to _build.
// Checks: D-3 opaque panels, control heights 32/36/44, radii 10/12, spacing 4/8/12, icon sizes, type sizes and
// weights, 44 pt hit boxes (cover, no overlap, not in the side insets, not in the bottom inset), panels and text
// inside the safe area, panel overlaps, clipped / ellipsised / wrapped text, content inside its box, contrast >= 4.5
// over the real rendered background, Cairo / delta / Egypt not covered, and the brief's content structure.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const argv = process.argv.slice(2);
const SELFTEST = argv.includes('--selftest');
const want = argv.filter((a) => !a.startsWith('--'));
const IDS = want.length ? want : ['i16promax', 'se'];
const DEVICES = IDS.map((id) => ALL.find((d) => d.id === id) || (() => { throw new Error('unknown device ' + id); })());
// expanded renders (i16promax): the sheet at the top, then scrolled to the details, then to the end
const EXPANDED = (process.env.NOEXP ? [] : [['i16promax_expanded', ''], ['i16promax_expanded_2', 'pv-details'], ['i16promax_expanded_3', 'end']]);
const TYPE = { 10: [500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] };

async function measure(p, d) {
  return p.evaluate(({ d, TYPE }) => {
    const R = (r) => ({ x0: +r.left.toFixed(2), y0: +r.top.toFixed(2), x1: +r.right.toFixed(2), y1: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    const issues = [], W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01;
    const root = document.documentElement, state = root.dataset.state;
    const shown = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(shown);
    const near = (a, b, t = 0.05) => Math.abs(a - b) < t;
    const hit2 = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.05 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.05;
    const bx = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    const prov = q('#prov'), body = q('#pv-body');
    // the scroll viewport (expanded sheet): content outside it is scrolled away, not clipped by mistake
    const scroller = getComputedStyle(body).overflowY !== 'visible' ? bx(body.getBoundingClientRect()) : null;
    // the soft edges (mask fades) of the scroller: content there is mid-scroll, counted as partly visible
    const fadeT = parseFloat(body.style.getPropertyValue('--fade-t')) || 0, fadeB = parseFloat(body.style.getPropertyValue('--fade-b')) || 0;
    const clipTo = (r, e) => {
      if (!scroller || !body.contains(e)) return { r, part: false, gone: false };
      const c = { x0: Math.max(r.x0, scroller.x0), x1: Math.min(r.x1, scroller.x1), y0: Math.max(r.y0, scroller.y0), y1: Math.min(r.y1, scroller.y1) };
      const gone = c.x1 - c.x0 <= 0.05 || c.y1 - c.y0 <= 0.05;
      const part = !gone && (c.y0 > r.y0 + 0.05 || c.y1 < r.y1 - 0.05 || r.y0 < scroller.y0 + fadeT - 0.05 || r.y1 > scroller.y1 - fadeB + 0.05);
      return { r: c, part, gone };
    };

    // ---- panels: D-3 opaque, one border, radius 12 (bars, cards) / 10 (controls), inside the safe area, no overlaps
    const panels = qa('.hud .glass').filter((g) => !g.classList.contains('menu'));
    panels.forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost');
      const tint = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      const name = g.id || g.className.split(' ')[0];
      if (tint !== 'rgb(12, 20, 28)') issues.push(`panel not opaque (D-3): ${name} ${tint}`);
      if (cs.backdropFilter !== 'none' && cs.backdropFilter) issues.push(`panel has backdrop blur: ${name}`);
      if (f && f.firstChild && getComputedStyle(f.firstChild).display !== 'none') issues.push(`panel shows the blurred map copy: ${name}`);
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== 'rgba(127, 233, 255, 0.14)') issues.push(`panel border ${name} ${cs.borderTopWidth} ${cs.borderTopColor}`);
      const rad = parseFloat(cs.borderTopLeftRadius), wantR = g.classList.contains('ctl') ? 10 : 12;
      if (!near(rad, wantR)) issues.push(`panel radius ${name} ${rad} (want ${wantR})`);
      const r = g.getBoundingClientRect();
      if (r.left < S - eps || r.right > W - S + eps) issues.push(`panel in side inset: ${name}`);
      if (r.bottom > H - B + eps || r.top < -eps) issues.push(`panel in bottom inset / off top: ${name}`);
    });
    for (let i = 0; i < panels.length; i++) for (let j = i + 1; j < panels.length; j++) {
      if (hit2(bx(panels[i].getBoundingClientRect()), bx(panels[j].getBoundingClientRect())))
        issues.push(`panels overlap: ${panels[i].id || panels[i].className.split(' ')[0]} / ${panels[j].id || panels[j].className.split(' ')[0]}`);
    }

    // ---- control heights 32 / 36 / 44 (a control drawn inside a bordered bar is that bar: e.g. HUD stat 34 in its 36 bar)
    const ctlH = (e) => {
      const h = e.getBoundingClientRect().height, g = e.closest('.glass');
      if (g && g !== e && near(g.getBoundingClientRect().height - 2, h)) return g.getBoundingClientRect().height;
      return h;
    };
    qa('.tap').forEach((e) => {
      const h = ctlH(e);
      if (![32, 36, 44].some((v) => near(v, h))) issues.push(`control height ${h.toFixed(2)}: ${(e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 24)}`);
    });
    // radii of the card's controls and chip: 10
    qa('#prov .x, #prov .less, #prov .more, #prov .act, #prov .chip').forEach((e) => {
      const r = parseFloat(getComputedStyle(e).borderTopLeftRadius);
      if (!near(r, 10)) issues.push(`control radius ${r} on ${e.className.split(' ')[0]}`);
    });
    // spacing in the card: gaps, paddings and margins on 0 / 4 / 8 / 12
    prov.querySelectorAll('*').forEach((e) => {
      if (!shown(e) || e.closest('.frost') || e.closest('svg')) return;
      const cs = getComputedStyle(e), vals = [];
      if (/flex|grid/.test(cs.display)) vals.push(['gap', cs.columnGap], ['gap', cs.rowGap]);
      ['Top', 'Right', 'Bottom', 'Left'].forEach((k) => vals.push(['padding', cs['padding' + k]], ['margin', cs['margin' + k]]));
      vals.forEach(([k, v]) => { const n = v === 'normal' ? 0 : parseFloat(v); if (![0, 4, 8, 12].some((s) => near(s, n))) issues.push(`${k} ${n} on ${e.className || e.tagName}`); });
    });
    { const cs = getComputedStyle(prov); ['Top', 'Right', 'Bottom', 'Left'].forEach((k) => { if (!near(parseFloat(cs['padding' + k]), 12)) issues.push('card padding ' + cs['padding' + k]); }); }
    // icons in the card: 16 pt, stroke 1.75; trend glyphs 10 pt
    qa('#prov svg.i').forEach((s) => { const r = s.getBoundingClientRect(); if (!near(r.width, 16) || !near(r.height, 16)) issues.push('icon size ' + r.width + 'x' + r.height); if (getComputedStyle(s).strokeWidth !== '1.75px') issues.push('icon stroke ' + getComputedStyle(s).strokeWidth); });
    qa('#prov svg.trend').forEach((s) => { const r = s.getBoundingClientRect(); if (!near(r.width, 10) || !near(r.height, 10)) issues.push('trend glyph size ' + r.width); });

    // ---- type, text placement, wrapping
    const typeSeen = {}, texts = [];
    let scrolledAway = 0, partial = 0;
    const walker = document.createTreeWalker(q('.hud'), NodeFilter.SHOW_TEXT);
    let tn;
    while ((tn = walker.nextNode())) {
      if (!tn.textContent.trim()) continue;
      const el = tn.parentElement, cs = getComputedStyle(el);
      if (!shown(el)) continue;
      const range = document.createRange(); range.selectNodeContents(tn);
      const rr = [...range.getClientRects()].filter((r) => r.width > 0);
      if (!rr.length) continue;
      const fs = parseFloat(cs.fontSize), fw = +cs.fontWeight, t = tn.textContent.trim();
      const tops = new Set(rr.map((r) => Math.round(r.top)));
      if (tops.size > 1) issues.push(`text wraps to ${tops.size} lines: ${t.slice(0, 24)}`);
      rr.forEach((r0) => {
        const c = clipTo(bx(r0), el);
        if (c.gone) { scrolledAway++; return; }
        if (c.part) { partial++; return; }
        typeSeen[`${fs}/${fw}`] = (typeSeen[`${fs}/${fw}`] || 0) + 1;
        if (!(fs in TYPE)) issues.push(`font size ${fs} for "${t}"`);
        else if (!TYPE[fs].includes(fw)) issues.push(`font weight ${fs}/${fw} for "${t}"`);
        if (fs === 18 && !el.classList.contains('pn')) issues.push(`18 pt used outside the province name: ${t}`);
        const r = r0;
        texts.push({ t, fs, color: cs.color, r: R(r) });
        if (r.left < S - eps || r.right > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (r.bottom > H - B + eps) issues.push(`text in bottom inset: ${t}`);
        if (r.left < 0 || r.right > W || r.top < 0) issues.push(`text off screen: ${t}`);
      });
    }
    // card text and icons inside the card's content box; control content inside its control / cell
    const pr = prov.getBoundingClientRect(), pcs = getComputedStyle(prov);
    const content = { x0: pr.left + parseFloat(pcs.borderLeftWidth) + parseFloat(pcs.paddingLeft), x1: pr.right - parseFloat(pcs.borderRightWidth) - parseFloat(pcs.paddingRight),
      y0: pr.top + parseFloat(pcs.borderTopWidth) + parseFloat(pcs.paddingTop), y1: pr.bottom - parseFloat(pcs.borderBottomWidth) - parseFloat(pcs.paddingBottom) };
    // inline text: its glyph boxes; a box (flex / grid / block container), an icon or an image: its own border box
    const boxOf = (e) => { if (e.tagName === 'svg' || e.tagName === 'IMG' || getComputedStyle(e).display !== 'inline') return e.getBoundingClientRect(); const r = document.createRange(); r.selectNodeContents(e); return r.getBoundingClientRect(); };
    prov.querySelectorAll('span, b, h2, h3, dt, dd, p, svg, img').forEach((e) => {
      if (!shown(e) || e.closest('.frost') || e.classList.contains('sthumb') || (e.parentElement && e.parentElement.closest('svg'))) return;
      const b0 = boxOf(e); if (!b0.width) return;
      // a text's range box is the font's content area (ascent + descent), taller than its line box: compare the line box
      const lh = e.tagName === 'svg' || e.tagName === 'IMG' || getComputedStyle(e).display !== 'inline' ? b0.height : parseFloat(getComputedStyle(e).lineHeight) || b0.height;
      const dy = Math.max(0, (b0.height - lh) / 2);
      const b = { left: b0.left, right: b0.right, top: b0.top + dy, bottom: b0.bottom - dy, width: b0.width, height: b0.height - 2 * dy };
      const c = clipTo(bx(b), e); if (c.gone || c.part) return;
      const lbl = (e.textContent || e.tagName).trim().slice(0, 24);
      if (b.left < content.x0 - 0.5 || b.right > content.x1 + 0.5 || b.top < content.y0 - 0.5 || b.bottom > content.y1 + 0.5)
        issues.push(`outside the card's content box: ${lbl} ${R(b).x0}..${R(b).x1} y ${R(b).y0}..${R(b).y1}`);
      const box = e.parentElement.closest('.act, .kpi, .x, .less, .more, .chip, .kv > div, .grp, .sline, .pc, .pnr');
      if (box && box !== e) {
        const k = box.getBoundingClientRect(), pad = box.matches('.act') ? 7.95 : 0;
        if (b.left < k.left + pad - 0.5 || b.right > k.right - pad + 0.5 || b.top < k.top - 0.5 || b.bottom > k.bottom + 0.5)
          issues.push(`content outside its box (${box.className.split(' ')[0] || box.tagName}): ${lbl} ${R(b).x0}..${R(b).x1} / ${R(k).x0}..${R(k).x1}`);
      }
    });
    // no clipped or ellipsised text (the expanded body is the one intended vertical scroller)
    q('.hud').querySelectorAll('*').forEach((e) => {
      if (!shown(e) || e.closest('.frost') || !e.textContent.trim()) return;
      const cs = getComputedStyle(e);
      if (cs.textOverflow === 'ellipsis') issues.push(`ellipsis on: ${e.textContent.trim().slice(0, 24)}`);
      if (!/hidden|clip|scroll|auto/.test(cs.overflowX + cs.overflowY)) return;
      if (e === body && scroller) { if (e.scrollWidth > e.clientWidth + 1) issues.push('expanded body scrolls sideways'); return; }
      if (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1) issues.push(`clipped content in ${e.className || e.tagName}: ${e.textContent.trim().slice(0, 24)}`);
    });
    // children wider than their flex / grid cell (a nowrap text pushed out of its row)
    prov.querySelectorAll('.at > span, .kv > div, .grp > div, .kpi, .sline, .pnr, .pc').forEach((e) => {
      if (!shown(e)) return;
      if (e.scrollWidth > e.clientWidth + 1) issues.push(`overflows its cell: ${e.className || e.tagName} ${e.textContent.trim().slice(0, 20)}`);
    });

    // ---- hit boxes (the ::before box of every .tap), clipped to the scroll viewport where they live in it
    const taps = [...document.querySelectorAll('.tap')].filter(shown).map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const hw = parseFloat(ps.width), hh = parseFloat(ps.height);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e;
      const y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      const hit = clipTo({ x0, x1: x0 + hw, y0, y1: y0 + hh }, e), vis = clipTo(bx(r), e);
      return { label: (e.getAttribute('aria-label') || e.textContent).trim().replace(/\s+/g, ' ').slice(0, 24), vis: vis.r, hit: hit.r, gone: vis.gone, part: vis.part, full: { x0, x1: x0 + hw, y0, y1: y0 + hh } };
    }).filter((t) => !t.gone);
    const lu = 1 / 32;
    taps.forEach((t) => {
      const h = t.hit, v = t.vis, f = t.full;
      if (f.x1 - f.x0 < 44 - eps || f.y1 - f.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      if (h.x0 > v.x0 + lu || h.x1 < v.x1 - lu || h.y0 > v.y0 + lu || h.y1 < v.y1 - lu) issues.push(`hit box does not cover: ${t.label}`);
      if (h.x0 < S - eps || h.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      if (h.y1 > H - B + lu || h.y0 < -eps) issues.push(`tap in bottom inset / off top: ${t.label} ${h.y0.toFixed(1)}..${h.y1.toFixed(1)}`);
    });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) {
      if (hit2(taps[i].hit, taps[j].hit)) issues.push(`hit overlap ${taps[i].label} / ${taps[j].label}`);
    }

    // ---- map: Cairo highlight, the delta and Egypt stay clear of every panel (and of every hit box, for Cairo)
    const M = window.__map, cairo = q('#cairo').getBoundingClientRect(), cb = bx(cairo);
    const ex = M.cairo;
    if (!near(cb.x0, ex.x0, 1.5) || !near(cb.x1, ex.x1, 1.5) || !near(cb.y0, ex.y0, 1.5) || !near(cb.y1, ex.y1, 1.5)) issues.push('Cairo outline is not where the map boxes say');
    const sel = getComputedStyle(q('#cairo'));
    if (sel.stroke !== 'rgb(63, 224, 208)') issues.push('Cairo outline is not teal: ' + sel.stroke);
    if (cb.x0 < S || cb.x1 > W - S || cb.y0 < 0 || cb.y1 > H - B) issues.push('Cairo outside the safe area');
    const panelBoxes = panels.map((g) => ({ n: g.id || g.className.split(' ')[0], b: bx(g.getBoundingClientRect()) }));
    panelBoxes.forEach((p) => {
      if (hit2(cb, p.b)) issues.push(`Cairo highlight covered by ${p.n}`);
      if (hit2(M.delta, p.b)) issues.push(`Nile delta covered by ${p.n}`);
      if (hit2(M.egypt, p.b)) issues.push(`Egypt covered by ${p.n}`);
    });
    taps.forEach((t) => { if (hit2(cb, t.hit)) issues.push(`Cairo under the hit box of ${t.label}`); });
    if (M.delta.x0 < S || M.delta.x1 > W - S || M.delta.y0 < 0 || M.delta.y1 > H - B) issues.push('delta outside the safe area');

    // ---- the brief's content and RTL placement
    const hudR = q('.hud').getBoundingClientRect(), topRow = q('.top').getBoundingClientRect(), dock = q('.dock').getBoundingClientRect();
    if (!near(pr.right, hudR.right, 0.5)) issues.push('card is not at the RTL start (right safe edge)');
    if (pr.top < topRow.bottom + 11.95) issues.push('card closer than 12 pt to the top row');
    if (hit2(bx(pr), bx(dock)) || (pr.left < dock.right && pr.right > dock.left && pr.bottom > dock.top - 11.95)) issues.push('card closer than 12 pt to the dock');
    const pn = q('#pv-name');
    if (!pn || pn.textContent.trim() !== 'القاهرة' || parseFloat(getComputedStyle(pn).fontSize) !== 18 || +getComputedStyle(pn).fontWeight !== 700) issues.push('province name');
    const chip = q('#prov .chip');
    if (!chip || !shown(chip) || chip.textContent.trim() !== 'العاصمة' || !chip.querySelector('use[href="#i-star"]')) issues.push('capital star chip');
    const flag = q('#prov .pflag img'), fr = flag && flag.getBoundingClientRect();
    if (!flag || !/flags\/eg\.svg$/.test(flag.getAttribute('src')) || !near(fr.width / fr.height, 4 / 3, 0.01) || !flag.complete || !flag.naturalWidth) issues.push('flag of Egypt (4:3)');
    if (q('#prov .pc').textContent.trim() !== 'مصر') issues.push('country line');
    const xb = q('#prov .x');
    if (!xb || !shown(xb) || xb.getAttribute('aria-label') !== 'إغلاق') issues.push('close button');
    const hdrKids = [...q('#prov .ph').querySelectorAll('.pt, .x')].map((e) => e.getBoundingClientRect());
    if (hdrKids.length === 2 && !(hdrKids[1].right <= hdrKids[0].left + 0.5)) issues.push('close button is not at the RTL end of the header');
    const kpis = qa('#prov .kpi');
    if (kpis.length !== 3) issues.push('headline numbers: ' + kpis.length);
    kpis.forEach((k, i) => {
      if (!k.querySelector('svg.trend')) issues.push('number without trend arrow ' + i);
      const w = k.querySelector('.why'); if (!w || w.textContent.trim() !== 'لماذا؟') issues.push('number without «لماذا؟» ' + i);
      const kr = k.getBoundingClientRect(); const c = clipTo(bx(kr), k); if (c.gone || c.part) { if (state === 'compact') issues.push('number not fully visible ' + i); }
    });
    const unrest = kpis[1] && kpis[1].querySelector('svg.trend');
    if (unrest && getComputedStyle(unrest).color !== 'rgb(242, 177, 76)') issues.push('unrest arrow not amber');
    const acts = qa('#prov .act');
    acts.forEach((a, i) => { if (!a.querySelector('.ac') || !a.querySelector('.eff')) issues.push('action without cost or effect ' + i); });
    if (state === 'compact') {
      if (acts.length !== 1) issues.push('compact card should show exactly the first action, shows ' + acts.length);
      const ar = acts[0] && acts[0].getBoundingClientRect();
      if (!ar || !(ar.top >= content.y0 - 0.5 && ar.bottom <= content.y1 + 0.5 && ar.bottom <= H - B)) issues.push('first action not visible without scrolling');
      const more = q('#prov .more');
      if (!more || !shown(more) || more.textContent.trim() !== 'التفاصيل') issues.push('«التفاصيل» control missing');
      const sl = q('#pv-sline');
      if (!sl || !shown(sl)) issues.push('status line missing');
      if (body.scrollHeight > body.clientHeight + 1) issues.push('compact card body needs scrolling');
    } else {
      const all = [...document.querySelectorAll('#prov .act')].filter((e) => e.getClientRects().length);
      if (all.length !== 3) issues.push('expanded sheet should hold 3 actions, holds ' + all.length);
      const sheetW = window.__sheet.w;
      if (!near(pr.width, sheetW, 0.1)) issues.push(`sheet width ${pr.width} != ${sheetW}`);
      if (q('.less') && !shown(q('.less'))) issues.push('collapse control missing');
      const kv = [...document.querySelectorAll('#pv-status .kv > div')].map((e) => e.textContent.replace(/\s+/g, ' ').trim());
      if (kv.length !== 4) issues.push('status fields: ' + kv.length);
    }
    const legit = [...document.querySelectorAll('#prov .eff')].find((e) => /شرعية/.test(e.textContent));
    if (legit && getComputedStyle(legit).color !== 'rgb(242, 177, 76)') issues.push('legitimacy cost not amber');

    return { issues, state, typeSeen, texts, scrolledAway, partial, fit: window.__fit, map: window.__map, sheet: window.__sheet, scroll: window.__scroll || null,
      sline: root.dataset.sline, gochev: root.dataset.gochev,
      card: R(pr), panels: panelBoxes.map((p) => ({ n: p.n, ...Object.fromEntries(Object.entries(p.b).map(([k, v]) => [k, +v.toFixed(1)])) })),
      hits: taps.map((t) => ({ l: t.label, ...Object.fromEntries(Object.entries(t.hit).map(([k, v]) => [k, +v.toFixed(1)])) })) };
  }, { d, TYPE });
}

// Contrast: hide every text (and the icons and decorations that sit next to text), screenshot the real
// rendered background, then compare each text colour with the worst pixel under its glyph band.
async function contrast(p, texts) {
  const tag = await p.addStyleTag({ content: '.hud, .hud * { color: transparent !important; text-shadow: none !important; } .hud svg, .dev, .sthumb, .mix { visibility: hidden !important; } .leg > span::before, .kpi::after, .stat::after { opacity: 0 !important; }' });
  await p.waitForTimeout(150);
  const buf = await p.screenshot({ scale: 'css' });
  await tag.evaluate((n) => n.remove());
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
  await p.waitForTimeout(400);
  return p;
}

async function check(p, d) {
  const m = await measure(p, d);
  const c = await contrast(p, m.texts);
  c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} for "${x.t}"`));
  m.contrastMin = Math.min(...c.map((x) => x.worst));
  m.contrast = c;
  return m;
}

function log(name, d, m) {
  console.log(`\n== ${name} ${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout} [${m.state}]`);
  console.log('card', JSON.stringify(m.card), 'sline', m.sline, 'chevron', m.gochev, 'map tier', m.map.tier, 'scroll', JSON.stringify(m.scroll));
  console.log('cairo', JSON.stringify(m.map.cairo), 'delta', JSON.stringify(m.map.delta));
  console.log('type', JSON.stringify(m.typeSeen), 'scrolled away', m.scrolledAway, 'partly visible', m.partial);
  console.log('contrast min', m.contrastMin, [...m.contrast].sort((a, b) => a.worst - b.worst).slice(0, 4).map((x) => `${x.t}:${x.worst}`).join(' | '));
  console.log(m.issues.length ? 'ISSUES:\n  ' + m.issues.join('\n  ') : 'no issues');
}

// Plant known defects on a clean page and prove each one is reported.
async function selftest(b) {
  const d = ALL.find((x) => x.id === 'i16promax');
  const qs = `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 });
  const p = await open(ctx, PAGE + qs);
  const clean = await check(p, d);
  await p.evaluate(() => {
    const css = document.createElement('style');
    css.textContent = [
      '#prov .kpi:nth-child(1) .lbl { font-size: 12px !important; }',                       // type size
      '#prov .more { height: 40px !important; }',                                            // control height
      '#prov .act { border-radius: 6px !important; }',                                       // radius
      '#prov .kpi:nth-child(3) .why { color: #2A3642 !important; }',                         // contrast
      '#prov .an { display: block; max-width: 30px; overflow: hidden; text-overflow: ellipsis; }', // clipped + ellipsis
      '#prov .acts { margin-top: 6px !important; }',                                         // spacing
      '#prov .frost::after { background: rgba(9, 17, 25, 0.66) !important; }',               // not opaque
      '#prov .more { margin-top: 0 !important; }',                                           // hit boxes overlap (action / details)
    ].join('\n');
    document.head.appendChild(css);
    const t = document.createElement('button'); t.className = 'tap planted'; t.textContent = 'x';   // a tap inside the side inset
    t.style.cssText = 'position:absolute; left:20px; top:200px; width:32px; height:32px; font-size:13px; font-weight:600; color:#EAF2F7; z-index:60;';
    document.body.appendChild(t);
    const u = t.cloneNode(true); u.textContent = 'y';                                        // a tap inside the bottom inset
    u.style.left = '400px'; u.style.top = (innerHeight - 30) + 'px'; document.body.appendChild(u);
    const prov = document.getElementById('prov'), hud = document.querySelector('.hud').getBoundingClientRect();
    prov.style.right = (hud.right - window.__map.cairo.x1 - 20) + 'px';                     // card moved over Cairo
  });
  await p.waitForTimeout(200);
  const bad = await check(p, d);
  await ctx.close();
  const planted = [
    ['type size', /font size 12/],
    ['control height', /control height 40/],
    ['control radius', /control radius 6/],
    ['contrast', /contrast [\d.]+ for "لماذا؟"/],
    ['clipped / ellipsised text', /ellipsis on|clipped content/],
    ['spacing', /margin 6/],
    ['opaque panel (D-3)', /panel not opaque/],
    ['tap in side inset', /tap in side inset: x/],
    ['Cairo covered', /Cairo highlight covered by prov/],
    ['delta covered', /Nile delta covered by prov/],
    ['panel overlap', /panels overlap/],
    ['hit boxes overlap', /hit overlap مشروع بنية تحتية.*\/ التفاصيل/],
    ['tap in bottom inset', /tap in bottom inset \/ off top: y/],
  ];
  const res = planted.map(([n, re]) => ({ defect: n, caught: bad.issues.some((i) => re.test(i)) }));
  const ok = clean.issues.length === 0 && res.every((r) => r.caught);
  console.log('\n== selftest: clean page issues', clean.issues.length, clean.issues.slice(0, 5));
  res.forEach((r) => console.log(`  ${r.caught ? 'caught ' : 'MISSED '} ${r.defect}`));
  console.log('selftest', ok ? 'PASS' : 'FAIL', `(${bad.issues.length} issues on the defective page)`);
  return { ok, cleanIssues: clean.issues.length, planted: res, defectiveIssues: bad.issues };
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let report = {};
  try { report = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8')); } catch (e) { report = {}; }
  if (SELFTEST) {
    report.selftest = { ranAt: new Date().toISOString(), ...(await selftest(b)) };
  } else {
    for (const d of DEVICES) {
      const qs = `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
      const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
      const runs = [[d.id, '']].concat(d.id === 'i16promax' ? EXPANDED.map(([n, s]) => [n, '&state=expanded' + (s ? '&scroll=' + s : '')]) : []);
      for (const [name, extra] of runs) {
        const p = await open(ctx, PAGE + qs + extra);
        await p.screenshot({ path: path.join(OUT, name + '.png') });
        const m = await check(p, d);
        await p.close();
        if (name === d.id) {
          const ph = await open(ctx, PAGE + qs + extra + '&hit=1');
          await ph.screenshot({ path: path.join(__dirname, name + '_hit.png') });
          await ph.close();
        }
        report[name] = { device: `${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`, renderedAt: new Date().toISOString(), issueCount: m.issues.length, ...m };
        log(name, d, m);
      }
      await ctx.close();
    }
  }
  const order = ALL.map((d) => d.id).concat(EXPANDED.map((e) => e[0]), ['selftest']);
  const ordered = {};
  order.forEach((k) => { if (report[k]) ordered[k] = report[k]; });
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(ordered, null, 1));
  console.log('\nissues:', Object.entries(ordered).filter(([k]) => k !== 'selftest').map(([k, v]) => `${k} ${v.issues.length}`).join(', '));
  await b.close();
})();
