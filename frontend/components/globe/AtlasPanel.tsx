"use client";
import {useEffect,useState} from 'react';
import {fetchScientific} from '../../lib/api';
import type {AtlasDataset,AtlasPoint} from '../../types/atlas';
import type {GlobeLocation} from '../../types/globe';

export default function AtlasPanel({location,onClose}:{location:GlobeLocation|null;onClose:()=>void}) {
  const [catalog,setCatalog]=useState<AtlasDataset[]>([]),[dataset,setDataset]=useState('auto');
  const [point,setPoint]=useState<AtlasPoint|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false);
  const [query,setQuery]=useState('');
  useEffect(()=>{const abort=new AbortController();
    fetchScientific<AtlasDataset[]>('/atlas/datasets',abort.signal).then(setCatalog).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
    return ()=>abort.abort();},[]);
  useEffect(()=>{if(!location)return;const abort=new AbortController();setLoading(true);setPoint(null);setError(null);
    fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${location.latitude_deg}&longitude=${location.longitude_deg}&dataset=${dataset}`,abort.signal)
      .then(point=>{if(!abort.signal.aborted){setPoint(point);setLoading(false);}})
      .catch(error=>{if(!abort.signal.aborted){setError(error.message);setLoading(false);}});return ()=>abort.abort();},[location,dataset]);
  const source=catalog.find(value=>value.id===point?.dataset_id);
  return <aside className="atlas-panel" aria-label="Lunar atlas"><header><h2>Lunar atlas</h2><button onClick={onClose} aria-label="Close atlas">×</button></header>
    <p className="atlas-description">Scientific coverage, native measurements and source provenance.</p>
    <label>Terrain dataset<select aria-label="Atlas terrain dataset" value={dataset} onChange={e=>setDataset(e.target.value)}>
      <option value="auto">Best prepared global terrain</option>{catalog.filter(value=>value.category==='terrain'&&value.pixels_per_degree&&value.numerical_queries).map(value=><option key={value.id} value={value.id}>{value.name}</option>)}
    </select></label>
    {!location&&<p>Select the lunar surface or a destination to inspect its native data.</p>}
    {loading&&<p role="status">Loading native terrain…</p>}{error&&<p role="alert">{error}</p>}
    {point&&<section aria-label="Atlas terrain inspection"><p className="region-coordinate">{point.latitude_deg.toFixed(5)}° latitude / {point.longitude_deg.toFixed(5)}° E</p>
      <dl><dt>Elevation</dt><dd data-testid="atlas-elevation">{point.elevation.value===null?'Missing data':`${point.elevation.value.toLocaleString('en-US')} m`}</dd>
      <dt>Source</dt><dd>{point.elevation.source_id} {point.elevation.version}</dd><dt>Native spacing at sampled latitude</dt><dd>{point.elevation.spacing_north_m.toFixed(1)} m north / {point.elevation.spacing_east_m.toFixed(1)} m east</dd>
      <dt>Sampling</dt><dd>{point.elevation.method}</dd><dt>Terrain provenance</dt><dd>{point.terrain_source}</dd></dl>
      {source&&<details><summary>Measurement metadata</summary><p>{source.citation}</p><p>{point.frame_note}</p>{source.limitations.map(note=><p key={note}>{note}</p>)}<a href={source.source_url} target="_blank" rel="noreferrer">Original dataset documentation</a></details>}
    </section>}
    <section className="atlas-catalog"><h3>Dataset catalog</h3><label>Search science datasets<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Terrain, geology, thermal…" /></label>
      {catalog.filter(value=>`${value.name} ${value.category} ${value.instrument}`.toLowerCase().includes(query.toLowerCase())).map(value=><details key={value.id}><summary><span>{value.name}</span><small>{value.category} / {value.acquisition_status.replaceAll('_',' ')}</small></summary>
        <p>{value.organization} / {value.version}</p><p>{value.numerical_queries?'Numerical source available':'Numerical queries unavailable'}; {value.overlay_available?'3D overlay available':'3D overlay unavailable'}</p>
        <p>{value.coverage?`${value.coverage.south}° to ${value.coverage.north}° latitude; ${value.coverage.west}° to ${value.coverage.east}° E`:'Specific coverage not yet validated'}</p>
        <p>{value.spacing_m_at_equator?`${value.spacing_m_at_equator.toFixed(1)} m spacing (equatorial for cylindrical data)`:'Resolution requires product selection'}</p>
        <p>{value.citation}</p>{value.limitations.map(note=><p key={note}>{note}</p>)}<a href={value.source_url} target="_blank" rel="noreferrer">Source / discovery</a>
      </details>)}
    </section>
  </aside>;
}
