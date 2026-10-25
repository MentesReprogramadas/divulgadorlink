const path = require('node:path');
const fs = require('node:fs');
const { pathToFileURL, fileURLToPath } = require('node:url');
const { test, expect } = require(path.join(process.cwd(), 'frontend/node_modules/@playwright/test'));
const AxeBuilder = require(path.join(process.cwd(), 'frontend/node_modules/@axe-core/playwright')).default;
const url = pathToFileURL(path.join(__dirname, 'index.html')).href;
for (const width of [320, 390, 768, 1440]) {
  test(`gallery and three identities at ${width}px`, async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(url);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(img => {img.loading='eager';return img.decode();})));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(/A marca sai\s*da tela\./);
    await expect(page.locator('.concept-item')).toHaveCount(20);
    await expect(page.locator('[data-direction]')).toHaveCount(3);
    expect(await page.locator('[data-direction]').evaluateAll(items => items.map(item => item.dataset.direction))).toEqual(['nexo','tla','confluencia']);
    await expect(page.locator('main')).not.toContainText(/Ponte|Farol|\bLiga\b|\bRota\b/);
    expect(await page.locator('[data-concept]').evaluateAll(buttons => buttons.map(button => Number(button.dataset.concept.slice(0,2))))).toEqual(Array.from({length:20},(_,i)=>i+1));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    for (const id of ['nexo', 'tla', 'confluencia']) {
      const button = page.locator(`[data-direction="${id}"]`);
      await button.focus();
      await page.keyboard.press('Enter');
      await expect(button).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[aria-pressed=true]')).toHaveCount(1);
      for (const image of await page.locator('[data-brand-src]').all()) await expect(image).toHaveAttribute('src', new RegExp(`^${id}/`));
      await page.locator('img').evaluateAll(images => Promise.all(images.map(img => {img.loading='eager';return img.decode();})));
      await expect(page.locator('#direction-download')).toHaveAttribute('href', `${id}/${id}-kit.zip`);
    }
    for (const number of ['01','09','19','10','20']) {
      const trigger = page.locator(`[data-concept^="${number}"]`);
      await trigger.focus();
      await page.keyboard.press('Enter');
      const dialog = page.getByRole('dialog');
      await expect(dialog).toBeVisible();
      await expect(page.locator('#concept-dialog-title')).toHaveText(await trigger.getAttribute('data-concept'));
      await expect(dialog.locator('.concept-art')).toHaveAttribute('data-quadrant', await trigger.getAttribute('data-quadrant'));
      const vector = await trigger.getAttribute('data-vector');
      await expect(dialog.locator('img')).toHaveAttribute('src', vector || await trigger.getAttribute('data-sheet'));
      await expect(page.locator('#concept-download')).toHaveAttribute('href', await trigger.getAttribute('data-vector-download') || await trigger.getAttribute('data-sheet'));
      await expect(dialog.locator('.concept-art')).toHaveAttribute('data-vector', String(Boolean(vector)));
      if (vector) {
        await expect(dialog.locator('.caption')).toContainText('Vetor com contornos');
        const image = dialog.locator('img');
        await image.evaluate(el => el.decode());
        expect(await image.evaluate(el => Math.round(el.getBoundingClientRect().width) === Math.round(el.parentElement.getBoundingClientRect().width))).toBeTruthy();
      }
      if (number === '10' && (width === 390 || width === 1440)) {
        await page.screenshot({path:path.join(__dirname,`validation/conceito-ampliado-${width}.png`)});
        const results = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
        expect(results.violations).toEqual([]);
      }
      if (number === '20') await page.getByRole('button',{name:'Fechar',exact:true}).click();
      else await page.keyboard.press('Escape');
      await expect(dialog).not.toBeVisible();
      await expect(trigger).toBeFocused();
    }
    for (const link of await page.locator('a[href]').evaluateAll(links => links.map(a => a.href).filter(href => href.startsWith('file:')))) {
      expect(fs.existsSync(fileURLToPath(new URL(link.split('#')[0]))), link).toBeTruthy();
    }
    expect(errors).toEqual([]);
    await page.locator('[data-direction=nexo]').click();
    await page.evaluate(() => window.scrollTo(0,0));
    await page.screenshot({ path: path.join(__dirname, `validation/galeria-${width}.png`), fullPage: true });
    if (width === 390 || width === 1440) {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
      expect(results.violations).toEqual([]);
    }
  });
}
test('reduced motion, CSS zoom 200%, focus and theme-aware favicon', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(url);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  await page.keyboard.press('Tab');
  await expect(page.locator(':focus')).toHaveClass('skip');
  expect(await page.locator(':focus').evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await page.evaluate(() => document.documentElement.style.zoom='2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.screenshot({ path: path.join(__dirname, 'validation/zoom-css-200.png') });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(pathToFileURL(path.join(__dirname, 'nexo/digital/favicon.svg')).href);
  expect(await page.locator('.ink').first().evaluate(el => getComputedStyle(el).fill)).toBe('rgb(255, 255, 255)');
  await page.emulateMedia({ colorScheme: 'light' });
  expect(await page.locator('.ink').first().evaluate(el => getComputedStyle(el).fill)).toBe('rgb(10, 25, 47)');
});

for (const width of [390, 1440]) {
  test(`official Confluência library at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(pathToFileURL(path.join(__dirname, 'marca-confluencia/index.html')).href);
    await page.evaluate(() => document.fonts.ready);
    await page.locator('img').evaluateAll(images => Promise.all(images.map(image => { image.loading='eager'; return image.decode(); })));
    await expect(page.locator('#logos article')).toHaveCount(24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const link of await page.locator('a[href]').evaluateAll(links => links.map(link => link.href).filter(href => href.startsWith('file:')))) {
      expect(fs.existsSync(fileURLToPath(new URL(link.split('#')[0]))), link).toBe(true);
    }
    const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(results.violations).toEqual([]);
    await page.screenshot({ path: path.join(__dirname, `validation/marca-oficial-${width}.png`), fullPage: true });
  });
}
