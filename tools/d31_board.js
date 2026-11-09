// D-31 board (T-035): the approved play screen's top row (design/screen1/B3) at each fit level on the small phones.
// Renders the row on the 7 phones with Egypt's names and the longest short name at the level B3's fit engine picks, and
// every level 0-5 forced on the SE and the mini with the longest name; measures whether the row fits the safe width and
// whether any name, value or date clips; checks that the nation card's VoiceOver label names the country, leader and
// regime; writes design/d31/board.html, its strips and design/d31/report.json.
// Exit 1 on a clip at any automatic level, a missing VoiceOver name, or a forced level 5 that does not fit the SE.
// Usage: NODE_PATH=... node tools/d31_board.js
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const R = path.resolve(__dirname, '..'), D = path.join(R, 'design'), OUT = path.join(D, 'd31');
const DEV = JSON.parse(fs.readFileSync(path.join(D, 'shared/devices.json'), 'utf8'));
const SETS = {
  eg: { label: 'مصر', nm: 'مصر', ldr: 'حسني مبارك', rg: 'جمهورية رئاسية', flag: 'eg' },
  // the widest short name the registry allows (§3.10), as in the second-country test (T-024)
  longest: { label: 'أطول اسم', nm: 'الكونغو الديمقراطية', ldr: 'جوزيف كابيلا', rg: 'جمهورية شبه رئاسية', flag: 'cd' },
};
const sub = (t, s) => t
  .replace(/<b class="nm">مصر<\/b>/g, `<b class="nm">${s.nm}</b>`)
  .replace(/<span class="nm">مصر<\/span>/g, `<span class="nm">${s.nm}</span>`)
  .replace(/<span class="ldr">حسني مبارك<\/span>/g, `<span class="ldr">${s.ldr}</span>`)
  .replace(/<span class="rg">جمهورية رئاسية<\/span>/g, `<span class="rg">${s.rg}</span>`)
  .replace(/aria-label="الدولة: مصر، حسني مبارك، جمهورية رئاسية"/g, `aria-label="الدولة: ${s.nm}، ${s.ldr}، ${s.rg}"`)
  .replace(/flags\/eg\.svg/g, `flags/${s.flag}.svg`).replace(/shared\/flag_eg\.svg/g, `shared/flags/${s.flag}.svg`);

// in the page: optionally force a level, then measure the row (B3's own formula) and every clip
const MEASURE = (force) => {
  const root = document.documentElement, top = document.querySelector('.top'), tx = document.querySelector('.date .dtext');
  if (force !== null) {
    const dow = document.querySelector('.date .dow'), dm = document.querySelector('.date .dmy');
    const dw = dow.dataset.dow || dow.textContent, d = dm.dataset.full || dm.textContent;
    root.dataset.fit = String(force);
    tx.style.minWidth = widestDate(force === 5) + 'px';   // eslint-disable-line no-undef
    window.__setDate(dw, d);
  }
  const kids = [document.querySelector('.nation'), document.querySelector('.stats'), document.querySelector('.date')];
  const gap = parseFloat(getComputedStyle(top).columnGap) || 0;
  const need = kids.reduce((a, e) => a + e.getBoundingClientRect().width, 0) + gap * (kids.length - 1);
  const clips = [];
  document.querySelectorAll('.top *').forEach((e) => {
    const c = getComputedStyle(e); if (c.display === 'none' || !e.getClientRects().length || !e.textContent.trim() || e.children.length) return;
    if (e.scrollWidth > e.clientWidth + 0.5 && c.overflow !== 'visible') clips.push(e.className || e.tagName);
    const r = e.getBoundingClientRect(), t = top.getBoundingClientRect();
    if (r.left < t.left - 0.5 || r.right > t.right + 0.5) clips.push('outside the row: ' + (e.className || e.tagName));
  });
  const nation = document.querySelector('.nation'), shown = getComputedStyle(document.querySelector('.ntext')).display === 'none' ? 'flag only' : 'name';
  return { level: +root.dataset.fit, need: Math.round(need * 10) / 10, avail: top.clientWidth, fits: need <= top.clientWidth + 0.01, clips: [...new Set(clips)],
    shown, voice: nation.getAttribute('aria-label'), date: [...document.querySelectorAll('.date .dtext > *')].map((e) => e.textContent).join(' / '),
    rect: (() => { const r = top.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; })() };
};

(async () => {
  fs.mkdirSync(path.join(OUT, 'strips'), { recursive: true });
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const src = path.join(D, 'screen1/B3/index.html'), raw = fs.readFileSync(src, 'utf8'), rows = [], issues = [];
  for (const [k, s] of Object.entries(SETS)) {
    const tmp = path.join(D, 'screen1/B3', `index.d31_${k}.html`); fs.writeFileSync(tmp, sub(raw, s));
    try {
      for (const d of DEV) {
        const forced = (k === 'longest' && (d.id === 'se' || d.id === 'mini')) ? [0, 1, 2, 3, 4, 5] : [];
        for (const force of [null, ...forced]) {
          const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2 }), p = await ctx.newPage();
          await p.goto('file://' + tmp + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`);
          await p.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }).catch(() => {});
          await p.waitForTimeout(200);
          const m = await p.evaluate(MEASURE, force);
          const name = `${d.id}_${k}_${force === null ? 'auto' : 'L' + force}.png`;
          await p.screenshot({ path: path.join(OUT, 'strips', name), clip: { x: 0, y: Math.max(0, m.rect.y - 6), width: d.w, height: m.rect.h + 12 } });
          await ctx.close();
          const row = { dev: d.id, w: d.w, set: k, forced: force, ...m, img: 'strips/' + name };
          delete row.rect; rows.push(row);
          if (force === null && m.clips.length) issues.push(`${d.id} ${k}: clip at level ${m.level}: ${m.clips.join(', ')}`);
          if (force === null && !m.fits) issues.push(`${d.id} ${k}: the row does not fit at level ${m.level} (${m.need} > ${m.avail})`);
          if (force === null && !(m.voice.includes(s.nm) && m.voice.includes(s.ldr) && m.voice.includes(s.rg))) issues.push(`${d.id} ${k}: the nation card's VoiceOver label leaves out a name`);
          if (force === 5 && d.id === 'se' && (!m.fits || m.clips.length)) issues.push(`se ${k}: level 5 does not fit the SE`);
        }
      }
    } finally { fs.unlinkSync(tmp); }
  }
  await b.close();
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify({ ranAt: new Date().toISOString(), issues, rows }, null, 1));
  const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const LV = ['0 · الكامل', '1 · النظام تحت الاسم', '2 · الاسم وحده', '3 · مؤشرات أضيق', '4 · العلم وحده', '5 · السنة بجانب اليوم'];
  const card = (r) => `<figure class="${r.fits && !r.clips.length ? '' : 'bad'}"><img src="${r.img}" alt="${esc(r.dev + ' ' + r.set)}" loading="lazy">
    <figcaption><b>${esc(r.dev)}</b> · ${esc(SETS[r.set].label)} · ${r.forced === null ? 'تلقائي: ' : 'مفروض: '}${esc(LV[r.level])} · ${r.fits ? 'يتسع' : 'لا يتسع'} (${r.need} / ${r.avail})${r.clips.length ? ' · قصّ: ' + esc(r.clips.join('، ')) : ''}</figcaption></figure>`;
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>الصف العلوي في الجوالات الصغيرة</title>
<style>
:root { --bg: #0B1218; --panel: #101A22; --t1: #EAF2F7; --t2: #A9BCCB; --ok: #7FE9FF; --bad: #FF8A7A; }
body { margin: 0; padding: 16px; background: var(--bg); color: var(--t1); font: 14px/1.5 "IBM Plex Sans Arabic", system-ui, sans-serif; }
h1 { font-size: 20px; margin: 0 0 4px; } h2 { font-size: 16px; margin: 24px 0 8px; color: var(--t2); } p { color: var(--t2); margin: 0 0 12px; }
figure { margin: 0 0 12px; background: var(--panel); border-radius: 10px; padding: 8px; border-inline-start: 3px solid var(--ok); }
figure.bad { border-inline-start-color: var(--bad); }
img { display: block; max-width: 100%; height: auto; border-radius: 6px; } figcaption { margin-top: 6px; font-size: 13px; color: var(--t2); }
figcaption b { color: var(--t1); }
</style></head><body>
<h1>الصف العلوي في الجوالات الصغيرة (D-31)</h1>
<p>شاشة اللعب المعتمدة (B3). سلسلة التصغير: 1 النظام تحت الاسم، 2 الاسم وحده، 3 مؤشرات أضيق، 4 العلم وحده (الاسم في لوحة الدولة وفي قراءة VoiceOver)، 5 السنة بجانب اليوم. ${issues.length ? 'مشاكل: ' + issues.length : 'لا مشاكل.'}</p>
<h2>المستوى التلقائي على الجوالات السبعة</h2>
${rows.filter((r) => r.forced === null).map(card).join('\n')}
<h2>كل مستوى مفروضًا على SE وmini بأطول اسم</h2>
${rows.filter((r) => r.forced !== null).map(card).join('\n')}
</body></html>
`;
  fs.writeFileSync(path.join(OUT, 'board.html'), html);
  console.log(rows.filter((r) => r.forced === null).map((r) => `${r.dev} ${r.set}: level ${r.level} ${r.shown} ${r.fits ? 'fits' : 'NO FIT'}`).join('\n'));
  console.log(rows.filter((r) => r.forced !== null).map((r) => `${r.dev} forced ${r.forced}: ${r.fits ? 'fits' : 'no fit'} ${r.need}/${r.avail}${r.clips.length ? ' clips ' + r.clips.join(',') : ''}`).join('\n'));
  console.log(issues.length ? 'D31 ISSUES:\n  ' + issues.join('\n  ') : 'D31 OK');
  process.exit(issues.length ? 1 : 0);
})();
