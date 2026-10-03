import {missionSurface,openActivity,openAsset,openCoordinates,openDestinations,openMissions} from './workspace';
import { test, expect } from '@playwright/test';

test('context panels preserve the canvas and mobile task navigation keeps controls reachable', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  const before=(await page.locator('.globe-viewport').boundingBox())!;
  await openDestinations(page);
  await page.getByRole('button', { name: /^Shackleton crater/ }).click();
  const viewport = page.locator('.globe-viewport');
  const drawer = page.getByRole('complementary', { name: 'Selected lunar region' });
  const surface = (await viewport.boundingBox())!, dock = (await drawer.boundingBox())!;
  expect(surface).toEqual(before);
  expect(dock.width).toBeLessThan(surface.width*.3);
  expect(dock.x).toBeGreaterThan(surface.x+surface.width*.65);
  expect(dock.height).toBeLessThan(surface.height*.8);
  const camera=(await page.locator('.camera-controls').boundingBox())!;
  expect(dock.y+dock.height).toBeLessThan(camera.y);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole('button', { name: 'Open destinations', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close region details', exact: true })).toBeInViewport();
  await page.screenshot({ path: '../artifacts/phase5-layout-mobile-region.png' });
  await page.getByRole('button', { name: 'Close region details', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Reset globe', exact: true })).toBeInViewport();
  await openActivity(page, 'Analyze');
  await openCoordinates(page);
  await page.getByRole('button', { name: 'Inspect location', exact: true }).click();
  await expect(page.getByTestId('atlas-elevation')).toBeVisible();
  await missionSurface(page);
  const toolbar = (await page.locator('.workspace-toolbar').boundingBox())!;
  const map = (await page.locator('.terrain-viewport').boundingBox())!;
  expect(toolbar.y).toBeGreaterThan(map.y);
  expect(toolbar.y + toolbar.height).toBeLessThan(map.y + map.height);
  expect(toolbar.width).toBeLessThanOrEqual(map.width);
  await expect(page.locator('.surface-toolbar').getByRole('button', { name: 'Overlays', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({ path: '../artifacts/phase5-layout-mobile-map.png' });
});

test('mission workspace gives closed panels back to the map and selects one contextual inspector',async({page,request})=>{
  const location={latitude_deg:-89.5,longitude_deg:0};
  const scenario=await(await request.post('/api/scenarios',{data:{name:`Workspace ${Date.now()}`,site:location,assets:[{kind:'habitat',name:'Layout habitat',location}]}})).json();
  try {
    await page.goto('/?mode=mission');await expect(page.getByTestId('layer-status')).toHaveText('Layer ready');
    for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]]) {
      await page.setViewportSize({width,height});
      await missionSurface(page);
      const map=page.locator('.map-workspace'),box=(await map.boundingBox())!;
      const scale=(await page.locator('.ol-scale-line').boundingBox())!,shelf=(await page.locator('.workspace-toolbar').boundingBox())!;
      const overlap=Math.min(scale.x+scale.width,shelf.x+shelf.width)>Math.max(scale.x,shelf.x)&&Math.min(scale.y+scale.height,shelf.y+shelf.height)>Math.max(scale.y,shelf.y);
      expect(overlap,'The physical map scale must not sit underneath mission controls').toBe(false);
      if(width>900)expect(box.width).toBeGreaterThan(width*.9);
      await page.screenshot({path:`../artifacts/targeted-map-first-${width}.png`});
      await openMissions(page);
      const close=page.getByRole('button',{name:'Close missions',exact:true});
      const closeBox=(await close.boundingBox())!,toolsBox=(await page.getByRole('complementary',{name:'Missions'}).boundingBox())!;
      expect(closeBox.x+closeBox.width).toBeLessThanOrEqual(toolsBox.x+toolsBox.width+1);
      expect(await close.evaluate(element=>element.scrollWidth<=element.clientWidth)).toBe(true);
      await page.getByRole('button',{name:`Open scenario: ${scenario.name}`,exact:true}).click();
      await openAsset(page,'Layout habitat');
      await expect(page.getByRole('complementary',{name:'Asset configuration'})).toBeVisible();
      await expect(page.getByRole('complementary',{name:'Missions'})).not.toBeVisible();
      if(width>900) {
        const terrain=(await map.boundingBox())!,inspector=(await page.getByRole('complementary',{name:'Asset',exact:true}).boundingBox())!;
        expect(terrain.width).toBe(box.width);
        expect(inspector.x).toBeGreaterThan(terrain.x+terrain.width*.65);
        const controls=(await page.locator('.map-navigation').boundingBox())!;
        expect(inspector.y+inspector.height).toBeLessThan(controls.y);
      }
      await page.screenshot({path:`../artifacts/targeted-inspector-${width}.png`});
      await page.getByRole('button',{name:'Close asset',exact:true}).click();
      if(width>900)expect((await map.boundingBox())!.width).toBeGreaterThan(width*.9);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  }finally{const current=await(await request.get(`/api/scenarios/${scenario.id}`)).json();await request.delete(`/api/scenarios/${scenario.id}?revision=${current.revision}`);}
});
