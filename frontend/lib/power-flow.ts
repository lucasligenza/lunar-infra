// Deterministic plain-language explanation of one stored simulation interval.
// It restates values produced by the Python energy engine (energy-1.0) with fixed
// templates; it computes no physics and never generates text with a model.
import type {Interval,SimulationRun} from '../types/simulation';
import type {Asset} from '../types/mission';

export type MissionStatus='NOMINAL'|'POWER LIMITED'|'BATTERY RESERVE'|'POWER SHORTAGE';
export type FlowItem={id:string;name:string;kind:Asset['kind'];kw:number};
export type FlowExplanation={
  index:number;status:MissionStatus;tone:'nominal'|'warning'|'failure';
  generation_kw:number;demand_kw:number;charge_kw:number;discharge_kw:number;curtailed_kw:number;unserved_kw:number;
  surplus_kw:number;deficit_kw:number;input_factor:number|null;
  sources:FlowItem[];loads:FlowItem[];
  battery:{present:boolean;mode:'charging'|'discharging'|'idle';soc_start:number|null;soc_end:number|null;limits:string[]};
  lines:string[];system:string;events:{time:string;kind:string;message:string}[];
};

const TOLERANCE=1e-9;
export const kw=(value:number)=>`${value.toFixed(2)} kW`;
export const pct=(value:number)=>`${(value*100).toFixed(1)}%`;
const LOAD_NAMES:Record<string,string>={habitat:'habitat',communications:'communications',robot:'rover'};

function capacity(run:SimulationRun) {
  return run.scenario_snapshot.assets.filter(asset=>asset.kind==='battery').reduce((sum,asset)=>sum+(asset.capacity_kwh??0),0);
}

/** Interval status from stored values; precedence shortage > reserve > limited > nominal. */
export function intervalStatus(interval:Interval):MissionStatus {
  if(interval.unserved_kw>TOLERANCE)return 'POWER SHORTAGE';
  if(Object.values(interval.batteries).some(battery=>battery.limits.includes('reserve')))return 'BATTERY RESERVE';
  if(interval.discharge_kw>TOLERANCE)return 'POWER LIMITED';
  return 'NOMINAL';
}

export function explainInterval(run:SimulationRun,index:number):FlowExplanation {
  const rows=run.result.intervals,interval=rows[Math.max(0,Math.min(index,rows.length-1))];
  const assets=new Map(run.scenario_snapshot.assets.map(asset=>[asset.id,asset]));
  const item=(id:string,value:number):FlowItem=>({id,name:assets.get(id)?.name??id,kind:assets.get(id)?.kind??'habitat',kw:value});
  const sources=Object.entries(interval.asset_generation_kw).map(([id,value])=>item(id,value));
  const loads=Object.entries(interval.asset_load_kw).map(([id,value])=>item(id,value)).filter(load=>load.kw>0);
  const total=capacity(run);
  const present=total>0&&interval.soc_end!==null;
  const socStart=present?interval.energy_start_kwh/total:null;
  const limits=[...new Set(Object.values(interval.batteries).flatMap(battery=>battery.limits))];
  const mode=interval.charge_kw>TOLERANCE?'charging':interval.discharge_kw>TOLERANCE?'discharging':'idle';
  const factor=run.result.mission.illumination_factors?.[interval.index]??null;
  const surplus=Math.max(0,interval.net_kw),deficit=Math.max(0,-interval.net_kw);
  const status=intervalStatus(interval);
  const loadKinds=[...new Set(loads.map(load=>LOAD_NAMES[load.kind]??load.kind))];
  const lines:string[]=[];
  lines.push(interval.generation_kw>TOLERANCE?`Solar arrays generate ${kw(interval.generation_kw)}${factor!==null?` (hypothetical input factor ${factor})`:''}.`:
    `Solar arrays generate 0 kW in this interval${factor!==null?` (hypothetical input factor ${factor})`:''}.`);
  lines.push(loadKinds.length?`${loadKinds.map(name=>name[0].toUpperCase()+name.slice(1)).join(' + ')} require${loadKinds.length===1?'s':''} ${kw(interval.demand_kw)}.`:'No electrical demand in this interval.');
  if(interval.net_kw>=0) {
    if(interval.demand_kw>0||surplus>TOLERANCE)lines.push(`${kw(surplus)} remains after demand.`);
    if(mode==='charging'&&present)lines.push(`Batteries charge at ${kw(interval.charge_kw)}; state of charge ${pct(socStart!)} → ${pct(interval.soc_end!)}.`);
    if(interval.curtailed_kw>TOLERANCE)lines.push(present?`${kw(interval.curtailed_kw)} cannot be stored${limits.includes('capacity')?' (battery full)':limits.includes('charge_power')?' (charge-rate limit)':''} and is curtailed.`:
      `No batteries: ${kw(interval.curtailed_kw)} is curtailed.`);
  } else {
    lines.push(`Demand exceeds generation by ${kw(deficit)}.`);
    if(mode==='discharging'&&present)lines.push(`Batteries supply ${kw(interval.discharge_kw)}; state of charge ${pct(socStart!)} → ${pct(interval.soc_end!)}.`);
    if(limits.includes('reserve'))lines.push('Battery reserve reached: the remaining stored energy is held back by the reserve setting.');
    if(limits.includes('discharge_power'))lines.push('Battery discharge-rate limit reached.');
    if(!present&&interval.unserved_kw>TOLERANCE)lines.push('No batteries can cover the deficit.');
  }
  const system=interval.unserved_kw>TOLERANCE?`SYSTEM SHORTAGE: ${kw(interval.unserved_kw)} of demand is not served on average in this interval.`:'All electrical demand is served.';
  const events=run.result.events.filter(event=>event.interval_index===interval.index).map(event=>({time:event.time,kind:event.kind,message:event.message}));
  return {index:interval.index,status,tone:status==='POWER SHORTAGE'?'failure':status==='NOMINAL'?'nominal':'warning',
    generation_kw:interval.generation_kw,demand_kw:interval.demand_kw,charge_kw:interval.charge_kw,discharge_kw:interval.discharge_kw,
    curtailed_kw:interval.curtailed_kw,unserved_kw:interval.unserved_kw,surplus_kw:surplus,deficit_kw:deficit,input_factor:factor,
    sources,loads,battery:{present,mode,soc_start:socStart,soc_end:interval.soc_end,limits},lines,system,events};
}

/** Whole-mission outcome from the stored summary and intervals. */
export function missionOutcome(run:SimulationRun) {
  const summary=run.result.summary,rows=run.result.intervals;
  const served=summary.demanded_kwh-summary.unserved_kwh;
  const first=rows.findIndex(row=>row.unserved_kw>TOLERANCE);
  return {generated_kwh:summary.generated_kwh,demanded_kwh:summary.demanded_kwh,served_kwh:served,unserved_kwh:summary.unserved_kwh,
    curtailed_kwh:summary.curtailed_kwh,losses_kwh:summary.battery_losses_kwh,minimum_soc:summary.minimum_soc,
    shortage_hours:summary.shortage_duration_hours,first_shortage:summary.first_power_shortage,first_shortage_index:first<0?null:first,
    first_shortage_explanation:first<0?null:explainInterval(run,first),
    verdict:summary.unserved_kwh>TOLERANCE?'Demand was not fully served':'All demand was served'};
}
