// Usage: node render_screen.js <input.html> <output.png> [width=844] [height=390] [scale=3]
const { chromium } = require('playwright');
(async () => {
  const [,, input, output, w = '844', h = '390', scale = '3'] = process.argv;
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: +w, height: +h }, deviceScaleFactor: +scale });
  await p.goto('file://' + require('path').resolve(input));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(600);
  await p.screenshot({ path: output });
  await b.close();
})();
