// Screen 18 variant A («تقرير الأمة», the end of the campaign on 31 December 2100): render the iPhones and run the checks
// with the shared panel checker (design/shared/check/panelcheck.js: every generic rule of the approved panels, for a sheet
// with one body and no section). This file adds the report's own rules: the clock stopped for good and the date; the
// five pillars in order, each with its measure, its score and its change since 2011 (blue, up, said in words); the
// result = the mean of the pillars, its change = the result − the mean of the 2011 scores, the highest and the lowest
// named right; the HUD's stability and influence = the pillars' 2100 values; the money and cheat note; the way on.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['تقرير الأمة', 'مصر · 2011–2100'];
// [pillar, its measure, score in 2100, score in 2011]
const PILLARS = [['الاقتصاد', 'دخل الفرد من 2,640 إلى 9,800 $', 72, 52], ['المعيشة', 'متوسط العمر من 70 إلى 79 سنة', 70, 54],
  ['السيادة والأمن', 'كل الأراضي · بلا حرب خاسرة', 75, 70], ['الاستقرار', 'من 58% إلى 71%', 66, 54], ['المكانة الدولية', 'النفوذ من 62 إلى 70', 57, 42]];
const NOTE = 'بدولارات 2011 الثابتة · تُلغى النتيجة إن استُخدمت خيارات غير واقعية';
const BRIEF = {
  report: HEAD.concat(['النتيجة', '68', 'في 2011', '54', 'بداية الحملة', 'الأعلى', '75', 'السيادة والأمن']),
  reach_report: ['المحاور الخمسة'].concat(PILLARS.map((p) => p[0]), PILLARS.map((p) => p[1]), [NOTE, 'لعبة جديدة', 'من القائمة الرئيسية', 'تصفح الخريطة في 2100', 'الوقت متوقف']),
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
// the HUD at the end moment (shared/check/end_hud.py): the clock stopped, so no indicator moves (every trend flat, read
// «دون تغيير»), and no indicator still shows its 1 January 2011 value
{ const st = [...document.querySelectorAll('.top .stat')];
  st.forEach((e) => { const tr = e.querySelector('.trend'), l = (e.querySelector('.lbl') || {}).textContent;
    if (!tr || !tr.classList.contains('flat') || tr.querySelector('use').getAttribute('href') !== '#t-flat' || tr.getAttribute('aria-label') !== 'دون تغيير') X.issues.push('the HUD «' + l + '» moves while the clock is stopped'); });
  const b3 = {"الخزينة": "36.0", "الاستقرار": "58%", "الشرعية": "44", "القوة البشرية": "2.4", "النفوذ": "62", "البحث": "+18"}, same = st.filter((e) => { const l = e.querySelector('.lbl').textContent, n = e.querySelector('.num').textContent.replace(/\\s+/g, ' ').trim(); return b3[l] && n.startsWith(b3[l]); }).map((e) => e.querySelector('.lbl').textContent);
  if (same.length) X.issues.push('the HUD keeps the 2011 values: ' + same.join('، ')); }
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
// the HUD date read whole with its weekday
if ((q('.top .date .dtext').getAttribute('aria-label') || '') !== 'الجمعة 31 ديسمبر 2100') issues.push('the HUD date is not «الجمعة 31 ديسمبر 2100»: «' + q('.top .date .dtext').getAttribute('aria-label') + '»');
// the toast is this moment's
if (T(q('.alert-prev .txt')) !== 'انتهت الحملة في 2100') issues.push('the toast is not «انتهت الحملة في 2100»');
// the stopped clock and the speed chip are disabled, and look it
{ const pl = q('.play'), sp = q('.spd'); if (sp.getAttribute('aria-disabled') !== 'true' || sp.hasAttribute('aria-haspopup') || getComputedStyle(pl.querySelector('svg')).color !== X.TOK.t2 || getComputedStyle(sp.querySelector('span')).color !== X.TOK.t2) issues.push('the clock and the speed chip do not look and read disabled'); }
// the clock stopped for good, at the end date
{ const pl = q('.play'); if (pl.querySelector('use').getAttribute('href') !== '#i-play' || !/الحملة منتهية/.test(pl.getAttribute('aria-label') || '') || pl.getAttribute('aria-disabled') !== 'true') issues.push('the clock is not shown stopped for good (play glyph, «الحملة منتهية», disabled)');
  if (W(q('.top .dmy').dataset.full || T(q('.top .dmy'))) !== '31 ديسمبر 2100') issues.push('the date is not 31 December 2100'); }
// the pillars in order, each with its measure, score and change (blue, up, its arrow, said in words)
const rows = [...document.querySelectorAll('.sheet .e-p')];
if (rows.map((r) => W(T(r.querySelector('.w-n b')))).join('|') !== DATA.pillars.map((p) => p[0]).join('|')) issues.push('the pillars are not the five in order');
const word = (n) => n === 1 ? 'نقطة واحدة' : n === 2 ? 'نقطتين' : n <= 10 ? n + ' نقاط' : n + ' نقطة';
DATA.pillars.forEach(([nm, line, s, s0]) => { const r = rows.find((x) => W(T(x.querySelector('.w-n b'))) === nm); if (!r) { issues.push('pillar «' + nm + '» missing'); return; }
  const v = nums(T(r.querySelector('.e-v .e-s')))[0], ch = r.querySelector('.e-v .e-c'), c = nums(T(ch))[0], al = r.getAttribute('aria-label') || '';
  if (W(T(r.querySelector('.w-n > span'))) !== line) issues.push('«' + nm + '»\\'s measure is not «' + line + '»');
  if (v !== s) issues.push('«' + nm + '»\\'s score is ' + v + ', the brief ' + s);
  if (c !== v - s0) issues.push('«' + nm + '»\\'s change ' + c + ' is not its score − its 2011 score (' + (v - s0) + ')');
  const up = c > 0, u = ch.querySelector('use');
  if (!u || u.getAttribute('href') !== (up ? '#t-up' : '#t-down') || getComputedStyle(ch).color !== (up ? X.TOK.blue : X.TOK.amber)) issues.push('«' + nm + '»: the change is not ' + (up ? 'blue with an up arrow' : 'amber with a down arrow'));
  if (!al.includes(': ' + v + ' من 100، ' + (up ? 'ارتفع ' : 'انخفض ') + word(Math.abs(c)) + ' منذ 2011')) issues.push('a11y: «' + nm + '» does not say its score and change in words'); });
// the result = the mean; its change = the result − the 2011 mean; the highest and the lowest
{ const sc = rows.map((r) => nums(T(r.querySelector('.e-v .e-s')))[0]), mean = Math.round(sc.reduce((a, b) => a + b, 0) / sc.length), base = Math.round(DATA.pillars.reduce((a, p) => a + p[3], 0) / DATA.pillars.length);
  const k = [...document.querySelectorAll('.sheet .r-kpi')], kv = (i) => nums(T(k[i].querySelector('.r-kv b')))[0], kr = (i) => W(T(k[i].querySelector('.r-kr')));
  if (kv(0) !== mean) issues.push('the result ' + kv(0) + ' is not the mean of the pillars (' + mean + ')');
  { const kr0 = k[0].querySelector('.r-kr'), u0 = kr0.querySelector('use'), up = mean - base > 0;
    if (getComputedStyle(kr0).color !== (up ? X.TOK.blue : X.TOK.amber) || !u0 || u0.getAttribute('href') !== (up ? '#t-up' : '#t-down')) issues.push('the result\\'s change is not ' + (up ? 'blue with an up arrow' : 'amber with a down arrow')); }
  if (nums(kr(0))[0] !== mean - base) issues.push('the result\\'s change ' + nums(kr(0))[0] + ' is not the result − the 2011 mean (' + (mean - base) + ')');
  const nm = (i) => W(T(rows[i].querySelector('.w-n b'))), hi = sc.indexOf(Math.max(...sc)), lo = sc.indexOf(Math.min(...sc));
  if (kv(1) !== base || W(T(k[1].querySelector('.r-kl'))) !== 'في 2011') issues.push('the 2011 cell is not the mean of the 2011 scores (' + base + ')');
  if (kv(2) !== sc[hi] || kr(2) !== nm(hi)) issues.push('the highest is not «' + nm(hi) + '» ' + sc[hi]); }
// the HUD shows the report's 2100 values (stability, influence)
{ const st = [...document.querySelectorAll('.top .stat')], hv = (l) => { const s = st.find((e) => W(T(e.querySelector('.lbl'))) === l); return s && nums(T(s.querySelector('.num')))[0]; };
  const pv = (nm) => { const r = rows.find((x) => W(T(x.querySelector('.w-n b'))) === nm); return r ? nums(T(r.querySelector('.w-n > span'))).slice(-1)[0] : null; };
  if (hv('الاستقرار') !== pv('الاستقرار')) issues.push('the HUD stability ' + hv('الاستقرار') + ' is not the report\\'s ' + pv('الاستقرار'));
  if (hv('النفوذ') !== pv('المكانة الدولية')) issues.push('the HUD influence ' + hv('النفوذ') + ' is not the report\\'s ' + pv('المكانة الدولية')); }
// the note: constant 2011 dollars and the cheat rule
if (W(T(q('.sheet .s-note'))) !== DATA.note) issues.push('the money and cheat note is not «' + DATA.note + '»');
// the way on: each link says where it leads
qa('.sheet .r-link').forEach((r) => { if (!/\\. يفتح /.test(r.getAttribute('aria-label') || '') || !r.querySelector('.r-chev')) issues.push('a11y: a link row does not say where it leads'); });
{ const n = q('.nation'), l = T(q('.nation .ldr')); if (l !== 'رئيس الدولة' || !(n.getAttribute('aria-label') || '').includes('رئيس الدولة')) issues.push('the nation card names a real person in 2100 (it must say «رئيس الدولة»)');
  if (!/انتهت الحملة/.test(T(q('.alert-prev .txt')))) issues.push('the toast does not say the campaign ended'); }
if ((q('.r-x').getAttribute('aria-label') || '') !== 'العودة إلى الخريطة') issues.push('a11y: the close button does not say it returns to the map');
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['report'], noTabs: true, fitTab: false, longTab: 'report',
  inputs: ['_build/end.css', '../../shared/check/end_hud.py'],
  TOK: { sec: 'rgb(214, 187, 169)', ctlH: {}, sheetIcon: [], size: [['.e-p', null, 32]] },
  HEAD, BRIEF, screenChecks, DATA: { pillars: PILLARS, note: NOTE },
  skipGeneric: ['section colour on a rule', 'why without its subject', 'amber value without its icon', 'chip arrow against its sign', 'chip not white', 'tap in the side inset', 'text into a control'],
  cases: (d, se) => [
    ['weekday wrong', d, '', '', /the HUD date is not «الجمعة 31 ديسمبر 2100»/, () => { window.__setDate('السبت', '31 ديسمبر 2100'); }],
    ['another moment toast', d, '', '', /the toast is not «انتهت الحملة في 2100»/, () => { document.querySelector('.alert-prev .txt').textContent = 'انتهت الحملة'; }],
    ['clock looks live', d, '', '.play[aria-disabled="true"] svg { color: rgb(234, 242, 247) !important; }', /the clock and the speed chip do not look and read disabled/],
    ['speed menu still offered', d, '', '', /the clock and the speed chip do not look and read disabled/, () => { const s = document.querySelector('.spd'); s.removeAttribute('aria-disabled'); s.setAttribute('aria-haspopup', 'menu'); }],
    ['tap in the side inset (report)', d, '&tab=report&scroll=end', '.sheet { right: -30px !important; }', /tap in side inset/],
    ['amber value without its icon (report)', d, '', '', /colour alone: .* \(its label's icon is not in its colour\)/, () => { document.querySelector('.r-kv b').classList.add('r-amber'); }],
    ['text into a control (report)', d, '&tab=report&scroll=end', '.r-link .r-at { transform: translateX(-215px) !important; }', /text over a control|text overlap|icon over text/],
    ['Mubarak in 2100', d, '', '', /the nation card names a real person/, () => { document.querySelector('.nation .ldr').textContent = 'حسني مبارك'; }],
    ['old toast', d, '', '', /the toast does not say the campaign ended/, () => { document.querySelector('.alert-prev .txt').textContent = 'احتجاجات واسعة في تونس'; }],
    ['result change in amber', d, '', '', /the result's change is not blue with an up arrow/, () => { document.querySelector('.r-kpi .r-kr').classList.replace('r-blue', 'r-amber'); }],
    ['a real leader in 2100', d, '', '', /the nation card names a real person/, () => { document.querySelector('.nation .ldr').textContent = 'اسم حقيقي'; }],
    ['clock running', d, '', '', /the clock is not shown stopped for good/, () => { document.querySelector('.play use').setAttribute('href', '#i-pause'); }],
    ['clock not disabled', d, '', '', /the clock is not shown stopped for good/, () => { document.querySelector('.play').removeAttribute('aria-disabled'); }],
    ['date off', d, '', '', /the date is not 31 December 2100/, () => { window.__setDate('الجمعة', '1 يناير 2100'); }],
    ['pillars reordered', d, '', '', /the pillars are not the five in order/, () => { const s = document.querySelector('.r-sec'), r = s.querySelectorAll('.e-p'); s.insertBefore(r[1], r[0]); }],
    ['a pillar lost', d, '', '', /pillar «المعيشة» missing|the pillars are not/, () => { document.querySelectorAll('.e-p')[1].remove(); }],
    ['score off', d, '', '', /«الاقتصاد»'s score is 74/, () => { document.querySelector('.e-p .e-v .e-s').textContent = '74'; }],
    ['change off', d, '', '', /«المعيشة»'s change 18 is not/, () => { document.querySelectorAll('.e-p .e-v .e-c .ltr')[1].textContent = '+18'; }],
    ['change in amber', d, '', '', /the change is not blue with an up arrow/, () => { document.querySelectorAll('.e-p .e-v .e-c')[2].classList.replace('r-blue', 'r-amber'); }],
    ['change unsaid', d, '', '', /a11y: «الاقتصاد» does not say its score and change/, () => { const r = document.querySelector('.e-p'); r.setAttribute('aria-label', r.getAttribute('aria-label').replace('ارتفع 20 نقطة', 'ارتفع')); }],
    ['result not the mean', d, '', '', /the result 70 is not the mean/, () => { document.querySelector('.r-kv b').textContent = '70'; }],
    ['result change off', d, '', '', /the result's change 16 is not/, () => { document.querySelector('.r-kpi .r-kr .ltr').textContent = '+16'; }],
    ['highest wrong', d, '', '', /the highest is not «السيادة والأمن» 75/, () => { document.querySelectorAll('.r-kpi .r-kr')[2].textContent = 'الاقتصاد'; }],
    ['baseline off', d, '', '', /the 2011 cell is not the mean of the 2011 scores \(54\)/, () => { document.querySelectorAll('.r-kpi .r-kv b')[1].textContent = '50'; }],
    ['HUD stability off', d, '', '', /the HUD stability 58 is not the report's 71/, () => { [...document.querySelectorAll('.top .stat')].find((e) => e.textContent.includes('الاستقرار')).querySelector('.num').textContent = '58%'; }],
    ['HUD influence off', d, '', '', /the HUD influence 62 is not the report's 70/, () => { [...document.querySelectorAll('.top .stat')].find((e) => e.textContent.includes('النفوذ')).querySelector('.num').textContent = '62'; }],
    ['note without the cheat rule', d, '', '', /the money and cheat note is not/, () => { document.querySelector('.s-note').textContent = 'بدولارات 2011 الثابتة'; }],
    ['link silent', d, '', '', /a11y: a link row does not say where it leads/, () => { const r = document.querySelector('.r-link'); r.setAttribute('aria-label', 'لعبة جديدة'); }],
    ['close silent', d, '', '', /a11y: the close button does not say it returns to the map/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['HUD trend moving', d, '', '', /the HUD «الخزينة» moves while the clock is stopped/, () => { const u = document.querySelector('.top .stat .trend'); u.setAttribute('class', 'trend down'); u.querySelector('use').setAttribute('href', '#t-down'); }],
    ['HUD 2011 value', d, '', '', /the HUD keeps the 2011 values: الخزينة/, () => { document.querySelector('.top .stat .num').firstChild.textContent = '36.0'; }],
  ],
});
