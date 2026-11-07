// Screen 18 variant C (the government dissolved, §5.11): render the iPhones and run the checks with the shared panel
// checker (design/shared/check/panelcheck.js). This file adds its own rules: the clock waits for the choice (stopped,
// not resumable) at the date; what happened in one neutral sentence and the choice said; exactly two choices, in order,
// none marked default, each read whole; «إنهاء الحملة» leads to the report; the successor's starting legitimacy said;
// the HUD names no real person after 2011 and shows who runs the country; the toast says what happened.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['سقطت حكومتك', '12 أغسطس 2031 · الوقت متوقف'];
const TEXT = 'أطاحت ثورة واسعة بالحكومة وتولّى مجلس انتقالي إدارة البلاد. يمكنك متابعة الحملة بالحكومة الجديدة أو إنهاؤها.';
const OPS = [['المتابعة بالمجلس الانتقالي', 'حكومة مصر الجديدة · تبدأ بشرعية 35'], ['إنهاء الحملة', 'يعرض تقرير الأمة']];
const BRIEF = {
  fallen: HEAD.concat([TEXT, 'خياراتك'], OPS.flat()),
  reach_fallen: ['خياراتك'].concat(OPS.flat(), ['يمكنك الاختيار لاحقًا من الإشعارات، والوقت متوقف حتى تختار.']),
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
if ((q('.top .date .dtext').getAttribute('aria-label') || '') !== 'الثلاثاء 12 أغسطس 2031') issues.push('the HUD date is not «الثلاثاء 12 أغسطس 2031»: «' + q('.top .date .dtext').getAttribute('aria-label') + '»');
// the toast is this moment's
if (T(q('.alert-prev .txt')) !== 'ثورة: سقطت الحكومة') issues.push('the toast is not «ثورة: سقطت الحكومة»');
// the stopped clock and the speed chip are disabled, and look it
{ const pl = q('.play'), sp = q('.spd'); if (sp.getAttribute('aria-disabled') !== 'true' || sp.hasAttribute('aria-haspopup') || getComputedStyle(pl.querySelector('svg')).color !== X.TOK.t2 || getComputedStyle(sp.querySelector('span')).color !== X.TOK.t2) issues.push('the clock and the speed chip do not look and read disabled'); }
{ const pl = q('.play'); if (pl.querySelector('use').getAttribute('href') !== '#i-play' || !/متوقف حتى تختار/.test(pl.getAttribute('aria-label') || '') || pl.getAttribute('aria-disabled') !== 'true') issues.push('the clock does not wait for the choice (play glyph, «متوقف حتى تختار», disabled)');
  if (W(q('.top .dmy').dataset.full || T(q('.top .dmy'))) !== '12 أغسطس 2031') issues.push('the HUD date is not 12 August 2031'); }
if (W(T(q('.sheet .d-text'))) !== DATA.text) issues.push('the text is not the brief\\'s');
// two choices in order, no default, each read whole
{ const a = [...document.querySelectorAll('.sheet .r-act')], nm = a.map((e) => W(T(e.querySelector('.r-at b'))));
  if (nm.join('|') !== DATA.ops.map((o) => o[0]).join('|')) issues.push('the choices are «' + nm.join('، ') + '»');
  a.forEach((e, i) => { const o = DATA.ops[i]; if (!o) return;
    if (W(T(e.querySelector('.r-at > span'))) !== o[1]) issues.push('«' + o[0] + '»\\'s line is not «' + o[1] + '»');
    if (e.dataset.default || /الافتراضي/.test(e.getAttribute('aria-label') || '') || e.classList.contains('r-first')) issues.push('a choice is marked default: «' + o[0] + '»');
    if ((e.getAttribute('aria-label') || '') !== o[0] + ': ' + o[1].replace(' · ', '، ')) issues.push('a11y: «' + o[0] + '» does not read whole'); }); }
// the HUD: no real person after 2011; who runs the country now; the toast
{ const n = q('.nation'), l = T(q('.nation .ldr')); if (/مبارك/.test(l + (n.getAttribute('aria-label') || ''))) issues.push('the nation card names a real person in 2031');
  if (l !== 'المجلس' || !(n.getAttribute('aria-label') || '').includes('المجلس الانتقالي')) issues.push('the nation card does not show the council running the country');
  if (!/سقطت الحكومة/.test(T(q('.alert-prev .txt')))) issues.push('the toast does not say what happened');
  // the HUD agrees with the sheet: the council's legitimacy and a transitional regime
  const leg = [...document.querySelectorAll('.top .stat')].find((e) => T(e.querySelector('.lbl')) === 'الشرعية'), lv = leg && nums(T(leg.querySelector('.num')))[0], opL = nums(T(document.querySelector('.sheet .r-act .r-at > span')))[0];
  if (lv !== opL || T(q('.nation .rg')) !== 'حكم انتقالي') issues.push('the HUD (legitimacy ' + lv + ', «' + T(q('.nation .rg')) + '») does not agree with the council (' + opL + ', «حكم انتقالي»)'); }
// deferring is said on screen, not only in VoiceOver
if (W(T(q('.sheet .s-note'))) !== 'يمكنك الاختيار لاحقًا من الإشعارات، والوقت متوقف حتى تختار.') issues.push('the sheet does not say the choice can wait');
{ const st = [...document.querySelectorAll('.top .stat')].find((e) => T(e.querySelector('.lbl')) === 'الاستقرار'); if (!st || nums(T(st.querySelector('.num')))[0] !== 31) issues.push('the HUD stability is not the council\\'s 31%'); }
if (!/^لاحقًا: /.test(q('.r-x').getAttribute('aria-label') || '')) issues.push('a11y: the close button does not say the choice waits');
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: null, tabs: ['fallen'], noTabs: true, fitTab: false, longTab: 'fallen',
  inputs: ['_build/end.css', '../../shared/check/end_hud.py'],
  TOK: { sec: 'rgb(214, 187, 169)', ctlH: {}, sheetIcon: [], size: [] },
  HEAD, BRIEF, screenChecks, DATA: { text: TEXT, ops: OPS },
  skipGeneric: ['hint chevron missing (no tabs)', 'hint over the content (no tabs)', 'section colour on a rule', 'why without its subject', 'amber value without its icon', '% before its number', 'brief text hidden', '18 pt misuse', 'clipped text', 'gap', 'faint text', 'text into a control', 'chip arrow against its sign', 'chip not white'],
  cases: (d, se) => [
    // the body never scrolls on the SE: the hint must stay hidden (the opposite of the shared plant)
    ['hint shown without content below', se, '', '.r-hint { display: flex !important; visibility: visible !important; opacity: 1 !important; }', /scroll hint chevron shown without content below/],
    ['weekday wrong', d, '', '', /the HUD date is not «الثلاثاء 12 أغسطس 2031»/, () => { window.__setDate('السبت', '12 أغسطس 2031'); }],
    ['another moment toast', d, '', '', /the toast is not «ثورة: سقطت الحكومة»/, () => { document.querySelector('.alert-prev .txt').textContent = 'انتهت الحملة'; }],
    ['clock looks live', d, '', '.play[aria-disabled="true"] svg { color: rgb(234, 242, 247) !important; }', /the clock and the speed chip do not look and read disabled/],
    ['speed menu still offered', d, '', '', /the clock and the speed chip do not look and read disabled/, () => { const s = document.querySelector('.spd'); s.removeAttribute('aria-disabled'); s.setAttribute('aria-haspopup', 'menu'); }],
    ['brief text hidden (fallen)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-name').style.opacity = '0'; }],
    ['18 pt misuse (fallen)', d, '', '.d-text { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['clipped text (fallen)', d, '', '.d-text { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding/],
    ['gap (fallen)', d, '', '.r-act { gap: 6px !important; }', /gap 6 on/],
    ['faint text (fallen)', d, '', '.d-text { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['% before its number (fallen)', d, '', '', /% shown before its number/, () => { document.querySelector('.d-text').textContent = 'نسبة 20%'; }],
    ['clock resumable', d, '', '', /the clock does not wait for the choice/, () => { document.querySelector('.play').removeAttribute('aria-disabled'); }],
    ['date off', d, '', '', /the HUD date is not 12 August 2031/, () => { window.__setDate('السبت', '1 يناير 2011'); }],
    ['text changed', d, '', '', /the text is not the brief's/, () => { document.querySelector('.d-text').textContent = 'سقطت الحكومة.'; }],
    ['choices swapped', d, '', '', /the choices are/, () => { const s = document.querySelector('.r-sec'), a = s.querySelectorAll('.r-act'); s.insertBefore(a[1], a[0]); }],
    ['a default marked', d, '', '', /a choice is marked default/, () => { document.querySelector('.r-act').dataset.default = '1'; }],
    ['legitimacy unsaid', d, '', '', /a11y: «المتابعة بالمجلس الانتقالي» does not read whole|does not read its numbers/, () => { const a = document.querySelector('.r-act'); a.setAttribute('aria-label', 'المتابعة بالمجلس الانتقالي: حكومة مصر الجديدة'); }],
    ['line off', d, '', '', /«إنهاء الحملة»'s line is not/, () => { document.querySelectorAll('.r-act .r-at > span')[1].textContent = 'يعود إلى القائمة'; }],
    ['Mubarak in 2031', d, '', '', /the nation card names a real person/, () => { document.querySelector('.nation .ldr').textContent = 'حسني مبارك'; }],
    ['old toast', d, '', '', /the toast does not say what happened/, () => { document.querySelector('.alert-prev .txt').textContent = 'احتجاجات واسعة في تونس'; }],
    ['HUD legitimacy off', d, '', '', /the HUD \(legitimacy 44/, () => { [...document.querySelectorAll('.top .stat')].find((e) => e.textContent.includes('الشرعية')).querySelector('.num').textContent = '44'; }],
    ['HUD stability of 2011', d, '', '', /the HUD stability is not the council's 31%/, () => { [...document.querySelectorAll('.top .stat')].find((e) => e.textContent.includes('الاستقرار')).querySelector('.num').textContent = '58%'; }],
    ['later said in part', d, '', '', /the sheet does not say the choice can wait/, () => { document.querySelector('.s-note').textContent = 'يمكنك الاختيار لاحقًا من الإشعارات.'; }],
    ['later unsaid', d, '', '', /the sheet does not say the choice can wait/, () => { document.querySelector('.s-note').remove(); }],
    ['close says nothing', d, '', '', /a11y: the close button does not say the choice waits/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق'); }],
    ['HUD trend moving', d, '', '', /the HUD «الخزينة» moves while the clock is stopped/, () => { const u = document.querySelector('.top .stat .trend'); u.setAttribute('class', 'trend down'); u.querySelector('use').setAttribute('href', '#t-down'); }],
    ['HUD 2011 value', d, '', '', /the HUD keeps the 2011 values: الخزينة/, () => { document.querySelector('.top .stat .num').firstChild.textContent = '36.0'; }],
  ],
});
