import {chooseOverlay} from './workspace';
import {test,expect} from '@playwright/test';
import {missionSurface,missionTools,openActivity,missionInspector,openDestinations} from './workspace';
import {polarBoundary,toPolar} from '../lib/lunar';
import type {SimulationRun} from '../types/simulation';

test('polar coverage guide follows registered projected edges across longitude wrapping',async({request})=>{
  const region=(await(await request.get('/api/regions')).json()).find((region:{available:boolean})=>region.available);
  expect(region).toBeTruthy();const boundary=polarBoundary(region);
  expect(boundary).toHaveLength(65);expect(boundary.at(-1)).toEqual(boundary[0]);
  expect(boundary.some(point=>point.longitude_deg<10)).toBe(true);
  expect(boundary.some(point=>point.longitude_deg>350)).toBe(true);
  const [west,south,east,north]=region.bounds_m;
  for(const point of boundary){const [x,y]=toPolar(point.longitude_deg,point.latitude_deg,region.reference_radius_m);
    expect(x).toBeGreaterThanOrEqual(west-1e-6);expect(x).toBeLessThanOrEqual(east+1e-6);
    expect(y).toBeGreaterThanOrEqual(south-1e-6);expect(y).toBeLessThanOrEqual(north+1e-6);
    expect(Math.min(Math.abs(x-west),Math.abs(x-east),Math.abs(y-south),Math.abs(y-north))).toBeLessThan(1e-6);
  }
});

for(const width of [1440,1366])test(`mission surface review at ${width}`,async({page,request})=>{
  test.setTimeout(120000);
  await page.setViewportSize({width,height:width===1440?900:768});
  await page.addInitScript(()=>{localStorage.setItem('lunaros.walkthrough.dismissed.v1','1');localStorage.setItem('lunaros.motion.v1','reduce');});
  const location={latitude_deg:-89.5,longitude_deg:0},name=`Workspace review ${width} ${Date.now()}`;
  const response=await request.post('/api/scenarios',{data:{name,site:location,assets:[
    {kind:'habitat',name:'Research habitat',location,demand_kw:8},
    {kind:'solar_array',name:'South array',location:{...location,longitude_deg:10},rated_power_kw:20},
    {kind:'battery',name:'Reserve battery',location:{...location,longitude_deg:20},capacity_kwh:100},
  ],mission:{start:'2027-01-01T00:00:00Z',end:'2027-01-03T00:00:00Z',timestep_seconds:3600,
    illumination_kind:'custom_hypothetical',illumination_label:'Explicit visual QA profile; not observed lunar sunlight',illumination_factors:Array.from({length:48},(_,i)=>i<24?1:0)}}});
  expect(response.status()).toBe(201);const scenario=await response.json();
  try{
    await page.goto('/?mode=mission');await missionTools(page);
    await page.getByRole('button',{name:`Open scenario: ${name}`,exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Exploration tools'})).not.toBeVisible();
    const close=page.getByRole('button',{name:'Close inspector',exact:true});if(await close.isVisible())await close.click();
    await expect(page.getByTestId('layer-status')).toHaveText('Layer ready');
    await expect(page.locator('#context-inspector')).not.toBeVisible();
    await expect(page.getByRole('complementary',{name:'Exploration tools'})).not.toBeVisible();
    await page.screenshot({path:`../artifacts/mission-after-build-${width}.png`});
    const map=(await page.getByTestId('terrain-map').boundingBox())!;
    expect(map.width).toBeGreaterThan(width*.9);
    await page.getByRole('button',{name:'+ Add Asset',exact:true}).click();
    await expect(page.getByRole('button',{name:'Place habitat',exact:true})).toBeVisible();
    await page.screenshot({path:`../artifacts/mission-after-palette-${width}.png`});
    await page.getByRole('button',{name:'Place habitat',exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Exploration tools'})).not.toBeVisible();
    await page.getByRole('button',{name:'Cancel placement',exact:true}).click();
    await missionTools(page);await page.getByRole('button',{name:'Select asset: Research habitat',exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Asset configuration'})).toBeVisible();
    await expect(page.getByLabel('Continuous demand (kW)',{exact:true})).toHaveValue('8');
    await expect(page.getByLabel('Optional load profile (kW per interval)',{exact:true})).not.toBeVisible();
    await page.screenshot({path:`../artifacts/mission-after-asset-${width}.png`});
    await missionSurface(page);
    const terrain=page.getByTestId('terrain-map'),bounds=(await terrain.boundingBox())!;
    await terrain.click({position:{x:bounds.width*.65,y:bounds.height*.45}});
    await expect(page.getByRole('complementary',{name:'Site inspector'})).toBeVisible();
    await expect(page.getByTestId('elevation-value')).toBeVisible();
    await expect(page.locator('.site-provenance')).not.toHaveAttribute('open','');
    await page.screenshot({path:`../artifacts/mission-after-site-${width}.png`});
    await missionTools(page);await page.getByRole('button',{name:'Select asset: Reserve battery',exact:true}).click();
    await openActivity(page,'Simulate');await missionTools(page);
    const pending=page.waitForResponse(r=>r.url().endsWith('/simulations')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Run simulation',exact:true}).click();const run:SimulationRun=await(await pending).json();
    await expect(page.getByRole('region',{name:'Mission timeline'})).toBeVisible();
    await expect(page.locator('#context-inspector')).not.toBeVisible();
    await expect(page.getByRole('button',{name:/Electrical generation chart/})).toHaveCount(0);
    const battery=run.scenario_snapshot.assets.find(asset=>asset.kind==='battery')!;
    await expect(page.getByTestId('selected-asset-telemetry')).toHaveText(`${(run.result.intervals[0].batteries[battery.id].soc_end*100).toFixed(2)}% SOC at end`);
    const reserve=()=>page.locator('.battery-reserve i').evaluate(element=>element.getBoundingClientRect().width/element.parentElement!.getBoundingClientRect().width);
    expect(await reserve()).toBeCloseTo(run.result.intervals[0].soc_end!,2);
    const timeline=page.getByRole('region',{name:'Mission timeline'});
    const compact=(await timeline.boundingBox())!,surface=(await terrain.boundingBox())!;
    expect(compact.height).toBeLessThanOrEqual(page.viewportSize()!.height*.15);
    expect(surface.height).toBeGreaterThan(page.viewportSize()!.height*.75);
    expect(surface.y+surface.height).toBeLessThanOrEqual(compact.y+1);
    await page.screenshot({path:`../artifacts/mission-after-simulate-${width}.png`});
    const slider=page.getByRole('slider',{name:'Mission interval'});await slider.fill('47');
    await expect(page.getByTestId('selected-asset-telemetry')).toHaveText(`${(run.result.intervals[47].batteries[battery.id].soc_end*100).toFixed(2)}% SOC at end`);
    await expect(page.getByTestId('telemetry-generation')).toHaveText(run.result.intervals[47].generation_kw.toFixed(2));
    await expect(page.getByTestId('telemetry-unserved')).toHaveText(`${run.result.intervals[47].unserved_kw.toFixed(2)} kW`);
    expect(await reserve()).toBeCloseTo(run.result.intervals[47].soc_end!,2);
    await page.getByRole('button',{name:'Expand timeline',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Mission summary (kWh)',exact:true})).toBeVisible();
    await expect(page.locator('.timeline-summary')).toContainText(`Generated: ${run.result.summary.generated_kwh.toFixed(2)} kWh`);
    expect((await timeline.boundingBox())!.height).toBeLessThanOrEqual(page.viewportSize()!.height*.34+1);
    expect((await terrain.boundingBox())!.height).toBeGreaterThan(page.viewportSize()!.height*.55);
    await page.screenshot({path:`../artifacts/mission-after-details-${width}.png`});
    expect(await page.evaluate(()=>document.documentElement.scrollHeight)).toBeLessThanOrEqual(page.viewportSize()!.height);
    await expect(page.getByRole('navigation',{name:'Primary navigation'})).toBeInViewport();
    await page.keyboard.press('Escape');await expect(slider).toHaveValue('47');
    await expect(page.getByRole('button',{name:'Expand timeline',exact:true})).toHaveAttribute('aria-expanded','false');
    await expect(page.getByRole('button',{name:'Expand timeline',exact:true})).toBeFocused();
  }finally{const latest=await(await request.get(`/api/scenarios/${scenario.id}`)).json();await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);}
});

test('mission environmental overlays disclose actual missing coverage and navigate to prepared polar terrain',async({page})=>{
  test.setTimeout(120000);
  await page.addInitScript(()=>localStorage.setItem('lunaros.walkthrough.dismissed.v1','1'));
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
  await page.screenshot({path:'../artifacts/mission-after-explore.png'});
  await page.getByRole('button',{name:'Build',exact:true}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();

  await chooseOverlay(page,'temperature',true);
  await expect(page.getByRole('region',{name:'Mission scientific overlays'})).toContainText('Outside the prepared south-pole region.');
  await page.screenshot({path:'../artifacts/mission-after-unsupported-temperature.png'});
  await page.getByRole('button',{name:'Go to supported region',exact:true}).click();
  await expect(page.locator('.mission-layer-status')).toContainText('Scientific overlay ready',{timeout:60000});
  await expect.poll(async()=>Number(await page.getByTestId('moon-canvas').getAttribute('data-sector-boundaries'))).toBeGreaterThan(0);
  await page.screenshot({path:'../artifacts/mission-after-polar-temperature.png'});
  await missionInspector(page);await expect(page.getByTestId('active-environment-value')).toContainText('K');await missionSurface(page);
  await page.getByRole('button',{name:'Overlays',exact:true}).click();await chooseOverlay(page,'illumination',true);await missionSurface(page);
  await expect(page.locator('.mission-layer-status')).toContainText('Scientific overlay ready',{timeout:60000});
  await page.screenshot({path:'../artifacts/mission-after-polar-solar.png'});
});
