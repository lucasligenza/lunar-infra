import {chooseOverlay} from './workspace';
import {test,expect} from '@playwright/test';
import {missionDetails,missionTools,openDestinations,openActivity} from './workspace';
import type {SuitabilityReport} from '../types/suitability';

async function openFinder(page:import('@playwright/test').Page,destination='Shackleton crater') {
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);await page.getByRole('button',{name:new RegExp(`^${destination}`)}).click();
  await page.getByRole('button',{name:'Overlays',exact:true}).click();
  await chooseOverlay(page,'illumination');
  await expect(page.getByTestId('atlas-overlay-status')).toContainText('Scientific overlay ready');
  await page.getByRole('button',{name:'Find settlement sites',exact:true}).click();
}

test('actual candidate evidence connects selected coordinates to a saved mission and calculated playback',async({page,request})=>{
  test.setTimeout(120000);let id:string|null=null;
  const name=`Candidate outpost ${Date.now()}`,errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await openFinder(page);
    const response=page.waitForResponse(result=>result.url().endsWith('/atlas/suitability')&&result.request().method()==='POST');
    await page.getByRole('button',{name:'Find settlement sites',exact:true}).click();
    const report:SuitabilityReport=await(await response).json();expect(report.candidates.length).toBeGreaterThan(0);
    const candidate=report.candidates.find(item=>item.solar_visibility!==null)!;expect(candidate).toBeTruthy();
    await expect(page.getByRole('region',{name:'Terrain and sunlight candidates'})).toBeVisible();
    const button=page.getByRole('button',{name:`Inspect ${candidate.id}`,exact:true});
    await button.click();await expect(button).toHaveAttribute('aria-pressed','true');
    const result=button.locator('..');await expect(result).toContainText(`${(candidate.low_slope_fraction*100).toFixed(0)}% low-slope terrain`);
    await result.getByText('Why this candidate?',{exact:true}).click();
    await expect(result).toContainText(candidate.source_id);await expect(result).toContainText('No location-accurate time-resolved sunlight');
    expect(Number(await page.getByTestId('moon-canvas').getAttribute('data-sector-boundaries'))).toBeGreaterThan(0);
    await page.screenshot({path:'../artifacts/simple-settlement-evidence.png'});
    await page.getByRole('button',{name:'Create mission at selected location',exact:true}).click();
    await expect(page.getByTestId('mission-site-handoff')).toContainText('Selected screening candidate');
    await expect(page.getByTestId('mission-site-handoff')).toContainText(`${candidate.latitude_deg.toFixed(5)}° / ${candidate.longitude_deg.toFixed(5)}° E`);
    await expect(page.getByLabel('Scenario name',{exact:true})).toBeVisible();
    await expect(page.getByRole('button',{name:'Place habitat',exact:true})).toHaveCount(0);
    await page.screenshot({path:'../artifacts/targeted-candidate-mission-handoff.png'});
    await page.getByLabel('Scenario name',{exact:true}).fill(name);
    const creation=page.waitForResponse(result=>result.url().endsWith('/scenarios')&&result.request().method()==='POST');
    await page.getByRole('button',{name:'Create scenario at selected site',exact:true}).click();
    const scenario=await(await creation).json();id=scenario.id;
    expect(scenario.site.latitude_deg).toBeCloseTo(candidate.latitude_deg,4);expect(scenario.site.longitude_deg).toBeCloseTo(candidate.longitude_deg,4);
    await expect(page.getByRole('button',{name:'Place habitat',exact:true})).toBeVisible();
    await expect(page.getByLabel('Scenario name',{exact:true})).not.toBeVisible();
    await page.getByRole('button',{name:'Place habitat',exact:true}).click();
    const map=page.getByTestId('terrain-map'),box=(await map.boundingBox())!;await map.click({position:{x:box.width*.55,y:box.height*.45}});
    await expect(page.getByRole('complementary',{name:'Asset configuration'})).toBeVisible();
    await page.screenshot({path:'../artifacts/targeted-candidate-habitat.png'});
    await missionDetails(page);await page.getByRole('button',{name:'Simulation inputs',exact:true}).click();
    await expect(page.getByText('Real-data playback unavailable.',{exact:false})).toBeVisible();
    await page.getByRole('button',{name:'Apply synthetic stress profile',exact:true}).click();
    const simulation=page.waitForResponse(result=>result.url().endsWith('/simulations')&&result.request().method()==='POST');
    await page.getByRole('button',{name:'Run simulation',exact:true}).click();
    const run=await(await simulation).json();
    await expect(page.getByTestId('telemetry-demand')).toHaveText(run.result.intervals[0].demand_kw.toFixed(2));
    await page.getByRole('slider',{name:'Mission interval'}).press('End');
    await expect(page.getByTestId('telemetry-generation')).toHaveText(run.result.intervals.at(-1).generation_kw.toFixed(2));
    await expect(page.getByRole('button',{name:'Expand timeline',exact:true})).toBeVisible();
    await page.screenshot({path:'../artifacts/targeted-candidate-playback.png'});
    await openActivity(page,'Build');
    await missionDetails(page);await page.getByRole('button',{name:'Saved missions',exact:true}).click();
    await page.getByRole('button',{name:`Open scenario: ${name}`,exact:true}).click();
    await missionTools(page);await expect(page.getByRole('button',{name:/^Select asset: habitat /i})).toBeVisible();
    const saved=await(await request.get(`/api/scenarios/${id}`)).json();
    expect(saved.site).toEqual(scenario.site);expect(saved.assets).toHaveLength(1);
    await openActivity(page,'Explore');await page.getByRole('button',{name:'Overlays',exact:true}).click();
    await page.getByRole('button',{name:'Find settlement sites',exact:true}).click();
    await expect(page.getByRole('button',{name:`Inspect ${candidate.id}`,exact:true})).toHaveAttribute('aria-pressed','true');
    const alternative=report.candidates.find(item=>item.id!==candidate.id)!;expect(alternative).toBeTruthy();
    await page.getByRole('button',{name:`Inspect ${alternative.id}`,exact:true}).click();
    await page.getByRole('button',{name:'Create mission at selected location',exact:true}).click();
    await expect(page.getByTestId('mission-site-handoff')).toContainText(`${alternative.latitude_deg.toFixed(5)}° / ${alternative.longitude_deg.toFixed(5)}° E`);
    await page.getByLabel('Scenario name',{exact:true}).fill(`${name} separate mission`);
    await expect(page.getByRole('button',{name:'Save scenario',exact:true})).not.toBeVisible();
    const unchanged=await(await request.get(`/api/scenarios/${id}`)).json();
    expect(unchanged).toEqual(saved);
    expect(errors).toEqual([]);
  }finally{
    if(id){const scenario=await(await request.get(`/api/scenarios/${id}`)).json();await request.delete(`/api/scenarios/${id}?revision=${scenario.revision}`);}
  }
});

test('global screening exposes missing evidence, editable assumptions, loading, and recoverable errors',async({page})=>{
  await openFinder(page,'Mare Tranquillitatis');
  let release!:()=>void;const pending=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/atlas/suitability',async route=>{await pending;await route.fulfill({status:503,json:{detail:'Scientific screening unavailable. Retry.'}});});
  await page.getByRole('button',{name:'Find settlement sites',exact:true}).click();
  try{await expect(page.getByRole('button',{name:/Finding candidates/})).toBeDisabled();}finally{release();}
  await expect(page.getByRole('alert').filter({hasText:'Scientific screening unavailable'})).toBeVisible();
  await page.unroute('**/api/atlas/suitability');
  await page.getByText('Screening settings',{exact:true}).click();
  await page.getByLabel('Search radius (km)',{exact:true}).fill('10');
  await page.getByLabel('Low-slope threshold (degrees)',{exact:true}).fill('2');
  const response=page.waitForResponse(result=>result.url().endsWith('/atlas/suitability')&&result.request().method()==='POST');
  await page.getByRole('button',{name:'Find settlement sites',exact:true}).click();
  const report=await(await response).json();expect(report.request.max_slope_deg).toBe(2);expect(report.request.area.radius_km).toBe(10);
  expect(report.candidates.every((item:any)=>item.solar_visibility===null)).toBe(true);
  await expect(page.getByTestId('candidate-search-context')).toContainText('Within 10 km');
  await expect(page.getByRole('region',{name:'Terrain-only candidates'})).toBeVisible();
  await expect(page.getByRole('region',{name:'Terrain and sunlight candidates'})).toHaveCount(0);
  await page.getByText('Why this candidate?',{exact:true}).first().click();
  await expect(page.getByRole('region',{name:'Settlement suitability'})).toContainText('Comparable average sunlight coverage is unavailable');
});

for(const [width,height] of [[1920,1080],[1440,900],[1366,768],[1024,768],[390,844]]){
  test(`site finder respects map and panel boundaries at ${width}x${height}`,async({page})=>{
    await page.setViewportSize({width,height});await openFinder(page);
    await page.getByRole('button',{name:'Find settlement sites',exact:true}).click();
    await expect(page.getByRole('button',{name:/^Inspect candidate-/}).first()).toBeVisible();
    await page.getByText('Screening settings',{exact:true}).click();
    await page.getByLabel('Search radius (km)',{exact:true}).scrollIntoViewIfNeeded();
    await expect(page.getByLabel('Search radius (km)',{exact:true})).toBeInViewport();
    await expect(page.getByRole('button',{name:'Close atlas',exact:true})).toBeInViewport();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const toolbar=(await page.locator('.globe-toolbar').boundingBox())!,panel=(await page.getByRole('complementary',{name:'Lunar atlas'}).boundingBox())!;
    expect(panel.y).toBeGreaterThanOrEqual(toolbar.y+toolbar.height-1);
    if(width>900){const viewport=(await page.locator('.globe-viewport').boundingBox())!;expect(viewport.x+viewport.width).toBeLessThanOrEqual(panel.x+1);}
    await page.screenshot({path:`../artifacts/simple-settlement-${width}.png`});
  });
}
