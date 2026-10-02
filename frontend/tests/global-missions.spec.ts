import {missionInspector,missionDetails,missionTools,openActivity,openDestinations} from './workspace';
import {test,expect} from '@playwright/test';
import {lunarCoordinate} from '../lib/globe';
import type {SimulationRun} from '../types/simulation';

test('global native terrain supports saved hypothetical missions, 3D placement and calculated playback',async({page,request})=>{
  test.setTimeout(120000);
  const name=`Global atlas mission ${Date.now()}`;let id:string|null=null;
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);
    await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
    await page.getByRole('button',{name:'Overlays',exact:true}).click();
    await page.getByRole('combobox',{name:'Scientific overlay',exact:true}).selectOption('illumination');
    await expect(page.getByTestId('atlas-sunlight')).toHaveText('Unavailable here');
    await page.getByRole('button',{name:'Close atlas',exact:true}).click();
    await page.getByRole('button',{name:'Create mission here',exact:true}).click();
    await missionInspector(page);
    const sample=await(await request.get('/api/atlas/inspect?latitude=0.67&longitude=23.47')).json();
    await expect(page.getByTestId('global-mission-elevation')).toHaveText(sample.elevation.value.toFixed(1));
    await expect(page.getByRole('complementary',{name:'Global site inspector'})).toContainText('WAC_GLD100_E000N1800_032P');
    await missionTools(page);
    await page.getByLabel('Scenario name',{exact:true}).fill(name);
    const creation=page.waitForResponse(r=>r.url().endsWith('/scenarios')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Create scenario at selected site',exact:true}).click();
    const scenario=await(await creation).json();id=scenario.id;expect(scenario.region_id).toBe('global-atlas');
    const canvas=page.getByLabel('Interactive 3D Moon',{exact:true}),host=page.getByTestId('moon-canvas');
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    const renderStatus=(await page.getByTestId('globe-status').boundingBox())!;
    const fly=(await page.getByRole('button',{name:'Fly to selected site',exact:true}).boundingBox())!;
    expect(renderStatus.y+renderStatus.height).toBeLessThanOrEqual(fly.y);
    await expect.poll(async()=>Math.hypot(...(await host.getAttribute('data-camera'))!.split(',').map(Number))).toBeCloseTo(1.18,2);
    const box=(await canvas.boundingBox())!;
    for(const [kind,x,y] of [['habitat',.54,.44],['solar array',.44,.52],['battery',.6,.6]] as const) {
      await missionTools(page);
      await page.getByRole('button',{name:`Place ${kind}`,exact:true}).click();
      await canvas.click({position:{x:box.width*x,y:box.height*y}});
      await expect(page.getByRole('button',{name:'Cancel placement',exact:true})).toHaveCount(0);
      await expect(page.getByRole('complementary',{name:'Asset configuration'})).toBeVisible();
    }
  await openDestinations(page);
    await missionTools(page);
    await page.getByRole('button',{name:/^Select asset: habitat /i}).click();
    await page.getByLabel('Asset name',{exact:true}).fill('Atlas habitat');
    await page.getByLabel('Continuous demand (kW)',{exact:true}).fill('9');
    await missionInspector(page);
    await page.getByRole('button',{name:'Save asset',exact:true}).click();
    await expect(page.getByText('Asset configuration saved',{exact:true})).toBeVisible();
    const original=await(await request.get(`/api/scenarios/${id}`)).json();
    expect(original.assets).toHaveLength(3);expect(original.assets[0].location.latitude_deg).toBeGreaterThan(0);
    await page.getByRole('button',{name:'Move on map',exact:true}).click();
    await canvas.click({position:{x:box.width*.38,y:box.height*.38}});
    await expect(page.getByRole('button',{name:'Cancel placement',exact:true})).toHaveCount(0);
    const moved=await(await request.get(`/api/scenarios/${id}`)).json();
    expect(moved.assets[0].location).not.toEqual(original.assets[0].location);
    await expect.poll(async()=>JSON.parse((await host.getAttribute('data-markers'))??'[]').filter((m:any)=>m.assetId).length).toBe(3);
    const markers=JSON.parse((await host.getAttribute('data-markers'))!);
    for(const asset of moved.assets) {
      const marker=markers.find((m:any)=>m.assetId===asset.id),[lon,lat]=lunarCoordinate(...marker.position as [number,number,number]);
      expect(lon).toBeCloseTo(asset.location.longitude_deg,6);expect(lat).toBeCloseTo(asset.location.latitude_deg,6);
    }
    await missionTools(page);
    const slopeTile=page.waitForResponse(response=>response.url().includes('/atlas/tiles/gld100/slope/')&&response.ok());
    await page.getByRole('combobox',{name:'Global mission surface',exact:true}).selectOption('slope');
    await slopeTile;
    await expect(page.locator('.mission-layer-status')).toContainText('Scientific overlay ready');
    const overlayDisclosure=page.locator('.mission-layer-status > summary');
    await expect(overlayDisclosure).toHaveCount(1);
    await overlayDisclosure.click();
    await expect(page.locator('.mission-layer-status')).toContainText('30 deg');
    await overlayDisclosure.click();
    await openActivity(page, 'Simulate');
    await page.getByRole('button',{name:'Apply synthetic stress profile',exact:true}).click();
    const result=page.waitForResponse(r=>r.url().endsWith('/simulations')&&r.request().method()==='POST');
    await missionTools(page);
    await page.getByRole('button',{name:'Run simulation',exact:true}).click();
    const run:SimulationRun=await(await result).json();
    await expect(page.getByTestId('telemetry-demand')).toHaveText(run.result.intervals[0].demand_kw.toFixed(2));
    await page.getByRole('slider',{name:'Mission interval'}).press('End');
    await expect(page.getByTestId('telemetry-generation')).toHaveText(run.result.intervals.at(-1)!.generation_kw.toFixed(2));
    await expect(page.locator('.mission-layer-status')).toContainText('Scientific overlay ready');
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    await page.screenshot({path:'../artifacts/phase4-global-mission.png'});
    await openActivity(page, 'Explore');
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    await openActivity(page, 'Analyze');
    await expect(page.getByRole('region',{name:'Regional atlas analysis'})).toBeVisible();
    await openActivity(page, 'Simulate');
    await expect(page.getByRole('slider',{name:'Mission interval'})).toHaveValue(String(run.result.intervals.length-1));
    await page.reload();
    await missionTools(page);
    await page.getByRole('button',{name:`Open scenario: ${name}`,exact:true}).click();
    await expect(page.getByRole('region',{name:'Mission timeline'})).toBeVisible();
    await expect(page.getByTestId('telemetry-demand')).toHaveText(run.result.intervals[0].demand_kw.toFixed(2));
    await openActivity(page,'Build');
    await missionInspector(page);
    await expect(page.getByTestId('global-mission-elevation')).toBeVisible();
    await openActivity(page,'Simulate');
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    await page.setViewportSize({width:390,height:844});
    await expect.poll(async()=>Number(await host.getAttribute('data-draws'))).toBeGreaterThan(2);
    await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    await page.screenshot({path:'../artifacts/phase4-global-mission-mobile.png',fullPage:true});
    expect(errors).toEqual([]);
  } finally {
    if(id){const latest=await(await request.get(`/api/scenarios/${id}`)).json();await request.delete(`/api/scenarios/${id}?revision=${latest.revision}`);}
  }
});

test('global mission and regional atlas remain usable when the polar cache is unavailable',async({page})=>{
  await page.route('**/api/regions',route=>route.fulfill({json:[]}));
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  await openDestinations(page);
  await page.getByRole('button',{name:/^Mare Tranquillitatis/}).click();
  await page.getByRole('button',{name:'Create mission here',exact:true}).click();
  await missionInspector(page);
  await expect(page.getByTestId('global-mission-elevation')).toBeVisible();
  await missionTools(page);
  await expect(page.getByRole('button',{name:'Create scenario at selected site',exact:true})).toBeEnabled();
  await expect(page.getByRole('alert').filter({hasText:'No prepared region'})).toHaveCount(0);
  await openActivity(page, 'Analyze');
  await expect(page.getByRole('region',{name:'Regional atlas analysis'})).toBeVisible();
  await expect(page.getByTestId('terrain-map')).toHaveCount(0);
});
