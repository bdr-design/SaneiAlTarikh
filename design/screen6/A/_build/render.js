// Screen 6 variant A (the economy panel «الاقتصاد»): render the iPhones and run the checks.
// Writes <id>.png (the overview tab) to the variant folder; <id>_budget.png, <id>_budget_end.png, <id>_taxes.png,
// <id>_taxes_end.png, <id>_trade.png, <id>_trade_end.png, <id>_hit.png and report.json to _build. Each long tab is also
// checked at the middle scroll offsets its top and end views leave out (no PNG), so every row is checked once clear of
// the fades; and every brief string of a tab must be shown clear in one of its views. Before anything, index.html must
// be the current output of assemble.py.
// Checks (shared with the state panel's checker, screen 5 A): opaque panels (D-3); each control's height from the
// size table; radii; gaps; icon sizes and strokes; type sizes, weights and colours; 44 pt hit boxes (cover, no overlap,
// clipped by every clip); safe insets; panels never overlap; text over text, icons over text, clipped text (a cut only
// at a faded scroll edge, verified from the computed mask), % after its digits; contrast >= 4.5:1 per pixel over the
// rendered backdrop (opacity counted, faded text excluded). The economy rules: the full-height sheet geometry; the dock
// left beside it (4 pt in, 8 pt clear) or hidden on the 375 pt phones; every other HUD element at its B3 place; the
// overview tab fits without scrolling at the loosest fit level; the section identity (emerald on the dock item and its
// underline, the panel's top line across its width, the emblem and the open tab with its fill; the closed tabs and dock
// items neutral); the white touches; the panel's sizes; the section colour only on chrome (the share bars are a data
// colour, teal; the section colour on no other element), amber where the brief says; RTL order of every row; the rows
// read exactly as the brief's tables (name, line and value together); the money rule (under 1 billion in millions);
// the numbers agree (spending - revenue = deficit = 8.1% of GDP, the lines add up to the spending and their shares to
// 100%, every bar as drawn in proportion to its amount, the subsidies inside their line, the fuel cut's saving, the
// taxes and the trade balance; an unreadable number fails); interest (by name) is locked, every other line opens its
// adjuster; no image in the sheet but the flag and the header strip; the brief's strings per view; a bottom scroll hint
// in its clear strip; and on the map, Egypt and the delta clear, no label cut, squeezed, or sliced by the screen edge
// or the side inset.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const os = require('os');
const { execFileSync } = require('child_process');

const OUT = path.resolve(__dirname, '..');
const PAGE = 'file://' + path.join(OUT, 'index.html');
const ALL = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const args = process.argv.slice(2);
const SELFTEST = args.includes('--selftest');
const want = args.filter((a) => !a.startsWith('--'));
const DEVICES = (want.length ? want : ALL.map((d) => d.id)).map((id) => ALL.find((d) => d.id === id) || (() => { throw new Error('unknown device ' + id); })());
// the files a report or self-test is made from; check_screen.py recomputes this hash and refuses a stale report.
// The sources assemble.py reads, the B3 page the HUD is compared with, devices.json, and every file the two pages
// load (the header strip, the flags, the map images), as recorded when they open.
const REPO = path.resolve(OUT, '../../..');
const STATIC_INPUTS = ['index.html', '_build/render.js', '_build/econ.css', '_build/sheet.html', '_build/assemble.py', '../../shared/section_identity.css',
  '../../screen4/R/_build/panel.css', '../../screen5/A/_build/state.css', '../../screen4/A/index.html', '../../screen1/B3/index.html', '../../shared/devices.json'];
let INPUTS = STATIC_INPUTS.slice();
const inputsHash = () => crypto.createHash('sha1').update(Buffer.concat(INPUTS.map((f) => fs.readFileSync(path.join(OUT, f))))).digest('hex');
async function recordInputs(b) {
  const d = ALL.find((x) => x.id === 'i16promax'), seen = new Set();
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h } });
  ctx.on('request', (r) => { if (r.url().startsWith('file://')) seen.add(path.relative(OUT, decodeURIComponent(new URL(r.url()).pathname))); });
  for (const u of [PAGE + qs(d), B3 + qs(d)]) { const p = await open(ctx, u); await p.close(); }
  await ctx.close();
  INPUTS = [...new Set(STATIC_INPUTS.concat([...seen].sort()))];
}
// refuse to judge a page that is not what assemble.py makes from the current sources
function assertAssembled() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'screen6-'));
  try {
    execFileSync('python3', ['-I', path.join(__dirname, 'assemble.py'), REPO, __dirname, tmp], { stdio: 'pipe' });
    if (!fs.readFileSync(path.join(tmp, 'index.html')).equals(fs.readFileSync(path.join(OUT, 'index.html')))) throw new Error('index.html is not the current output of assemble.py: run assemble.py first');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
// the saved views (PNG + checks); the middle scroll offsets of each long tab are added per phone (checks only)
const VIEWS = [['', ''], ['_budget', '&tab=budget'], ['_budget_end', '&tab=budget&scroll=end'], ['_taxes', '&tab=taxes'], ['_taxes_end', '&tab=taxes&scroll=end'],
  ['_trade', '&tab=trade'], ['_trade_end', '&tab=trade&scroll=end']];
// the scrolling sequences: each gets its top view, its end view and the middle offsets between them
const SEQS = [['budget', '&tab=budget'], ['taxes', '&tab=taxes'], ['trade', '&tab=trade']];

const TOK = {
  heights: [32, 36, 44], hudSpace: [0, 4, 8, 12], rCtl: 10, rCard: 12,
  type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] },
  icon: { ctl: 16, stat: 14, dock: 17, glyph: 10 }, stroke: 1.75,
  panel: 'rgb(12, 20, 28)', border: 'rgba(127, 233, 255, 0.14)',
  colors: ['rgb(234, 242, 247)', 'rgb(169, 188, 203)', 'rgb(127, 233, 255)', 'rgb(63, 224, 208)', 'rgb(242, 177, 76)', 'rgb(242, 112, 90)', 'rgb(111, 182, 255)',
    'rgb(67, 192, 138)'],                             // + the section's emerald (the open tab only)
  sec: 'rgb(67, 192, 138)',                           // الاقتصاد's identity colour
  t1: 'rgb(234, 242, 247)', t2: 'rgb(169, 188, 203)', dark: 'rgb(11, 18, 24)', amber: 'rgb(242, 177, 76)',
  wLine: 'rgba(234, 242, 247, 0.5)', wLineDim: 'rgba(234, 242, 247, 0.28)', teal: 'rgb(63, 224, 208)', amberLine: 'rgba(242, 177, 76, 0.7)',
  tabIcons: '#i-grid,#i-pie,#i-percent,#i-ship',
  // the brief's sizes for this panel: [selector, width, height] (null: not fixed)
  size: [['.s-emb', 32, 32], ['.e-row', null, 44], ['.e-flow', null, 36], ['.e-bar', 72, 6], ['.r-tile', 34, 34]],
  // the panel's size table (the owner's reference): control heights, radii, icon sizes, gaps
  ctlH: { '.r-x': 32, '.r-why': 14, '.r-act': 44, '.r-tab': 44, '.e-row': 44 },
  radius: { '.sheet': 12, '.r-act': 10, '.e-row': 10, '.r-tile': 6, '.r-chip': 6, '.r-cap': 10, '.s-emb': 10, '.e-bar': 3 },
  sheetIcon: [['.r-cap svg', 10], ['.r-arr', 10], ['.r-kl svg', 14], ['.r-x svg', 16], ['.r-hint svg', 16], ['.r-chev', 16], ['.e-lock', 16], ['.s-emb svg', 16], ['.r-tile svg', 17], ['.r-tab svg', 17]],
  sheetSpace: [0, 2, 4, 8, 12, 16],
  title18: ['.r-name', '.r-kv b', '.e-sum b'],
  fade: 24, strip: 22,                                // the fade, and the clear strip under the bottom fade for the scroll hint
  overlap: 56,                                        // the middle views overlap their neighbours by this much (a whole project row)
};
// The brief's strings (as the page writes them). <view>: fully visible and clear of the fades in that render;
// reach_<tab>: every string of the tab, each of which some scroll position must show whole and clear of the fades.
const HEAD = ['الاقتصاد', 'الجنيه المصري', 'مصر · السنة المالية 2010/11', 'نظرة عامة', 'الميزانية', 'الضرائب والدعم', 'التجارة والعملة'];
const LINES = [['الدعم والحماية الاجتماعية', '17.2 مليار $ · 26%'], ['الفوائد', '13.3 مليار $ · 20% · إلزامية'], ['الإدارة العامة', '9.9 مليار $ · 15%'],
  ['التعليم', '7.3 مليار $ · 11%'], ['الاستثمار العام', '7.3 مليار $ · 11%'], ['الدفاع', '4.0 مليار $ · 6%'], ['الأمن الداخلي', '3.3 مليار $ · 5%'],
  ['الصحة', '3.3 مليار $ · 5%'], ['البحث العلمي', '700 مليون $ · 1%']];
// the brief's tables, row by row (each cell as the page writes it): the checker compares them in every view
const ROWS = {
  kpis: [['الناتج المحلي', '219', 'مليار $', '+5.1% سنويًا', 'لماذا؟'], ['التضخم', '10.3%', '', '+0.1 نقطة شهريًا', 'لماذا؟'], ['البطالة', '8.9%', '', 'دون تغير', 'لماذا؟']],
  status: [['عجز الموازنة', '8.1% من الناتج'], ['الدين العام', '73% من الناتج'], ['سعر الصرف', '5.80 جنيه للدولار'], ['التصنيف', 'BB+ مستقر'],
    ['نظام الصرف', 'تعويم مُدار'], ['قابلية التحويل', 'كاملة'], ['الاحتياطي الأجنبي', '8 أشهر واردات'], ['ضوابط رأس المال', 'محدودة'], ['فائدة المركزي', '8.25%'], ['تمويل العجز', 'اقتراض محلي']],
  acts: [['طرح سندات دولية', '1 مليار $ · فائدة 6.2% · 10 سنوات', 'تمويل العجز'], ['خفض دعم الوقود 10%', 'يوفّر 1.2 مليار $ سنويًا', 'الشرعية']],
  sum: [['الإيرادات', '48.6'], ['الإنفاق', '66.3'], ['العجز', '17.7']],
  lines: LINES,
  taxes: [['ضريبة الدخل', 'الشريحة العليا · 3.6 مليار $ سنويًا', '20%'], ['ضريبة الشركات', '11.6 مليار $ سنويًا', '20%'], ['ضريبة المبيعات', 'السعر العام · 12.2 مليار $ سنويًا', '10%'],
    ['الرسوم الجمركية', 'المعدل الفعلي · 2.7 مليار $ سنويًا', '5%']],
  subsidies: [['دعم الوقود', 'سنويًا · بنزين وسولار وغاز', '11.7 مليار $'], ['دعم الخبز والتموين', 'سنويًا · 63 مليون مستفيد', '2.9 مليار $'], ['دعم الكهرباء', 'سنويًا · للمنازل والمصانع', '900 مليون $']],
  currency: [['السياسة النقدية والعملة', 'الفائدة والصرف وضوابط رأس المال · تغيير تدريجي']],
  flows: [['الصادرات', 'نفط وغاز · كيماويات · منسوجات · غذاء', '26.3'], ['الواردات', 'قمح · آلات · وقود مكرر · سيارات', '52.9'], ['الميزان التجاري', 'الصادرات ناقص الواردات', '−26.6'],
    ['قناة السويس', 'رسوم العبور · ممر ملاحي تملكه مصر', '4.8'], ['السياحة', '14.7 مليون زائر', '12.5'], ['تحويلات المصريين بالخارج', 'الخليج · أوروبا · أمريكا', '12.6'],
    ['الحساب الجاري', 'بعد الخدمات والأرباح المحوّلة للخارج', '−4.3']],
};
const NOTE_BUDGET = 'الفوائد لا تُخفَّض، ودعم الوقود والخبز والكهرباء يُعدَّل من تبويب الضرائب والدعم.';
const NOTE_TAXES = 'الضرائب 30.1 مليار $ من إيرادات 48.6، والباقي من قناة السويس والبترول والمنح. رفع ضريبة أو خفض دعم يزيد الاضطراب في المحافظات الأفقر أولًا.';
const NOTE_TRADE = 'تغيير نظام الصرف إصلاح تدريجي يستغرق أشهرًا.';
const PARTNERS = 'الاتحاد الأوروبي · الولايات المتحدة · الصين · السعودية · الهند';
const BRIEF = {
  overview: HEAD.concat(['الناتج المحلي', '219', 'مليار $', '+5.1% سنويًا', 'التضخم', '10.3%', '+0.1 نقطة شهريًا', 'البطالة', '8.9%', 'دون تغير', 'لماذا؟',
    'عجز الموازنة', '8.1% من الناتج', 'الدين العام', '73% من الناتج', 'سعر الصرف', '5.80 جنيه للدولار', 'التصنيف', 'BB+ مستقر',
    'طرح سندات دولية', '1 مليار $ · فائدة 6.2% · 10 سنوات', 'تمويل العجز', 'خفض دعم الوقود 10%', 'يوفّر 1.2 مليار $ سنويًا', 'الشرعية']),
  budget: HEAD.concat(['48.6', 'الإيرادات', '66.3', 'الإنفاق', '17.7', 'العجز', 'مليار $ سنويًا', 'الخزينة 36.0 مليار $ · تنقص 1.5 مليار $ شهريًا', 'بنود الإنفاق', 'الدعم والحماية الاجتماعية', '17.2 مليار $ · 26%']),
  budget_end: HEAD.concat(['البحث العلمي', '700 مليون $ · 1%', NOTE_BUDGET]),
  taxes: HEAD.concat(['الضرائب', 'ضريبة الدخل', 'الشريحة العليا · 3.6 مليار $ سنويًا', '20%']),
  taxes_end: HEAD.concat(['دعم الكهرباء', '900 مليون $', NOTE_TAXES]),
  trade: HEAD.concat(['نظام الصرف', 'تعويم مُدار', 'قابلية التحويل', 'كاملة', 'الاحتياطي الأجنبي', '8 أشهر واردات', 'ضوابط رأس المال', 'محدودة',
    'فائدة المركزي', '8.25%', 'تمويل العجز', 'اقتراض محلي', 'السياسة النقدية والعملة', 'الفائدة والصرف وضوابط رأس المال · تغيير تدريجي', 'الميزان الخارجي · مليار $ سنويًا']),
  trade_end: HEAD.concat(['أكبر الشركاء', PARTNERS, NOTE_TRADE]),
  // every string of a scrolling tab: each must be shown whole and clear of the fades in one of the tab's views
  reach_budget: ['48.6', 'الإيرادات', '66.3', 'الإنفاق', '17.7', 'العجز', 'مليار $ سنويًا', 'الخزينة 36.0 مليار $ · تنقص 1.5 مليار $ شهريًا', 'بنود الإنفاق'].concat(LINES.flat(), [NOTE_BUDGET]),
  reach_taxes: ['الضرائب', 'الدعم'].concat(ROWS.taxes.flat(), ROWS.subsidies.flat(), [NOTE_TAXES]),
  reach_trade: ['نظام الصرف', 'تعويم مُدار', 'قابلية التحويل', 'كاملة', 'الاحتياطي الأجنبي', '8 أشهر واردات', 'ضوابط رأس المال', 'محدودة', 'فائدة المركزي', '8.25%',
    'تمويل العجز', 'اقتراض محلي', 'الميزان الخارجي · مليار $ سنويًا',
    'أكبر الشركاء', PARTNERS, NOTE_TRADE].concat(ROWS.currency.flat(), ROWS.flows.flat()),
};
// a view's name: <tab>[_end|_at<offset>]; its tab is the first part, its scrolling sequence all but the scroll part
const tabOf = (view) => view.split('_')[0];
const seqOf = (view) => view.replace(/_(end|at\d+)$/, '');

const HUDSEL = ['.top > .nation', '.top > .stats', '.top > .date', '.toast', '.btn.mode', '.btn.home', '.dock', '.dock-item'];
const HUDSEL_REST = HUDSEL.slice(0, 6);   // everything but the dock keeps its exact B3 place
const B3 = 'file://' + path.resolve(OUT, '../../screen1/B3/index.html');
async function hudRects(p) {
  return p.evaluate((HUDSEL) => {
    const o = {};
    HUDSEL.forEach((s) => { o[s] = [...document.querySelectorAll(s)].map((e) => { const r = e.getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; }); });
    o.hud = (() => { const r = document.querySelector('.hud').getBoundingClientRect(); return { x0: r.left, y0: r.top, x1: r.right, y1: r.bottom }; })();
    // the dock items' neutral look (label, icon colour and opacity)
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
  return p.evaluate(({ d, TOK, BRIEF, ROWS, HEAD, b3, view, HUDSEL_REST }) => {
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
      if (fs === 18 && !TOK.title18.some((c) => el.closest(c))) issues.push(`18 pt is for the panel's name and the headline numbers only: "${t}"`);
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
    const fit = window.__sheetfit, body = window.__body, tab = view.split('_')[0], lvNow = +root.dataset.rfit;
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
    // scroll hint: when the bottom edge hides content, content visibly fades into it (at least 8 pt of a row in the fade),
    // and the chevron sits centred in the clear strip under the fade, over no legible text
    { const c = bd.getBoundingClientRect(), fb = c.bottom - TOK.strip;
      const rows = [...bd.querySelectorAll('.r-sec h3, .e-sum, .e-row, .e-flow, .e-partners, .r-sc, .r-act, .r-kpi, .s-note')].filter(visible).map((e) => e.getBoundingClientRect());
      if (root.dataset.fbot === '1' && !rows.some((rr) => Math.min(rr.bottom, fb) - Math.max(rr.top, fb - TOK.fade) >= 8) && !visible(q('.r-hint'))) issues.push('no scroll hint: nothing fades into the bottom edge');
      if ((root.dataset.fbot === '1') !== visible(q('.r-hint'))) issues.push(`scroll hint chevron ${visible(q('.r-hint')) ? 'shown without' : 'missing with'} content below`);
      const h = q('.r-hint');
      if (visible(h)) {
        const hb = h.getBoundingClientRect();
        if (hb.top < fb - 0.5 || hb.bottom > c.bottom + 0.5 || Math.abs((hb.left + hb.right) / 2 - (c.left + c.right) / 2) > 0.6) issues.push(`scroll hint not centred in the clear strip under the fade: y ${hb.top.toFixed(1)}..${hb.bottom.toFixed(1)} (strip ${fb.toFixed(1)}..${c.bottom.toFixed(1)})`);
        texts.filter((x) => x.sheet && !x.faded).forEach((x) => { if (inter(x.line, box(hb))) issues.push(`scroll hint over text: "${x.t}"`); });
      } }
    // section identity: the open «الاقتصاد» dock item, the panel's top line, the emblem and the open tab in emerald
    { const on = qa('.dock-item.on'), drawn = (cs) => cs.content !== 'none' && cs.content !== 'normal' && cs.display !== 'none';
      if (visible(q('.dock'))) {
        if (on.length !== 1 || on[0].textContent.trim() !== 'الاقتصاد' || on[0].getAttribute('aria-current') !== 'page') issues.push('the open section «الاقتصاد» is not marked in the dock');
        else {
          const ul = getComputedStyle(on[0], '::after');
          if (getComputedStyle(on[0]).color !== TOK.sec || getComputedStyle(on[0].querySelector('svg')).color !== TOK.sec) issues.push(`dock item «الاقتصاد» not in the section colour: ${getComputedStyle(on[0]).color}`);
          if (!drawn(ul) || ul.backgroundColor !== TOK.sec || ul.width !== '16px' || ul.height !== '2px') issues.push(`dock underline missing or off: ${ul.content} ${ul.width}x${ul.height} ${ul.backgroundColor} (want 16 x 2 in the section colour)`);
        }
        // the dock stays neutral as on B3: only the open section takes its colour
        [...document.querySelectorAll('.dock-item')].forEach((e, i) => {
          const ref = b3 && b3.dockLook && b3.dockLook[i]; if (!ref || e.classList.contains('on')) return;
          const s = e.querySelector('svg'), l = e.querySelector('span');
          if (getComputedStyle(l).color !== ref.label || getComputedStyle(s).color !== ref.icon || getComputedStyle(s).opacity !== ref.op) issues.push(`dock item ${i + 1} (closed) not neutral as on B3: ${getComputedStyle(l).color} / ${getComputedStyle(s).color}`);
        });
      }
      const inr = q('.r-in'), ln = getComputedStyle(inr, '::before');
      if (!drawn(ln) || ln.backgroundColor !== TOK.sec || ln.height !== '2px' || ln.top !== '0px') issues.push(`panel top line ${ln.content} ${ln.backgroundColor} ${ln.height} (want the section colour, 2 pt, at the top)`);
      else if (Math.abs(parseFloat(ln.width) - inr.clientWidth) > 0.5 || ln.left !== '0px') issues.push(`panel top line width ${ln.width} at ${ln.left} (want the panel's ${inr.clientWidth} pt)`);
      const em = q('.s-emb'); if (!em || !visible(em) || getComputedStyle(em).color !== TOK.sec) issues.push('section emblem missing or not in the section colour');
      const tb = q('.r-tab.on');
      if (tb && (getComputedStyle(tb).color !== TOK.sec || !getComputedStyle(tb).boxShadow.includes(TOK.sec))) issues.push('open tab not in the section colour');
      if (tb && /rgba\(0, 0, 0, 0\)|transparent/.test(getComputedStyle(tb).backgroundColor)) issues.push('open tab without its fill');
      qa('.r-tab:not(.on)').forEach((e) => { if (getComputedStyle(e).color !== TOK.t2) issues.push(`closed tab not in the secondary grey: ${e.textContent.trim()} ${getComputedStyle(e).color}`); }); }
    // the section colour is for chrome only (the open tab, the emblem; the top line and the dock are pseudo-elements and
    // outside the sheet): no text, border, fill or icon of the sheet takes it; the share bars are a data colour, teal
    texts.filter((x) => x.sheet && !x.chrome && x.color === TOK.sec).forEach((x) => issues.push(`section colour on data text: "${x.t}"`));
    qa('.sheet *').filter((e) => !e.closest('.r-tab.on, .s-emb, .frost')).forEach((e) => { const cs = getComputedStyle(e);
      if ([cs.borderTopColor, cs.backgroundColor].includes(TOK.sec) || (e.closest('svg') && [cs.color, cs.stroke, cs.fill].includes(TOK.sec))) issues.push(`section colour on data chrome: ${label(e)}`); });
    qa('.e-bar i').forEach((e) => { if (getComputedStyle(e).backgroundColor !== TOK.teal) issues.push(`a share bar not in teal (bars are data): ${getComputedStyle(e).backgroundColor}`); });
    { const amberOf = (sel, txt) => { const e = [...document.querySelectorAll(sel)].find((n) => visible(n) && n.textContent.replace(/\s+/g, ' ').trim() === txt);
        if (!e) issues.push(`amber check: «${txt}» not found`); else if (getComputedStyle(e).color !== TOK.amber) issues.push(`«${txt}» not in amber: ${getComputedStyle(e).color}`); };
      if (tab === 'overview') { amberOf('.r-kv b', '10.3%'); amberOf('.r-sc dd', '8.1% من الناتج'); amberOf('.r-chip', 'الشرعية'); }
      if (tab === 'budget') { amberOf('.e-sum b', '17.7'); amberOf('.e-trs .r-amber', 'تنقص 1.5 مليار $ شهريًا'); }
      if (tab === 'trade') { amberOf('.e-flow .e-val', '−26.6'); amberOf('.e-flow .e-val', '−4.3'); } }
    // the panel's sizes (the brief); the budget summary: 18 pt bold numbers, each under its label (same right edge)
    TOK.size.forEach(([s, w, h]) => qa('.sheet ' + s).forEach((e) => { const r = e.getBoundingClientRect(); if (hiddenByScroll(box(r), e)) return;
      if ((w && !near(r.width, w)) || (h && !near(r.height, h))) issues.push(`size ${r.width.toFixed(1)}x${r.height.toFixed(1)} for ${s} (want ${w || 'any'} x ${h || 'any'})`); }));
    if (tab === 'budget') qa('.e-sum span').forEach((s) => { const b = s.querySelector('b'), cs = getComputedStyle(b), rg = document.createRange(); rg.setStart(s, 0); rg.setEnd(s, 1);
      if (parseFloat(cs.fontSize) !== 18 || +cs.fontWeight !== 700) issues.push(`summary number not 18/700: ${b.textContent.trim()} ${cs.fontSize}/${cs.fontWeight}`);
      if (Math.abs(b.getBoundingClientRect().right - rg.getBoundingClientRect().right) > 1) issues.push(`summary number ${b.textContent.trim()} not under its label`); });
    // the white touches the owner confirmed: white tiles, white-outlined chips and the header chip; the warning chip is
    // amber with its down arrow
    { const wt = (sel, want, skip) => qa('.sheet ' + sel).filter((e) => !(skip && e.matches(skip))).forEach((e) => { const cs = getComputedStyle(e);
        Object.entries(want).forEach(([k, v]) => { if (cs[k] !== v) issues.push(`white touch off: ${sel} ${k} ${cs[k]} (want ${v})`); }); });
      wt('.r-tile', { color: TOK.t1 });
      wt('.r-chip', { borderTopColor: TOK.wLine, color: TOK.t1 }, '.e-bad');
      wt('.r-chip.e-bad', { borderTopColor: TOK.amberLine, color: TOK.amber });
      qa('.sheet .r-chip.e-bad').forEach((e) => { if (!e.querySelector('svg.r-arr use[href="#t-down"]')) issues.push('legitimacy chip without its down arrow'); });
      wt('.r-cap', { borderTopColor: TOK.wLine, color: TOK.t1 }); }
    // the lines: interest (by its name) is locked: a lock, not a control; every other budget, tax, subsidy and currency
    // line opens its adjuster
    qa('.e-row').forEach((e) => { const nm = (e.querySelector('.r-at b') || e).textContent.trim(), fixed = nm === 'الفوائد';
      if (e.classList.contains('e-fixed') !== fixed) issues.push(`«${nm}»: the e-fixed marker on the wrong line`);
      if (fixed && (e.classList.contains('tap') || e.getAttribute('role') === 'button' || !e.querySelector('.e-lock') || e.querySelector('.r-chev'))) issues.push(`«${nm}»: a mandatory line must show a lock and not be a control`);
      if (!fixed && (!e.classList.contains('tap') || e.getAttribute('role') !== 'button' || !e.querySelector('.r-chev') || e.querySelector('.e-lock'))) issues.push(`«${nm}»: a line must open its adjuster (a control with a chevron)`); });
    // the rows read exactly as the brief's tables (they are in the page whichever tab is open)
    { const T = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : '');
      const rowsAre = (what, sel, parts, want) => { const got = [...document.querySelectorAll(sel)].map((r) => parts.map((p) => (typeof p === 'function' ? p(r) : T(r.querySelector(p)))));
        if (JSON.stringify(got) !== JSON.stringify(want)) issues.push(`brief rows differ: ${what}: ${JSON.stringify(got).slice(0, 160)}`); };
      rowsAre('headline numbers', '.r-kpi', ['.r-kl', '.r-kv b', '.r-kv > span', '.r-kr', '.r-why'], ROWS.kpis);
      rowsAre('status', '.r-sc', ['dt', 'dd'], ROWS.status);
      rowsAre('decisions', '.r-act', ['.r-at > b', '.r-at > span', '.r-chip'], ROWS.acts);
      rowsAre('budget summary', '.e-sum span', [(r) => r.firstChild.textContent.trim(), 'b'], ROWS.sum);
      rowsAre('budget lines', '.r-body[data-tab="budget"] .e-row', ['.r-at > b', '.r-at > span'], ROWS.lines);
      rowsAre('taxes', '.r-body[data-tab="taxes"] .r-sec:nth-of-type(1) .e-row', ['.r-at > b', '.r-at > span', '.e-val'], ROWS.taxes);
      rowsAre('subsidies', '.r-body[data-tab="taxes"] .r-sec:nth-of-type(2) .e-row', ['.r-at > b', '.r-at > span', '.e-val'], ROWS.subsidies);
      rowsAre('currency', '.r-body[data-tab="trade"] .e-row', ['.r-at > b', '.r-at > span'], ROWS.currency);
      rowsAre('external balance', '.e-flow', ['.r-at > b', '.r-at > span', '.e-val'], ROWS.flows); }
    // the money rule: under 1 billion in millions, never 1000 millions or more
    { const all = q('.sheet').textContent.replace(/\s+/g, ' ');
      for (const m of all.matchAll(/(\d+(?:\.\d+)?) مليار/g)) if (parseFloat(m[1]) < 1) issues.push(`money unit: «${m[0]}» (under 1 billion is written in millions)`);
      for (const m of all.matchAll(/(\d+(?:\.\d+)?) (?:مليون|ملايين) \$/g)) if (parseFloat(m[1]) >= 1000) issues.push(`money unit: «${m[0]}» (1000 millions and more are billions)`); }
    // the numbers agree with each other (they are in the page whichever tab is open); a number that cannot be read fails
    { const num = (s) => parseFloat(s.replace('−', '-').replace(/[^\d.\-]/g, '')), off = (x, tol) => !(Math.abs(x) <= tol);
      const [rev, spend, def] = [...document.querySelectorAll('.e-sum b')].map((e) => num(e.textContent));
      if (off(spend - rev - def, 0.051)) issues.push(`numbers: spending ${spend} - revenue ${rev} is not the deficit ${def}`);
      const gdp = num(document.querySelector('.r-kpi .r-kv b').textContent), defPct = num(document.querySelector('.r-sc dd').textContent);
      if (off(def / gdp * 100 - defPct, 0.06)) issues.push(`numbers: the deficit ${def} is ${(def / gdp * 100).toFixed(2)}% of GDP ${gdp}, not ${defPct}%`);
      const rows = [...document.querySelectorAll('.r-body[data-tab="budget"] .e-row')];
      const amt = rows.map((e) => parseFloat(e.dataset.amount)), shown = rows.map((e) => { const s = e.querySelector('.r-at > span').textContent.split('·')[0]; return /مليون/.test(s) ? num(s) / 1000 : num(s); });
      amt.forEach((a, i) => { if (off(a - shown[i], 0.001)) issues.push(`numbers: line ${i + 1} shows ${shown[i]} but its data is ${a}`); });
      const total = amt.reduce((a, b) => a + b, 0), max = Math.max(...amt);
      if (off(total - spend, 0.051)) issues.push(`numbers: the lines add up to ${total.toFixed(1)}, not the spending ${spend}`);
      const pct = rows.map((e) => num(e.querySelector('.r-at > span').textContent.split('·')[1]));
      if (pct.reduce((a, b) => a + b, 0) !== 100) issues.push(`numbers: the shares add up to ${pct.reduce((a, b) => a + b, 0)}%`);
      pct.forEach((p, i) => { if (off(amt[i] / spend * 100 - p, 0.6)) issues.push(`numbers: line ${i + 1} is ${(amt[i] / spend * 100).toFixed(1)}% of the spending, shown ${p}%`); });
      // each bar as drawn (clipped to its track), against its amount over the largest line's
      rows.forEach((e, i) => { const bi = e.querySelector('.e-bar i'), rr = bi.getBoundingClientRect(), pb = bi.parentElement.getBoundingClientRect();
        if (!pb.width) return;                                            // drawn only while the budget tab is open
        const w = +((Math.min(rr.right, pb.right) - Math.max(rr.left, pb.left)) / pb.width * 100).toFixed(1);
        if (off(w - amt[i] / max * 100, 1.5)) issues.push(`numbers: bar ${i + 1} is ${w}% (want ${(amt[i] / max * 100).toFixed(1)}% of the largest line)`); });
      // a value in billions (a «مليون $» value counts as thousandths)
      const val = (txt) => { const r = [...document.querySelectorAll('.e-row, .e-flow')].find((e) => e.querySelector('.r-at b').textContent.trim() === txt); if (!r || !r.querySelector('.e-val')) return NaN;
        const s = r.querySelector('.e-val').textContent; return /مليون \$/.test(s) ? num(s) / 1000 : num(s); };
      const subs = val('دعم الوقود') + val('دعم الخبز والتموين') + val('دعم الكهرباء'), subLine = amt[rows.findIndex((e) => e.querySelector('.r-at b').textContent.trim() === 'الدعم والحماية الاجتماعية')];
      if (!(subs <= subLine + 0.001)) issues.push(`numbers: the subsidies listed (${subs.toFixed(1)}) exceed their budget line (${subLine})`);
      const cut = [...document.querySelectorAll('.r-act')].find((e) => /دعم الوقود/.test(e.textContent));
      if (cut) { const share = num(cut.querySelector('b').textContent) / 100, save = num(cut.querySelector('.r-at > span').textContent);
        if (off(share * val('دعم الوقود') - save, 0.051)) issues.push(`numbers: cutting the fuel subsidy ${share * 100}% saves ${(share * val('دعم الوقود')).toFixed(2)}, shown ${save}`); }
      const taxes = [...document.querySelectorAll('.r-body[data-tab="taxes"] .r-sec:nth-of-type(1) .e-row')].map((e) => num(e.querySelector('.r-at > span').textContent.replace(/^[^·]*·/, (m) => (/\d/.test(m) ? m : ''))));
      const tnote = document.querySelector('.r-body[data-tab="taxes"] > .s-note'), tsum = taxes.reduce((a, b) => a + b, 0);
      const [tTot, tRev] = tnote ? [...tnote.querySelectorAll('.ltr')].map((e) => num(e.textContent)) : [NaN, NaN];
      if (off(tsum - tTot, 0.051)) issues.push(`numbers: the taxes add up to ${tsum.toFixed(1)}, the note says ${tTot}`);
      if (off(tRev - rev, 0.051) || !(tTot <= tRev)) issues.push(`numbers: the note's revenue ${tRev} is not the budget's ${rev}`);
      if (off(val('الصادرات') - val('الواردات') - val('الميزان التجاري'), 0.051)) issues.push('numbers: exports - imports is not the trade balance');
      const trs = document.querySelector('.e-trs'), hudT = [...document.querySelectorAll('.top .num')].map((e) => e.textContent).find((s) => /مليار \$/.test(s));
      const [tNow, tMonth] = trs ? [...trs.querySelectorAll('.ltr')].map((e) => num(e.textContent)) : [NaN, NaN];
      if (off(tNow - num(hudT || ''), 0.001)) issues.push(`numbers: the treasury ${tNow} is not the HUD's ${hudT}`);
      if (off(tMonth - def / 12, 0.06)) issues.push(`numbers: the treasury falls ${tMonth} a month, but the deficit ${def} is ${(def / 12).toFixed(2)} a month`); }
    // VoiceOver: the tabs are a tab list; each «لماذا؟» names its subject; the warning chip says which way; every line
    // reads as one phrase (name: value and unit); the share bars are drawing only
    { const tl = q('.r-tabs');
      if (!tl || tl.getAttribute('role') !== 'tablist' || [...document.querySelectorAll('.r-tab')].some((e) => e.getAttribute('role') !== 'tab')) issues.push('a11y: the tabs are not a tab list');
      [...document.querySelectorAll('.r-why')].forEach((e, i) => { if (!/^لماذا؟ \S/.test(e.getAttribute('aria-label') || '')) issues.push(`a11y: «لماذا؟» ${i + 1} does not name its subject`); });
      [...document.querySelectorAll('.r-chip.e-bad')].forEach((e) => { if (!/تنخفض|ترتفع/.test(e.getAttribute('aria-label') || '')) issues.push('a11y: the warning chip does not say which way'); });
      [...document.querySelectorAll('.e-row')].forEach((e) => { const nm = e.querySelector('.r-at b').textContent.trim(); if (!(e.getAttribute('aria-label') || '').startsWith(nm + ': ')) issues.push(`a11y: «${nm}» has no label`); });
      [...document.querySelectorAll('.e-bar')].forEach((e, i) => { if (e.getAttribute('aria-hidden') !== 'true') issues.push(`a11y: bar ${i + 1} is read out`); }); }
    // no image in the sheet but the flag and the header strip
    [...q('.sheet').querySelectorAll('*')].forEach((e) => {
      if (e.closest('.frost')) return;                                   // the panel's own backdrop layer
      if (e.tagName === 'IMG' && !e.closest('.r-flag')) issues.push('an image in the sheet');
      if (/url\(/.test(getComputedStyle(e).backgroundImage) && !e.matches('.r-hd')) issues.push(`a background image in the sheet (${label(e)})`); });
    // RTL order: header flag | name ... emblem | close; tabs right to left from «نظرة عامة»; action rows tile | text | chip;
    // budget, tax and subsidy lines text | bar or rate | chevron or lock; external flows text | amount
    { const fl = q('.r-flag').getBoundingClientRect(), nm = q('.r-name').getBoundingClientRect(), em = q('.s-emb').getBoundingClientRect(), xb = q('.r-x').getBoundingClientRect();
      if (!(fl.left >= nm.right - 0.5 && em.right <= nm.left && xb.right <= em.left + 0.5)) issues.push('header order must be flag, name, ..., emblem, close (right to left)'); }
    { const tabs = qa('.r-tab');
      if (tabs.length !== 4 || tabs[0].textContent.trim() !== 'نظرة عامة') issues.push('tabs must be the 4, «نظرة عامة» first');
      const ic = tabs.map((e) => e.querySelector('svg use').getAttribute('href')).join(','); if (ic !== TOK.tabIcons) issues.push(`tab icons must be grid, pie, percent, ship: ${ic}`);
      for (let k = 1; k < tabs.length; k++) if (!(tabs[k].getBoundingClientRect().right <= tabs[k - 1].getBoundingClientRect().left + 0.5)) issues.push(`tab ${k + 1} is not left of tab ${k}`);
      const ons = qa('.r-tab.on'); if (ons.length !== 1 || ons[0].dataset.for !== tab || ons[0].getAttribute('aria-selected') !== 'true') issues.push('exactly the open tab must be selected'); }
    const order = (row, sels, what) => { const bx = sels.map((s) => row.querySelector(s)).filter(Boolean).map((e) => e.getBoundingClientRect());
      for (let k = 1; k < bx.length; k++) if (!(bx[k].right <= bx[k - 1].left + 0.5)) { issues.push(`${what}: order must be ${sels.join(', ')} (right to left)`); return; } };
    qa('.r-act').forEach((a, i) => order(a, ['.r-tile', '.r-at', '.r-chip'], `action row ${i + 1}`));
    qa('.e-row').forEach((a, i) => order(a, ['.r-at', a.querySelector('.e-bar') ? '.e-bar' : '.e-val', a.querySelector('.e-lock') ? '.e-lock' : '.r-chev'], `line ${i + 1}`));
    qa('.e-flow').forEach((a, i) => order(a, ['.r-at', '.e-val'], `flow ${i + 1}`));
    // bars fill from the right (RTL)
    qa('.e-bar i').forEach((e) => { const pb = e.parentElement.getBoundingClientRect(), rr = e.getBoundingClientRect(); if (!near(rr.right, pb.right, 0.6)) issues.push('a bar does not fill from the right'); });
    { const f = q('.r-flag').getBoundingClientRect(); if (!near(f.width / f.height, 4 / 3, 0.01)) issues.push('flag is not 4:3'); }
    // ---------- 9. the brief's content: fully visible in this render ----------
    const leafs = (s) => { const cands = [...q('.sheet').querySelectorAll('*')].filter((e) => e.getClientRects().length && e.innerText && e.innerText.replace(/\s+/g, ' ').includes(s));
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
  }, { d, TOK, BRIEF, ROWS, HEAD, b3, view, HUDSEL_REST });
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

async function open(ctx, url) {
  const p = await ctx.newPage();
  await p.goto(url);
  await p.waitForFunction(() => window.__ready === true);
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  await p.waitForTimeout(400);
  return p;
}
const qs = (d) => `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`;
const viewOf = (extra) => { const t = (extra.match(/tab=(\w+)/) || [0, 'overview'])[1], s = (extra.match(/scroll=(\w+)/) || [0, ''])[1];
  return t + (s === 'end' ? '_end' : s ? '_at' + s : ''); };
// the middle scroll offsets a sequence needs so that every part of it is clear of the fades in one view: the top view
// shows 0..h-46 clear, the end view over+24..full, a middle one at s shows s+24..s+h-46; neighbours overlap by 56 pt
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
  for (const [seq, extra] of SEQS) {
    const p = await open(ctx, PAGE + qs(d) + extra), bo = await p.evaluate(() => window.__body); await p.close();
    if (!out.some((v) => v.extra === extra + '&scroll=end') && bo.over > 0.5) out.push({ suffix: '_' + seq + '_end', extra: extra + '&scroll=end', png: false });
    midScrolls(bo.shown, bo.over).forEach((s) => out.push({ suffix: '_' + seq + '_at' + s, extra: extra + '&scroll=' + s, png: false }));
  }
  return out;
}
// every brief string of a sequence must be shown clear in one of its views
function coverage(clearBy) {
  const issues = [];
  Object.entries(clearBy).forEach(([seq, seen]) => (BRIEF['reach_' + seq] || []).forEach((s) => { if (!seen.has(s)) issues.push(`${seq}: never shown clear of the fades in any view: ${s}`); }));
  return issues;
}
const addClear = (clearBy, view, list) => { const k = seqOf(view); if (!BRIEF['reach_' + k]) return; (clearBy[k] = clearBy[k] || new Set()); list.forEach((s) => clearBy[k].add(s)); };

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
  // scroll the open body so its bottom edge runs through the name of a line (12 pt into the 44 pt row); the page runs
  // these functions from their source, so each is self-contained (the hard one also drops the bottom fade flag)
  const straddleSoft = () => { const b = [...document.querySelectorAll('.r-body')].find((e) => e.getClientRects().length), bb = b.getBoundingClientRect();
    const r = [...b.querySelectorAll('.e-row, .e-flow')].find((e) => e.getBoundingClientRect().top + 12 > bb.bottom);
    b.scrollTop += r.getBoundingClientRect().top + 12 - bb.bottom;
    document.documentElement.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0'; };
  const straddleHard = () => { const b = [...document.querySelectorAll('.r-body')].find((e) => e.getClientRects().length), bb = b.getBoundingClientRect();
    const r = [...b.querySelectorAll('.e-row, .e-flow')].find((e) => e.getBoundingClientRect().top + 12 > bb.bottom);
    b.scrollTop += r.getBoundingClientRect().top + 12 - bb.bottom;
    document.documentElement.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0';
    document.documentElement.dataset.fbot = '0'; };
  // place the scroll hint over the name of the first line
  const hintOverText = () => { const h = document.querySelector('.r-hint'), n = document.querySelector('.r-body[data-tab="budget"] .e-row .r-at b').getBoundingClientRect(), r = document.querySelector('.r-in').getBoundingClientRect();
    h.style.cssText = `left:${n.right - r.left - 28}px; top:${n.top - r.top}px; bottom:auto; margin:0`; };   // the name is right-aligned (RTL)
  // [name, device, extra url, css, expected issue, optional page script]. Each regex names the one check under test.
  const cases = [
    ['type size', d, '', '.r-name { font-size: 17px !important; }', /font size 17 for "الاقتصاد"/],
    ['18 pt misuse', d, '', '.r-sub { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for the panel's name/],
    ['font weight', d, '&tab=budget', '.e-row .r-at b { font-weight: 700 !important; }', /font weight 13\/700/],
    ['off-token colour', d, '', '.r-sc dt { color: #8899aa !important; }', /text colour off-token/],
    ['control height', d, '&tab=budget', '.e-row { height: 40px !important; }', /control height 40.00 for \.e-row/],
    ['radius', d, '', '.r-act { border-radius: 8px !important; }', /radius 8 for \.r-act/],
    ['gap', d, '&tab=budget', '.e-row { gap: 6px !important; }', /gap 6 on/],
    ['icon size', d, '', '.r-tile svg.i { width: 19px !important; height: 19px !important; }', /icon size 19x19 \(want 17\)/],
    ['chevron size', d, '&tab=taxes', '.r-chev { width: 12px !important; height: 12px !important; }', /icon size 12x12 \(want 16\)/],
    ['hit overlap', d, '&tab=budget', '.e-row + .e-row { margin-top: -6px !important; }', /hit overlap/],
    ['tap in the side inset', d, '', '.sheet { right: -30px !important; }', /tap in side inset/],
    ['text in the side inset', d, '', '.sheet { right: -30px !important; }', /text in side inset/],
    ['panel in the side inset', d, '', '.sheet { right: -30px !important; }', /panel in side inset/],
    ['clipped text', d, '', '.r-sc dd { margin-inline-end: -40px !important; }', /clipped text \(sides\)/],
    ['text outside the padding', d, '', '.r-sc dd { margin-inline-end: -40px !important; }', /text outside the sheet's 12 pt padding/],
    ['horizontal overflow', d, '', '.r-sc dd { margin-inline-end: -40px !important; }', /horizontal overflow/],
    ['text overlap', d, '', '.r-cap { margin-inline-start: -60px !important; }', /text overlap "الاقتصاد" \/ "الجنيه المصري"|text overlap "الجنيه المصري" \/ "الاقتصاد"/],
    ['icon over text', d, '', '.r-kl svg.i { margin-inline-end: -30px !important; }', /icon over text/],
    ['panel not opaque', d, '', '.sheet > .frost::after { background: rgba(9, 17, 25, 0.66) !important; }', /panel not opaque: الاقتصاد/],
    ['see-through panel', d, '', '.sheet { opacity: .6 !important; }', /panel not opaque \(opacity 0\.60\)/],
    ['Egypt covered', d, '', ':root { --map-cx: 760px !important; }', /Egypt covered by panel الاقتصاد/],
    ['delta covered', d, '', ':root { --map-cx: 760px !important; }', /Nile delta covered by panel الاقتصاد/],
    ['sheet width', d, '', ':root { --sheet-w: 330px !important; }', /sheet width 330/],
    ['sheet top', d, '', '.sheet { top: 30px !important; }', /sheet top [\d.]+ \(want 8 pt under the top row/],
    ['panel overlap', d, '', '.sheet { top: 30px !important; }', /panel overlap/],
    ['dock hidden although it fits', d, '', '[data-dock="left"] .dock { display: none !important; }', /dock hidden although it fits/],
    ['dock not moved left', d, '', '[data-dock="left"] .dock { align-self: center !important; }', /dock not 4 pt in from the left end/],
    ['dock too close to the sheet', d, '', '[data-dock="left"] .dock { margin-left: 140px !important; }', /dock closer than 8 pt/],
    ['dock hit box in the side inset', d, '', '[data-dock="left"] .dock { margin-left: 0 !important; }', /tap in side inset: المزيد/],
    ['dock shown on the SE', se, '', '[data-dock="hidden"] .dock { display: flex !important; }', /dock shown although it does not fit/],
    ['left stack moved', d, '', '.lstack { margin-left: 8px; }', /HUD element moved from its B3 position: \.toast/],
    ['overview scrolls', se, '', '.r-acts { margin-top: 40px !important; }', /overview needs scrolling/],
    ['fit level not the loosest', d, '', '', /fit level 4 is not the loosest that fits/, () => { document.documentElement.dataset.rfit = '4'; }],
    ['fades wrong', d, '&tab=budget', '', /fades .* do not match the scroll state/, () => { document.documentElement.dataset.fbot = '0'; }],
    ['cut at a hard edge', se, '&tab=budget', '', /clipped text \(bottom\)|control cut by its scroll area \(bottom\)/, straddleHard],
    ['fade flag without a mask', se, '&tab=budget', '.r-body { -webkit-mask-image: none !important; mask-image: none !important; }', /clipped text \(bottom\)|control cut by its scroll area \(bottom\)/, straddleSoft],
    ['fade without the hint strip', se, '&tab=budget', '[data-fbot="1"] .r-body { -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 24px), transparent) !important; mask-image: linear-gradient(180deg, #000 calc(100% - 24px), transparent) !important; }', /clipped text \(bottom\)|control cut by its scroll area \(bottom\)/, straddleSoft],
    ['no scroll hint', d, '&tab=budget', '.r-body[data-tab="budget"] .e-sum { margin-bottom: 600px !important; } .r-hint { display: none !important; }', /no scroll hint: nothing fades into the bottom edge/],
    ['hint chevron missing', d, '&tab=budget', '.r-hint { display: none !important; }', /scroll hint chevron missing with content below/],
    ['hint over the content', d, '&tab=budget', '.r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/],
    ['hint over legible text', d, '&tab=budget', '', /scroll hint over text/, hintOverText],
    ['% before its number', d, '', '', /% shown before its number/, () => { document.querySelector('.r-sc dd').textContent = 'من الناتج 8.1%'; }],
    ['brief text scrolled away', d, '&tab=budget', '', /brief text not fully visible: بنود الإنفاق/, () => { const b = document.querySelector('.r-body[data-tab="budget"]'); b.scrollTop = b.scrollHeight; }],
    ['brief text', d, '', '', /brief text missing: لماذا؟/, () => { document.querySelectorAll('.r-why').forEach((e) => { e.textContent = 'لماذا'; }); }],
    ['map label cut', d, '', '.labels .cut { display: inline !important; }', /map (label|city dot) .* cut by a panel edge/],
    ['map label at the screen edge', d, '', '.labels .cut { display: inline !important; }', /map (label|city dot) .* sliced by the screen edge or the side inset/],
    ['contrast', d, '', '.r-st { background: rgb(234, 242, 247) !important; }', /^contrast [0-3](\.\d+)? for "عجز الموازنة"/],
    ['faint text', d, '', '.r-sc dt { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for "عجز الموازنة"/],
    ['RTL order', d, '&tab=budget', '.e-row .e-bar { order: -1; }', /line 1: order must be/],
    ['flow order', d, '&tab=trade', '.e-flow .e-val { order: -1; margin-inline-start: 0 !important; }', /flow 1: order must be/],
    ['two tabs selected', d, '', '', /exactly the open tab must be selected/, () => { document.querySelectorAll('.r-tab')[1].classList.add('on'); }],
    ['dock item not marked', d, '', '', /the open section «الاقتصاد» is not marked in the dock/, () => { document.querySelector('.dock-item.on').classList.remove('on'); }],
    ['dock underline missing', d, '', '.dock-item.on::after { content: none !important; }', /dock underline missing or off/],
    ['closed dock item coloured', d, '', '.dock-item:not(.on) span { color: #E9EEF4 !important; }', /dock item \d+ \(closed\) not neutral as on B3/],
    ['identity line colour', d, '', '[data-sec] .r-in::before { background: #E9EEF4 !important; }', /panel top line .*rgb\(233, 238, 244\)/],
    ['identity line missing', d, '', '[data-sec] .r-in::before { content: none !important; }', /panel top line none/],
    ['identity line short', d, '', '[data-sec] .r-in::before { right: 40px !important; }', /panel top line width/],
    ['emblem missing', d, '', '.s-emb { display: none !important; }', /section emblem missing/],
    ['closed tabs like the open one', d, '', '[data-sec] .r-tab { color: var(--t1) !important; }', /closed tab not in the secondary grey/],
    ['open tab without its fill', d, '', '[data-sec] .r-tab.on { background: none !important; }', /open tab without its fill/],
    ['section colour on data', d, '', '.r-sc dd { color: var(--sec) !important; }', /section colour on data text/],
    ['bars in the section colour', d, '&tab=budget', '.e-bar i { background: var(--sec) !important; }', /a share bar not in teal/],
    ['bars in another colour', d, '&tab=budget', '.e-bar i { background: var(--blue) !important; }', /a share bar not in teal/],
    ['section colour on an icon', d, '&tab=taxes', '.r-chev { color: var(--sec) !important; }', /section colour on data chrome/],
    ['section colour on a border', d, '', '.r-st { border-color: var(--sec) !important; }', /section colour on data chrome/],
    ['inflation not amber', d, '', '.r-kv b.r-amber { color: var(--t1) !important; }', /«10\.3%» not in amber/],
    ['legitimacy cost not amber', d, '', '[data-sec] .r-chip.e-bad { color: var(--t1) !important; }', /«الشرعية» not in amber/],
    ['deficit not amber', d, '&tab=budget', '.e-sum b.r-amber { color: var(--t1) !important; }', /«17\.7» not in amber/],
    ['trade deficit not amber', d, '&tab=trade', '.e-flow b.e-val.r-amber { color: var(--t1) !important; }', /«−26\.6» not in amber/],
    ['deficit share not amber', d, '', '.r-sc dd.r-amber { color: var(--t1) !important; }', /«8\.1% من الناتج» not in amber/],
    ['legitimacy chip outline white', d, '', '[data-sec] .r-chip.e-bad { border-color: rgba(234, 242, 247, .5) !important; }', /white touch off: \.r-chip\.e-bad/],
    ['legitimacy chip without its arrow', d, '', '', /legitimacy chip without its down arrow/, () => { document.querySelector('.r-chip.e-bad svg').remove(); }],
    ['tab icons swapped', d, '', '', /tab icons must be/, () => { const u = document.querySelectorAll('.r-tab svg use'); u[1].setAttribute('href', '#i-ship'); u[3].setAttribute('href', '#i-pie'); }],
    ['18 pt on a summary label', d, '&tab=budget', '.e-sum span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for the panel's name.*"الإيرادات"/],
    ['summary number not 18', d, '&tab=budget', '.e-sum b { font-size: 14px !important; }', /summary number not 18\/700/],
    ['summary number off its label', d, '&tab=budget', '.e-sum span { align-items: flex-end !important; }', /summary number .* not under its label/],
    ['fixed row height', d, '&tab=budget', '.e-fixed { height: 40px !important; }', /size [\d.]+x40\.0 for \.e-row/],
    ['line radius', d, '&tab=budget', '.e-row { border-radius: 6px !important; }', /radius 6 for \.e-row/],
    ['bar radius', d, '&tab=budget', '.e-bar { border-radius: 1px !important; }', /radius 1 for \.e-bar/],
    ['lock size', d, '&tab=budget', '.e-lock { width: 12px !important; height: 12px !important; }', /icon size 12x12 \(want 16\)/],
    ['background image', d, '', '.r-kpi { background-image: url(header_cairo.jpg) !important; }', /a background image in the sheet/],
    ['treasury not the HUD\'s', d, '&tab=budget', '', /numbers: the treasury 40 is not the HUD's/, () => { document.querySelector('.e-trs .ltr').textContent = '40.0'; }],
    ['treasury falls the wrong amount', d, '&tab=budget', '', /numbers: the treasury falls 3 a month/, () => { document.querySelectorAll('.e-trs .ltr')[1].textContent = '3.0'; }],
    ['treasury fall not amber', d, '&tab=budget', '.e-trs .r-amber { color: var(--t2) !important; }', /«تنقص 1\.5 مليار \$ شهريًا» not in amber/],
    ['tabs not a tab list', d, '', '', /a11y: the tabs are not a tab list/, () => { document.querySelector('.r-tabs').removeAttribute('role'); }],
    ['why without its subject', d, '', '', /a11y: «لماذا؟» 2 does not name its subject/, () => { document.querySelectorAll('.r-why')[1].removeAttribute('aria-label'); }],
    ['warning chip silent', d, '', '', /a11y: the warning chip does not say which way/, () => { document.querySelector('.r-chip.e-bad').removeAttribute('aria-label'); }],
    ['line without a label', d, '&tab=taxes', '', /a11y: «ضريبة الشركات» has no label/, () => { document.querySelectorAll('.r-body[data-tab="taxes"] .e-row')[1].removeAttribute('aria-label'); }],
    ['bar read out', d, '&tab=budget', '', /a11y: bar 1 is read out/, () => { document.querySelector('.e-bar').removeAttribute('aria-hidden'); }],
    ['emblem size', d, '', '.s-emb { width: 26px !important; height: 26px !important; }', /size 26\.0x26\.0 for \.s-emb/],
    ['bar size', d, '&tab=budget', '.e-bar { width: 60px !important; }', /size 60\.0x6\.0 for \.e-bar/],
    ['flow height', d, '&tab=trade', '.e-flow { height: 32px !important; }', /for \.e-flow \(want any x 36\)/],
    ['tile icons cyan', d, '', '[data-sec] .r-tile { color: rgb(127, 233, 255) !important; }', /white touch off: \.r-tile/],
    ['chip not white', d, '', '[data-sec] .r-chip { border-color: rgba(63, 224, 208, .7) !important; }', /white touch off: \.r-chip borderTopColor/],
    ['interest adjustable', d, '&tab=budget', '', /«الفوائد»: a mandatory line must show a lock/, () => { const r = document.querySelector('.e-fixed'); r.classList.add('tap'); r.setAttribute('role', 'button'); }],
    ['interest made a normal line', d, '&tab=budget', '', /«الفوائد»: a mandatory line must show a lock/, () => { const r = document.querySelector('.e-fixed'); r.classList.remove('e-fixed'); r.classList.add('tap'); r.setAttribute('role', 'button');
      const l = r.querySelector('.e-lock'); l.classList.remove('e-lock'); l.classList.add('r-chev'); }],
    ['another line locked', d, '&tab=budget', '', /«الدفاع»: a line must open its adjuster/, () => { const r = [...document.querySelectorAll('.e-row')].find((e) => /الدفاع/.test(e.textContent)); r.classList.add('e-fixed'); r.classList.remove('tap'); r.removeAttribute('role');
      const c = r.querySelector('.r-chev'); c.classList.remove('r-chev'); c.classList.add('e-lock'); }],
    ['a line without its adjuster', d, '&tab=taxes', '', /«ضريبة الدخل»: a line must open its adjuster/, () => { document.querySelector('.r-body[data-tab="taxes"] .e-row .r-chev').remove(); }],
    ['an image in the sheet', d, '', '', /an image in the sheet/, () => { const i = document.createElement('img'); i.src = '../../shared/flags/eg.svg'; i.style.cssText = 'width:17px;height:17px'; document.querySelector('.r-act .r-tile').replaceChildren(i); }],
    ['deficit does not add up', d, '', '', /numbers: spending .* is not the deficit/, () => { document.querySelector('.e-sum b').textContent = '50.0'; }],
    ['deficit share wrong', d, '', '', /numbers: the deficit .* of GDP/, () => { document.querySelector('.r-kpi .r-kv b').textContent = '250'; }],
    ['lines do not add up', d, '&tab=budget', '', /numbers: the lines add up to/, () => { const r = document.querySelectorAll('.r-body[data-tab="budget"] .e-row')[2]; r.dataset.amount = '12.0'; r.querySelector('.r-at > span .ltr').textContent = '12.0'; }],
    ['line shown differs from its data', d, '&tab=budget', '', /numbers: line 3 shows 12 but its data is 9\.9/, () => { document.querySelectorAll('.r-body[data-tab="budget"] .e-row')[2].querySelector('.r-at > span .ltr').textContent = '12.0'; }],
    ['shares wrong', d, '&tab=budget', '', /numbers: the shares add up to 102%/, () => { document.querySelectorAll('.r-body[data-tab="budget"] .e-row')[0].querySelectorAll('.r-at > span .ltr')[1].textContent = '28%'; }],
    ['bar overridden by CSS', d, '&tab=budget', '.r-body[data-tab="budget"] .e-row:nth-of-type(3) .e-bar i { width: 80% !important; }', /numbers: bar 3 is 80%/],
    ['amount unreadable', d, '&tab=budget', '', /numbers: line 3 shows 9\.9 but its data is NaN/, () => { delete document.querySelectorAll('.r-body[data-tab="budget"] .e-row')[2].dataset.amount; }],
    ['a name not found', d, '&tab=trade', '', /numbers: exports - imports is not the trade balance/, () => { [...document.querySelectorAll('.e-flow b')].find((e) => e.textContent === 'الصادرات').textContent = 'السلع'; }],
    ['note revenue wrong', d, '&tab=taxes', '', /numbers: the note's revenue 50/, () => { document.querySelectorAll('.r-body[data-tab="taxes"] > .s-note .ltr')[1].textContent = '50.0'; }],
    ['one share wrong', d, '&tab=budget', '', /numbers: line 1 is 25\.9% of the spending, shown 27%/, () => { const r = document.querySelectorAll('.r-body[data-tab="budget"] .e-row');
      r[0].querySelectorAll('.r-at > span .ltr')[1].textContent = '27%'; r[1].querySelectorAll('.r-at > span .ltr')[1].textContent = '19%'; }],
    ['money unit', d, '&tab=taxes', '', /money unit: «0\.9 مليار»/, () => { [...document.querySelectorAll('.e-row')].find((e) => /الكهرباء/.test(e.textContent)).querySelector('.e-val').innerHTML = '<span class="ltr">0.9</span> مليار $'; }],
    ['brief rows swapped', d, '&tab=budget', '', /brief rows differ: budget lines/, () => { const r = document.querySelectorAll('.r-body[data-tab="budget"] .e-row'); const a = r[5].querySelector('.r-at > b'), b = r[6].querySelector('.r-at > b'); [a.textContent, b.textContent] = [b.textContent, a.textContent]; }],
    ['a rate changed', d, '&tab=taxes', '', /brief rows differ: taxes/, () => { document.querySelectorAll('.r-body[data-tab="taxes"] .e-row .e-val')[1].textContent = '25%'; }],
    ['bar out of proportion', d, '&tab=budget', '', /numbers: bar 3 is 80%/, () => { document.querySelectorAll('.r-body[data-tab="budget"] .e-row')[2].querySelector('.e-bar i').style.width = '80%'; }],
    ['subsidies exceed their line', d, '&tab=taxes', '', /numbers: the subsidies listed/, () => { [...document.querySelectorAll('.e-row')].find((e) => /دعم الوقود/.test(e.textContent)).querySelector('.e-val').textContent = '16.0'; }],
    ['saving wrong', d, '', '', /numbers: cutting the fuel subsidy/, () => { [...document.querySelectorAll('.r-act')].find((e) => /دعم الوقود/.test(e.textContent)).querySelector('.r-at > span .ltr').textContent = '2.0'; }],
    ['taxes do not add up', d, '&tab=taxes', '', /numbers: the taxes add up to/, () => { document.querySelector('.r-body[data-tab="taxes"] > .s-note .ltr').textContent = '35.0'; }],
    ['trade balance wrong', d, '&tab=trade', '', /numbers: exports - imports/, () => { [...document.querySelectorAll('.e-flow')].find((e) => e.querySelector('b').textContent === 'الواردات').querySelector('.e-val').textContent = '50.0'; }],
    ['bar fills from the left', d, '&tab=budget', '.e-bar i { inset: 0 auto 0 0 !important; }', /a bar does not fill from the right/],
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
    // the coverage check itself: without the middle views, the SE's budget tab leaves lines unchecked
    if (x === se) {
      const miss = coverage(skipMid), ok = miss.some((i) => /^budget: never shown clear of the fades in any view: /.test(i));
      results.push({ name: 'coverage without the middle views', ok, sample: miss.slice(0, 3) });
      console.log(`${ok ? 'caught ' : 'MISSED '} coverage without the middle views`);
    }
  }
  for (const c of Object.values(ctxs)) await c.close();
  const missed = results.filter((r) => !r.ok).map((r) => r.name), dirty = Object.values(clean).some((v) => v.length);
  fs.writeFileSync(path.join(__dirname, 'selftest.json'), JSON.stringify({ ranAt: new Date().toISOString(), inputs: { files: INPUTS, sha1: inputsHash() }, cleanIssues: clean, results }, null, 1));
  console.log(missed.length || dirty ? `SELFTEST FAILED (missed: ${missed.join(', ') || 'none'}; clean issues ${Object.values(clean).map((v) => v.length).join('/')})` : `selftest OK: ${results.length} planted defects caught, clean pages 0 issues`);
}

(async () => {
  assertAssembled();
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  await recordInputs(b);
  if (SELFTEST) { await selftest(b); await b.close(); return; }
  let report = {};
  try { report = JSON.parse(fs.readFileSync(path.join(__dirname, 'report.json'), 'utf8')); } catch (e) { report = {}; }
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
        const png = suffix ? path.join(__dirname, d.id + suffix + '.png') : path.join(OUT, d.id + '.png');
        await p.screenshot({ path: png });
        entry.pngs.push(path.relative(OUT, png));
        entry.pngSha1[path.relative(OUT, png)] = crypto.createHash('sha1').update(fs.readFileSync(png)).digest('hex');
      }
      if (!suffix) { const hp = path.join(__dirname, d.id + '_hit.png'), ph = await open(ctx, PAGE + qs(d) + '&hit=1'); await ph.screenshot({ path: hp }); await ph.close();
        entry.pngSha1[path.relative(OUT, hp)] = crypto.createHash('sha1').update(fs.readFileSync(hp)).digest('hex'); }
      const { m, c } = await check(p, d, b3, view);
      addClear(clearBy, view, m.clearNow);
      m.issues.forEach((i) => entry.issues.push(`${view}: ${i}`));
      entry.views[view] = { issueCount: m.issues.length, png: save, fit: m.fit, sheet: m.sheet, map: { ok: m.map.ok, egyptClear: m.map.egyptClear, zoom: m.map.zoom }, hiddenLabels: m.hiddenLabels,
        typeSeen: m.typeSeen, hits: m.hits, minContrast: Math.min(...c.map((x) => x.worst)), contrast: c };
      console.log(`== ${d.id} ${view}${save ? '' : ' (checks only)'} fit ${JSON.stringify(m.fit.sheet)} dock ${m.fit.sheetPos.dock} body ${JSON.stringify(m.fit.body)} minContrast ${entry.views[view].minContrast} zoom ${m.map.zoom} hidden ${JSON.stringify(m.hiddenLabels)}`);
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
  fs.writeFileSync(path.join(__dirname, 'report.json'), JSON.stringify(ordered, null, 1));
  console.log('\nissues per device:', Object.entries(ordered).map(([k, v]) => `${k} ${v.issues.length}`).join(', '));
  await b.close();
})();
