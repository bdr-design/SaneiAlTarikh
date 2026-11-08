// Screen 25 variant A (the save mirror prompt, D-28): render the iPhones and run the checks with the shared panel
// checker (design/shared/check/panelcheck.js), in the «المزيد» section. This file adds the sheet's own rules: its title
// the saves tab's mirror row (which opens it, no folder chosen yet) and its date the «حفظ الآن» row's; the ask says the
// saves are on this device only and lost with the game, and asks once, naming an example folder; picking opens the
// system's folder picker; «ليس الآن» says it will not ask again and where the row is; the chosen folder and what is copied,
// as often as §7 says; a folder gone says so and that saving goes on without a copy; the safe or forward choice first and
// primary in each body (the one white bar); no red; nothing in a dialog over the map.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');

const S13 = (() => { const raw = fs.readFileSync(path.join(OUT, '../../screen13/A/_build/sheet.html'), 'utf8');
  const now = raw.match(/aria-label="حفظ الآن: حفظ جديد باسم (\S+)، (\d+) (\S+) (\d{4})"/),
    mir = raw.match(/aria-label="(نسخة في مجلد آخر): (لم يُختر مجلد)، [^"]*\. (يفتح اختيار المجلد)"/),
    tab = raw.match(/data-for="saves"><svg class="i"><use href="#i-save"\/><\/svg><span>([^<]+)<\/span>/);
  if (!now || !mir || !tab) throw new Error('cannot read the «المزيد» panel\'s saves tab');
  return { country: now[1], date: now[2] + ' ' + now[3] + ' ' + now[4], title: mir[1], mirror: mir[2], opens: mir[3], tab: tab[1] }; })();
const EVERY = (() => { const doc = fs.readFileSync(path.join(OUT, '../../../design_doc/final_design.md'), 'utf8');
  const m = doc.match(/It copies the manual saves and the newest autosave that changed since the last copy, at most once every (\d+) real minutes/);
  if (!m) throw new Error('cannot read §7 «Mirror»'); return +m[1]; })();
const HEAD = ['نسخة احتياطية', 'حملة مصر · حُفظ الآن'];
const CELLS = [['المجلد', 'صانع التاريخ'], ['المكان', 'iCloud Drive']];
const BRIEF = {
  ask: HEAD.concat(['احمِ حفظك', 'اختيار مجلد', 'مرة واحدة · مثل iCloud Drive', 'ليس الآن', 'لن يُعرض مرة أخرى · المجلد لاحقًا من الحفظ']),
  reach_ask: ['الحفظ في هذا الجهاز فقط، ويضيع إذا حُذفت اللعبة. اختر مجلدًا مرة واحدة، مثل iCloud Drive، فتُنسخ إليه ملفات الحفظ تلقائيًا.'],
  done: HEAD.concat(['تُنسخ ملفات الحفظ', 'تم', 'العودة إلى الحفظ', 'تغيير المجلد', 'يفتح منتقي المجلدات']),
  reach_done: CELLS.flat().concat(['نُسخ هذا الحفظ الآن. بعده يُنسخ كل حفظ يدوي وأحدث حفظ تلقائي عند الحفظ أو الخروج من اللعبة، مرة كل 10 دقائق على الأكثر.']),
  stale: HEAD.concat(['المجلد غير متاح', 'اختيار المجلد مرة أخرى', 'يفتح منتقي المجلدات', 'ليس الآن', 'يبقى الحفظ في هذا الجهاز فقط حتى يعود المجلد']),
  own: HEAD.concat(['اختر مجلدًا آخر', 'اختيار مجلد', 'خارج اللعبة · مثل iCloud Drive', 'ليس الآن', 'لن يُعرض مرة أخرى · المجلد لاحقًا من الحفظ']),
  reach_own: ['هذا المجلد يُحذف مع اللعبة. اختر مجلدًا خارجها، مثل iCloud Drive.'],
  reach_stale: ['لا تصل اللعبة إلى مجلد صانع التاريخ في iCloud Drive؛ ربما حُذف، أو أُوقف iCloud Drive. الحفظ مستمر في هذا الجهاز، لكن دون نسخة.'],
};

const screenChecks = `
const { issues, qa, q, T, nums, DATA } = X;
const W = (s) => (s || '').replace(/\\s+/g, ' ').trim();
const s13 = DATA.s13;
const ask = q('.r-body[data-tab="ask"]'), done = q('.r-body[data-tab="done"]'), stale = q('.r-body[data-tab="stale"]'), own = q('.r-body[data-tab="own"]');
const acts = (b) => [...b.children].filter((e) => e.matches('.r-act, .r-link'));
const bt = (e) => W(T(e.querySelector('.r-at b'))), st = (e) => W(T(e.querySelector('.r-at > span'))), al = (e) => e.getAttribute('aria-label') || '';
// the header: the saves tab's mirror row (title), the campaign (flag, country) and the save just made (its date)
// (the title is short, «نسخة احتياطية»: the row's own «نسخة في مجلد آخر» runs onto the bright part of the section's header
//  image; the body says what the copy is and where it goes)
if (W(T(q('.sheet .r-name'))) !== DATA.title || s13.title !== 'نسخة في مجلد آخر' || s13.mirror !== 'لم يُختر مجلد' || s13.opens !== 'يفتح اختيار المجلد') issues.push('the title is not «' + DATA.title + '», or the saves tab\\'s mirror row is not «نسخة في مجلد آخر» with no folder chosen, opening the folder choice');
if (W(T(q('.sheet .r-sub'))) !== 'حملة ' + s13.country + ' · حُفظ الآن') issues.push('the header does not name the campaign and the save just made (حملة ' + s13.country + ' · حُفظ الآن: the real time, as screen 23)');
// one word for the files: «ملفات الحفظ» (screen 13), never «الحفظات»; a product name never splits over two lines
if (/الحفظات/.test(T(q('.sheet')))) issues.push('«الحفظات»: the files are «ملفات الحفظ» (screen 13)');
qa('.sheet .ltr').forEach((e) => { const tops = new Set([...e.getClientRects()].map((r) => Math.round(r.top))); if (tops.size > 1) issues.push('«' + W(T(e)) + '» splits over two lines'); });
{ const f = q('.sheet .r-flag img'); if (!f || !(f.getAttribute('src') || '').endsWith('/eg.svg') || f.getAttribute('alt') !== 'علم ' + s13.country) issues.push('the header flag is not the campaign\\'s (' + s13.country + ')'); }
if (!q('.sheet .s-emb use[href="#i-folder"]')) issues.push('the emblem is not the folder');
if (q('.sheet .r-x').getAttribute('aria-label') !== 'إغلاق، العودة إلى ' + s13.tab) issues.push('a11y: the close is not «إغلاق، العودة إلى ' + s13.tab + '»');
// the primary's white bar: drawn on every .r-first, on no other row
qa('.sheet .r-act, .sheet .r-link').forEach((e) => { const a = getComputedStyle(e, '::after'), drawn = a.content !== 'none' && a.content !== 'normal' && parseFloat(a.width) > 0 && a.backgroundColor !== 'rgba(0, 0, 0, 0)';
  if (e.classList.contains('r-first') && !(drawn && Math.abs(parseFloat(a.width) - 3) < 0.1 && a.backgroundColor === X.TOK.t1)) issues.push('the primary «' + bt(e) + '» does not draw its white bar');
  if (!e.classList.contains('r-first') && drawn && Math.abs(parseFloat(a.width) - 3) < 0.6) issues.push('«' + bt(e) + '» draws the primary\\'s bar'); });
// three bodies, in the sheet; no dialog over the map
if (!ask || !done || !stale || !own || [ask, done, stale, own].some((b) => !b.closest('.sheet'))) issues.push('the ask, the chosen folder, the folder gone and the folder refused are not all bodies of the sheet');
if (document.querySelector('[role="dialog"], [role="alertdialog"], dialog, .modal')) issues.push('a dialog over the map (mapCentral)');
// each body: two actions, the first the one primary, in the brief's order
[[ask, 'اختيار مجلد|ليس الآن'], [done, 'تم|تغيير المجلد'], [stale, 'اختيار المجلد مرة أخرى|ليس الآن'], [own, 'اختيار مجلد|ليس الآن']].forEach(([b, want]) => { if (!b) return; const a = acts(b);
  if (a.map(bt).join('|') !== want || a.some((e, i) => e.classList.contains('r-first') !== (i === 0)) || a.some((e) => !e.matches('.r-act')))
    issues.push('the «' + b.dataset.tab + '» actions are not ' + want.replace('|', ' (primary) then ') + ': ' + a.map(bt).join('، '));
  if (a.length === 2 && a[1].getBoundingClientRect().top < a[0].getBoundingClientRect().bottom) issues.push('the «' + b.dataset.tab + '» second action is not under the first'); });
// the ask: this device only, lost with the game, picked once, an example folder; picking opens the system's folder picker
{ const n = W(T(ask.querySelector('.s-note')));
  if (!/في هذا الجهاز فقط/.test(n) || !/يضيع إذا حُذفت اللعبة/.test(n) || !/مرة واحدة/.test(n) || !/iCloud Drive/.test(n) || !/تلقائيًا/.test(n)) issues.push('the ask does not say: this device only, lost if the game is deleted, picked once (an example folder), copied automatically');
  const a = acts(ask);
  if (a[0] && !/\\. يفتح منتقي المجلدات$/.test(al(a[0]))) issues.push('a11y: «اختيار مجلد» does not say it opens the folder picker');
  if (a[1] && (!/لن يُعرض مرة أخرى/.test(st(a[1])) || !/لن يُعرض هذا مرة أخرى/.test(al(a[1])) || !st(a[1]).endsWith('المجلد لاحقًا من ' + s13.tab) || !al(a[1]).endsWith('المجلد لاحقًا من ' + s13.tab))) issues.push('«ليس الآن» does not say it asks once and where the folder is picked later (' + s13.tab + ')'); }
// the chosen folder: its name and place; what is copied and how often (§7)
{ const sc = [...done.querySelectorAll('.r-sc')].map((c) => [W(T(c.querySelector('dt'))), W(T(c.querySelector('dd')))]);
  if (sc.map((x) => x.join(':')).join('|') !== DATA.cells.map((x) => x.join(':')).join('|')) issues.push('the chosen folder\\'s cells are not the brief\\'s: ' + sc.map((x) => x.join(':')).join('، '));
  const n = W(T(done.querySelector('.s-note')));
  if (!/^نُسخ هذا الحفظ الآن\\./.test(n)) issues.push('the chosen folder does not say the save just made is copied now');
  if (!/كل حفظ يدوي/.test(n) || !/أحدث حفظ تلقائي/.test(n) || nums(n)[0] !== DATA.every || !/على الأكثر/.test(n) || !/عند الحفظ أو الخروج من اللعبة/.test(n)) issues.push('the chosen folder does not say what is copied and how often (§7: every manual save and the newest autosave, on saving or leaving, at most once every ' + DATA.every + ' minutes)'); }
// the folder gone: names the folder, says saving goes on without a copy; picking again opens the picker
{ const n = W(T(stale.querySelector('.s-note'))), f = DATA.cells[0][1], p = DATA.cells[1][1];
  if (!n.includes(f) || !n.includes(p) || !/الحفظ مستمر في هذا الجهاز/.test(n) || !/دون نسخة/.test(n)) issues.push('the folder gone does not name the folder (' + f + '، ' + p + ') and say saving goes on without a copy');
  const a = acts(stale); if (a[0] && !/يفتح منتقي المجلدات$/.test(al(a[0]))) issues.push('a11y: picking again does not say it opens the folder picker');
  if (a[1] && (!/في هذا الجهاز فقط حتى يعود المجلد$/.test(st(a[1])) || !/في هذا الجهاز فقط حتى يعود المجلد$/.test(al(a[1])))) issues.push('«ليس الآن» on a folder gone does not say saves stay on this device only until the folder is back'); }
// the folder refused (a folder inside the game's own container): says why, at once to VoiceOver (a status), and asks
// again for a folder outside the game; «ليس الآن» as on the ask
{ const n = q('.r-body[data-tab="own"] .s-note'), t = W(T(n)), a = acts(own);
  if (!/^هذا المجلد يُحذف مع اللعبة\./.test(t) || !/خارجها/.test(t) || !/iCloud Drive/.test(t) || n.getAttribute('role') !== 'status') issues.push('the folder refused does not say, first and to VoiceOver at once, that the folder is deleted with the game and to pick one outside it');
  if (a[0] && (!/خارج اللعبة/.test(st(a[0])) || !/\\. يفتح منتقي المجلدات$/.test(al(a[0])))) issues.push('the folder refused: picking again does not say «خارج اللعبة» and that it opens the folder picker');
  if (a[1] && a[1].getAttribute('aria-label') !== acts(ask)[1].getAttribute('aria-label')) issues.push('the folder refused: «ليس الآن» is not the ask\\'s'); }
// every row that opens the picker says so, on screen or to VoiceOver; the change of folder too
{ const ch = acts(done)[1]; if (ch && !/يفتح منتقي المجلدات$/.test(al(ch))) issues.push('a11y: «تغيير المجلد» does not say it opens the folder picker'); }
// no red here (nothing is deleted): no red icon (colour, stroke, fill), text, fill, border, outline or shadow, on the
// elements and their ::before / ::after
{ const redIn = (c) => /242, 112, 90|color\\(srgb 0\\.949\\d* 0\\.439\\d* 0\\.35\\d*/.test(c || '');
  const props = ['color', 'backgroundColor', 'boxShadow', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor'];
  const shown = (cs, k) => k.startsWith('border') ? parseFloat(cs[k.replace('Color', 'Width')]) > 0 : k === 'outlineColor' ? cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0 : true;
  qa('.sheet svg.i').forEach((sv) => { const cs = getComputedStyle(sv); if ([cs.color, cs.stroke, cs.fill].some(redIn)) issues.push('red in the mirror sheet (nothing is deleted): an icon'); });
  qa('.sheet svg *').forEach((el) => { const cs = getComputedStyle(el); if ([cs.stroke, cs.fill].some(redIn)) issues.push('red in the mirror sheet (nothing is deleted): an icon\\'s ' + el.tagName); });
  qa('.sheet *').forEach((e) => { if (e.closest('svg')) return; [null, '::before', '::after'].forEach((pe) => { const cs = getComputedStyle(e, pe);
    if (pe && (cs.content === 'none' || cs.content === 'normal')) return;
    if (props.some((k) => shown(cs, k) && redIn(cs[k]))) issues.push('red in the mirror sheet: ' + (e.className && e.className.baseVal === undefined ? e.className : e.tagName) + (pe || '')); }); }); }`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'المزيد', tabs: ['ask', 'done', 'stale', 'own'], noTabs: true, fitTab: 'ask', longTab: 'ask',
  inputs: ['_build/mirror.css', '../../screen13/A/_build/sheet.html', '../../../design_doc/final_design.md'],
  TOK: { sec: 'rgb(169, 188, 203)', ctlH: {}, sheetIcon: [], size: [], radius: {} },
  HEAD, BRIEF, screenChecks, DATA: { s13: S13, every: EVERY, cells: CELLS, title: 'نسخة احتياطية' },
  // (the «المزيد» grey is the text grey itself: the identity rules that tell chrome from data are skipped, as screens 13
  //  and 23; the plants aimed at headline numbers, chips and the «لماذا؟» link have nothing to aim at and are moved to
  //  this sheet; every body fits whole on every phone, so the scroll-hint plants run with a forced overflow)
  skipGeneric: ['section colour on data', 'section colour on a rule', 'closed dock item coloured', 'brief text hidden', '18 pt misuse', 'gap', 'text overlap', 'clipped text', 'faint text', 'why without its subject', 'amber value without its icon', 'chip arrow against its sign', '% before its number', 'text into a control', 'emblem drawn grey', 'chip not white', 'hint chevron missing (no tabs)', 'hint over the content (no tabs)'],
  cases: (d, se) => [
    ['brief text hidden (ask)', d, '', '', /brief text not fully visible/, () => { document.querySelector('.r-body[data-tab="ask"] .r-act .r-at b').style.opacity = '0'; }],
    ['18 pt misuse (ask)', d, '', '.r-at > span { font-size: 18px !important; font-weight: 700 !important; }', /18 pt is for/],
    ['text overlap (ask)', d, '', '.r-body[data-tab="ask"] .r-act .r-at > span { transform: translateY(-14px) !important; }', /text overlap|icon over text|hit overlap/],
    ['clipped text (ask)', d, '', '.r-body[data-tab="ask"] .r-sec { margin-inline-start: -40px !important; }', /clipped text \(sides\)|text outside the sheet's 12 pt padding|a cell runs out/],
    ['faint text (ask)', d, '', '.r-at > span { opacity: .35 !important; }', /^contrast [0-3](\.\d+)? for/],
    ['gap (ask)', d, '', '.r-body[data-tab="ask"] { gap: 6px !important; }', /gap 6 on/],
    ['% before its number (ask)', d, '', '', /% shown before its number/, () => { document.querySelector('.r-body[data-tab="ask"] .s-note').textContent = 'نسبة 20%'; }],
    ['hint chevron missing (forced overflow)', se, '', '.r-body[data-tab="ask"] > :first-child { margin-top: 200px !important; } .r-hint { display: none !important; }', /scroll hint chevron missing with content below/, () => { document.documentElement.dataset.fbot = '1'; }],
    ['hint over the content (forced overflow)', se, '', '.r-body[data-tab="ask"] > :first-child { margin-top: 200px !important; } .r-hint { bottom: 150px !important; }', /scroll hint not centred in the clear strip/, () => { document.documentElement.dataset.fbot = '1'; }],
    ['text into a control (header)', d, '', '.r-sub { position: relative; left: -170px; }', /text over a control/],
    ['two bodies shown', d, '&tab=done', '.r-body[data-tab="ask"] { display: flex !important; }', /tab bodies shown/],
    ['title not the row\'s', d, '', '', /the title is not «نسخة احتياطية»/, () => { document.querySelector('.sheet .r-name').textContent = 'نسخة في مجلد آخر'; }],
    ['header date off', d, '', '', /the header does not name the campaign and the save just made/, () => { document.querySelector('.sheet .r-sub').textContent = 'حملة مصر · حُفظ 1 يناير 2011'; }],
    ['«الحفظات»', d, '&tab=done', '', /«الحفظات»: the files are «ملفات الحفظ»/, () => { document.querySelector('.r-body[data-tab="done"] h3').textContent = 'تُنسخ الحفظات'; }],
    ['product name split', d, '', '.s-note .ltr { white-space: normal !important; }', /splits over two lines/, () => { document.querySelector('.r-body[data-tab="ask"] .s-note .ltr').textContent = 'iCloud Drive iCloud Drive iCloud Drive iCloud Drive iCloud Drive iCloud Drive'; }],
    ['copied now unsaid', d, '&tab=done', '', /the chosen folder does not say the save just made is copied now/, () => { const n = document.querySelector('.r-body[data-tab="done"] .s-note'); n.firstChild.textContent = n.firstChild.textContent.replace('نُسخ هذا الحفظ الآن. ', ''); }],
    ['refused: reason unsaid', d, '&tab=own', '', /the folder refused does not say/, () => { document.querySelector('.r-body[data-tab="own"] .s-note').removeAttribute('role'); }],
    ['refused: inside again', d, '&tab=own', '', /the folder refused: picking again does not say/, () => { document.querySelector('.r-body[data-tab="own"] .r-first .r-at > span').textContent = 'مرة واحدة'; }],
    ['refused: later differs', d, '&tab=own', '', /the folder refused: «ليس الآن» is not the ask's/, () => { document.querySelectorAll('.r-body[data-tab="own"] .r-act')[1].setAttribute('aria-label', 'ليس الآن'); }],
    ['refused reordered', d, '&tab=own', '', /the «own» actions are not/, () => { const b = document.querySelector('.r-body[data-tab="own"]'), a = b.querySelectorAll('.r-act'); b.insertBefore(a[1], a[0]); }],
    ['name split in a row', d, '', '.sheet .ltr { white-space: normal !important; } .r-at > span { white-space: normal !important; }', /splits over two lines/, () => { document.querySelector('.r-body[data-tab="ask"] .r-first .r-at .ltr').textContent = 'iCloud Drive iCloud Drive iCloud Drive iCloud Drive iCloud Drive iCloud Drive'; }],
    ['red path in an icon', d, '', '.r-first .r-tile svg.i use { stroke: rgb(242, 112, 90) !important; }', /an icon's use/],
    ['second above the first', d, '', '.r-body[data-tab="ask"] .r-act:not(.r-first) { order: -1; }', /the «ask» second action is not under the first/],
    ['wrong flag', d, '', '', /the header flag is not the campaign's/, () => { document.querySelector('.r-flag img').setAttribute('src', '../../shared/flags/ly.svg'); }],
    ['emblem not the folder', d, '', '', /the emblem is not the folder/, () => { document.querySelector('.s-emb use').setAttribute('href', '#i-save'); }],
    ['close elsewhere', d, '', '', /a11y: the close is not «إغلاق، العودة إلى الحفظ»/, () => { document.querySelector('.r-x').setAttribute('aria-label', 'إغلاق، العودة إلى الخريطة'); }],
    ['primary bar gone', d, '', '.r-first::after { content: none !important; }', /does not draw its white bar/],
    ['bar on the second', d, '&tab=stale', '.r-body[data-tab="stale"] .r-act:not(.r-first)::after { content: ""; position: absolute; top: 8px; bottom: 8px; right: 0; width: 3px; background: rgb(234, 242, 247); }', /«ليس الآن» draws the primary's bar/],
    ['ask in a dialog', d, '', '', /a dialog over the map/, () => { document.querySelector('.r-body[data-tab="ask"]').setAttribute('role', 'alertdialog'); }],
    ['ask reordered', d, '', '', /the «ask» actions are not/, () => { const b = document.querySelector('.r-body[data-tab="ask"]'), a = b.querySelectorAll('.r-act'); b.insertBefore(a[1], a[0]); }],
    ['two primaries', d, '&tab=done', '', /the «done» actions are not/, () => { document.querySelectorAll('.r-body[data-tab="done"] .r-act')[1].classList.add('r-first'); }],
    ['stale primary lost', d, '&tab=stale', '', /the «stale» actions are not/, () => { document.querySelector('.r-body[data-tab="stale"] .r-first').classList.remove('r-first'); }],
    ['risk unsaid', d, '', '', /the ask does not say: this device only/, () => { document.querySelector('.r-body[data-tab="ask"] .s-note').textContent = 'اختر مجلدًا مرة واحدة، مثل iCloud Drive، فتُنسخ إليه الحفظات تلقائيًا.'; }],
    ['picker unsaid', d, '', '', /a11y: «اختيار مجلد» does not say it opens the folder picker/, () => { document.querySelector('.r-body[data-tab="ask"] .r-first').setAttribute('aria-label', 'اختيار مجلد: مرة واحدة، مثل iCloud Drive'); }],
    ['not now unclear', d, '', '', /«ليس الآن» does not say it asks once and where the folder is picked later/, () => { document.querySelectorAll('.r-body[data-tab="ask"] .r-act')[1].querySelector('.r-at > span').textContent = 'لاحقًا'; }],
    ['cells off', d, '&tab=done', '', /the chosen folder's cells are not the brief's/, () => { document.querySelectorAll('.r-body[data-tab="done"] .r-sc dd')[1].textContent = 'هذا الجهاز'; }],
    ['frequency off', d, '&tab=done', '', /the chosen folder does not say what is copied and how often/, () => { document.querySelector('.r-body[data-tab="done"] .s-note .ltr').textContent = '5'; }],
    ['change unsaid', d, '&tab=done', '', /a11y: «تغيير المجلد» does not say it opens the folder picker/, () => { document.querySelectorAll('.r-body[data-tab="done"] .r-act')[1].setAttribute('aria-label', 'تغيير المجلد'); }],
    ['stale unnamed', d, '&tab=stale', '', /the folder gone does not name the folder/, () => { document.querySelector('.r-body[data-tab="stale"] .s-note').textContent = 'لا تصل اللعبة إلى المجلد. الحفظ مستمر في هذا الجهاز، لكن دون نسخة.'; }],
    ['repick unsaid', d, '&tab=stale', '', /a11y: picking again does not say it opens the folder picker/, () => { document.querySelector('.r-body[data-tab="stale"] .r-first').setAttribute('aria-label', 'اختيار المجلد مرة أخرى'); }],
    ['stale later unclear', d, '&tab=stale', '', /«ليس الآن» on a folder gone does not say saves stay on this device only/, () => { document.querySelectorAll('.r-body[data-tab="stale"] .r-act')[1].querySelector('.r-at > span').textContent = 'لاحقًا'; }],
    ['red icon', d, '&tab=stale', '.r-body[data-tab="stale"] .r-first .r-tile svg.i { color: var(--red) !important; }', /red in the mirror sheet \(nothing is deleted\): an icon/],
    ['red icon stroke', d, '', '.r-first .r-tile svg.i { stroke: rgb(242, 112, 90) !important; }', /red in the mirror sheet \(nothing is deleted\): an icon/],
    ['red tile', d, '&tab=stale', '.r-body[data-tab="stale"] .r-first .r-tile { color: var(--red) !important; }', /red in the mirror sheet/],
    ['red outline (outline)', d, '', '.r-act.r-first { outline: 2px solid rgb(242, 112, 90) !important; outline-offset: -2px; }', /red in the mirror sheet: .*r-act/],
    ['red divider', d, '&tab=done', '.r-sc:nth-child(odd)::after { background: rgb(242, 112, 90) !important; }', /red in the mirror sheet: r-sc::after/],
    ['red rule', d, '&tab=done', '.r-st { border-bottom-color: rgb(242, 112, 90) !important; }', /red in the mirror sheet: r-st/],
    ['red outline', d, '', '.r-act.r-first { box-shadow: inset 0 0 0 1px rgba(242, 112, 90, .45) !important; }', /red in the mirror sheet/],
  ],
});
