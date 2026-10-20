// Measure the map labels of ../map_overlay_cairo.svg (in the 1688 x 1097 map space, stroke included) so that
// placeMap() in ../index.html can keep every label either fully visible or fully under a panel, never sliced.
// Prints the LABELS line to paste into index.html.  Usage: NODE_PATH=.../node_modules node measure_labels.js
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await (await b.newContext({ viewport: { width: 1688, height: 1097 } })).newPage();
  await p.goto('file://' + path.resolve(__dirname, '../map_overlay_cairo.svg'));
  const L = await p.evaluate(() => [...document.querySelectorAll('text')].map((t) => {
    const bb = t.getBBox(), sw = parseFloat(t.getAttribute('stroke-width') || 0) / 2;
    return [t.textContent, Math.floor(bb.x - sw), Math.floor(bb.y - sw), Math.ceil(bb.x + bb.width + sw), Math.ceil(bb.y + bb.height + sw)];
  }));
  console.log('var LABELS = ' + JSON.stringify(L) + ';');
  await b.close();
})();
