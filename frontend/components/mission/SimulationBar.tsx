"use client";
import type {Interval} from '../../types/simulation';
import type {Asset} from '../../types/mission';
import Icon from '../ui/Icon';

export default function SimulationBar({current,index,count,playing,expanded,speed,inputKind,asset,onToggle,onPlay,onSpeed,onSelect}:{
  current:Interval;index:number;count:number;playing:boolean;expanded:boolean;speed:number;inputKind:string;
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
      <div className="timeline-scrub"><input type="range" aria-label="Mission interval" aria-valuetext={`${current.start}, interval ${index+1} of ${count}`} min={0} max={count-1} step={1} value={index} onChange={event=>onSelect(Number(event.target.value))}/><span>{index+1} / {count}</span></div>
      <select aria-label="Playback speed" title="Simulation intervals per real second" value={speed} onChange={event=>onSpeed(Number(event.target.value))}><option value={1}>1×</option><option value={4}>4×</option><option value={16}>16×</option></select>
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
