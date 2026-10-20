// Screen 4 (province panel), variant B "single scrolling sheet": render and check.
// Usage: NODE_PATH=.../node_modules CHROMIUM_PATH=... node render.js [ids...]     (default: i16promax se)
//        node render.js --selftest [id]       plants defects and proves the checks catch them (default id: i16promax)
// For every device the sheet is rendered at the top (<id>.png) and then scrolled one clear screen at a time
// until the end (<id>_scroll1.png, <id>_scroll2.png, ...), so every line of the sheet is checked while fully
// visible. Writes <id>.png and <id>_scrollN.png to the variant folder, <id>_hit.png and report.json to _build.
// Checks: type sizes/weights (18 bold only for the province name), text colours, tabular figures, Western
// digits, no emoji; control heights 32/36/44; radii (12 panels/cards, 10 controls/chips); spacing 4/8/12;
// icon sizes; opaque panels (D-3); 44 pt hit boxes, no overlap, nothing in the side insets, nothing tappable
// in the bottom inset; sheet geometry (clamp(42% of the safe width, 340, 440), right side, between the top row
// and the dock); block and text overlaps; text inside its box, no wrapped, clipped or ellipsised text;
// contrast >= 4.5:1 against the rendered background; Cairo highlight and the Nile delta not covered by any
// panel or hit box and actually visible (teal pixels), Egypt not covered; RTL order; header, status, numbers
// and the first action visible without scrolling on the 17 Pro Max; every sheet text fully visible in some state.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
const want = args.filter((a) => !a.startsWith('--'));
const IDS = want.length ? want : SELFTEST ? ['i16promax'] : ['i16promax', 'se'];
const DEVICES = IDS.map((id) => ALL.find((d) => d.id === id) || (() => { throw new Error('unknown device ' + id); })());
const MUST_SHOW_FIRST_ACTION = ['i16promax'];          // brief: visible without scrolling on the 17 Pro Max
const CFG = {
  TYPE: { 10: [500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] },
  // sheet text colours: #EAF2F7, #A9BCCB, cyan, teal, amber, red, blue
  COLORS: ['rgb(234, 242, 247)', 'rgb(169, 188, 203)', 'rgb(127, 233, 255)', 'rgb(63, 224, 208)', 'rgb(242, 177, 76)', 'rgb(242, 112, 90)', 'rgb(111, 182, 255)'],
  PANEL: 'rgb(12, 20, 28)', STROKE: 'rgba(127, 233, 255, 0.14)',
  SPACE: [0, 4, 8, 12],
  // decorated elements (background, ring or border) in the sheet and the radius each must have
  RADIUS: [['.sheet', 12], ['.status', 12], ['.kpi', 10], ['.act', 10], ['.close', 10], ['.chip', 10]],
  // decorated elements that are not panels, cards or controls (exact radius stated)
  DECOR: [['.mixbar i', 3, 'stacked bar segment'], ['.lg .sw', 4, 'legend dot'], ['.sbar', 1.5, 'scroll indicator'],
    ['.ctry .flag', 2, 'flag'], ['.efade', null, 'edge fade'], ['.sh-rule', 0, 'hairline'], ['.grp', 0, 'hairline above a group'],
    ['.ahead', 0, 'hairline above the actions title']],
  AUTO_MARGIN: ['.a-fx', '.kpi .why'],                // margin-inline-start: auto (pushes to the RTL end)
  SPACE_EXEMPT: [['.mixbar', 'gap 2 between bar segments']],
};

async function measure(p, d, must) {
  return p.evaluate(({ d, C, must }) => {
    const issues = [], info = [];
    const W = d.w, H = d.h, S = d.side, B = d.bottom, eps = 0.01, lu = 1 / 32;
    const q = (s) => document.querySelector(s);
    const qa = (s, root) => [...(root || document).querySelectorAll(s)].filter(visible);
    function visible(e) { if (!e.getClientRects().length) return false; const cs = getComputedStyle(e); return cs.visibility !== 'hidden' && cs.display !== 'none'; }
    const near = (a, b, t) => Math.abs(a - b) < (t || 0.05);
    const box = (r) => ({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
    const R = (b) => ({ x0: +b.x0.toFixed(2), y0: +b.y0.toFixed(2), x1: +b.x1.toFixed(2), y1: +b.y1.toFixed(2) });
    const area = (a, b) => { const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); return w > 0.05 && h > 0.05 ? w * h : 0; };
    const grow = (b, k) => ({ x0: b.x0 - k, y0: b.y0 - k, x1: b.x1 + k, y1: b.y1 + k });
    const label = (e) => (e.getAttribute('aria-label') || e.textContent || e.className.baseVal || e.className).toString().trim().replace(/\s+/g, ' ').slice(0, 28);
    const px = (v) => parseFloat(v) || 0;
    const root = getComputedStyle(document.documentElement);
    const FADE = px(root.getPropertyValue('--fade')), S2 = px(root.getPropertyValue('--cover'));   // fade + opaque cover above the pinned row

    // ---------- the sheet and its scroll state ----------
    const sheet = q('.sheet'), sc = q('.scroll'), first = q('.act.first');
    const SR = box(sheet.getBoundingClientRect()), SC = box(sc.getBoundingClientRect()), FR = box(first.getBoundingClientRect());
    // pinned = marked pinned by the page AND actually sitting inside the scrollport (geometry, not the class alone)
    const pinned = first.classList.contains('pinned') && getComputedStyle(first).position === 'sticky' && FR.y0 >= SC.y0 - 0.5 && FR.y1 <= SC.y1 + 0.5;
    // edge fades: counted only where the fade element is really shown on that edge
    const fadeAt = (s, y) => { const f = q(s); if (!visible(f)) return 0; const r = f.getBoundingClientRect(); return near(r.top, y, 1) || near(r.bottom, y, 1) ? r.height : 0; };
    const fadeT = fadeAt('.efade.t', SC.y0), fadeB = fadeAt('.efade.b', SC.y1);
    const shown = { x0: SC.x0, x1: SC.x1, y0: SC.y0, y1: pinned ? FR.y0 - S2 : SC.y1 };                       // drawn (maybe faded)
    const clear = { x0: SC.x0, x1: SC.x1, y0: SC.y0 + fadeT, y1: pinned ? FR.y0 - S2 - FADE : SC.y1 - fadeB };   // fully readable
    const tappable = { x0: SC.x0, x1: SC.x1, y0: SC.y0, y1: pinned ? FR.y0 - S2 : SC.y1 };
    if (first.classList.contains('pinned') && !pinned) issues.push('first action marked pinned but not inside the scroll view');
    function where(e, b) {
      if (!sc.contains(e)) return 'fixed';
      if (pinned && first.contains(e)) return 'fixed';
      if (b.y1 <= shown.y0 + 0.5 || b.y0 >= shown.y1 - 0.5) return 'hidden';
      return b.y0 >= clear.y0 - 0.5 && b.y1 <= clear.y1 + 0.5 ? 'full' : 'partial';
    }
    const expW = Math.min(440, Math.max(340, 0.42 * (W - 2 * Math.max(S, 8))));
    if (!near(SR.x1 - SR.x0, expW, 0.06)) issues.push(`sheet width ${(SR.x1 - SR.x0).toFixed(2)} != clamp(42% safe, 340, 440) = ${expW.toFixed(2)}`);
    if (!near(SR.x1, W - Math.max(S, 8), 0.06)) issues.push(`sheet not at the right safe edge: ${SR.x1.toFixed(2)}`);
    const topRow = box(q('.top').getBoundingClientRect()), dock = box(q('.dock').getBoundingClientRect());
    if (SR.y0 < topRow.y1 + 8 - 0.05) issues.push('sheet closer than 8 to the top row');
    if (SR.y1 > dock.y0 - 8 + 0.05) issues.push('sheet closer than 8 to the dock');

    // ---------- panels: opaque (D-3), border, radius ----------
    qa('.hud .glass').forEach((g) => {
      const cs = getComputedStyle(g), f = g.querySelector(':scope > .frost');
      const tint = f ? getComputedStyle(f, '::after').backgroundColor : cs.backgroundColor;
      if (tint !== C.PANEL) issues.push(`panel not opaque (D-3): ${g.className} ${tint}`);
      if (f && getComputedStyle(f.firstChild).display !== 'none') issues.push(`panel blur copy shown: ${g.className}`);
      if ((cs.backdropFilter || 'none') !== 'none' || (cs.webkitBackdropFilter && cs.webkitBackdropFilter !== 'none')) issues.push(`panel blur: ${g.className}`);
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== C.STROKE) issues.push(`panel border ${g.className} ${cs.borderTopWidth} ${cs.borderTopColor}`);
      const want = g.classList.contains('bar') ? 12 : g.classList.contains('ctl') ? 10 : -1;
      const rad = px(cs.borderTopLeftRadius);
      if (!near(rad, want)) issues.push(`radius ${rad} on panel ${g.className} (want ${want})`);
    });
    // decorated elements inside the sheet: every one is a known panel, card, control, chip or declared decoration
    sheet.querySelectorAll('*').forEach((e) => {
      if (!visible(e) || e.closest('.frost') || e.closest('svg')) return;
      const cs = getComputedStyle(e);
      const bg = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || cs.backgroundImage !== 'none';
      const ring = cs.boxShadow !== 'none' || ['Top', 'Right', 'Bottom', 'Left'].some((k) => px(cs['border' + k + 'Width']) > 0);
      if (!bg && !ring) return;
      const rad = px(cs.borderTopRightRadius) || px(cs.borderBottomRightRadius);
      const hit = C.RADIUS.find(([s]) => e.matches(s));
      if (hit) { if (!near(rad, hit[1])) issues.push(`radius ${rad} on ${hit[0]} (want ${hit[1]})`); return; }
      const dec = C.DECOR.find(([s]) => e.matches(s));
      if (dec) { if (dec[1] !== null && !near(rad, dec[1])) issues.push(`radius ${rad} on ${dec[2]} (want ${dec[1]})`); return; }
      issues.push(`undeclared decorated element: ${e.tagName.toLowerCase()}.${e.className}`);
    });

    // ---------- spacing scale in the sheet (gaps, paddings, margins) ----------
    sheet.querySelectorAll('*').forEach((e) => {
      if (!visible(e) || e.closest('.frost') || e.closest('svg') || e.matches('.sbar, .efade')) return;
      const cs = getComputedStyle(e), bad = [];
      const ok = (v) => C.SPACE.some((s) => near(s, v));
      if (/flex|grid/.test(cs.display) && !C.SPACE_EXEMPT.some(([s]) => e.matches(s)))
        [['column-gap', cs.columnGap], ['row-gap', cs.rowGap]].forEach(([k, g]) => { const v = g === 'normal' ? 0 : px(g); if (!ok(v)) bad.push(`${k} ${v}`); });
      ['Top', 'Right', 'Bottom', 'Left'].forEach((k) => { const v = px(cs['padding' + k]); if (!ok(v)) bad.push(`padding-${k.toLowerCase()} ${v}`); });
      const autoInline = C.AUTO_MARGIN.some((s) => e.matches(s));
      ['Top', 'Bottom'].concat(autoInline ? [] : ['Right', 'Left']).forEach((k) => { const v = px(cs['margin' + k]); if (!ok(v)) bad.push(`margin-${k.toLowerCase()} ${v}`); });
      if (bad.length) issues.push(`spacing off the 4/8/12 scale on ${e.tagName.toLowerCase()}.${e.className}: ${bad.join(', ')}`);
    });

    // ---------- icons ----------
    qa('.sheet svg.i').forEach((s) => { const r = s.getBoundingClientRect(); if (!near(r.width, 16) || !near(r.height, 16)) issues.push(`icon size ${r.width}x${r.height}`); if (getComputedStyle(s).strokeWidth !== '1.75px') issues.push('icon stroke ' + getComputedStyle(s).strokeWidth); });
    qa('.sheet svg.g, .sheet svg.trend').forEach((s) => { const r = s.getBoundingClientRect(); if (!near(r.width, 10) || !near(r.height, 10)) issues.push(`glyph size ${r.width}x${r.height}`); });
    const fl = q('.ctry .flag').getBoundingClientRect();
    if (!near(fl.width / fl.height, 4 / 3, 0.01)) issues.push('flag is not 4:3');
    if (!q('.ctry .flag img').getAttribute('src').endsWith('/shared/flags/eg.svg')) issues.push('flag is not shared/flags/eg.svg');
    if (!document.fonts.check('600 13px "IBM Plex Sans Arabic"')) issues.push('IBM Plex Sans Arabic not loaded');

    // ---------- text: type, colour, digits, insets, wraps; collect for overlap, containment and contrast ----------
    const texts = [], fullIds = [], sheetIds = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let tn, idx = -1;
    while ((tn = walker.nextNode())) {
      if (!tn.textContent.trim()) continue;
      const el = tn.parentElement;
      if (el.closest('.dev, .map, svg, script, style')) continue;
      idx++;
      if (!visible(el)) continue;
      const range = document.createRange(); range.selectNodeContents(tn);
      const rr = [...range.getClientRects()].filter((r) => r.width > 0);
      if (!rr.length) continue;
      const cs = getComputedStyle(el), fs = px(cs.fontSize), fw = +cs.fontWeight, t = tn.textContent.trim();
      const u = rr.reduce((a, r) => ({ x0: Math.min(a.x0, r.left), y0: Math.min(a.y0, r.top), x1: Math.max(a.x1, r.right), y1: Math.max(a.y1, r.bottom) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
      const inSheet = sheet.contains(el);
      const st = where(el, u);
      if (inSheet) sheetIds.push({ id: idx, t });
      if (st === 'hidden') continue;
      if (!(fs in C.TYPE)) issues.push(`font size ${fs} for "${t}"`);
      else if (!C.TYPE[fs].includes(fw)) issues.push(`font weight ${fs}/${fw} for "${t}"`);
      if (fs === 18 && !el.matches('.pname')) issues.push(`18 pt used outside the province name: "${t}"`);
      if (fs === 13 && !/tabular-nums/.test(cs.fontVariantNumeric)) issues.push(`13 pt not tabular: "${t}"`);
      if (inSheet && !C.COLORS.includes(cs.color)) issues.push(`text colour ${cs.color} off the token list: "${t}"`);
      if (/[٠-٩۰-۹]/.test(t)) issues.push(`Eastern Arabic digits in "${t}"`);
      if (/\p{Extended_Pictographic}/u.test(t)) issues.push(`emoji in "${t}"`);
      if (/lorem|ipsum/i.test(t)) issues.push(`placeholder text "${t}"`);
      rr.forEach((r) => {
        if (r.left < S - eps || r.right > W - S + eps) issues.push(`text in side inset: ${t}`);
        if (r.bottom > H - B + eps) issues.push(`text in bottom inset: ${t}`);
        if (r.left < 0 || r.right > W || r.top < 0) issues.push(`text off screen: ${t}`);
      });
      const lines = new Set(rr.map((r) => Math.round(r.top)));
      if (lines.size > 1) issues.push(`text wraps to ${lines.size} lines: "${t}"`);
      if (st === 'partial') {
        // cut by a scroll edge: only allowed under a fade (top / bottom edge, or the pinned row's fade)
        if (u.y0 < SC.y0 - 0.5 && u.y1 > SC.y0 && !fadeT) issues.push(`text cut at the top of the scroll without a fade: "${t}"`);
        if (u.y1 > SC.y1 + 0.5 && u.y0 < SC.y1 && !fadeB && !pinned) issues.push(`text cut at the bottom of the scroll without a fade: "${t}"`);
        continue;
      }
      if (inSheet) fullIds.push(idx);
      texts.push({ id: idx, t, fs, color: cs.color, el, r: { x0: u.x0, y0: u.y0, x1: u.x1, y1: u.y1, w: u.x1 - u.x0, h: u.y1 - u.y0 } });
    }
    // text overlap: the middle half of each line box (glyph boxes are taller than the line height)
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i].r, b = texts[j].r;
      const ca = { x0: a.x0, x1: a.x1, y0: a.y0 + a.h * 0.25, y1: a.y1 - a.h * 0.25 }, cb = { x0: b.x0, x1: b.x1, y0: b.y0 + b.h * 0.25, y1: b.y1 - b.h * 0.25 };
      if (area(ca, cb) > 0.5) issues.push(`text overlap "${texts[i].t}" / "${texts[j].t}"`);
    }
    // every sheet text inside its box (horizontally inside the padding, vertically centred inside the box)
    const BOXES = '.cell, .kpi, .act, .chip, .close, .kv .row, .legend, .gh, .ctry, .nmrow';
    texts.filter((x) => sheet.contains(x.el)).forEach((x) => {
      const c = x.el.closest(BOXES); if (!c) { issues.push(`text outside any box: "${x.t}"`); return; }
      const cr = box(c.getBoundingClientRect()), cs = getComputedStyle(c);
      const pl = px(cs.paddingLeft) + px(cs.borderLeftWidth), pr = px(cs.paddingRight) + px(cs.borderRightWidth);
      const cy = (x.r.y0 + x.r.y1) / 2;
      if (x.r.x0 < cr.x0 + pl - 0.5 || x.r.x1 > cr.x1 - pr + 0.5 || cy < cr.y0 || cy > cr.y1)
        issues.push(`text outside its box (${c.className.split(' ')[0]}): "${x.t}" ${R(x.r).x0}..${R(x.r).x1} / ${R(cr).x0 + pl}..${R(cr).x1 - pr}`);
    });
    // sheet blocks: inside the scroll padding, not overlapping each other
    const blocks = [...sheet.querySelectorAll('.sh-head, .status, .kpis, .grp, .ahead, .act')].filter(visible)
      .map((e) => { const b = box(e.getBoundingClientRect()), st = where(e, b);
        // scrolled blocks are clipped by the scroll (and by the pinned row): only their shown part can overlap anything
        const c = e.closest('.scroll') && st !== 'fixed' ? { x0: b.x0, x1: b.x1, y0: Math.max(b.y0, shown.y0), y1: Math.min(b.y1, shown.y1) } : b;
        return { e, b: c, st }; }).filter((x) => x.st !== 'hidden');
    blocks.forEach((x) => {
      if (x.e.closest('.scroll') && (x.b.x0 < SC.x0 + 12 - 0.05 || x.b.x1 > SC.x1 - 12 + 0.05)) issues.push(`block outside the 12 pt sheet padding: ${x.e.className}`);
      if (!x.e.closest('.scroll') && (x.b.x0 < SR.x0 || x.b.x1 > SR.x1)) issues.push(`block outside the sheet: ${x.e.className}`);
    });
    for (let i = 0; i < blocks.length; i++) for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i], b = blocks[j];
      if (a.e.contains(b.e) || b.e.contains(a.e)) continue;
      if ((a.st === 'fixed') !== (b.st === 'fixed') && (a.e === first || b.e === first)) continue;   // pinned row over scrolled content
      if (area(a.b, b.b) > 0.5) issues.push(`overlap ${a.e.className} / ${b.e.className}`);
    }
    // HUD blocks + sheet: no overlaps
    const hud = [...document.querySelectorAll('.nation, .stats, .date, .toast, .btn.mode, .btn.home, .dock, .sheet')].filter(visible).map((e) => ({ e, b: box(e.getBoundingClientRect()) }));
    for (let i = 0; i < hud.length; i++) for (let j = i + 1; j < hud.length; j++)
      if (area(hud[i].b, hud[j].b) > 0) issues.push(`overlap ${hud[i].e.className} / ${hud[j].e.className}`);
    if (SR.x0 < S - eps || SR.x1 > W - S + eps) issues.push('sheet in the side inset');
    if (SR.y1 > H - B + eps) issues.push('sheet in the bottom inset');
    // no clipped or ellipsised content (the sheet scroll may overflow vertically only)
    document.querySelectorAll('.hud *').forEach((e) => {
      if (!visible(e) || e.closest('.frost') || e.closest('svg')) return;
      const cs = getComputedStyle(e);
      if (cs.textOverflow === 'ellipsis') issues.push(`ellipsis on: ${label(e)}`);
      if (e === sc) { if (e.scrollWidth > e.clientWidth + 1) issues.push('sheet scrolls sideways'); return; }
      if (/hidden|clip|scroll|auto/.test(cs.overflowX + cs.overflowY) && e.textContent.trim() && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1))
        issues.push(`clipped content in ${e.className}: ${label(e)}`);
    });
    if (sc.scrollWidth > sc.clientWidth + 1) issues.push('horizontal overflow in the sheet');

    // ---------- controls: heights 32/36/44 (segments fill a bar of those heights), hit boxes ----------
    const OKH = [32, 36, 44];
    const taps = [...document.querySelectorAll('.tap')].filter(visible).map((e) => {
      const r = box(e.getBoundingClientRect()), cs = getComputedStyle(e), ps = getComputedStyle(e, '::before');
      const m = new DOMMatrixReadOnly(ps.transform === 'none' ? undefined : ps.transform);
      const x0 = r.x0 + px(cs.borderLeftWidth) + px(ps.left) + m.e, y0 = r.y0 + px(cs.borderTopWidth) + px(ps.top) + m.f;
      const hit = { x0, y0, x1: x0 + px(ps.width), y1: y0 + px(ps.height) };
      return { e, label: label(e), vis: r, hit, st: where(e, r) };
    }).filter((t) => t.st !== 'hidden');
    taps.forEach((t) => {
      const h = t.vis.y1 - t.vis.y0;
      if (!OKH.some((v) => near(v, h))) {
        const bar = t.e.parentElement.closest('.glass, .cap');
        const bh = bar && bar.getBoundingClientRect().height, inner = bar && bh - px(getComputedStyle(bar).borderTopWidth) - px(getComputedStyle(bar).borderBottomWidth);
        if (!(bar && OKH.some((v) => near(v, bh)) && near(h, inner))) issues.push(`control height ${+h.toFixed(2)}: ${t.label}`);
      }
      if (t.e.closest('.scroll') && !(pinned && t.e === first)) {               // scrolled: only the shown part can be touched
        t.hit = { x0: Math.max(t.hit.x0, tappable.x0), x1: Math.min(t.hit.x1, tappable.x1), y0: Math.max(t.hit.y0, tappable.y0), y1: Math.min(t.hit.y1, tappable.y1) };
      }
      const hh = t.hit;
      if (t.st !== 'partial' && (hh.x1 - hh.x0 < 44 - eps || hh.y1 - hh.y0 < 44 - eps)) issues.push(`hit box < 44: ${t.label} ${(hh.x1 - hh.x0).toFixed(1)}x${(hh.y1 - hh.y0).toFixed(1)}`);
      if (t.st !== 'partial' && (hh.x0 > t.vis.x0 + lu || hh.x1 < t.vis.x1 - lu || hh.y0 > t.vis.y0 + lu || hh.y1 < t.vis.y1 - lu)) issues.push(`hit box does not cover: ${t.label}`);
      if (hh.x0 < S - eps || hh.x1 > W - S + eps) issues.push(`tap in side inset: ${t.label}`);
      if (hh.y1 > H - B + lu || hh.y0 < -eps) issues.push(`tap in bottom inset or off top: ${t.label} ${hh.y0.toFixed(1)}..${hh.y1.toFixed(1)}`);
    });
    for (let i = 0; i < taps.length; i++) for (let j = i + 1; j < taps.length; j++)
      if (area(taps[i].hit, taps[j].hit) > 0) issues.push(`hit overlap ${taps[i].label} / ${taps[j].label}`);
    // the sheet covers no HUD hit box
    taps.filter((t) => !sheet.contains(t.e)).forEach((t) => { if (area(t.hit, SR) > 0) issues.push(`sheet covers the hit box of ${t.label}`); });

    // ---------- map: Cairo highlight, Nile delta and Egypt in clear view ----------
    const mr = q('.map').getBoundingClientRect(), s = mr.width / 1688;
    const mapBox = (b, k) => ({ x0: mr.left + b.x0 * s - k, x1: mr.left + b.x1 * s + k, y0: mr.top + b.y0 * s - k, y1: mr.top + b.y1 * s + k });
    if (mr.left > 0.01 || mr.top > 0.01 || mr.right < W - 0.01 || mr.bottom < H - 0.01) issues.push('map does not cover the screen');
    const vis = { x0: Math.max(S, 0), x1: W - Math.max(S, 0), y0: 0, y1: H - B };
    const covers = [...document.querySelectorAll('.hud .glass')].filter(visible).map((g) => ({ n: g.className.split(' ')[0], b: box(g.getBoundingClientRect()) }))
      .concat(taps.map((t) => ({ n: 'hit box of ' + t.label, b: t.hit })));
    const cairo = grow(box(q('.hl .line').getBoundingClientRect()), 3);                 // + the 6 pt glow
    const delta = mapBox(MAPBOX.delta, 0), egypt = mapBox(MAPBOX.egypt, 0);
    [['Cairo highlight', cairo], ['Nile delta', delta]].forEach(([n, b]) => {
      if (b.x0 < vis.x0 || b.x1 > vis.x1 || b.y0 < vis.y0 || b.y1 > vis.y1) issues.push(`${n} outside the visible safe area`);
      covers.forEach((c) => { if (area(b, c.b) > 0) issues.push(`${n} covered by ${c.n}`); });
    });
    const eA = (egypt.x1 - egypt.x0) * (egypt.y1 - egypt.y0);
    const eIn = Math.max(0, Math.min(egypt.x1, vis.x1) - Math.max(egypt.x0, vis.x0)) * Math.max(0, Math.min(egypt.y1, vis.y1) - Math.max(egypt.y0, vis.y0));
    const eCov = (eA - eIn + covers.filter((c) => !/^hit box/.test(c.n)).reduce((a, c) => a + area(egypt, c.b), 0)) / eA;
    if (eCov > 0.0005) issues.push(`Egypt ${(eCov * 100).toFixed(1)}% covered or off screen`);
    info.push(`map scale ${s.toFixed(3)} (zoom ${window.__map && window.__map.zoom}), Egypt covered ${(eCov * 100).toFixed(2)}%`);

    // ---------- RTL order ----------
    const head = box(q('.sh-head').getBoundingClientRect()), nmrow = box(q('.nmrow').getBoundingClientRect()), close = box(q('.close').getBoundingClientRect());
    if (!near(nmrow.x1, head.x1 - 12, 0.6)) issues.push('province name not at the RTL start of the header');
    if (!near(close.x0, head.x0 + 8, 0.6)) issues.push('close not at the RTL end of the header');
    const pn = box(q('.pname').getBoundingClientRect()), chip = box(q('.chip').getBoundingClientRect());
    if (chip.x1 > pn.x0) issues.push('capital chip not after the name (RTL)');
    const cells = qa('.cell').map((e) => box(e.getBoundingClientRect()));
    if (!(cells[0].x0 > cells[1].x0 && cells[2].x0 > cells[3].x0 && cells[2].y0 > cells[0].y0)) issues.push('status grid not in RTL reading order');
    const kp = qa('.kpi').map((e) => box(e.getBoundingClientRect()));
    if (!(kp[0].x0 > kp[1].x0 && kp[1].x0 > kp[2].x0)) issues.push('headline numbers not in RTL order');
    qa('.act').forEach((a) => {
      const m = box(a.querySelector('.a-main').getBoundingClientRect()), fx = box(a.querySelector('.a-fx').getBoundingClientRect()), ch = box(a.querySelector('.chev').getBoundingClientRect());
      if (!(m.x0 > fx.x1 && fx.x0 > ch.x1)) issues.push(`action row not RTL (title | effect | chevron): ${label(a.querySelector('.a-t'))}`);
    });
    if (q('.ttl').textContent.indexOf('القاهرة') < 0 || q('.chip').textContent.trim() !== 'العاصمة') issues.push('header text');

    // ---------- visible without scrolling ----------
    const firstShown = ['.sh-head', '.status', '.kpis', '.act.first'].every((s) => { const e = q(s); const st = where(e, box(e.getBoundingClientRect())); return st === 'fixed' || st === 'full'; });
    if (must && sc.scrollTop < 0.5 && !firstShown) issues.push('header, status, headline numbers and the first action are not all visible without scrolling');

    return { issues, info, texts: texts.map((x) => ({ id: x.id, t: x.t, fs: x.fs, color: x.color, r: x.r })), fullIds, sheetIds,
      cairo: R(cairo), sheet: { rect: R(SR), scrollTop: sc.scrollTop, max: sc.scrollHeight - sc.clientHeight, client: sc.clientHeight, pinned, firstShown,
        clearHeight: clear.y1 - clear.y0, pin: document.documentElement.dataset.pin === '1' },
      hits: taps.map((t) => ({ l: t.label, ...Object.fromEntries(Object.entries(t.hit).map(([k, v]) => [k, +v.toFixed(1)])) })) };
  }, { d, C: CFG, must });
}

// Contrast against the real rendered background (text made transparent, icons hidden), and Cairo's teal pixels.
async function contrast(p, texts, cairo) {
  await p.addStyleTag({ content: '.hud, .hud * { color: transparent !important; text-shadow: none !important; } .hud svg, .dev, .sbar { visibility: hidden !important; }' });
  await p.waitForTimeout(120);
  const buf = await p.screenshot({ scale: 'css' });
  await p.evaluate(() => { const s = document.querySelectorAll('style'); s[s.length - 1].remove(); });
  await p.waitForTimeout(60);
  return p.evaluate(async ({ b64, texts, cairo }) => {
    const img = new Image(); img.src = 'data:image/png;base64,' + b64; await img.decode();
    const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
    const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const k = img.width / innerWidth;
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const L = (r, gg, b) => 0.2126 * lin(r) + 0.7152 * lin(gg) + 0.0722 * lin(b);
    const parse = (s) => s.match(/[\d.]+/g).map(Number);
    const cr = (a, bb) => (Math.max(a, bb) + 0.05) / (Math.min(a, bb) + 0.05);
    const out = texts.map((t) => {
      const iy = t.r.h * 0.15;
      const x0 = Math.floor(t.r.x0 * k), y0 = Math.floor((t.r.y0 + iy) * k), w = Math.max(1, Math.ceil(t.r.w * k)), h = Math.max(1, Math.ceil((t.r.h - 2 * iy) * k));
      const d = g.getImageData(x0, y0, w, h).data; const ls = [];
      for (let i = 0; i < d.length; i += 4) ls.push(L(d[i], d[i + 1], d[i + 2]));
      ls.sort((a, b) => a - b);
      const [r, gg, b] = parse(t.color); const lt = L(r, gg, b);
      const worst = lt > 0.3 ? ls[ls.length - 1] : ls[0];
      return { id: t.id, t: t.t.slice(0, 18), fs: t.fs, worst: +cr(lt, worst).toFixed(2) };
    });
    const cd = g.getImageData(Math.floor(cairo.x0 * k), Math.floor(cairo.y0 * k), Math.ceil((cairo.x1 - cairo.x0) * k), Math.ceil((cairo.y1 - cairo.y0) * k)).data;
    let teal = 0;
    for (let i = 0; i < cd.length; i += 4) if (cd[i + 1] > 150 && cd[i + 2] > 140 && cd[i] < 150 && cd[i + 1] - cd[i] > 60) teal++;
    return { texts: out, tealPx: teal };
  }, { b64: buf.toString('base64'), texts, cairo });
}

async function open(ctx, url) {
  const p = await ctx.newPage();
  p.on('pageerror', (e) => console.log('pageerror:', e.message));
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true);
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  await p.waitForTimeout(400);
  return p;
}
const qs = (d) => `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
async function check(p, d, must) {
  const m = await measure(p, d, must);
  const c = await contrast(p, m.texts, m.cairo);
  c.texts.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} for "${x.t}"`));
  if (c.tealPx < 12) m.issues.push(`Cairo highlight not visible (${c.tealPx} teal pixels)`);
  m.contrast = c.texts; m.tealPx = c.tealPx;
  return m;
}

// ---------- self-test: each planted defect must be reported ----------
const DEFECTS = [
  ['type size', '.kpi .num { font-size: 12px !important; }', /font size 12 /],
  ['18 outside the name', '.gh span { font-size: 18px !important; }', /18 pt used outside the province name/],
  ['control height', '.act.first { height: 40px !important; }', /control height 40/],
  ['radius', '.kpi { border-radius: 6px !important; }', /radius 6 on \.kpi/],
  ['spacing', '.scroll { padding-left: 10px !important; }', /spacing off the 4\/8\/12 scale/],
  ['hit overlap', '.kpis { gap: 0 !important; } .kpi + .kpi { margin-right: -10px !important; }', /hit overlap/],
  ['side inset', '.sheet { right: calc(-1 * var(--side) + 20px) !important; }', /(side inset)/],
  ['bottom inset', '.hud { bottom: 0 !important; }', /tap in bottom inset/],
  ['contrast', '.cell .k { color: #4a5763 !important; }', /contrast \d/],
  ['text colour', '.cell .v { color: #ffffff !important; }', /text colour rgb\(255, 255, 255\) off the token list/],
  ['ellipsis', '.act.first .a-t { display: block; max-width: 40px; overflow: hidden; text-overflow: ellipsis; }', /ellipsis on/],
  ['wrapped text', '.act.first .a-t { white-space: normal !important; width: 40px; }', /wraps to/],
  ['not opaque', '.hud .glass > .frost::after { background: rgba(9, 17, 25, 0.66) !important; }', /panel not opaque/],
  ['block overlap', '.kpis { margin-top: -30px !important; }', /overlap status \/ kpis|overlap kpis \/ status/],
  ['Cairo covered', null, /Cairo highlight covered by sheet/, async (p) => p.evaluate(() => {
    const m = document.querySelector('.map').getBoundingClientRect(), s = m.width / 1688, sh = document.querySelector('.sheet').getBoundingClientRect();
    const cx = m.left + 787 * s, cy = m.top + 476 * s, st = document.documentElement.style;
    st.setProperty('--map-cx', (parseFloat(st.getPropertyValue('--map-cx')) + (sh.left + sh.width / 2 - cx)) + 'px');
    st.setProperty('--map-cy', (parseFloat(st.getPropertyValue('--map-cy')) + (sh.top + sh.height / 2 - cy)) + 'px');
  })],
  ['first action hidden', '.act.first { position: relative !important; }', /not all visible without scrolling/],
  ['cut text, no fade', '.efade { display: none !important; }', /text cut at the bottom of the scroll without a fade/, async (p) => p.evaluate(() => {
    document.documentElement.dataset.pin = '0'; document.querySelector('.act.first').classList.remove('pinned');
    document.querySelector('.act.first').style.position = 'relative';
    const sc = document.querySelector('.scroll'), dt = document.querySelectorAll('.kv dt')[3];          // cut a line in half at the bottom edge
    sc.scrollTop = dt.offsetTop + dt.offsetHeight / 2 - sc.clientHeight; })],
];

async function selftest(b, d) {
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 1 });
  const results = [];
  const base = await open(ctx, PAGE + qs(d));
  const m0 = await check(base, d, true);
  await base.close();
  results.push({ defect: 'none (clean page)', caught: m0.issues.length === 0, issues: m0.issues.slice(0, 6) });
  for (const [name, css, re, js] of DEFECTS) {
    const p = await open(ctx, PAGE + qs(d));
    if (css) await p.addStyleTag({ content: css });
    if (js) await js(p);
    await p.waitForTimeout(80);
    const m = await check(p, d, true);
    const hit = m.issues.filter((x) => re.test(x));
    results.push({ defect: name, caught: hit.length > 0, matched: hit.slice(0, 3), issues: hit.length ? undefined : m.issues.slice(0, 6) });
    await p.close();
  }
  await ctx.close();
  return results;
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let report = {};
  try { report = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8')); } catch (e) { report = {}; }
  if (SELFTEST) {
    const res = await selftest(b, DEVICES[0]);
    res.forEach((r) => console.log(`${r.caught ? 'PASS' : 'FAIL'}  ${r.defect}${r.matched ? '  <- ' + r.matched[0] : ''}${r.caught ? '' : '\n      ' + (r.issues || []).join('\n      ')}`));
    const ok = res.every((r) => r.caught);
    report._selftest = { device: DEVICES[0].id, ranAt: new Date().toISOString(), passed: ok, results: res };
    fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(report, null, 1));
    console.log('\nself-test', ok ? 'PASSED' : 'FAILED', `(${res.filter((r) => r.caught).length}/${res.length})`);
    await b.close();
    process.exit(ok ? 0 : 1);
  }
  for (const d of DEVICES) {
    const must = MUST_SHOW_FIRST_ACTION.includes(d.id);
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const p = await open(ctx, PAGE + qs(d));
    const states = [], seen = new Set(), issues = [];
    let pos = 0, k = 0, sheetIds = [];
    for (;;) {
      const sinfo = await p.evaluate((v) => window.__setScroll(v), pos);
      await p.waitForTimeout(120);
      const file = k === 0 ? d.id + '.png' : `${d.id}_scroll${k}.png`;
      await p.screenshot({ path: path.join(OUT, file) });
      const m = await check(p, d, must && k === 0);
      m.issues.forEach((x) => issues.push(k === 0 ? x : `[scroll ${Math.round(sinfo.scrollTop)}] ${x}`));
      m.fullIds.forEach((x) => seen.add(x));
      sheetIds = m.sheetIds;
      states.push({ file, scrollTop: sinfo.scrollTop, pinned: sinfo.pinned, issues: m.issues.length, info: m.info, sheet: m.sheet, tealPx: m.tealPx,
        contrastMin: Math.min(...m.contrast.map((x) => x.worst)), hits: k === 0 ? m.hits : undefined, contrast: k === 0 ? m.contrast : undefined });
      if (sinfo.scrollTop >= sinfo.max - 0.5) break;
      // next state: one clear screen on, keeping 48 pt of overlap (the top fade of the next state + a line)
      pos = sinfo.max - sinfo.scrollTop <= m.sheet.clearHeight - 24 ? sinfo.max : Math.min(sinfo.max, sinfo.scrollTop + Math.max(40, m.sheet.clearHeight - 48));
      k++;
    }
    sheetIds.filter((x) => !seen.has(x.id)).forEach((x) => issues.push(`never fully visible in any scroll state: "${x.t}"`));
    // drop scroll files left over from an earlier, longer run
    fs.readdirSync(OUT).filter((f) => new RegExp(`^${d.id}_scroll(\\d+)\\.png$`).test(f) && +f.match(/(\d+)\.png$/)[1] > k).forEach((f) => fs.unlinkSync(path.join(OUT, f)));
    await p.close();
    const ph = await open(ctx, PAGE + qs(d) + '&hit=1');
    await ph.screenshot({ path: path.join(__dirname, d.id + '_hit.png') });
    await ph.close();
    await ctx.close();
    report[d.id] = { device: `${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`, renderedAt: new Date().toISOString(),
      issueCount: issues.length, issues, firstActionWithoutScroll: states[0].sheet.firstShown, states };
    console.log(`\n== ${d.id} ${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`);
    states.forEach((s) => console.log(`  ${s.file}: scrollTop ${s.scrollTop} pinned ${s.pinned} issues ${s.issues} contrast min ${s.contrastMin} teal ${s.tealPx} | ${s.info.join('; ')}`));
    console.log('  first action without scrolling:', states[0].sheet.firstShown);
    console.log(issues.length ? '  ISSUES:\n    ' + issues.join('\n    ') : '  no issues');
  }
  const ordered = {};
  ALL.forEach((d) => { if (report[d.id]) ordered[d.id] = report[d.id]; });
  if (report._selftest) ordered._selftest = report._selftest;
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(ordered, null, 1));
  console.log('\nissues per device:', Object.entries(ordered).filter(([k]) => k[0] !== '_').map(([k, v]) => `${k} ${v.issues.length}`).join(', '));
  await b.close();
})();
