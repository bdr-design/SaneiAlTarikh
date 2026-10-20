// Screen 4 variant A (province panel as a tabbed side sheet): render the given iPhones (default: i16promax se)
// and run the checks. Writes <id>.png to the variant folder, <id>_hit.png and report.json to _build.
// Checks: opaque panels (D-3), control heights 32/36/44, radii 10/12, spacing 4/8/12, icons, type sizes and weights,
// 44 pt hit boxes (no overlap), side safe insets, nothing tappable in the bottom inset, panel overlaps, text over
// text and icons over text, clipped or ellipsised text, % after its digits, contrast >= 4.5:1 over the real rendered
// backdrop, the sheet geometry (pinned action card: whole rows, no blank band), every HUD element at its exact place
// and size on the play screen B3 (loaded side by side), the brief's content (trend glyphs and colours, chevrons),
// that Cairo's highlight (and the delta, and Egypt) is not covered by any panel or hit box, and no map label cut by
// a panel edge.
// Usage: NODE_PATH=.../node_modules node render.js [ids...] [--tabs]   |   node render.js --selftest  (i16promax and se)
//   --tabs also renders the other three tabs on the 17 Pro Max to _build/i16promax_tab_<name>.png and checks them.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest'), TABS = args.includes('--tabs');
const want = args.filter((a) => !a.startsWith('--'));
const IDS = want.length ? want : ['i16promax', 'se'];
const DEVICES = IDS.map((id) => ALL.find((d) => d.id === id) || (() => { throw new Error('unknown device ' + id); })());

const TOK = {
  heights: [32, 36, 44], space: [0, 4, 8, 12], rCtl: 10, rCard: 12,
  type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] },
  icon: { ctl: 16, stat: 14, dock: 17, glyph: 10 }, stroke: 1.75,
  panel: 'rgb(12, 20, 28)', border: 'rgba(127, 233, 255, 0.14)',
  // text colours allowed in the sheet: exactly the brief's tokens (#EAF2F7, #A9BCCB, cyan, teal, amber, red, blue)
  colors: ['rgb(234, 242, 247)', 'rgb(169, 188, 203)', 'rgb(127, 233, 255)', 'rgb(63, 224, 208)', 'rgb(242, 177, 76)', 'rgb(242, 112, 90)', 'rgb(111, 182, 255)'],
};
// Every string the brief asks for (Arabic as written in the page). "now" must be visible on screen in every render
// (header, status, the 3 numbers, the tab row, the first action); "tab" is visible when that tab is open;
// "dom" must exist in the sheet (reachable by tab or scroll).
const BRIEF = {
  now: ['القاهرة', 'العاصمة', 'مصر', 'السيادة', 'الإدارة', 'حكومة مصر', 'السيطرة', 'الحكومة · 100%', 'المطالبات', 'لا توجد',
    'السكان', '8.8 مليون', 'الاضطراب', '64', 'البنية التحتية', '8 / 10', 'لماذا؟',
    'السياسة', 'المجتمع', 'الاقتصاد', 'الأمن', 'مشروع بنية تحتية', '0.8 مليار $ · 24 شهرًا', '+1 بنية تحتية'],
  tab: {
    politics: ['الحزب الحاكم في المحافظة', 'الحزب الوطني الديمقراطي', 'التأييد', 'حاكم'],
    society: ['نسبة الحضر', '100%', 'مسلمون سنة 90%', 'مسيحيون أقباط 10%'],
    economy: ['نحو 22% من ناتج مصر', 'الأنشطة الرئيسية', 'خدمات · صناعة · سياحة'],
    security: ['القوات الموجودة', 'أمن داخلي · فرقة واحدة', 'السيطرة', '100%'],
  },
  dom: ['دعم الخدمات', '0.3 مليار $', '−5 اضطراب', 'تعزيز الأمن', '0.2 مليار $ / سنة', '−8 اضطراب', '−3 شرعية'],
};

// HUD elements of the play screen that must keep their B3 place and size while the sheet is open
const HUDSEL = ['.top > .nation', '.top > .stats', '.top > .date', '.toast', '.btn.mode', '.btn.home', '.dock', '.dock-item'];
const B3 = 'file://' + path.resolve(OUT, '../../screen1/B3/index.html');
async function hudRects(p) {
  return p.evaluate((HUDSEL) => {
    const o = {};
    HUDSEL.forEach((s) => { o[s] = [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; }); });
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

async function measure(p, d, b3) {
  return p.evaluate(({ d, TOK, BRIEF, b3 }) => {
    const R = (r) => ({ x0: +r.left.toFixed(2), y0: +r.top.toFixed(2), x1: +r.right.toFixed(2), y1: +r.bottom.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2) });
    const issues = [], W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01, lu = 1 / 32;
    const near = (a, b, t = 0.05) => Math.abs(a - b) < t;
    const visible = (e) => e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
    const q = (s) => document.querySelector(s), qa = (s) => [...document.querySelectorAll(s)].filter(visible);
    const inter = (a, b) => Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.05 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.05;
    const box = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    const label = (e) => (e.getAttribute('aria-label') || e.textContent || e.className.baseVal || e.className || e.tagName).toString().trim().replace(/\s+/g, ' ').slice(0, 26);
    // the rectangle a scrolling / clipping ancestor lets through
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
      return { c, scroller };
    };
    const hiddenByScroll = (r, e) => { const { c, scroller } = clipOf(e); return !!scroller && (r.y0 >= c.y1 - 0.05 || r.y1 <= c.y0 + 0.05); };

    // ---------- 1. panels: opaque (D-3), border, radius ----------
    const panels = qa('.hud .glass').filter((e) => !e.classList.contains('menu') || document.documentElement.classList.contains('menu-open'));
    panels.forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost');
      const fill = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (fill !== TOK.panel) issues.push(`panel not opaque: ${label(g)} ${fill}`);
      if (cs.backdropFilter !== 'none' && cs.backdropFilter !== '') issues.push(`panel blur: ${label(g)} ${cs.backdropFilter}`);
      if (f && getComputedStyle(f.firstChild).display !== 'none') issues.push(`panel shows the blurred map copy: ${label(g)}`);
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== TOK.border) issues.push(`panel border ${label(g)}: ${cs.borderTopWidth} ${cs.borderTopColor}`);
      const r = parseFloat(cs.borderTopLeftRadius), want = g.classList.contains('ctl') ? TOK.rCtl : TOK.rCard;
      if (!near(r, want)) issues.push(`panel radius ${label(g)}: ${r} (want ${want})`);
    });
    // ---------- 2. control heights 32/36/44 and radii ----------
    const hh = (e) => e.getBoundingClientRect().height;
    qa('.tap').forEach((e) => {
      const h = hh(e), bar = e.parentElement.closest('.glass, .cap, .seg, .acts');
      const fills = bar && TOK.heights.some((x) => near(hh(bar), x)) && near(h, hh(bar) - 2 * parseFloat(getComputedStyle(bar).borderTopWidth));
      if (!TOK.heights.some((x) => near(h, x)) && !fills) issues.push(`control height ${h.toFixed(2)}: ${label(e)}`);
    });
    [['.cap', 32], ['.seg', 32], ['.xbtn', 32], ['.toast', 32], ['.dock', 44]].forEach(([s, v]) => qa(s).forEach((e) => { if (!near(hh(e), v)) issues.push(`control height ${hh(e).toFixed(2)} for ${s} (want ${v})`); }));
    qa('.top > .glass').forEach((e) => { if (!near(hh(e), 36)) issues.push(`top row height ${hh(e)} for ${label(e)}`); });
    qa('.sheet .tap, .seg, .cap').forEach((e) => { const r = parseFloat(getComputedStyle(e).borderTopLeftRadius); if (!near(r, TOK.rCtl)) issues.push(`control radius ${r}: ${label(e)}`); });
    qa('.acts, .sheet').forEach((e) => { const r = parseFloat(getComputedStyle(e).borderTopLeftRadius); if (!near(r, TOK.rCard)) issues.push(`card radius ${r}: ${label(e)}`); });
    // ---------- 3. spacing: flex/grid gaps, sheet padding, gaps between the sheet's blocks ----------
    document.querySelectorAll('.hud *').forEach((e) => {
      if (!visible(e) || e.closest('.frost')) return;
      const cs = getComputedStyle(e);
      if (!/flex|grid/.test(cs.display)) return;
      [cs.columnGap, cs.rowGap].forEach((g) => { const v = g === 'normal' ? 0 : parseFloat(g); if (!TOK.space.some((s) => near(s, v))) issues.push(`gap ${v} on ${label(e)}`); });
    });
    // fit level (index.html): 0 all gaps 8; 1 header/status/numbers 4; 2 also tab row/details/actions 4; 3 also sheet padding 4; 4 also one-line header
    const lvl = +document.documentElement.dataset.sheetfit, gBlk = lvl >= 1 ? 4 : 8, gDet = lvl >= 2 ? 4 : 8, padSh = lvl >= 3 ? 4 : 8;
    const sheet = q('.sheet'), scs = getComputedStyle(sheet), sr = sheet.getBoundingClientRect();
    if (!near(parseFloat(scs.paddingLeft), 12) || !near(parseFloat(scs.paddingRight), 12) || !near(parseFloat(scs.paddingTop), padSh) || !near(parseFloat(scs.paddingBottom), padSh)) issues.push(`sheet padding ${scs.padding} (want ${padSh} 12)`);
    const blocks = ['.sh-head', '.status', '.kpis', '.seg', '.body'].map((s) => q(s).getBoundingClientRect());
    const wantGap = [gBlk, gBlk, 8, gDet];
    for (let i = 1; i < blocks.length; i++) { const g = blocks[i].top - blocks[i - 1].bottom; if (!near(g, wantGap[i - 1])) issues.push(`sheet block gap ${g.toFixed(2)} before ${['.sh-head', '.status', '.kpis', '.seg', '.body'][i]} (want ${wantGap[i - 1]})`); }
    { const pane = qa('.pane')[0].getBoundingClientRect(), g = pane.top - blocks[3].bottom; if (!near(g, gDet)) issues.push(`tab row -> details gap ${g.toFixed(2)} (want ${gDet})`); }
    { const g = blocks[0].top - sr.top - 1; if (!near(g, padSh)) issues.push(`sheet top padding ${g.toFixed(2)} (want ${padSh})`); }
    // the action card: pinned to the bottom (no blank band under it), whole rows only, at least the first row, indicator when it scrolls
    { const ac = q('.acts'), a = ac.getBoundingClientRect(), tb = q('.sheet .tabs').getBoundingClientRect(), rowH = q('.act').getBoundingClientRect().height;
      const g = a.top - tb.bottom, band = (sr.bottom - 1 - padSh) - a.bottom;
      if (g < gDet - 0.05 || g >= gDet + rowH - 0.05) issues.push(`details -> actions gap ${g.toFixed(2)} (want ${gDet}, plus less than one row of spare)`);
      if (Math.abs(band) > 0.5) issues.push(`blank band of ${band.toFixed(1)} pt under the action card`);
      const scrolls = ac.scrollHeight > ac.clientHeight + 1, k = ac.clientHeight / rowH;
      if (scrolls && (Math.abs(k - Math.round(k)) > 0.02 || Math.round(k) < 1)) issues.push(`action card cuts a row (${ac.clientHeight.toFixed(1)} pt = ${k.toFixed(2)} rows)`);
      if (scrolls !== visible(q('.sbar'))) issues.push(`action card ${scrolls ? 'scrolls without' : 'does not scroll but shows'} its scroll indicator`); }
    // ---------- 4. icons ----------
    document.querySelectorAll('.hud svg').forEach((s) => {
      if (!s.getClientRects().length) return;
      const r = s.getBoundingClientRect(), cs = getComputedStyle(s);
      const kind = s.classList.contains('trend') ? 'glyph' : s.closest('.stat') ? 'stat' : s.closest('.dock') ? 'dock' : 'ctl';
      if (!near(r.width, TOK.icon[kind]) || !near(r.height, TOK.icon[kind])) issues.push(`icon size ${kind} ${r.width}x${r.height}`);
      if (!near(parseFloat(cs.strokeWidth), TOK.stroke)) issues.push(`icon stroke ${cs.strokeWidth}`);
    });
    // ---------- 5. type, colour, placement, clipping of every text run ----------
    const typeSeen = {}, texts = [];
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
      if (rr.every((r) => hiddenByScroll(box(r), el))) continue;          // scrolled out of view: not on screen
      typeSeen[`${fs}/${fw}`] = (typeSeen[`${fs}/${fw}`] || 0) + 1;
      if (!(fs in TOK.type)) issues.push(`font size ${fs} for "${t}"`);
      else if (!TOK.type[fs].includes(fw)) issues.push(`font weight ${fs}/${fw} for "${t}"`);
      if (fs === 18 && !el.closest('.pname')) issues.push(`18 pt is for the province name only: "${t}"`);
      if (fs === 13 && !/tabular-nums/.test(cs.fontVariantNumeric)) issues.push(`13 pt not tabular: "${t}"`);
      if (inSheet && !TOK.colors.includes(cs.color)) issues.push(`text colour off-token ${cs.color}: "${t}"`);
      if (cs.textOverflow === 'ellipsis') issues.push(`ellipsis on "${t}"`);
      const { c } = clipOf(el);
      rr.forEach((r) => {
        const b = box(r);
        // line box (the content area is taller than the line height, so stacked lines' content areas overlap by design)
        const lh = parseFloat(cs.lineHeight), mid = (b.y0 + b.y1) / 2;
        texts.push({ t, fs, color: cs.color, sheet: inSheet, badge: !!el.closest('.badge'), r: R(r), line: { x0: b.x0, x1: b.x1, y0: mid - lh / 2, y1: mid + lh / 2 } });
        if (b.x0 < S - eps || b.x1 > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (b.y1 > H - B + eps) issues.push(`text in bottom inset: ${t}`);
        if (b.x0 < c.x0 - 0.5 || b.x1 > c.x1 + 0.5 || b.y0 < c.y0 - 0.5 || b.y1 > c.y1 + 0.5) issues.push(`clipped text: "${t}" ${R(r).x0}..${R(r).x1} y ${R(r).y0}..${R(r).y1}`);
        if (inSheet && (b.x0 < sr.left + 1 + 12 - 0.5 || b.x1 > sr.right - 1 - 12 + 0.5)) issues.push(`text outside the sheet's 12 pt padding: "${t}"`);
      });
    }
    // text runs in the sheet never overlap each other
    const st = texts.filter((x) => x.sheet);
    for (let i = 0; i < st.length; i++) for (let j = i + 1; j < st.length; j++) {
      const a = st[i].line, b = st[j].line;
      if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5) issues.push(`text overlap "${st[i].t}" / "${st[j].t}"`);
    }
    // no icon is drawn over a text run, in the sheet or the HUD (the bell's count badge sits on the bell by design)
    const icons = [...document.querySelectorAll('.hud svg')].filter((s) => s.getClientRects().length && !s.closest('.frost') && getComputedStyle(s).visibility !== 'hidden')
      .map((s) => ({ s, r: box(s.getBoundingClientRect()) })).filter((o) => !hiddenByScroll(o.r, o.s));
    texts.forEach((t) => {
      if (t.badge) return;
      icons.forEach((o) => { const a = t.line, b = o.r; if (Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0.5 && Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0) > 0.5) issues.push(`icon over text: ${label(o.s)} / "${t.t}"`); });
    });
    // every % sits right after its digits on screen ("65%"), never before them ("%65", the bidi trap of Western digits after Arabic letters)
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
    qa('.sheet .tap, .capital').forEach((c) => {
      const cr = c.getBoundingClientRect(); if (hiddenByScroll(box(cr), c)) return;
      c.querySelectorAll('span, svg, h2').forEach((e) => {
        if (!visible(e)) return;
        let b; if (e.tagName === 'svg') b = e.getBoundingClientRect(); else { const r = document.createRange(); r.selectNodeContents(e); b = r.getBoundingClientRect(); }
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
    // ---------- 6. hit boxes ----------
    const taps = qa('.tap').map((e) => {
      const r = e.getBoundingClientRect(), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const x0 = r.left + parseFloat(cs.borderLeftWidth) + parseFloat(ps.left) + m.e, y0 = r.top + parseFloat(cs.borderTopWidth) + parseFloat(ps.top) + m.f;
      return { e, label: label(e), vis: box(r), hit: { x0, x1: x0 + parseFloat(ps.width), y0, y1: y0 + parseFloat(ps.height) }, scrolled: hiddenByScroll(box(r), e) };
    }).filter((t) => !t.scrolled);
    taps.forEach((t) => {
      const h = t.hit, v = t.vis;
      if (h.x1 - h.x0 < 44 - eps || h.y1 - h.y0 < 44 - eps) issues.push(`hit box < 44: ${t.label}`);
      if (h.x0 > v.x0 + lu || h.x1 < v.x1 - lu || h.y0 > v.y0 + lu || h.y1 < v.y1 - lu) issues.push(`hit box does not cover: ${t.label}`);
      if (h.x0 < S - eps || h.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      if (h.y1 > H - B + lu || h.y0 < -eps) issues.push(`tap in bottom inset/off top: ${t.label} ${h.y0.toFixed(1)}..${h.y1.toFixed(1)}`);
      const { c, scroller } = clipOf(t.e);
      if (scroller && (v.y0 < c.y0 - 0.5 || v.y1 > c.y1 + 0.5)) issues.push(`control cut by its scroll area: ${t.label}`);
    });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++) if (inter(taps[i].hit, taps[j].hit)) issues.push(`hit overlap ${taps[i].label} / ${taps[j].label}`);
    // ---------- 7. panels: no overlap, inside the safe area ----------
    const prs = panels.map((e) => ({ l: label(e), r: box(e.getBoundingClientRect()) }));
    for (let i = 0; i < prs.length; i++) for (let j = i + 1; j < prs.length; j++) if (inter(prs[i].r, prs[j].r)) issues.push(`panel overlap ${prs[i].l} / ${prs[j].l}`);
    prs.forEach((p) => { if (p.r.x0 < S - eps || p.r.x1 > W - S + eps) issues.push(`panel in side inset: ${p.l}`); });
    // ---------- 8. sheet geometry, RTL order, fit ----------
    const safeW = W - 2 * S, wantW = Math.min(440, Math.max(340, 0.42 * safeW));
    if (Math.abs(sr.width - wantW) > 0.5) issues.push(`sheet width ${sr.width} (want clamp(42% of ${safeW}, 340, 440) = ${wantW.toFixed(1)})`);
    const gut = Math.max(S, 8), top = q('.top').getBoundingClientRect(), hud = q('.hud').getBoundingClientRect();
    if (!near(sr.right, W - gut)) issues.push(`sheet not at the right safe edge: ${sr.right} (want ${W - gut})`);
    if (sr.top < top.bottom + 8 - 0.05) issues.push(`sheet covers the top row (top ${sr.top})`);
    { const dkr = q('.dock').getBoundingClientRect(), shared = dkr.right > sr.left - 8 && dkr.left < sr.right + 8, wantB = shared ? dkr.top - 8 : hud.bottom;
      if (sr.bottom > H - B + eps || !near(sr.bottom, wantB, 0.6)) issues.push(`sheet bottom ${sr.bottom} (want ${shared ? '8 pt above the dock' : 'the dock line'} ${wantB})`); }
    const hd = q('.sh-head'), xb = q('.xbtn').getBoundingClientRect(), nm = q('.pname').getBoundingClientRect();
    if (!(xb.right <= nm.left)) issues.push('close button is not at the RTL end of the header');
    const segs = qa('.sg'); if (segs[0].textContent.trim() !== 'السياسة' || segs[0].getBoundingClientRect().left < segs[1].getBoundingClientRect().left) issues.push('first tab «السياسة» is not at the right');
    if (qa('.sg[aria-selected="true"]').length !== 1) issues.push('exactly one tab must be selected');
    // every action row: 16 pt icon at the right, title, cost, 16 pt chevron at the left (RTL)
    document.querySelectorAll('.act').forEach((a, i) => {
      const ic = a.querySelector('.a-ico'), ch = a.querySelector('.chev'), t = a.querySelector('.a-t'), c = a.querySelector('.a-c');
      const ok16 = (e) => e && visible(e) && near(e.getBoundingClientRect().width, 16) && near(e.getBoundingClientRect().height, 16);
      if (!ok16(ch)) issues.push(`action row ${i + 1}: chevron missing or not 16 pt`);
      if (!ok16(ic)) issues.push(`action row ${i + 1}: icon missing or not 16 pt`);
      if (ok16(ch) && ok16(ic)) { const [ri, rt, rc, rh] = [ic, t, c, ch].map((e) => e.getBoundingClientRect());
        if (!(ri.left >= rt.right - 0.5 && rc.right <= rt.left + 0.5 && rh.right <= rc.left + 0.5)) issues.push(`action row ${i + 1}: order must be icon, title, cost, chevron (right to left)`); }
    });
    // the HUD stays where it is: every top-row element, the left stack and the dock keep their exact B3 place and size
    if (!b3) issues.push('B3 reference not measured');
    else Object.entries(b3).forEach(([sel, refs]) => {
      const cur = [...document.querySelectorAll(sel)];
      if (cur.length !== refs.length) { issues.push(`HUD element count ${sel}: ${cur.length} (B3 has ${refs.length})`); return; }
      cur.forEach((e, i) => {
        const nm = sel + (refs.length > 1 ? ` #${i + 1}` : ''), cs = getComputedStyle(e), ref = refs[i], r = e.getBoundingClientRect();
        if (!visible(e) || cs.opacity === '0') { issues.push(`HUD element hidden: ${nm}`); return; }
        const dev = Math.max(Math.abs(r.left - ref.x0), Math.abs(r.top - ref.y0), Math.abs(r.right - ref.x1), Math.abs(r.bottom - ref.y1));
        if (dev > 0.5) issues.push(`HUD element moved from its B3 position: ${nm} x ${r.left.toFixed(1)}..${r.right.toFixed(1)} y ${r.top.toFixed(1)}..${r.bottom.toFixed(1)} (B3 ${ref.x0.toFixed(1)}..${ref.x1.toFixed(1)}, ${ref.y0.toFixed(1)}..${ref.y1.toFixed(1)})`);
      });
    });
    // must be visible without scrolling: header, status, the 3 numbers, the tab row and the first action
    ['.sh-head', '.status', '.kpis', '.seg', '.act'].forEach((s) => {
      const e = q(s), r = box(e.getBoundingClientRect()), { c } = clipOf(e);
      if (r.y0 < c.y0 - 0.5 || r.y1 > c.y1 + 0.5 || r.y1 > H - B + eps) issues.push(`not fully visible without scrolling: ${s}`);
    });
    // ---------- 9. the brief's content ----------
    const all = q('.sheet').textContent.replace(/\s+/g, ' ');
    const flat = (s) => s.replace(/\s+/g, ' ');
    const tab = document.documentElement.dataset.tab, seen = flat(q('.sheet').innerText);
    BRIEF.now.concat(BRIEF.tab[tab]).forEach((s) => { if (!seen.includes(s)) issues.push(`brief text not visible: ${s}`); });
    Object.values(BRIEF.tab).flat().concat(BRIEF.dom).forEach((s) => { if (!all.includes(s)) issues.push(`brief text missing: ${s}`); });
    if (q('.sg[aria-selected="true"]').dataset.for !== tab) issues.push('selected tab does not match the open details');
    if (qa('.why').length !== 3) issues.push(`«لماذا؟» links: ${qa('.why').length} (want 3)`);
    if (qa('.kpi .trend').length !== 3) issues.push('every headline number needs a trend arrow');
    // the brief's trends: population flat, unrest up in amber, infrastructure flat (neutral #A9BCCB)
    [['#t-flat', 'rgb(169, 188, 203)'], ['#t-up', 'rgb(242, 177, 76)'], ['#t-flat', 'rgb(169, 188, 203)']].forEach(([h, c], i) => {
      const k = document.querySelectorAll('.kpi')[i], s = k && k.querySelector('.trend'), u = s && s.querySelector('use');
      const href = u && (u.getAttribute('href') || u.getAttribute('xlink:href')), col = s && getComputedStyle(s).color;
      if (!s || !visible(s) || href !== h || col !== c) issues.push(`headline number ${i + 1} trend ${href} ${col} (want ${h} ${c})`);
    });
    const flag = q('.pflag'); const fr = flag.getBoundingClientRect(); if (!near(fr.width / fr.height, 4 / 3, 0.01)) issues.push('flag is not 4:3');
    if (!q('.pflag img').getAttribute('src').endsWith('shared/flags/eg.svg')) issues.push('flag file');
    if (getComputedStyle(q('.harm')).color !== 'rgb(242, 177, 76)') issues.push('legitimacy cost is not amber');
    // ---------- 10. map: Cairo highlight, delta and Egypt clear of every panel and hit box ----------
    const m = window.__map, cairo = q('#cairo').getBoundingClientRect();
    const cz = { x0: cairo.left - 3, y0: cairo.top - 3, x1: cairo.right + 3, y1: cairo.bottom + 3 };   // outline + glow
    const cover = (r, what) => {
      prs.forEach((p) => { if (inter(r, p.r)) issues.push(`${what} covered by panel ${p.l}`); });
      taps.forEach((t) => { if (inter(r, t.hit)) issues.push(`${what} under the hit box of ${t.label}`); });
      if (r.x0 < S - eps || r.x1 > W - S + eps || r.y0 < 0 || r.y1 > H - B + eps) issues.push(`${what} outside the safe screen`);
      const cut = q('.cutout'); if (visible(cut) && inter(r, box(cut.getBoundingClientRect()))) issues.push(`${what} under the camera cutout`);
    };
    cover(cz, 'Cairo highlight');
    cover(m.delta, 'Nile delta');
    cover(m.egypt, 'Egypt');
    if (cairo.width < 8) issues.push(`Cairo highlight too small: ${cairo.width.toFixed(1)} pt`);
    const me = q('.map').getBoundingClientRect();
    if (me.left > 0.5 || me.top > 0.5 || me.right < W - 0.5 || me.bottom < H - 0.5) issues.push('map not full-bleed');
    if (getComputedStyle(q('#cairo')).stroke !== 'rgb(127, 245, 234)') issues.push('Cairo outline colour');
    // map labels: each one fully visible or fully under a panel, never cut by a panel edge (2 pt margin, halo included)
    const hiddenLabels = [];
    document.querySelectorAll('.labels text').forEach((t) => {
      if (!t.getClientRects().length) { hiddenLabels.push(t.textContent); return; }
      const r = t.getBoundingClientRect(), sw = parseFloat(t.getAttribute('stroke-width') || 0) / 2 * m.s;
      const b = { x0: r.left - sw - 2, y0: r.top - sw - 2, x1: r.right + sw + 2, y1: r.bottom + sw + 2 };
      if (b.x1 <= 0 || b.x0 >= W || b.y1 <= 0 || b.y0 >= H) return;
      const under = prs.some((o) => r.left - sw >= o.r.x0 && r.right + sw <= o.r.x1 && r.top - sw >= o.r.y0 && r.bottom + sw <= o.r.y1);
      if (!under && prs.some((o) => inter(b, o.r))) issues.push(`map label cut by a panel edge: ${t.textContent}`);
    });

    return { issues, typeSeen, texts, fit: { top: window.__fit, status: window.__status, sheet: window.__sheetfit, sheetPos: window.__sheetpos }, map: m, hiddenLabels, cairo: R(cairo),
      sheet: R(sr), blocks: blocks.map(R), hits: taps.map((t) => ({ l: t.label, x0: +t.hit.x0.toFixed(1), x1: +t.hit.x1.toFixed(1), y0: +t.hit.y0.toFixed(1), y1: +t.hit.y1.toFixed(1) })) };
  }, { d, TOK, BRIEF, b3 });
}

async function contrast(p, texts) {
  // hide every HUD text, icon and flag; keep the panels and the map; read the real backdrop behind each glyph run
  await p.addStyleTag({ content: ':root body .hud, :root body .hud * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } :root body .hud svg, :root body .hud .flag, :root body .hud .pflag, .dev, .sbar { visibility: hidden !important; }' });
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
      const light = lt > ls[Math.floor(ls.length / 2)];
      const worst = light ? ls[ls.length - 1] : ls[0];
      const cr = (a, bb) => (Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05);
      return { t: t.t.slice(0, 24), fs: t.fs, worst: +cr(lt, worst).toFixed(2) };
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
const qs = (d) => `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;

async function check(p, d, b3) {
  const m = await measure(p, d, b3);
  const c = await contrast(p, m.texts);
  c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} for "${x.t}"`));
  return { m, c };
}

// Self-test: plant defects and prove the checks catch each one (and that the clean page has none).
async function selftest(b) {
  const d = ALL.find((x) => x.id === 'i16promax'), se = ALL.find((x) => x.id === 'se');
  const ref = { i16promax: await b3Rects(b, d), se: await b3Rects(b, se) };
  const ctxs = {};
  for (const x of [d, se]) ctxs[x.id] = await b.newContext({ viewport: { width: x.w, height: x.h }, deviceScaleFactor: 1 });
  // [name, css, expected issue, optional page script]
  const cases = [
    ['type size', '.pname { font-size: 17px !important; }', /font size 17 for "القاهرة"/],
    ['18 pt misuse', '.ctry span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for the province name only/],
    ['control height', '.xbtn { height: 30px !important; }', /control height 30.*(إغلاق|xbtn)/],
    ['radius', '.kpi { border-radius: 8px !important; }', /control radius 8: السكان/],
    ['gap', '.kpis { gap: 6px !important; }', /gap 6 on/],
    ['hit overlap', '.seg { margin-top: 2px !important; }', /hit overlap .*(السكان|الاضطراب|البنية).* \/ السياسة|hit overlap .*السياسة/],
    ['side inset', '.sheet { right: -30px !important; }', /tap in side inset|text in side inset|panel in side inset/],
    ['bottom inset', '.sheet { bottom: -16px !important; }', /tap in bottom inset/],
    ['contrast', '.ctry span { color: #46535e !important; }', /contrast [0-3](\.\d+)? for "مصر"/],
    ['ellipsis', '.kv .v { overflow: hidden; text-overflow: ellipsis; max-width: 60px; }', /ellipsis on "الحزب الوطني الديمقراطي"/],
    ['clipped', '.kpi { overflow: hidden; } .k-v .why { margin-inline-start: 40px !important; }', /clipped text: "لماذا؟"/],
    ['text overlap', '.capital { margin-inline-start: -40px !important; }', /text overlap "القاهرة" \/ "العاصمة"|text overlap "العاصمة" \/ "القاهرة"/],
    ['icon over text', '.act .a-ico { grid-column: 2 !important; }', /icon over text: i a-ico \/ "مشروع بنية تحتية"/],
    ['panel not opaque', '.sheet > .frost::after { background: rgba(9, 17, 25, 0.66) !important; }', /panel not opaque: المحافظة/],
    ['Cairo covered', ':root { --map-cx: 760px !important; }', /Cairo highlight covered by panel المحافظة/],
    ['sheet width', ':root { --sheet-w: 330px !important; }', /sheet width 330/],
    ['dock hidden', '.dock { display: none !important; }', /HUD element hidden: \.dock/],
    ['dock moved', '.dock { margin-left: 120px !important; }', /HUD element moved from its B3 position: \.dock /],
    ['left stack moved', '.lstack { margin-left: 8px; }', /HUD element moved from its B3 position: \.toast/],
    ['top row covered', '.sheet { top: 30px !important; }', /sheet covers the top row|panel overlap/],
    ['blank band', '.acts { margin-top: 0 !important; max-height: 44px !important; }', /blank band of \d/],
    ['cut action row', '.acts { max-height: 70px !important; }', /action card cuts a row|control cut by its scroll area/],
    ['icon', '.sheet svg.i.chev { width: 18px !important; }', /icon size ctl 18x/],
    ['chevron hidden', '.act .chev { display: none !important; }', /action row 1: chevron missing/],
    ['unrest trend', '', /headline number 2 trend #t-flat/, () => { const s = document.querySelectorAll('.kpi .trend')[1]; s.classList.replace('bad', 'up'); s.querySelector('use').setAttribute('href', '#t-flat'); }],
    ['off-token colour', '.kv .k { color: #8899aa !important; }', /text colour off-token/],
    ['off-token #A2B6C6', '.kv .k { color: #A2B6C6 !important; }', /text colour off-token rgb\(162, 182, 198\)/],
    ['% before its number', '', /% shown before its number/, () => { document.querySelectorAll('.sf dd')[2].textContent = 'الحكومة · 100%'; }],
    ['map label cut', '.labels text.cut { display: inline !important; }', /map label cut by a panel edge/],
  ];
  const results = [];
  for (const [name, css, re, js] of cases) {
    const p = await open(ctxs[d.id], PAGE + qs(d));
    if (css) await p.addStyleTag({ content: css });
    if (js) await p.evaluate(js);
    await p.waitForTimeout(80);
    const { m } = await check(p, d, ref[d.id]);
    const ok = m.issues.some((i) => re.test(i));
    results.push({ name, ok, sample: m.issues.slice(0, 3) });
    console.log(`${ok ? 'caught ' : 'MISSED '} ${name}${ok ? '' : '  -> ' + m.issues.slice(0, 4).join(' || ')}`);
    await p.close();
  }
  // disputed / occupied province: long status values (numbers isolated left-to-right, as the page does) must switch
  // the strip to two rows and re-fit the sheet with the actions still pinned (17 Pro Max: 2 whole rows, SE: 1) and
  // nothing else changed; the same values forced into one strip, or with the % left bare, must be reported
  const LONG = ['اليمن', 'حكومة الوحدة الوطنية', 'قوات المعارضة · <span class="ltr">65%</span>', 'دولتان مجاورتان'];
  const runs = [['re-fits to two rows', d, 'ok', 2], ['re-fits to two rows', se, 'ok', 1], ['forced into one strip', d, 'forced'], ['bare % (no LTR isolate)', d, 'bare']];
  for (const [what, x, mode, minRows] of runs) {
    const p = await open(ctxs[x.id], PAGE + qs(x));
    const fit = await p.evaluate(({ LONG, mode }) => {
      document.querySelectorAll('.sf dd').forEach((e, i) => { e.innerHTML = mode === 'bare' ? LONG[i].replace(/<[^>]+>/g, '') : LONG[i]; });
      fitSheet(); placeMap();
      if (mode === 'forced') document.documentElement.dataset.status = '0';
      return { status: window.__status.level, sheet: window.__sheetfit };
    }, { LONG, mode });
    const { m } = await check(p, x, ref[x.id]);
    const iss = m.issues.filter((i) => !/brief text/.test(i));
    const ok = mode === 'forced' ? iss.some((i) => /text overlap|outside the sheet|horizontal overflow|clipped/.test(i))
      : mode === 'bare' ? iss.some((i) => /% shown before its number/.test(i))
        : fit.status === 1 && fit.sheet.rows >= minRows && iss.length === 0;
    const nm = `long status ${what} (${x.id})`;
    results.push({ name: nm, ok, fit, sample: iss.slice(0, 3) });
    console.log(`${ok ? (mode === 'ok' ? 'passes ' : 'caught ') : 'FAILED '} ${nm} status ${fit.status}, sheet level ${fit.sheet.level}, ${fit.sheet.rows} pinned rows${ok ? '' : '  -> ' + iss.slice(0, 4).join(' || ')}`);
    await p.close();
  }
  const clean = {};
  for (const x of [d, se]) {
    const p0 = await open(ctxs[x.id], PAGE + qs(x));
    clean[x.id] = (await check(p0, x, ref[x.id])).m.issues;
    console.log(`clean page ${x.id}: ${clean[x.id].length} issues${clean[x.id].length ? ' -> ' + clean[x.id].slice(0, 4).join(' || ') : ''}`);
    await p0.close();
  }
  for (const c of Object.values(ctxs)) await c.close();
  const missed = results.filter((r) => !r.ok).map((r) => r.name), dirty = Object.values(clean).some((v) => v.length);
  fs.writeFileSync(path.join(__dirname, 'selftest.json'), JSON.stringify({ ranAt: new Date().toISOString(), devices: [d.id, se.id], cleanIssues: clean, results }, null, 1));
  console.log(missed.length || dirty ? `SELFTEST FAILED (missed: ${missed.join(', ') || 'none'}; clean issues ${Object.values(clean).map((v) => v.length).join('/')})` : `selftest OK: ${cases.length + 2} planted defects caught, long status values re-fit cleanly on both devices, clean pages 0 issues`);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  if (SELFTEST) { await selftest(b); await b.close(); return; }
  let report = {};
  try { report = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8')); } catch (e) { report = {}; }
  const jobs = DEVICES.map((d) => ({ d, out: d.id, extra: '', png: path.join(OUT, d.id + '.png') }));
  if (TABS) {
    const pm = ALL.find((x) => x.id === 'i16promax');
    ['society', 'economy', 'security'].forEach((t) => jobs.push({ d: pm, out: `i16promax_tab_${t}`, extra: `&tab=${t}`, png: path.join(__dirname, `i16promax_tab_${t}.png`) }));
  }
  const refs = {};
  for (const { d, out, extra, png } of jobs) {
    if (!refs[d.id]) refs[d.id] = await b3Rects(b, d);
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const p = await open(ctx, PAGE + qs(d) + extra);
    await p.screenshot({ path: png });
    if (!extra) {
      const ph = await open(ctx, PAGE + qs(d) + '&hit=1');
      await ph.screenshot({ path: path.join(__dirname, d.id + '_hit.png') });
      await ph.close();
    }
    const { m, c } = await check(p, d, refs[d.id]);
    report[out] = { device: `${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`, renderedAt: new Date().toISOString(), issueCount: m.issues.length,
      issues: m.issues, fit: m.fit, sheet: m.sheet, blocks: m.blocks, map: m.map, hiddenLabels: m.hiddenLabels, cairo: m.cairo, typeSeen: m.typeSeen, hits: m.hits,
      minContrast: Math.min(...c.map((x) => x.worst)), contrast: c };
    console.log(`\n== ${out} ${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`);
    console.log('fit', JSON.stringify(m.fit));
    console.log('sheet', JSON.stringify(m.sheet), 'blocks', JSON.stringify(m.blocks.map((r) => [r.y0, r.h])));
    console.log('map', JSON.stringify({ ok: m.map.ok, egyptClear: m.map.egyptClear, zoom: m.map.zoom, s: +m.map.s.toFixed(3), cairo: m.cairo, hiddenLabels: m.hiddenLabels }));
    console.log('type', JSON.stringify(m.typeSeen));
    console.log('contrast min', report[out].minContrast, c.sort((a, b2) => a.worst - b2.worst).slice(0, 3).map((x) => `${x.t}:${x.worst}`).join(' | '));
    console.log(m.issues.length ? 'ISSUES:\n  ' + m.issues.join('\n  ') : 'no issues');
    await ctx.close();
  }
  const ordered = {};
  ALL.forEach((d) => { if (report[d.id]) ordered[d.id] = report[d.id]; });
  Object.keys(report).filter((k) => !ordered[k]).forEach((k) => { ordered[k] = report[k]; });
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(ordered, null, 1));
  console.log('\nissues per entry:', Object.entries(ordered).map(([k, v]) => `${k} ${v.issues.length}`).join(', '));
  await b.close();
})();
