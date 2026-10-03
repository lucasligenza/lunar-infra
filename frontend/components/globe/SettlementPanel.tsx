"use client";
import type {ReactNode} from 'react';
import type {SettlementState} from '../../lib/useSettlement';
import type {GlobeLocation} from '../../types/globe';
import type {Candidate,ScoreBand} from '../../types/suitability';
import {surfaceDistanceKm} from '../../lib/lunar';
import Segmented from '../ui/Segmented';
import Icon from '../ui/Icon';

export const BAND_LABEL:Record<ScoreBand,string>={strong:'Strong screening fit',promising:'Promising',mixed:'Mixed',constrained:'Constrained'};
const GROUP_LABEL=(group:string)=>group.includes('terrain-only')?'Terrain-only candidates':'Terrain and sunlight candidates';
const letter=(index:number)=>String.fromCharCode(65+index);

function Bar({value}:{value:number|null}) {
  return <span className="score-bar" aria-hidden="true"><i style={{width:`${(value??0)*100}%`}}/></span>;
}

/** One candidate card: preliminary screening score first, evidence on demand. */
function CandidateCard({candidate,label,selected,distance,onSelect,children}:{candidate:Candidate;label:string;selected:boolean;distance:number|null;onSelect:()=>void;children?:ReactNode}) {
  const [terrain,solar]=candidate.score_components;
  return <article className="candidate-result candidate-card" data-band={candidate.score_band} data-selected={selected}>
    <button className="candidate-summary" onClick={onSelect} aria-pressed={selected} aria-label={`Inspect ${candidate.id}`}>
      <span className="candidate-title"><span className="candidate-rank">#{candidate.rank_in_group}</span><strong>{label}</strong>
        <span className="candidate-score" data-testid={`score-${candidate.id}`}>{candidate.screening_score.toFixed(0)}%</span></span>
      <span className="candidate-band"><i aria-hidden="true"/>{BAND_LABEL[candidate.score_band]}{candidate.data_completeness<1&&<em>Incomplete evidence</em>}</span>
      <span className="candidate-metrics">
        <span>{terrain.label}</span><span className="metric-bar"><Bar value={terrain.value}/><b>{terrain.value===null?'—':(terrain.value*100).toFixed(0)}</b></span>
        <span>{solar.label}</span><span className="metric-bar">{solar.evaluated?<><Bar value={solar.value}/><b>{(solar.value!*100).toFixed(0)}</b></>:<small>Not evaluated</small>}</span>
        <span>Data completeness</span><span className="metric-bar"><b>{(candidate.data_completeness*100).toFixed(0)}%</b></span>
      </span>
      <span className="candidate-meta">{(candidate.low_slope_fraction*100).toFixed(0)}% low-slope terrain{candidate.solar_visibility!==null?` · ${(candidate.solar_visibility*100).toFixed(0)}% average solar visibility`:''}{distance!==null&&` · ${distance<1?`${(distance*1000).toFixed(0)} m`:`${distance.toFixed(1)} km`} from search center`}</span>
    </button>
    {selected&&children}
  </article>;
}

export default function SettlementPanel({state,location,selected,onSelect,onMission,gridControls}:{
  state:SettlementState;location:GlobeLocation|null;selected:Candidate|null;onSelect:(point:Candidate)=>void;onMission:()=>void;gridControls?:ReactNode;
}) {
  const {report,settings,setSettings,loading,error}=state;
  const groups=[...new Set(report?.candidates.map(candidate=>candidate.evidence_group)??[])];
  const center=report?.request.area;
  const labels=new Map(report?.candidates.map((candidate,index)=>[candidate.id,`Candidate ${letter(index)}`])??[]);
  const form=<form onSubmit={event=>{event.preventDefault();if(location)void state.search(location);}}>
    <details className="screening-settings"><summary>Screening settings</summary>
      <label>Search radius (km)<input required type="number" min={1} max={600} value={settings.radius} onChange={event=>setSettings({...settings,radius:event.target.value})}/></label>
      <label>Neighborhood radius (km)<input required type="number" min={1} max={50} value={settings.neighborhood} onChange={event=>setSettings({...settings,neighborhood:event.target.value})}/></label>
      <label>Low-slope threshold (degrees)<input required type="number" min={0} max={30} step="any" value={settings.slope} onChange={event=>setSettings({...settings,slope:event.target.value})}/></label>
      <Segmented label="Screening terrain" value={settings.dataset} onChange={dataset=>setSettings({...settings,dataset})} options={[{value:'auto',label:'Best',title:'Best supporting terrain'},{value:'gld100',label:'GLD100',title:'Global GLD100'},{value:'lola-global',label:'LOLA',title:'Coarser LOLA overview'}]}/>
      <p>The slope threshold is an editable screening assumption, not a construction limit.</p>
    </details>
    <button className="primary-button" type="submit" disabled={!location||loading}>{loading?'Finding candidates…':report?'Search again':'Find settlement sites'}</button>
  </form>;
  return <section aria-label="Settlement suitability" className="settlement-panel">
    {!report&&!loading&&<p className="screening-intro">Compare nearby neighborhoods for a protected outpost using native terrain slope and, where prepared, modeled average solar visibility.</p>}
    {!location&&<p>Select a location on the Moon to begin.</p>}
    {loading&&<p role="status" className="location-loading"><span className="loading-ring"/>Evaluating native terrain and available environmental evidence…</p>}
    {error&&<p role="alert">{error}</p>}
    {report&&center&&<p className="screening-context" data-testid="candidate-search-context">Within {report.request.area.radius_km} km of {center.latitude_deg.toFixed(3)}° / {center.longitude_deg.toFixed(3)}° E · {report.candidates.length} candidates</p>}
    {report?.warnings.map(warning=><p className="warning" key={warning}>{warning}</p>)}
    {report&&!report.candidates.length&&<p>No supported candidate neighborhoods. Try a larger area or a different terrain dataset.</p>}
    {groups.map(group=>{const terrainOnly=group.includes('terrain-only');return <section key={group} className="candidate-group" aria-label={GROUP_LABEL(group)}>
      <header><h3>{terrainOnly?'Terrain only':'Terrain + sunlight'}</h3><small>{terrainOnly?'Sunlight not evaluated here · max 50%':'Complete evidence · ranks within this group'}</small></header>
      {report!.candidates.filter(candidate=>candidate.evidence_group===group).map(candidate=><CandidateCard key={candidate.id} candidate={candidate} label={labels.get(candidate.id)!}
        selected={selected?.id===candidate.id} distance={center?surfaceDistanceKm(center,candidate):null} onSelect={()=>onSelect(candidate)}>
        <div className="candidate-detail">
          {gridControls}
          <button className="primary-button" onClick={onMission}><Icon name="build"/>Create mission at selected location</button>
          <details><summary>Why this score?</summary>
            <ul className="score-breakdown">{candidate.score_components.map(component=><li key={component.criterion}><span>{component.label} × {component.weight}</span>
              <b>{component.evaluated?`+${component.contribution.toFixed(1)}`:'+0 (not evaluated)'}</b><small>{component.basis}</small></li>)}</ul>
            <p>Preliminary screening score = 100 × (0.5 × low-slope area fraction + 0.5 × mean modeled solar visibility). Missing evidence contributes zero and never raises the score.</p>
          </details>
          <details><summary>Why this candidate?</summary>{candidate.reasons.map(reason=><p key={reason}>{reason}</p>)}
            {candidate.temperature_at_center?.status==='ok'&&<p>Descriptive, not scored: {candidate.temperature_at_center.value!.toFixed(1)} K center brightness temperature (one summer local-time bin).</p>}
            <p>{candidate.source_id} {candidate.version} · {Math.round(candidate.spacing_m)} m native spacing · {candidate.radius_km.toFixed(1)} km neighborhood</p>
            {candidate.unknowns.map(note=><p key={note}>{note}</p>)}</details>
        </div>
      </CandidateCard>)}
    </section>;})}
    {form}
    {report&&<details className="screening-method"><summary>Method and sources</summary>{report.assumptions.map(note=><p key={note}>{note}</p>)}<p>{report.model_version} / {report.score_method}; {report.evaluated_centers} sampled centers.</p>{report.sources.map(source=><p key={source.id}><a href={source.source_url} target="_blank" rel="noreferrer">{source.name}</a> / {source.version}</p>)}</details>}
    <p className="screening-disclaimer">Preliminary screening score: a relative engineering-screening aid. Not habitability, construction safety or mission-success probability. Power playback still requires hypothetical temporal input.</p>
  </section>;
}
