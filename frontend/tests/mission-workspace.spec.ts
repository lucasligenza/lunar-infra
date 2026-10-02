import {test,expect} from '@playwright/test';
import {missionTools,openActivity} from './workspace';

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
    await page.screenshot({path:`../artifacts/mission-after-build-${width}.png`});
    const map=(await page.getByTestId('terrain-map').boundingBox())!;
    expect(map.width).toBeGreaterThan(width*.9);
    await page.getByRole('button',{name:'+ Add Asset',exact:true}).click();
    await expect(page.getByRole('button',{name:'Place habitat',exact:true})).toBeVisible();
    await page.screenshot({path:`../artifacts/mission-after-palette-${width}.png`});
    await page.getByRole('button',{name:'Place habitat',exact:true}).click();
    await expect(page.getByRole('complementary',{name:'Exploration tools'})).not.toBeVisible();
    await page.getByRole('button',{name:'Cancel placement',exact:true}).click();
    await openActivity(page,'Simulate');await missionTools(page);
    const pending=page.waitForResponse(r=>r.url().endsWith('/simulations')&&r.request().method()==='POST');
    await page.getByRole('button',{name:'Run simulation',exact:true}).click();await pending;
    await expect(page.getByRole('region',{name:'Mission timeline'})).toBeVisible();
    await expect(page.locator('#context-inspector')).not.toBeVisible();
    await page.screenshot({path:`../artifacts/mission-after-simulate-${width}.png`});
  }finally{const latest=await(await request.get(`/api/scenarios/${scenario.id}`)).json();await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);}
});
