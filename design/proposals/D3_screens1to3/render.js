// D-3 (opaque panels, no blur): screens 1-3 as approved (glass) and as they switch at build time (opaque), side by side
// renders on the iPhone 16 for the owner. The opaque version only overrides the glass: no blur, the panels' solid
// rgb(12,20,28), the same 1 pt border.
const path = require('path'), fs = require('fs');
const { chromium } = require('playwright');
const D = path.resolve(__dirname, '../..'), OUT = __dirname;
const dev = JSON.parse(fs.readFileSync(path.join(D, 'shared/devices.json'), 'utf8')).find((d) => d.id === 'i16');
const OPAQUE = '.glass, .frost, .chip, .card, .hdr, .sel { -webkit-backdrop-filter: none !important; backdrop-filter: none !important; } .glass { background: rgb(12, 20, 28) !important; }';
(async () => {
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  for (const pg of ['screen1/B3', 'screen3/p1A', 'screen3/p2B', 'screen3/p3B']) {
    for (const [k, css] of [['glass', ''], ['opaque', OPAQUE]]) {
      const ctx = await b.newContext({ viewport: { width: dev.w, height: dev.h }, deviceScaleFactor: 2 }), p = await ctx.newPage();
      await p.goto('file://' + path.join(D, pg, 'index.html') + `?w=${dev.w}&h=${dev.h}&side=${dev.side}&bottom=${dev.bottom}&cutout=${dev.cutout}`);
      await p.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }).catch(() => {});
      if (css) await p.addStyleTag({ content: css });
      await p.waitForTimeout(400);
      await p.screenshot({ path: path.join(OUT, `${pg.replace('/', '_')}_${k}.png`) });
      await ctx.close();
    }
  }
  await b.close();
})();
