// Renders close-up stills of each ingredient from the real running scene (uses exp.snapshots()).
const fs = require('fs');
const path = require('path');
const { launch, openPage } = require('./helpers.cjs');
const out = process.argv[2] || 'artifacts/screenshots/closeups';
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await launch();
  const { page, logs } = await openPage(b, { width: 900, height: 700, query: '?q=high&still' });
  const shots = await page.evaluate(() => {
    const all = ['rice', 'sambal', 'egg', 'cucumber', 'anchovy', 'peanut', 'chicken'];
    return window.__nl.snapshots([
      { id: 'chicken', parts: all, pose: { az: 0.25, el: 0.45, fit: 0.3, ty: 0.12, tx: 0.3, tz: 0.46 } },
      { id: 'sambal-rice', parts: all, pose: { az: 0.0, el: 0.55, fit: 0.33, ty: 0.22, tx: -0.13, tz: -0.25 } },
      { id: 'egg', parts: all, pose: { az: 0.6, el: 0.7, fit: 0.24, ty: 0.08, tx: 0.57, tz: -0.27 } },
      { id: 'pile', parts: all, pose: { az: -0.5, el: 0.6, fit: 0.27, ty: 0.1, tx: -0.62, tz: 0.06 } },
      { id: 'cucumber', parts: all, pose: { az: -0.2, el: 0.75, fit: 0.27, ty: 0.06, tx: -0.38, tz: 0.5 } },
      { id: 'overview', parts: all, pose: { az: 0.46, el: 0.56, fit: 0.86, ty: 0.1 } },
    ], 900, 675);
  });
  for (const [k, v] of Object.entries(shots)) fs.writeFileSync(path.join(out, `${k}.jpg`), Buffer.from(v.split(',')[1], 'base64'));
  console.log(Object.keys(shots).join(', '));
  const errs = logs.filter((l) => /error/i.test(l));
  if (errs.length) console.log(errs.join('\n'));
  await b.close();
})();
