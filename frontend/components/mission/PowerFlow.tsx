"use client";
import type {SimulationRun} from '../../types/simulation';
import {explainInterval,kw,pct} from '../../lib/power-flow';
import {ASSET_LABEL} from './InfrastructureCatalog';
import Icon from '../ui/Icon';

/**
 * What is happening, why, and what changed in the selected interval. Every
 * number is a stored Python result (interval-average kW, end-of-interval SOC);
 * sentences come from fixed templates in lib/power-flow.ts.
 */
export default function PowerFlow({run,index,expanded,onExpanded,onTutorial}:{
  run:SimulationRun;index:number;expanded:boolean;onExpanded:(value:boolean)=>void;onTutorial:()=>void;
}) {
  const flow=explainInterval(run,index);
  const battery=flow.battery;
  return <section className="power-flow" aria-label="Power flow" data-status={flow.status} data-expanded={expanded}>
    <header>
      <span className="status-chip" data-tone={flow.tone} data-testid="mission-status" data-tour="status">{flow.status}</span>
      <p className="flow-system" data-tone={flow.tone} data-testid="power-flow-system">{flow.system}</p>
      <button className="flow-help" onClick={onTutorial} aria-label="How the simulation works" title="How the simulation works"><Icon name="help"/></button>
      <button className="flow-toggle" onClick={()=>onExpanded(!expanded)} aria-expanded={expanded} aria-label={expanded?'Hide power flow':'Show power flow'}><Icon name={expanded?'down':'chevron'}/></button>
    </header>
    {expanded&&<>
      <div className="flow-diagram">
        <div className="flow-column">
          <div className="flow-node" data-active={flow.generation_kw>0} data-tour="solar"><span><Icon name="solar_array"/>Solar</span><b data-testid="flow-generation">{kw(flow.generation_kw)}</b>
            {flow.input_factor!==null&&<small>Input factor {flow.input_factor} · hypothetical</small>}</div>
        </div>
        <div className="flow-arrow" aria-hidden="true" data-active={flow.generation_kw>0}/>
        <div className="flow-column flow-bus-column">
          <div className="flow-node flow-bus"><span>Power bus</span><small>{flow.surplus_kw>0?`+${kw(flow.surplus_kw)} surplus`:flow.deficit_kw>0?`−${kw(flow.deficit_kw)} deficit`:'balanced'}</small></div>
          <div className="flow-vertical" aria-hidden="true" data-mode={battery.mode}/>
          <div className="flow-node flow-battery" data-mode={battery.mode} data-tour="battery"><span><Icon name="battery"/>Battery</span>
            {battery.present?<><b data-testid="flow-battery">{battery.mode==='charging'?`+${kw(flow.charge_kw)}`:battery.mode==='discharging'?`−${kw(flow.discharge_kw)}`:'0.00 kW'}</b>
              <small data-testid="flow-soc">SOC {pct(battery.soc_start!)} → {pct(battery.soc_end!)}</small></>:<small>No batteries installed</small>}
          </div>
        </div>
        <div className="flow-arrow" aria-hidden="true" data-active={flow.demand_kw>0}/>
        <div className="flow-column" data-tour="loads">
          {flow.loads.length?flow.loads.map(load=><div className="flow-node flow-load" key={load.id} data-unserved={flow.unserved_kw>0}><span><Icon name={load.kind}/>{ASSET_LABEL[load.kind]}</span><b>{kw(load.kw)}</b><small>{load.name}</small></div>):
            <div className="flow-node flow-load"><span>No demand</span></div>}
          {flow.unserved_kw>0&&<div className="flow-node flow-unserved"><span>Unserved</span><b data-testid="flow-unserved">{kw(flow.unserved_kw)}</b></div>}
          {flow.curtailed_kw>0&&<div className="flow-node flow-curtailed"><span>Curtailed</span><b>{kw(flow.curtailed_kw)}</b></div>}
        </div>
      </div>
      <ol className="flow-lines" data-testid="power-flow-explanation">{flow.lines.map(line=><li key={line}>{line}</li>)}</ol>
      {flow.events.length>0&&<ul className="flow-events" aria-label="Events in this interval">{flow.events.map(event=><li key={`${event.time}${event.kind}`} data-kind={event.kind}>
        <time dateTime={event.time}>{event.time.slice(11,19)} UTC</time>{event.message}</li>)}</ul>}
      <p className="flow-note">Interval-average power; battery state at interval end. Sunlight input is hypothetical, not a lunar prediction.</p>
    </>}
  </section>;
}
