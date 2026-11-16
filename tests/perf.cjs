// Scroll-smoothness probe: mobile viewport, 4× CPU throttle, wheel-scrolls through the film and
// records requestAnimationFrame intervals. Reports average FPS and the share of slow frames.
// Usage: node tests/perf.cjs   (needs `npm run preview` on :4173)
const { launch, openPage } = require('./helpers.cjs');

(async () => {
  const b = await launch();
  const { page } = await openPage(b, { width: 390, height: 844, mobile: true });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.evaluate(() => {
    window.__ft = [];
    let last = performance.now();
    const loop = (t) => { window.__ft.push(t - last); last = t; if (window.__ft.length < 100000) requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const end = await page.evaluate(() => window.__st.end);
  const steps = 160;
  for (let i = 0; i < steps; i++) {
    await page.evaluate((y) => window.scrollBy(0, y), end / steps);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const f = window.__ft.slice(5);
    const avg = f.reduce((a, b) => a + b, 0) / f.length;
    const slow = f.filter((x) => x > 33.4).length / f.length;
    const p95 = [...f].sort((a, b) => a - b)[Math.floor(f.length * 0.95)];
    return { frames: f.length, avgFps: +(1000 / avg).toFixed(1), slowFramePct: +(slow * 100).toFixed(1), p95ms: +p95.toFixed(1) };
  });
  console.log(JSON.stringify(r));
  await b.close();
})();
