import {test,expect} from '@playwright/test';
import {explainInterval,intervalStatus,missionOutcome,kw} from '../lib/power-flow';
import type {SimulationRun} from '../types/simulation';

// Explanations restate stored Python results; this checks every number against the interval.
test('power-flow explanations match stored interval math, statuses and mission outcome',async({request})=>{
  const location={latitude_deg:-89.5,longitude_deg:0};
  const created=await request.post('/api/scenarios',{data:{name:`Explanation check ${Date.now()}`,site:location,assets:[
    {kind:'habitat',name:'Explained habitat',location,demand_kw:8},
    {kind:'communications',name:'Explained comms',location,demand_kw:.5},
    {kind:'solar_array',name:'Explained array',location:{...location,longitude_deg:10},rated_power_kw:20,derating:.85},
    {kind:'battery',name:'Explained battery',location:{...location,longitude_deg:20},capacity_kwh:30,initial_soc:.6,minimum_soc:.2},
  ],mission:{start:'2027-01-01T00:00:00Z',end:'2027-01-01T12:00:00Z',timestep_seconds:3600,illumination_kind:'custom_hypothetical',
    illumination_label:'Explicit explanation test profile; not lunar sunlight',illumination_factors:[1,1,1,0,0,0,0,0,0,1,1,1]}}});
  expect(created.status()).toBe(201);const scenario=await created.json();
  try {
    const response=await request.post(`/api/scenarios/${scenario.id}/simulations`,{data:{revision:scenario.revision}});
    expect(response.status()).toBe(201);const run:SimulationRun=await response.json();
    const statuses=new Set<string>();
    const capacity=30;
    run.result.intervals.forEach((interval,index)=>{
      const flow=explainInterval(run,index);
      expect(flow.generation_kw).toBe(interval.generation_kw);expect(flow.demand_kw).toBe(interval.demand_kw);
      expect(flow.charge_kw).toBe(interval.charge_kw);expect(flow.discharge_kw).toBe(interval.discharge_kw);
      expect(flow.unserved_kw).toBe(interval.unserved_kw);expect(flow.curtailed_kw).toBe(interval.curtailed_kw);
      // Bus balance of the explained values: supply = use.
      expect(flow.generation_kw+flow.discharge_kw+flow.unserved_kw).toBeCloseTo(flow.demand_kw+flow.charge_kw+flow.curtailed_kw,9);
      expect(flow.surplus_kw-flow.deficit_kw).toBeCloseTo(interval.net_kw,12);
      expect(flow.battery.soc_start!).toBeCloseTo(interval.energy_start_kwh/capacity,12);expect(flow.battery.soc_end).toBe(interval.soc_end);
      expect(flow.sources.reduce((sum,item)=>sum+item.kw,0)).toBeCloseTo(interval.generation_kw,12);
      expect(flow.loads.reduce((sum,item)=>sum+item.kw,0)).toBeCloseTo(interval.demand_kw,12);
      expect(flow.input_factor).toBe(run.result.mission.illumination_factors![index]);
      expect(flow.lines[0]).toContain(interval.generation_kw>1e-9?kw(interval.generation_kw):'0 kW');
      expect(flow.lines.join(' ')).toContain(kw(interval.demand_kw));
      if(interval.unserved_kw>1e-9){expect(flow.status).toBe('POWER SHORTAGE');expect(flow.system).toContain(kw(interval.unserved_kw));}
      else expect(flow.system).toBe('All electrical demand is served.');
      if(interval.charge_kw>1e-9)expect(flow.lines.join(' ')).toContain(`Batteries charge at ${kw(interval.charge_kw)}`);
      if(interval.discharge_kw>1e-9)expect(flow.lines.join(' ')).toContain(`Batteries supply ${kw(interval.discharge_kw)}`);
      expect(flow.status).toBe(intervalStatus(interval));statuses.add(flow.status);
      expect(flow.events.map(event=>event.kind)).toEqual(run.result.events.filter(event=>event.interval_index===index).map(event=>event.kind));
    });
    // This profile exercises surplus, discharge, the reserve bound and a shortage.
    expect([...statuses]).toEqual(expect.arrayContaining(['NOMINAL','POWER LIMITED','POWER SHORTAGE']));
    const outcome=missionOutcome(run),summary=run.result.summary;
    expect(outcome.served_kwh).toBeCloseTo(summary.demanded_kwh-summary.unserved_kwh,12);
    expect(outcome.minimum_soc).toBe(summary.minimum_soc);expect(outcome.shortage_hours).toBe(summary.shortage_duration_hours);
    expect(outcome.first_shortage_index).toBe(run.result.intervals.findIndex(row=>row.unserved_kw>1e-9));
    expect(outcome.first_shortage_explanation?.status).toBe('POWER SHORTAGE');
  } finally {
    const latest=await(await request.get(`/api/scenarios/${scenario.id}`)).json();
    await request.delete(`/api/scenarios/${scenario.id}?revision=${latest.revision}`);
  }
});
