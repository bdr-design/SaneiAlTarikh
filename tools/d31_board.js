// D-31 board (T-035): the approved play screen's top row (design/screen1/B3) at each fit level on the small phones.
// Two value modes: «sample» (B3's own 2011 values, as the owner saw them) and «widest» (each chip at its widest value
// class: the reserved widths the native build fits with, §2.5 and §6.3). Three name sets: Egypt, the longest real short
// name with its 2011 leader and regime, and a worst case (the longest short name with the widest leader and regime any
// country has). For every phone, set and mode it records the level B3's fit engine picks; on the SE and the mini it also
// forces every level 0-5 (longest name, widest values). Per render it measures every text node, not element boxes: text
// must stay inside its own part (a chip, the nation card, the date, the speed and play buttons) and inside the row on all
// four sides. At the automatic level and at the flag-only levels it checks the accessible name VoiceOver gets for the
// nation card (computed by the browser, so aria-hidden or a lost role fails). Writes design/d31/board.html, its strips
// and design/d31/report.json. Exit 1 on a clip or a row that does not fit at any automatic level, a wrong accessible
// name, or a level 5 that does not fit the SE with the widest values and the worst names.
// Usage: NODE_PATH=... node tools/d31_board.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const R = path.resolve(__dirname, '..'), D = path.join(R, 'design'), OUT = path.join(D, 'd31');
const DEV = JSON.parse(fs.readFileSync(path.join(D, 'shared/devices.json'), 'utf8'));
const SETS = {
  eg: { label: 'مصر', nm: 'مصر', ldr: 'حسني مبارك', rg: 'جمهورية رئاسية', flag: 'eg' },
  // the widest short name the registry allows (§3.10), with its 2011 leader and regime (as in T-024)
  longest: { label: 'أطول اسم', nm: 'الكونغو الديمقراطية', ldr: 'جوزيف كابيلا', rg: 'جمهورية شبه رئاسية', flag: 'cd' },
  // a worst case: the longest short name with the widest 2011 leader and regime of T-024's sets (leaders change in play)
  worst: { label: 'أسوأ حالة', nm: 'الكونغو الديمقراطية', ldr: 'عبدالله بن عبدالعزيز', rg: 'جمهورية رئاسية اتحادية', flag: 'cd' },
};
// each chip's value classes, from GameFormatter's HUD scale rule (§6.11): amounts with one decimal and up to 999.9 per
// scale word (ألف, مليون, مليار, تريليون), signed when negative; indices and percentages 0-100; research points a whole
// number 0-999 a month (never negative); the widest measured one is reserved
const WIDEST = [
  [['−999.9', ' ألف $'], ['−999.9', ' مليون $'], ['−999.9', ' مليار $'], ['−999.9', ' تريليون $']],   // the treasury
  [['100%', '']],                                                      // stability
  [['100', '']],                                                       // legitimacy
  [['999.9', ' ألف'], ['999.9', ' مليون'], ['9.9', ' مليار']],          // manpower (at most the world's people)
  [['100', '']],                                                       // influence
  [['+999', ' / شهر']],                                                // research
];
const sub = (t, s) => t
  .replace(/<b class="nm">مصر<\/b>/g, `<b class="nm">${s.nm}</b>`)
  .replace(/<span class="nm">مصر<\/span>/g, `<span class="nm">${s.nm}</span>`)
  .replace(/<span class="ldr">حسني مبارك<\/span>/g, `<span class="ldr">${s.ldr}</span>`)
  .replace(/<span class="rg">جمهورية رئاسية<\/span>/g, `<span class="rg">${s.rg}</span>`)
  .replace(/aria-label="الدولة: مصر، حسني مبارك، جمهورية رئاسية"/g, `aria-label="الدولة: ${s.nm}، ${s.ldr}، ${s.rg}"`)
  .replace(/flags\/eg\.svg/g, `flags/${s.flag}.svg`).replace(/shared\/flag_eg\.svg/g, `shared/flags/${s.flag}.svg`);

// in the page: put each chip at its widest value class (then re-run B3's fit), or force a level
const PREPARE = ({ widest, force, classes }) => {
  if (widest) {
    document.querySelectorAll('.top .stat').forEach((chip, i) => {
      const num = chip.querySelector('.num'); let best = null, bw = -1;
      for (const [n, u] of classes[i]) {
        num.innerHTML = '<span class="ltr">' + n + '</span>' + (u ? '<span class="unit">' + u + '</span>' : '');
        const w = chip.getBoundingClientRect().width; if (w > bw) { bw = w; best = num.innerHTML; }
      }
      num.innerHTML = best;
    });
    fitTop();   // eslint-disable-line no-undef
  }
  if (force !== null) {
    const root = document.documentElement, tx = document.querySelector('.date .dtext');
    const dow = document.querySelector('.date .dow'), dm = document.querySelector('.date .dmy');
    const dw = dow.dataset.dow || dow.textContent, d = dm.dataset.full || dm.textContent;
    root.dataset.fit = String(force);
    tx.style.minWidth = widestDate(force === 5) + 'px';   // eslint-disable-line no-undef
    window.__setDate(dw, d);
  }
};
// in the page: the row's need against its width (B3's own formula) and every text node against its part and the row
const MEASURE = () => {
  const root = document.documentElement, top = document.querySelector('.top'), T = top.getBoundingClientRect();
  const kids = [document.querySelector('.nation'), document.querySelector('.stats'), document.querySelector('.date')];
  const gap = parseFloat(getComputedStyle(top).columnGap) || 0;
  const need = kids.reduce((a, e) => a + e.getBoundingClientRect().width, 0) + gap * (kids.length - 1);
  const PARTS = '.stat, .nation, .dtext, .spd, .play, .cap, button';
  const NAMES = { nm: 'الاسم', ldr: 'القائد', rg: 'النظام', dow: 'اليوم', dmy: 'التاريخ', spd: 'السرعة', lbl: 'اسم المؤشر', num: 'القيمة', unit: 'الوحدة' };
  const clips = [], texts = [], w = document.createTreeWalker(top, NodeFilter.SHOW_TEXT); let n;
  while ((n = w.nextNode())) {
    if (!n.textContent.trim()) continue;
    const el = n.parentElement;
    if (getComputedStyle(el).visibility === 'hidden' || parseFloat(getComputedStyle(el).opacity) === 0) {
      // a value, unit, label or name hidden while its part shows is a clip
      const pt = el.closest('.stat, .nation, .dtext'); if (pt && getComputedStyle(pt).visibility !== 'hidden' && el.closest('.num, .unit, .lbl, .nm, .ldr, .rg, .dow, .dmy') && getComputedStyle(el.closest('.ntext') || el).display !== 'none') clips.push('نص مخفي: «' + n.textContent.trim() + '»');
      continue; }
    const r = document.createRange(); r.selectNodeContents(n);
    const rects = [...r.getClientRects()].filter((x) => x.width > 0.5 && x.height > 0.5); if (!rects.length) continue;
    // across: inside its own part; up and down: inside the glass pill that holds it (an Arabic glyph's box runs past a
    // tight line box, as the date's does by 1-2 pt, without leaving its pill)
    const part = el.closest(PARTS), P = part ? part.getBoundingClientRect() : T, pill = el.closest('.bar, .ctl, .spd, .play'), V = pill ? pill.getBoundingClientRect() : T;
    const who = (Object.keys(NAMES).find((k) => el.classList.contains(k)) || Object.keys(NAMES).find((k) => el.closest('.' + k)) || ''), label = (NAMES[who] || who || el.tagName) + ' «' + n.textContent.trim() + '»';
    // any box between the text and the row that clips (overflow, clip-path) must hold the text
    const clippers = []; for (let a = el; a && a !== top; a = a.parentElement) { const ac = getComputedStyle(a); if (ac.overflowX !== 'visible' || ac.overflowY !== 'visible' || ac.clipPath !== 'none') clippers.push(a); }
    rects.forEach((x) => {
      clippers.forEach((a) => { const A = a.getBoundingClientRect(); const cp = getComputedStyle(a).clipPath;
        if (cp !== 'none' || x.left < A.left - 0.5 || x.right > A.right + 0.5 || x.top < A.top - 2 || x.bottom > A.bottom + 2) clips.push('مقصوص: ' + label); });
      if (x.left < P.left - 0.5 || x.right > P.right + 0.5 || x.top < V.top - 0.5 || x.bottom > V.bottom + 0.5) clips.push('خارج جزئه: ' + label);
      if (x.left < T.left - 0.5 || x.right > T.right + 0.5 || x.top < T.top - 0.5 || x.bottom > T.bottom + 0.5) clips.push('خارج الصف: ' + label);
      texts.push({ x, part, label, node: n });
    });
  }
  // every part shows what it must, as the browser sees it (display, visibility and opacity up the tree): six chips, each
  // with its label, value and unit; the date's two lines; the name except where the level drops it
  const seen = (e) => !!e && e.getClientRects().length > 0 && e.checkVisibility({ opacityProperty: true, visibilityProperty: true });
  const chips = [...document.querySelectorAll('.top .stat')];
  if (chips.filter(seen).length !== 6) clips.push('مؤشرات ظاهرة: ' + chips.filter(seen).length + ' من 6');
  chips.forEach((c) => { const lb = c.querySelector('.lbl'); ['.lbl', '.num', '.unit'].forEach((sel) => c.querySelectorAll(sel).forEach((e) => { if (!seen(e)) clips.push('نص مخفي في «' + (lb ? lb.textContent.trim() : '?') + '»: ' + sel); }));
    if (!c.querySelector('.num')) clips.push('مؤشر بلا قيمة: «' + (lb ? lb.textContent.trim() : '?') + '»'); });
  ['.date .dow', '.date .dmy'].forEach((sel) => { if (!seen(document.querySelector(sel))) clips.push('نص مخفي: ' + sel); });
  const lvl = +root.dataset.fit;
  if (lvl < 4 && !seen(document.querySelector('.ntext .nm'))) clips.push('نص مخفي: اسم الدولة');
  if (lvl < 2) ['.ntext .ldr', '.ntext .rg'].forEach((sel) => { if (!seen(document.querySelector(sel))) clips.push('نص مخفي: ' + sel); });
  if (!seen(document.querySelector('.nation .flag, .nation img'))) clips.push('العلم مخفي');
  for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
    const a = texts[i], b = texts[j]; if (a.node === b.node) continue;
    // stacked lines in one part touch by their glyph boxes (1-3 pt, the date's two lines); more than 4 pt is an overlap
    const tol = a.part === b.part ? 4 : 0.5;
    if (a.x.left < b.x.right - 0.5 && b.x.left < a.x.right - 0.5 && a.x.top < b.x.bottom - tol && b.x.top < a.x.bottom - tol) clips.push('فوق نص آخر: ' + a.label + ' و' + b.label);
  }
  const shown = getComputedStyle(document.querySelector('.ntext')).display === 'none' ? 'flag only' : 'name';
  return { level: +root.dataset.fit, need: Math.round(need * 10) / 10, avail: top.clientWidth, fits: need <= top.clientWidth + 0.01, clips: [...new Set(clips)],
    shown, rect: { y: T.top, h: T.height } };
};

(async () => {
  fs.rmSync(path.join(OUT, 'strips'), { recursive: true, force: true });
  fs.mkdirSync(path.join(OUT, 'strips'), { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const src = path.join(D, 'screen1/B3/index.html'), raw = fs.readFileSync(src, 'utf8'), rows = [], issues = [];
  for (const [k, s] of Object.entries(SETS)) {
    const tmp = path.join(D, 'screen1/B3', `index.d31_${k}.html`); fs.writeFileSync(tmp, sub(raw, s));
    try {
      for (const d of DEV) {
        const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2 });
        for (const mode of ['sample', 'widest']) {
          const forced = (k === 'worst' && mode === 'widest' && (d.id === 'se' || d.id === 'mini')) ? [0, 1, 2, 3, 4, 5] : [];
          let autoLevel = null;
          for (const force of [null, ...forced]) {
            const p = await ctx.newPage();
            await p.goto('file://' + tmp + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`);
            await p.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }).catch(() => {});
            await p.evaluate(PREPARE, { widest: mode === 'widest', force, classes: WIDEST });
            await p.waitForTimeout(100);
            const m = await p.evaluate(MEASURE);
            // the accessible name the browser computes for the nation card (what VoiceOver reads)
            const voice = await p.getByRole('button', { name: `الدولة: ${s.nm}، ${s.ldr}، ${s.rg}`, exact: true }).count();
            const same = force !== null && force === autoLevel;
            const name = same ? `${d.id}_${k}_${mode}_auto.png` : `${d.id}_${k}_${mode}_${force === null ? 'auto' : 'L' + force}.png`;
            if (!same) await p.screenshot({ path: path.join(OUT, 'strips', name), clip: { x: 0, y: Math.max(0, m.rect.y - 6), width: d.w, height: m.rect.h + 12 } });
            await p.close();
            if (force === null) autoLevel = m.level;
            const row = { dev: d.id, ar: d.ar, w: d.w, set: k, mode, forced: force, ...m, voice: voice === 1, img: 'strips/' + name };
            delete row.rect; rows.push(row);
            const tag = `${d.id} ${k} ${mode}`;
            if (force === null && m.clips.length) issues.push(`${tag}: at level ${m.level}: ${m.clips.join('; ')}`);
            if (force === null && !m.fits) issues.push(`${tag}: the row does not fit at level ${m.level} (${m.need} > ${m.avail})`);
            if ((force === null || force >= 4) && voice !== 1) issues.push(`${tag}${force === null ? '' : ' forced ' + force}: the nation card's accessible name is not «الدولة: ${s.nm}، ${s.ldr}، ${s.rg}»`);
            if (force === 5 && d.id === 'se' && (!m.fits || m.clips.length)) issues.push(`se ${k} widest: level 5 does not fit the SE (${m.need} > ${m.avail}) ${m.clips.join('; ')}`);
          }
        }
        await ctx.close();
      }
    } finally { fs.unlinkSync(tmp); }
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ ranAt: new Date().toISOString(), issues, widestClasses: WIDEST, rows }, null, 1));
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const LV = ['0 · البطاقة كاملة', '1 · القائد بجانب الاسم', '2 · الاسم وحده', '3 · مؤشرات أضيق', '4 · العلم وحده', '5 · السنة بجانب اليوم'];
  const MODE = { sample: 'قيم 2011', widest: 'أعرض القيم' };
  const card = (r) => `<figure class="${r.fits && !r.clips.length ? '' : 'bad'}"><img src="${r.img}" alt="${esc(r.ar + ' · ' + SETS[r.set].label + ' · ' + MODE[r.mode])}" loading="lazy">
    <figcaption><b>${esc(r.ar)}</b> · ${esc(SETS[r.set].label)} · ${MODE[r.mode]} · ${r.forced === null ? 'تلقائي: ' : 'مفروض: '}${esc(LV[r.level])} · ${r.fits ? 'يتسع' : 'لا يتسع'} (<span dir="ltr">${r.need} / ${r.avail}</span>)${r.clips.length ? ' · ' + esc(r.clips.join('، ')) : ''}</figcaption></figure>`;
  const auto = rows.filter((r) => r.forced === null);
  const table = `<table><thead><tr><th>الجوال</th>${Object.values(SETS).map((s) => `<th>${s.label} · قيم 2011</th><th>${s.label} · أعرض القيم</th>`).join('')}</tr></thead><tbody>
${DEV.map((d) => `<tr><th>${esc(d.ar)}</th>${Object.keys(SETS).map((k) => ['sample', 'widest'].map((m) => { const r = auto.find((x) => x.dev === d.id && x.set === k && x.mode === m); return `<td>${r.level}</td>`; }).join('')).join('')}</tr>`).join('\n')}
</tbody></table>`;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>الصف العلوي في الجوالات الصغيرة</title>
<style>
:root { --bg: #0B1218; --panel: #101A22; --t1: #EAF2F7; --t2: #A9BCCB; --ok: #7FE9FF; --bad: #FF8A7A; --hair: rgba(234, 242, 247, .14); }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--t1); font: 14px/1.5 "IBM Plex Sans Arabic", system-ui, sans-serif; }
h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 24px 0 8px; color: var(--t2); } p { color: var(--t2); margin: 0 0 12px; }
figure { margin: 0 0 12px; background: var(--panel); border-radius: 10px; padding: 8px; border-inline-start: 3px solid var(--ok); }
figure.bad { border-inline-start-color: var(--bad); }
img { display: block; max-width: 100%; height: auto; border-radius: 6px; } figcaption { margin-top: 6px; font-size: 13px; color: var(--t2); }
figcaption b { color: var(--t1); }
.wrap { overflow-x: auto; } table { border-collapse: collapse; font-size: 13px; min-width: 560px; } th, td { padding: 6px 8px; border-bottom: 1px solid var(--hair); text-align: center; }
thead th { color: var(--t2); font-weight: 500; } tbody th { text-align: start; font-weight: 500; }
</style></head><body>
<h1>الصف العلوي في الجوالات الصغيرة (D-31)</h1>
<p>شاشة اللعب المعتمدة (B3). المستويات: 0 البطاقة كاملة، 1 القائد بجانب الاسم، 2 الاسم وحده، 3 مؤشرات أضيق، 4 العلم وحده (الاسم في لوحة الدولة وفي قراءة VoiceOver)، 5 السنة بجانب اليوم. «أعرض القيم»: كل مؤشر بأعرض قيمة ممكنة، وهي المساحة اللي تحجزها اللعبة. ${issues.length ? 'مشاكل: ' + issues.length + '.' : 'لا مشاكل في المستويات التلقائية.'}</p>
<h2>المستوى الذي يصل إليه كل جوال</h2>
<div class="wrap">${table}</div>
<h2>المستوى التلقائي بأعرض القيم</h2>
${auto.filter((r) => r.mode === 'widest').map(card).join('\n')}
<h2>المستوى التلقائي بقيم 2011</h2>
${auto.filter((r) => r.mode === 'sample').map(card).join('\n')}
<h2>كل المستويات مفروضةً على آيفون SE و13 ميني (أسوأ حالة، أعرض القيم)</h2>
<p>المستويات الحمراء للمقارنة فقط: الجوال لا يصل إليها لأنها لا تتسع.</p>
${rows.filter((r) => r.forced !== null).map(card).join('\n')}
</body></html>
`;
  fs.writeFileSync(path.join(OUT, 'board.html'), html);
  console.log(auto.map((r) => `${r.dev} ${r.set} ${r.mode}: level ${r.level} ${r.shown} ${r.fits ? 'fits' : 'NO FIT'} ${r.need}/${r.avail}`).join('\n'));
  console.log(rows.filter((r) => r.forced !== null).map((r) => `${r.dev} forced ${r.forced}: ${r.fits ? 'fits' : 'no fit'} ${r.need}/${r.avail}${r.clips.length ? ' · ' + r.clips.length + ' clips' : ''}`).join('\n'));
  console.log(issues.length ? 'D31 ISSUES:\n  ' + issues.join('\n  ') : 'D31 OK');
  process.exit(issues.length ? 1 : 0);
})();
