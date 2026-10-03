import {openDestinations} from './workspace';
import { test, expect } from '@playwright/test';

function luminance(value: string) {
  const channels = value.match(/[\d.]+/g)!.slice(0, 3).map(Number).map(channel => {
    const v = channel / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0] + .7152 * channels[1] + .0722 * channels[2];
}

test('mission-control text, actions and technical typography remain readable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('body')).toHaveCSS('font-family', /Geist/);
  await openDestinations(page);
  await page.getByRole('button', { name: /^Shackleton crater/ }).click();
  const primary = page.getByRole('button', { name: 'Find settlement sites', exact: true });
  const colors = await primary.evaluate(element => {
    const style = getComputedStyle(element); return [style.color, style.backgroundColor];
  });
  const [a, b] = colors.map(luminance);
  expect((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button',{name:'Analyze this region',exact:true}).click();
  await expect(page.getByTestId('atlas-elevation')).toBeVisible();
  await expect(page.getByTestId('atlas-elevation')).toHaveCSS('font-family', /GeistMono/);
  await page.locator('.surface-toolbar').getByRole('button', { name: 'Create mission here', exact: true }).focus();
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Tab');
  await expect(page.locator('.surface-toolbar').getByRole('button', { name: 'Create mission here', exact: true })).toBeFocused();
  await expect(page.locator('.surface-toolbar').getByRole('button', { name: 'Create mission here', exact: true })).toHaveCSS('outline-style', 'solid');
  for (const [width, height] of [[1920, 1080], [1366, 768], [390, 844]]) {
    await page.setViewportSize({ width, height });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await expect(page.getByRole('navigation', { name: 'Primary navigation' })).toBeInViewport();
    await page.screenshot({ path: `../artifacts/phase5-design-${width}.png` });
  }
});
