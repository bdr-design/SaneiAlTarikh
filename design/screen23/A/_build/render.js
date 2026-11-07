// Screen 23 variant A (the save-file sheet, §6.5): render the iPhones and run the checks with the shared panel checker
// (design/shared/check/panelcheck.js), in the «المزيد» section. This file adds the sheet's own rules: the file's date,
// country and size the «المزيد» panel's autosave row; the autosave rotating over the 3 files of the decision «saves»;
// loading says the date it returns to and that it replaces the game; exporting goes through Files; the delete saying the
// file has no other copy (the panel: no folder chosen); deleting marked by the red bin alone and asking first, in the sheet: the safe choice first,
// the delete naming the file, nothing in a dialog over the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

const S13 = (() => { const raw = fs.readFileSync(path.join(OUT, '../../screen13/A/_build/sheet.html'), 'utf8');
  const row = raw.match(/aria-label="حفظ تلقائي: (\d+) (\S+) (\d{4})، ([^،]+)، (\d+) ميغابايت\. يفتح التحميل والتصدير والحذف"/),
    mir = raw.match(/aria-label="نسخة في مجلد آخر: (لم يُختر مجلد)،/);
  if (!row || !mir) throw new Error('cannot read the «المزيد» panel\'s autosave row');
  return { day: +row[1], month: row[2], year: +row[3], country: row[4], mb: +row[5], mirror: mir[1] }; })();
const SLOTS = (() => { const d = JSON.parse(fs.readFileSync(path.join(OUT, '../../../decisions/decisions.json'), 'utf8'));
  const m = ((d.decisions || {}).saves || '').match(/rotating (\d+) slots/); if (!m) throw new Error('cannot read the decision «saves»'); return +m[1]; })();
const HEAD = ['حفظ تلقائي', 'حملة مصر · حُفظ قبل دقيقة'];
const CELLS = [['التاريخ', '1 يناير 2011'], ['الحجم', '2 ميغابايت']];
const BRIEF = {
  file: HEAD.concat(['الملف', 'تحميل هذا الحفظ']),
  reach_file: CELLS.flat().concat(['يتناوب الحفظ التلقائي على 3 ملفات، الأحدث مكان الأقدم.', 'يعود إلى 1 يناير 2011 · يحل محل اللعبة الحالية', 'تصدير', 'ملف واحد عبر تطبيق الملفات', 'حذف هذا الحفظ', 'لا نسخة له في مجلد آخر · لا يمكن التراجع']),
  confirm: HEAD.concat(['حذف هذا الحفظ؟', 'إبقاء الحفظ', 'العودة دون حذف', 'حذف نهائيًا', 'لا يمكن التراجع']),
  load: HEAD.concat(['تحميل هذا الحفظ؟', 'متابعة اللعب', 'العودة دون تحميل', 'تحميل', 'يحل محل اللعبة الحالية']),
  reach_load: ['تعود الحملة إلى 1 يناير 2011، ويضيع من اللعبة الحالية ما لم يُحفظ بعد آخر حفظ.'],
  reach_confirm: ['سيُحذف حفظ 1 يناير 2011 (مصر · 2 ميغابايت) من هذا الجهاز نهائيًا، ولا نسخة له في مجلد آخر.'],
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const s13 = DATA.s13, date = s13.day + ' ' + s13.month + ' ' + s13.year;
const fileB = q('.r-body[data-tab="file"]'), conf = q('.r-body[data-tab="confirm"]'), ld = q('.r-body[data-tab="load"]');
// the flag, the emblem and the close: the campaign's country, the save, back to the panel's saves
{ const f = q('.sheet .r-flag img'); if (!f || !(f.getAttribute('src') || '').endsWith('/eg.svg') || f.getAttribute('alt') !== 'علم ' + DATA.s13.country) issues.push('the header flag is not the campaign\\'s (' + DATA.s13.country + ')'); }
if (!q('.sheet .s-emb use[href="#i-save"]')) issues.push('the emblem is not the save');
if (q('.sheet .r-x').getAttribute('aria-label') !== 'إغلاق، العودة إلى الحفظ') issues.push('a11y: the close is not «إغلاق، العودة إلى الحفظ»');
// the primary's white bar: drawn on every .r-first, on no other row
qa('.sheet .r-act, .sheet .r-link').forEach((e) => { const a = getComputedStyle(e, '::after'), drawn = a.content !== 'none' && a.content !== 'normal' && parseFloat(a.width) > 0 && a.backgroundColor !== 'rgba(0, 0, 0, 0)';
  if (e.classList.contains('r-first') && !(drawn && Math.abs(parseFloat(a.width) - 3) < 0.1 && a.backgroundColor === X.TOK.t1)) issues.push('the primary «' + W(T(e.querySelector('b'))) + '» does not draw its white bar');
  if (!e.classList.contains('r-first') && drawn && Math.abs(parseFloat(a.width) - 3) < 0.6) issues.push('«' + W(T(e.querySelector('b'))) + '» draws the primary\\'s bar'); });
// three bodies, in the sheet (the confirmations are no dialog over the map)
if (!fileB || !conf || !ld || [fileB, conf, ld].some((b) => !b.closest('.sheet'))) issues.push('the file and the two confirmations are not all bodies of the sheet');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal')) issues.push('a dialog over the map (mapCentral)');
// the file as the «المزيد» panel's autosave row; the cells as the brief
{ const sc = [...fileB.querySelectorAll('.r-sc')].map((c) => [W(T(c.querySelector('dt'))), W(T(c.querySelector('dd')))]);
  if (sc.map((x) => x.join(':')).join('|') !== DATA.cells.map((x) => x.join(':')).join('|')) issues.push('the file\\'s cells are not the brief\\'s: ' + sc.map((x) => x.join(':')).join('، '));
  const g = (k) => (sc.find((x) => x[0] === k) || ['', ''])[1];
  if (g('التاريخ') !== date || !W(T(q('.r-sub'))).startsWith('حملة ' + s13.country) || nums(g('الحجم'))[0] !== s13.mb) issues.push('the file is not the «المزيد» panel\\'s autosave (' + date + '، ' + s13.country + '، ' + s13.mb + ' ميغابايت)'); }
// the autosave rotates over the decision's files
{ const n = W(T(fileB.querySelector('.r-sec .s-note'))); if (!/يتناوب/.test(n) || nums(n)[0] !== DATA.slots) issues.push('the rotation is not the decision\\'s ' + DATA.slots + ' files'); }
// the order: the file, loading (the primary), exporting, deleting
{ const rows = [...fileB.children].filter((e) => e.matches('.r-act, .r-link')).map((e) => W(T(e.querySelector('.r-at b'))));
  if (rows.join('|') !== 'تحميل هذا الحفظ|تصدير|حذف هذا الحفظ') issues.push('the actions are not load, export, delete in order: ' + rows.join('، '));
  const prim = [...fileB.querySelectorAll('.r-first')]; if (prim.length !== 1 || !prim[0].matches('.r-act') || W(T(prim[0].querySelector('b'))) !== 'تحميل هذا الحفظ') issues.push('loading is not the one primary action'); }
// loading says the date it returns to and that it replaces the game
{ const a = q('.r-body[data-tab="file"] .r-act'), l = W(T(a.querySelector('.r-at > span'))), al = a.getAttribute('aria-label') || '';
  if (!l.includes(date) || !/يحل محل اللعبة الحالية/.test(l) || !al.includes(date) || !/يحل محل اللعبة الحالية/.test(al)) issues.push('loading does not say its date (' + date + ') and that it replaces the game');
  if (!/\\. يفتح التأكيد$/.test(al)) issues.push('loading does not ask first (it should open its confirmation)'); }
// the load confirmation: the safe choice first and primary, the load second, saying the date and what is lost
{ const acts = [...ld.querySelectorAll('.r-act')];
  if (acts.length !== 2 || W(T(acts[0].querySelector('b'))) !== 'متابعة اللعب' || !acts[0].classList.contains('r-first') || acts[1].classList.contains('r-first') || W(T(acts[1].querySelector('b'))) !== 'تحميل') issues.push('the load confirmation is not «متابعة اللعب» (first, primary) then «تحميل»');
  else if (!(acts[1].getAttribute('aria-label') || '').includes(date) || acts[1].getBoundingClientRect().top < acts[0].getBoundingClientRect().bottom) issues.push('a11y: the final load does not name its date (' + date + '), or comes before the safe choice');
  const n = W(T(ld.querySelector('.s-note'))); if (!n.includes(date) || !/يضيع/.test(n)) issues.push('the load confirmation does not say the date (' + date + ') and what is lost'); }
// exporting through Files; every link says where it leads
{ const ex = [...fileB.querySelectorAll('.r-link')].find((e) => W(T(e.querySelector('b'))) === 'تصدير');
  if (!ex || !/تطبيق الملفات/.test(T(ex))) issues.push('exporting does not go through Files (the decision «saves»)'); }
qa('.sheet .r-link').forEach((e) => { if (!/\\. يفتح \\S/.test(e.getAttribute('aria-label') || '')) issues.push('a11y: the row «' + W(T(e.querySelector('b'))) + '» does not say where it leads'); });
// the mirror: the panel's, no folder chosen, so the delete says the file has no other copy
{ const dl = fileB.querySelector('.s-del'), m = dl ? W(T(dl.querySelector('.r-at > span'))) + ' ' + (dl.getAttribute('aria-label') || '') : '';
  if (s13.mirror !== 'لم يُختر مجلد' || (m.match(/لا نسخة له في مجلد آخر/g) || []).length !== 2) issues.push('the delete does not say, on screen and to VoiceOver, that the file has no other copy (the panel: ' + s13.mirror + ')'); }
// deleting: the red bin, the only red, on the delete rows alone; the text stays white
{ const red = X.TOK.red, dels = qa('.sheet .s-del');
  qa('.sheet svg.i').forEach((s) => { const isRed = getComputedStyle(s).color === red, onDel = !!s.closest('.s-del .r-tile');
    if (isRed !== onDel) issues.push(onDel ? 'a delete row\\'s bin is not red' : 'red outside the delete rows'); });
  const redIn = (c) => /242, 112, 90|color\\(srgb 0\\.949\\d* 0\\.439\\d* 0\\.35\\d*/.test(c || '');   // (rgb, or the color-mix of the red token)
  qa('.sheet *').forEach((e) => { const cs = getComputedStyle(e), outline = cs.boxShadow, deco = [cs.backgroundColor, cs.borderTopColor, cs.borderRightColor, cs.borderBottomColor, cs.borderLeftColor].filter((c, i) => i === 0 || parseFloat(cs['border' + ['Top', 'Right', 'Bottom', 'Left'][i - 1] + 'Width']) > 0);
    if (e.closest('svg')) return;
    if ((redIn(outline) && !e.matches('.r-act.s-del')) || deco.some(redIn)) issues.push('red outside the delete rows: ' + (e.className && e.className.baseVal === undefined ? e.className : e.tagName)); });
  const fin = conf.querySelector('.r-act.s-del'); if (!fin || !redIn(getComputedStyle(fin).boxShadow)) issues.push('the final delete has no red outline');
  dels.forEach((e) => { if (getComputedStyle(e.querySelector('b')).color !== X.TOK.t1) issues.push('a delete row\\'s title is not white'); if (!/حذف/.test(T(e.querySelector('b')))) issues.push('a red row that does not say it deletes'); });
  const d1 = fileB.querySelector('.s-del'); if (!d1 || !/يفتح التأكيد/.test(d1.getAttribute('aria-label') || '')) issues.push('deleting does not ask first (it should open the confirmation)'); }
// the confirmation: the safe choice first and primary, the delete second, naming the file, both 44 pt
{ const acts = [...conf.querySelectorAll('.r-act')];
  if (acts.length !== 2 || W(T(acts[0].querySelector('b'))) !== 'إبقاء الحفظ' || !acts[0].classList.contains('r-first') || acts[1].classList.contains('r-first') || !acts[1].classList.contains('s-del')) issues.push('the confirmation is not «إبقاء الحفظ» (first, primary) then the delete');
  else { if (!(acts[1].getAttribute('aria-label') || '').includes(date)) issues.push('a11y: the final delete does not name the file (' + date + ')');
    if (acts[1].getBoundingClientRect().top < acts[0].getBoundingClientRect().bottom) issues.push('the delete is not after the safe choice'); }
  const n = W(T(conf.querySelector('.s-note'))); if (!n.includes(date) || !n.includes(s13.country) || nums(n).indexOf(s13.mb) < 0) issues.push('the confirmation does not name the file (' + date + '، ' + s13.country + '، ' + s13.mb + ')'); }
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'المزيد', tabs: ['file', 'confirm', 'load'], noTabs: true, fitTab: 'file', longTab: 'file',
  inputs: ['_build/save.css', '../../screen13/A/_build/sheet.html', '../../../decisions/decisions.json'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [], size: [], radius: {} },
  HEAD, BRIEF, screenChecks, DATA: { s13: S13, slots: SLOTS, cells: CELLS },
  // (the «المزيد» grey is the text grey itself: the identity rules that tell chrome from data are skipped, as screen 13;
  //  the plants aimed at headline numbers, chips and the «لماذا؟» link have nothing to aim at and are moved to this sheet;
  //  both bodies fit whole on every phone, so the scroll-hint plants run with a forced overflow and
  //  the bottom fade it would set)
  skipGeneric: ['section colour on data', 'section colour on a rule', 'closed dock item coloured', 'brief text hidden', '18 pt misuse', 'gap', 'text overlap', 'clipped text', 'faint text', 'why without its subject', 'amber value without its icon', 'chip arrow against its sign', '% before its number', 'text into a control', 'emblem drawn grey', 'chip not white', 'hint chevron missing (no tabs)', 'hint over the content (no tabs)'],
  cases: (d, se) => [
    ['brief text hidden (file)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-body[data-tab="file"] .r-act .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (file)', d, '', '.r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['text overlap (file)', d, '', '.r-body[data-tab="file"] .r-act .r-at > span { transform: translateY(-14px) !important; }', /text overlap|icon over text|hit overlap/],
    ['clipped text (file)', d, '', '.r-body[data-tab="file"] .r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding|a cell runs out/],
    ['faint text (file)', d, '', '.r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['gap (file)', d, '', '.r-body[data-tab="file"] { gap: 6px !important; }', /gap 6 on/],
    ['% before its number (file)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="file"] .s-note').textContent = 'نسبة 20%'; }],
    ['hint chevron missing (forced overflow)', se, '', '.r-body[data-tab="file"] > :first-child { margin-top: 200px !important; } .r-hint { display: none !important; }', /scroll hint chevron missing with content below/, () => { document.documentElement.dataset.fbot = '1'; }],
    ['hint over the content (forced overflow)', se, '', '.r-body[data-tab="file"] > :first-child { margin-top: 200px !important; } .r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/, () => { document.documentElement.dataset.fbot = '1'; }],
    ['text into a control (header)', d, '', '.r-sub { position: relative; left: -170px; }', /text over a control/],
    ['two bodies shown', d, '&tab=confirm', '.r-body[data-tab="file"] { display: flex !important; }', /tab bodies shown/],
    ['file not the panel\'s', d, '', '', /the file is not the «المزيد» panel's autosave|the file's cells/, () => { document.querySelectorAll('.r-body[data-tab="file"] .r-sc dd .ltr')[2].textContent = '3'; }],
    ['rotation off', d, '', '', /the rotation is not the decision's 3 files/, () => { document.querySelector('.r-body[data-tab="file"] .r-sec .s-note .ltr').textContent = '5'; }],
    ['actions reordered', d, '&scroll=end', '', /the actions are not load, export, delete/, () => { const b = document.querySelector('.r-body[data-tab="file"]'), l = b.querySelectorAll('.r-link'); b.insertBefore(l[1], l[0]); }],
    ['two primaries', d, '', '', /loading is not the one primary action/, () => { document.querySelector('.r-body[data-tab="file"] .r-link').classList.add('r-first'); }],
    ['load date unsaid', d, '', '', /loading does not say its date/, () => { const a = document.querySelector('.r-body[data-tab="file"] .r-act'); a.setAttribute('aria-label', 'تحميل هذا الحفظ'); }],
    ['export not through Files', d, '&scroll=end', '', /exporting does not go through Files/, () => { document.querySelector('.r-body[data-tab="file"] .r-link .r-at > span').textContent = 'ملف واحد'; }],
    ['link leads nowhere', d, '&scroll=end', '', /a11y: the row «تصدير» does not say where it leads/, () => { document.querySelector('.r-body[data-tab="file"] .r-link').setAttribute('aria-label', 'تصدير'); }],
    ['mirror unsaid', d, '&scroll=end', '', /the delete does not say, on screen and to VoiceOver, that the file has no other copy/, () => { document.querySelector('.r-body[data-tab="file"] .s-del .r-at > span').textContent = 'من هذا الجهاز · لا يمكن التراجع'; }],
    ['bin not red', d, '&scroll=end', '.s-del .r-tile { color: var(--t1) !important; }', /a delete row's bin is not red/],
    ['red elsewhere', d, '', '.r-act.r-first .r-tile { color: var(--red) !important; }', /red outside the delete rows/],
    ['delete title red', d, '&scroll=end', '.s-del b { color: var(--red) !important; }', /a delete row's title is not white/],
    ['delete without asking', d, '&scroll=end', '', /deleting does not ask first/, () => { document.querySelector('.r-body[data-tab="file"] .s-del').setAttribute('aria-label', 'حذف هذا الحفظ: من هذا الجهاز. يفتح الحذف'); }],
    ['confirm in a dialog', d, '&tab=confirm', '', /a dialog over the map/, () => { document.querySelector('.r-body[data-tab="confirm"]').setAttribute('role', 'alertdialog'); }],
    ['load without asking', d, '', '', /loading does not ask first/, () => { const a = document.querySelector('.r-body[data-tab="file"] .r-act'); a.setAttribute('aria-label', a.getAttribute('aria-label').replace('. يفتح التأكيد', '')); }],
    ['load first', d, '&tab=load', '', /the load confirmation is not «متابعة اللعب»/, () => { const b = document.querySelector('.r-body[data-tab="load"]'), a = b.querySelectorAll('.r-act'); b.insertBefore(a[1], a[0]); }],
    ['load undated', d, '&tab=load', '', /a11y: the final load does not name its date/, () => { document.querySelectorAll('.r-body[data-tab="load"] .r-act')[1].setAttribute('aria-label', 'تحميل'); }],
    ['loss unsaid', d, '&tab=load', '', /the load confirmation does not say the date \(1 يناير 2011\) and what is lost/, () => { document.querySelector('.r-body[data-tab="load"] .s-note').textContent = 'تعود الحملة إلى 1 يناير 2011.'; }],
    ['delete first', d, '&tab=confirm', '', /the confirmation is not «إبقاء الحفظ»/, () => { const b = document.querySelector('.r-body[data-tab="confirm"]'), a = b.querySelectorAll('.r-act'); b.insertBefore(a[1], a[0]); }],
    ['delete unnamed', d, '&tab=confirm', '', /a11y: the final delete does not name the file/, () => { document.querySelector('.r-body[data-tab="confirm"] .s-del').setAttribute('aria-label', 'حذف نهائيًا'); }],
    ['confirm note unnamed', d, '&tab=confirm', '', /the confirmation does not name the file/, () => { document.querySelector('.r-body[data-tab="confirm"] .s-note').textContent = 'سيُحذف هذا الحفظ نهائيًا.'; }],
    ['wrong flag', d, '', '', /the header flag is not the campaign's/, () => { document.querySelector('.r-flag img').setAttribute('src', '../../shared/flags/ly.svg'); }],
    ['emblem not the save', d, '', '', /the emblem is not the save/, () => { document.querySelector('.s-emb use').setAttribute('href', '#i-trash'); }],
    ['close elsewhere', d, '', '', /a11y: the close is not «إغلاق، العودة إلى الحفظ»/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق، العودة إلى الخريطة'); }],
    ['primary bar gone', d, '', '.r-first::after { content: none !important; }', /does not draw its white bar/],
    ['bar on the delete', d, '&tab=confirm', '.r-act.s-del::after { content: ""; position: absolute; top: 8px; bottom: 8px; right: 0; width: 3px; background: rgb(234, 242, 247); }', /«حذف نهائيًا» draws the primary's bar/],
    ['red outline elsewhere', d, '&tab=load', '.r-act.r-first { box-shadow: inset 0 0 0 1px rgba(242, 112, 90, .45) !important; }', /red outside the delete rows/],
    ['red fill elsewhere', d, '', '.r-act.r-first .r-tile { background: rgb(242, 112, 90) !important; }', /red outside the delete rows/],
    ['final delete without its outline', d, '&tab=confirm', '.r-act.s-del { box-shadow: inset 0 0 0 1px rgba(255, 255, 255, .08) !important; }', /the final delete has no red outline/],
  ],
});
