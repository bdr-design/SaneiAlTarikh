const { chromium } = require('playwright');
(async () => {
  const [,, dir, out] = process.argv;
  const fs = require('fs');
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1000, height: 560 } });
  for (const f of fs.readdirSync(dir).filter(x => x.endsWith('.svg'))) {
    await p.goto('file://' + dir + '/' + f);
    await p.setViewportSize({ width: 1000, height: 560 });
    await p.evaluate(() => { const s = document.querySelector('svg'); s.setAttribute('width', '1000'); s.removeAttribute('height'); });
    await p.screenshot({ path: out + '/' + f.replace('.svg', '.png') });
  }
  await b.close();
})();
