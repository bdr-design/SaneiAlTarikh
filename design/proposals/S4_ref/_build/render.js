// Render the reference-based province panel and check that no text is cut or overlaps.
// Usage: node render.js [device ids...]  (default i16promax). Writes <id>.png, <id>_govern.png, <id>_govern_end.png.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
const DEV = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['i16promax'];
const SHOTS = [['', ''], ['_govern', '&view=govern'], ['_govern_end', '&view=govern&scroll=end']];
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  let bad = 0;
  for (const id of IDS) {
    const d = DEV.find((x) => x.id === id);
    for (const [suffix, extra] of SHOTS) {
      const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
      const p = await ctx.newPage();
      await p.goto('file://' + path.join(OUT, 'index.html') + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}${extra}`);
      await p.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
      await p.waitForTimeout(300);
      const info = await p.evaluate(() => {
        const vis = (e) => e.getClientRects().length > 0;
        const box = (e) => e.getBoundingClientRect();
        const issues = [];
        const texts = [...document.querySelectorAll('.sheet b, .sheet span, .sheet dt, .sheet dd, .sheet button, .sheet h2, .sheet h3')].filter(vis);
        for (const e of texts) {
          if (e.scrollWidth > e.clientWidth + 0.5 && getComputedStyle(e).overflow !== 'visible') issues.push('overflow: ' + e.textContent.trim());
          const c = e.parentElement.closest('.r-act, .r-link, .r-more, .r-dec, .r-kpi, .r-sc, .r-hd, .r-tabs, .r-sec, .r-in');
          if (!c) continue;
          const r = box(e), cr = box(c);
          if (r.right > cr.right + 0.5 || r.left < cr.left - 0.5) issues.push('outside: ' + e.textContent.trim());
        }
        for (const row of document.querySelectorAll('.r-act, .r-link, .r-gov, .r-radios, .r-sc, .r-hd, .r-kv, .r-row, .r-dbtn, .r-tabs')) {
          const kids = [...row.children].filter((k) => vis(k) && !k.classList.contains('frost'));
          for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
            const a = box(kids[i]), c = box(kids[j]);
            if (a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5) issues.push('overlap: ' + kids[i].textContent.trim() + ' / ' + kids[j].textContent.trim());
          }
        }
        const sh = box(document.querySelector('.sheet')), dk = box(document.querySelector('.dock'));
        return { sheet: [Math.round(sh.left), Math.round(sh.top), Math.round(sh.width), Math.round(sh.height)], dock: [Math.round(dk.left), Math.round(dk.right), Math.round(dk.top)],
          body: window.__body, map: { zoom: window.__map.zoom, egyptClear: window.__map.egyptClear, hidden: window.__map.hiddenLabels }, issues };
      });
      await p.screenshot({ path: path.join(OUT, `${id}${suffix}.png`) });
      bad += info.issues.length;
      console.log(id + suffix, JSON.stringify(info));
      await ctx.close();
    }
  }
  await b.close();
  console.log(bad ? `ISSUES ${bad}` : 'OK');
})();
