import { test, expect } from '@playwright/test';

test('optional walkthrough dismisses, remembers, reopens and offers functional settings', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  const offer = page.getByRole('region', { name: 'First-time guidance' });
  await expect(offer).toHaveCount(0);
  await page.getByRole('button',{name:'Help',exact:true}).click();
  await page.getByRole('button',{name:'Walkthrough',exact:true}).click();
  const dialog = page.getByRole('dialog', { name: 'LunarOS help and settings' });
  await expect(dialog).toContainText('Step 1 / 6');
  for (let step = 2; step <= 6; step++) {
    await dialog.getByRole('button', { name: 'Next step', exact: true }).click();
    await expect(dialog).toContainText(`Step ${step} / 6`);
  }
  await expect(dialog).toContainText('NASA average visibility is not time-resolved sunlight');
  await page.screenshot({ path: '../artifacts/phase5-walkthrough.png' });
  await dialog.getByRole('button', { name: 'Finish walkthrough', exact: true }).click();
  await expect(offer).toHaveCount(0); await page.reload(); await expect(offer).toHaveCount(0);
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Settings', exact: true }).click();
  await dialog.getByRole('radiogroup', { name: 'Camera motion' }).getByRole('radio', { name: 'Reduce motion' }).check();
  await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await dialog.getByRole('checkbox', { name: 'Show activity console', exact: true }).uncheck();
  await expect(page.getByRole('region', { name: 'System activity' })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(dialog.getByRole('button', { name: 'Close help', exact: true })).toBeInViewport();
  await page.screenshot({ path: '../artifacts/phase5-help-mobile.png' });
  await page.keyboard.press('Escape'); await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeFocused();
  await page.reload(); await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  await dialog.getByRole('button', { name: 'Walkthrough', exact: true }).click();
  await expect(dialog).toContainText('Step 1 / 6');
  await dialog.getByRole('button', { name: 'Dismiss walkthrough', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
