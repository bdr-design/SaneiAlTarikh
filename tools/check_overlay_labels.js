// Check the city names of the shared MENA overlay (design/shared/map_mena_d1_overlay.svg), measured in Chromium with the
// project font, as the overlay is drawn (an <img> or the inline label layer, both left to right): every city name has
// direction="rtl"; no city name is over its own dot (halo and ring included); no city name is over another label or
// another city's dot. Usage: node tools/check_overlay_labels.js [overlay.svg]   (prints the issues; exit 1 if any)
// Also: require('./check_overlay_labels.js').check(browser, file) -> Promise<string[]>
const fs = require('fs');
const path = require('path');
async function check(b, file) {
  const svg = fs.readFileSync(file, 'utf8');
  const p = await b.newPage();
  await p.setContent(`<!doctype html><meta charset="utf-8"><body style="margin:0">${svg.replace(/^<\?xml[^>]*>/, '')}</body>`);
  await p.evaluate(() => document.fonts.ready);
  const issues = await p.evaluate(() => {
    const out = [], bb = (e) => { const b = e.getBBox(), w = parseFloat(e.getAttribute('stroke-width') || 0) / 2; return [b.x - w, b.y - w, b.x + b.width + w, b.y + b.height + w]; };
    const hit = (a, c) => Math.min(a[2], c[2]) - Math.max(a[0], c[0]) > 0.5 && Math.min(a[3], c[3]) - Math.max(a[1], c[1]) > 0.5;
    const els = [...document.querySelectorAll('svg text, svg circle')], cities = [];
    els.forEach((e, i) => { if (e.tagName === 'circle' && els[i + 1] && els[i + 1].tagName === 'text') cities.push([e, els[i + 1]]); });
    if (cities.length !== 11) out.push('expected 11 city dots with their names, found ' + cities.length);
    cities.forEach(([dot, nm]) => {
      const n = nm.textContent, a = bb(nm);
      if (nm.getAttribute('direction') !== 'rtl') out.push(`city name «${n}» not right to left`);
      if (hit(a, bb(dot))) out.push(`city name «${n}» over its own dot`);
      els.forEach((o) => { if (o === nm || o === dot) return; if (hit(a, bb(o))) out.push(`city name «${n}» over ${o.tagName === 'text' ? '«' + o.textContent + '»' : 'another city\'s dot'}`); });
    });
    return out;
  });
  await p.close();
  return issues;
}
module.exports = { check };
if (require.main === module) {
  (async () => {
    const { chromium } = require('playwright');
    const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
    const f = process.argv[2] || path.join(__dirname, '../design/shared/map_mena_d1_overlay.svg');
    const issues = await check(b, f); await b.close();
    console.log(issues.length ? issues.join('\n') : 'overlay city names: OK (11 names, each beside its dot, none over another label)');
    process.exit(issues.length ? 1 : 0);
  })();
}
