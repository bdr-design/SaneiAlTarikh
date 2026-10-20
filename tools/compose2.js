const { chromium } = require('playwright');
(async () => {
  const [,, dir, out, w, h] = process.argv;
  const pairs = [1,2,3,4,5,6].map(i => [`d${i}.jpg`, `od${i}.svg`, `D${i}`]);
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1100, height: Math.round(1100 * h / w) } });
  for (const [bg, ov, k] of pairs) {
    require('fs').writeFileSync(`${dir}/c_${k}.html`, `<html><body style="margin:0"><div style="position:relative;width:1100px"><img src="${bg}" style="width:1100px;display:block"><img src="${ov}" style="position:absolute;inset:0;width:1100px"></div></body></html>`);
    await p.goto(`file://${dir}/c_${k}.html`);
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${out}/variant_${k}.png` });
  }
  await b.close();
})();
