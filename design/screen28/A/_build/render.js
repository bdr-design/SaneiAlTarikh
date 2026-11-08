// Screen 28 variant A (the country info card: Sudan, 1 January 2011): render the iPhones and run the checks with the
// shared panel checker (design/shared/check/panelcheck.js), in the foreign section; the map's focus is Sudan's north
// (sudan.json). This file adds the card's own rules: the header (the flag, the name, the leader and regime); the three
// headline numbers in order, the country's population and output with their years, its stability an estimate (D-19)
// whose half-width follows our network (±(12 − network)), in %; the status cells (our relation as screen 10's, the 1959 Nile
// agreement as screen 10 has it, the Halaib dispute, our network as screens 11 and 22); the referendum note as screens 10
// and 16; the two links saying where they lead, the operation's line screen 22's; the country outlined on the map, whole
// as on 1 January 2011 (sudan.json, built by tools/sudan_outline.py); Sudan's name and Khartoum shown on the map; no red;
// no dialog over the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
const rd = (f) => fs.readFileSync(path.join(OUT, f), 'utf8');
const SD = JSON.parse(fs.readFileSync(path.join(__dirname, 'sudan.json'), 'utf8'));
const SRC = (() => {
  const s10 = rd('../../screen10/A/_build/sheet.html'), rel10 = s10.match(/aria-label="السودان: (سالب )?(\d+)،/), nile = s10.match(/aria-label="مياه النيل مع السودان، (\d{4}): حصة مصر/), ref10 = s10.match(/aria-label="السودان: استفتاء الجنوب في (\d+) (\S+) (\d{4})"/);
  const s22 = rd('../../screen22/A/_build/sheet.html'), net = s22.match(/<span class="r-at"><b>السودان<\/b><span>الشبكة <span class="ltr">(\d+)<\/span> من <span class="ltr">(\d+)<\/span> · (الانكشاف \S+)<\/span><\/span>/);
  const s11 = rd('../../screen11/A/_build/sheet.html'), net11 = s11.match(/aria-label="السودان: الشبكة (\d+) من (\d+)، (الانكشاف \S+)"/);
  const s16 = rd('../../screen16/A/_build/sheet.html'), ref16 = s16.match(/السودان: استفتاء الجنوب بعد <span class="ltr">\d+<\/span> أيام<\/b><span><span class="ltr">(\d+)<\/span> (\S+) <span class="ltr">(\d{4})<\/span>/);
  if (!rel10 || !nile || !ref10 || !net || !net11 || !ref16) throw new Error('cannot read Sudan from screens 10, 11, 16 and 22: ' + [!!rel10, !!nile, !!ref10, !!net, !!net11, !!ref16]);
  if (net11.slice(1).join(' ') !== net.slice(1).join(' ')) throw new Error('screens 11 and 22 disagree on the network in Sudan');
  if (ref10.slice(1).join(' ') !== ref16.slice(1).join(' ')) throw new Error('screens 10 and 16 disagree on the referendum');
  return { rel: (rel10[1] ? '−' : '+') + rel10[2], nile: nile[1], ref: ref16.slice(1).join(' '), net: +net[1], netOf: +net[2], exposure: net[3] }; })();
const HEAD = ['السودان', 'عمر البشير · جمهورية رئاسية'];
const BRIEF = {
  card: HEAD.concat(['السكان', 'الناتج', 'الاستقرار', '44', '65', '40%', 'إلى', '50%', 'تقدير', 'علاقتنا', '+18', 'المعاهدات', 'مياه النيل 1959', 'النزاع', 'حلايب', 'شبكتنا', '7 من 10',
    'استفتاء جنوب السودان في 9 يناير 2011.', 'العلاقة مع السودان']),
  reach_card: ['ما يحركها والإجراءات', 'عملية جديدة في السودان', 'الشبكة 7 من 10 · الانكشاف منخفض'],
};

const screenChecks = `
const { issues, qa, q, T, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const S = DATA.src, body = q('.r-body[data-tab="card"]');
// the header: the country's flag and name, its leader and regime
{ const f = q('.sheet .r-flag img'); if (!f || !(f.getAttribute('src') || '').endsWith('/sd.svg') || f.getAttribute('alt') !== 'علم السودان') issues.push('the header flag is not Sudan\\'s');
  if (W(T(q('.sheet .r-name'))) !== 'السودان' || W(T(q('.sheet .r-sub'))) !== 'عمر البشير · جمهورية رئاسية') issues.push('the header does not name the country, its leader and regime'); }
if (!q('.sheet .s-emb use[href="#i-globe"]')) issues.push('the emblem is not the foreign section\\'s');
if (q('.sheet .r-x').getAttribute('aria-label') !== 'إغلاق، العودة إلى الخريطة') issues.push('a11y: the close does not say where it returns');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal, [aria-modal="true"]')) issues.push('a dialog over the map (mapCentral)');
// the headline numbers: population and output (the country's, with their years), stability an estimate whose half-width
// follows our network: ±(12 − network)
const kp = [...body.querySelectorAll('.r-kpi')].map((k) => ({ e: k, l: W(T(k.querySelector('.r-kl'))), v: [...k.querySelector('.r-kv').children].map((c) => W(T(c))).join(' '), r: W(T(k.querySelector('.r-kr'))), a: k.getAttribute('aria-label') || '' }));
if (kp.map((k) => k.l).join('|') !== 'السكان|الناتج|الاستقرار') issues.push('the headline numbers are not population, output, stability: ' + kp.map((k) => k.l).join('، '));
else {
  if (kp[0].v !== '44 مليون' || kp[0].r !== '2011' || kp[0].a !== 'السكان: 44 مليون، 2011') issues.push('the population is not the country\\'s, with its year, read whole');
  if (kp[1].v !== '65 مليار $' || kp[1].r !== '2010' || kp[1].a !== 'الناتج: 65 مليار دولار، 2010') issues.push('the output is not the country\\'s, with its year, read whole');
  const m = kp[2].v.match(/^(\\d+)% إلى (\\d+)%$/), half = 12 - S.net;
  if (!m || kp[2].r !== 'تقدير' || !/، تقدير$/.test(kp[2].a)) issues.push('the stability is not an estimated range (D-19)');
  else { if (+m[2] - +m[1] !== 2 * half) issues.push('the stability range is ' + (+m[2] - +m[1]) + ' wide, not ±' + half + ' for a network of ' + S.net);
    if (kp[2].a !== 'الاستقرار: من ' + m[1] + '% إلى ' + m[2] + '%، تقدير') issues.push('a11y: the stability range is not read whole'); } }
// the status cells, agreeing with the approved screens
{ const sc = Object.fromEntries([...body.querySelectorAll('.r-sc')].map((c) => [W(T(c.querySelector('dt'))), W(T(c.querySelector('dd')))]));
  if (Object.keys(sc).join('|') !== 'علاقتنا|المعاهدات|النزاع|شبكتنا') issues.push('the status cells are not relation, treaties, dispute, network: ' + Object.keys(sc).join('، '));
  if (sc['علاقتنا'] !== S.rel) issues.push('our relation is not screen 10\\'s (' + S.rel + ')');
  if (sc['المعاهدات'] !== 'مياه النيل ' + S.nile) issues.push('the treaty is not screen 10\\'s Nile agreement of ' + S.nile);
  if (sc['النزاع'] !== 'حلايب') issues.push('the dispute is not Halaib');
  if (sc['شبكتنا'] !== S.net + ' من ' + S.netOf) issues.push('our network is not screens 11 and 22\\'s (' + S.net + ' من ' + S.netOf + ')'); }
// the note: the referendum as screens 10 and 16 date it
if (W(T(body.querySelector('.s-note'))) !== 'استفتاء جنوب السودان في ' + S.ref + '.') issues.push('the referendum note is not dated as screens 10 and 16 (' + S.ref + ')');
// the links: relation, then a new operation; each says where it leads; the operation's line screen 22's
{ const L = [...body.querySelectorAll('.r-link')], rel = (body.querySelector('.r-sc dd') || {}).textContent || '';
  if (L.map((e) => W(T(e.querySelector('.r-at b')))).join('|') !== 'العلاقة مع السودان|عملية جديدة في السودان') issues.push('the links are not the relation and a new operation');
  else { if (!/\\. يفتح العلاقة$/.test(L[0].getAttribute('aria-label') || '') || !(L[0].getAttribute('aria-label') || '').startsWith('العلاقة مع السودان: ' + (W(rel).startsWith('+') ? '' : 'سالب ') + W(rel).slice(1) + '،')) issues.push('a11y: the relation link does not say its value and where it leads');
    if (W(T(L[1].querySelector('.r-at > span'))) !== 'الشبكة ' + S.net + ' من ' + S.netOf + ' · ' + S.exposure || !/\\. يفتح العملية الجديدة$/.test(L[1].getAttribute('aria-label') || '')) issues.push('the operation link is not screen 22\\'s target line, or does not say where it leads'); } }
// the country outlined on the map: drawn, white, fully opaque (its ancestors too), the whole of Sudan on 1 January 2011
// (the south included: Renk inside the ring), on the map and its north in view (the shared
// checker keeps the north clear of the panels)
{ const p = q('.map svg.sel-country path'), cs = p && getComputedStyle(p);
  let op = 1; for (let e = p; e && e.nodeType === 1; e = e.parentElement) { const c = getComputedStyle(e); op *= parseFloat(c.opacity); if (c.display === 'none' || c.visibility === 'hidden') op = 0; }
  const bb = p && p.getBBox(), pr = p && p.getBoundingClientRect(), mr = q('.map').getBoundingClientRect(), N = DATA.north, kx = mr.width / 1688, ky = mr.height / 1097;
  const nb = [mr.left + N.x0 * kx, mr.top + N.y0 * ky, mr.left + N.x1 * kx, mr.top + N.y1 * ky];
  if (!p || cs.stroke !== 'rgb(255, 255, 255)' || parseFloat(cs.strokeWidth) < 1.9 || parseFloat(cs.strokeOpacity) < 1 || op < 0.99 || !bb.width || !bb.height
    || pr.left > nb[0] + 2 || pr.top > nb[1] + 2 || pr.right < nb[2] - 2 || pr.bottom < nb[1] + (nb[3] - nb[1]) * 0.5) issues.push('the tapped country is not outlined on the map');
  /* Renk (32.78° E, 11.75° N), in South Sudan's north: inside the whole country, outside Sudan as after 9 July 2011 */
  if (!p || !p.isPointInFill(new DOMPoint(822.7, 1044.1))) issues.push('the outline is not Sudan whole on 1 January 2011 (the south missing)'); }
// the map names the tapped country on its north, and Khartoum with its dot: shown (not cut) and not under a panel
{ const lab = [...document.querySelectorAll('.labels text')], sd = lab.find((t) => t.textContent === 'السودان'), kh = document.querySelector('.labels text[data-city="5"]'), kd = document.querySelector('.labels circle[data-city="5"]');
  const shown = (t) => { if (!t || !t.getClientRects().length || t.classList.contains('cut')) return false; const r = t.getBoundingClientRect(), el = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2);
    return !(el && el.closest('.sheet, .dock, .top, .glass')); };
  if (!shown(sd)) issues.push('Sudan\\'s name not shown on the map');
  if (!kh || kh.textContent !== 'الخرطوم' || !shown(kh) || !shown(kd)) issues.push('Khartoum not shown on the map');
  else { const a = kh.getBBox(), c = kd.getBBox(); if (a.x + a.width > c.x - 2) issues.push('Khartoum\\'s dot under its name (the name goes west of the dot)'); } }
// no red here
{ const isRed = (c) => { const m = (c || '').match(/rgba?\\((\\d+), (\\d+), (\\d+)/); if (!m) return false; const [r, g, b] = m.slice(1).map((v) => +v / 255);
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), sat = mx ? (mx - mn) / mx : 0; if (mx !== r || sat < 0.45 || mx < 0.25) return false; return Math.abs(60 * ((g - b) / (mx - mn))) <= 15; };
  qa('.sheet *').forEach((e) => { if (e.closest('.r-flag')) return; const cs = getComputedStyle(e);
    if ([cs.color, cs.backgroundColor, cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor, parseFloat(cs.outlineWidth) > 0 ? cs.outlineColor : '', cs.stroke, cs.fill]
      .concat(cs.boxShadow === 'none' ? [] : cs.boxShadow.match(/rgba?\\([^)]*\\)/g) || []).some(isRed)) issues.push('red in the card: ' + (e.className && e.className.baseVal === undefined ? e.className : e.tagName)); }); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'الخارجية', tabs: ['card'], noTabs: true, fitTab: false, longTab: 'card',
  inputs: ['_build/card.css', '_build/sudan.json', '../../shared/flags/sd.svg', '../../../tools/sudan_outline.py', '../../screen10/A/_build/sheet.html', '../../screen11/A/_build/sheet.html', '../../screen16/A/_build/sheet.html', '../../screen22/A/_build/sheet.html'],
  TOK: { sec: 'rgb(91, 134, 242)', ctlH: {}, sheetIcon: [], size: [], radius: {} },
  mapFocus: [[SD.north.x0, SD.north.y0, SD.north.x1, SD.north.y1, 'Sudan\'s north']],
  HEAD, BRIEF, screenChecks, DATA: { src: SRC, north: SD.north },
  skipGeneric: ['Egypt covered', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white', 'hint chevron missing (no tabs)', 'hint over the content (no tabs)'],
  cases: (d, se) => [
    ['brief text hidden (card)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-kpi .r-kv b').style.opacity = '0'; }],
    ['18 pt misuse (card)', d, '', '.r-sc dd { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (card)', d, '', '', /clipped text \(sides\)/, () => { const a = document.querySelector('.r-body[data-tab="card"] .r-link .r-at'); a.style.cssText = 'flex: none; width: 40px; overflow: hidden'; }],
    ['gap (card)', d, '', '.r-body[data-tab="card"] { gap: 6px !important; }', /gap 6 on/],
    ['faint text (card)', d, '', '.r-sc dd { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (card)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="card"] .s-note').textContent = 'نسبة 20%'; }],
    ['hint chevron missing', se, '', '.r-hint { display: none !important; }', /scroll hint chevron missing with content below/],
    ['hint over the content', se, '', '.r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/],
    ['country covered', d, '', '', /Sudan's north covered by panel/, () => { const m = document.querySelector('.map'); m.style.left = (parseFloat(getComputedStyle(m).left) + 300) + 'px'; }],
    ['wrong flag', d, '', '', /the header flag is not Sudan's/, () => { document.querySelector('.r-flag img').setAttribute('src', '../../shared/flags/eg.svg'); }],
    ['leader missing', d, '', '', /the header does not name the country, its leader and regime/, () => { document.querySelector('.r-sub').textContent = 'جمهورية رئاسية'; }],
    ['emblem off', d, '', '', /the emblem is not the foreign section's/, () => { document.querySelector('.s-emb use').setAttribute('href', '#i-eye'); }],
    ['close unclear', d, '', '', /a11y: the close does not say where it returns/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['card modal', d, '', '', /a dialog over the map/, () => { document.querySelector('.sheet').setAttribute('aria-modal', 'true'); }],
    ['numbers reordered', d, '', '', /the headline numbers are not population, output, stability/, () => { const k = document.querySelector('.r-kpis'); k.appendChild(k.firstElementChild); }],
    ['population yearless', d, '', '', /the population is not the country's, with its year/, () => { document.querySelector('.r-kpi .r-kr').textContent = 'تقريبًا'; }],
    ['output unread', d, '', '', /the output is not the country's, with its year, read whole/, () => { document.querySelectorAll('.r-kpi')[1].setAttribute('aria-label', 'الناتج'); }],
    ['stability exact', d, '', '', /the stability is not an estimated range/, () => { document.querySelectorAll('.r-kpi')[2].querySelector('.r-kv b').textContent = '45'; }],
    ['stability range off', d, '', '', /the stability range is 4 wide, not ±5/, () => { const k = document.querySelectorAll('.r-kpi')[2], b = k.querySelectorAll('.r-kv b'); b[0].textContent = '43%'; b[1].textContent = '47%'; k.setAttribute('aria-label', 'الاستقرار: من 43% إلى 47%، تقدير'); }],
    ['stability without %', d, '', '', /the stability is not an estimated range/, () => { document.querySelectorAll('.r-kpi')[2].querySelectorAll('.r-kv b').forEach((b) => { b.textContent = b.textContent.replace('%', ''); }); }],
    ['years swapped', d, '', '', /the population is not the country's, with its year/, () => { const k = document.querySelectorAll('.r-kpi'); k[0].querySelector('.r-kr .ltr').textContent = '2010'; k[0].setAttribute('aria-label', 'السكان: 44 مليون، 2010'); k[1].querySelector('.r-kr .ltr').textContent = '2011'; k[1].setAttribute('aria-label', 'الناتج: 65 مليار دولار، 2011'); }],
    ['stability unread', d, '', '', /a11y: the stability range is not read whole/, () => { document.querySelectorAll('.r-kpi')[2].setAttribute('aria-label', 'الاستقرار، تقدير'); }],
    ['cells reordered', d, '', '', /the status cells are not relation, treaties, dispute, network/, () => { const s = document.querySelector('.r-st'); s.appendChild(s.firstElementChild); }],
    ['relation off', d, '', '', /our relation is not screen 10's/, () => { document.querySelector('.r-sc dd .ltr').textContent = '+20'; }],
    ['relation unsigned', d, '', '', /our relation is not screen 10's/, () => { document.querySelector('.r-sc dd .ltr').textContent = '18'; }],
    ['treaty off', d, '', '', /the treaty is not screen 10's Nile agreement/, () => { document.querySelectorAll('.r-sc dd')[1].innerHTML = 'مياه النيل <span class="ltr">1929</span>'; }],
    ['dispute off', d, '', '', /the dispute is not Halaib/, () => { document.querySelectorAll('.r-sc dd')[2].textContent = 'لا يوجد'; }],
    ['network off', d, '', '', /our network is not screens 11 and 22's/, () => { document.querySelectorAll('.r-sc dd')[3].innerHTML = '<span class="ltr">5</span> من <span class="ltr">10</span>'; }],
    ['referendum off', d, '', '', /the referendum note is not dated as screens 10 and 16/, () => { document.querySelector('.r-body[data-tab="card"] .s-note').textContent = 'استفتاء جنوب السودان في 9 يوليو 2011.'; }],
    ['links reordered', d, '', '', /the links are not the relation and a new operation/, () => { const L = document.querySelectorAll('.r-link'); L[0].parentElement.insertBefore(L[1], L[0]); }],
    ['relation link silent', d, '', '', /a11y: the relation link does not say its value and where it leads/, () => { document.querySelector('.r-link').setAttribute('aria-label', 'العلاقة مع السودان'); }],
    ['operation line off', d, '', '', /the operation link is not screen 22's target line/, () => { document.querySelectorAll('.r-link')[1].querySelector('.r-at > span').textContent = 'الشبكة 5 من 10'; }],
    ['country not outlined', d, '', '.sel-country path { stroke: none !important; }', /the tapped country is not outlined on the map/],
    ['outline faded', d, '', '.map svg.sel-country { opacity: 0 !important; }', /the tapped country is not outlined on the map/],
    ['outline see-through', d, '', '.sel-country path { stroke-opacity: 0 !important; }', /the tapped country is not outlined on the map/],
    ['outline moved off', d, '', '.map svg.sel-country { transform: translate(4000px, 0); }', /the tapped country is not outlined on the map/],
    ['outline empty', d, '', '', /the tapped country is not outlined on the map/, () => { document.querySelector('.map svg.sel-country path').setAttribute('d', ''); }],
    ['south missing', d, '', '', /the outline is not Sudan whole on 1 January 2011/, new Function("document.querySelector('.map svg.sel-country path').setAttribute('d', " + JSON.stringify(SD.sdn_only) + ");")],
    ['Sudan unnamed', d, '', '', /Sudan's name not shown on the map/, () => { [...document.querySelectorAll('.labels text')].find((t) => t.textContent === 'السودان').classList.add('cut'); }],
    ['Sudan name covered', d, '', '', /Sudan's name not shown on the map/, () => { const r = [...document.querySelectorAll('.labels text')].find((t) => t.textContent === 'السودان').getBoundingClientRect(), g = document.createElement('div');
      g.className = 'glass'; g.style.cssText = 'position: fixed; z-index: 99; left: ' + (r.left - 6) + 'px; top: ' + (r.top - 6) + 'px; width: ' + (r.width + 12) + 'px; height: ' + (r.height + 12) + 'px'; document.querySelector('.hud').appendChild(g); }],
    ['Khartoum dot buried', d, '', '', /Khartoum's dot under its name/, () => { document.querySelector('.labels text[data-city="5"]').removeAttribute('direction'); }],
    ['Khartoum hidden', d, '', '', /Khartoum not shown on the map/, () => { document.querySelector('.labels text[data-city="5"]').classList.add('cut'); }],
    ['red in the card', d, '', '.r-sc dt { color: #E0302A !important; }', /red in the card/],
    ['red side border', d, '', '.r-sc dd { border-right: 3px solid #E0302A !important; }', /red in the card/],
    ['red shadow', d, '', '.r-kpi { box-shadow: 0 0 0 3px #E0302A !important; }', /red in the card/],
  ],
});
