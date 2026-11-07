// Screen 18 variant B (the nuclear end, §5.11 rung 5): render the iPhones and run the checks with the shared panel checker
// (design/shared/check/panelcheck.js). This file adds the end's own rules: the clock stopped for good at the date; sober
// and neutral: no score, no number but dates, no image, no headline numbers, no country named, no drama words; the way
// out: the last save before the escalation (dated before the end) and a new game, each saying where it leads; the HUD
// names no real person after 2011; the toast says the campaign ended.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['نهاية الحملة', '15 مارس 2034'];
const TEXT = 'بلغ التصعيد النووي أعلى درجاته واستُخدم السلاح النووي. تتوقف الحملة هنا: لا تستطيع اللعبة أن تمثّل ما يلي ذلك بأمانة.';
const BRIEF = {
  nuclear: HEAD.concat([TEXT]),
  reach_nuclear: ['العودة إلى آخر حفظ', '1 مارس 2034 · قبل التصعيد', 'لعبة جديدة', 'من القائمة الرئيسية'],
};
const COUNTRIES = ['مصر', 'إسرائيل', 'إيران', 'الولايات المتحدة', 'روسيا', 'الصين', 'الهند', 'باكستان', 'كوريا', 'فرنسا', 'بريطانيا'];
const DRAMA = ['كارثة', 'دمار شامل', 'فناء', 'مأساة', 'رعب', 'هزيمة', 'خسرت', 'فزت', 'نتيجة', 'نقاط'];

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
if ((q('.top .date .dtext').getAttribute('aria-label') || '') !== 'الأربعاء 15 مارس 2034') issues.push('the HUD date is not «الأربعاء 15 مارس 2034»: «' + q('.top .date .dtext').getAttribute('aria-label') + '»');
// the toast is this moment's
if (T(q('.alert-prev .txt')) !== 'انتهت الحملة') issues.push('the toast is not «انتهت الحملة»');
// the stopped clock and the speed chip are disabled, and look it
{ const pl = q('.play'), sp = q('.spd'); if (sp.getAttribute('aria-disabled') !== 'true' || sp.hasAttribute('aria-haspopup') || getComputedStyle(pl.querySelector('svg')).color !== X.TOK.t2 || getComputedStyle(sp.querySelector('span')).color !== X.TOK.t2) issues.push('the clock and the speed chip do not look and read disabled'); }
{ const pl = q('.play'); if (pl.querySelector('use').getAttribute('href') !== '#i-play' || !/الحملة منتهية/.test(pl.getAttribute('aria-label') || '') || pl.getAttribute('aria-disabled') !== 'true') issues.push('the clock is not shown stopped for good (play glyph, «الحملة منتهية», disabled)');
  if (W(q('.top .dmy').dataset.full || T(q('.top .dmy'))) !== '15 مارس 2034') issues.push('the HUD date is not the end date 15 March 2034'); }
// sober: the text is the brief's; no score, no headline numbers, no image strip, no country, no drama words
const body = q('.sheet .r-body'), bt = W(body.innerText) + ' ' + W(T(q('.sheet .r-sub')));
if (W(T(q('.sheet .d-text'))) !== DATA.text) issues.push('the text is not the brief\\'s');
if (document.querySelector('.sheet .r-kpis, .sheet .r-kpi, .sheet .r-chip, .sheet .e-p')) issues.push('a score or headline number on the nuclear end');
const nonDate = bt.replace(/\\d{1,2} (يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر) \\d{4}/g, '');
if (nums(nonDate).length) issues.push('a number that is not a date: ' + nums(nonDate).join(', '));
{ const hd = getComputedStyle(q('.r-hd')).backgroundImage; if (hd && hd !== 'none' && /url\\(/.test(hd)) issues.push('an image in the nuclear end\\'s header'); }
DATA.countries.forEach((c) => { if (bt.includes(c)) issues.push('a country named in the text: ' + c); });
DATA.drama.forEach((w) => { if (bt.includes(w)) issues.push('a drama or score word: ' + w); });
// the way out: the last save before the end, and a new game; each says where it leads
{ const ls = [...document.querySelectorAll('.sheet .r-link')], nm = ls.map((l) => W(T(l.querySelector('.r-at b'))));
  if (nm.join('|') !== 'العودة إلى آخر حفظ|لعبة جديدة') issues.push('the ways out are «' + nm.join('، ') + '»');
  ls.forEach((l) => { if (!/\\. يفتح /.test(l.getAttribute('aria-label') || '') || !l.querySelector('.r-chev')) issues.push('a11y: a link row does not say where it leads'); });
  const sv = ls[0] && W(T(ls[0].querySelector('.r-at > span'))).match(/(\\d+) مارس (\\d{4})/);
  if (!sv || +sv[2] !== 2034 || +sv[1] >= 15) issues.push('the last save is not before the end'); }
// the HUD: no real person after 2011; the toast says the campaign ended
{ const n = q('.nation'), l = T(q('.nation .ldr')); if (l !== 'رئيس الدولة' || !(n.getAttribute('aria-label') || '').includes('رئيس الدولة')) issues.push('the nation card names a real person in 2034 (it must say «رئيس الدولة»)');
  if (!/انتهت الحملة/.test(T(q('.alert-prev .txt')))) issues.push('the toast does not say the campaign ended'); }
if ((q('.r-x').getAttribute('aria-label') || '') !== 'العودة إلى الخريطة') issues.push('a11y: the close button does not say where it leads');
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['nuclear'], noTabs: true, fitTab: false, longTab: 'nuclear',
  inputs: ['_build/end.css', '../../shared/check/end_hud.py'],
  TOK: { sec: 'rgb(214, 187, 169)', ctlH: {}, sheetIcon: [], size: [] },
  HEAD, BRIEF, screenChecks, DATA: { text: TEXT, countries: COUNTRIES, drama: DRAMA },
  skipGeneric: ['hint chevron missing (no tabs)', 'hint over the content (no tabs)', 'section colour on data', 'section colour on a rule', 'emblem drawn grey', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white', 'row read in part'],
  cases: (d, se) => [
    // the body never scrolls on the SE: the hint must stay hidden (the opposite of the shared plant)
    ['hint shown without content below', se, '', '.r-hint { display: flex !important; visibility: visible !important; opacity: 1 !important; }', /scroll hint chevron shown without content below/],
    ['weekday wrong', d, '', '', /the HUD date is not «الأربعاء 15 مارس 2034»/, () => { window.__setDate('السبت', '15 مارس 2034'); }],
    ['another moment toast', d, '', '', /the toast is not «انتهت الحملة»/, () => { document.querySelector('.alert-prev .txt').textContent = 'انتهت الحملة في 2100'; }],
    ['clock looks live', d, '', '.play[aria-disabled="true"] svg { color: rgb(234, 242, 247) !important; }', /the clock and the speed chip do not look and read disabled/],
    ['speed menu still offered', d, '', '', /the clock and the speed chip do not look and read disabled/, () => { const s = document.querySelector('.spd'); s.removeAttribute('aria-disabled'); s.setAttribute('aria-haspopup', 'menu'); }],
    ['brief text hidden (nuclear)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-name').style.opacity = '0'; }],
    ['18 pt misuse (nuclear)', d, '', '.d-text { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (nuclear)', d, '', '.d-text { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding/],
    ['gap (nuclear)', d, '', '.r-links { gap: 6px !important; }', /gap 6 on/],
    ['faint text (nuclear)', d, '', '.d-text { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (nuclear)', d, '', '', /% shown before its number/, () => { document.querySelector('.d-text').textContent = 'نسبة 20%'; }],
    ['row read in part (nuclear)', d, '', '', /does not read all it shows/, () => { const r = document.querySelector('.r-link'); r.setAttribute('aria-label', 'العودة إلى آخر حفظ. يفتح الحفظ'); }],
    ['clock running', d, '', '', /the clock is not shown stopped for good/, () => { document.querySelector('.play use').setAttribute('href', '#i-pause'); }],
    ['date off', d, '', '', /the HUD date is not the end date/, () => { window.__setDate('الأحد', '1 يناير 2011'); }],
    ['text changed', d, '', '', /the text is not the brief's/, () => { document.querySelector('.d-text').textContent += ' انتهى العالم.'; }],
    ['a score shown', d, '', '', /a score or headline number|a number that is not a date/, () => { document.querySelector('.d-text').insertAdjacentHTML('afterend', '<p class="s-note">النتيجة <span class="ltr">41</span></p>'); }],
    ['an image strip', d, '', '.r-hd { background-image: url("header_cairo.jpg") !important; }', /an image in the nuclear end's header/],
    ['a country named', d, '', '', /a country named in the text: إيران/, () => { document.querySelector('.d-text').textContent = document.querySelector('.d-text').textContent.replace('واستُخدم', 'واستخدمت إيران'); }],
    ['a country in a note', d, '', '', /a country named in the text: إيران/, () => { document.querySelector('.d-text').insertAdjacentHTML('afterend', '<p class="s-note">تصعيد بين دولتين منهما إيران</p>'); }],
    ['a drama word', d, '', '', /a drama or score word: كارثة/, () => { document.querySelector('.r-sub').append(' · كارثة'); }],
    ['save after the end', d, '', '', /the last save is not before the end/, () => { document.querySelector('.r-link .r-at > span .ltr').textContent = '20'; }],
    ['a way out lost', d, '', '', /the ways out are/, () => { document.querySelectorAll('.r-link')[1].remove(); }],
    ['link silent', d, '', '', /a11y: a link row does not say where it leads/, () => { document.querySelectorAll('.r-link')[1].setAttribute('aria-label', 'لعبة جديدة: من القائمة الرئيسية'); }],
    ['Mubarak in 2034', d, '', '', /the nation card names a real person/, () => { document.querySelector('.nation .ldr').textContent = 'حسني مبارك'; }],
    ['old toast', d, '', '', /the toast does not say the campaign ended/, () => { document.querySelector('.alert-prev .txt').textContent = 'احتجاجات واسعة في تونس'; }],
    ['close silent', d, '', '', /a11y: the close button does not say where it leads/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['HUD trend moving', d, '', '', /the HUD «الخزينة» moves while the clock is stopped/, () => { const u = document.querySelector('.top .stat .trend'); u.setAttribute('class', 'trend down'); u.querySelector('use').setAttribute('href', '#t-down'); }],
    ['HUD 2011 value', d, '', '', /the HUD keeps the 2011 values: الخزينة/, () => { document.querySelector('.top .stat .num').firstChild.textContent = '36.0'; }],
  ],
});
