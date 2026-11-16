// Screenshots of the hero (desktop + mobile) and a basic interaction check.
const fs = require('fs');
const { chromium } = require('playwright');
const URL = process.env.NL_URL || 'http://localhost:4173/';
const OUT = process.argv[2] || 'artifacts/screenshots';
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const report = {};
  for (const vp of [{ name: 'mobile', width: 390, height: 844, mobile: true }, { name: 'desktop', width: 1440, height: 900 }]) {
    const ctx = await b.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: vp.mobile ? 2 : 1, isMobile: !!vp.mobile, hasTouch: !!vp.mobile });
    const page = await ctx.newPage();
    const logs = [];
    page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
    page.on('pageerror', (e) => logs.push(e.message));
    page.on('requestfailed', (r) => { if (!/fonts\.g/.test(r.url())) logs.push('failed ' + r.url()); });
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);
    if (!vp.mobile) { await page.mouse.move(vp.width * 0.75, vp.height * 0.3); await page.waitForTimeout(1200); }
    await page.screenshot({ path: `${OUT}/${vp.name}-hero.png` });
    report[vp.name] = {
      floaters: await page.evaluate(() => window.__hero.floaters),
      overflowX: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      errors: logs,
    };
    await ctx.close();
  }
  console.log(JSON.stringify(report, null, 2));
  await b.close();
})();
