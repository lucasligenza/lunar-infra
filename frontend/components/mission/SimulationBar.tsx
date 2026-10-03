"use client";
import type {Interval,MissionEvent} from '../../types/simulation';
import type {Asset} from '../../types/mission';
import Icon from '../ui/Icon';
import Segmented from '../ui/Segmented';

const EVENT_LABEL:Record<string,string>={power_shortage:'Shortage begins',power_restored:'Power restored',battery_full:'Battery full',battery_reserve:'Battery reserve reached'};

export default function SimulationBar({current,index,count,playing,expanded,speed,inputKind,asset,events=[],onToggle,onPlay,onSpeed,onSelect}:{
  current:Interval;index:number;count:number;playing:boolean;expanded:boolean;speed:number;inputKind:string;events?:MissionEvent[];
  asset?:Asset;
  onToggle:()=>void;onPlay:()=>void;onSpeed:(speed:number)=>void;onSelect:(index:number)=>void;
}) {
  const battery=current.soc_end===null?'No batteries':`${(current.soc_end*100).toFixed(2)}%`;
  const selectedBattery=asset?current.batteries[asset.id]:undefined;
  const assetPower=asset?(asset.kind==='solar_array'?current.asset_generation_kw[asset.id]:current.asset_load_kw[asset.id]):undefined;
  const assetValue=asset?.kind==='battery'?(selectedBattery?`${(selectedBattery.soc_end*100).toFixed(2)}% SOC at end`:'Unavailable'):
    assetPower===undefined?'Unavailable':`${assetPower.toFixed(2)} kW ${asset?.kind==='solar_array'?'generation':'demand'}`;
  return <div className="simulation-bar">
    <div className="simulation-controls">
      <button className="play-button" aria-label={playing?'Pause playback':'Play mission'} onClick={onPlay}><Icon name={playing?'pause':'play'}/>{playing?'Pause':'Play'}</button>
      <time className="timeline-time" data-testid="timeline-time" dateTime={current.start}>{current.start.replace('T',' ').replace('Z',' UTC')}</time>
      <div className="timeline-scrub" data-tour="timeline">
        {/* Event marks: actual event intervals from the stored run; first of each kind per interval. */}
        <div className="timeline-events" role="group" aria-label="Mission events">{events.filter((event,position,all)=>all.findIndex(other=>other.interval_index===event.interval_index&&other.kind===event.kind)===position).slice(0,200).map(event=>
          <button key={`${event.kind}-${event.interval_index}-${event.time}`} data-kind={event.kind} style={{left:`calc(${count>1?event.interval_index/(count-1)*100:0}% )`}}
            aria-label={`${EVENT_LABEL[event.kind]??event.kind} at ${event.time.replace('T',' ').replace('Z',' UTC')}`} title={`${EVENT_LABEL[event.kind]??event.kind} · ${event.time.slice(0,16).replace('T',' ')} UTC`} onClick={()=>onSelect(event.interval_index)}/>)}</div>
        <input type="range" aria-label="Mission interval" aria-valuetext={`${current.start}, interval ${index+1} of ${count}`} min={0} max={count-1} step={1} value={index} onChange={event=>onSelect(Number(event.target.value))}/><span>{index+1} / {count}</span></div>
      <Segmented className="speed" label="Playback speed" value={speed} onChange={onSpeed} options={[1,4,16].map(value=>({value,label:`${value}×`,title:`${value} simulation interval${value>1?'s':''} per real second`}))}/>
      <button className="timeline-toggle" onClick={onToggle} aria-expanded={expanded} aria-controls="mission-timeline-details" aria-label={expanded?'Collapse timeline':'Expand timeline'}>{expanded?'Close details':'View details'}<Icon name={expanded?'close':'simulate'}/></button>
    </div>
    <div className="simulation-current" aria-label="Current simulation interval">
      <span className="current-label" title="Power is averaged over this interval. Battery state is at interval end.">CURRENT</span>
      <div className="current-power" data-testid="timeline-power"><span className="current-metric"><span>Generation </span><span><strong data-testid="telemetry-generation">{current.generation_kw.toFixed(2)}</strong> kW</span></span><span className="current-metric"><span>Demand </span><span><strong data-testid="telemetry-demand">{current.demand_kw.toFixed(2)}</strong> kW</span></span></div>
      <span className="current-metric current-battery" title="Aggregate battery SOC at interval end"><span>Battery (end)</span><span><strong data-testid="timeline-soc"><span data-testid="telemetry-soc">{battery}</span></strong>{current.soc_end!==null&&<span className="battery-reserve" aria-hidden="true"><i style={{width:`${current.soc_end*100}%`}}/></span>}</span></span>
      <span className="current-metric"><span>Unserved</span><strong data-testid="telemetry-unserved">{current.unserved_kw.toFixed(2)} kW</strong></span>
      <span className="simulation-condition"><strong data-testid="timeline-power-status" className={current.unserved_kw>0?'failure':'nominal'}>{current.unserved_kw>0?'Power shortage':'Demand served'}</strong><span className="input-source-tag">{inputKind==='synthetic'?'Synthetic demonstration':'Hypothetical custom input'}</span></span>
      {asset&&<span className="selected-asset-current" title="Selected asset: values from this simulation interval">{asset.name}: <strong data-testid="selected-asset-telemetry">{assetValue}</strong></span>}
    </div>
  </div>;
}
