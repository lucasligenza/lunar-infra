import {test,expect,type Page} from '@playwright/test';
import type {AtlasPoint} from '../types/atlas';
import {chooseOverlay,missionSurface,openDestinations,openActivity} from './workspace';

async function openGeology(page:Page) {
  await page.goto('/');
  await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);
  await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  await chooseOverlay(page,'geology');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('ready / rendered');
}

async function pickSurface(page:Page,x=.52,y=.48) {
  const canvas=page.getByLabel('Interactive 3D Moon',{exact:true});
  const box=(await canvas.boundingBox())!;
  const sample=page.waitForResponse(response=>response.url().includes('/api/atlas/inspect?')&&response.ok());
  await canvas.click({position:{x:box.width*x,y:box.height*y}});
  return await (await sample).json() as AtlasPoint;
}

async function matchesSource(page:Page,point:AtlasPoint) {
  const category=point.geology!.category!;
  const reading=page.getByRole('region',{name:'Geology at this location',exact:true});
  await expect(reading).toBeInViewport();
  await expect(reading.getByTestId('selected-geology-unit')).toHaveText(`${category.code} / ${category.name}`);
  await expect(reading.getByTestId('selected-geology-unit')).toBeInViewport();
  const rgb=category.color.slice(1).match(/../g)!.map(channel=>parseInt(channel,16)).join(', ');
  await expect(reading.getByTestId('selected-geology-color')).toHaveCSS('background-color',`rgb(${rgb})`);
  await expect(reading.getByTestId('selected-geology-interpretation')).toHaveText(category.interpretation);
  return reading;
}

test('clicking geology identifies its source color and unit with the overlay panel open or closed',async({page})=>{
  await openGeology(page);
  // Reproduce the original failure: the clicked unit was below the layer picker
  // and the ordinary location drawer did not display geology at all.
  await page.locator('.atlas-content').evaluate(element=>{element.scrollTop=element.scrollHeight;});
  const first=await pickSurface(page);
  const reading=await matchesSource(page,first);
  await reading.getByText('Source details',{exact:true}).click();
  await expect(reading).toContainText(first.geology!.category!.description);
  await expect(reading).toContainText(first.geology!.source_id);
  await page.screenshot({path:'../artifacts/geology-selection-atlas.png'});
  await page.getByText('49 geological units / categorical legend',{exact:true}).click();
  await expect(page.locator('.geology-legend li[aria-current="true"]')).toContainText(first.geology!.category!.code);
  await page.getByRole('button',{name:'Close atlas',exact:true}).click();
  await page.getByRole('button',{name:'Close region details',exact:true}).click();
  const next=await pickSurface(page,.42,.6);
  await matchesSource(page,next);
  await page.screenshot({path:'../artifacts/geology-selection-region.png'});
  await openActivity(page,'Analyze');
  await expect(page.getByRole('region',{name:'Regional atlas analysis',exact:true})).toBeVisible();
  await matchesSource(page,await pickSurface(page,.48,.52));
  await page.screenshot({path:'../artifacts/geology-selection-analysis.png'});
});

test('geology selection clears stale color while loading, on failure and when source data is missing',async({page})=>{
  await openGeology(page);
  await page.getByRole('button',{name:'Close atlas',exact:true}).click();
  const reading=page.getByRole('region',{name:'Geology at this location',exact:true});
  await expect(reading.getByTestId('selected-geology-unit')).toBeVisible();
  let state:'pending'|'ready'|'failure'|'unprepared'|'nodata'='pending';
  let release!:()=>void;
  const gate=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/atlas/inspect?**',async route=>{
    if(state==='pending')await gate;
    if(state==='failure')return route.fulfill({status:503,body:'Synthetic lookup failure for UI regression'});
    if(state==='unprepared'||state==='nodata'){
      // Missing-source fixtures alter no measurement values; real classes are
      // never replaced with invented geological observations.
      const response=await route.fetch(),point=await response.json();
      point.geology=state==='unprepared'?null:{...point.geology,status:'nodata',category:null};
      return route.fulfill({response,json:point});
    }
    return route.continue();
  });
  const canvas=page.getByLabel('Interactive 3D Moon',{exact:true});
  async function click(x:number) {const b=(await canvas.boundingBox())!;await canvas.click({position:{x:b.width*x,y:b.height*.5}});}
  try {
    await click(.52);
    await expect(reading).toContainText('Reading the mapped geological unit');
    await expect(reading.getByTestId('selected-geology-color')).toHaveCount(0);
    state='ready';release();
    await expect(reading.getByTestId('selected-geology-unit')).toBeVisible();
    state='failure';await click(.48);
    await expect(reading).toContainText('Geology lookup failed');
    await expect(reading.getByTestId('selected-geology-color')).toHaveCount(0);
    state='unprepared';await click(.53);
    await expect(reading).toContainText('Geology is not prepared locally');
    state='nodata';await click(.47);
    await expect(reading).toContainText('No mapped geological unit');
    await expect(reading.getByTestId('selected-geology-color')).toHaveCount(0);
    state='ready';const recovered=await pickSurface(page);
    await matchesSource(page,recovered);
  } finally {release();}
});

test('phone surface selection opens a readable geological explanation without overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await openGeology(page);
  await page.getByRole('button',{name:'Close atlas',exact:true}).click();
  await page.getByRole('button',{name:'Close region details',exact:true}).click();
  await matchesSource(page,await pickSurface(page));
  await expect(page.getByRole('button',{name:'Close region details',exact:true})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.screenshot({path:'../artifacts/geology-selection-mobile.png'});
});

test('mission surface inspection shows the same geological unit in global and polar workspaces',async({page})=>{
  test.setTimeout(120000);
  for(const destination of [/^Mare Tranquillitatis/,/^Shackleton crater/]) {
    await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    await openDestinations(page);await page.getByRole('button',{name:destination}).click();
    await page.getByRole('navigation',{name:'Primary navigation'}).getByRole('button',{name:'Build',exact:true}).click();
    await page.getByRole('button',{name:'Overlays',exact:true}).click();
    await chooseOverlay(page,'geology',true);await missionSurface(page);
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    await expect(page.locator('.mission-layer-status')).toContainText('ready / rendered');
    const point=await pickSurface(page,.5,.5);
    await matchesSource(page,point);
    await page.screenshot({path:`../artifacts/geology-selection-mission-${point.latitude_deg<0?'polar':'global'}.png`});
  }
});
