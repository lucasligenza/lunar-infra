"use client";
import {useEffect,useState} from 'react';
import {fetchScientific} from '../../lib/api';
import type {AtlasLayer,AtlasView,AtlasPoint} from '../../types/atlas';
import type {Region,LayerId} from '../../types/scientific';
import type {GlobeLocation} from '../../types/globe';
import AtlasLegend from '../globe/AtlasLegend';

export default function OverlayMenu({region,native,layerId,view,location,onLayer,onOpacity,onNative,onCoverage}:{
  region:Region|null;native:boolean;layerId:LayerId;view:AtlasView;location:GlobeLocation|null;
  onLayer:(id:string,layer?:AtlasLayer)=>void;onOpacity:(opacity:number)=>void;onNative:()=>void;onCoverage:()=>void;
}) {
  const [layers,setLayers]=useState<AtlasLayer[]>([]),[error,setError]=useState<string|null>(null);
  useEffect(()=>{const abort=new AbortController();fetchScientific<AtlasLayer[]>('/atlas/layers',abort.signal).then(setLayers).catch(error=>{if(!abort.signal.aborted)setError(error.message);});return()=>abort.abort();},[]);
  const terrain=view.dataset==='auto'?(layers.some(layer=>layer.dataset_id==='gld100')?'gld100':'lola-global'):view.dataset;
  const available=layers.filter(layer=>layer.dataset_id===terrain||['geology','temperature','illumination'].includes(layer.id));
  const selected=native?layerId:view.layer,layer=available.find(layer=>layer.id===selected);
  const local=region?.layers.find(layer=>layer.id===selected);
  const environmental=['illumination','temperature'].includes(selected);
  const [point,setPoint]=useState<AtlasPoint|null>(null),[coverageError,setCoverageError]=useState<string|null>(null);
  useEffect(()=>{setPoint(null);setCoverageError(null);if(!environmental||!location)return;const abort=new AbortController();
    fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${location.latitude_deg}&longitude=${location.longitude_deg}`,abort.signal).then(point=>{if(!abort.signal.aborted)setPoint(point);}).catch(error=>{if(!abort.signal.aborted)setCoverageError(error.message);});return()=>abort.abort();},[environmental,location]);
  const quantity=selected==='temperature'?point?.temperature:point?.solar_visibility;
  return <section className="overlay-menu" aria-label="Mission scientific overlays">
    <label>Surface layer<select aria-label="Mission scientific overlay" value={selected} onChange={event=>onLayer(event.target.value,available.find(layer=>layer.id===event.target.value))}>
      <option value="none">NASA imagery · 3D</option>
      {available.map(layer=><option key={layer.id} value={layer.id}>{native&&region?.layers.some(value=>value.id===layer.id)?`${region.layers.find(value=>value.id===layer.id)!.name} · native 2D`:layer.name}{layer.preparation_status==='not_prepared'?' · not prepared locally':''}</option>)}
    </select></label>
    {error&&<p role="alert">{error}</p>}
    <p className="overlay-availability">{native?'Prepared native terrain':selected==='none'?'Prepared NASA imagery':layer?.preparation_status==='not_prepared'?'Unavailable · not prepared locally':layer?'Available · rendering status is shown on the surface':'Layer metadata unavailable'}</p>
    {selected!=='none'&&<label>Opacity {Math.round(view.opacity*100)}%<input type="range" aria-label="Mission layer opacity" min={0} max={1} step={.05} value={view.opacity} onChange={event=>onOpacity(Number(event.target.value))}/></label>}
    {native&&local?<><div className="legend-ramp" style={{background:`linear-gradient(90deg,${local.colors.join(',')})`}}/><div className="legend-values"><span>{local.unit==='fraction'?`${local.minimum*100}%`:`${local.minimum} ${local.unit}`}</span><span>{local.unit==='fraction'?`${local.maximum*100}%`:`${local.maximum} ${local.unit}`}</span></div></>:layer&&<AtlasLegend layer={layer}/>}
    {environmental&&<div className="overlay-coverage"><p role="status">{layer?.preparation_status==='not_prepared'?'Unavailable · source is not prepared locally.':coverageError?'Coverage check unavailable.':!location?'Select a location to check coverage.':!point?'Checking native coverage…':quantity?.status==='unavailable'?'Outside the prepared south-pole region.':quantity?.status==='nodata'?'Missing source data at this location.':'Available at this location.'} Limited polar coverage; gaps remain transparent.</p><button disabled={layer?.preparation_status==='not_prepared'} onClick={onCoverage}>Go to supported region</button>
      <details><summary>Scientific context</summary><p>{selected==='temperature'?'Historical Diviner summer brightness temperature, 00:00–00:15 local time. Not current surface or habitat temperature.':'Modeled long-term average solar visibility. Not a time-resolved illumination profile for power simulation.'}</p></details></div>}
    {region&&!native&&<button onClick={onNative}>Use native 2D terrain</button>}
  </section>;
}
