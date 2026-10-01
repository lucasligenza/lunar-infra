import {missionInspector,missionTools,openActivity,openDestinations,utilities} from './workspace';
import { test, expect, type Locator, type Page } from '@playwright/test';

async function reachable(control: Locator) {
  await control.scrollIntoViewIfNeeded();
  await expect(control).toBeInViewport();
  const result = await control.evaluate(element => {
    const box = element.getBoundingClientRect();
    const target = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
    return { reachable: Boolean(target && (target === element || element.contains(target))), label: element.getAttribute('aria-label') ?? element.textContent, covering: target?.outerHTML.slice(0, 180) };
  });
  expect(result.reachable, JSON.stringify(result)).toBe(true);
}
async function header(page: Page, width: number) {
  await page.evaluate(() => window.scrollTo(0, 0));
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  for (const label of ['Moon', 'Mission']) {
    await reachable(page.getByRole('button', { name: label, exact: true }));
  }
}
async function pane(page: Page, label: 'Map' | 'Tools' | 'Inspector' | 'Timeline', width: number) {
  if (width <= 900) await page.getByRole('navigation', { name: 'Workspace navigation' }).getByRole('link', { name: label, exact: true }).click();
  else if(label==='Tools')await missionTools(page);
  else if(label==='Inspector')await missionInspector(page);
}

for (const [width, height] of [[1920, 1080], [1440, 900], [1366, 768], [1024, 768], [390, 844]]) {
  test(`all mission activities and computed playback remain usable at ${width}x${height}`, async ({ page, request }) => {
    test.setTimeout(120000);
    await page.setViewportSize({ width, height });
    await page.addInitScript(() => { localStorage.setItem('lunaros.walkthrough.dismissed.v1', '1'); localStorage.setItem('lunaros.motion.v1', 'reduce'); });
    const name = `Responsive mission ${width} ${Date.now()}`, location = { latitude_deg: -89.5, longitude_deg: 0 };
    const created = await request.post('/api/scenarios', { data: { name, site: location, assets: [
      { kind: 'habitat', name: 'QA habitat', location, demand_kw: 8 },
      { kind: 'solar_array', name: 'QA array', location: { latitude_deg: -89.51, longitude_deg: 2 }, rated_power_kw: 20, derating: 1 },
      { kind: 'battery', name: 'QA storage', location: { latitude_deg: -89.52, longitude_deg: 4 }, capacity_kwh: 12, initial_soc: 1 },
    ], mission: { start: '2027-01-01T00:00:00Z', end: '2027-01-01T04:00:00Z', timestep_seconds: 3600,
      illumination_kind: 'custom_hypothetical', illumination_label: 'Explicit responsive UI test profile; not measured sunlight', illumination_factors: [1, 0, 0, 1] } } });
    expect(created.status()).toBe(201); const scenario = await created.json();
    try {
      await page.goto('/'); await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
      await header(page, width);
      await openDestinations(page);
  await openDestinations(page);
      await page.getByRole('button', { name: /^Shackleton crater/ }).click();
      await expect(page.getByTestId('local-coverage')).toHaveText('240 m south-pole grid');
      await page.screenshot({ path: `../artifacts/phase5-final-selection-${width}.png` });
      await page.getByRole('button', { name: 'Close region details', exact: true }).click();
      await reachable(page.getByRole('button', { name: 'Reset globe', exact: true }));
      await page.screenshot({ path: `../artifacts/phase5-final-explore-${width}.png` });
      await openActivity(page, 'Analyze');
      await expect(page.getByTestId('layer-status')).toHaveText('Layer ready');
      await pane(page, 'Inspector', width);
      await expect(page.getByTestId('elevation-value')).toBeVisible();
      await page.screenshot({ path: `../artifacts/phase5-final-analysis-inspector-${width}.png` });
      await pane(page, 'Map', width);
      await reachable(page.getByRole('button', { name: 'Reset map view', exact: true }));
      await page.screenshot({ path: `../artifacts/phase5-final-analyze-${width}.png` });
      await openActivity(page, 'Design');
      await pane(page, 'Tools', width);
      await missionTools(page);
      await page.getByRole('button', { name: `Open scenario: ${name}`, exact: true }).click();
      await page.getByRole('button', { name: 'Select asset: QA habitat', exact: true }).click();
      await expect(page.getByLabel('Continuous demand (kW)', { exact: true })).toHaveValue('8');
      await page.screenshot({ path: `../artifacts/phase5-final-design-inspector-${width}.png` });
      await pane(page, 'Map', width);
      await header(page, width);
      await page.screenshot({ path: `../artifacts/phase5-final-design-${width}.png` });
      await openActivity(page, 'Simulate');
      await pane(page, 'Tools', width);
      const result = page.waitForResponse(response => response.url().endsWith('/simulations') && response.request().method() === 'POST');
      await missionTools(page);
      await page.getByRole('button', { name: 'Run simulation', exact: true }).click();
      const run = await (await result).json();
      await pane(page, 'Timeline', width);
      const slider = page.getByRole('slider', { name: 'Mission interval' });
      await slider.fill('2');
      await expect(page.getByTestId('timeline-soc')).toHaveText(`${(run.result.intervals[2].soc_end * 100).toFixed(2)}%`);
      await expect(page.getByTestId('timeline-power-status')).toHaveText(`${run.result.intervals[2].unserved_kw.toFixed(2)} kW unserved`);
      if(width<=900)await expect(page.getByTestId('terrain-map')).toBeVisible();
      const compactBounds = (await page.getByRole('region',{name:'Mission timeline'}).boundingBox())!;
      expect(compactBounds.x+compactBounds.width).toBeLessThanOrEqual(width+1);
      await reachable(page.getByRole('combobox',{name:'Playback speed',exact:true}));
      await expect(page.getByTestId('timeline-power-status')).toBeInViewport();
      await page.screenshot({path:`../artifacts/targeted-playback-compact-${width}.png`});
      await reachable(page.getByRole('button',{name:'Expand timeline',exact:true}));
      await page.getByRole('button',{name:'Expand timeline',exact:true}).click();
      const timeline = await page.getByRole('region',{name:'Mission timeline'}).boundingBox();
      if(width>900)expect(timeline!.height).toBeLessThanOrEqual(height*.42+1);
      await reachable(page.getByRole('button',{name:'Collapse timeline',exact:true}));
      const axisSize = await page.locator('.timeline-chart svg text').first().evaluate(element => {
        const text = element as SVGTextElement, transform = text.getScreenCTM()!;
        return parseFloat(getComputedStyle(text).fontSize) * Math.hypot(transform.c, transform.d);
      });
      expect(axisSize).toBeGreaterThanOrEqual(10.5);
      await page.screenshot({ path: `../artifacts/phase5-final-simulate-${width}.png` });
      await pane(page, 'Inspector', width);
      await expect(page.getByTestId('telemetry-generation')).toHaveText(run.result.intervals[2].generation_kw.toFixed(2));
      await expect(page.getByTestId('telemetry-unserved')).toHaveText(`${run.result.intervals[2].unserved_kw.toFixed(2)} kW`);
      await pane(page, 'Timeline', width);
      await slider.press('Home'); await page.getByRole('button', { name: 'Play mission', exact: true }).click();
      await expect.poll(() => slider.inputValue()).not.toBe('0');
      await page.getByRole('button', { name: 'Pause playback', exact: true }).click();
      const paused = await slider.inputValue();
      await page.getByRole('button',{name:'Collapse timeline',exact:true}).click();
      await expect(slider).toBeVisible();await expect(slider).toHaveValue(paused);
      if(width<=900)await expect(page.getByTestId('terrain-map')).toBeVisible();
      await openActivity(page, 'Design');
      await pane(page, 'Tools', width);
      await expect(page.getByRole('button', { name: `Open scenario: ${name}`, exact: true })).toHaveAttribute('aria-pressed', 'true');
      const stored = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
      expect(stored.assets).toEqual(scenario.assets); expect(stored.revision).toBe(scenario.revision);
      console.log(JSON.stringify({ viewport: `${width}x${height}`, mapInstances: await page.getByTestId('terrain-map').count(), scenarioRevision: stored.revision, calculatedUnservedKw: run.result.intervals[2].unserved_kw }));
    } finally {
      const latest = await (await request.get(`/api/scenarios/${scenario.id}`)).json();
      await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
    }
  });
}

test('125 and 200 percent zoom-equivalent CSS viewports retain accessible navigation and map controls', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('lunaros.walkthrough.dismissed.v1', '1'));
  for (const scale of [1.25, 2]) {
    const width = Math.round(1440 / scale), height = Math.round(900 / scale);
    await page.setViewportSize({ width, height }); await page.goto('/?mode=regional');
    await expect(page.getByTestId('layer-status')).toHaveText('Layer ready');
    await header(page, width);
    await page.screenshot({ path: `../artifacts/phase5-zoom-before-${scale}.png`, fullPage: true });
    await reachable(page.getByRole('button', { name: 'Reset map view', exact: true }));
    await page.screenshot({ path: `../artifacts/phase5-zoom-equivalent-${scale}.png`, fullPage: true });
  await utilities(page);
    await page.getByRole('button', { name: 'Commands', exact: true }).click();
    await expect(page.getByRole('combobox', { name: 'Search commands' })).toBeFocused();
    await reachable(page.getByRole('button', { name: 'Close command palette', exact: true }));
    await page.screenshot({ path: `../artifacts/phase5-final-palette-${scale}.png` });
    await page.keyboard.press('Escape');
  }
});
