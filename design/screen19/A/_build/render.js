// Screen 19 variant A (the map-mode chooser, §6.6): render the iPhones and run the checks with the shared panel checker
// (design/shared/check/panelcheck.js). This file adds the chooser's own rules: the 13 modes of §6.6 in order, exactly one
// chosen («الأمن»), filled white, and the header, the HUD button and its VoiceOver all naming it; the mode drawn on the
// map: its layer between the satellite base and the borders, fill-opacity in 0.35-0.55, only the legend's colours, a
// palette whose lightness only rises (colour-blind safe); the legend: its five bands in the layer's colours, right to
// left, the edges 0 25 40 60 75 100 (§5.2's thresholds), read whole; the display options of §6.6, one choice each.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

const MODES = ['سياسية', 'العلاقات', 'التكتلات', 'الاقتصاد', 'الأسواق', 'الأمن', 'الأحزاب', 'عسكرية', 'الاستخبارات', 'البنية التحتية', 'الموارد', 'السكان', 'مخاطر المناخ'];
const CHOSEN = 'الأمن';
const EDGES = [0, 25, 40, 60, 75, 100];
// the layer as drawn: its fill-opacity and its colours, read from the file (made by tools/mapmode.py)
const LAYER_SVG = fs.readFileSync(path.join(OUT, 'map_mode_security.svg'), 'utf8');
const LAYER = (() => { const s = LAYER_SVG;
  const op = [...s.matchAll(/fill-opacity="([\d.]+)"/g)].map((m) => +m[1]), cols = [...new Set([...s.matchAll(/fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase()))];
  return { op, cols }; })();
const BANDS = ['#320A5E', '#781C6D', '#BC3754', '#ED6925', '#FBB61A'];
const lum = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]; };
// the borders overlay of a mode: the approved one without the player's teal fill (the glow stays)
const OV = fs.readFileSync(path.join(OUT, 'map_overlay_mode.svg'), 'utf8'), OV0 = fs.readFileSync(path.join(OUT, 'map_overlay_cairo.svg'), 'utf8');
// the layer against its values (tools/mapmode.py writes both) and against screen 8's governorates
const VAL = JSON.parse(fs.readFileSync(path.join(OUT, 'map_mode_security.json'), 'utf8'));
const S8 = (() => { const m = fs.readFileSync(path.join(OUT, '../../screen8/A/_build/render.js'), 'utf8').match(/const PROV = (\[.*?\]);/); if (!m) throw new Error('cannot read screen 8'); return Object.fromEntries(JSON.parse(m[1].replace(/'/g, '"')).map(([n, v]) => [n, +v])); })();
const NE_AR = { 'Al Qahirah': 'القاهرة', 'As Suways': 'السويس', 'Al Iskandariyah': 'الإسكندرية', 'Al Gharbiyah': 'الغربية', 'Al Jizah': 'الجيزة', 'Bur Sa`id': 'بورسعيد', 'Al Isma`iliyah': 'الإسماعيلية', "Shamal Sina'": 'شمال سيناء' };
const bandOf = (v) => VAL.bands.find(([e]) => v < e)[1];
const FILLS = [...LAYER_SVG.matchAll(/<path [^>]*fill="(#[0-9A-Fa-f]{6})"/g)].map((m) => m[1].toUpperCase());
const VAL_ISSUES = [].concat(
  FILLS.join(',') !== VAL.provinces.map((p) => p[3].toUpperCase()).join(',') ? ['the layer is not the drawing of its values file (regenerate with tools/mapmode.py)'] : [],
  VAL.provinces.filter((p) => bandOf(p[2]) !== p[3]).map((p) => `${p[1]}: value ${p[2]} drawn ${p[3]}, its band ${bandOf(p[2])}`),
  Object.entries(NE_AR).filter(([ne, ar]) => { const r = VAL.provinces.find((p) => p[0] === 'EGY' && p[1] === ne); return !r || r[2] !== S8[ar]; }).map(([ne, ar]) => `${ar}: the layer's value is not screen 8's ${S8[ar]}`),
  VAL.provinces.filter((p) => p[0] === 'EGY' && !NE_AR[p[1]] && (p[2] < 32 || p[2] > 48)).map((p) => `${p[1]}: ${p[2]} is outside screen 8's 32-48`));
const LAYER_ISSUES = [].concat(VAL_ISSUES,
  /fill="#3FE0D0"/i.test(OV) ? ['the mode overlay still tints the player\'s country'] : [],
  OV0.replace(/<path [^>]*fill="#3FE0D0" fill-opacity="0.16"\/>/, '') !== OV ? ['the mode overlay is not the approved overlay less the teal fill'] : [],
  LAYER.op.length !== 1 || LAYER.op[0] < 0.35 || LAYER.op[0] > 0.55 ? [`the layer's fill-opacity ${LAYER.op.join(',')} is not one value in 0.35-0.55`] : [],
  LAYER.cols.filter((c) => !BANDS.includes(c)).map((c) => `the layer uses a colour not in the legend: ${c}`),
  BANDS.some((c, i) => i && lum(c) <= lum(BANDS[i - 1])) ? ['the bands\' lightness does not only rise (not colour-blind safe)'] : []);
const HEAD = ['الخريطة', 'أوضاع الخريطة · المعروض: الأمن'];
const BRIEF = {
  modes: HEAD.concat(['الأمن: الاضطرابات في كل محافظة', 'من 40: احتجاجات · من 60: احتجاجات واسعة · من 75: تمرد']),
  reach_modes: ['الوضع', 'العرض', 'الحدود', 'حدود المحافظات', 'الأسماء', 'فعلية', 'قانونية', 'تظهر', 'تختفي', 'قليلة', 'متوسطة', 'كثيرة'].concat(MODES),
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
DATA.layerIssues.forEach((i) => issues.push(i));
// the 13 modes in order; exactly one chosen, filled white; named in the header and the HUD
const tiles = [...document.querySelectorAll('.sheet .m-tile')], on = tiles.filter((t) => t.getAttribute('aria-checked') === 'true');
if (tiles.map((t) => W(T(t))).join('|') !== DATA.modes.join('|')) issues.push('the modes are not the 13 of §6.6 in order');
if (on.length !== 1 || W(T(on[0])) !== DATA.chosen || !on[0].classList.contains('on') || tiles.some((t) => t.classList.contains('on') !== (t === on[0]))) issues.push('not exactly one mode chosen («' + DATA.chosen + '»), marked and drawn');
else if (getComputedStyle(on[0]).backgroundColor !== X.TOK.t1) issues.push('the chosen mode is not filled white');
if (q('.sheet .m-grid').getAttribute('role') !== 'radiogroup' || tiles.some((t) => t.getAttribute('role') !== 'radio')) issues.push('a11y: the modes are not a radio group');
if (W(T(q('.r-sub'))) !== 'أوضاع الخريطة · المعروض: ' + DATA.chosen) issues.push('the header does not name the mode shown');
{ const b = q('.btn.mode'); if (W(T(b)) !== 'الخريطة: ' + DATA.chosen || b.getAttribute('aria-label') !== 'الخريطة: ' + DATA.chosen || b.getAttribute('aria-expanded') !== 'true') issues.push('the HUD mode button does not read the mode and show the chooser open'); }
// the layer on the map: between the satellite base and the borders, shown
{ const im = [...document.querySelectorAll('.map img')].map((i) => i.getAttribute('src'));
  if (!(im.length === 3 && /map_mena_d1\\.jpg$/.test(im[0]) && im[1] === 'map_mode_security.svg' && im[2] === 'map_overlay_mode.svg')) issues.push('the mode layer is not between the base and the borders: ' + im.join(', '));
  const ml = q('.map img.mode-layer'); if (!ml || !ml.complete || !ml.naturalWidth || getComputedStyle(ml).display === 'none' || parseFloat(getComputedStyle(ml).opacity) < 0.99) issues.push('the mode layer is not drawn'); }
// the legend: the layer's bands right to left, the edges, read whole
{ const cells = [...document.querySelectorAll('.sheet .m-bar i')], cols = cells.map((c) => getComputedStyle(c).backgroundColor);
  const hex = (s) => '#' + s.match(/\\d+/g).slice(0, 3).map((v) => (+v).toString(16).padStart(2, '0')).join('').toUpperCase();
  if (cols.map(hex).join(',') !== DATA.bands.join(',')) issues.push('the legend\\'s colours are not the layer\\'s bands: ' + cols.map(hex).join(','));
  if (cells.some((c, i) => i && !(c.getBoundingClientRect().right <= cells[i - 1].getBoundingClientRect().left + 0.5))) issues.push('the legend does not run right to left');
  const tk = [...document.querySelectorAll('.sheet .m-ticks span')]; if (tk.map((t) => +T(t)).join(',') !== DATA.edges.join(',') || tk.some((t, i) => i && !(t.getBoundingClientRect().right <= tk[i - 1].getBoundingClientRect().left + 0.5))) issues.push('the legend\\'s edges are not 0 25 40 60 75 100 right to left');
  // each inner edge centred on its band edge; 0 and 100 flush with the bar's ends
  tk.forEach((t, i) => { const r = t.getBoundingClientRect(), c = (r.left + r.right) / 2;
    if (i === 0 ? Math.abs(r.right - cells[0].getBoundingClientRect().right) > 0.6 : i === tk.length - 1 ? Math.abs(r.left - cells[cells.length - 1].getBoundingClientRect().left) > 0.6 : Math.abs(c - cells[i].getBoundingClientRect().right) > 1) issues.push('the legend edge «' + T(t) + '» is not on its band edge'); });
  const al = q('.sheet .m-key').getAttribute('aria-label') || ''; if (DATA.edges.some((e) => !new RegExp('(^|\\\\D)' + e + '(\\\\D|$)').test(al)) || !/من 60 إلى 75 احتجاجات واسعة/.test(al) || !/من 75 إلى 100 تمرد/.test(al) || !/من 40 إلى 60 احتجاجات/.test(al)) issues.push('a11y: the legend is not read whole'); }
// the display options: one choice each
qa('.sheet .s-pol .s-seg').forEach((g) => { const c = [...g.querySelectorAll('.s-sg')].filter((s) => s.getAttribute('aria-checked') === 'true'); if (c.length !== 1 || !c[0].classList.contains('on')) issues.push('display option «' + g.getAttribute('aria-label') + '» has not exactly one choice'); });
if (qa('.sheet .s-pol').length !== 3) issues.push('the display options are not the three of §6.6');
qa('.sheet .s-pol').forEach((r, i) => { const o = DATA.options[i]; if (!o) return; const sg = [...r.querySelectorAll('.s-sg')], on = sg.find((s) => s.getAttribute('aria-checked') === 'true');
  if (W(T(r.querySelector('.r-at b'))) !== o[0] || sg.map((s) => W(T(s))).join('|') !== o[1].join('|') || !on || W(T(on)) !== o[2]) issues.push('display option «' + o[0] + '» is not «' + o[1].join(' | ') + '» with «' + o[2] + '» chosen'); });
// the tiles' icons: grey, dark on the chosen one
tiles.forEach((t) => { const c = getComputedStyle(t.querySelector('svg')).color; if (c !== (t.classList.contains('on') ? 'rgb(11, 18, 24)' : X.TOK.t2)) issues.push('a mode tile\\'s icon is not ' + (t.classList.contains('on') ? 'dark' : 'grey') + ': «' + W(T(t)) + '»'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['modes'], noTabs: true, fitTab: false, longTab: 'modes',
  inputs: ['_build/modes.css', 'map_mode_security.svg', 'map_mode_security.json', 'map_overlay_mode.svg', '../../../tools/mapmode.py', '../../screen8/A/_build/render.js'],
  TOK: { sec: 'rgb(239, 179, 195)', ctlH: { '.m-tile': 36 }, sheetIcon: [['.m-tile svg', 16]], size: [['.m-bar', null, 8]], radius: { '.m-tile': 10 } },
  HEAD, BRIEF, screenChecks, DATA: { options: [['الحدود', ['فعلية', 'قانونية'], 'فعلية'], ['حدود المحافظات', ['تظهر', 'تختفي'], 'تظهر'], ['الأسماء', ['قليلة', 'متوسطة', 'كثيرة'], 'متوسطة']], modes: MODES, chosen: CHOSEN, edges: EDGES, bands: BANDS, layerIssues: LAYER_ISSUES },
  skipGeneric: ['section colour on data', 'section colour on a rule', 'emblem drawn grey', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white', 'tile icons cyan'],
  cases: (d, se) => [
    ['brief text hidden (modes)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-name').style.opacity = '0'; }],
    ['18 pt misuse (modes)', d, '', '.r-sec h3 { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (modes)', d, '', '.r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding/],
    ['gap (modes)', d, '', '.m-grid { gap: 6px !important; }', /gap 6 on/],
    ['faint text (modes)', d, '', '.m-ticks { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (modes)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-sec h3').textContent = 'نسبة 20%'; }],
    ['text into a control (modes)', d, '', '.s-pol .r-at { transform: translateX(-120px) !important; }', /text over a control|text overlap|order must be \.r-at, \.s-seg/],
    ['tile icons cyan (modes)', d, '', '.m-tile svg.i { color: rgb(127, 233, 255) !important; }', /a mode tile's icon is not/],
    ['an option renamed', d, '', '', /display option «حدود المحافظات» is not/, () => { document.querySelectorAll('.s-pol')[1].querySelectorAll('.s-sg')[1].textContent = 'تظهر'; }],
    ['two modes chosen', d, '', '', /not exactly one mode chosen/, () => { const t = document.querySelector('.m-tile'); t.classList.add('on'); t.setAttribute('aria-checked', 'true'); }],
    ['chosen not white', d, '', '.m-tile.on { background: var(--card) !important; }', /the chosen mode is not filled white/],
    ['a mode lost', d, '', '', /the modes are not the 13/, () => { document.querySelectorAll('.m-tile')[12].remove(); }],
    ['modes not radios', d, '', '', /a11y: the modes are not a radio group/, () => { document.querySelector('.m-grid').removeAttribute('role'); }],
    ['header off', d, '', '', /the header does not name the mode shown/, () => { document.querySelector('.r-sub').lastChild.textContent = 'المعروض: سياسية'; }],
    ['HUD button stale', d, '', '', /the HUD mode button does not read the mode/, () => { document.querySelector('.btn.mode .m-lbl').lastChild.textContent = ' سياسية'; }],
    ['layer over the borders', d, '', '', /the mode layer is not between the base and the borders/, () => { const m = document.querySelector('.map'); m.appendChild(m.querySelector('img.mode-layer')); }],
    ['layer hidden', d, '', '.map img.mode-layer { display: none !important; }', /the mode layer is not drawn/],
    ['legend recoloured', d, '', '', /the legend's colours are not the layer's bands/, () => { document.querySelectorAll('.m-bar i')[2].style.setProperty('--c', '#3FE0D0'); }],
    ['legend left to right', d, '', '.m-bar, .m-ticks { direction: ltr !important; }', /the legend does not run right to left|the legend's edges/],
    ['edges spaced evenly', d, '', '.m-ticks { display: flex !important; justify-content: space-between !important; } .m-ticks span { position: static !important; transform: none !important; }', /the legend edge «\d+» is not on its band edge/],
    ['an edge off', d, '', '', /the legend's edges are not/, () => { document.querySelectorAll('.m-ticks span')[2].textContent = '45'; }],
    ['legend unsaid', d, '', '', /a11y: the legend is not read whole/, () => { document.querySelector('.m-key').setAttribute('aria-label', 'المفتاح'); }],
    ['an option with two choices', d, '', '', /has not exactly one choice/, () => { const s = document.querySelectorAll('.s-pol .s-sg')[1]; s.classList.add('on'); s.setAttribute('aria-checked', 'true'); }],
  ],
});
