// Build overview.png (screen 3, page 2 B: country picker): every device at the same scale on #0b1218, 3 per row, ~2400 px wide.
const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const OUT = path.resolve(__dirname, '..');
const DEV = JSON.parse(fs.readFileSync(path.resolve(OUT, '../../shared/devices.json'), 'utf8'));
const TOTAL = 2400, PAD = 56, GAP = 48, BEZEL = 8, PER_ROW = 3;
const maxW = Math.max(...DEV.map((d) => d.w));
const cellW = Math.floor((TOTAL - 2 * PAD - (PER_ROW - 1) * GAP) / PER_ROW);
const k = (cellW - 2 * BEZEL) / maxW;                     // px per pt, identical for every device
const cut = { none: 'بدون نتوء', notch: 'نتوء (نوتش)', island: 'جزيرة ديناميكية' };

const cells = DEV.map((d) => {
  const w = Math.round(d.w * k), h = Math.round(d.h * k);
  const r = d.cutout === 'none' ? 6 : Math.round(39 * k) + BEZEL;
  const inset = d.side || d.bottom ? `هامش آمن: ${d.side} جانبي · ${d.bottom} سفلي` : 'بلا هوامش آمنة';
  return `<figure class="cell">
    <div class="bezel" style="border-radius:${r}px"><img src="../${d.id}.png" style="width:${w}px;height:${h}px;border-radius:${Math.max(r - BEZEL, 0)}px"></div>
    <figcaption><b>${d.ar}</b><span class="sz"><span class="ltr">${d.w} × ${d.h}</span> نقطة</span><span class="mt">${cut[d.cutout]} · ${inset}</span></figcaption>
  </figure>`;
}).join('\n');

const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0;padding:0}
body{width:${TOTAL}px;background:#0b1218;color:#EAF2F7;font-family:"IBM Plex Sans Arabic",sans-serif;padding:${PAD - 8}px ${PAD}px ${PAD}px}
header{display:flex;align-items:baseline;gap:18px;margin-bottom:36px}
header h1{font-size:34px;font-weight:700}
header p{font-size:21px;color:#A9BCCB}
.grid{display:flex;flex-wrap:wrap;justify-content:center;column-gap:${GAP}px;row-gap:44px}
.cell{width:${cellW}px;display:flex;flex-direction:column;align-items:center}
.bezel{background:#000;padding:${BEZEL}px;box-shadow:0 0 0 1px #2a3843, 0 10px 30px rgba(0,0,0,.45);line-height:0}
.bezel img{display:block}
figcaption{margin-top:16px;display:flex;flex-direction:column;align-items:center;gap:6px;text-align:center}
figcaption b{font-size:27px;font-weight:600}
figcaption .sz{font-size:21px;color:#C9D6E0;font-weight:500}
figcaption .mt{font-size:18px;color:#A9BCCB}
.ltr{direction:ltr;unicode-bidi:isolate;font-variant-numeric:tabular-nums}
</style></head><body>
<header><h1>اختيار الدولة (ب): على كل الآيفونات</h1><p>كل الأجهزة بنفس المقياس (${k.toFixed(3)} بكسل لكل نقطة) · أفقي</p></header>
<div class="grid">${cells}</div></body></html>`;

fs.writeFileSync(path.join(__dirname, 'overview.html'), html);
(async () => {
  const b = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined, args: ['--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: TOTAL, height: 800 }, deviceScaleFactor: 1 });
  await p.goto('file://' + path.join(__dirname, 'overview.html'));
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(() => Promise.all([...document.images].map((i) => i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; }))));
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(OUT, 'overview.png'), fullPage: true });
  console.log('k', k.toFixed(4), 'cellW', cellW);
  await b.close();
})();
