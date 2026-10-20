// Render the version 3 province panel on the given devices (default: i16promax) and check text clipping and fit.
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
    const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
    const p = await ctx.newPage();
    await p.goto('file://' + path.join(OUT, 'index.html') + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`);
    await p.waitForFunction(() => window.__ready === true, null, { timeout: 20000 });
    await p.waitForTimeout(300);
    const info = await p.evaluate(() => {
      const sh = document.querySelector('.sheet').getBoundingClientRect();
      const kids = [...document.querySelector('.g-in').children].map((e) => e.getBoundingClientRect());
      const clipped = [...document.querySelectorAll('.sheet .g-v, .sheet .g-l, .sheet .g-r, .sheet .g-an, .sheet .g-ac, .sheet .g-at, .sheet .g-ae, .sheet .g-tab, .sheet .g-name, .sheet .g-sub, .sheet .g-ctl-l')]
        .filter((e) => { const box = e.closest('.g-t, .g-act, .g-hd, .g-tabs, .sheet').getBoundingClientRect(), r = e.getBoundingClientRect();
          return e.scrollWidth > e.clientWidth + 0.5 || r.right > box.right + 0.5 || r.left < box.left - 0.5; })
        .map((e) => e.textContent.trim());
      return { sheet: [Math.round(sh.width), Math.round(sh.height)], contentBottom: Math.round(kids[kids.length - 1].bottom - sh.top), clipped, hidden: window.__map && window.__map.hiddenLabels };
    });
    await p.screenshot({ path: path.join(OUT, `${id}.png`) });
    console.log(id, JSON.stringify(info));
    await ctx.close();
  }
  await b.close();
})();
