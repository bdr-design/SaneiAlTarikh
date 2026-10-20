// Render the screen 4 style proposals (themes 1-3) on the given devices (default: i16promax).
// Usage: NODE_PATH=.../node_modules CHROMIUM_PATH=... node render.js [ids...]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const DEV = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['i16promax'];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  for (const id of IDS) {
    const d = DEV.find((x) => x.id === id);
    for (const th of (process.env.THEMES || "8,9").split(",").map(Number)) {
      const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
      const p = await ctx.newPage();
      const errs = [];
      p.on('pageerror', (e) => errs.push(e.message));
      await p.goto('file://' + path.join(OUT, 'index.html') + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}&theme=${th}`);
      await p.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
      await p.waitForTimeout(300);
      const info = await p.evaluate(() => {
        const sc = document.querySelector('.q-in'), sh = document.querySelector('.sheet').getBoundingClientRect();
        const acts = [...document.querySelectorAll('.q-act')].map((a) => a.getBoundingClientRect());
        const clipped = [...document.querySelectorAll('.sheet .q-kl, .sheet .q-kv, .sheet .q-status, .sheet .q-an, .sheet .q-ac, .sheet .q-ae, .sheet .q-name, .sheet .q-why, .sheet .q-more')]
          .filter((e) => e.scrollWidth > e.clientWidth + 0.5 || e.getBoundingClientRect().right > e.closest('.q-kpi, .q-act, .q-hd, .q-in, .sheet').getBoundingClientRect().right + 0.5 || e.getBoundingClientRect().left < e.closest('.q-kpi, .q-act, .q-hd, .q-in, .sheet').getBoundingClientRect().left - 0.5)
          .map((e) => e.textContent.trim());
        return { sheet: [Math.round(sh.width), Math.round(sh.height)], scroll: [sc.clientHeight, sc.scrollHeight],
          firstActBottom: Math.round(acts[0].bottom - sh.top), visibleActs: acts.filter((r) => r.bottom <= sh.bottom - 24).length, clipped, map: window.__map && window.__map.hiddenLabels };
      });
      await p.screenshot({ path: path.join(OUT, `theme${th}_${id}.png`) });
      console.log(id, 'theme', th, JSON.stringify(info), errs.length ? 'ERRORS ' + errs.join(' | ') : '');
      await ctx.close();
    }
  }
  await b.close();
})();
