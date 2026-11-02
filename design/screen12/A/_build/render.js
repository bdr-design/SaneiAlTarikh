// Screen 12 variant A (the research panel «البحث»): render the iPhones and run the checks, with the shared panel checker
// (design/shared/check/panelcheck.js: every generic rule of the approved panels). Writes <id>.png (the overview) to the
// variant folder; each tab's top and end, <id>_hit.png and report.json to _build. This file adds the panel's own rules:
// the brief's strings per tab; the research rate = the HUD's; the 8 domains of §5.7, each bar at its level out of 15 and
// read whole; their mean = the headline; the focus = the header chip = the project under way; the progress bar at its
// share; agreements read whole. Pairs, not loose strings: each headline's label, value and line; each domain's name and
// level in order; the focus one row, the header's, at its level, the project toward its next level; the research trend
// the HUD's arrow; the bars on one track; each agreement's name and line under its own section.
// Usage: NODE_PATH=.../node_modules node render.js [ids...]   (default: all 7)   |   node render.js --selftest
const path = require('path');
const OUT = path.resolve(__dirname, '..');

const HEAD = ['البحث', 'التركيز: الطاقة', 'مصر · 8 مجالات', 'نظرة عامة', 'المجالات', 'التعاون'];
const DOMS = [['الطاقة', 4], ['الصناعة والتصنيع', 4], ['الصحة والزراعة', 4], ['الأنظمة البرية', 4], ['الحاسوب والإلكترونيات', 3], ['الجو والبحر والفضاء', 3], ['الصواريخ والردع', 3], ['السيبراني والاستخبارات', 4]];
// each headline's label, value and line (a swap cannot pass); each agreement's name and line, under its section
const KPIS = [['البحث', '+18 شهريًا', '+1 شهريًا'], ['الإنفاق', '700 مليون $', '0.3% من الناتج'], ['المتوسط', '3.6 / 15', 'من 8 مجالات']];
const TIES = [['اتفاقيات التعاون', 'روسيا · الطاقة النووية السلمية', 'اتفاقية تعاون منذ 2008'], ['اتفاقيات التعاون', 'أوكرانيا · الأقمار الصناعية', 'قمر رصد أُطلق 2007 · فُقد الاتصال به 2010'],
  ['اتفاقيات التعاون', 'الاتحاد الأوروبي · البحث العلمي', 'برامج تمويل مشتركة'], ['التراخيص', 'الولايات المتحدة · تجميع دبابات', 'منذ 1992']];
const BRIEF = {
  overview: HEAD.concat(['البحث', '+18', 'شهريًا', '+1 شهريًا', 'الإنفاق', '700', 'مليون $', '0.3% من الناتج', 'المتوسط', '3.6', '/ 15', 'من 8 مجالات', 'لماذا؟']),
  reach_overview: ['قيد البحث', 'الطاقة · نحو المستوى 5', 'يكتمل بعد 14 شهرًا', '62%', 'رفع الإنفاق على البحث', '300 مليون $ سنويًا', 'البحث +8'],
  domains: HEAD.concat(['المجالات · من 15 مستوى', 'الطاقة']),
  reach_domains: ['المجالات · من 15 مستوى'].concat(DOMS.map((x) => x[0]), ['المستويات 1–7 حتى 2025 تقريبًا، و8–11 حتى 2050، و12–15 مُسقَطة.', 'تغيير التركيز', 'الطاقة الآن · مجال واحد في كل مرة']),
  coop: HEAD.concat(['اتفاقيات التعاون', 'روسيا · الطاقة النووية السلمية']),
  reach_coop: ['اتفاقيات التعاون', 'روسيا · الطاقة النووية السلمية', 'اتفاقية تعاون منذ 2008', 'أوكرانيا · الأقمار الصناعية', 'قمر رصد أُطلق 2007 · فُقد الاتصال به 2010',
    'الاتحاد الأوروبي · البحث العلمي', 'برامج تمويل مشتركة', 'التراخيص', 'الولايات المتحدة · تجميع دبابات', 'منذ 1992', 'تعاون مع الصين · الطاقة', 'الكلفة: 5 من النفوذ', 'التقدم +10%'],
};

const screenChecks = `
const { issues, qa, q, T, nums, tab, DATA } = X;
// the research rate is the HUD's
if (tab === 'overview') { const hud = [...document.querySelectorAll('.top .stat')].find((s) => /البحث/.test(s.textContent)), kv = nums(T(qa('.sheet .r-kv b')[0]))[0];
  if (!hud || nums(hud.textContent).indexOf(kv) < 0) issues.push('the research rate is not the HUD\\'s');
  const b = q('.b-now'), pr = b.querySelector('.n-pr'), v = nums(T(b.querySelector('.n-v')))[0];
  if (Math.abs(pr.querySelector('i').getBoundingClientRect().width - pr.getBoundingClientRect().width * v / 100) > 0.6) issues.push('the project\\'s bar is not at ' + v + '%');
  const dom = T(b.querySelector('.r-at b')).split(' · ')[0], chip = T(q('.r-cap')).replace('التركيز: ', '');
  if (dom !== chip) issues.push('the project under way is not in the focus (' + chip + ')');
  const pl = nums(T(b.querySelector('.r-at b')))[0];
  if (pl !== DATA.focusLevel + 1 || !/نحو المستوى/.test(T(b))) issues.push('the project is not toward the focus\\'s next level ' + (DATA.focusLevel + 1));
  // the research trend is the HUD's arrow: up = blue with its up arrow and sign, flat = «دون تغير»
  const tr = hud && hud.querySelector('.trend'), kr = qa('.sheet .r-kpi .r-kr')[0], ar = kr.querySelector('.r-arr use');
  const dir = tr ? (tr.classList.contains('up') ? 'up' : tr.classList.contains('down') ? 'down' : 'flat') : '?';
  const shown = ar ? (/t-up/.test(ar.getAttribute('href')) ? 'up' : /t-down/.test(ar.getAttribute('href')) ? 'down' : 'flat') : (/دون تغير/.test(T(kr)) ? 'flat' : '?');
  if (dir !== shown) issues.push('the research trend is not the HUD\\'s (' + dir + ' there, ' + shown + ' here)');
  qa('.sheet .r-kpi').forEach((k, i) => { const got = [T(k.querySelector('.r-kl')), [...k.querySelector('.r-kv').children].map(T).join(' '), T(k.querySelector('.r-kr'))].map((s) => s.replace(/\\s+/g, ' ').trim());
    if (!DATA.kpis[i] || got.join('|') !== DATA.kpis[i].join('|')) issues.push('headline ' + (i + 1) + ' is not «' + (DATA.kpis[i] || []).join(' ') + '»: «' + got.join(' ') + '»'); }); }
// the 8 domains: each bar at its level out of 15, read whole; their mean = the headline; the focus marked once
if (tab === 'domains') { const rows = qa('.sheet .b-dom'), lv = rows.map((r) => nums(T(r.querySelector('b')))[0]);
  if (rows.length !== 8) issues.push('the domains are not the 8 of §5.7');
  if (Math.round(lv.reduce((a, b) => a + b, 0) / lv.length * 10) / 10 !== DATA.mean) issues.push('the domains\\' mean is not the headline ' + DATA.mean);
  rows.forEach((r, i) => { const nm = T(r.querySelector('span')), bar = r.querySelector('.i-bar'), al = r.getAttribute('aria-label') || '';
    if (Math.abs(parseFloat(getComputedStyle(bar, '::after').width) - bar.getBoundingClientRect().width * lv[i] / 15) > 0.6) issues.push('domain «' + nm + '»: the bar is not at ' + lv[i] + ' / 15');
    if (!/: المستوى \\d+ من 15/.test(al) || !nums(al).includes(lv[i]) || r.getAttribute('role') !== 'img') issues.push('a11y: domain «' + nm + '» is not read whole'); });
  const foc = rows.filter((r) => r.querySelector('em'));
  if (foc.length !== 1 || !/التركيز/.test(foc[0].getAttribute('aria-label') || '')) issues.push('the focus is not marked once, in words');
  if (rows.filter((r) => /التركيز/.test(r.getAttribute('aria-label') || '')).length !== 1) issues.push('VoiceOver reads more than one focus');
  const chip = T(q('.r-cap')).replace('التركيز: ', '');
  if (foc[0] && T(foc[0].querySelector('span')) !== chip) issues.push('the marked focus is not the header\\'s (' + chip + ')');
  if (foc[0] && nums(T(foc[0].querySelector('b')))[0] !== DATA.focusLevel) issues.push('the focus is not at level ' + DATA.focusLevel);
  rows.forEach((r, i) => { const nm = T(r.querySelector('span')), w = DATA.doms[i];
    if (!w || nm !== w[0] || lv[i] !== w[1]) issues.push('domain ' + (i + 1) + ' is not «' + (w || []).join(' ') + '»: «' + nm + ' ' + lv[i] + '»');
    if (!(lv[i] >= 1 && lv[i] <= 15)) issues.push('domain «' + nm + '»: level out of 1–15'); });
  const tw = rows.map((r) => r.querySelector('.i-bar').getBoundingClientRect().width);
  if (Math.max(...tw) - Math.min(...tw) > 0.5) issues.push('the domain bars do not share one track width'); }
// each agreement's name and line, in order, under its own section
if (tab === 'coop') { const got = qa('.sheet .f-tr').map((r) => [T(r.closest('.r-sec').querySelector('h3')), T(r.querySelector('.r-at b')), T(r.querySelector('.r-at > span'))].map((s) => s.replace(/\\s+/g, ' ').trim()));
  if (got.length !== DATA.ties.length) issues.push('the agreements are not the brief\\'s ' + DATA.ties.length);
  got.forEach((g, i) => { if (!DATA.ties[i] || g.join('|') !== DATA.ties[i].join('|')) issues.push('agreement ' + (i + 1) + ' is not «' + (DATA.ties[i] || []).join(' · ') + '»: «' + g.join(' · ') + '»'); }); }
qa('.sheet .f-tr').forEach((r) => { const nm = T(r.querySelector('.r-at b')), al = r.getAttribute('aria-label') || '';
  if (!al || nums(T(r)).some((x) => !nums(al).includes(x)) || r.getAttribute('role') !== 'img') issues.push('a11y: «' + nm + '» is not read whole'); });
`;

require(path.join(OUT, '../../shared/check/panelcheck.js'))({
  OUT, dock: 'البحث', tabs: ['overview', 'domains', 'coop'], longTab: 'domains',
  inputs: ['_build/research.css'],
  TOK: { sec: 'rgb(158, 219, 91)', ctlH: {}, sheetIcon: [], size: [['.b-dom', null, 22], ['.b-now', null, 36], ['.f-tr', null, 36]] },
  HEAD, BRIEF, screenChecks, DATA: { mean: 3.6, focusLevel: 4, kpis: KPIS, doms: DOMS, ties: TIES },
  cases: (d, se) => [
    ['rate off the HUD', d, '', '', /the research rate is not the HUD's/, () => { document.querySelector('.r-kv b').textContent = '+20'; }],
    ['project bar off', d, '', '', /the project's bar is not at 62%/, () => { document.querySelector('.b-now .n-pr i').style.setProperty('--v', '30%'); }],
    ['project outside the focus', d, '', '', /the project under way is not in the focus/, () => { document.querySelector('.r-cap').lastChild.textContent = 'التركيز: الصناعة والتصنيع'; }],
    ['domain bar off', d, '&tab=domains', '', /domain «الصحة والزراعة»: the bar is not at 4 \/ 15/, () => { document.querySelectorAll('.b-dom .i-bar')[2].style.setProperty('--v', '50%'); }],
    ['mean off', d, '&tab=domains', '', /the domains' mean is not the headline 3.6/, () => { document.querySelectorAll('.b-dom b .ltr')[1].textContent = '7'; }],
    ['domain silent', d, '&tab=domains', '', /a11y: domain «السيبراني والاستخبارات» is not read whole/, () => { document.querySelectorAll('.b-dom')[7].setAttribute('aria-label', 'السيبراني والاستخبارات'); }],
    ['two focuses', d, '&tab=domains', '', /the focus is not marked once/, () => { const e = document.createElement('em'); e.textContent = 'التركيز'; document.querySelectorAll('.b-dom b')[1].appendChild(e); }],
    ['trend off the HUD', d, '', '', /the research trend is not the HUD's \(up there, flat here\)/, () => { const k = document.querySelector('.r-kpi .r-kr'); k.className = 'r-kr'; k.textContent = 'دون تغير'; }],
    ['HUD trend flipped', d, '', '', /the research trend is not the HUD's \(down there, up here\)/, () => { const s = [...document.querySelectorAll('.top .stat')].find((x) => /البحث/.test(x.textContent)).querySelector('.trend'); s.setAttribute('class', 'trend down'); }],
    ['headline values swapped', d, '', '', /headline 2 is not/, () => { const k = document.querySelectorAll('.r-kpi'), a = k[1].querySelector('.r-kv'), b = k[2].querySelector('.r-kv'), x = a.innerHTML; a.innerHTML = b.innerHTML; b.innerHTML = x; }],
    ['project level not the next', d, '', '', /the project is not toward the focus's next level 5/, () => { document.querySelector('.b-now .r-at b .ltr').textContent = '6'; }],
    ['levels swapped', d, '&tab=domains', '', /domain 2 is not «الصناعة والتصنيع 4»/, () => { const b = document.querySelectorAll('.b-dom b .ltr'); b[1].textContent = '3'; b[4].textContent = '4'; }],
    ['focus moved', d, '&tab=domains', '', /the marked focus is not the header's/, () => { const e = document.querySelector('.b-dom em'); document.querySelectorAll('.b-dom b')[1].appendChild(e); }],
    ['focus read twice', d, '&tab=domains', '', /VoiceOver reads more than one focus/, () => { const r = document.querySelectorAll('.b-dom')[1]; r.setAttribute('aria-label', r.getAttribute('aria-label') + '، التركيز'); }],
    ['a shorter track', d, '&tab=domains', '.b-dom:nth-of-type(3) .i-bar { margin-left: 70px; }', /the domain bars do not share one track width/],
    ['agreement lines swapped', d, '&tab=coop', '', /agreement 1 is not/, () => { const s = document.querySelectorAll('.f-tr .r-at > span'), x = s[0].innerHTML; s[0].innerHTML = s[1].innerHTML; s[1].innerHTML = x; }],
    ['licence filed as an agreement', d, '&tab=coop', '', /agreement 4 is not/, () => { const s = document.querySelectorAll('.r-body[data-tab="coop"] .r-sec'); s[0].appendChild(s[1].querySelector('.f-tr')); }],
    ['a domain missing', d, '&tab=domains', '', /the domains are not the 8/, () => { document.querySelectorAll('.b-dom')[7].remove(); }],
  ],
});
