// Screen 29 variant A (sources and rights, «المصادر والحقوق»; §4.8, R5, §6.5): render the iPhones and run the checks with
// the shared panel checker (design/shared/check/panelcheck.js), in the «المزيد» section. This file adds the sheet's own
// rules: the header (the version as screen 13's about tab says it), read as screen 13's row, its emblem screen 13's row
// icon, its close; the tabs in order; every source in order with what it feeds and its licence, the licence the licence
// cell of its row in design_doc/final_design.md §4's table gives (never a pending one), and every §4 source whose licence
// asks for credit shown; NASA's credit and the flags' author and licence as CREDITS.md, NASA's no-endorsement line, the
// flags for identification only, the game's images; the design values (R5) said to be no measured data and outside the
// game's realism, each with its value as the design doc records it and its section; nothing that opens the web (L10);
// rows text, not controls; no dialog over the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');
const DOC = rd('../../../design_doc/final_design.md'), CREDITS = rd('../../../CREDITS.md');
// §4's sources table (the 2011 scenario): [use, source, licence, ships as] per row
const TABLE = (() => { const a = DOC.indexOf('**2011 scenario:**'), lines = DOC.slice(a).split('\n').slice(2); const out = [];
  for (const l of lines) { if (!l.startsWith('|')) { if (out.length) break; continue; } if (/^\|[-| ]+\|$/.test(l) || l.startsWith('| Use |')) continue;
    out.push(l.split('|').slice(1, -1).map((c) => c.trim())); } return out; })();
const PENDING = /pending|unknown/i;
// each source on the sheet: [tab, name, the §4 row's source cell key, feeds, licence shown, the licence it must be in that row's licence cell]
const SRC = [
  ['data', 'الأمم المتحدة: التوقعات السكانية في العالم 2024', 'UN WPP 2024', 'السكان والأعمار والتوقعات', 'CC BY 3.0 IGO', /CC BY 3\.0 IGO/],
  ['data', 'البنك الدولي: مؤشرات التنمية العالمية', 'World Bank WDI', 'الناتج والأسعار والقطاعات', 'CC BY 4.0', /CC BY 4\.0/],
  ['data', 'البنك الدولي: إحصاءات الديون الدولية', 'World Bank IDS', 'الدين الخارجي', 'CC BY 4.0', /CC BY 4\.0/],
  ['data', 'الأمم المتحدة: الحسابات القومية', 'UNSD National Accounts', 'ناتج كوريا الشمالية', 'شروط UNdata', /UNdata terms/],
  ['data', 'كتاب حقائق العالم 2011 · CIA', 'CIA World Factbook 2011', 'المالية العامة والديون والشركاء', 'ملكية عامة', /^Public domain$/],
  ['data', 'GHS-POP · المفوضية الأوروبية', 'GHS-POP R2023A', 'سكان المحافظات', 'CC BY 4.0', /CC BY 4\.0/],
  ['data', 'الناتج المحلي الشبكي · Kummu 2018', 'Kummu 2018 gridded GDP', 'ناتج المحافظات', 'CC0', /\bCC0\b/],
  ['data', 'منظمة العمل الدولية: ILOSTAT', 'ILOSTAT labour force', 'مستويات المهارة', 'CC BY 4.0', /CC BY 4\.0/],
  ['data', 'Penn World Table', 'Penn World Table 10.x', 'سد فجوات الناتج', 'CC BY 4.0', /CC BY 4\.0/],
  ['data', 'UCDP/PRIO · جامعة أوبسالا ومعهد أوسلو لأبحاث السلام', 'UCDP/PRIO', 'الحروب والحركات المسلحة', 'CC BY 4.0', /CC BY 4\.0/],
  ['data', 'WMEAT · الخارجية الأمريكية', '**WMEAT 2013 and 2015**', 'الإنفاق العسكري والأفراد والعتاد', 'ملكية عامة', /^Public domain$/],
  ['data', 'ويكي بيانات', 'Wikidata snapshot', 'الأحزاب والانتخابات والقادة', 'CC0', /\bCC0\b/],
  ['data', 'DeltaDTM · Pronk 2024', '**DeltaDTM**', 'السواحل المنخفضة', 'CC BY 4.0', /CC BY 4\.0/],
  ['data', 'Global Carbon Budget', 'Global Carbon Budget', 'الانبعاثات', 'CC BY 4.0', /CC BY 4\.0/],
  ['data', 'بيانات التقرير السادس · IPCC', 'IPCC AR6 WGI data', 'معايرة المناخ', 'CC BY 4.0', /CC BY 4\.0/],
  ['maps', 'NASA Blue Marble', '**NASA Blue Marble NG', 'صورة الأرض بتضاريسها وأعماقها', 'مرصد الأرض في ناسا، Reto Stöckli', /NASA imagery terms \(credit NASA Earth Observatory \/ Reto Stöckli/],
  ['maps', 'Natural Earth', 'Natural Earth 10m', 'الحدود والمدن', 'ملكية عامة', /^Public domain$/],
  ['maps', 'geoBoundaries', 'geoBoundaries', 'حدود المحافظات التفصيلية', 'CC BY 4.0 / CC BY 3.0 IGO', /CC BY 3\.0 IGO \/ CC BY 4\.0/],
  ['maps', 'GMTED2010 · هيئة المساحة الأمريكية', 'GMTED2010 (USGS)', 'أنواع التضاريس', 'ملكية عامة', /^Public domain$/],
  ['maps', 'GeoNames', 'GeoNames', 'الأسماء العربية', 'CC BY 4.0', /CC BY 4\.0/],
  ['maps', 'Unicode CLDR', 'CLDR', 'الأسماء العربية', 'رخصة Unicode', /Unicode-3\.0/],
  ['maps', 'flag-icons · Panayiotis Lipiridis', 'flag-icons plus own redraws', 'الأعلام', 'MIT', /\bMIT\b/],
];
const rowOf = (key) => { const r = TABLE.filter((c) => c[1].includes(key)); if (r.length !== 1) throw new Error(`§4: ${r.length} rows for ${key}`); return r[0]; };
SRC.forEach(([, n, k, , , re]) => { const lic = rowOf(k)[2]; if (!re.test(lic)) throw new Error(`§4 does not give ${n} that licence: ${lic}`);
  if (PENDING.test(lic)) throw new Error(`§4 says ${n}'s licence is pending: ${lic}`); });
// every §4 source whose licence asks for credit (CC BY, UNdata, Unicode, MIT, NASA's terms), not pending, is on the sheet
const CREDIT = /CC BY|UNdata|Unicode|\bMIT\b|NASA imagery terms/;
const UNSHOWN = TABLE.filter((r) => CREDIT.test(r[2]) && !/^(\*\*)?Pending|^Pending \//i.test(r[2]) && !SRC.some(([, , k]) => r[1].includes(k))).map((r) => r[1]);
// CREDITS.md: NASA's credit and the flags' author and licence
if (!/Credit: NASA Earth Observatory \/ Reto Stöckli/.test(CREDITS) || !/does not imply NASA endorsement/.test(CREDITS)) throw new Error('CREDITS.md: NASA\'s credit or no-endorsement terms not found');
if (!/flag-icons\*\* v[\d.]+ by Panayiotis Lipiridis, MIT licence/.test(CREDITS)) throw new Error('CREDITS.md: the flags\' author and licence not found');
// screen 13: the version, its row's name and icon
const S13 = rd('../../screen13/A/_build/sheet.html'), A13 = rd('../../screen13/A/_build/assemble.py');
const VER = (() => { const m = S13.match(/صانع التاريخ · الإصدار <span class="ltr">([\d.]+)<\/span>/); if (!m) throw new Error('cannot read the version from screen 13'); return m[1]; })();
const ROW13 = (() => { const m = S13.match(/aria-label="(المصادر والحقوق): [^"]*">\s*<span class="r-tile"><svg class="i"><use href="#(i-[a-z]+)"\/>/); if (!m) throw new Error('cannot read screen 13\'s sources row'); return { name: m[1], icon: m[2] }; })();
const ICON13 = (() => { const m = A13.match(new RegExp('<symbol id="' + ROW13.icon + '" viewBox="0 0 24 24">(.*?)</symbol>')); if (!m) throw new Error('cannot read screen 13\'s row icon'); return m[1]; })();
// the design values (R5), each with its value as the design doc records it
const HALF = (() => { const m = DOC.match(/decays toward 0 with a half-life of (\d+) years \(`design-target`\)/); if (!m) throw new Error('§5.2: the unrest offset\'s half-life not found'); return m[1]; })();
const CAPT = (() => { const m = DOC.match(/capture rate: (\d+)% of the equipment the loser loses \(`design-target`/); if (!m) throw new Error('§5.4: the capture rate not found'); return m[1]; })();
if (!/Agency levels \(`design-target`/.test(DOC)) throw new Error('§4.3: the agency levels are not design-target');
const VALUES = [['تلاشي فرق الاضطراب الأولي', 'نصف عمر ' + HALF + ' سنوات', 'الداخلية والسياسة'], ['الاستيلاء على العتاد', CAPT + '% مما يخسره المهزوم', 'الجيش'], ['مستوى أجهزة الاستخبارات', 'يُضبط لكل دولة', 'الاستخبارات'], ['معدل نقاط البحث', 'يتناقص مع الإنفاق: 18 × جذر الإنفاق ÷ إنفاق مصر 2011', 'البحث']];
const NOTES = { data: 'أهم مصادر أرقام البداية ومعايرة النماذج، ثم تتغير بقراراتك.', nasa: 'استخدام صور ناسا لا يعني أن ناسا تؤيد اللعبة.', flags: 'الأعلام لتعريف الدول داخل اللعبة فقط.',
  values: 'قيم ضبطناها للعب حيث لا توجد بيانات تُقاس بها، فلا نعدّها جزءًا من واقعية اللعبة.' };
const IMAGES = ['صور اللعبة', 'صُنعت خصيصًا لهذه اللعبة'];
const HEAD = ['المصادر', 'الحقوق والرخص · الإصدار ' + VER, 'البيانات', 'الخرائط والصور', 'قيم تصميمية'];
const sub = (x) => x[3] + ' · ' + x[4];
const BRIEF = {
  data: HEAD.concat([NOTES.data, 'السكان والاقتصاد', SRC[0][1], sub(SRC[0])]),
  reach_data: SRC.filter((x) => x[0] === 'data').flatMap((x) => [x[1], sub(x)]).concat(['الأمن والسياسة', 'الأرض والمناخ']),
  maps: HEAD.concat(['الخرائط والأسماء', 'NASA Blue Marble', sub(SRC.find((x) => x[1] === 'NASA Blue Marble'))]),
  reach_maps: SRC.filter((x) => x[0] === 'maps').flatMap((x) => [x[1], sub(x)]).concat([NOTES.nasa, 'الأعلام والصور', NOTES.flags], IMAGES),
  values: HEAD.concat([NOTES.values]).concat(VALUES.flatMap((v) => [v[0], v[1] + ' · ' + v[2]])),
};

const screenChecks = `
const { issues, qa, q, T, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const B = (t) => q('.r-body[data-tab="' + t + '"]');
// the header: the version as screen 13's; read as screen 13's row; the emblem its row's icon; the close back to the about tab
if (W(T(q('.sheet .r-name'))) !== 'المصادر' || W(T(q('.sheet .r-sub'))) !== 'الحقوق والرخص · الإصدار ' + DATA.ver) issues.push('the header is not the sources with screen 13\\'s version (' + DATA.ver + ')');
if (q('.sheet').getAttribute('aria-label') !== DATA.row13.name) issues.push('a11y: the sheet is not read as screen 13\\'s row «' + DATA.row13.name + '»');
{ const u = q('.sheet .s-emb use'), sym = u && document.querySelector(u.getAttribute('href')), ref = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); ref.innerHTML = DATA.icon13;
  if (!u || u.getAttribute('href') !== '#' + DATA.row13.icon || !sym || sym.innerHTML.replace(/\\s+/g, '') !== ref.innerHTML.replace(/\\s+/g, '')) issues.push('the emblem is not the sources\\' document (screen 13\\'s row icon)'); }
if (q('.sheet .r-x').getAttribute('aria-label') !== 'إغلاق، العودة إلى حول') issues.push('a11y: the close does not say it returns to the about tab');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal, [aria-modal="true"]')) issues.push('a dialog over the map (mapCentral)');
{ const t = qa('.sheet .r-tab').map((e) => W(T(e))).join('|'); if (t !== 'البيانات|الخرائط والصور|قيم تصميمية') issues.push('the tabs are not data, maps and images, design values: ' + t); }
if (document.querySelector('.sheet a[href^="http"], .sheet [href^="http"]:not(use)')) issues.push('a web link in the sources (the game is offline)');
// every source in order: its name, then what it feeds · its licence (§4's, checked when this file loads)
const rows = (t) => [...B(t).querySelectorAll('.c-src')].map((r) => ({ r, n: W(T(r.querySelector('.r-at b'))), s: W(T(r.querySelector('.r-at > span'))) }));
['data', 'maps'].forEach((t) => { const want = DATA.src.filter((x) => x[0] === t), R = rows(t).filter((x) => x.n !== DATA.images[0]);
  if (R.length !== want.length) issues.push('the ' + t + ' tab lists ' + R.length + ' sources, not the ' + want.length + ' of §4 here');
  want.forEach((x, i) => { const r = R.find((y) => y.n === x[1]); if (!r) { issues.push('source missing: ' + x[1]); return; }
    if (r.s !== x[3] + ' · ' + x[4]) issues.push('source «' + x[1] + '» does not say what it feeds and its licence (' + x[4] + '): ' + r.s);
    if (R.indexOf(r) !== i) issues.push('source «' + x[1] + '» out of order'); }); });
// every §4 source whose licence asks for credit is shown
DATA.unshown.forEach((n) => issues.push('a §4 source whose licence asks for credit is not shown: ' + n));
// the notes: the data's scope, NASA's no-endorsement line, the flags for identification only
if (W(T(B('data').querySelector(':scope > .s-note'))) !== DATA.notes.data) issues.push('the data tab\\'s note is not the brief\\'s');
{ const n = [...B('maps').querySelectorAll('.s-note')].map((e) => W(T(e)));
  if (!n.includes(DATA.notes.nasa)) issues.push('NASA\\'s no-endorsement line missing');
  if (!n.includes(DATA.notes.flags)) issues.push('the flags are not said to identify countries only'); }
// the game's images: made for this game
{ const r = rows('maps').find((x) => x.n === DATA.images[0]); if (!r || r.s !== DATA.images[1]) issues.push('the game\\'s images are not credited as made for this game'); }
// the design values (R5): said to be no measured data, outside the game's realism; each its value (the design doc's) · its section
{ const n = W(T(B('values').querySelector('.s-note'))); if (n !== DATA.notes.values) issues.push('the design values are not said to be no measured data and outside the game\\'s realism (R5)');
  const R = rows('values'); if (R.length !== DATA.values.length) issues.push('the values tab lists ' + R.length + ' values, not ' + DATA.values.length);
  DATA.values.forEach(([nm, v, sec]) => { const r = R.find((x) => x.n === nm); if (!r || r.s !== v + ' · ' + sec) issues.push('design value «' + nm + '» is not «' + v + ' · ' + sec + '» (the design doc\\'s value and its section): ' + (r ? r.s : 'missing')); }); }
// sources are text, not controls
qa('.sheet .c-src').forEach((r) => { if (r.matches('.tap, [role="button"], button') || r.querySelector('.tap, button')) issues.push('a source row is a control'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'المزيد', tabs: ['data', 'maps', 'values'], longTab: 'data', fitTab: false,
  inputs: ['_build/credits.css', '../../../design_doc/final_design.md', '../../../CREDITS.md', '../../screen13/A/_build/sheet.html', '../../screen13/A/_build/assemble.py'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [], size: [] },
  HEAD, BRIEF, screenChecks, DATA: { src: SRC.map((x) => x.slice(0, 5)), ver: VER, row13: ROW13, icon13: ICON13, unshown: UNSHOWN, values: VALUES, notes: NOTES, images: IMAGES },
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
    ['source missing', d, '', '', /source missing: الناتج المحلي الشبكي · Kummu 2018/, () => { [...document.querySelectorAll('.r-body[data-tab="data"] .c-src')].find((r) => r.textContent.includes('Kummu')).remove(); }],
    ['source added', d, '', '', /the data tab lists 16 sources, not the 15/, () => { const l = document.querySelector('.r-body[data-tab="data"] .c-list'); l.insertAdjacentHTML('beforeend', '<li class="c-src"><span class="r-at"><b>OECD ICIO</b><span>معاملات الصناعة · <span class="ltr">CC BY 4.0</span></span></span></li>'); }],
    ['map source added', d, '&tab=maps', '', /the maps tab lists 8 sources, not the 7/, () => { const l = document.querySelector('.r-body[data-tab="maps"] .c-list'); l.insertAdjacentHTML('beforeend', '<li class="c-src"><span class="r-at"><b>MODIS MCD12Q1</b><span>أنواع الأرض · <span class="ltr">CC BY 4.0</span></span></span></li>'); }],
    ['sources reordered', d, '', '', /out of order/, () => { const l = document.querySelector('.r-body[data-tab="data"] .c-list'); l.appendChild(l.firstElementChild); }],
    ['licence hidden', d, '', '', /brief text (not fully visible|cannot be scrolled clear of the fades): الناتج والأسعار والقطاعات · CC BY 4\.0/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('مؤشرات التنمية')).querySelector('.r-at > span').style.opacity = '0'; }],
    ['licence wrong', d, '', '', /source «البنك الدولي: مؤشرات التنمية العالمية» does not say what it feeds and its licence/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('مؤشرات التنمية')).querySelector('.r-at > span .ltr').textContent = 'CC BY-SA 4.0'; }],
    ['use unsaid', d, '', '', /source «UCDP\/PRIO · جامعة أوبسالا ومعهد أوسلو لأبحاث السلام» does not say what it feeds/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('UCDP')).querySelector('.r-at > span').innerHTML = '<span class="ltr">CC BY 4.0</span>'; }],
    ['NASA uncredited', d, '&tab=maps', '', /source «NASA Blue Marble» does not say what it feeds and its licence/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('NASA')).querySelector('.r-at > span').textContent = 'صورة الأرض بتضاريسها وأعماقها'; }],
    ['ETOPO back', d, '&tab=maps', '', /source missing: GMTED2010 · هيئة المساحة الأمريكية/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('GMTED')).querySelector('b').innerHTML = '<span class="ltr">GMTED2010</span> و<span class="ltr">ETOPO1</span>'; }],
    ['NASA endorsement line gone', d, '&tab=maps', '', /NASA's no-endorsement line missing/, () => { [...document.querySelectorAll('.r-body[data-tab="maps"] .s-note')][0].remove(); }],
    ['flags for anything', d, '&tab=maps', '', /the flags are not said to identify countries only/, () => { [...document.querySelectorAll('.r-body[data-tab="maps"] .s-note')][1].textContent = 'الأعلام من مكتبة مفتوحة.'; }],
    ['images uncredited', d, '&tab=maps', '', /the game's images are not credited as made for this game/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('صور اللعبة')).querySelector('.r-at > span').textContent = 'صور'; }],
    ['design values claimed real', d, '&tab=values', '', /the design values are not said to be no measured data/, () => { document.querySelector('.r-body[data-tab="values"] .s-note').textContent = 'قيم من دراسات منشورة.'; }],
    ['design value in the wrong section', d, '&tab=values', '', /design value «تلاشي فرق الاضطراب الأولي» is not «نصف عمر 8 سنوات · الداخلية والسياسة»/, () => { [...document.querySelectorAll('.c-src')].find((r) => r.textContent.includes('الاضطراب')).querySelector('.r-at > span').innerHTML = 'نصف عمر <span class="ltr">8</span> سنوات · الاقتصاد'; }],
    ['design value off the doc', d, '&tab=values', '', /design value «الاستيلاء على العتاد» is not «15% مما يخسره المهزوم · الجيش»/, () => { [...document.querySelectorAll('.r-body[data-tab="values"] .c-src')].find((r) => r.textContent.includes('العتاد')).querySelector('.r-at > span .ltr').textContent = '20%'; }],
    ['data note off', d, '', '', /the data tab's note is not the brief's/, () => { document.querySelector('.r-body[data-tab="data"] > .s-note').textContent = 'أرقام اللعبة كلها من هذه المصادر.'; }],
    ['source a control', d, '', '', /a source row is a control/, () => { document.querySelector('.c-src').classList.add('tap'); }],
  ],
});
