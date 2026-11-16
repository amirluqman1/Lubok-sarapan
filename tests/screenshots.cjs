// Captures real browser renders of the running app at desktop and mobile viewports,
// driving the actual page scroll (ScrollTrigger) — no staged/fake images.
const fs = require('fs');
const path = require('path');
const { launch, openPage } = require('./helpers.cjs');
const OUT = process.argv[2] || 'artifacts/screenshots';

async function assemblyStart(page) {
  return page.evaluate(() => {
    const st = window.__st?.assembly;
    return st ? st.start : document.querySelector('#hero').offsetHeight;
  });
}
async function shoot(page, file, opts = {}) {
  await page.screenshot({ path: path.join(OUT, file), ...opts });
  console.log('saved', file);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await launch();
  const report = {};
  for (const vp of [
    { name: 'desktop', width: 1440, height: 900, mobile: false, query: '?still&q=high' },
    { name: 'mobile', width: 390, height: 844, mobile: true, query: '?still&q=medium' },
  ]) {
    const { page, logs } = await openPage(b, vp);
    const start = await assemblyStart(page);
    const len = await page.evaluate(() => window.__st.assembly.end - window.__st.assembly.start);
    const go = async (p, settle = 1200) => { await page.evaluate((y) => window.scrollTo(0, y), Math.round(start + p * len)); await page.waitForTimeout(settle); };
    await page.waitForTimeout(1500);
    await shoot(page, `${vp.name}-00-hero.png`);
    await go(0.06); await shoot(page, `${vp.name}-01-empty-plate.png`);
    await go(0.235); await shoot(page, `${vp.name}-02-rice.png`);
    await go(0.3); await shoot(page, `${vp.name}-03-sambal-pouring.png`);
    await go(0.56); await shoot(page, `${vp.name}-04-partial.png`);
    await go(0.86); await shoot(page, `${vp.name}-05-chicken-landing.png`);
    await go(1.0); await shoot(page, `${vp.name}-06-final-reveal.png`);
    // reverse scroll check: go back to 0.3 and compare state
    await go(0.3);
    const rev = await page.evaluate(() => ({ asm: window.__nl.asm, rice: window.__nl.state.rice, chicken: window.__nl.state.chicken }));
    report[vp.name] = { reverse: rev };
    await shoot(page, `${vp.name}-07-reversed-to-30pct.png`);
    // showcase + drag rotation
    await page.evaluate(() => document.querySelector('#showcase').scrollIntoView());
    await page.waitForTimeout(1500);
    const box = { x: vp.width / 2, y: vp.height * 0.55 };
    await page.mouse.move(box.x, box.y); await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + i * 18, box.y, { steps: 1 });
    await page.mouse.up();
    await page.waitForTimeout(1500);
    report[vp.name].yawAfterDrag = await page.evaluate(() => window.__nl.controls.state.yaw);
    await shoot(page, `${vp.name}-08-showcase-rotated.png`);
    await page.click('#rot-reset');
    await page.waitForTimeout(2000);
    report[vp.name].yawAfterReset = await page.evaluate(() => window.__nl.controls.state.yaw);
    // website sections
    for (const id of ['menu', 'kisah', 'promosi', 'lokasi', 'order']) {
      await page.evaluate((id) => document.getElementById(id).scrollIntoView(), id);
      await page.waitForTimeout(600);
      await shoot(page, `${vp.name}-09-${id}.png`);
    }
    report[vp.name].overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    report[vp.name].info = await page.evaluate(() => window.__nl.info());
    report[vp.name].errors = logs.filter((l) => /error|failed/i.test(l));
    await page.context().close();
  }
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await b.close();
})();
