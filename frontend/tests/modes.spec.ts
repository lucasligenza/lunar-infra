import {test,expect} from '@playwright/test';
import { lunarCoordinate } from '../lib/globe';

test('global selection connects to local science and preserves mission drafts, assets and playback',async({page,request})=>{
  test.setTimeout(90000);
  const location = {latitude_deg:-89.5,longitude_deg:0}, solarLocation={latitude_deg:-89.55,longitude_deg:1};
  const name=`Integrated outpost ${Date.now()}`;
  const scenario = await (await request.post('/api/scenarios',{data:{name,site:location,assets:[
    {kind:'habitat',name:'Research habitat',location,demand_kw:8},
    {kind:'solar_array',name:'Science array',location:solarLocation,rated_power_kw:20,derating:1}],
    mission:{start:'2027-01-01T00:00:00Z',end:'2027-01-01T04:00:00Z',timestep_seconds:3600,illumination_kind:'custom_hypothetical',illumination_label:'Explicit integration test profile',illumination_factors:[1,0,1,0]}}})).json();
  try {
    await page.goto('/');
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    await page.getByRole('button',{name:/^Shackleton crater/}).click();
    await expect(page.getByTestId('local-coverage')).toHaveText('240 m south-pole grid');
    await page.getByRole('button',{name:'Analyze this region',exact:true}).click();
    const local=await (await request.get('/api/sites/inspect?latitude=-89.67&longitude=129.78')).json();
    await expect(page.getByTestId('selected-coordinate')).toContainText('89.67000');
    await expect(page.getByTestId('elevation-value')).toHaveText(local.elevation.value.toLocaleString('en-US',{minimumFractionDigits:1,maximumFractionDigits:1}));
    await page.screenshot({path:'../artifacts/phase3-regional-connected.png'});
    await page.getByRole('button',{name:'Mission Designer',exact:true}).click();
    await page.getByRole('button',{name:`Open scenario: ${name}`,exact:true}).click();
    await page.getByRole('button',{name:'Select asset: Research habitat',exact:true}).click();
    await page.getByLabel('Continuous demand (kW)',{exact:true}).fill('9');
    await page.getByLabel('Time step (seconds)',{exact:true}).fill('1800');
    await page.getByRole('button',{name:'Global Explorer',exact:true}).click();
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    const canvas=page.getByTestId('moon-canvas');
    await expect.poll(async()=>JSON.parse((await canvas.getAttribute('data-markers'))??'[]').length).toBe(4);
    const markers=JSON.parse((await canvas.getAttribute('data-markers'))!);
    for(const [index,asset] of scenario.assets.entries()) {
      const point=lunarCoordinate(...markers[index+2].position as [number,number,number]);
      expect(point[0]).toBeCloseTo(asset.location.longitude_deg,6);expect(point[1]).toBeCloseTo(asset.location.latitude_deg,6);
    }
    expect(markers[0].pixels).toBe(6);
    expect(markers[0].scale).toBeLessThan(.01);
    const camera=(await canvas.getAttribute('data-camera'))!;
    await page.screenshot({path:'../artifacts/phase3-global-mission-assets.png'});
    await page.getByRole('button',{name:'Regional Analysis',exact:true}).click();
    await expect(page.getByTestId('selected-coordinate')).toContainText('89.50000');
    await page.getByRole('button',{name:'Mission Designer',exact:true}).click();
    await expect(page.getByLabel('Continuous demand (kW)',{exact:true})).toHaveValue('9');
    await expect(page.getByLabel('Time step (seconds)',{exact:true})).toHaveValue('1800');
    await page.getByLabel('Time step (seconds)',{exact:true}).fill('3600');
    await page.getByRole('button',{name:'Save asset',exact:true}).click();
    await expect(page.getByRole('button',{name:'Save asset',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Run simulation',exact:true}).click();
    await expect(page.getByTestId('telemetry-generation')).toHaveText('20.00');
    await page.getByRole('slider',{name:'Mission interval'}).press('End');
    await expect(page.getByTestId('telemetry-generation')).toHaveText('0.00');
    await page.getByRole('button',{name:'Global Explorer',exact:true}).click();
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    const returned=(await page.getByTestId('moon-canvas').getAttribute('data-camera'))!;
    const before=camera.split(',').map(Number),after=returned.split(',').map(Number);
    before.forEach((value,index)=>expect(after[index]).toBeCloseTo(value,3));
    await page.getByRole('button',{name:'Mission Designer',exact:true}).click();
    await expect(page.getByRole('slider',{name:'Mission interval'})).toHaveValue('3');
    await expect(page.getByTestId('telemetry-generation')).toHaveText('0.00');
    await page.screenshot({path:'../artifacts/phase3-mission-connected.png'});
    expect((await (await request.get(`/api/scenarios/${scenario.id}`)).json()).assets[0].demand_kw).toBe(9);
  } finally {
    const current=await (await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${current.revision}`);
  }
});

test('unsupported global selection never displays another region as its analysis',async({page})=>{
  await page.goto('/');await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
  // Hold coverage to verify a quick mode switch cannot paint an unrelated map.
  let release!:()=>void;const held=new Promise<void>(resolve=>{release=resolve;});
  await page.route('**/api/globe/inspect/location*',async route=>{await held;await route.continue();});
  await page.getByRole('button',{name:/^Lunar north pole/}).click();
  await page.getByRole('button',{name:'Regional Analysis',exact:true}).click();
  await expect(page.getByRole('region',{name:'Local coverage unavailable'})).toBeVisible();
  await expect(page.getByTestId('terrain-map')).toBeHidden();
  await expect(page.getByTestId('elevation-value')).toHaveCount(0);
  release();await page.unrouteAll({behavior:'wait'});
  await page.getByRole('button',{name:'Return to selected global location',exact:true}).click();
  await expect(page.getByTestId('global-coordinate')).toContainText('90.00000° N');
  await expect(page.getByRole('heading',{name:'Lunar north pole',exact:true})).toBeVisible();
});
