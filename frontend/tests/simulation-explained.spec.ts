import {test,expect,type Page} from '@playwright/test';
import {lunarCoordinate} from '../lib/globe';
import {openMissions} from './workspace';
import type {SimulationRun} from '../types/simulation';

const point=(latitude_deg:number,longitude_deg:number)=>({latitude_deg,longitude_deg});
const factors=Array.from({length:24},(_,index)=>index>=8&&index<16?0:1);

async function roverMarker(page:Page,id:string) {
  const markers=JSON.parse((await page.getByTestId('moon-canvas').getAttribute('data-markers'))??'[]');
  const marker=markers.find((item:{assetId?:string})=>item.assetId===id);
  return marker?lunarCoordinate(...marker.position as [number,number,number]):null;
}

test('simulation explains each interval, marks events, teaches its model and moves the rover deterministically',async({page,request})=>{
  test.setTimeout(180000);
  const created=await request.post('/api/scenarios',{data:{name:`Explained mission ${Date.now()}`,region_id:'global-atlas',site:point(.67,23.47),assets:[
    {kind:'habitat',name:'Explained habitat',location:point(.67,23.47),demand_kw:8},
    {kind:'solar_array',name:'Explained array',location:point(.7,23.5),rated_power_kw:20,derating:.85},
    {kind:'battery',name:'Explained battery',location:point(.64,23.5),capacity_kwh:40,initial_soc:.8,minimum_soc:.15},
    {kind:'robot',name:'Explained rover',location:point(.7,23.42),route:{destination:point(.85,23.6),departure_hours:2,speed_kmh:2,dwell_hours:3,return_to_start:true}}],
    mission:{start:'2027-01-01T00:00:00Z',end:'2027-01-02T00:00:00Z',timestep_seconds:3600,illumination_kind:'synthetic',
      illumination_label:'Synthetic UI test profile; not a lunar sunlight prediction',illumination_factors:factors}}});
  expect(created.status()).toBe(201);const scenario=await created.json();
  const rover=scenario.assets.find((asset:{kind:string})=>asset.kind==='robot').id;
  try {
    const response=await request.post(`/api/scenarios/${scenario.id}/simulations`,{data:{revision:scenario.revision}});
    const run:SimulationRun=await response.json();
    await page.addInitScript(()=>{localStorage.setItem('lunaros.motion.v1','reduce');});
    await page.goto('/?mode=simulation');
    await openMissions(page);
    await page.getByRole('button',{name:`Open scenario: ${scenario.name}`,exact:true}).click();
    const slider=page.getByRole('slider',{name:'Mission interval'});await expect(slider).toBeVisible();
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');

    // What is happening: the explanation restates the stored interval values.
    const shortage=run.result.intervals.findIndex(row=>row.unserved_kw>1e-9);expect(shortage).toBeGreaterThan(0);
    for(const index of [0,shortage]){
      await slider.fill(String(index));const row=run.result.intervals[index];
      await expect(page.getByTestId('flow-generation')).toHaveText(`${row.generation_kw.toFixed(2)} kW`);
      await expect(page.getByTestId('power-flow-explanation')).toContainText(`${row.demand_kw.toFixed(2)} kW`);
      await expect(page.getByTestId('mission-status')).toHaveText(row.unserved_kw>1e-9?'POWER SHORTAGE':row.discharge_kw>1e-9?'POWER LIMITED':'NOMINAL');
      if(row.unserved_kw>1e-9)await expect(page.getByTestId('flow-unserved')).toHaveText(`${row.unserved_kw.toFixed(2)} kW`);
    }
    // Event marks: one per stored event kind and interval; clicking jumps to it.
    const marks=page.getByRole('group',{name:'Mission events'}).getByRole('button');
    const kinds=new Set(run.result.events.map(event=>`${event.kind}-${event.interval_index}`));
    await expect(marks).toHaveCount(kinds.size);
    await page.getByRole('button',{name:/^Shortage begins at/}).first().click();
    await expect(slider).toHaveValue(String(run.result.events.find(event=>event.kind==='power_shortage')!.interval_index));

    // Rover position derives from mission time: start, outbound, destination, and backward scrubbing.
    const positions:Record<number,[number,number]>={};
    for(const index of [0,3,7,23,3,0]){
      await slider.fill(String(index));const expected=run.result.intervals[index].rovers![rover];
      await expect.poll(async()=>{const at=await roverMarker(page,rover);return at&&Math.abs(at[1]-expected.latitude_deg)<1e-6&&Math.abs(((at[0]-expected.longitude_deg)+540)%360-180)<1e-6;}).toBe(true);
      const at=(await roverMarker(page,rover))!;
      if(positions[index])expect(at).toEqual(positions[index]);positions[index]=at;
    }
    expect(run.result.intervals[0].rovers![rover].state).toBe('parked');
    expect(run.result.intervals[3].rovers![rover]).toMatchObject({state:'outbound',moving:true});
    expect(run.result.intervals[23].rovers![rover].state).toBe('returned');
    await expect.poll(async()=>Number(await page.getByTestId('moon-canvas').getAttribute('data-routes'))).toBe(1);

    // Outcome summary uses the stored kWh summary.
    await slider.fill(String(run.result.intervals.length-1));
    await page.getByRole('button',{name:'Expand timeline',exact:true}).click();
    await expect(page.getByTestId('outcome-generated')).toHaveText(`${run.result.summary.generated_kwh.toFixed(2)} kWh`);
    await expect(page.getByTestId('outcome-unserved')).toHaveText(`${run.result.summary.unserved_kwh.toFixed(2)} kWh`);
    await expect(page.getByTestId('outcome-shortage-hours')).toHaveText(`${run.result.summary.shortage_duration_hours.toFixed(2)} h`);
    await expect(page.getByText('MISSION COMPLETE',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Collapse timeline',exact:true}).click();

    // Tutorial: optional, explicit about hypothetical sunlight, dismissible, remembered and reopenable.
    const tutorial=page.getByRole('dialog',{name:'Simulation tutorial'});
    await expect(tutorial).toHaveCount(0);
    await page.locator('.surface-toolbar').getByRole('button',{name:'How the simulation works'}).click();
    await expect(tutorial).toContainText('1 / 6');
    await tutorial.getByRole('button',{name:'Next'}).click();
    await expect(tutorial).toContainText('validated time-resolved lunar sunlight is not integrated');
    await expect(page.locator('[data-tour="solar"]')).toHaveClass(/tour-target/);
    await tutorial.getByRole('button',{name:'Dismiss tutorial'}).click();
    await expect(tutorial).toHaveCount(0);
    expect(await page.evaluate(()=>localStorage.getItem('lunaros.simulation-tutorial.v1'))).toBe('1');
    await page.getByRole('region',{name:'Power flow'}).getByRole('button',{name:'How the simulation works'}).click();
    await expect(tutorial).toContainText('1 / 6');await page.keyboard.press('Escape');await expect(tutorial).toHaveCount(0);

    // Reloading the saved run reproduces the same rover position.
    await page.reload();
    await openMissions(page);
    await page.getByRole('button',{name:`Open scenario: ${scenario.name}`,exact:true}).click();
    await expect(slider).toBeVisible();await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    await slider.fill('3');
    await expect.poll(async()=>JSON.stringify(await roverMarker(page,rover))).toBe(JSON.stringify(positions[3]));
  } finally {
    const latest=await(await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
  }
});

test('a rover destination is set on the Moon, validated by the API and editable in the inspector',async({page,request})=>{
  test.setTimeout(120000);
  const created=await request.post('/api/scenarios',{data:{name:`Route setup ${Date.now()}`,region_id:'global-atlas',site:point(.67,23.47),assets:[
    {kind:'robot',name:'Route rover',location:point(.67,23.47)}]}});
  const scenario=await created.json();
  try {
    await page.addInitScript(()=>{localStorage.setItem('lunaros.motion.v1','reduce');});
    await page.goto('/?mode=mission');
    await openMissions(page);
    await page.getByRole('button',{name:`Open scenario: ${scenario.name}`,exact:true}).click();
    await expect(page.getByTestId('globe-status')).toContainText('terrain ready');
    await openMissions(page);await page.getByRole('button',{name:'Select asset: Route rover',exact:true}).click();
    const inspector=page.getByRole('complementary',{name:'Asset',exact:true});
    await expect(inspector).toContainText('No route: the rover stays parked');
    await inspector.getByRole('button',{name:'Set destination on map',exact:true}).click();
    await expect(page.getByRole('status').filter({hasText:'Click terrain to set the rover destination'})).toBeVisible();
    const canvas=page.getByLabel('Interactive 3D Moon',{exact:true}),box=(await canvas.boundingBox())!;
    const saved=page.waitForResponse(response=>response.request().method()==='PATCH'&&response.url().includes('/assets/'));
    await canvas.click({position:{x:box.width*.62,y:box.height*.4}});
    const updated=await(await saved).json();
    const route=updated.assets[0].route;expect(route.destination.latitude_deg).not.toBe(.67);
    expect(route).toMatchObject({speed_kmh:1,departure_hours:0,dwell_hours:0,return_to_start:true});
    await expect(inspector.getByTestId('rover-destination')).toContainText(route.destination.latitude_deg.toFixed(5));
    await inspector.getByLabel('Speed (km/h)').fill('3');
    await inspector.getByRole('button',{name:'Save asset',exact:true}).click();
    await expect.poll(async()=>(await(await request.get(`/api/scenarios/${scenario.id}`)).json()).assets[0].route.speed_kmh).toBe(3);
    await expect.poll(async()=>Number(await page.getByTestId('moon-canvas').getAttribute('data-routes'))).toBe(1);
  } finally {
    const latest=await(await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
  }
});
