const { chromium } = require('playwright');
const URL = process.env.NL_URL || 'http://localhost:4173/';
async function launch() {
  return chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
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
  await page.waitForFunction(() => window.__nl || document.documentElement.classList.contains('no-webgl'), null, { timeout: 180000 });
  await page.waitForTimeout(1500);
  return { ctx, page, logs };
}
/** Scroll so that the assembly ScrollTrigger reports progress p, then wait for smoothing to settle. */
async function scrollToAssembly(page, p, settle = 2500) {
  await page.evaluate((p) => {
    const st = window.ScrollTriggerRef;
    const el = document.querySelector('#assembly');
    const pinStart = el.getBoundingClientRect().top + window.scrollY; // before pin applied this is the start
    const hero = document.querySelector('#hero');
    const start = hero.offsetHeight;
    window.scrollTo(0, start + p * window.innerHeight * 5);
  }, p);
  await page.waitForTimeout(settle);
}
module.exports = { launch, openPage, scrollToAssembly, URL };
