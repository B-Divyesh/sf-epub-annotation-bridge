import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { strToU8, zipSync } from 'fflate';
import { Buffer } from 'node:buffer';

test('@claim:demo-sandbox sample data loads in an isolated demo', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Try it with sample data' }).click();
  await expect(page).toHaveURL(/\/demo$/);
  await expect(page.getByText('Demo — sample data, nothing is saved')).toBeVisible();
  await expect(page.locator('.ledger-row')).toHaveCount(5);
  expect(await page.evaluate(() => localStorage.getItem('epub-bridge:ledger:v1'))).toBeNull();
  await page.getByRole('button', { name: 'Reset demo' }).click();
  await expect(page.locator('.ledger-row')).toHaveCount(5);
});

test('@claim:portable-export exports every demo note as JSON and Markdown', async ({ page }) => {
  await page.goto('/demo');
  const jsonDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  const json = JSON.parse(await (await jsonDownload).createReadStream().then(async (stream) => {
    let value = ''; for await (const chunk of stream) value += chunk.toString(); return value;
  }));
  expect(json.annotations).toHaveLength(5);
  expect(json.annotations[0].cfi).toMatch(/^epubcfi/);
  const mdDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export Markdown' }).click();
  const stream = await (await mdDownload).createReadStream(); let markdown = '';
  for await (const chunk of stream) markdown += chunk.toString();
  expect(markdown).toContain('# Annotation ledger');
  expect(markdown.match(/^> /gm)).toHaveLength(5);
});

test('@claim:local-processing demo sends no reading data off site', async ({ page }) => {
  const external: string[] = [];
  page.on('request', (request) => { if (new URL(request.url()).origin !== 'http://127.0.0.1:4173') external.push(request.url()); });
  await page.goto('/demo');
  await page.getByLabel('Filter notes').fill('Walden');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  expect(external).toEqual([]);
});

test('@claim:offline-export saved demo reloads and exports offline', async ({ page, context }) => {
  await page.goto('/demo');
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 10_000 }).catch(async () => { await page.reload(); });
  await page.reload();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('.ledger-row')).toHaveCount(5);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export JSON' }).click();
  expect((await download).suggestedFilename()).toBe('annotation-ledger.json');
});

test('@claim:epub-quote-match finds an unmatched quote in an EPUB chapter', async ({ page }) => {
  const quote = 'A person should keep a portable record of every careful reading.';
  const epub = zipSync({
    'META-INF/container.xml': strToU8('<?xml version="1.0"?><container><rootfiles><rootfile full-path="OPS/book.opf"/></rootfiles></container>'),
    'OPS/book.opf': strToU8('<?xml version="1.0"?><package xmlns:dc="http://purl.org/dc/elements/1.1/"><metadata><dc:title>The Portable Reader</dc:title><dc:creator>A. Reader</dc:creator></metadata><manifest><item id="chapter" href="chapter.xhtml"/></manifest><spine><itemref idref="chapter"/></spine></package>'),
    'OPS/chapter.xhtml': strToU8(`<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>Margin Notes</title></head><body><h1>Margin Notes</h1><p>${quote}</p></body></html>`),
  });
  await page.goto('/ledger');
  await page.locator('#epub-input').setInputFiles({ name: 'portable-reader.epub', mimeType: 'application/epub+zip', buffer: Buffer.from(epub) });
  await page.locator('#annotation-input').setInputFiles({
    name: 'notes.csv', mimeType: 'text/csv',
    buffer: Buffer.from(`Book Title,Author,Chapter,Highlight,Annotation,Date\nThe Portable Reader,A. Reader,,${quote},Keep this,2026-08-20`),
  });
  await expect(page.locator('.ledger-row')).toHaveCount(1);
  await expect(page.locator('.ledger-row')).toContainText('Quote matched');
  await expect(page.locator('.ledger-row')).toContainText('Margin Notes');
  await expect(page.locator('.ledger-row code')).toContainText('epubcfi');
});

test('@claim:license-verify accepts a valid desktop license response', async ({ page }) => {
  await page.route('https://api.sociobot.in/**', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: '{"valid":true,"reason":"ok","expires_at":null}' }));
  await page.goto('/download');
  await page.getByLabel('Have a license? Paste it here').fill('test-license-token');
  await page.getByRole('button', { name: 'Verify license' }).click();
  await expect(page.locator('#license-status')).toHaveText('License active');
});

test('pages meet the serious accessibility baseline', async ({ page }, testInfo) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  for (const path of ['/', '/demo', '/download', '/privacy', '/terms', '/missing']) {
    await page.goto(path);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page).toHaveTitle(/EPUB Annotation Bridge/);
    const results = await new AxeBuilder({ page: page as never }).analyze();
    expect(results.violations.filter((item) => ['serious', 'critical'].includes(item.impact || '')), `${path}: ${JSON.stringify(results.violations)}`).toEqual([]);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/demo');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  testInfo.annotations.push({ type: 'a11y', description: 'axe serious/critical: 0' });
});

test('keyboard and error states give a clear next step', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to main content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main')).toBeFocused();
  await page.goto('/ledger');
  await expect(page.getByText('No annotations yet')).toBeVisible();
  await page.locator('#annotation-input').setInputFiles({ name: 'notes.txt', mimeType: 'text/plain', buffer: Buffer.from('not supported') });
  await expect(page.locator('#desk-status')).toContainText('This file type is not supported');
});
