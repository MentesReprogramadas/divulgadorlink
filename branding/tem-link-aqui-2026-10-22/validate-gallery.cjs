const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { chromium } = require(path.join(process.cwd(), 'frontend/node_modules/@playwright/test'));

(async () => {
  const directory = path.join(__dirname, 'nova-identidade');
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(pathToFileURL(path.join(directory, 'index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Overflow at ${width}`);
    assert(await page.locator('img').evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0)), `Broken image at ${width}`);
    await page.keyboard.press('Tab');
    assert.equal(await page.locator(':focus').getAttribute('download'), '');
    assert.notEqual(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle), 'none');
    const summaries = page.locator('summary');
    for (let i = 0; i < await summaries.count(); i++) {
      await summaries.nth(i).focus();
      await page.keyboard.press('Enter');
      assert.equal(await summaries.nth(i).evaluate(el => el.parentElement.open), true);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: path.join(directory, `galeria-${width}.png`), fullPage: true });
  }
  const hrefs = await page.locator('a').evaluateAll(links => links.map(link => link.getAttribute('href')));
  for (const href of hrefs) assert(fs.existsSync(path.resolve(directory, href)), `Missing link: ${href}`);
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(pathToFileURL(path.join(directory, '01-encontro/favicon.svg')).href);
  assert.equal(await page.locator('.ink').first().evaluate(el => getComputedStyle(el).fill), 'rgb(255, 255, 255)');
  await page.emulateMedia({ colorScheme: 'light' });
  assert.equal(await page.locator('.ink').first().evaluate(el => getComputedStyle(el).fill), 'rgb(10, 25, 47)');
  assert.deepEqual(errors, []);
  await browser.close();
  console.log('PASS: 320/390/1440px; all images and links; keyboard details and focus; light/dark favicon; no page errors.');
})().catch(error => { console.error(error); process.exit(1); });
