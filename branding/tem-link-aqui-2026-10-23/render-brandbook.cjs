const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const { chromium } = require(path.join(process.cwd(), 'frontend/node_modules/@playwright/test'));
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1300, height: 950 } });
  await page.goto(pathToFileURL(path.join(__dirname, 'brandbook.html')).href);
  await page.evaluate(() => document.fonts.ready);
  await page.locator('img').evaluateAll(images => Promise.all(images.map(img => img.decode())));
  assert.equal(await page.locator('.page').count(), 10);
  const overflow = await page.locator('.page').evaluateAll(pages => pages.map((page, i) => ({ page: i+1, overflow: page.scrollHeight > page.clientHeight+1 || page.scrollWidth > page.clientWidth+1 })).filter(x => x.overflow));
  assert.deepEqual(overflow, []);
  await page.locator('.page').nth(2).screenshot({ path: path.join(__dirname, 'brandbook-pagina-nexo.png') });
  await page.pdf({ path: path.join(__dirname, 'brandbook.pdf'), printBackground: true, preferCSSPageSize: true, tagged: true });
  await browser.close();
  console.log('10-page PDF generated; all images loaded; no page overflow.');
})().catch(error => { console.error(error); process.exit(1); });
