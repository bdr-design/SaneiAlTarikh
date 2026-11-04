// Screen 7 variant A (the economy adjusters «الضبط»): render the iPhones and run the checks.
// Writes <id>.png (the tax adjuster) to the variant folder; <id>_line.png, <id>_subsidy.png, <id>_money.png,
// <id>_money_end.png, <id>_wait.png, <id>_money_pending.png, <id>_money_pending_end.png, <id>_hit.png and report.json
// to _build. Every adjuster is also checked at its end and at the middle
// scroll offsets (no PNG), so every row is checked once clear of the fades; and every brief string of a view must be
// shown clear in one of its views. Before anything, index.html must be the current output of assemble.py.
// Checks (shared with the approved panels' checkers, screens 5 A and 6 A): opaque panels (D-3); each control's height
// from the size table; radii; gaps; icon sizes and strokes; type sizes, weights and colours; 44 pt hit boxes (cover, no
// overlap, clipped by every clip); safe insets; panels never overlap; text over text, icons over text, clipped text (a
// cut only at a faded scroll edge, verified from the computed mask), % after its digits; contrast >= 4.5:1 per pixel
// over the rendered backdrop. The adjuster rules: the economy sheet's geometry, dock and HUD; the header from screen 6,
// collapsed to fit level 6; the section identity (emerald on chrome only); a back control naming its tab, pointing back;
// the value block (current, then new, then the change, RTL) agreeing with the stepper's data; the track's fill, knob
// and current tick drawn where the data says, minimum at the right; − at the minimum's end, + at the maximum's; the
// effects blue or amber by their sign, in units, agreeing with screen 6's numbers; the money rule; the fixed footer
// (timing, filled white «اعتماد», outlined «إلغاء») under the scrolling body, the scroll hint in the body's strip above
// it; VoiceOver labels; the brief's strings per view; and on the map, Egypt and the delta clear, no label cut,
// squeezed, or sliced by the screen edge or the side inset.
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
const STATIC_INPUTS = ['index.html', '_build/render.js', '_build/adjust.css', '_build/sheet.html', '_build/assemble.py', '../../shared/section_identity.css',
  '../../screen4/R/_build/panel.css', '../../screen5/A/_build/state.css', '../../screen6/A/_build/econ.css', '../../screen6/A/_build/sheet.html',
  '../../screen4/A/index.html', '../../screen1/B3/index.html', '../../shared/devices.json'];
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
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'screen7-'));
  try {
    execFileSync('python3', ['-I', path.join(__dirname, 'assemble.py'), REPO, __dirname, tmp], { stdio: 'pipe' });
    if (!fs.readFileSync(path.join(tmp, 'index.html')).equals(fs.readFileSync(path.join(OUT, 'index.html')))) throw new Error('index.html is not the current output of assemble.py: run assemble.py first');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}
// the saved views (PNG + checks); the middle scroll offsets of each long tab are added per phone (checks only)
const VIEWS = [['', ''], ['_line', '&adjust=line'], ['_subsidy', '&adjust=subsidy'], ['_money', '&adjust=money'], ['_money_end', '&adjust=money&scroll=end'], ['_wait', '&adjust=tax&states=1'],
  ['_money_pending', '&adjust=money&pending=1'], ['_money_pending_end', '&adjust=money&pending=1&scroll=end']];
// checks only: every adjuster with its new value at the minimum and at the maximum (the knob at the track's ends)
const ENDS = ['tax', 'line', 'subsidy', 'money'].map((a) => [['_' + a + '_min', '&adjust=' + a + '&at=0'], ['_' + a + '_max', '&adjust=' + a + '&at=100']]).flat();
// the scrolling sequences: each gets its top view, its end view and the middle offsets between them
const SEQS = [['tax', '&adjust=tax'], ['line', '&adjust=line'], ['subsidy', '&adjust=subsidy'], ['money', '&adjust=money'], ['money_pending', '&adjust=money&pending=1']];

const TOK = {
  heights: [32, 36, 44], hudSpace: [0, 4, 8, 12], rCtl: 10, rCard: 12,
  type: { 10: [400, 500, 700], 11.5: [500, 600], 13: [600], 14: [700], 18: [700] },
  icon: { ctl: 16, stat: 14, dock: 17, glyph: 10 }, stroke: 1.75,
  panel: 'rgb(12, 20, 28)', border: 'rgba(127, 233, 255, 0.14)',
  colors: ['rgb(234, 242, 247)', 'rgb(169, 188, 203)', 'rgb(127, 233, 255)', 'rgb(63, 224, 208)', 'rgb(242, 177, 76)', 'rgb(242, 112, 90)', 'rgb(111, 182, 255)',
    'rgb(67, 192, 138)', 'rgb(11, 18, 24)'],          // + the section's emerald, and the dark text on white (the primary button, a chosen segment)
  sec: 'rgb(67, 192, 138)',                           // الاقتصاد's identity colour
  t1: 'rgb(234, 242, 247)', t2: 'rgb(169, 188, 203)', dark: 'rgb(11, 18, 24)', amber: 'rgb(242, 177, 76)',
  wLine: 'rgba(234, 242, 247, 0.5)', wLineDim: 'rgba(234, 242, 247, 0.28)', teal: 'rgb(63, 224, 208)',
  fit: '6',                                           // a pushed view: the header at its compact height (44 pt, measured below)
  blue: 'rgb(111, 182, 255)',
  // the brief's sizes for this panel: [selector, width, height] (null: not fixed)
  size: [['.r-hd', null, 44], ['.s-emb', 32, 32], ['.a-nav', null, 45], ['.a-pm', 32, 32], ['.a-track', null, 6], ['.a-knob', 20, 20], ['.a-cur', 2, 26], ['.a-foot', null, 60], ['.a-btn', null, 36], ['.s-sg', 60, 26], ['.s-pol', null, 40]],
  // the panel's size table (the owner's reference): control heights, radii, icon sizes, gaps
  ctlH: { '.r-x': 32, '.a-back': 44, '.a-pm': 32, '.a-track': 6, '.a-btn': 36, '.s-sg': 26 },
  radius: { '.sheet': 12, '.r-chip': 6, '.r-cap': 10, '.s-emb': 10, '.a-btn': 10, '.a-track': 3, '.s-seg': 6 },
  sheetIcon: [['.r-cap svg', 10], ['.r-x svg', 16], ['.r-hint svg', 16], ['.s-emb svg', 16], ['.a-bk', 16], ['.a-to', 16], ['.a-pm svg', 16], ['.r-arr', 10], ['.a-lk', 16]],
  sheetSpace: [0, 2, 4, 8, 12, 16],
  title18: ['.r-name', '.a-new b'],                  // the panel's name and the adjuster's new value only
  fade: 24, strip: 22,                                // the fade, and the clear strip under the bottom fade for the scroll hint
  overlap: 56,                                        // the middle views overlap their neighbours by this much (a whole project row)
};
// The brief's strings (as the page writes them). <view>: fully visible and clear of the fades in that render;
// reach_<tab>: every string of the tab, each of which some scroll position must show whole and clear of the fades.
// A string is found only as the whole text of an element (so no other element can stand in for it).
const HEAD = ['الاقتصاد', 'الجنيه المصري', 'مصر · السنة المالية 2010/11'];
const WHEN = 'يبدأ الشهر القادم · تعديل كل 3 أشهر · الأثر تقديري';
// each adjuster: back label, title and its note, the value block (current, new, change), the limits, the effects
// ([label, value, improvement?, arrow]), the footer line
const ADJ = {
  tax: { back: 'الضرائب والدعم', title: ['ضريبة الدخل', 'الشريحة العليا'], val: ['20%', '25%', '+5 نقاط'], lim: ['10%', '35%'],
    eff: [['الإيرادات', '+300 مليون $ سنويًا', 1, 'up'], ['العجز', '17.4 مليار $ بدل 17.7', 1, 'down'], ['اضطرابات المحافظات الحضرية', '+1 خلال 3 أشهر', 0, 'up'], ['النمو', '−0.1 نقطة خلال سنة', 0, 'down']],
    when: WHEN, wait: 'الاعتماد متاح بعد شهرين · الأثر تقديري' },
  line: { back: 'الميزانية', title: ['التعليم', '11% من الإنفاق'], val: ['7.3', '8.0', '+10%'], unit: 'مليار $', lim: ['3.7', '11.0'],
    eff: [['العجز', '18.4 مليار $ بدل 17.7', 0, 'up'], ['الدين إلى الناتج', '+0.3 نقطة سنويًا', 0, 'up'], ['العمالة الماهرة', '+0.3 نقطة بعد 5 سنوات', 1, 'up'], ['الشرعية', '+1 خلال 3 أشهر', 1, 'up']], when: WHEN },
  subsidy: { back: 'نظرة عامة', title: ['دعم الوقود', 'بنزين وسولار وغاز'], val: ['11.7', '10.5', '−10%'], unit: 'مليار $', lim: ['0', '17.6'],
    eff: [['العجز', '16.5 مليار $ بدل 17.7', 1, 'down'], ['التضخم', '+0.6 نقطة خلال سنة', 0, 'up'], ['اضطرابات المحافظات الأفقر', '+4 خلال 3 أشهر', 0, 'up'], ['الشرعية', '−3 خلال 3 أشهر', 0, 'down']], when: WHEN },
  money: { back: 'التجارة والعملة', title: ['السياسة النقدية والعملة', 'فائدة المركزي: الإيداع لليلة واحدة'], val: ['8.25%', '9.25%', '+1 نقطة'], lim: ['2%', '20%'],
    eff: [['التضخم', '−0.4 نقطة خلال سنة', 1, 'down'], ['سعر الدولار بعد 3 أشهر', '5.75 جنيه بدل 5.80', 1, 'down'], ['الفوائد', '13.9 مليار $ بدل 13.3', 0, 'up'], ['النمو', '−0.2 نقطة خلال سنة', 0, 'down']],
    when: 'الفائدة من الشهر القادم · تعديل كل 3 أشهر · الأثر تقديري',
    set: 'الصرف ورأس المال', note: 'كل تغيير هنا يتم تدريجيًا خلال 6 أشهر، ولا يُعدَّل الإعداد مرة أخرى قبل اكتماله، ولا يكلّف رأس مال سياسي. التحويل الجزئي: للحساب الجاري فقط.',
    // [name, choices (freest first, so on the right), the chosen one]
    laws: [['نظام الصرف', ['حر', 'مُدار', 'ثابت'], 1], ['قابلية التحويل', ['كاملة', 'جزئية', 'معلّقة'], 0], ['ضوابط رأس المال', ['محدودة', 'متوسطة', 'مشدّدة'], 0]],
    // with the regime change from مُدار to حر pending: the rate's and the float's effects together, and when it lands
    // (the float no longer spends reserves to hold the rate: the reserves grow)
    pend: { eff: [['التضخم', '+2.6 نقطة خلال سنة', 0, 'up'], ['سعر الدولار بعد 6 أشهر', '7.00 جنيه بدل 5.80', 0, 'up'], ['الاحتياطي', '+2.0 مليار $ خلال 6 أشهر', 1, 'up'], ['الصادرات', '+1.6 مليار $ سنويًا', 1, 'up']],
      when: 'الفائدة من الشهر القادم · الصرف خلال 6 أشهر · الأثر تقديري', chosen: [0, 0, 0], cur: 1 } },
};
// the freest choice of each setting (screen 5's rule: freest on the right, so first)
const FREEST = ['حر', 'كاملة', 'محدودة'];
const BRIEF = {};
Object.entries(ADJ).forEach(([k, a]) => {
  const first = HEAD.concat([a.back, a.title[0], a.title[1], 'الحالي', a.val[0], 'الجديد', a.val[1], a.val[2], a.lim[0], a.lim[1]], a.eff.map((e) => e.slice(0, 2)).flat(),
    [a.when, 'اعتماد', 'إلغاء'], a.unit ? [a.unit] : []);
  const all = first.concat(a.laws ? [a.set, a.note].concat(a.laws.map((l) => [l[0]].concat(l[1])).flat()) : []);
  // tax, line and subsidy fit whole on every phone; money scrolls to its settings, and on the smaller phones its second
  // row of effects starts in the bottom fade (a middle view shows it clear)
  BRIEF[k] = a.laws ? first.filter((s) => !a.eff.slice(2).flat().includes(s)) : first;
  BRIEF['reach_' + k] = all;
});
BRIEF.money_end = HEAD.concat(ADJ.money.laws.map((l) => [l[0]].concat(l[1])).flat(), [ADJ.money.when, 'اعتماد', 'إلغاء']);
BRIEF.tax_wait = BRIEF.tax.filter((s) => s !== WHEN).concat([ADJ.tax.wait]);
BRIEF.money_pending = HEAD.concat([ADJ.money.back, ADJ.money.title[0], ADJ.money.title[1]], ADJ.money.val, ADJ.money.pend.eff.slice(0, 2).map((e) => e.slice(0, 2)).flat(), [ADJ.money.pend.when, 'اعتماد', 'إلغاء']);
BRIEF.reach_money_pending = BRIEF.reach_money.filter((s) => !ADJ.money.eff.flat().includes(s) && s !== ADJ.money.when).concat(ADJ.money.pend.eff.map((e) => e.slice(0, 2)).flat(), [ADJ.money.pend.when]);
BRIEF.money_pending_end = HEAD.concat(ADJ.money.laws.map((l) => [l[0]].concat(l[1])).flat(), [ADJ.money.pend.when, 'اعتماد', 'إلغاء']);
// a view's name: <tab>[_end|_at<offset>|_wait|_min|_max]; its tab is the first part, its scrolling sequence all but the scroll part
const tabOf = (view) => view.split('_')[0];
const seqOf = (view) => view.replace(/_(end|at\d+)$/, '');

// screen 6's numbers the effects must agree with, read from its sheet (not copied): the deficit, the GDP, the education
// and fuel lines, the income tax's rate and yield, the policy rate, the interest line, the exchange rate and the three
// money settings
function screen6() {
  const s = fs.readFileSync(path.join(OUT, '../../screen6/A/_build/sheet.html'), 'utf8').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  const pick = (re, what) => { const m = s.match(re); if (!m) throw new Error('screen 6: cannot read ' + what); return m.slice(1); };
  const n = (re, what) => parseFloat(pick(re, what)[0]);
  return {
    deficit: n(/الإنفاق [\d.]+ العجز ([\d.]+) مليار/, 'the deficit'),
    gdp: n(/الناتج المحلي ([\d.]+) مليار/, 'the GDP'),
    education: n(/التعليم ([\d.]+) مليار \$/, 'the education line'),
    fuel: n(/دعم الوقود سنويًا · بنزين وسولار وغاز ([\d.]+) مليار/, 'the fuel subsidy'),
    incomeYield: n(/ضريبة الدخل الشريحة العليا · ([\d.]+) مليار \$ سنويًا [\d.]+%/, 'the income tax yield'), incomeRate: n(/ضريبة الدخل الشريحة العليا · [\d.]+ مليار \$ سنويًا ([\d.]+)%/, 'the income tax rate'),
    rate: n(/فائدة المركزي ([\d.]+)%/, 'the policy rate'),
    interest: n(/الفوائد ([\d.]+) مليار \$/, 'the interest line'),
    fx: n(/الدولار ([\d.]+) جنيه/, 'the exchange rate'),
    regime: pick(/نظام الصرف (تعويم مُدار|ثابت|حر)/, 'the regime')[0], conv: pick(/قابلية التحويل (\S+)/, 'convertibility')[0], controls: pick(/ضوابط رأس المال (\S+)/, 'capital controls')[0],
  };
}
const S6 = screen6();

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
  return p.evaluate(({ d, TOK, BRIEF, ADJ, HEAD, b3, view, HUDSEL_REST, S6, FREEST }) => {
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
      if (fs === 18 && !TOK.title18.some((c) => el.closest(c))) issues.push(`18 pt is for the panel's name and the adjusted values only: "${t}"`);
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
      const cr = c.getBoundingClientRect(); if (hiddenByScroll(box(cr), c) || c.classList.contains('a-track')) return;   // the track's marks overhang it by design (the stepper rules check them)
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
    // fit: a pushed view shows the header at its compact height (level 6; its 44 pt is in the size table), the back row
    // right under it; tax, line and subsidy fit whole on every phone (only money scrolls, to its settings)
    const fit = window.__sheetfit, body = window.__body, adj = view.split('_')[0], lvNow = root.dataset.rfit;
    if (lvNow !== TOK.fit) issues.push(`fit level ${lvNow} (want ${TOK.fit}: the pushed view's compact header)`);
    { const hd = q('.r-hd').getBoundingClientRect(), nv = q(`.a-view[data-adjust="${adj}"] .a-nav`).getBoundingClientRect();
      if (Math.abs(nv.top - hd.bottom) > 0.5) issues.push(`the back row does not start under the header: ${nv.top.toFixed(1)} (header ends ${hd.bottom.toFixed(1)})`); }
    { const bb = q(`.a-view[data-adjust="${adj}"] > .r-body`), ov = bb.scrollHeight - bb.clientHeight;   // measured now, not at load
      if (adj !== 'money' && ov > 0.5) issues.push(`the ${adj} adjuster does not fit whole: ${ov.toFixed(1)} pt over`); }
    // the open adjuster: its view only, the fades match its scroll state
    if (root.dataset.adjust !== adj) issues.push(`open adjuster ${root.dataset.adjust} (want ${adj})`);
    const av = q(`.a-view[data-adjust="${adj}"]`), bd = av && av.querySelector(':scope > .r-body');
    if (qa('.a-view').length !== 1 || !visible(av)) issues.push(`more or less than the «${adj}» adjuster is shown`);
    { const over = bd.scrollHeight - bd.clientHeight, wantTop = bd.scrollTop > 0.5, wantBot = bd.scrollTop < over - 0.5;
      if ((root.dataset.ftop === '1') !== wantTop || (root.dataset.fbot === '1') !== wantBot) issues.push(`fades ${root.dataset.ftop}/${root.dataset.fbot} do not match the scroll state (top ${bd.scrollTop}, over ${over.toFixed(1)})`);
      if (/_end$/.test(view) && over > 0.5 && bd.scrollTop < over - 0.5) issues.push('the _end render is not scrolled to the end'); }
    // the footer stays in view under the body: 60 pt at the bottom of the panel, the body ending where it starts
    { const ft = av.querySelector('.a-foot'), fr = ft.getBoundingClientRect(), ir = q('.r-in').getBoundingClientRect(), br = bd.getBoundingClientRect();
      if (Math.abs(fr.bottom - ir.bottom) > 0.5 || Math.abs(br.bottom - fr.top) > 0.5) issues.push(`footer not fixed under the body: footer ${fr.top.toFixed(1)}..${fr.bottom.toFixed(1)}, body ends ${br.bottom.toFixed(1)}, panel ends ${ir.bottom.toFixed(1)}`);
      if (getComputedStyle(ft).position !== 'static' || /auto|scroll/.test(getComputedStyle(ft.parentElement).overflowY)) issues.push('footer inside a scrolling box'); }
    // scroll hint: shown exactly when the bottom edge hides content, centred in the clear strip under the fade, over no
    // legible text
    { const c = bd.getBoundingClientRect(), fb = c.bottom - TOK.strip;
      if ((root.dataset.fbot === '1') !== visible(q('.r-hint'))) issues.push(`scroll hint chevron ${visible(q('.r-hint')) ? 'shown without' : 'missing with'} content below`);
      const h = q('.r-hint');
      if (visible(h)) {
        const hb = h.getBoundingClientRect();
        if (hb.top < fb - 0.5 || hb.bottom > c.bottom + 0.5 || Math.abs((hb.left + hb.right) / 2 - (c.left + c.right) / 2) > 0.6) issues.push(`scroll hint not centred in the clear strip under the fade: y ${hb.top.toFixed(1)}..${hb.bottom.toFixed(1)} (strip ${fb.toFixed(1)}..${c.bottom.toFixed(1)})`);
        texts.filter((x) => x.sheet && !x.faded).forEach((x) => { if (inter(x.line, box(hb))) issues.push(`scroll hint over text: "${x.t}"`); });
      } }
    // section identity: the open «الاقتصاد» dock item, the panel's top line and the emblem in emerald (no tabs in a pushed view)
    { const on = qa('.dock-item.on'), drawn = (cs) => cs.content !== 'none' && cs.content !== 'normal' && cs.display !== 'none';
      if (visible(q('.dock'))) {
        if (on.length !== 1 || on[0].textContent.trim() !== 'الاقتصاد' || on[0].getAttribute('aria-current') !== 'page') issues.push('the open section «الاقتصاد» is not marked in the dock');
        else {
          const ul = getComputedStyle(on[0], '::after');
          if (getComputedStyle(on[0]).color !== TOK.sec || getComputedStyle(on[0].querySelector('svg')).color !== TOK.sec || getComputedStyle(on[0].querySelector('span')).color !== TOK.sec) issues.push(`dock item «الاقتصاد» not in the section colour: ${getComputedStyle(on[0].querySelector('span')).color}`);
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
      const em = q('.s-emb'); if (!em || !visible(em) || getComputedStyle(em).color !== TOK.sec || !em.querySelector('svg') || getComputedStyle(em.querySelector('svg')).color !== TOK.sec) issues.push('section emblem missing or not in the section colour');
      if (qa('.r-tab').length) issues.push('a pushed view shows the tabs'); }
    // the section colour is for chrome only (the open tab, the emblem; the top line and the dock are pseudo-elements and
    // outside the sheet): no text, border, fill, shadow or icon of the sheet takes it; the track's fill is a data colour, teal
    texts.filter((x) => x.sheet && x.color === TOK.sec).forEach((x) => issues.push(`section colour on data text: "${x.t}"`));
    qa('.sheet *').filter((e) => !e.closest('.r-tab.on, .s-emb, .frost')).forEach((e) => { const cs = getComputedStyle(e);
      const borders = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => parseFloat(cs['border' + s + 'Width']) > 0).map((s) => cs['border' + s + 'Color']);
      if (borders.concat([cs.backgroundColor, parseFloat(cs.outlineWidth) > 0 ? cs.outlineColor : '']).includes(TOK.sec) || cs.boxShadow.includes(TOK.sec) || (e.closest('svg') && [cs.color, cs.stroke, cs.fill].includes(TOK.sec))) issues.push(`section colour on data chrome: ${label(e)}`); });
    qa('.a-fill').forEach((e) => { if (getComputedStyle(e).backgroundColor !== TOK.teal) issues.push(`the track's fill not in teal (it is data): ${getComputedStyle(e).backgroundColor}`); });
    // the effects: blue an improvement, amber a worsening
    { qa('.a-e').forEach((e) => { const want = e.dataset.good === '1' ? TOK.blue : TOK.amber, dd = e.querySelector('dd');
        if (getComputedStyle(dd).color !== want) issues.push(`effect «${e.querySelector('dt').textContent}» not in ${e.dataset.good === '1' ? 'blue' : 'amber'}: ${getComputedStyle(dd).color}`); }); }
    // the panel's sizes (the brief)
    TOK.size.forEach(([s, w, h]) => qa('.sheet ' + s).forEach((e) => { const r = e.getBoundingClientRect(); if (hiddenByScroll(box(r), e)) return;
      if ((w && !near(r.width, w)) || (h && !near(r.height, h))) issues.push(`size ${r.width.toFixed(1)}x${r.height.toFixed(1)} for ${s} (want ${w || 'any'} x ${h || 'any'})`); }));
    // the white touches the owner confirmed: white tiles, white-outlined chips and the header chip; the warning chip is
    // amber with its down arrow
    { const wt = (sel, want, skip) => qa('.sheet ' + sel).filter((e) => !(skip && e.matches(skip))).forEach((e) => { const cs = getComputedStyle(e);
        Object.entries(want).forEach(([k, v]) => { if (cs[k] !== v) issues.push(`white touch off: ${sel} ${k} ${cs[k]} (want ${v})`); }); });
      wt('.a-ok', { backgroundColor: TOK.t1, color: TOK.dark }, '[aria-disabled="true"]');   // in the wait it steps back (checked with the wait)
      wt('.a-no', { color: TOK.t1 });
      qa('.sheet .a-no, .sheet .a-pm').forEach((e) => { if (!getComputedStyle(e).boxShadow.includes(TOK.wLine)) issues.push(`white touch off: ${label(e)} without its white outline`); });
      wt('.r-chip', { borderTopColor: TOK.wLine, color: TOK.t1 });
      wt('.s-sg.on', { backgroundColor: TOK.t1, color: TOK.dark });
      wt('.r-cap', { borderTopColor: TOK.wLine, color: TOK.t1 }); }
    // the adjuster reads as the brief: back label, title, value block, limits, effects, footer line (each view's own)
    const T = (e) => (e ? e.textContent.replace(/\s+/g, ' ').trim() : ''), a = ADJ[adj], waitView = /_wait$/.test(view), atView = (view.match(/_(min|max)$/) || [])[1], pendView = /_pending/.test(view);
    const num = (s) => parseFloat((String(s).replace('−', '-').match(/-?\d+(?:\.\d+)?/) || [NaN])[0]);
    const nums = (s) => [...String(s).replace(/−/g, '-').matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => parseFloat(m[0]));
    { const arrow = (e) => { const u = e.querySelector('dd > .r-arr:first-child use'); return u ? (u.getAttribute('href') || '').replace('#t-', '') : ''; };
      const got = { back: T(av.querySelector('.a-back')), title: [T(av.querySelector('.a-title b')), T(av.querySelector('.a-title > span'))],
        val: [T(av.querySelector('.a-now b')), T(av.querySelector('.a-new b')), T(av.querySelector('.a-delta'))], unit: T(av.querySelector('.a-unit')) || undefined, lim: [...av.querySelectorAll('.a-lim')].map(T),
        eff: [...av.querySelectorAll('.a-e')].map((e) => [T(e.querySelector('dt')), T(e.querySelector('dd')), +e.dataset.good, arrow(e)]),
        when: T([...av.querySelectorAll('.a-when')].find(visible)) };
      got.eff = [...av.querySelectorAll('.a-grid')].filter(visible).map((g) => [...g.querySelectorAll('.a-e')].map((e) => [T(e.querySelector('dt')), T(e.querySelector('dd')), +e.dataset.good, arrow(e)])).flat();
      const want = Object.assign({}, a, { when: waitView ? a.wait : pendView ? a.pend.when : a.when, eff: pendView ? a.pend.eff : a.eff });
      ['back', 'title', 'val', 'unit', 'lim', 'eff', 'when'].forEach((k) => { if (JSON.stringify(got[k]) !== JSON.stringify(want[k])) issues.push(`brief rows differ: ${k}: ${JSON.stringify(got[k]).slice(0, 160)}`); });
      if (a.laws) { const laws = [...av.querySelectorAll('.s-pol')].map((r) => [T(r.querySelector('.r-at')), [...r.querySelectorAll('.s-sg')].map(T), [...r.querySelectorAll('.s-sg')].findIndex((s) => s.classList.contains('on'))]);
        const wantLaws = a.laws.map((l, i) => [l[0], l[1], pendView ? a.pend.chosen[i] : l[2]]);
        if (JSON.stringify(laws) !== JSON.stringify(wantLaws)) issues.push(`brief rows differ: laws: ${JSON.stringify(laws).slice(0, 160)}`);
        // a pending change: the current setting keeps a white outline and says «الحالي»; otherwise nothing is marked so
        const curs = [...av.querySelectorAll('.s-sg.s-cur')];
        if (pendView) { const reg = [...av.querySelectorAll('.s-pol')][0].querySelectorAll('.s-sg')[a.pend.cur];
          if (curs.length !== 1 || curs[0] !== reg || !getComputedStyle(reg).boxShadow.includes(TOK.wLine) || !(reg.getAttribute('aria-label') || '').endsWith('، الحالي')) issues.push('a pending change: the current setting is not marked (white outline, «الحالي»)'); }
        else if (curs.length) issues.push('a current-setting mark without a pending change');
        const set = av.querySelector('.a-set');
        if (T(set && set.querySelector('h3')) !== a.set || T(set && set.querySelector('.s-note')) !== a.note) issues.push('brief rows differ: the money settings\' heading or note');
        av.querySelectorAll('.s-pol').forEach((r, i) => { const sg = [...r.querySelectorAll('.s-sg')]; if (sg.findIndex((e) => e.classList.contains('on')) !== sg.findIndex((e) => e.getAttribute('aria-checked') === 'true')) issues.push(`law ${i + 1}: the chosen segment is not the aria-checked one`);
          if (!FREEST.includes(T(sg[0]))) issues.push(`setting ${i + 1}: the freest choice is not on the right (first): ${T(sg[0])}`); });
        // the settings' heading is not ruled (as no heading in the adjusters is); a hairline sets the section off above it
        if (set) { const hs = getComputedStyle(set.querySelector('h3')), ss = getComputedStyle(set);
          if (parseFloat(hs.borderBottomWidth) > 0) issues.push('the settings\' heading is ruled (no adjuster heading is)');
          if (parseFloat(ss.borderTopWidth) !== 1 || parseFloat(ss.borderBottomWidth) !== 0) issues.push(`the settings section: a hairline above it and none below (got ${ss.borderTopWidth} / ${ss.borderBottomWidth})`); } }
      if (av.querySelector('.a-back').getAttribute('aria-label') !== 'رجوع إلى ' + a.back) issues.push('a11y: the back control does not say where it goes');
      // the back chevron points back: right, in RTL (the shared chevron points left; rotated half a turn)
      if (!/matrix\(-1, [^,]+, [^,]+, -1/.test(getComputedStyle(av.querySelector('.a-bk')).transform)) issues.push(`the back chevron does not point back: ${getComputedStyle(av.querySelector('.a-bk')).transform}`);
      // the wait: «اعتماد» steps back (grey on no fill, the dim outline) and cannot be tapped; otherwise it is live
      const ok = av.querySelector('.a-ok'), oc = getComputedStyle(ok);
      // (no fill and no outline, so it no longer reads as a button, and the lock says why)
      if (waitView) { const lk = ok.querySelector('.a-lk');
        if (ok.getAttribute('aria-disabled') !== 'true' || oc.color !== TOK.t2 || oc.backgroundColor !== 'rgba(0, 0, 0, 0)' || oc.boxShadow !== 'none' || !lk || !visible(lk)) issues.push(`the wait: «اعتماد» does not step back (${oc.color} on ${oc.backgroundColor}, ${oc.boxShadow}, aria-disabled ${ok.getAttribute('aria-disabled')})`); }
      else if (ok.hasAttribute('aria-disabled')) issues.push('«اعتماد» is disabled outside the wait'); }
    // the value block: the current value 13 pt semibold grey, the arrow (with its shaft) pointing from it to the new value,
    // the new value 18 pt bold white with an amount's unit once after it; the labels grey
    { const nb = getComputedStyle(av.querySelector('.a-now b')), wb = getComputedStyle(av.querySelector('.a-new b')), to = av.querySelector('.a-to');
      if (nb.fontSize !== '13px' || nb.fontWeight !== '600' || nb.color !== TOK.t2) issues.push(`the current value is not 13 pt semibold grey: ${nb.fontSize}/${nb.fontWeight} ${nb.color}`);
      if (wb.fontSize !== '18px' || wb.fontWeight !== '700' || wb.color !== TOK.t1) issues.push(`the new value is not 18 pt bold white: ${wb.fontSize}/${wb.fontWeight} ${wb.color}`);
      av.querySelectorAll('.a-val em').forEach((e) => { if (getComputedStyle(e).color !== TOK.t2) issues.push(`a value label is not grey: ${T(e)}`); });
      const tr = to.getBoundingClientRect(), nr = av.querySelector('.a-now').getBoundingClientRect(), wr = av.querySelector('.a-new').getBoundingClientRect();
      if ((to.querySelector('use').getAttribute('href') !== '#i-to') || getComputedStyle(to).transform !== 'none' || !(tr.left >= wr.right - 0.5 && tr.right <= nr.left + 0.5)) issues.push('the value block\'s arrow must be the arrow with a shaft, unturned (pointing left), between the current and the new value');
      const units = [...av.querySelectorAll('.a-unit')];
      if (units.length !== (a.unit ? 1 : 0) || (units[0] && !units[0].parentElement.matches('.a-new'))) issues.push('the unit must show once, after the new amount');
      // the change in words agrees with the values: points for rates (with the count's form), percent for amounts
      const d = T(av.querySelector('.a-delta')), st = av.querySelector('.a-step'), now = +st.dataset.now, nw = +st.dataset.new;
      if (/نقط|نقاط/.test(d)) { const n = Math.abs(num(d)), form = n === 1 ? 'نقطة' : n === 2 ? 'نقطتان' : n >= 3 && n <= 10 && Number.isInteger(n) ? 'نقاط' : 'نقطة';
        if (Math.abs(num(d) - (nw - now)) > 0.001) issues.push(`the change says ${num(d)} points, the values differ by ${(nw - now).toFixed(2)}`);
        if (!d.endsWith(' ' + form)) issues.push(`the change's noun does not agree with its count: «${d}» (want ${form})`); }
      else if (Math.abs(num(d) - (nw - now) / now * 100) > 0.6) issues.push(`the change says ${num(d)}%, the values differ by ${((nw - now) / now * 100).toFixed(1)}%`); }
    // the stepper: the value block shows its data; the track's fill and knob at the new value, the tick at the current
    // one, from the right (the minimum's end in RTL), each drawn, in its colour and centred on the track; the tick shows
    // past the knob above and below; at the ends the knob clears the limit labels; − at the minimum's end, + at the
    // maximum's; the track is a slider that reads its range and values
    { const st = av.querySelector('.a-step');
      const [lo, hi, now, nw] = ['min', 'max', 'now', 'new'].map((k) => parseFloat(st.dataset[k]));
      if (Math.abs(num(av.querySelector('.a-now b').textContent) - now) > 1e-9 || Math.abs(num(av.querySelector('.a-new b').textContent) - nw) > 1e-9) issues.push('the value block does not show the stepper\'s data');
      const lims = [...av.querySelectorAll('.a-lim')];
      if (Math.abs(num(lims[0].textContent) - lo) > 1e-9 || Math.abs(num(lims[1].textContent) - hi) > 1e-9) issues.push('the limits do not show the stepper\'s range');
      const track = av.querySelector('.a-track'), tr = track.getBoundingClientRect(), at = (v) => tr.right - (v - lo) / (hi - lo) * tr.width;
      const shown = atView === 'min' ? lo : atView === 'max' ? hi : nw, tmid = (tr.top + tr.bottom) / 2;
      const marks = { knob: [av.querySelector('.a-knob'), TOK.t1], tick: [av.querySelector('.a-cur'), TOK.t2], fill: [av.querySelector('.a-fill'), TOK.teal] };
      Object.entries(marks).forEach(([k, [e, col]]) => { const r = e.getBoundingClientRect(), cs = getComputedStyle(e);
        if (!visible(e) || effOp(e) < 0.99 || cs.visibility !== 'visible') issues.push(`the stepper's ${k} is not drawn`);
        if (cs.backgroundColor !== col) issues.push(`the stepper's ${k} is ${cs.backgroundColor} (want ${col})`);
        if (Math.abs((r.top + r.bottom) / 2 - tmid) > 0.6) issues.push(`the stepper's ${k} is not centred on the track: ${((r.top + r.bottom) / 2).toFixed(1)} (track ${tmid.toFixed(1)})`); });
      const kn = marks.knob[0].getBoundingClientRect(), cu = marks.tick[0].getBoundingClientRect(), fl = marks.fill[0].getBoundingClientRect();
      if (Math.abs((kn.left + kn.right) / 2 - at(shown)) > 0.6) issues.push(`the knob is not at the new value: ${((kn.left + kn.right) / 2).toFixed(1)} (want ${at(shown).toFixed(1)})`);
      if (Math.abs((cu.left + cu.right) / 2 - at(now)) > 0.6) issues.push(`the current tick is not at the current value: ${((cu.left + cu.right) / 2).toFixed(1)} (want ${at(now).toFixed(1)})`);
      if (Math.abs(fl.right - tr.right) > 0.6 || Math.abs(fl.left - at(shown)) > 0.6) issues.push('the fill does not run from the minimum (right) to the new value');
      if (!(cu.top <= kn.top - 2.5 && cu.bottom >= kn.bottom + 2.5)) issues.push(`the current tick does not show past the knob (tick ${cu.top.toFixed(1)}..${cu.bottom.toFixed(1)}, knob ${kn.top.toFixed(1)}..${kn.bottom.toFixed(1)})`);
      if (marks.tick[0].compareDocumentPosition(marks.knob[0]) & Node.DOCUMENT_POSITION_PRECEDING || getComputedStyle(marks.tick[0]).zIndex !== 'auto') issues.push('the knob must paint over the tick');
      lims.forEach((l) => { const g = document.createRange(); g.selectNodeContents(l); const lr = g.getBoundingClientRect();
        if (Math.min(kn.right, lr.right) - Math.max(kn.left, lr.left) > -1.5) issues.push(`the knob comes within 1.5 pt of the limit «${T(l)}»`); });
      const pm = [...st.querySelectorAll('.a-pm')], use = (b) => b.querySelector('use').getAttribute('href');
      if (pm.length !== 2 || use(pm[0]) !== '#i-minus' || use(pm[1]) !== '#i-plus' || !(pm[0].getBoundingClientRect().left > pm[1].getBoundingClientRect().right)) issues.push('stepper: − must be at the minimum\'s end (right), + at the maximum\'s (left)');
      if (!/^أنقص /.test(pm[0].getAttribute('aria-label') || '') || !/^زد /.test(pm[1].getAttribute('aria-label') || '')) issues.push('a11y: the stepper buttons must say «أنقص …» (−) and «زد …» (+)');
      const ar = (k) => track.getAttribute('aria-' + k) || '', vt = ar('valuetext');
      if (track.getAttribute('role') !== 'slider' || !track.classList.contains('tap') || !ar('label') || +ar('valuemin') !== lo || +ar('valuemax') !== hi || +ar('valuenow') !== nw || nums(vt)[0] !== nw || !vt.includes('الحالي') || nums(vt).slice(-1)[0] !== now) issues.push(`a11y: the track must be a slider reading its range, the new value and the current one: ${ar('valuemin')}..${ar('valuemax')} now ${ar('valuenow')} «${vt}»`); }
    // the effects: a 2-column grid read right to left, label over value; blue an improvement, amber a worsening, each value
    // led by an arrow in its colour for the way the quantity moves; VoiceOver reads each as one phrase ending in its verdict
    { const es = [...av.querySelectorAll('.a-e')].filter(visible), rr = es.map((e) => e.getBoundingClientRect());
      if (es.length === 4 && !(rr[0].left >= rr[1].right - 0.5 && rr[2].left >= rr[3].right - 0.5 && Math.abs(rr[0].top - rr[1].top) < 0.5 && Math.abs(rr[2].top - rr[3].top) < 0.5 && rr[2].top >= rr[0].bottom - 0.5)) issues.push('the effects are not a 2-column grid read right to left');
      es.forEach((e) => { const dt = e.querySelector('dt'), dd = e.querySelector('dd'), al = e.getAttribute('aria-label') || '', good = e.dataset.good === '1';
        if (dt.getBoundingClientRect().bottom > dd.getBoundingClientRect().top + 0.5) issues.push(`effect «${T(dt)}»: the label must sit over the value`);
        const want = good ? TOK.blue : TOK.amber;
        if (getComputedStyle(dd).color !== want) issues.push(`effect «${T(dt)}» not in ${good ? 'blue' : 'amber'}: ${getComputedStyle(dd).color}`);
        const ar = dd.querySelector('.r-arr');
        if (!ar || dd.firstElementChild !== ar || getComputedStyle(ar).color !== want) issues.push(`effect «${T(dt)}»: no arrow in its colour before the value`);
        else { const up = ar.querySelector('use').getAttribute('href') === '#t-up', v = T(dd), n = nums(v);
          const rises = /بدل/.test(v) ? n[0] > n[1] : /^\+/.test(v) ? true : /^[−-]/.test(v) ? false : null;
          if (rises === null || rises !== up) issues.push(`effect «${T(dt)}»: the arrow does not show the way it moves`);
          const sk = getComputedStyle(ar).stroke;
          if ((sk !== want && sk !== 'currentcolor' && sk !== 'currentColor') || getComputedStyle(ar).transform !== 'none') issues.push(`effect «${T(dt)}»: the arrow is not drawn as it should (${sk}, ${getComputedStyle(ar).transform})`);
          if (!/بدل/.test(v) && !(up ? /تزيد|يزيد|ترتفع|يرتفع/ : /تنخفض|ينخفض|تقل|يقل/).test(al)) issues.push(`a11y: effect «${T(dt)}» does not say the way it moves`); }
        const words = T(dd);
        if (!al.startsWith(T(dt) + ': ') || !al.endsWith(good ? '، أفضل' : '، أسوأ') || al.includes('$') || (words.includes('$') && !al.includes('دولار')) || nums(words).some((x) => !nums(al).map(Math.abs).includes(Math.abs(x)))) issues.push(`a11y: effect «${T(dt)}» does not read as one phrase with its numbers, «دولار» and its verdict: «${al}»`); }); }
    // the numbers agree with screen 6 (read from its sheet): the deficit, the GDP, the lines, the tax, the rate, the
    // interest line, the exchange rate and the three money settings
    { const effOf = (dt) => { const e = [...av.querySelectorAll('.a-e')].filter(visible).find((x) => T(x.querySelector('dt')) === dt); return e ? T(e.querySelector('dd')) : ''; };
      const money = (s) => (/مليون \$/.test(s) ? num(s) / 1000 : num(s)), pair = (s) => nums(s);
      const st = av.querySelector('.a-step'), now = +st.dataset.now, nw = +st.dataset.new;
      const deficitIs = (v, what) => { const [x, y] = pair(effOf('العجز')); if (y !== S6.deficit) issues.push(`numbers: the old deficit is not screen 6's ${S6.deficit}`); if (!(Math.abs(v - x) <= 0.051)) issues.push(`numbers: the new deficit is not ${what}`); };
      if (adj === 'tax') { const rev = money(effOf('الإيرادات'));
        if (now !== S6.incomeRate) issues.push(`numbers: the tax rate is not screen 6's ${S6.incomeRate}%`);
        if (!(rev > 0 && rev <= S6.incomeYield * (nw - now) / now + 1e-9)) issues.push(`numbers: the extra revenue is not within the yield's share of the rise (${(S6.incomeYield * (nw - now) / now).toFixed(2)})`);
        deficitIs(S6.deficit - rev, `${S6.deficit} minus the extra revenue`); }
      if (adj === 'line') { if (now !== S6.education) issues.push(`numbers: the education line is not screen 6's ${S6.education}`);
        deficitIs(S6.deficit + (nw - now), `${S6.deficit} plus the extra spending`);
        if (!(Math.abs((nw - now) / S6.gdp * 100 - num(effOf('الدين إلى الناتج'))) <= 0.06)) issues.push(`numbers: the debt change is not the extra spending over GDP ${S6.gdp}`); }
      if (adj === 'subsidy') { if (now !== S6.fuel) issues.push(`numbers: the fuel subsidy is not screen 6's ${S6.fuel}`);
        deficitIs(S6.deficit - (now - nw), `${S6.deficit} minus the cut`); }
      if (adj === 'money') { if (now !== S6.rate) issues.push(`numbers: the rate is not screen 6's ${S6.rate}%`);
        const [i1, i0] = pair(effOf('الفوائد')), [f1, f0] = pair(effOf(pendView ? 'سعر الدولار بعد 6 أشهر' : 'سعر الدولار بعد 3 أشهر')).slice(-2);
        if (!pendView && (i0 !== S6.interest || !(i1 > i0))) issues.push(`numbers: the interest line is not screen 6's ${S6.interest}, rising`);
        if (f0 !== S6.fx || !(pendView ? f1 > f0 : f1 < f0)) issues.push(`numbers: the exchange rate is not screen 6's ${S6.fx}, the pound ${pendView ? 'weaker after the float' : 'stronger'}`);
        const chosen = a.laws.map((l, i) => l[1][pendView && i === 0 ? a.pend.cur : l[2]]);   // the settings in force now
        if (!S6.regime.endsWith(chosen[0]) || chosen[1] !== S6.conv || chosen[2] !== S6.controls) issues.push(`numbers: the money settings are not screen 6's (${S6.regime}, ${S6.conv}, ${S6.controls})`); } }
    // the money rule: under 1 billion in millions, never 1000 millions or more (over the text as shown)
    { const all = q('.sheet').innerText.replace(/\s+/g, ' ');
      for (const m of all.matchAll(/(\d+(?:\.\d+)?) مليار/g)) if (parseFloat(m[1]) < 1) issues.push(`money unit: «${m[0]}» (under 1 billion is written in millions)`);
      for (const m of all.matchAll(/(\d+(?:\.\d+)?) (?:مليون|ملايين) \$/g)) if (parseFloat(m[1]) >= 1000) issues.push(`money unit: «${m[0]}» (1000 millions and more are billions)`); }
    // signs sit inside the left-to-right number spans, drawn left of their digits
    { const w3 = document.createTreeWalker(q('.sheet'), NodeFilter.SHOW_TEXT); let n3;
      while ((n3 = w3.nextNode())) {
        const s = n3.textContent; if (!visible(n3.parentElement)) continue;
        for (let i = 0; i < s.length; i++) { if (!/[+−-]/.test(s[i])) continue;
          const nextEl = n3.nextSibling, trailing = !s.slice(i + 1).trim();
          if (trailing && nextEl && nextEl.nodeType === 1 && nextEl.matches('.ltr') && /^\d/.test(nextEl.textContent)) { issues.push(`a sign outside its number: «${s.trim()}${nextEl.textContent}»`); continue; }
          if (!/\d/.test(s[i + 1] || '')) continue;
          if (!n3.parentElement.closest('.ltr')) issues.push(`a sign not in a left-to-right number: «${s.trim()}»`);
          const r1 = document.createRange(); r1.setStart(n3, i); r1.setEnd(n3, i + 1); const r2 = document.createRange(); r2.setStart(n3, i + 1); r2.setEnd(n3, i + 2);
          if (r1.getBoundingClientRect().right > r2.getBoundingClientRect().left + 0.5) issues.push(`a sign drawn right of its number: «${s.trim()}»`); } } }
    // no image in the sheet but the flag and the header strip
    [...q('.sheet').querySelectorAll('*')].forEach((e) => {
      if (e.closest('.frost')) return;                                   // the panel's own backdrop layer
      if (e.tagName === 'IMG' && !e.closest('.r-flag')) issues.push('an image in the sheet');
      if (/url\(/.test(getComputedStyle(e).backgroundImage) && !e.matches('.r-hd')) issues.push(`a background image in the sheet (${label(e)})`); });
    // RTL order: header flag | name ... emblem | close; the back row, the value block, the stepper, the footer
    { const fl = q('.r-flag').getBoundingClientRect(), nm = q('.r-name').getBoundingClientRect(), em = q('.s-emb').getBoundingClientRect(), xb = q('.r-x').getBoundingClientRect();
      if (!(fl.left >= nm.right - 0.5 && em.right <= nm.left && xb.right <= em.left + 0.5)) issues.push('header order must be flag, name, ..., emblem, close (right to left)'); }
    const order = (row, sels, what) => { const bx = sels.map((s) => row.querySelector(s)).filter(Boolean).map((e) => e.getBoundingClientRect());
      for (let k = 1; k < bx.length; k++) if (!(bx[k].right <= bx[k - 1].left + 0.5)) { issues.push(`${what}: order must be ${sels.join(', ')} (right to left)`); return; } };
    { const bk = av.querySelector('.a-back'), ch = bk.querySelector('.a-bk').getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(bk); rg.setStartAfter(bk.querySelector('.a-bk'));
      if (!(ch.left >= rg.getBoundingClientRect().right - 0.5)) issues.push('back control: the chevron must be right of its label (RTL)'); }
    // the back control at the leading edge (right), the title at the trailing edge (left), each at the 12 pt padding;
    // the footer's timing line above its buttons
    order(av.querySelector('.a-nav'), ['.a-back', '.a-title'], 'back row');
    { const s = q('.sheet').getBoundingClientRect(), bk = av.querySelector('.a-back').getBoundingClientRect(), ti = av.querySelector('.a-title').getBoundingClientRect();
      if (Math.abs(bk.right - (s.right - 1 - 12)) > 0.5) issues.push(`the back control is not at the leading edge: ${bk.right.toFixed(1)} (want ${(s.right - 13).toFixed(1)})`);
      if (Math.abs(ti.left - (s.left + 1 + 12)) > 0.5) issues.push(`the title is not at the trailing edge: ${ti.left.toFixed(1)} (want ${(s.left + 13).toFixed(1)})`);
      const tb = getComputedStyle(av.querySelector('.a-title b'));
      if (tb.fontSize !== '14px' || tb.fontWeight !== '700') issues.push(`the title is not 14 pt bold (it must outrank the back label): ${tb.fontSize}/${tb.fontWeight}`);
      const bkc = getComputedStyle(av.querySelector('.a-back')), ns = av.querySelector('.a-title > span'), nsc = getComputedStyle(ns), nv = getComputedStyle(av.querySelector('.a-nav'));
      if (bkc.fontSize !== '13px' || bkc.fontWeight !== '600') issues.push(`the back label is not 13 pt semibold: ${bkc.fontSize}/${bkc.fontWeight}`);
      if (nsc.fontSize !== '10px' || nsc.color !== TOK.t2 || ns.getBoundingClientRect().top < av.querySelector('.a-title b').getBoundingClientRect().bottom - 0.5) issues.push('the title\'s note must be 10 pt grey, under the title');
      if (nv.borderBottomWidth !== '1px' || nv.borderBottomStyle !== 'solid') issues.push('the back row has lost its hairline');
      const gl = [...av.querySelectorAll('.a-grid')].find(visible);
      if (!gl || !/^الأثر المتوقع/.test(gl.getAttribute('aria-label') || '')) issues.push('a11y: the effects are not named «الأثر المتوقع»');
      const wn = [...av.querySelectorAll('.a-when')].find(visible), bt = av.querySelector('.a-btns');
      if (!wn || wn.getBoundingClientRect().bottom > bt.getBoundingClientRect().top + 0.5) issues.push('footer: the timing line must sit above the buttons'); }
    order(av.querySelector('.a-val'), ['.a-now', '.a-to', '.a-new', '.a-delta'], 'value block');
    if (av.querySelector('.a-unit')) order(av.querySelector('.a-new'), ['em', 'b', '.a-unit'], 'new value');
    order(av.querySelector('.a-step'), ['.a-pm:first-of-type', '.a-lim:first-of-type', '.a-track', '.a-lim:last-of-type', '.a-pm:last-of-type'], 'stepper');
    order(av.querySelector('.a-btns'), ['.a-ok', '.a-no'], 'footer buttons');
    av.querySelectorAll('.s-pol').forEach((a, i) => { order(a, ['.r-at', '.s-seg'], `setting ${i + 1}`);
      const sg = [...a.querySelectorAll('.s-sg')]; for (let k = 1; k < sg.length; k++) if (!(sg[k].getBoundingClientRect().right <= sg[k - 1].getBoundingClientRect().left + 0.5)) issues.push(`setting ${i + 1}: choices not right to left`); });
    { const f = q('.r-flag').getBoundingClientRect(); if (!near(f.width / f.height, 4 / 3, 0.01)) issues.push('flag is not 4:3'); }
    // ---------- 9. the brief's content: fully visible in this render ----------
    const leafs = (s) => { const cands = [...q('.sheet').querySelectorAll('*')].filter((e) => e.getClientRects().length && e.innerText && e.innerText.replace(/\s+/g, ' ').trim() === s);
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
  }, { d, TOK, BRIEF, ADJ, HEAD, b3, view, HUDSEL_REST, S6, FREEST });
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
const viewOf = (extra) => { const t = (extra.match(/adjust=(\w+)/) || [0, 'tax'])[1], s = (extra.match(/scroll=(\w+)/) || [0, ''])[1], at = (extra.match(/[?&]at=(\d+)/) || [0, ''])[1];
  return t + (/pending=1/.test(extra) ? '_pending' : '') + (s === 'end' ? '_end' : s ? '_at' + s : '') + (/states=1/.test(extra) ? '_wait' : '') + (at === '0' ? '_min' : at === '100' ? '_max' : ''); };
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
  const out = VIEWS.map(([suffix, extra]) => ({ suffix, extra, png: true })).concat(ENDS.map(([suffix, extra]) => ({ suffix, extra, png: false })));
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
const addClear = (clearBy, view, list) => { if (/_(wait|min|max)$/.test(view)) return; const k = seqOf(view); if (!BRIEF['reach_' + k]) return; (clearBy[k] = clearBy[k] || new Set()); list.forEach((s) => clearBy[k].add(s)); };

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
  // scroll the open body so its bottom edge runs through an effect's text; the page runs these from their source, so
  // each is self-contained
  const straddleSoft = () => { const b = [...document.querySelectorAll('.a-view > .r-body')].find((e) => e.getClientRects().length), bb = b.getBoundingClientRect();
    const r = [...b.querySelectorAll('.a-e, .s-pol')].find((e) => e.getBoundingClientRect().top + 8 > bb.bottom);
    b.scrollTop += r.getBoundingClientRect().top + 8 - bb.bottom;
    document.documentElement.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0'; };
  const straddleHard = () => { const b = [...document.querySelectorAll('.a-view > .r-body')].find((e) => e.getClientRects().length), bb = b.getBoundingClientRect();
    const r = [...b.querySelectorAll('.a-e, .s-pol')].find((e) => e.getBoundingClientRect().top + 8 > bb.bottom);
    b.scrollTop += r.getBoundingClientRect().top + 8 - bb.bottom;
    document.documentElement.dataset.ftop = b.scrollTop > 0.5 ? '1' : '0';
    document.documentElement.dataset.fbot = '0'; };
  // [name, device, extra url, css, expected issue, optional page script]. Each regex names the one check under test.
  const cases = [
    ['type size', d, '', '.r-name { font-size: 17px !important; }', /font size 17 for "الاقتصاد"/],
    ['18 pt misuse', d, '', '.a-title b { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for the panel's name and the adjusted values/],
    ['font weight', d, '', '.a-e dd { font-weight: 700 !important; }', /font weight 13\/700/],
    ['off-token colour', d, '', '.a-e dt { color: #8899aa !important; }', /text colour off-token/],
    ['control height', d, '', '.a-btn { height: 40px !important; }', /control height 40.00 for \.a-btn/],
    ['radius', d, '', '.a-btn { border-radius: 6px !important; }', /radius 6 for \.a-btn/],
    ['gap', d, '', '.a-step { gap: 6px !important; }', /gap 6 on/],
    ['icon size', d, '', '.a-pm svg.i { width: 19px !important; height: 19px !important; }', /icon size 19x19 \(want 16\)/],
    ['hit overlap', d, '', '.a-ok { margin-inline-end: -12px !important; }', /hit overlap/],
    ['tap in the side inset', d, '', '.sheet { right: -30px !important; }', /tap in side inset/],
    ['text in the side inset', d, '', '.sheet { right: -30px !important; }', /text in side inset/],
    ['panel in the side inset', d, '', '.sheet { right: -30px !important; }', /panel in side inset/],
    ['clipped text', d, '', '.a-val { margin-inline-start: -40px !important; }', /clipped text \(sides\)/],
    ['text outside the padding', d, '', '.a-val { margin-inline-start: -8px !important; }', /text outside the sheet's 12 pt padding/],
    ['horizontal overflow', d, '', '.a-val { width: 600px !important; }', /horizontal overflow/],
    ['text overlap', d, '', '.a-new { margin-inline-start: -60px !important; }', /text overlap/],
    ['icon over text', d, '', '.a-to { margin-inline-end: -30px !important; }', /icon over text/],
    ['panel not opaque', d, '', '.sheet > .frost::after { background: rgba(9, 17, 25, 0.66) !important; }', /panel not opaque: الاقتصاد/],
    ['see-through panel', d, '', '.sheet { opacity: .6 !important; }', /panel not opaque \(opacity 0\.60\)/],
    ['Egypt covered', d, '', ':root { --map-cx: 760px !important; }', /Egypt covered by panel الاقتصاد/],
    ['sheet width', d, '', ':root { --sheet-w: 330px !important; }', /sheet width 330/],
    ['sheet top', d, '', '.sheet { top: 30px !important; }', /sheet top [\d.]+ \(want 8 pt under the top row/],
    ['panel overlap', d, '', '.sheet { top: 30px !important; }', /panel overlap/],
    ['dock hidden although it fits', d, '', '[data-dock="left"] .dock { display: none !important; }', /dock hidden although it fits/],
    ['dock not moved left', d, '', '[data-dock="left"] .dock { align-self: center !important; }', /dock not 4 pt in from the left end/],
    ['dock shown on the SE', se, '', '[data-dock="hidden"] .dock { display: flex !important; }', /dock shown although it does not fit/],
    ['left stack moved', d, '', '.lstack { margin-left: 8px; }', /HUD element moved from its B3 position: \.toast/],
    ['header not compact', d, '', '', /fit level 0 \(want 6/, () => { document.documentElement.dataset.rfit = '0'; }],
    ['header 56 pt', d, '', '.r-hd { height: 56px !important; }', /size [\d.]+x56\.0 for \.r-hd/],
    ['tax does not fit whole', se, '', '.a-val { margin-bottom: 30px !important; }', /the tax adjuster does not fit whole/],
    ['fades wrong', d, '&adjust=money', '', /fades .* do not match the scroll state/, () => { document.documentElement.dataset.fbot = '0'; }],
    ['cut at a hard edge', se, '&adjust=money', '', /clipped text \(bottom\)|control cut by its scroll area \(bottom\)/, straddleHard],
    ['fade flag without a mask', se, '&adjust=money', '.r-body { -webkit-mask-image: none !important; mask-image: none !important; }', /clipped text \(bottom\)|control cut by its scroll area \(bottom\)/, straddleSoft],
    ['fade without the hint strip', se, '&adjust=money', '[data-fbot="1"] .r-body { -webkit-mask-image: linear-gradient(180deg, #000 calc(100% - 24px), transparent) !important; mask-image: linear-gradient(180deg, #000 calc(100% - 24px), transparent) !important; }', /clipped text \(bottom\)|control cut by its scroll area \(bottom\)/, straddleSoft],
    ['hint chevron missing', d, '&adjust=money', '.r-hint { display: none !important; }', /scroll hint chevron missing with content below/],
    ['hint over the footer', d, '&adjust=money', '[data-adjust] .r-hint { bottom: 20px !important; }', /scroll hint not centred in the clear strip/],
    ['footer scrolls away', d, '&adjust=money', '.a-view > .r-body { flex: none !important; height: 120px !important; }', /footer not fixed under the body/],
    ['% before its number', d, '', '', /% shown before its number/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-title span').textContent = 'الشريحة العليا 20%'; }],
    ['brief text scrolled away', d, '&adjust=money', '', /brief text not fully visible: 9\.25%/, () => { const b = document.querySelector('.a-view[data-adjust="money"] > .r-body'); b.scrollTop = b.scrollHeight; }],
    ['hidden effect value', d, '', '', /brief text not fully visible: \+1 خلال 3 أشهر/, () => { document.querySelectorAll('.a-view[data-adjust="tax"] .a-e dd')[2].style.opacity = '0'; }],
    ['map label cut', d, '', '.labels .cut { display: inline !important; }', /map (label|city dot) .* cut by a panel edge/],
    ['map label at the screen edge', d, '', '.labels .cut { display: inline !important; }', /map (label|city dot) .* sliced by the screen edge or the side inset/],
    ['contrast', d, '', '.a-grid { background: rgb(234, 242, 247) !important; }', /^contrast [0-3](\.\d+)? for "الإيرادات"/],
    ['faint text', d, '', '.a-e dt { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for "الإيرادات"/],
    ['dock item not marked', d, '', '', /the open section «الاقتصاد» is not marked in the dock/, () => { document.querySelector('.dock-item.on').classList.remove('on'); }],
    ['identity line missing', d, '', '[data-sec] .r-in::before { content: none !important; }', /panel top line none/],
    ['emblem missing', d, '', '.s-emb { display: none !important; }', /section emblem missing/],
    ['tabs shown', d, '', '', /a pushed view shows the tabs/, () => { const n = document.createElement('button'); n.className = 'r-tab'; n.textContent = 'x'; document.querySelector('.r-in').appendChild(n); }],
    ['section colour on data', d, '', '.a-e dd { color: var(--sec) !important; }', /section colour on data text/],
    ['section colour on chrome', d, '', '.a-pm { color: var(--sec) !important; }', /section colour on data chrome/],
    ['fill in the section colour', d, '', '.a-fill { background: var(--sec) !important; }', /the track's fill not in teal/],
    ['effect colour wrong', d, '', '.a-e[data-good="1"] dd { color: var(--amber) !important; }', /effect «الإيرادات» not in blue/],
    ['worsening not amber', d, '&adjust=subsidy', '.a-e[data-good="0"] dd { color: var(--t1) !important; }', /effect «التضخم» not in amber/],
    ['size of the knob', d, '', '.a-knob { width: 24px !important; height: 24px !important; }', /size 24\.0x24\.0 for \.a-knob/],
    ['footer height', d, '', '.a-foot { height: 70px !important; }', /for \.a-foot \(want any x 60\)/],
    ['primary not white', d, '', '.a-ok { background: transparent !important; color: var(--t1) !important; }', /white touch off: \.a-ok/],
    ['cancel without its outline', d, '', '.a-no { box-shadow: none !important; }', /without its white outline/],
    ['chosen setting not white', d, '&adjust=money', '.s-sg.on { background: transparent !important; color: var(--t1) !important; }', /white touch off: \.s-sg\.on/],
    ['back label wrong', d, '&adjust=line', '', /brief rows differ: back/, () => { const b = document.querySelector('.a-view[data-adjust="line"] .a-back'); b.lastChild.textContent = 'الضرائب والدعم'; }],
    ['back not labelled', d, '', '', /a11y: the back control does not say where it goes/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-back').removeAttribute('aria-label'); }],
    ['back chevron forward', d, '', '.a-bk { transform: none !important; }', /the back chevron does not point back/],
    ['back chevron left of its label', d, '', '.a-back { flex-direction: row-reverse !important; }', /back control: the chevron must be right of its label/],
    ['value differs from its data', d, '', '', /the value block does not show the stepper's data/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-new b').textContent = '23%'; }],
    ['limits differ', d, '', '', /the limits do not show the stepper's range/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-lim').textContent = '5%'; }],
    ['knob misplaced', d, '', '.a-knob { right: 20% !important; }', /the knob is not at the new value/],
    ['tick misplaced', d, '', '.a-cur { right: 20% !important; }', /the current tick is not at the current value/],
    ['fill from the left', d, '', '.a-fill { right: auto !important; left: 0 !important; }', /the fill does not run from the minimum/],
    ['stepper reversed', d, '', '.a-step { flex-direction: row-reverse !important; }', /stepper: − must be at the minimum's end/],
    ['stepper not labelled', d, '', '', /a11y: the stepper buttons must say/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-pm').removeAttribute('aria-label'); }],
    ['track silent', d, '', '', /a11y: the track must be a slider/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-track').removeAttribute('aria-label'); }],
    ['track values wrong', d, '', '', /a11y: the track must be a slider/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-track').setAttribute('aria-valuenow', '30'); }],
    ['track not a slider', d, '', '', /a11y: the track must be a slider/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-track').setAttribute('role', 'img'); }],
    ['stepper labels swapped', d, '', '', /«أنقص …» \(−\) and «زد …» \(\+\)/, () => { const b = document.querySelectorAll('.a-view[data-adjust="tax"] .a-pm'); b[0].setAttribute('aria-label', 'زد نقطة'); b[1].setAttribute('aria-label', 'أنقص نقطة'); }],
    ['knob hidden', d, '', '.a-knob { opacity: 0 !important; }', /the stepper's knob is not drawn/],
    ['knob off the track', d, '', '.a-knob { top: 8px !important; }', /the stepper's knob is not centred on the track/],
    ['tick in teal', d, '', '.a-cur { background: var(--teal) !important; }', /the stepper's tick is rgb\(63, 224, 208\)/],
    ['knob not white', d, '', '.a-knob { background: var(--amber) !important; }', /the stepper's knob is rgb\(242, 177, 76\)/],
    ['tick hidden by the knob', d, '', '.a-cur { top: -5px !important; height: 16px !important; }', /the current tick does not show past the knob/],
    ['tick over the knob', d, '', '.a-cur { z-index: 1; }', /the knob must paint over the tick/],
    ['knob over a limit at the end', d, '&at=0', '.a-track { margin-inline: 0 !important; }', /the knob comes within 1\.5 pt of the limit «10%»/],
    ['knob over a limit at the other end', se, '&adjust=subsidy&at=100', '.a-track { margin-inline: 0 !important; }', /the knob comes within 1\.5 pt of the limit «17\.6»/],
    ['sign outside its number', d, '', '', /a sign outside its number/, () => { const s = document.querySelector('.a-view[data-adjust="tax"] .a-e dd .ltr'); s.textContent = '600'; s.before(document.createTextNode('+')); }],
    ['sign in an RTL run', d, '', '', /a sign not in a left-to-right number/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e dd .ltr').classList.remove('ltr'); }],
    ['effect unlabelled', d, '', '', /a11y: effect «الإيرادات» does not read/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e').removeAttribute('aria-label'); }],
    ['effect verdict wrong', d, '', '', /a11y: effect «الإيرادات» does not read/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e').setAttribute('aria-label', 'الإيرادات: تزيد 600 مليون دولار سنويًا، أسوأ'); }],
    ['effect label with $', d, '', '', /a11y: effect «العجز» does not read/, () => { document.querySelectorAll('.a-view[data-adjust="tax"] .a-e')[1].setAttribute('aria-label', 'العجز: 17.1 مليار $ بدل 17.7، أفضل'); }],
    ['effect arrow wrong', d, '', '', /effect «الإيرادات»: the arrow does not show the way it moves/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e .r-arr use').setAttribute('href', '#t-down'); }],
    ['effect without its arrow', d, '', '', /effect «الإيرادات»: no arrow in its colour/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e .r-arr').remove(); }],
    ['effects in one column', d, '', '.a-grid { grid-template-columns: 1fr !important; }', /the effects are not a 2-column grid read right to left/],
    ['effects left to right', d, '', '.a-grid { direction: ltr; }', /the effects are not a 2-column grid read right to left/],
    ['effect value over its label', d, '', '.a-e { flex-direction: column-reverse !important; }', /the label must sit over the value/],
    ['new value not 18', d, '', '.a-new b { font-size: 14px !important; }', /the new value is not 18 pt bold white/],
    ['current value white', d, '', '.a-now b { color: var(--t1) !important; }', /the current value is not 13 pt semibold grey/],
    ['value arrow turned', d, '', '.a-to { transform: rotate(180deg); }', /the value block's arrow/],
    ['value arrow is the chevron', d, '', '', /the value block's arrow/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-to use').setAttribute('href', '#i-chev'); }],
    ['unit after the current value', d, '&adjust=line', '', /the unit must show once, after the new amount/, () => { const v = document.querySelector('.a-view[data-adjust="line"]'); v.querySelector('.a-now').appendChild(v.querySelector('.a-unit')); }],
    ['change noun disagrees', d, '', '', /the change's noun does not agree with its count/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-delta').lastChild.textContent = ' نقطة'; }],
    ['section colour on a rule', d, '', '.a-nav { border-bottom-color: var(--sec) !important; }', /section colour on data chrome/],
    ['section colour in a shadow', d, '', '.a-foot { box-shadow: inset 0 1px 0 var(--sec) !important; }', /section colour on data chrome/],
    ['emblem drawn grey', d, '', '.s-emb svg { color: var(--t2) !important; }', /section emblem missing or not in the section colour/],
    ['dock label white', d, '', '.dock-item.on span { color: var(--t1) !important; }', /dock item «الاقتصاد» not in the section colour/],
    ['back control at the trailing edge', d, '', '.a-nav { flex-direction: row-reverse !important; }', /the back control is not at the leading edge/],
    ['title not bold', d, '', '.a-title b { font-size: 13px !important; font-weight: 600 !important; }', /the title is not 14 pt bold/],
    ['footer upside down', d, '', '.a-foot { flex-direction: column-reverse !important; }', /the timing line must sit above the buttons/],
    ['settings heading ruled', d, '&adjust=money&scroll=end', '.r-body > section.r-sec.a-set h3 { border-bottom: 1px solid var(--hair) !important; }', /the settings' heading is ruled/],
    ['freest not on the right', d, '&adjust=money', '', /setting 1: the freest choice is not on the right/, () => { const s = document.querySelector('.a-view[data-adjust="money"] .s-seg'); s.appendChild(s.firstElementChild); }],
    ['wait: «اعتماد» live', d, '&states=1', '[data-states="1"] .a-view[data-adjust="tax"] .a-ok { background: var(--t1) !important; color: #0B1218 !important; }', /the wait: «اعتماد» does not step back/],
    ['wait: «اعتماد» tappable', d, '&states=1', '', /the wait: «اعتماد» does not step back/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-ok').removeAttribute('aria-disabled'); }],
    ['pending: current not marked', d, '&adjust=money&pending=1&scroll=end', '', /a pending change: the current setting is not marked/, () => { document.querySelector('.s-cur').classList.remove('s-cur'); }],
    ['current marked without a change', d, '&adjust=money&scroll=end', '', /a current-setting mark without a pending change/, () => { document.querySelectorAll('.a-view[data-adjust="money"] .s-sg')[0].classList.add('s-cur'); }],
    ['pending: the float shown stronger', d, '&adjust=money&pending=1', '', /the pound weaker after the float/, () => { document.querySelectorAll('.a-view[data-adjust="money"] .m-alt .a-e')[1].querySelector('.ltr').textContent = '5.60'; }],
    ['pending: the rate effects alone', d, '&adjust=money&pending=1', '[data-pending="1"] .m-def { display: grid !important; } [data-pending="1"] .m-alt { display: none !important; }', /brief rows differ: eff/],
    ['effect phrase says the opposite', d, '', '', /a11y: effect «الإيرادات» does not say the way it moves/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e').setAttribute('aria-label', 'الإيرادات: تنخفض 300 مليون دولار سنويًا، أفضل'); }],
    ['effect arrow in the wrong colour', d, '', '.a-e[data-good="0"] .r-arr { stroke: var(--blue) !important; }', /effect «اضطرابات المحافظات الحضرية»: the arrow is not drawn as it should/],
    ['effect arrow turned', d, '', '.a-e .r-arr { transform: rotate(180deg); }', /the arrow is not drawn as it should/],
    ['back label as big as the title', d, '', '.a-back { font-size: 14px !important; line-height: 18px !important; font-weight: 700 !important; }', /the back label is not 13 pt semibold/],
    ['effects unnamed', d, '', '', /a11y: the effects are not named/, () => { document.querySelectorAll('.a-grid').forEach((g) => g.removeAttribute('aria-label')); }],
    ['note beside the title', d, '', '.a-title { flex-direction: row !important; } .a-title span { color: var(--t1) !important; }', /the title's note must be 10 pt grey, under the title/],
    ['back row without its hairline', d, '', '.a-nav { border-bottom: 0 !important; }', /the back row has lost its hairline/],
    ['pending effect faded away', se, '&adjust=money&pending=1&scroll=end', '[data-pending="1"] .m-alt .a-e:nth-child(4) dd { opacity: .25 !important; }', /brief text cannot be scrolled clear|brief text not fully visible/],
    ['disabled outside the wait', d, '', '', /«اعتماد» is disabled outside the wait/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-ok').setAttribute('aria-disabled', 'true'); }],
    ['change in points wrong', d, '', '', /the change says 3 points/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-delta .ltr').textContent = '+3'; }],
    ['change in percent wrong', d, '&adjust=line', '', /the change says 20%/, () => { document.querySelector('.a-view[data-adjust="line"] .a-delta .ltr').textContent = '+20%'; }],
    ['effects differ', d, '', '', /brief rows differ: eff/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e dd').innerHTML = '<span class="ltr">+400</span> مليون $ سنويًا'; }],
    ['deficit does not follow', d, '', '', /numbers: the new deficit is not 17\.7 minus/, () => { document.querySelectorAll('.a-view[data-adjust="tax"] .a-e dd .ltr')[1].textContent = '17.0'; }],
    ['spending does not follow', d, '&adjust=line', '', /numbers: the new deficit is not 17\.7 plus/, () => { document.querySelector('.a-view[data-adjust="line"] .a-e dd .ltr').textContent = '18.9'; }],
    ['debt does not follow', d, '&adjust=line', '', /numbers: the debt change/, () => { document.querySelectorAll('.a-view[data-adjust="line"] .a-e dd .ltr')[2].textContent = '+0.9'; }],
    ['deficit does not follow the cut', d, '&adjust=subsidy', '', /numbers: the new deficit is not 17\.7 minus the cut/, () => { document.querySelector('.a-view[data-adjust="subsidy"] .a-e dd .ltr').textContent = '15.0'; }],
    ['old deficit not screen 6\'s', d, '', '', /numbers: the old deficit is not screen 6's 17\.7/, () => { document.querySelectorAll('.a-view[data-adjust="tax"] .a-e dd .ltr')[2].textContent = '17.9'; }],
    ['revenue beyond the yield', d, '', '', /numbers: the extra revenue is not within/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e dd .ltr').textContent = '+950'; }],
    ['interest not screen 6\'s', d, '&adjust=money', '', /numbers: the interest line is not screen 6's/, () => { document.querySelectorAll('.a-view[data-adjust="money"] .a-e')[2].querySelectorAll('.ltr')[1].textContent = '13.5'; }],
    ['exchange rate not screen 6\'s', d, '&adjust=money', '', /numbers: the exchange rate is not screen 6's/, () => { document.querySelectorAll('.a-view[data-adjust="money"] .a-e')[1].querySelectorAll('.ltr')[1].textContent = '5.90'; }],
    ['money unit in the value block', d, '&adjust=line', '', /money unit: «0\.8 مليار»/, () => { document.querySelector('.a-view[data-adjust="line"] .a-new b').textContent = '0.8'; }],
    ['money unit', d, '', '', /money unit: «0\.3 مليار»/, () => { document.querySelector('.a-view[data-adjust="tax"] .a-e dd').innerHTML = '<span class="ltr">+0.3</span> مليار $ سنويًا'; }],
    ['setting chosen wrong', d, '&adjust=money', '', /law 1: the chosen segment is not the aria-checked one/, () => { const s = document.querySelectorAll('.a-view[data-adjust="money"] .s-pol')[0].querySelectorAll('.s-sg'); s[1].setAttribute('aria-checked', 'false'); s[0].setAttribute('aria-checked', 'true'); }],
    ['setting choices reversed', d, '&adjust=money', '.s-seg { direction: ltr; }', /setting 1: choices not right to left/],
    ['value block order', d, '', '.a-val { flex-direction: row-reverse !important; }', /value block: order must be/],
    ['footer buttons order', d, '', '.a-btns { direction: ltr; }', /footer buttons: order must be/],
    ['an image in the sheet', d, '', '', /an image in the sheet/, () => { const i = document.createElement('img'); i.src = '../../shared/flags/eg.svg'; i.style.cssText = 'width:17px;height:17px'; document.querySelector('.a-view[data-adjust="tax"] .a-title').appendChild(i); }],
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
    // the coverage check itself: without the middle views, the SE's money adjuster leaves rows unchecked
    if (x === se) {
      const miss = coverage(skipMid), ok = miss.some((i) => /^money: never shown clear of the fades in any view: /.test(i));
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
