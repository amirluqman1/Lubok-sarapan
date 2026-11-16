// Real browser screenshots of the running site, driving the actual page scroll (ScrollTrigger).
// Usage: npm run build && npm run preview &   then   node tests/screenshots.cjs [outDir]
const fs = require('fs');
const path = require('path');
const { launch, openPage } = require('./helpers.cjs');
const OUT = process.argv[2] || 'artifacts/screenshots';

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch();
  const report = {};
  for (const vp of [
    { name: 'mobile', width: 390, height: 844, mobile: true },
    { name: 'desktop', width: 1440, height: 900, mobile: false },
  ]) {
    const { page, logs } = await openPage(b, vp);
    const st = await page.evaluate(() => ({ start: window.__st.start, end: window.__st.end }));
    const go = async (p) => {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(st.start + p * (st.end - st.start)));
      await page.waitForTimeout(1300);
    };
    const shot = async (file) => { await page.screenshot({ path: path.join(OUT, `${vp.name}-${file}.png`) }); console.log('saved', vp.name, file); };
    const r = (report[vp.name] = { frames: {} });
    // positions are timeline labels' progress (intro, mid-chapter for each ingredient, finale)
    const marks = await page.evaluate(() => {
      const tl = window.__tl, D = tl.duration();
      const at = (t) => t / D;
      return { intro: 0, introOut: at(0.8) };
    });
    const total = await page.evaluate(() => window.__tl.duration());
    const units = [[0, '00-intro'], [0.9, '01-empty-plate'], [1.75, '02-rice'], [3.0, '03-sambal'], [4.2, '04-egg'], [5.3, '05-cucumber'], [6.4, '06-anchovy'], [7.4, '07-peanut'], [8.6, '08-chicken'], [total, '09-finale']];
    for (const [u, name] of units) {
      await go(u / total);
      r.frames[name] = await page.evaluate(() => {
        const vis = [...document.querySelectorAll('.chap')].filter((c) => getComputedStyle(c).visibility === 'visible' && +getComputedStyle(c).opacity > 0.5).map((c) => c.querySelector('h2').textContent);
        return { frame: window.__seq.frame, caption: vis.join(',') };
      });
      await shot(name);
    }
    await go(3.0 / total);
    r.reverse = await page.evaluate(() => ({ frame: window.__seq.frame }));
    r.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    r.errors = logs.filter((l) => /error|failed/i.test(l));
    await page.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await b.close();
})();
