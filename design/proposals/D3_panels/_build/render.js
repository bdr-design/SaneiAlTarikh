// Render the D-3 panel proposals next to the approved screen 1 (B3) on chosen devices.
// Usage: NODE_PATH=.../node_modules CHROMIUM_PATH=... node render.js [ids...]
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const DEV = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const IDS = process.argv.slice(2).length ? process.argv.slice(2) : ['i16promax', 'se'];

(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  for (const id of IDS) {
    const d = DEV.find((x) => x.id === id);
    for (const v of ['opaque', 'clear']) {
      const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 3 });
      const p = await ctx.newPage();
      await p.goto('file://' + path.join(OUT, v + '.html') + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`);
      await p.waitForFunction(() => window.__ready === true);
      await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(OUT, `${v}_${id}.png`) });
      await ctx.close();
    }
  }
  await b.close();
})();
