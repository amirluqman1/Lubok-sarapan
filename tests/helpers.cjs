const { chromium } = require('playwright');
const URL = process.env.NL_URL || 'http://localhost:4173/';
async function launch() {
  return chromium.launch();
}
async function openPage(browser, { width = 1280, height = 800, mobile = false, query = '' } = {}) {
  const ctx = await browser.newContext(mobile
    ? { viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' }
    : { viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(240000);
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} ${r.failure()?.errorText}`));
  await page.goto(URL + query, { waitUntil: 'load' });
  await page.waitForFunction(() => document.documentElement.classList.contains('seq-ready'), null, { timeout: 60000 });
  // wait for every frame to finish loading so screenshots show exact frames
  await page.waitForFunction(() => window.__seq && window.__seq.loaded >= 1, null, { timeout: 120000 });
  return { ctx, page, logs };
}
module.exports = { launch, openPage, URL };
