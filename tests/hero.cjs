// Screenshots of the whole flow (intro → nasi lemak hero → other menus) on phone + desktop,
// a walk through every hero menu, and basic error / overflow checks.
// Usage: npm run build && npm run preview &   then   node tests/hero.cjs [outDir]
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
    await page.waitForTimeout(3000);
    await page.screenshot({ path: `${OUT}/${vp.name}-1-intro.png` });
    const headerHiddenOnIntro = await page.evaluate(() => !document.querySelector('#top').classList.contains('is-on'));

    await page.evaluate(() => document.querySelector('#hero').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(3000);
    if (!vp.mobile) { await page.mouse.move(vp.width * 0.75, vp.height * 0.3); await page.waitForTimeout(1000); }
    await page.screenshot({ path: `${OUT}/${vp.name}-2-hero.png` });
    const headerShownOnHero = await page.evaluate(() => document.querySelector('#top').classList.contains('is-on'));

    const visited = [];
    for (let k = 0; k < 6; k++) {
      visited.push(await page.evaluate(() => `${window.__hero.current}:${document.querySelector('#line1').textContent} ${document.querySelector('#line2').textContent}`));
      await page.evaluate(() => document.querySelector('#next').click());
      await page.waitForTimeout(1600);
    }

    await page.evaluate(() => document.querySelector('#menu-lain').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${OUT}/${vp.name}-3-menu-lain.png` });
    await page.screenshot({ path: `${OUT}/${vp.name}-full.png`, fullPage: true });

    report[vp.name] = {
      headerHiddenOnIntro, headerShownOnHero, visited,
      dishes: await page.evaluate(() => document.querySelectorAll('.dish.is-in').length + '/' + document.querySelectorAll('.dish').length),
      orderButtons: await page.evaluate(() => document.querySelectorAll('[data-order], .cta').length),
      overflowX: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      errors: logs,
    };
    await ctx.close();
  }
  console.log(JSON.stringify(report, null, 2));
  await b.close();
})();
