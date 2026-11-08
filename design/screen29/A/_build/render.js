// Screen 29 variant A (sources and rights, «المصادر والحقوق»; §4.8, R5, §6.5): render the iPhones and run the checks with
// the shared panel checker (design/shared/check/panelcheck.js), in the «المزيد» section. This file adds the sheet's own
// rules: the header (the version as screen 13's about tab says it), its emblem and close; the tabs in order; every source
// with what it feeds and its licence, the licence the one design_doc/final_design.md §4's table gives that source; NASA's
// credit (Earth Observatory, Reto Stöckli) and its no-endorsement line; the flags' licence as CREDITS.md and the flags for
// identification only; the design values said to be no data and outside the realism comparisons (R5), each with its
// value and its section; nothing that opens the web (L10); no dialog over the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');
// §4's sources table: the licence of each source, read from its row
const DOC = rd('../../../design_doc/final_design.md');
const docRow = (key) => { const l = DOC.split('\n').find((x) => x.startsWith('|') && x.includes(key)); if (!l) throw new Error('no §4 row for ' + key); return l; };
// [the sheet's name, the §4 row's key, the licence shown]
const SRC = {
  data: [['الأمم المتحدة: التوقعات السكانية 2024', '| UN WPP 2024 | CC BY 3.0 IGO', 'CC BY 3.0 IGO'], ['البنك الدولي: مؤشرات التنمية', '| World Bank WDI |', 'CC BY 4.0'],
    ['GHS-POP · المفوضية الأوروبية', '| GHS-POP R2023A |', 'CC BY 4.0'], ['Kummu 2018', '| Kummu 2018 gridded GDP', 'CC0'], ['منظمة العمل الدولية: ILOSTAT', '| ILOSTAT labour force', 'CC BY 4.0'],
    ['Penn World Table', '| Penn World Table 10.x |', 'CC BY 4.0'], ['UCDP/PRIO · جامعة أوبسالا', '| UCDP/PRIO; UCDP battle deaths |', 'CC BY 4.0'], ['WMEAT · الخارجية الأمريكية', '| **WMEAT 2013 and 2015** |', 'ملكية عامة'],
    ['DeltaDTM · Pronk 2024', '| **DeltaDTM** (Pronk', 'CC BY 4.0'], ['Global Carbon Budget', '| Global Carbon Budget |', 'CC BY 4.0'], ['الهيئة الحكومية الدولية المعنية بتغير المناخ', '| IPCC AR6 WGI data |', 'CC BY 4.0']],
  maps: [['Natural Earth', '| Natural Earth 10m', 'ملكية عامة'], ['GMTED2010 وETOPO1', '| GMTED2010 (USGS) |', 'ملكية عامة'], ['flag-icons · Panayiotis Lipiridis', '| flag-icons plus own redraws |', 'MIT']],
};
const LIC = { 'CC BY 3.0 IGO': /CC BY 3\.0 IGO/, 'CC BY 4.0': /CC BY 4\.0/, CC0: /\bCC0\b/, 'ملكية عامة': /Public domain|\bPD\b/, MIT: /\bMIT\b/ };
Object.values(SRC).flat().forEach(([n, k, l]) => { if (!LIC[l].test(docRow(k))) throw new Error('§4 does not give ' + n + ' the licence ' + l); });
// screen 13's about tab: the version
const VER = (() => { const m = rd('../../screen13/A/_build/sheet.html').match(/صانع التاريخ · الإصدار <span class="ltr">([\d.]+)<\/span>/); if (!m) throw new Error('cannot read the version from screen 13'); return m[1]; })();
const HEAD = ['المصادر', 'الحقوق والرخص · الإصدار ' + VER, 'البيانات', 'الخرائط والصور', 'قيم تصميمية'];
const BRIEF = {
  data: HEAD.concat(['أرقام البداية من هذه المصادر، ثم تتغير بقراراتك.', 'السكان والاقتصاد', 'الأمم المتحدة: التوقعات السكانية 2024', 'السكان والأعمار والتوقعات · CC BY 3.0 IGO']),
  reach_data: SRC.data.map((x) => x[0]).concat(['الأمن والنزاعات', 'الأرض والمناخ']),
  maps: HEAD.concat(['الخرائط', 'NASA Blue Marble', 'صورة الأرض · مرصد الأرض في ناسا، Reto Stöckli']),
  reach_maps: ['استخدام صور ناسا لا يعني أن ناسا تؤيد اللعبة.', 'الأعلام والصور', 'الأعلام · MIT', 'صور اللعبة', 'صُنعت لهذه اللعبة · سجل لكل صورة', 'الأعلام لتعريف الدول داخل اللعبة فقط.'].concat(SRC.maps.map((x) => x[0])),
  values: HEAD.concat(['قيم ضبطناها للعب حيث لا توجد بيانات. ليست واقعية، ولا تدخل في مقارنة اللعبة بالتاريخ.', 'تلاشي فرق البداية', 'نصف عمر 8 سنوات · الاقتصاد',
    'الاستيلاء على العتاد', '15% مما يخسره المهزوم · الجيش', 'مستوى أجهزة الاستخبارات', 'تقدير لكل دولة · الاستخبارات']),
};

const screenChecks = `
const { issues, qa, q, T, DATA, tab } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const B = (t) => q('.r-body[data-tab="' + t + '"]');
// the header: the version as screen 13's; the emblem the sources' document; the close back to the about tab
if (W(T(q('.sheet .r-name'))) !== 'المصادر' || W(T(q('.sheet .r-sub'))) !== 'الحقوق والرخص · الإصدار ' + DATA.ver) issues.push('the header is not the sources with screen 13\\'s version (' + DATA.ver + ')');
if (q('.sheet').getAttribute('aria-label') !== 'المصادر والحقوق') issues.push('a11y: the sheet is not read as screen 13\\'s row «المصادر والحقوق»');
if (!q('.sheet .s-emb use[href="#i-doc"]')) issues.push('the emblem is not the sources\\' document');
if (q('.sheet .r-x').getAttribute('aria-label') !== 'إغلاق، العودة إلى حول') issues.push('a11y: the close does not say it returns to the about tab');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal, [aria-modal="true"]')) issues.push('a dialog over the map (mapCentral)');
// the tabs in order
{ const t = qa('.sheet .r-tab').map((e) => W(T(e))).join('|'); if (t !== 'البيانات|الخرائط والصور|قيم تصميمية') issues.push('the tabs are not data, maps and images, design values: ' + t); }
// offline (L10): nothing opens the web
if (document.querySelector('.sheet a[href^="http"], .sheet [href^="http"]:not(use)')) issues.push('a web link in the sources (the game is offline)');
// every source: its name, then what it feeds · its licence; the licence §4's for that source
const rows = (t) => [...B(t).querySelectorAll('.c-src')].map((r) => ({ r, n: W(T(r.querySelector('.r-at b'))), s: W(T(r.querySelector('.r-at > span'))) }));
Object.entries(DATA.src).forEach(([t, list]) => { const R = rows(t);
  list.forEach(([n, , l]) => { const r = R.find((x) => x.n === n); if (!r) { issues.push('source missing: ' + n); return; }
    const parts = r.s.split(' · '); if (parts.length !== 2 || !parts[0] || parts[1] !== l) issues.push('source «' + n + '» does not say what it feeds and its licence (' + l + '): ' + r.s); }); });
{ const n = rows('data').length; if (n !== DATA.src.data.length) issues.push('the data tab lists ' + n + ' sources, not the ' + DATA.src.data.length + ' of §4 here'); }
// NASA: the credit (Earth Observatory, Reto Stöckli) and the no-endorsement line, in the maps tab
{ const r = rows('maps').find((x) => x.n === 'NASA Blue Marble'); if (!r || !/مرصد الأرض في ناسا/.test(r.s) || !/Reto Stöckli/.test(r.s)) issues.push('NASA\\'s imagery credit (Earth Observatory, Reto Stöckli) missing');
  const notes = [...B('maps').querySelectorAll('.s-note')].map((e) => W(T(e)));
  if (!notes.includes('استخدام صور ناسا لا يعني أن ناسا تؤيد اللعبة.')) issues.push('NASA\\'s no-endorsement line missing');
  if (!notes.includes('الأعلام لتعريف الدول داخل اللعبة فقط.')) issues.push('the flags are not said to identify countries only'); }
// the game's images: made for this game, each with its record (§4.1's registry)
{ const r = rows('maps').find((x) => x.n === 'صور اللعبة'); if (!r || r.s !== 'صُنعت لهذه اللعبة · سجل لكل صورة') issues.push('the game\\'s images are not credited with their registry'); }
// the design values (R5): said to be no data and outside the realism comparison; each with its value and its section
{ const n = W(T(B('values').querySelector('.s-note'))); if (!/حيث لا توجد بيانات/.test(n) || !/ليست واقعية/.test(n) || !/لا تدخل في مقارنة اللعبة بالتاريخ/.test(n)) issues.push('the design values are not said to be no data and outside the realism comparison (R5)');
  rows('values').forEach((x) => { const p = x.s.split(' · '); if (p.length !== 2 || !p[0] || !DATA.sections.includes(p[1])) issues.push('design value «' + x.n + '» without its value and its section: ' + x.s); });
  if (rows('values').length < 1) issues.push('no design value listed'); }
// sources are text, not controls (nothing to tap)
qa('.sheet .c-src').forEach((r) => { if (r.matches('.tap, [role="button"], button') || r.querySelector('.tap, button')) issues.push('a source row is a control'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'المزيد', tabs: ['data', 'maps', 'values'], longTab: 'data', fitTab: 'values',
  inputs: ['_build/credits.css', '../../../design_doc/final_design.md', '../../screen13/A/_build/sheet.html'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [], size: [] },
  HEAD, BRIEF, screenChecks, DATA: { src: SRC, ver: VER, sections: ['الاقتصاد', 'الجيش', 'الاستخبارات', 'الدولة', 'الخارجية', 'البحث', 'الداخلية والسياسة'] },
  // the sheet has no headline numbers, status table, «لماذا؟», chip or arrowed value, and its section colour is the
  // «المزيد» grey: those generic plants move to this sheet's own targets below or do not apply
  skipGeneric: ['section colour on data', 'section colour on a rule', 'closed dock item coloured', 'brief text hidden', '18 pt misuse', 'gap', 'text overlap', 'clipped text', 'faint text', 'why without its subject', 'amber value without its icon', 'chip arrow against its sign', '% before its number', 'text into a control', 'emblem drawn grey', 'chip not white', 'tile icons cyan', 'row read in part' /* no tiles, no read-whole rows: the sources are plain list text */],
  cases: (d, se) => [
    ['brief text hidden (data)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-body[data-tab="data"] .c-src .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (data)', d, '', '.c-src .r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['text overlap (data)', d, '', '.r-body[data-tab="data"] .c-src .r-at > span { transform: translateY(-14px) !important; }', /text overlap|icon over text|hit overlap/],
    ['clipped text (data)', d, '', '.r-body[data-tab="data"] .r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding|a cell runs out/],
    ['faint text (data)', d, '', '.c-src .r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['gap (data)', d, '', '.r-body[data-tab="data"] { gap: 6px !important; }', /gap 6 on/],
    ['% before its number (values)', d, '&tab=values', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="values"] .s-note').textContent = 'نسبة 20%'; }],
    ['text into a control (header)', d, '', '.r-sub { position: relative; left: -170px; }', /text over a control/],
    ['header off', d, '', '', /the header is not the sources with screen 13's version/, () => { document.querySelector('.r-sub .ltr').textContent = '2.0'; }],
    ['sheet read short', d, '', '', /a11y: the sheet is not read as screen 13's row/, () => { document.querySelector('.sheet').setAttribute('aria-label', 'المصادر'); }],
    ['emblem off', d, '', '', /the emblem is not the sources' document/, () => { document.querySelector('.s-emb use').setAttribute('href', '#i-more'); }],
    ['close unclear', d, '', '', /a11y: the close does not say it returns to the about tab/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['sheet modal', d, '', '', /a dialog over the map/, () => { document.querySelector('.sheet').setAttribute('aria-modal', 'true'); }],
    ['tabs reordered', d, '', '', /the tabs are not data, maps and images, design values/, () => { const n = document.querySelector('.r-tabs'); n.appendChild(n.firstElementChild); }],
    ['web link', d, '', '', /a web link in the sources/, () => { const a = document.createElement('a'); a.href = 'https://example.org'; a.textContent = 'الموقع'; document.querySelector('.r-body[data-tab="data"] .s-note').appendChild(a); }],
    ['source missing', d, '', '', /source missing: Kummu 2018|the data tab lists 10 sources/, () => { [...document.querySelectorAll('.r-body[data-tab="data"] .c-src')].find((r) => r.textContent.includes('Kummu')).remove(); }],
    ['licence wrong', d, '', '', /source «البنك الدولي: مؤشرات التنمية» does not say what it feeds and its licence/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('البنك الدولي')).querySelector('.r-at > span .ltr').textContent = 'CC BY-SA 4.0'; }],
    ['use unsaid', d, '', '', /source «UCDP\/PRIO · جامعة أوبسالا» does not say what it feeds/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('UCDP')).querySelector('.r-at > span').innerHTML = '<span class="ltr">CC BY 4.0</span>'; }],
    ['NASA uncredited', d, '&tab=maps', '', /NASA's imagery credit/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('NASA')).querySelector('.r-at > span').textContent = 'صورة الأرض'; }],
    ['NASA endorsement line gone', d, '&tab=maps', '', /NASA's no-endorsement line missing/, () => { [...document.querySelectorAll('.r-body[data-tab="maps"] .s-note')][0].remove(); }],
    ['flags for anything', d, '&tab=maps', '', /the flags are not said to identify countries only/, () => { [...document.querySelectorAll('.r-body[data-tab="maps"] .s-note')][1].textContent = 'الأعلام من مكتبة مفتوحة.'; }],
    ['images uncredited', d, '&tab=maps', '', /the game's images are not credited with their registry/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('صور اللعبة')).querySelector('.r-at > span').textContent = 'صور'; }],
    ['design values claimed real', d, '&tab=values', '', /the design values are not said to be no data/, () => { document.querySelector('.r-body[data-tab="values"] .s-note').textContent = 'قيم من دراسات منشورة.'; }],
    ['design value without section', d, '&tab=values', '', /design value «الاستيلاء على العتاد» without its value and its section/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('العتاد')).querySelector('.r-at > span').textContent = '15% مما يخسره المهزوم'; }],
    ['source a control', d, '', '', /a source row is a control/, () => { document.querySelector('.c-src').classList.add('tap'); }],
  ],
});
