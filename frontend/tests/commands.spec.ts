import {utilities} from './workspace';
import { test, expect } from '@playwright/test';

test('keyboard commands navigate real destinations, scientific tools and the activity console', async ({ page }) => {
  await page.goto('/'); await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  async function command(query: string) {
    await page.keyboard.press('Control+k');
    const dialog = page.getByRole('dialog', { name: 'Command palette' });
    await expect(dialog).toBeVisible();
    const search = dialog.getByRole('combobox', { name: 'Search commands' });
    await expect(search).toBeFocused(); await search.fill(query); await search.press('Enter');
    await expect(dialog).not.toBeVisible();
  }
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', { name: 'Search commands' });
  await search.fill('Open '); await search.press('ArrowDown');
  await expect(search).toHaveAttribute('aria-activedescendant', 'command-regional');
  await search.press('Enter');
  await expect(page.getByRole('button', { name: 'Moon', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await command('Go to Shackleton');
  await expect(page.getByTestId('global-coordinate')).toContainText('89.67000');
  await command('Open Analyze');
  await expect(page.getByTestId('selected-coordinate')).toContainText('89.67000');
  await command('Show slope layer');
  await expect(page.getByRole('combobox', { name: 'Scientific overlay' })).toHaveValue('slope');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await command('Open dataset catalog');
  await expect(page.getByRole('searchbox', { name: 'Search science datasets' })).toBeVisible();
  await utilities(page);
  await page.getByRole('button', { name: 'Commands', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Command palette' });
  await dialog.getByRole('combobox').fill('Run current simulation');
  await expect(dialog.getByRole('option')).toHaveAttribute('aria-disabled', 'true');
  await dialog.getByRole('combobox').press('Escape');
  await expect(dialog).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Commands', exact: true })).toBeFocused();
  await page.keyboard.press('Meta+k');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('combobox')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).not.toBeVisible();
  await utilities(page); await page.getByRole('button',{name:'Activity',exact:true}).click();
  await page.getByRole('button', { name: 'Open activity', exact: true }).click();
  const activity = page.getByRole('region', { name: 'System activity' });
  await expect(activity.getByRole('list')).toContainText('[MAP]');
  await expect(activity.getByRole('list')).toContainText('Terrain measurement received');
  await expect(activity.getByRole('list')).toContainText('UTC');
  await page.screenshot({ path: '../artifacts/phase5-commands-activity.png' });
  await page.getByRole('button', { name: 'Dismiss activity', exact: true }).click();
  await expect(activity).toHaveCount(0);
  await utilities(page);
  await page.getByRole('button', { name: 'Activity', exact: true }).click();
  await expect(activity).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Dismiss activity', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '../artifacts/phase5-commands-mobile.png' });
});

test('run command consumes a saved explicit profile and console reports actual simulation completion', async ({ page, request }) => {
  const name = `Command mission ${Date.now()}`, location = { latitude_deg: -89.5, longitude_deg: 0 };
  const scenario = await (await request.post('/api/scenarios', { data: { name, site: location, assets: [
    { kind: 'habitat', name: 'Test habitat', location, demand_kw: 2 },
    { kind: 'solar_array', name: 'Test array', location, rated_power_kw: 10, derating: 1 },
  ], mission: { start: '2027-01-01T00:00:00Z', end: '2027-01-01T02:00:00Z', timestep_seconds: 3600,
    illumination_kind: 'custom_hypothetical', illumination_label: 'Explicit UI integration test profile', illumination_factors: [1, 0] } } })).json();
  try {
    await page.goto('/?mode=mission');
    await page.getByRole('button', { name: `Open scenario: ${name}`, exact: true }).click();
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox', { name: 'Search commands' }).fill('Run current simulation');
    const result = page.waitForResponse(response => response.url().endsWith('/simulations') && response.request().method() === 'POST');
    await page.getByRole('combobox', { name: 'Search commands' }).press('Enter');
    const run = await (await result).json();
    await expect(page.getByRole('button', { name: 'Simulate', exact: true })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('telemetry-generation')).toHaveText(run.result.intervals[0].generation_kw.toFixed(2));
    await utilities(page); await page.getByRole('button',{name:'Activity',exact:true}).click();
  await page.getByRole('button', { name: 'Open activity', exact: true }).click();
    await page.getByRole('checkbox', { name: 'Request details' }).check();
    await expect(page.getByRole('list', { name: 'Recorded application events' })).toContainText('Power simulation completed');
    await expect(page.getByRole('list', { name: 'Recorded application events' })).toContainText(run.id);
    await page.getByRole('button', { name: 'Clear activity', exact: true }).click();
    await expect(page.getByRole('list', { name: 'Recorded application events' })).toContainText('No events yet');
  } finally {
    const latest = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
  }
});
