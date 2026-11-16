const { launch, openPage } = require('./helpers.cjs');
(async () => {
  const b = await launch();
  const { page, logs } = await openPage(b, { width: 1280, height: 800, query: process.argv[2] || '' });
  console.log(await page.evaluate(() => window.__nl?.info()));
  await page.screenshot({ path: process.argv[3] || '/tmp/claude-0/q.png' });
  console.log(logs.join('\n'));
  await b.close();
})();
