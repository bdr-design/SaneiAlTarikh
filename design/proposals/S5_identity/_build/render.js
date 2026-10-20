// Render the section-identity proposal of the state panel (white touches, and white panels for comparison) and check
// text is cut, clipped outside its card, or overlapping. Usage: node render.js [device ids...] (default i16promax se)
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const OUT = path.resolve(__dirname, '..');
const DEV = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['i16promax', 'se'];
const SHOTS = [['', ''], ['_projects', '&tab=projects&scroll=end'], ['_light', '&theme=light'], ['_light_projects', '&theme=light&tab=projects&scroll=end']];
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
        const issues = [], root = document.documentElement;
        const body = document.querySelector(`.r-body[data-tab="${root.dataset.tab}"]`), br = box(body);
        const shown = (r) => r.bottom > br.top + 0.5 && r.top < br.bottom - 0.5;
        const faded = (r) => (root.dataset.ftop === '1' && r.top < br.top + 24) || (root.dataset.fbot === '1' && r.bottom > br.bottom - 24);
        const texts = [...document.querySelectorAll('.sheet b, .sheet span, .sheet dt, .sheet dd, .sheet button, .sheet h2, .sheet h3, .sheet p')].filter(vis);
        for (const e of texts) {
          const r = box(e);
          if (e.closest('.r-body') && !shown(r)) continue;
          if (e.scrollWidth > e.clientWidth + 0.5 && getComputedStyle(e).overflow !== 'visible') issues.push('overflow: ' + e.textContent.trim());
          const c = e.parentElement.closest('.r-act, .s-proj, .s-off, .r-kpi, .r-sc, .r-hd, .r-tabs, .r-sec, .s-seats, .r-in');
          if (c) { const cr = box(c); if (r.right > cr.right + 0.5 || r.left < cr.left - 0.5) issues.push('outside: ' + e.textContent.trim()); }
          if (e.closest('.r-body') && !faded(r) && (r.top < br.top - 0.5 || r.bottom > br.bottom + 0.5)) issues.push('cut at a hard edge: ' + e.textContent.trim());
        }
        for (const row of document.querySelectorAll('.r-act, .s-proj, .s-off, .r-sc, .r-hd, .r-kv, .r-row, .r-tabs, .s-pa, .r-kl')) {
          if (!vis(row)) continue;
          const kids = [...row.children].filter((k) => vis(k) && !k.classList.contains('frost'));
          for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) {
            const a = box(kids[i]), c = box(kids[j]);
            if (a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5) issues.push('overlap: ' + kids[i].textContent.trim() + ' / ' + kids[j].textContent.trim());
          }
        }
        const sh = box(document.querySelector('.sheet')), dk = document.querySelector('.dock');
        if (vis(dk) && box(dk).right > sh.left - 8) issues.push('dock closer than 8 pt to the sheet');
        return { sheet: [Math.round(sh.left), Math.round(sh.width), Math.round(sh.height)], dock: root.dataset.dock, fit: window.__sheetfit.level, body: window.__body, issues };
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
