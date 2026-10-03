import {test,expect,type Page} from '@playwright/test';
import {openDestinations,openOverlays,overlaySourceDetails,separate} from './workspace';
import type {AtlasPoint} from '../types/atlas';

async function ready(page:Page) {await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');}
async function visit(page:Page,name:RegExp) {await openDestinations(page);await page.getByRole('button',{name}).click();}
const drawers=(page:Page)=>page.locator('.context-drawer:visible');

test('Overlays is one compact visualization list with source details disclosed and no selects',async({page})=>{
  await ready(page);
  const menu=await openOverlays(page);
  const rows=menu.getByRole('group',{name:'Scientific overlay'}).getByRole('radio');
  await expect(rows).toHaveCount(6);
  const labels=await rows.evaluateAll(inputs=>inputs.map(input=>input.getAttribute('aria-label')));
  expect(labels).toEqual(['Imagery','Elevation','Slope','Solar visibility','Temperature','Geology']);
  for(const name of ['Solar visibility','Temperature'])await expect(menu.locator('.layer-option',{has:page.getByRole('radio',{name,exact:true})})).toContainText('Polar');
  // Choosing what to see is primary; which raster powers it is under Source details.
  await expect(menu.getByRole('radiogroup',{name:'Terrain source'})).toBeHidden();
  await expect(menu.getByRole('slider',{name:'Scientific layer opacity'})).toHaveCount(0);
  await menu.getByRole('radio',{name:'Slope',exact:true}).check();
  await expect(menu.getByRole('slider',{name:'Scientific layer opacity'})).toBeVisible();
  await overlaySourceDetails(page);
  await expect(menu.getByRole('radiogroup',{name:'Terrain source'})).toBeVisible();
  // No dropdown selects remain in the visible interface.
  await expect(page.locator('select:visible')).toHaveCount(0);
  await expect(menu.getByText('Find settlement sites')).toHaveCount(0);
});

test('one drawer owns the right edge; menus and drawers never overlap on desktop or phone',async({page})=>{
  await ready(page);await visit(page,/^Shackleton crater/);
  await expect(drawers(page)).toHaveCount(1);await expect(page.getByRole('complementary',{name:'Selected lunar region'})).toBeVisible();
  await page.getByRole('button',{name:'Find settlement sites',exact:true}).click();
  await expect(drawers(page)).toHaveCount(1);await expect(page.getByRole('complementary',{name:'Settlement sites'})).toBeVisible();
  await page.getByRole('button',{name:'Back to location',exact:true}).click();
  await expect(drawers(page)).toHaveCount(1);await expect(page.getByRole('complementary',{name:'Selected lunar region'})).toBeVisible();
  const menu=await openOverlays(page);
  // Desktop: the menu (left) and the drawer (right) are separate regions.
  expect(await separate(menu,page.getByRole('complementary',{name:'Selected lunar region'}))).toBe(true);
  expect(await separate(menu,page.locator('.camera-controls'))).toBe(true);
  await page.setViewportSize({width:390,height:844});
  await page.getByRole('button',{name:'Close overlays',exact:true}).click();
  await page.getByRole('button',{name:'Open region details',exact:true}).click();
  await expect(drawers(page)).toHaveCount(1);
  // Phone: opening Overlays replaces the location sheet; one sheet at a time.
  await openOverlays(page);
  await expect(drawers(page)).toHaveCount(0);
  const sheet=(await page.getByRole('complementary',{name:'Overlays'}).boundingBox())!,toolbar=(await page.locator('.globe-toolbar').boundingBox())!;
  expect(sheet.y).toBeGreaterThan(toolbar.y+toolbar.height);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('selected location aggregates every prepared value and names each kind of missing data',async({page,request})=>{
  await ready(page);await visit(page,/^Shackleton crater/);
  const polar:AtlasPoint=await(await request.get('/api/atlas/inspect?latitude=-89.67&longitude=129.78&dataset=best')).json();
  const region=page.getByRole('complementary',{name:'Selected lunar region'});
  await expect(region.getByTestId('atlas-elevation')).toHaveText(`${polar.elevation.value!.toLocaleString('en-US')} m`);
  await expect(region.getByTestId('atlas-slope')).toHaveText(`${polar.slope.value!.toFixed(2)}°`);
  await expect(region.getByTestId('atlas-sunlight')).toHaveText(`${(polar.solar_visibility!.value!*100).toFixed(1)}%`);
  await expect(region.getByTestId('atlas-temperature')).toHaveText(`${polar.temperature!.value!.toFixed(1)} K`);
  await expect(region.getByTestId('atlas-geology')).toHaveText(`${polar.geology!.category!.code} / ${polar.geology!.category!.name}`);
  await expect(region.getByRole('region',{name:'Data coverage'})).toContainText('240 m local analysis');
  // Qualifications travel with the values; provenance is disclosed, not hidden.
  await expect(region).toContainText('not current sunlight');await expect(region).toContainText('not habitat temperature');
  await region.getByText('Sources & provenance',{exact:true}).click();
  await expect(region).toContainText(polar.solar_visibility!.source_id);await expect(region).toContainText(polar.temperature!.source_id);
  // Outside polar coverage: unavailable here, never a number.
  await visit(page,/^Tycho crater/);
  await expect(region.getByTestId('atlas-sunlight')).toHaveText('Unavailable here');
  await expect(region.getByTestId('atlas-temperature')).toHaveText('Unavailable here');
  await expect(region.getByTestId('atlas-elevation')).toContainText(' m');
  // Not prepared (dataset absent) and missing source data are distinct states.
  let mode:'unprepared'|'nodata'='unprepared';
  await page.route('**/api/atlas/inspect?**',async route=>{const response=await route.fetch(),point=await response.json();
    if(mode==='unprepared'){point.solar_visibility=null;point.temperature=null;point.geology=null;}
    else point.temperature={...point.temperature,status:'nodata',value:null};
    await route.fulfill({response,json:point});});
  await visit(page,/^Shackleton crater/);
  await expect(region.getByTestId('atlas-sunlight')).toHaveText('Not prepared');
  await expect(region.getByTestId('atlas-geology')).toHaveText('Not prepared');
  mode='nodata';await visit(page,/^Lunar south pole/);
  await expect(region.getByTestId('atlas-temperature')).toHaveText('Missing source data');
});
