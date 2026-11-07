// Second-country stress test (T-024): every page that names the player's country is rendered on the 7 phones with
// another country's names in place of Egypt's (Saudi Arabia, and the longest short names), and measured: the top row
// still fits (its fit level drops the leader and regime first, as designed), and no name, header line or header row
// overflows its box or runs into a neighbour. Pages are rewritten to a temporary copy beside the original (so relative
// paths work) and the copy is deleted after.
// Usage: NODE_PATH=... node tools/stress_names.js [set ...]   (sets: eg, sa, us, long, longest; default all). Exit code 1 on issues.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const R = path.resolve(__dirname, '..'), D = path.join(R, 'design');
const DEV = JSON.parse(fs.readFileSync(path.join(D, 'shared/devices.json'), 'utf8'));
const SETS = {
  // eg: Egypt's own names: the baseline, which must give 0 issues (a check that flags Egypt is wrong)
  eg: { nm: 'مصر', ldr: 'حسني مبارك', rg: 'جمهورية رئاسية', flag: 'eg', head: 'الرئيس محمد حسني مبارك · منذ 1981', prov: 'القاهرة', cur: 'الجنيه المصري' },
  // nm: the short name, used in the HUD, every header and the bodies (design doc §3.10); head: the leader's short form
  sa: { nm: 'السعودية', ldr: 'عبدالله بن عبدالعزيز', rg: 'ملكية مطلقة', flag: 'sa', head: 'الملك عبدالله بن عبدالعزيز · منذ 2005', prov: 'المنطقة الشرقية', cur: 'الريال السعودي' },
  us: { nm: 'الولايات المتحدة', ldr: 'باراك أوباما', rg: 'جمهورية رئاسية اتحادية', flag: 'us', head: 'الرئيس باراك أوباما · منذ 2009', prov: 'كاليفورنيا', cur: 'الدولار الأمريكي' },
  long: { nm: 'أفريقيا الوسطى', ldr: 'فرانسوا بوزيزي', rg: 'جمهورية رئاسية', flag: 'cf', head: 'الرئيس فرانسوا بوزيزي · منذ 2003', prov: 'أوهام-بندي', cur: 'فرنك وسط أفريقيا' },
  // the widest short name the registry allows (§3.10's bound), with a long leader, regime and province
  longest: { nm: 'الكونغو الديمقراطية', ldr: 'جوزيف كابيلا', rg: 'جمهورية شبه رئاسية', flag: 'cd', head: 'الرئيس جوزيف كابيلا · منذ 2001', prov: 'كيفو الشمالية', cur: 'الفرنك الكونغولي' },
};
const ONLY = process.env.PAGES ? process.env.PAGES.split(',') : null;
const PAGES0 = ['screen1/B3', 'screen3/p2B', 'screen4/R', 'screen5/A', 'screen6/A', 'screen7/A', 'screen8/A', 'screen9/A', 'screen10/A', 'screen11/A',
  'screen12/A', 'screen13/A', 'screen14/A', 'screen18/A', 'screen20/A', 'screen23/A'];
const PAGES = ONLY ? PAGES0.filter((p) => ONLY.includes(p)) : PAGES0;
const sub = (t, s) => t
  .replace(/<b class="nm">مصر<\/b>/g, `<b class="nm">${s.nm}</b>`)
  .replace(/<span class="ldr">(حسني مبارك|رئيس الدولة)<\/span>/g, `<span class="ldr">${s.ldr}</span>`)
  .replace(/<span class="nm">مصر<\/span>/g, `<span class="nm">${s.nm}</span>`)
  .replace(/<span class="v">حسني مبارك<\/span>/g, `<span class="v">${s.ldr}</span>`)
  .replace(/<span class="v">جمهورية رئاسية<\/span>/g, `<span class="v">${s.rg}</span>`)
  .replace(/<span class="rg">جمهورية رئاسية<\/span>/g, `<span class="rg">${s.rg}</span>`)
  .replace(/<h2 class="r-name">مصر<\/h2>/g, `<h2 class="r-name">${s.nm}</h2>`)
  .replace(/<h2 class="r-name">القاهرة<\/h2>/g, `<h2 class="r-name">${s.prov}</h2>`)
  .replace(/(<div class="r-sub">[^\n]*?)(حملة )?مصر/g, (m, a, b) => a + (b || '') + s.nm)
  .replace(/<div class="r-sub">الرئيس محمد حسني مبارك<span class="r-dot"> · <\/span>منذ <span class="ltr">1981<\/span><\/div>/g, `<div class="r-sub">${s.head.split(' · ').map((x) => x.replace(/(\d+)/g, '<span class="ltr">$1</span>')).join('<span class="r-dot"> · </span>')}</div>`)
  .replace(/flags\/eg\.svg/g, `flags/${s.flag}.svg`).replace(/shared\/flag_eg\.svg/g, `shared/flags/${s.flag}.svg`);
// the sheet's own text: every visible «مصر» as a word (not in attributes or comments, not «المصري»), and the currency cap
const inSheet = (t, s) => { const a = t.indexOf('<section class="sheet'); if (a < 0) return t; const b = t.indexOf('</section>', a);
  const body = t.slice(a, b).replace(/<!--[\s\S]*?-->/g, '').replace(/>([^<]+)</g, (m, x) => '>' + x.replace(/(^|[\s(«])مصر(?=$|[\s)»·،.:])/g, '$1' + s.nm) + '<')
    .replace(/الجنيه المصري/g, s.cur);
  return t.slice(0, a) + body + t.slice(b); };
const subPage = (pg, t, s) => inSheet(sub(t, s), s);
(async () => {
  const want = process.argv.slice(2).filter((a) => SETS[a]), sets = want.length ? want : Object.keys(SETS);
  const b = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const out = [];
  for (const pg of PAGES) {
    const src = path.join(D, pg, 'index.html'), raw = fs.readFileSync(src, 'utf8');
    for (const k of sets) {
      const tmp = path.join(D, pg, `index.stress_${k}.html`); fs.writeFileSync(tmp, subPage(pg, raw, SETS[k]));
      try {
        for (const d of DEV) {
          const ctx = await b.newContext({ viewport: { width: d.w, height: d.h } }), p = await ctx.newPage();
          await p.goto('file://' + tmp + `?w=${d.w}&h=${d.h}&side=${d.side}&bottom=${d.bottom}&cutout=${d.cutout}`);
          await p.waitForFunction(() => window.__ready === true, null, { timeout: 30000 }).catch(() => {});
          await p.waitForTimeout(300);
          const r = await p.evaluate(() => {
            const hidden = (n) => { for (let e = n.parentElement; e; e = e.parentElement) if (/inset\(50%\)/.test(getComputedStyle(e).clipPath)) return true; return false; };
            const textRects = (e) => { const out = []; const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT); let n;
              while ((n = w.nextNode())) { if (!n.textContent.trim() || hidden(n)) continue; const r = document.createRange(); r.selectNodeContents(n); out.push(...[...r.getClientRects()].filter((x) => x.width > 0.5)); } return out; };
            const union = (rs) => rs.length ? { left: Math.min(...rs.map((r) => r.left)), right: Math.max(...rs.map((r) => r.right)), width: Math.max(...rs.map((r) => r.right)) - Math.min(...rs.map((r) => r.left)) } : { left: 0, right: 0, width: 0 };
            const iss = [], vis = (e) => { const cs = getComputedStyle(e), b = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && b.width > 0; };
            const f = window.__fit || {}; if (f.need > f.avail + 0.5) iss.push(`top row over by ${(f.need - f.avail).toFixed(1)}`);
            ['.nation .nm', '.nation .ldr', '.nation .rg', '.r-name', '.r-sub', '.r-hd .r-cap'].forEach((s) => document.querySelectorAll(s).forEach((e) => {
              if (!vis(e)) return; if (e.scrollWidth > e.clientWidth + 0.5 && getComputedStyle(e).overflowX !== 'visible' && getComputedStyle(e).textOverflow !== 'ellipsis') iss.push(`${s} clipped: ${e.textContent.trim()}`);
              const tb = union(textRects(e)), eb = e.getBoundingClientRect(); if (!tb.width) return;
              const cs = getComputedStyle(e), ell = cs.textOverflow === 'ellipsis' && cs.overflowX !== 'visible';
              if (ell && s === '.r-sub' && (tb.right > eb.right + 0.5 || tb.left < eb.left - 0.5)) { window.__ell = (window.__ell || []).concat(e.textContent.trim()); return; }
              if (ell && (tb.right > eb.right + 0.5 || tb.left < eb.left - 0.5)) { iss.push(`${s} name truncated: ${e.textContent.trim()}`); return; }
              if (tb.right > eb.right + 0.5 || tb.left < eb.left - 0.5) iss.push(`${s} text wider than its box: ${e.textContent.trim()} (${tb.width.toFixed(0)} in ${eb.width.toFixed(0)})`); }));
            // one line each: a name, a cap or a sub-line that wraps breaks its row (the reviewers, T-024)
            ['.nation .nm', '.r-name', '.r-sub', '.r-hd .r-cap', '.sel .nm', '.chip .nm'].forEach((sel) => document.querySelectorAll(sel).forEach((e) => {
              if (!vis(e)) return;
              const tops = new Set(textRects(e).map((r) => Math.round(r.top + r.height / 2)));
              if (tops.size > 1) iss.push(`${sel} wraps to ${tops.size} lines: ${e.textContent.trim()}`);
              if (e.scrollHeight > e.clientHeight + 1 && getComputedStyle(e).overflowY !== 'visible') iss.push(`${sel} text taller than its box: ${e.textContent.trim()}`); }));
            // every text in the sheet stays inside the body that clips it (names in rows, notes, cells)
            document.querySelectorAll('.sheet .r-body').forEach((bd) => { if (!vis(bd)) return; const bb = bd.getBoundingClientRect();
              bd.querySelectorAll('*').forEach((e) => { if (!vis(e) || ![...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) return;
                const rg = document.createRange(); rg.selectNodeContents(e); const tb = rg.getBoundingClientRect();
                if (tb.width && (tb.left < bb.left - 0.5 || tb.right > bb.right + 0.5)) iss.push(`body text runs out of its panel: ${e.textContent.trim().slice(0, 40)}`); }); });
            const hd = document.querySelector('.sheet .r-hd'); if (hd) { const sb = document.querySelector('.sheet').getBoundingClientRect();
              const kids = [...hd.querySelectorAll('.r-flag, .r-name, .r-cap, .r-sub, .s-emb, .r-x')].filter(vis).map((e) => [e, e.getBoundingClientRect()]);
              // the state panel's mode chip as its icon alone is a 20 pt circle (T-025's boxes-and-type review)
              hd.querySelectorAll('.cap-icon .r-cap').forEach((e) => { const b = e.getBoundingClientRect(); if (vis(e) && (Math.abs(b.width - 20) > 0.5 || Math.abs(b.height - 20) > 0.5)) iss.push(`the icon chip is ${b.width.toFixed(1)}x${b.height.toFixed(1)} (want 20x20)`); });
              // the header's controls keep their sizes (the close button, the emblem, the flag)
              [['.r-x', 32, 32], ['.s-emb', 32, 32], ['.r-flag', 40, 30]].forEach(([sel, w, h]) => hd.querySelectorAll(sel).forEach((e) => { const b = e.getBoundingClientRect();
                if (vis(e) && (Math.abs(b.width - w) > 0.5 || Math.abs(b.height - h) > 0.5)) iss.push(`header ${sel} ${b.width.toFixed(1)}x${b.height.toFixed(1)} (want ${w}x${h})`); }));
              const tt = hd.querySelector('.r-tt'), hb = hd.getBoundingClientRect(); if (tt && (tt.getBoundingClientRect().top < hb.top - 0.5 || tt.getBoundingClientRect().bottom > hb.bottom + 0.5)) iss.push('header title block taller than the header');
              kids.forEach(([e, b]) => { if (b.left < sb.left + 11.5 || b.right > sb.right - 11.5) iss.push(`header ${e.className} outside the sheet's padding`);
                if (b.top < sb.top - 0.5 || b.bottom > sb.bottom + 0.5) iss.push(`header ${e.className} above or below the sheet`); });
              for (let i = 0; i < kids.length; i++) for (let j = i + 1; j < kids.length; j++) { const a = kids[i][1], c = kids[j][1];
                if (a.left < c.right - 0.5 && c.left < a.right - 0.5 && a.top < c.bottom - 0.5 && c.top < a.bottom - 0.5) iss.push(`header ${kids[i][0].className} overlaps ${kids[j][0].className}`); } }
            const nm = document.querySelector('.nation .nm');
            return { iss, fit: f.level, shown: nm && vis(nm) ? 'name' : 'flag only', ell: window.__ell || [] };
          });
          out.push({ pg, set: k, dev: d.id, ...r });
          await ctx.close();
        }
      } finally { fs.unlinkSync(tmp); }
    }
  }
  await b.close();
  const bad = out.filter((x) => x.iss.length);
  out.filter((x) => x.pg === 'screen1/B3').forEach((x) => console.log(`HUD ${x.set} ${x.dev}: fit ${x.fit}, ${x.shown}`));
  bad.forEach((x) => console.log(`ISSUE ${x.pg} ${x.set} ${x.dev}: ${x.iss.join(' | ')}`));
  console.log(`${out.length} renders, ${bad.length} with issues, ${out.filter((x) => x.ell.length).length} with a sub-line ellipsized`);
  fs.writeFileSync(path.join(R, 'tools/stress_names_report.json'), JSON.stringify(out, null, 1));
  out.filter((x) => x.ell.length).forEach((x) => console.log(`ELLIPSIS ${x.pg} ${x.set} ${x.dev}: ${x.ell.join(' | ')}`));
  if (bad.length) process.exitCode = 1;
})();
