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
      await page.waitForTimeout(900);
    };
    const shot = async (file) => { await page.screenshot({ path: path.join(OUT, `${vp.name}-${file}.png`) }); console.log('saved', vp.name, file); };
    const r = (report[vp.name] = { frames: {} });
    for (const [p, name] of [[0, '01-empty-plate'], [0.12, '02-rice'], [0.3, '03-sambal'], [0.5, '04-egg-cucumber'], [0.7, '05-anchovy-peanut'], [0.82, '06-chicken'], [1, '07-complete']]) {
      await go(p);
      r.frames[name] = await page.evaluate(() => ({ frame: window.__seq.frame, step: document.querySelector('#seq-stitle').textContent }));
      await shot(name);
    }
    await go(0.3);
    r.reverse = await page.evaluate(() => ({ frame: window.__seq.frame, step: document.querySelector('#seq-stitle').textContent }));
    for (const id of ['menu', 'kisah', 'lokasi', 'order']) {
      await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
      await page.waitForTimeout(500);
      await shot(`08-${id}`);
    }
    r.overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    r.errors = logs.filter((l) => /error|failed/i.test(l));
    await page.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await b.close();
})();
