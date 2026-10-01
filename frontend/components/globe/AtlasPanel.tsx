"use client";
import {useEffect,useState} from 'react';
import {fetchScientific} from '../../lib/api';
import type {AtlasDataset,AtlasPoint,AtlasView,AtlasLayer,AtlasSector,AtlasAnalysisState,DiscoveryProvider} from '../../types/atlas';
import type {GlobeLocation} from '../../types/globe';
import AtlasRegions from './AtlasRegions';
import AtlasAnalysis from './AtlasAnalysis';
import AtlasLegend from './AtlasLegend';
import DatasetDiscovery from './DatasetDiscovery';
import DatasetAcquisition from './DatasetAcquisition';

export default function AtlasPanel({location,onClose,view,onView,overlayStatus,sector,onSector,onSelect,analysis,onAnalysis,analysisMode=false}:{location:GlobeLocation|null;onClose:()=>void;view:AtlasView;onView:(view:AtlasView)=>void;overlayStatus:string;
  sector:AtlasSector|null;onSector:(sector:AtlasSector|null)=>void;onSelect:(location:GlobeLocation,distance?:number)=>void;analysis:AtlasAnalysisState;onAnalysis:(state:AtlasAnalysisState)=>void;analysisMode?:boolean}) {
  const [catalog,setCatalog]=useState<AtlasDataset[]>([]),[layers,setLayers]=useState<AtlasLayer[]>([]);
  const [providers,setProviders]=useState<DiscoveryProvider[]>([]),[providerError,setProviderError]=useState<string|null>(null);
  const dataset=view.dataset;
  const [point,setPoint]=useState<AtlasPoint|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false);
  const [query,setQuery]=useState('');
  const [tab,setTab]=useState(analysisMode?'analysis':'layers');
  useEffect(()=>{if(analysisMode)setTab('analysis');},[analysisMode]);
  useEffect(()=>{const abort=new AbortController();
    fetchScientific<AtlasDataset[]>('/atlas/datasets',abort.signal).then(setCatalog).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
    fetchScientific<AtlasLayer[]>('/atlas/layers',abort.signal).then(setLayers).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
    fetchScientific<DiscoveryProvider[]>('/atlas/providers',abort.signal).then(setProviders).catch(()=>{if(!abort.signal.aborted)setProviderError('Discovery provider registry unavailable. Reopen the atlas to retry.');});
    return ()=>abort.abort();},[]);
  useEffect(()=>{if(!location)return;const abort=new AbortController();setLoading(true);setPoint(null);setError(null);
    fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${location.latitude_deg}&longitude=${location.longitude_deg}&dataset=${dataset}`,abort.signal)
      .then(point=>{if(!abort.signal.aborted){setPoint(point);setLoading(false);}})
      .catch(error=>{if(!abort.signal.aborted){setError(error.message);setLoading(false);}});return ()=>abort.abort();},[location,dataset]);
  const source=catalog.find(value=>value.id===point?.dataset_id);
  const selectedDataset=dataset==='auto'?(catalog.find(value=>value.id==='gld100'&&value.numerical_queries)?.id??'lola-global'):dataset;
  const layer=layers.find(value=>(value.dataset_id===selectedDataset||value.id==='geology')&&value.id===view.layer);
  return <aside className="atlas-panel" aria-label="Lunar atlas"><header><h2>Lunar atlas</h2><button onClick={onClose} aria-label="Close atlas">×</button></header>
    <nav className="atlas-tabs" aria-label="Atlas tools">{[['layers','Layers'],['regions','Regions'],['analysis','Analysis'],['catalog','Catalog']].map(([value,label])=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</nav>
    <div className="atlas-content"><p className="atlas-description">Scientific coverage, native measurements and source provenance.</p>
    {tab==='regions'&&<AtlasRegions location={location} sector={sector} onSector={onSector} onSelect={onSelect}/>}
    <div hidden={tab==='regions'||tab==='catalog'}>
    <label>Terrain dataset<select aria-label="Atlas terrain dataset" value={dataset} onChange={e=>onView({...view,dataset:e.target.value})}>
      <option value="auto">Best prepared global terrain</option>{catalog.filter(value=>value.category==='terrain'&&value.pixels_per_degree&&value.numerical_queries).map(value=><option key={value.id} value={value.id}>{value.name}</option>)}
    </select></label>
    {tab==='analysis'&&<AtlasAnalysis location={location} dataset={dataset} state={analysis} onState={onAnalysis}/>}
    <div hidden={tab!=='layers'}>
    <section className="atlas-layer-tools" aria-label="Scientific surface layers">
      <label>Scientific overlay<select aria-label="Scientific overlay" value={view.layer} onChange={e=>onView({...view,layer:e.target.value})}><option value="none">Imagery only</option>
        {layers.filter(value=>value.dataset_id===selectedDataset||value.id==='geology').map(value=><option value={value.id} key={value.id}>{value.name}</option>)}</select></label>
      {layer&&<><label>Layer opacity {Math.round(view.opacity*100)}%<input aria-label="Scientific layer opacity" type="range" min={0} max={1} step={.05} value={view.opacity} onChange={e=>onView({...view,opacity:Number(e.target.value)})} /></label>
        <AtlasLegend layer={layer}/>
        <p role={overlayStatus.includes('unavailable')?'alert':'status'} data-testid="atlas-overlay-status">{overlayStatus}</p>
        {overlayStatus.includes('unavailable')&&<button onClick={()=>onView({...view,reload:(view.reload??0)+1})}>Retry scientific layer</button>}
        <label><input type="checkbox" checked={view.compare} onChange={e=>onView({...view,compare:e.target.checked})}/>Compare imagery and science</label>
        {view.compare&&<label>Reveal position<input aria-label="Comparison reveal" type="range" min={.05} max={.95} step={.01} value={view.reveal} onChange={e=>onView({...view,reveal:Number(e.target.value)})}/></label>}
      </>}
    </section>
    {!location&&<p>Select the lunar surface or a destination to inspect its native data.</p>}
    {loading&&<p role="status">Loading native terrain…</p>}{error&&<p role="alert">{error}</p>}
    {point&&<section aria-label="Atlas terrain inspection"><p className="region-coordinate">{point.latitude_deg.toFixed(5)}° latitude / {point.longitude_deg.toFixed(5)}° E</p>
      <dl><dt>Elevation</dt><dd data-testid="atlas-elevation">{point.elevation.value===null?'Missing data':`${point.elevation.value.toLocaleString('en-US')} m`}</dd>
      <dt>Source</dt><dd>{point.elevation.source_id} {point.elevation.version}</dd><dt>Native spacing at sampled latitude</dt><dd>{point.elevation.spacing_north_m.toFixed(1)} m north / {point.elevation.spacing_east_m.toFixed(1)} m east</dd>
      <dt>Sampling</dt><dd>{point.elevation.method}</dd><dt>Derived slope</dt><dd data-testid="atlas-slope">{point.slope.value===null?'Missing stencil':`${point.slope.value.toFixed(3)}°`}</dd>
      <dt>Slope support</dt><dd>{point.slope.support_north_m.toFixed(1)} m north / {point.slope.support_east_m.toFixed(1)} m east</dd><dt>Terrain provenance</dt><dd>{point.terrain_source}</dd></dl>
      {source&&<details><summary>Measurement metadata</summary><p>{source.citation}</p><p>{point.frame_note}</p>{source.limitations.map(note=><p key={note}>{note}</p>)}<a href={source.source_url} target="_blank" rel="noreferrer">Original dataset documentation</a></details>}
      <div className="geologic-inspection" aria-label="Geological interpretation"><h3>Geological interpretation</h3>
        {point.geology?<><p data-testid="atlas-geology">{point.geology.category?`${point.geology.category.code} / ${point.geology.category.name}`:'Missing mapped class'}</p>
          <p>{point.geology.source_id} {point.geology.version} / 1:5,000,000 source map; categorical grid 16 ppd.</p>
          <details><summary>Geology source and interpretation</summary><p>{point.geology.category?.description}</p><p>{point.geology.category?.interpretation}</p>
            {point.geology.category?.source_note&&<p>{point.geology.category.source_note}</p>}<p>{point.geology.frame_note}</p><p>{point.geology.method}</p><p>Interpretive units do not establish an extractable resource or construction-scale contact.</p></details></>:
          <p>Geology is not prepared. The catalog provides its verified acquisition source.</p>}
      </div>
    </section>}
    </div></div>
    <section className="atlas-catalog" hidden={tab!=='catalog'}><h3>Dataset catalog</h3><label>Search science datasets<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Terrain, geology, thermal…" /></label>
      {providerError&&<p role="alert">{providerError}</p>}
      {catalog.filter(value=>`${value.name} ${value.category} ${value.instrument}`.toLowerCase().includes(query.toLowerCase())).map(value=><details key={value.id}><summary><span>{value.name}</span><small>{value.category} / {value.acquisition_status.replaceAll('_',' ')}</small></summary>
        <p>{value.organization} / {value.version}</p><p>{value.numerical_queries?'Numerical source available':'Numerical queries unavailable'}; {value.overlay_available?'3D overlay available':'3D overlay unavailable'}</p>
        <p>{value.coverage?`${value.coverage.south}° to ${value.coverage.north}° latitude; ${value.coverage.west}° to ${value.coverage.east}° E`:'Specific coverage not yet validated'}</p>
        <p>{value.spacing_m_at_equator?`${value.spacing_m_at_equator.toFixed(1)} m spacing (equatorial for cylindrical data)`:'Resolution requires product selection'}</p>
        <p>Units: {value.unit}. {value.longitude_convention}.</p><p>{value.crs}</p><p>{value.frame_note}</p>
        <p>Source period: {value.period.start??'unspecified'} through {value.period.stop??'unspecified'}.</p>
        <p>{value.citation}</p>{value.limitations.map(note=><p key={note}>{note}</p>)}<a href={value.source_url} target="_blank" rel="noreferrer">Source / discovery</a>
        {['pds_equirectangular','range_zip_geology'].includes(value.adapter)&&<DatasetAcquisition dataset={value.id}/>}
        {providers.filter(provider=>provider.dataset_id===value.id).map(provider=><DatasetDiscovery key={provider.id} provider={provider}/>)}
      </details>)}
    </section>
    </div>
  </aside>;
}
