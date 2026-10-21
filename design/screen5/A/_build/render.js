// Screen 5 variant A (the state panel «الدولة»): render the iPhones and run the checks.
// Writes <id>.png (the overview tab) to the variant folder; <id>_leader.png, <id>_policies.png, <id>_policies_end.png,
// <id>_projects.png, <id>_projects_end.png, <id>_hit.png and report.json to _build.
// Checks (shared with the province panel's checker, screen 4 R): opaque panels (D-3); each control's height from the
// size table; radii; gaps; icon sizes and strokes; type sizes, weights and colours; 44 pt hit boxes (cover, no overlap,
// clipped by every clip); safe insets; panels never overlap; text over text, icons over text, clipped text (a cut only
// at a faded scroll edge, verified from the computed mask), % after its digits; contrast >= 4.5:1 per pixel over the
// rendered backdrop (opacity counted, faded text excluded). Screen 5 rules: the full-height sheet geometry; the dock
// left beside it (4 pt in, 8 pt clear) or hidden on the 375 pt phones; every other HUD element at its B3 place; the
// overview tab fits without scrolling at the loosest fit level; the section identity (pearl white on the dock item,
// the panel's top line, the emblem and the open tab); RTL order of every row; one choice per segmented law; the
// brief's strings per tab (visible, or reachable by scrolling clear of the fades); a bottom scroll hint; and on the
// map, Egypt and the delta clear, no label cut or squeezed between a panel and the screen edge.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
const want = args.filter((a) => !a.startsWith('--'));
const DEVICES = (want.length ? want : ALL.map((d) => d.id)).map((id) => ALL.find((d) => d.id === id) || (() => { throw new Error('unknown device ' + id); })());
// the files a report or self-test is made from; check_screen.py recomputes this hash and refuses a stale report
const INPUTS = ['index.html', '_build/render.js', '_build/state.css', '_build/sheet.html', '_build/assemble.py', '../../shared/section_identity.css', '../../screen4/R/_build/panel.css'];
const inputsHash = () => crypto.createHash('sha1').update(Buffer.concat(INPUTS.map((f) => fs.readFileSync(path.join(OUT, f))))).digest('hex');
const VIEWS = [['', ''], ['_leader', '&tab=leader'], ['_policies', '&tab=policies'], ['_policies_end', '&tab=policies&scroll=end'], ['_projects', '&tab=projects'], ['_projects_end', '&tab=projects&scroll=end']];

const TOK = {
  heights: [32, 36, 44], hudSpace: [0, 4, 8, 12], rCtl: 10, rCard: 12,
  type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] },
  icon: { ctl: 16, stat: 14, dock: 17, glyph: 10 }, stroke: 1.75,
  panel: 'rgb(12, 20, 28)', border: 'rgba(127, 233, 255, 0.14)',
  colors: ['rgb(234, 242, 247)', 'rgb(169, 188, 203)', 'rgb(127, 233, 255)', 'rgb(63, 224, 208)', 'rgb(242, 177, 76)', 'rgb(242, 112, 90)', 'rgb(111, 182, 255)',
    'rgb(233, 238, 244)', 'rgb(11, 18, 24)'],          // + the section's pearl white (open tab) and the dark text on white (primary button, chosen segment)
  sec: 'rgb(233, 238, 244)',                          // الدولة's identity colour
  // the panel's size table (the owner's reference): control heights, radii, icon sizes, gaps
  ctlH: { '.r-x': 32, '.r-why': 14, '.r-act': 44, '.r-tab': 44, '.r-btn': 24, '.s-sg': 26 },
  radius: { '.sheet': 12, '.r-act': 10, '.s-proj': 10, '.r-tile': 6, '.r-chip': 6, '.r-btn': 6, '.r-cap': 10, '.s-seg': 6, '.s-emb': 10 },
  sheetIcon: [['.r-cap svg', 10], ['.r-arr', 10], ['.r-kl svg', 14], ['.r-x svg', 16], ['.r-hint svg', 16], ['.s-emb svg', 16], ['.r-tile svg', 17], ['.r-tab svg', 17]],
  sheetSpace: [0, 2, 4, 8, 12, 16],
  title18: ['r-name', 'r-kv'],
  fade: 24,
};
// The brief's strings (as the page writes them). <view>: fully visible and clear of the fades in that render;
// reach_<tab>: every string of the tab, each of which some scroll position must show whole and clear of the fades.
const HEAD = ['مصر', 'إعداد واقعي', 'الرئيس محمد حسني مبارك · منذ 1981', 'نظرة عامة', 'القيادة', 'السياسات', 'المشاريع'];
const BRIEF = {
  overview: HEAD.concat(['رأس المال السياسي', '86', '+4 شهريًا', 'الاستقرار', '58%', '−1 شهريًا', 'الشرعية', '44', '/ 100', '−2 شهريًا', 'لماذا؟',
    'نظام الحكم', 'جمهورية رئاسية', 'الدستور', '1971 · عُدّل 2007', 'الحزب الحاكم', 'الحزب الوطني', 'الطوارئ', 'سارية منذ 1981',
    'رفع حالة الطوارئ', '60 رأس مال سياسي', 'تعديل وزاري', '25 رأس مال سياسي · مرة في السنة', 'تهدئة مؤقتة']),
  leader: HEAD.concat(['المناصب', 'محمد حسني مبارك', 'رئيس الجمهورية · العمر 82 · منذ 1981', 'تغيير الاسم']),
  policies: HEAD.concat(['الأمن والنظام', 'حالة الطوارئ', 'التغيير: 60 رأس مال سياسي', 'ملغاة', 'محدودة', 'شاملة']),
  policies_end: HEAD.concat(['الصحة العامة', 'مجانية', 'مدعومة', 'برسوم', 'بعد تغيير أي سياسة تنتظر 6 أشهر قبل أن تغيّرها مرة أخرى.']),
  projects: HEAD.concat(['مشاريع جارية', 'الخط الثالث لمترو القاهرة', 'المرحلة الأولى · تكتمل 2012', 'إلغاء', 'يُسترد 0.09 مليار $']),
  projects_end: HEAD.concat(['توسعة ميناء شرق بورسعيد', '1.2 مليار $ · 3 سنوات', 'بدء', 'إلغاء مشروع يُرجع ما دُفع فيه ناقص 10%.']),
  reach_leader: ['المناصب', 'محمد حسني مبارك', 'رئيس الجمهورية · العمر 82 · منذ 1981', 'تغيير الاسم', 'أحمد نظيف', 'رئيس الوزراء · منذ 2004', 'شاغر', 'نائب الرئيس',
    'مجلس الشعب', 'الحزب الوطني نحو 420 من 518 مقعدًا', 'الانتخابات القادمة', 'رئاسية · سبتمبر 2011', 'عند خلو المنصب', 'رئيس مجلس الشعب مؤقتًا'],
  reach_policies: ['الأمن والنظام', 'حالة الطوارئ', 'التجنيد', 'التظاهر', 'الحريات', 'الإعلام', 'الأحزاب', 'الإنترنت', 'الخدمات العامة', 'التعليم الحكومي', 'الصحة العامة',
    'التغيير: 50 رأس مال سياسي', 'التغيير: 40 رأس مال سياسي', 'التغيير: 30 رأس مال سياسي', 'التغيير: 20 رأس مال سياسي', 'تطوعي', 'انتقائي', 'إلزامي', 'مسموح', 'بإخطار', 'محظور',
    'حر', 'مقيد', 'موجَّه', 'حرة', 'بترخيص', 'محظورة', 'مفتوح', 'مراقَب', 'مجاني', 'مدعوم', 'برسوم', 'بعد تغيير أي سياسة تنتظر 6 أشهر قبل أن تغيّرها مرة أخرى.'],
  reach_projects: ['مشاريع جارية', 'الخط الثالث لمترو القاهرة', 'المرحلة الأولى · تكتمل 2012', 'يُسترد 0.09 مليار $', 'توشكى: استصلاح الأراضي', 'جنوب الوادي · تكتمل 2017',
    'يُسترد 0.41 مليار $', 'مشاريع متاحة', 'محطة الضبعة النووية', '4.5 مليار $ · 8 سنوات', 'توسعة ميناء شرق بورسعيد', '1.2 مليار $ · 3 سنوات', 'إلغاء مشروع يُرجع ما دُفع فيه ناقص 10%.'],
};
// the open tab's body, per view
const TABOF = { overview: 'overview', leader: 'leader', policies: 'policies', policies_end: 'policies', projects: 'projects', projects_end: 'projects' };

const HUDSEL = ['.top > .nation', '.top > .stats', '.top > .date', '.toast', '.btn.mode', '.btn.home', '.dock', '.dock-item'];
const HUDSEL_REST = HUDSEL.slice(0, 6);   // everything but the dock keeps its exact B3 place
const B3 = 'file://' + path.resolve(OUT, '../../screen1/B3/index.html');
async function hudRects(p) {
  return p.evaluate((HUDSEL) => {
    const o = {};
    HUDSEL.forEach((s) => { o[s] = [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; }); });
    o.hud = (() => { const r = document.querySelector('.hud').getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; })();
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
  return p.evaluate(({ d, TOK, BRIEF, b3, view, HUDSEL_REST, TABOF }) => {
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
        fbot = root.dataset.fbot === '1' && /calc\(100% - 24px\)/.test(mk) && new RegExp(clr + '\\)$').test(mk);
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
    const inFade = (r, e) => { const { c, ftop, fbot } = clipOf(e); return (ftop && r.y0 < c.y0 + TOK.fade) || (fbot && r.y1 > c.y1 - TOK.fade); };

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
      if (rr.every((r) => hiddenByScroll(box(r), el))) continue;
      typeSeen[`${fs}/${fw}`] = (typeSeen[`${fs}/${fw}`] || 0) + 1;
      if (!(fs in TOK.type)) issues.push(`font size ${fs} for "${t}"`);
      else if (!TOK.type[fs].includes(fw)) issues.push(`font weight ${fs}/${fw} for "${t}"`);
      if (fs === 18 && !TOK.title18.some((c) => el.closest('.' + c))) issues.push(`18 pt is for the province name and the headline numbers only: "${t}"`);
      if (fs === 13 && !/tabular-nums/.test(cs.fontVariantNumeric)) issues.push(`13 pt not tabular: "${t}"`);
      if (inSheet && !TOK.colors.includes(cs.color)) issues.push(`text colour off-token ${cs.color}: "${t}"`);
      if (cs.textOverflow === 'ellipsis') issues.push(`ellipsis on "${t}"`);
      const cl = clipOf(el).c;
      rr.forEach((r) => {
        const b = box(r), lh = parseFloat(cs.lineHeight), mid = (b.y0 + b.y1) / 2;
        const vb = { x0: Math.max(b.x0, cl.x0), x1: Math.min(b.x1, cl.x1), y0: Math.max(b.y0, cl.y0), y1: Math.min(b.y1, cl.y1) };   // the part on screen
        if (vb.x1 - vb.x0 <= 0.05 || vb.y1 - vb.y0 <= 0.05) return;
        const faded = inSheet && inFade(b, el);
        texts.push({ t, fs, color: cs.color, op: effOp(el), sheet: inSheet, faded, badge: !!el.closest('.badge'), r: R(r),
          line: { x0: vb.x0, x1: vb.x1, y0: Math.max(mid - lh / 2, cl.y0), y1: Math.min(mid + lh / 2, cl.y1) } });
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
      const cr = c.getBoundingClientRect(); if (hiddenByScroll(box(cr), c)) return;
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
    // fit: the overview tab shows everything without scrolling, at the loosest level that does
    const fit = window.__sheetfit, body = window.__body, tab = TABOF[view], lvNow = +root.dataset.rfit;
    const ovOver = () => { const was = root.dataset.tab; root.dataset.tab = 'overview'; const o = q('.r-body[data-tab="overview"]'), v = o.scrollHeight - o.clientHeight; root.dataset.tab = was; return v; };
    if (ovOver() > 0.5) issues.push(`overview needs scrolling: ${ovOver().toFixed(1)} pt (fit level ${lvNow})`);
    for (let L = 0; L < lvNow; L++) { root.dataset.rfit = String(L); if (ovOver() <= 0.5) issues.push(`fit level ${lvNow} is not the loosest that fits (level ${L} fits)`); }
    root.dataset.rfit = String(lvNow);
    // the open tab: its body only, the fades match its scroll state, a bottom scroll hint when it hides content
    if (root.dataset.tab !== tab) issues.push(`open tab ${root.dataset.tab} (want ${tab})`);
    const bd = q(`.r-body[data-tab="${tab}"]`);
    if (qa('.r-body').length !== 1 || !visible(bd)) issues.push(`more or less than the «${tab}» body is shown`);
    { const over = bd.scrollHeight - bd.clientHeight, wantTop = bd.scrollTop > 0.5, wantBot = bd.scrollTop < over - 0.5;
      if ((root.dataset.ftop === '1') !== wantTop || (root.dataset.fbot === '1') !== wantBot) issues.push(`fades ${root.dataset.ftop}/${root.dataset.fbot} do not match the scroll state (top ${bd.scrollTop}, over ${over.toFixed(1)})`);
      if (/_end$/.test(view) && over > 0.5 && bd.scrollTop < over - 0.5) issues.push('the _end render is not scrolled to the end'); }
    // scroll hint: when the bottom edge hides content, content visibly fades into it (at least 8 pt of a row in the fade)
    { const c = bd.getBoundingClientRect();
      const rows = [...bd.querySelectorAll('.r-sec h3, .s-off, .s-pol, .s-proj, .s-seats, .r-sc, .r-act, .r-kpi, .s-note')].filter(visible).map((e) => e.getBoundingClientRect());
      if (root.dataset.fbot === '1' && !rows.some((rr) => Math.min(rr.bottom, c.bottom) - Math.max(rr.top, c.bottom - TOK.fade) >= 8) && !visible(q('.r-hint'))) issues.push('no scroll hint: nothing fades into the bottom edge');
      if ((root.dataset.fbot === '1') !== visible(q('.r-hint'))) issues.push(`scroll hint chevron ${visible(q('.r-hint')) ? 'shown without' : 'missing with'} content below`); }
    // section identity: the open «الدولة» dock item, the panel's top line, the emblem and the open tab in pearl white
    { const on = qa('.dock-item.on');
      if (visible(q('.dock'))) {
        if (on.length !== 1 || on[0].textContent.trim() !== 'الدولة' || on[0].getAttribute('aria-current') !== 'page') issues.push('the open section «الدولة» is not marked in the dock');
        else if (getComputedStyle(on[0]).color !== TOK.sec || getComputedStyle(on[0], '::after').backgroundColor !== TOK.sec) issues.push(`dock item «الدولة» not in the section colour: ${getComputedStyle(on[0]).color}`);
      }
      const ln = getComputedStyle(q('.r-in'), '::before');
      if (ln.backgroundColor !== TOK.sec || ln.height !== '2px' || ln.top !== '0px') issues.push(`panel top line ${ln.backgroundColor} ${ln.height} (want the section colour, 2 pt, at the top)`);
      const em = q('.s-emb'); if (!em || !visible(em) || getComputedStyle(em).color !== TOK.sec) issues.push('section emblem missing or not in the section colour');
      const tb = q('.r-tab.on'); if (tb && (getComputedStyle(tb).color !== TOK.sec || !getComputedStyle(tb).boxShadow.includes(TOK.sec))) issues.push('open tab not in the section colour'); }
    // RTL order: header flag | name ... emblem | close; tabs right to left from «نظرة عامة»; action rows tile | text | chip;
    // office rows tile | text | button; project rows tile | text | actions; law rows text | segments, segments right to left
    { const fl = q('.r-flag').getBoundingClientRect(), nm = q('.r-name').getBoundingClientRect(), em = q('.s-emb').getBoundingClientRect(), xb = q('.r-x').getBoundingClientRect();
      if (!(fl.left >= nm.right - 0.5 && em.right <= nm.left && xb.right <= em.left + 0.5)) issues.push('header order must be flag, name, ..., emblem, close (right to left)'); }
    { const tabs = qa('.r-tab');
      if (tabs.length !== 4 || tabs[0].textContent.trim() !== 'نظرة عامة') issues.push('tabs must be the 4, «نظرة عامة» first');
      for (let k = 1; k < tabs.length; k++) if (!(tabs[k].getBoundingClientRect().right <= tabs[k - 1].getBoundingClientRect().left + 0.5)) issues.push(`tab ${k + 1} is not left of tab ${k}`);
      const ons = qa('.r-tab.on'); if (ons.length !== 1 || ons[0].dataset.for !== tab || ons[0].getAttribute('aria-selected') !== 'true') issues.push('exactly the open tab must be selected'); }
    const order = (row, sels, what) => { const bx = sels.map((s) => row.querySelector(s)).filter(Boolean).map((e) => e.getBoundingClientRect());
      for (let k = 1; k < bx.length; k++) if (!(bx[k].right <= bx[k - 1].left + 0.5)) { issues.push(`${what}: order must be ${sels.join(', ')} (right to left)`); return; } };
    qa('.r-act').forEach((a, i) => order(a, ['.r-tile', '.r-at', '.r-chip'], `action row ${i + 1}`));
    qa('.s-off').forEach((a, i) => order(a, ['.r-tile', '.r-at', '.r-btn'], `office row ${i + 1}`));
    qa('.s-proj').forEach((a, i) => order(a, ['.r-tile', '.r-at', '.s-pa'], `project row ${i + 1}`));
    qa('.s-pol').forEach((a, i) => { order(a, ['.r-at', '.s-seg'], `law row ${i + 1}`);
      const sg = [...a.querySelectorAll('.s-sg')];
      for (let k = 1; k < sg.length; k++) if (!(sg[k].getBoundingClientRect().right <= sg[k - 1].getBoundingClientRect().left + 0.5)) issues.push(`law row ${i + 1}: choices not right to left`);
      if (sg.filter((e) => e.classList.contains('on')).length !== 1 || sg.filter((e) => e.getAttribute('aria-checked') === 'true').length !== 1) issues.push(`law row ${i + 1}: exactly one choice`); });
    // bars fill from the right (RTL)
    qa('.s-bar i, .s-prog i').forEach((e) => { const pb = e.parentElement.getBoundingClientRect(), rr = e.getBoundingClientRect(); if (!near(rr.right, pb.right, 0.6)) issues.push('a bar does not fill from the right'); });
    { const f = q('.r-flag').getBoundingClientRect(); if (!near(f.width / f.height, 4 / 3, 0.01)) issues.push('flag is not 4:3'); }
    // ---------- 9. the brief's content: fully visible in this render ----------
    const leafs = (s) => { const cands = [...q('.sheet').querySelectorAll('*')].filter((e) => e.getClientRects().length && e.innerText && e.innerText.replace(/\s+/g, ' ').includes(s));
      return cands.filter((e) => !cands.some((o) => o !== e && e.contains(o))); };
    const clearShown = (e) => { const r = box(e.getBoundingClientRect()), { c } = clipOf(e);
      return r.y0 >= c.y0 - 0.5 && r.y1 <= c.y1 + 0.5 && r.x0 >= c.x0 - 0.5 && r.x1 <= c.x1 + 0.5 && !inFade(r, e) && effOp(e) >= 0.99; };
    BRIEF[view].forEach((s) => { const L = leafs(s); if (!L.length) issues.push(`brief text missing: ${s}`); else if (!L.some(clearShown)) issues.push(`brief text not fully visible: ${s}`); });
    (BRIEF['reach_' + tab] || []).forEach((s) => {
      const L = leafs(s); if (!L.length) { issues.push(`brief text missing: ${s}`); return; }
      const ok = L.some((e) => { const { scroller } = clipOf(e); return scroller ? e.getBoundingClientRect().height <= scroller.clientHeight - 2 * TOK.fade + 0.5 && effOp(e) >= 0.99 : clearShown(e); });
      if (!ok) issues.push(`brief text cannot be scrolled clear of the fades: ${s}`); });
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
    // map labels and city dots never cut by a panel edge (2 pt margin, halo included), never under the name pill
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
      prs.forEach((o) => { const sx0 = o.r.x0 < 70 ? 0 : o.r.x0, sx1 = W - o.r.x1 < 70 ? W : o.r.x1;
        if ((sx0 !== o.r.x0 || sx1 !== o.r.x1) && b.x1 > sx0 && b.x0 < sx1 && b.y1 > o.r.y0 && b.y0 < o.r.y1 && (r.left - sw < o.r.x0 || r.right + sw > o.r.x1)) issues.push(`map ${what} squeezed between a panel and the screen edge`); });
    });

    return { issues, typeSeen, texts, fit: { top: window.__fit, sheet: fit, sheetPos: window.__sheetpos, body }, map: m, hiddenLabels,
      sheet: R(sr), hits: taps.map((t) => ({ l: t.label, x0: +t.hit.x0.toFixed(1), x1: +t.hit.x1.toFixed(1), y0: +t.hit.y0.toFixed(1), y1: +t.hit.y1.toFixed(1) })) };
  }, { d, TOK, BRIEF, b3, view, HUDSEL_REST, TABOF });
}

async function contrast(p, texts) {
  await p.addStyleTag({ content: ':root body .hud, :root body .hud * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; } :root body .hud svg, :root body .hud .flag, :root body .hud .r-flag, .dev { visibility: hidden !important; } :root body .hud .r-rd i { box-shadow: none !important; } :root body .hud .r-rd i::after { display: none !important; }' });
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

async function open(ctx, url) {
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true);
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  await p.waitForTimeout(400);
  return p;
}
const qs = (d) => `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
const viewOf = (extra) => { const t = (extra.match(/tab=(\w+)/) || [0, 'overview'])[1]; return /scroll=end/.test(extra) ? t + '_end' : t; };

async function check(p, d, b3, view) {
  const m = await measure(p, d, b3, view);
  const c = await contrast(p, m.texts);
  c.filter((x) => x.worst < 4.5).forEach((x) => m.issues.push(`contrast ${x.worst} for "${x.t}"`));
  return { m, c };
}

// Self-test: plant defects and prove the checks catch each one (and that the clean pages have none).
async function selftest(b) {
  const d = ALL.find((x) => x.id === 'i16promax'), se = ALL.find((x) => x.id === 'se');
  const ref = { i16promax: await b3Rects(b, d), se: await b3Rects(b, se) };
  const ctxs = {};
  for (const x of [d, se]) ctxs[x.id] = await b.newContext({ viewport: { width: x.w, height: x.h }, deviceScaleFactor: 1 });
  // [name, device, extra url, css, expected issue, optional page script]
  const cases = [
    ['type size', d, '', '.r-name { font-size: 17px !important; }', /font size 17 for "مصر"/],
    ['18 pt misuse', d, '', '.r-sub { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for the province name/],
    ['font weight', d, '&tab=leader', '.s-off .r-at b { font-weight: 700 !important; }', /font weight 13\/700/],
    ['off-token colour', d, '', '.r-sc dt { color: #8899aa !important; }', /text colour off-token/],
    ['control height', d, '&tab=policies', '.s-sg { height: 30px !important; }', /control height 30.00 for \.s-sg/],
    ['radius', d, '&tab=projects', '.s-proj { border-radius: 8px !important; }', /radius 8 for \.s-proj/],
    ['gap', d, '&tab=policies', '.s-pol { gap: 6px !important; }', /gap 6 on/],
    ['icon size', d, '', '.r-tile svg.i { width: 19px !important; height: 19px !important; }', /icon size 19x19 \(want 17\)/],
    ['hit overlap', d, '&tab=policies', '.s-pol + .s-pol { margin-top: -6px !important; }', /hit overlap/],
    ['side inset', d, '', '.sheet { right: -30px !important; }', /tap in side inset|text in side inset|panel in side inset/],
    ['clipped text', d, '', '.r-sc dd { margin-inline-end: -40px !important; }', /clipped text|text outside the sheet|horizontal overflow/],
    ['text overlap', d, '', '.r-cap { margin-inline-start: -40px !important; }', /text overlap "مصر" \/ "إعداد واقعي"|text overlap "إعداد واقعي" \/ "مصر"/],
    ['icon over text', d, '', '.r-kl svg.i { margin-inline-end: -30px !important; }', /icon over text/],
    ['panel not opaque', d, '', '.sheet > .frost::after { background: rgba(9, 17, 25, 0.66) !important; }', /panel not opaque: الدولة/],
    ['see-through panel', d, '', '.sheet { opacity: .6 !important; }', /panel not opaque \(opacity 0\.60\)/],
    ['Egypt covered', d, '', ':root { --map-cx: 760px !important; }', /(Egypt|Nile delta) covered by panel الدولة/],
    ['sheet width', d, '', ':root { --sheet-w: 330px !important; }', /sheet width 330/],
    ['top row covered', d, '', '.sheet { top: 30px !important; }', /sheet top 38|panel overlap/],
    ['dock hidden although it fits', d, '', '[data-dock="left"] .dock { display: none !important; }', /dock hidden although it fits/],
    ['dock not moved left', d, '', '[data-dock="left"] .dock { align-self: center !important; }', /dock not 4 pt in from the left end|dock closer than 8 pt|panel overlap/],
    ['dock hit box in the side inset', d, '', '[data-dock="left"] .dock { margin-left: 0 !important; }', /tap in side inset: المزيد/],
    ['dock shown on the SE', se, '', '[data-dock="hidden"] .dock { display: flex !important; }', /dock shown although it does not fit|panel overlap/],
    ['left stack moved', d, '', '.lstack { margin-left: 8px; }', /HUD element moved from its B3 position: \.toast/],
    ['overview scrolls', se, '', '.r-acts { margin-top: 40px !important; }', /overview needs scrolling/],
    ['fit level not the loosest', d, '', '', /fit level 4 is not the loosest that fits/, () => { document.documentElement.dataset.rfit = '4'; }],
    ['fades wrong', d, '&tab=policies', '', /fades .* do not match the scroll state/, () => { document.documentElement.dataset.fbot = '0'; }],
    ['cut at a hard edge', se, '&tab=policies', '', /clipped text \(bottom\)|control cut by its scroll area \(bottom\)/, () => { document.documentElement.dataset.fbot = '0'; }],
    ['fade flag without a mask', se, '&tab=policies', '.r-body { -webkit-mask-image: none !important; mask-image: none !important; }', /clipped text \(bottom\)|control cut by its scroll area \(bottom\)/],
    ['no scroll hint', d, '&tab=policies', '.r-body[data-tab="policies"] .r-sec:first-child { margin-bottom: 600px !important; } .r-hint { display: none !important; }', /no scroll hint: nothing fades into the bottom edge/],
    ['hint chevron missing', d, '&tab=leader', '.r-hint { display: none !important; }', /scroll hint chevron missing with content below/],
    ['% before its number', d, '&tab=projects', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="projects"] .s-note').textContent = 'إلغاء مشروع يُرجع ما دُفع فيه ناقص 10%.'; }],
    ['brief text scrolled away', d, '&tab=policies', '', /brief text not fully visible: حالة الطوارئ/, () => { const b = document.querySelector('.r-body[data-tab="policies"]'); b.scrollTop = b.scrollHeight; }],
    ['brief text', d, '', '', /brief text not fully visible: لماذا؟|brief text missing/, () => { document.querySelectorAll('.r-why').forEach((e) => { e.textContent = 'لماذا'; }); }],
    ['map label cut', d, '', '.labels .cut { display: inline !important; }', /map (label|city dot) .* (cut by a panel edge|squeezed)/],
    ['contrast', d, '', '.r-st { background: rgb(234, 242, 247) !important; }', /^contrast [0-3](\.\d+)? for "نظام الحكم"/],
    ['faint text', d, '', '.r-sc dt { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for "نظام الحكم"|brief text not fully visible: نظام الحكم/],
    ['RTL order', d, '&tab=projects', '.s-proj .s-pa { order: -1; }', /project row 1: order must be/],
    ['law choices order', d, '&tab=policies', '.s-seg { direction: ltr; }', /law row 1: choices not right to left/],
    ['two choices in a law', d, '&tab=policies', '', /law row 1: exactly one choice/, () => { document.querySelector('.s-sg').classList.add('on'); }],
    ['two tabs selected', d, '', '', /exactly the open tab must be selected/, () => { document.querySelectorAll('.r-tab')[1].classList.add('on'); }],
    ['dock item not marked', d, '', '', /the open section «الدولة» is not marked in the dock/, () => { document.querySelector('.dock-item.on').classList.remove('on'); }],
    ['identity line colour', d, '', '[data-sec] .r-in::before { background: #43C08A !important; }', /panel top line rgb\(67, 192, 138\)/],
    ['emblem missing', d, '', '.s-emb { display: none !important; }', /section emblem missing/],
    ['bar fills from the left', d, '&tab=leader', '.s-bar i { inset: 0 auto 0 0 !important; }', /a bar does not fill from the right/],
    ['close not round', d, '', '.r-x { width: 40px !important; }', /close button is not round/],
  ];
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
  for (const x of [d, se]) for (const [suffix, extra] of VIEWS) {
    const p0 = await open(ctxs[x.id], PAGE + qs(x) + extra);
    clean[x.id + suffix] = (await check(p0, x, ref[x.id], viewOf(extra))).m.issues;
    console.log(`clean page ${x.id}${suffix}: ${clean[x.id + suffix].length} issues${clean[x.id + suffix].length ? ' -> ' + clean[x.id + suffix].slice(0, 4).join(' || ') : ''}`);
    await p0.close();
  }
  for (const c of Object.values(ctxs)) await c.close();
  const missed = results.filter((r) => !r.ok).map((r) => r.name), dirty = Object.values(clean).some((v) => v.length);
  fs.writeFileSync(path.join(__dirname, 'selftest.json'), JSON.stringify({ ranAt: new Date().toISOString(), inputs: { files: INPUTS, sha1: inputsHash() }, cleanIssues: clean, results }, null, 1));
  console.log(missed.length || dirty ? `SELFTEST FAILED (missed: ${missed.join(', ') || 'none'}; clean issues ${Object.values(clean).map((v) => v.length).join('/')})` : `selftest OK: ${cases.length} planted defects caught, clean pages 0 issues`);
}

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  if (SELFTEST) { await selftest(b); await b.close(); return; }
  let report = {};
  try { report = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8')); } catch (e) { report = {}; }
  for (const d of DEVICES) {
    const b3 = await b3Rects(b, d);
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const entry = { device: `${d.w}x${d.h} side ${d.side} bottom ${d.bottom} ${d.cutout}`, renderedAt: new Date().toISOString(), inputs: { files: INPUTS, sha1: inputsHash() },
      issues: [], views: {}, pngs: [] };
    for (const [suffix, extra] of VIEWS) {
      const png = suffix ? path.join(__dirname, d.id + suffix + '.png') : path.join(OUT, d.id + '.png');
      const p = await open(ctx, PAGE + qs(d) + extra);
      await p.screenshot({ path: png });
      entry.pngs.push(path.relative(OUT, png));
      if (!suffix) { const ph = await open(ctx, PAGE + qs(d) + '&hit=1'); await ph.screenshot({ path: path.join(__dirname, d.id + '_hit.png') }); await ph.close(); }
      const { m, c } = await check(p, d, b3, viewOf(extra));
      m.issues.forEach((i) => entry.issues.push(`${viewOf(extra)}: ${i}`));
      entry.views[viewOf(extra)] = { issueCount: m.issues.length, fit: m.fit, sheet: m.sheet, map: { ok: m.map.ok, egyptClear: m.map.egyptClear, zoom: m.map.zoom }, hiddenLabels: m.hiddenLabels,
        typeSeen: m.typeSeen, hits: m.hits, minContrast: Math.min(...c.map((x) => x.worst)), contrast: c };
      console.log(`== ${d.id}${suffix} fit ${JSON.stringify(m.fit.sheet)} dock ${m.fit.sheetPos.dock} body ${JSON.stringify(m.fit.body)} minContrast ${entry.views[viewOf(extra)].minContrast} zoom ${m.map.zoom} hidden ${JSON.stringify(m.hiddenLabels)}`);
      console.log(m.issues.length ? '  ISSUES:\n    ' + m.issues.join('\n    ') : '  no issues');
      await p.close();
    }
    entry.issueCount = entry.issues.length;
    report[d.id] = entry;
    await ctx.close();
  }
  const ordered = {};
  ALL.forEach((d) => { if (report[d.id]) ordered[d.id] = report[d.id]; });
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(ordered, null, 1));
  console.log('\nissues per device:', Object.entries(ordered).map(([k, v]) => `${k} ${v.issues.length}`).join(', '));
  await b.close();
})();
