// Second-country stress test (T-024): every page that names the player's country is rendered on the 7 phones with
// another country's names in place of Egypt's (Saudi Arabia, and the longest short names), and measured: the top row
// still fits (its fit level drops the leader and regime first, as designed), and no name, header line or header row
// overflows its box or runs into a neighbour. Pages are rewritten to a temporary copy beside the original (so relative
// paths work) and the copy is deleted after.
// Usage: NODE_PATH=... node tools/stress_names.js [set ...]   (sets: sa, long, longest; default all)
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const R = path.resolve(__dirname, '..'), D = path.join(R, 'design');
const DEV = JSON.parse(fs.readFileSync(path.join(D, 'shared/devices.json'), 'utf8'));
const SETS = {
  sa: { nm: 'السعودية', ldr: 'عبدالله بن عبدالعزيز', rg: 'ملكية مطلقة', flag: 'sa', head: 'خادم الحرمين الشريفين الملك عبدالله · منذ 2005', prov: 'المنطقة الشرقية' },
  long: { nm: 'أفريقيا الوسطى', ldr: 'فرانسوا بوزيزي', rg: 'جمهورية رئاسية', flag: 'sa', head: 'الرئيس فرانسوا بوزيزي يانغوفوندا · منذ 2003', prov: 'أوهام-بندي' },
  longest: { nm: 'سانت فينسنت والغرينادين', ldr: 'رالف غونزالفس', rg: 'ملكية دستورية برلمانية', flag: 'sa', head: 'رئيس الوزراء رالف إيفرارد غونزالفس · منذ 2001', prov: 'سانت فينسنت' },
};
const PAGES = ['screen1/B3', 'screen4/R', 'screen5/A', 'screen6/A', 'screen8/A', 'screen9/A', 'screen10/A', 'screen11/A', 'screen12/A', 'screen13/A',
  'screen14/A', 'screen18/A', 'screen20/A', 'screen23/A'];
const sub = (t, s) => t
  .replace(/<b class="nm">مصر<\/b>/g, `<b class="nm">${s.nm}</b>`)
  .replace(/<span class="ldr">حسني مبارك<\/span>/g, `<span class="ldr">${s.ldr}</span>`)
  .replace(/<span class="rg">جمهورية رئاسية<\/span>/g, `<span class="rg">${s.rg}</span>`)
  .replace(/<h2 class="r-name">مصر<\/h2>/g, `<h2 class="r-name">${s.nm}</h2>`)
  .replace(/<h2 class="r-name">القاهرة<\/h2>/g, `<h2 class="r-name">${s.prov}</h2>`)
  .replace(/(<div class="r-sub">[^\n]*?)(حملة )?مصر/g, (m, a, b) => a + (b || '') + s.nm)
  .replace(/<div class="r-sub">الرئيس محمد حسني مبارك<span class="r-dot"> · <\/span>منذ <span class="ltr">1981<\/span><\/div>/g, `<div class="r-sub">${s.head}</div>`)
  .replace(/flags\/eg\.svg/g, `flags/${s.flag}.svg`);
(async () => {
  const want = process.argv.slice(2).filter((a) => SETS[a]), sets = want.length ? want : Object.keys(SETS);
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const out = [];
  for (const pg of PAGES) {
    const src = path.join(D, pg, 'index.html'), raw = fs.readFileSync(src, 'utf8');
    for (const k of sets) {
      const tmp = path.join(D, pg, `index.stress_${k}.html`); fs.writeFileSync(tmp, sub(raw, SETS[k]));
      try {
        for (const d of DEV) {
          const ctx = await b.newContext({ viewport: { width: d.w, height: d.h } }), p = await ctx.newPage();
          await p.goto('file://' + tmp + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`);
          await p.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }).catch(() => {});
          await p.waitForTimeout(300);
          const r = await p.evaluate(() => {
            const iss = [], vis = (e) => { const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0; };
            const f = window.__fit || {}; if (f.need > f.avail + 0.5) iss.push(`top row over by ${(f.need - f.avail).toFixed(1)}`);
            ['.nation .nm', '.nation .ldr', '.nation .rg', '.r-name', '.r-sub', '.r-hd .r-cap'].forEach((s) => document.querySelectorAll(s).forEach((e) => {
              if (!vis(e)) return; if (e.scrollWidth > e.clientWidth + 0.5 && getComputedStyle(e).overflow !== 'visible' && getComputedStyle(e).textOverflow !== 'ellipsis') iss.push(`${s} clipped: ${e.textContent.trim()}`);
              const rg = document.createRange(); rg.selectNodeContents(e); const tb = rg.getBoundingClientRect(), eb = e.getBoundingClientRect();
              const cs = getComputedStyle(e), ell = cs.textOverflow === 'ellipsis' && cs.overflow === 'hidden';
              if (ell && (tb.right > eb.right + 0.5 || tb.left < eb.left - 0.5)) { window.__ell = (window.__ell || []).concat(e.textContent.trim()); return; }
              if (tb.right > eb.right + 0.5 || tb.left < eb.left - 0.5) iss.push(`${s} text wider than its box: ${e.textContent.trim()} (${tb.width.toFixed(0)} in ${eb.width.toFixed(0)})`); }));
            const hd = document.querySelector('.sheet .r-hd'); if (hd) { const sb = document.querySelector('.sheet').getBoundingClientRect();
              const kids = [...hd.querySelectorAll('.r-flag, .r-name, .r-cap, .r-sub, .s-emb, .r-x')].filter(vis).map((e) => [e, e.getBoundingClientRect()]);
              kids.forEach(([e, b]) => { if (b.left < sb.left + 11.5 || b.right > sb.right - 11.5) iss.push(`header ${e.className} outside the sheet's padding`); });
              for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) { const a = kids[i][1], c = kids[j][1];
                if (a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5) iss.push(`header ${kids[i][0].className} overlaps ${kids[j][0].className}`); } }
            const nm = document.querySelector('.nation .nm');
            return { iss, fit: f.level, shown: nm && vis(nm) ? 'name' : 'flag only', ell: window.__ell || [] };
          });
          out.push({ pg, set: k, dev: d.id, ...r });
          await ctx.close();
        }
      } finally { fs.unlinkSync(tmp); }
    }
  }
  await b.close();
  const bad = out.filter((x) => x.iss.length);
  out.filter((x) => x.pg === 'screen1/B3').forEach((x) => console.log(`HUD ${x.set} ${x.dev}: fit ${x.fit}, ${x.shown}`));
  bad.forEach((x) => console.log(`ISSUE ${x.pg} ${x.set} ${x.dev}: ${x.iss.join(' | ')}`));
  console.log(`${out.length} renders, ${bad.length} with issues, ${out.filter((x) => x.ell.length).length} with a sub-line ellipsized`);
  fs.writeFileSync(path.join(R, 'tools/stress_names_report.json'), JSON.stringify(out, null, 1));
})();
