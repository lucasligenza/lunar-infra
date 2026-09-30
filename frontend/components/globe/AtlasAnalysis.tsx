"use client";
import {useEffect,useRef,useState} from 'react';
import {calculateScientific} from '../../lib/api';
import type {AtlasAnalysisState,AreaReport,ProfileReport} from '../../types/atlas';
import type {GlobeLocation} from '../../types/globe';

function download(name:string,payload:string,type:string) {
  const url=URL.createObjectURL(new Blob([payload],{type})),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export default function AtlasAnalysis({location,dataset,state,onState}:{location:GlobeLocation|null;dataset:string;state:AtlasAnalysisState;onState:(state:AtlasAnalysisState)=>void}) {
  const [error,setError]=useState<string|null>(null),[busy,setBusy]=useState(false),[cursor,setCursor]=useState<number|null>(null);
  const operation=useRef<AbortController|null>(null),latest=useRef(state);latest.current=state;
  useEffect(()=>()=>operation.current?.abort(),[]);
  async function run(kind:'area'|'profile') {
    if(!location)return;operation.current?.abort();const abort=new AbortController();operation.current=abort;setError(null);setBusy(true);
    try {
      if(kind==='area') {
        const area=state.kind==='circle'?{kind:'circle',latitude_deg:location.latitude_deg,longitude_deg:location.longitude_deg,radius_km:Number(state.radius)}:
          {kind:'box',...Object.fromEntries(Object.entries(state.bounds).map(([key,value])=>[key,Number(value)]))};
        const report=await calculateScientific<AreaReport>('/atlas/analysis',{dataset,area},abort.signal);
        if(!abort.signal.aborted)onState({...latest.current,report});
      } else {
        const profile=await calculateScientific<ProfileReport>('/atlas/profile',{dataset,start:{latitude_deg:location.latitude_deg,longitude_deg:location.longitude_deg},
          end:{latitude_deg:Number(state.endpoint.latitude),longitude_deg:Number(state.endpoint.longitude)},samples:128},abort.signal);
        if(!abort.signal.aborted){onState({...latest.current,profile});setCursor(null);}
      }
    }catch(error){if(!abort.signal.aborted)setError((error as Error).message);}finally{if(!abort.signal.aborted)setBusy(false);}
  }
  const report=state.report,profile=state.profile;
  const valid=profile?.samples.flatMap(sample=>sample.elevation_m===null?[]:[sample.elevation_m])??[];
  const low=valid.length?Math.min(...valid):0,high=valid.length?Math.max(...valid):1;
  const points=profile?.samples.map(sample=>sample.elevation_m===null?null:[90+sample.distance_km/profile.distance_km*475,165-(sample.elevation_m-low)/Math.max(1,high-low)*140]);
  let path='';points?.forEach((point,i)=>{if(point)path+=`${!i||!points[i-1]?'M':'L'}${point[0]},${point[1]} `;});
  const selected=cursor===null?null:profile?.samples[cursor];
  return <section className="atlas-analysis" aria-label="Regional atlas analysis"><h3>Regional analysis</h3>
    <p>{location?`Center / profile start: ${location.latitude_deg.toFixed(5)}° / ${location.longitude_deg.toFixed(5)}° E`:'Select a lunar location to analyze an area or profile.'}</p>
    <form onSubmit={e=>{e.preventDefault();void run('area');}}><label>Analysis area<select value={state.kind} onChange={e=>onState({...state,kind:e.target.value as 'circle'|'box'})}><option value="circle">Radius around selected location</option><option value="box">Geographic extent</option></select></label>
      {state.kind==='circle'?<label>Analysis radius (km)<input required type="number" min={1} max={600} step="any" value={state.radius} onChange={e=>onState({...state,radius:e.target.value})}/></label>:
        <div className="area-bounds">{(['south','north','west','east'] as const).map(key=><label key={key}>{key} (°{key==='west'||key==='east'?' E':''})<input required type="number" min={key==='south'||key==='north'?-90:-180} max={key==='south'||key==='north'?90:360} step="any" value={state.bounds[key]} onChange={e=>onState({...state,bounds:{...state.bounds,[key]:e.target.value}})}/></label>)}<p>West to east wraps across 0° when east is smaller.</p></div>}
      <button className="primary-button" disabled={!location||busy}>Calculate regional statistics</button></form>
    {report&&<section aria-label="Regional terrain statistics"><h4>Native terrain statistics</h4><p>{report.source_id} {report.version} / {report.resolution.north_south_spacing_m.toFixed(1)} m north–south spacing</p>
      <p>{report.area.kind==='circle'?`Computed ${report.area.radius_km} km radius at ${report.area.latitude_deg}° / ${report.area.longitude_deg}° E`:`Computed extent ${report.area.south}°–${report.area.north}° latitude, ${report.area.west}°–${report.area.east}° E`}. Edit inputs and calculate again to update results.</p>
      <dl>{(['elevation','slope'] as const).map(kind=><div key={kind}><dt>{kind} / min · mean · max</dt><dd data-testid={`area-${kind}`}>{[report[kind].minimum,report[kind].mean,report[kind].maximum].map(value=>value===null?'missing':value.toFixed(kind==='slope'?2:1)).join(' · ')} {report[kind].unit}</dd></div>)}
        <dt>Terrain relief / max minus min</dt><dd>{report.terrain_relief_m===null?'missing':`${report.terrain_relief_m.toFixed(1)} m`}</dd>
        <dt>Selected surface area</dt><dd>{report.selected_area_km2.toFixed(2)} km² / {report.selected_cells.toLocaleString()} cells</dd><dt>Valid elevation coverage</dt><dd>{report.elevation.valid_area_km2.toFixed(2)} km²</dd></dl>
      <div className="slope-distribution" aria-label="Area-weighted slope distribution">{report.slope_distribution.map(bin=><div key={bin.minimum_deg}><span>{bin.minimum_deg}–{bin.maximum_deg}°</span><meter min={0} max={1} value={bin.fraction_of_valid_slope_area??0}/><span>{bin.fraction_of_valid_slope_area===null?'missing':`${(bin.fraction_of_valid_slope_area*100).toFixed(1)}%`}</span></div>)}</div>
      <details><summary>Methods and limitations</summary><p>{report.weighting_method}</p><p>{report.frame_note}</p>{report.warnings.map(note=><p key={note}>{note}</p>)}</details>
      <button onClick={()=>download('lunar-region-analysis.json',JSON.stringify(report,null,2),'application/json')}>Export regional JSON</button></section>}
    <form onSubmit={e=>{e.preventDefault();void run('profile');}}><h4>Elevation profile</h4><p>Shortest lunar great circle from the selected location to this endpoint.</p><div className="area-bounds">
      <label>Profile endpoint latitude (°)<input required type="number" min={-90} max={90} step="any" value={state.endpoint.latitude} onChange={e=>onState({...state,endpoint:{...state.endpoint,latitude:e.target.value}})}/></label>
      <label>Profile endpoint longitude (° E)<input required type="number" min={-180} max={360} step="any" value={state.endpoint.longitude} onChange={e=>onState({...state,endpoint:{...state.endpoint,longitude:e.target.value}})}/></label></div>
      <button disabled={!location||busy}>Generate elevation profile</button></form>
    {profile&&<figure className="elevation-profile"><figcaption>{profile.source_id} / {profile.distance_km.toFixed(2)} km great-circle profile</figcaption>
      <svg viewBox="0 0 600 210" role="img" aria-label="Numeric elevation profile"><path d="M90 20 V165 H565" className="profile-axis"/><path d={path} className="profile-line"/>
        <text x={0} y={25}>{high.toFixed(0)} m</text><text x={0} y={165}>{low.toFixed(0)} m</text><text x={45} y={190}>0 km</text><text x={455} y={190}>{profile.distance_km.toFixed(2)} km</text>
        {cursor!==null&&points?.[cursor]&&<circle cx={points[cursor]![0]} cy={points[cursor]![1]} r={4}/>}</svg>
      <label>Inspect profile sample<input type="range" min={0} max={profile.samples.length-1} step={1} value={cursor??0} onChange={e=>setCursor(Number(e.target.value))}/></label>
      {selected&&<p>{selected.distance_km.toFixed(2)} km / {selected.elevation_m===null?'missing elevation':`${selected.elevation_m} m`} / {selected.latitude_deg.toFixed(4)}° / {selected.longitude_deg.toFixed(4)}° E</p>}
      {profile.warnings.map(note=><p key={note}>{note}</p>)}<button onClick={()=>download('lunar-elevation-profile.csv',`# ${profile.source_id} ${profile.version}; ${profile.method}\ndistance_km,latitude_deg,longitude_deg,elevation_m,status\n`+profile.samples.map(value=>[value.distance_km,value.latitude_deg,value.longitude_deg,value.elevation_m??'',value.status].join(',')).join('\n'),'text/csv')}>Export profile CSV</button></figure>}
    {busy&&<p role="status">Calculating native numeric terrain…</p>}{error&&<p role="alert">{error}</p>}
  </section>;
}
