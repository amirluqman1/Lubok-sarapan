// Public menu + admin screens with Neon responses mocked in the browser (the sandbox cannot reach Neon).
// Checks: live data is used, "Habis"/"Tutup" badges render (hero + list), fallback works when Neon is down,
// admin login screen renders. Usage: npm run build && npm run preview &  then  node tests/menu.cjs [outDir]
const fs = require('fs');
const { chromium } = require('playwright');
const snap = require('../src/data/menu-snapshot.json');
const URL = process.env.NL_URL || 'http://localhost:4173/';
const OUT = process.argv[2] || 'artifacts/screenshots';

const live = snap.items.map((i) => ({ ...i, closed: i.id === 'roti-tsunami', sold_out_today: ['paru', 'roti-bom', 'milo', 'bakso'].includes(i.id) }));
live.find((i) => i.id === 'teh-o').price = 2.5;

async function mockNeon(page, mode) {
  await page.route(/neonauth\..*\/token\/anonymous/, (r) => (mode === 'down' ? r.abort() : r.fulfill({ json: { token: 'test.jwt.token', expires_at: Date.now() / 1000 + 600 } })));
  await page.route(/apirest\..*\/categories/, (r) => r.fulfill({ json: snap.categories }));
  await page.route(/apirest\..*\/menu_public/, (r) => r.fulfill({ json: live }));
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const report = {};
  for (const mode of ['live', 'down']) {
    const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await mockNeon(page, mode);
    await page.goto(URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    await page.evaluate(() => document.querySelector('#hero').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(2500);
    await page.evaluate(() => window.__hero.show(1));            // Sambal Paru (sold out in the mock)
    await page.waitForTimeout(1800);
    if (mode === 'live') await page.screenshot({ path: `${OUT}/mobile-4-hero-habis.png` });
    const hero = await page.evaluate(() => ({ status: document.querySelector('#hero-status').textContent, offCards: document.querySelectorAll('.card.is-off').length }));
    await page.evaluate(() => document.querySelector('#menu-lain').scrollIntoView({ behavior: 'instant' }));
    await page.waitForTimeout(1500);
    if (mode === 'live') {
      await page.screenshot({ path: `${OUT}/mobile-5-menu-lain.png` });
      await page.evaluate(() => document.querySelector('#cat-minuman').scrollIntoView({ behavior: 'instant', block: 'start' }));
      await page.waitForTimeout(1200);
      await page.screenshot({ path: `${OUT}/mobile-6-minuman.png` });
    }
    report[mode] = {
      hero,
      status: await page.evaluate(() => document.querySelector('#more-status').textContent),
      categories: await page.evaluate(() => [...document.querySelectorAll('.cat__name')].map((e) => e.textContent)),
      items: await page.evaluate(() => document.querySelectorAll('.mi').length),
      offItems: await page.evaluate(() => [...document.querySelectorAll('.mi--off .mi__name')].map((e) => e.textContent.trim())),
      tehOPrice: await page.evaluate(() => [...document.querySelectorAll('.mi')].find((e) => e.textContent.includes('Teh O'))?.querySelector('.mi__price')?.textContent || null),
      overflowX: await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth),
      errors,
    };
    await ctx.close();
  }
  // admin login screen (auth server unreachable here → must fall back to the login form, not hang)
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/neonauth\./, (r) => r.abort());
  await page.goto(URL + 'admin/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${OUT}/mobile-7-admin-login.png` });
  report.admin = { view: await page.evaluate(() => document.querySelector('.view.is-on')?.dataset.view), errors };
  await ctx.close();
  console.log(JSON.stringify(report, null, 2));
  await b.close();
})();
