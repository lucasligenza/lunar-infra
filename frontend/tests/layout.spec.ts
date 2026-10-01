import { test, expect } from '@playwright/test';

test('context docks own space and mobile task navigation keeps controls reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await page.getByRole('button', { name: /^Shackleton crater/ }).click();
  const viewport = page.locator('.globe-viewport');
  const drawer = page.getByRole('complementary', { name: 'Selected lunar region' });
  const surface = (await viewport.boundingBox())!, dock = (await drawer.boundingBox())!;
  expect(surface.x + surface.width).toBeLessThanOrEqual(dock.x + 1);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open destinations', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close region details', exact: true })).toBeInViewport();
  await page.screenshot({ path: '../artifacts/phase5-layout-mobile-region.png' });
  await page.getByRole('button', { name: 'Close region details', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reset globe', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Analyze', exact: true }).click();
  const navigation = page.getByRole('navigation', { name: 'Workspace navigation' });
  await navigation.getByRole('link', { name: 'Tools', exact: true }).click();
  await page.getByRole('button', { name: 'Inspect location', exact: true }).click();
  await expect(page.getByTestId('elevation-value')).toBeVisible();
  await navigation.getByRole('link', { name: 'Map', exact: true }).click();
  const toolbar = (await page.locator('.workspace-toolbar').boundingBox())!;
  const map = (await page.locator('.terrain-viewport').boundingBox())!;
  expect(toolbar.y + toolbar.height).toBeLessThanOrEqual(map.y + 1);
  await expect(page.getByRole('button', { name: 'Open inspector', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '../artifacts/phase5-layout-mobile-map.png' });
});
