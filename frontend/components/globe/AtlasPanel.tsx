"use client";
import {useEffect,useState} from 'react';
import {fetchScientific} from '../../lib/api';
import type {AtlasDataset,AtlasPoint,AtlasView,AtlasLayer,AtlasSector,AtlasAnalysisState,DiscoveryProvider} from '../../types/atlas';
import type {GlobeLocation} from '../../types/globe';
import SettlementPanel from './SettlementPanel';
import type {SettlementState} from '../../lib/useSettlement';
import AtlasRegions from './AtlasRegions';
import AtlasAnalysis from './AtlasAnalysis';
import AtlasLegend from './AtlasLegend';
import DatasetDiscovery from './DatasetDiscovery';
import DatasetAcquisition from './DatasetAcquisition';

export default function AtlasPanel({location,onClose,view,onView,overlayStatus,sector,onSector,onSelect,analysis,onAnalysis,analysisMode=false,request,settlement,onMission}:{location:GlobeLocation|null;onClose:()=>void;view:AtlasView;onView:(view:AtlasView)=>void;overlayStatus:string;
  settlement:SettlementState;onMission:()=>void;
  request?:{tab:string;serial:number}|null;
  sector:AtlasSector|null;onSector:(sector:AtlasSector|null)=>void;onSelect:(location:GlobeLocation,distance?:number)=>void;analysis:AtlasAnalysisState;onAnalysis:(state:AtlasAnalysisState)=>void;analysisMode?:boolean}) {
  const [catalog,setCatalog]=useState<AtlasDataset[]>([]),[layers,setLayers]=useState<AtlasLayer[]>([]);
  const [providers,setProviders]=useState<DiscoveryProvider[]>([]),[providerError,setProviderError]=useState<string|null>(null);
  const dataset=view.dataset;
  const [point,setPoint]=useState<AtlasPoint|null>(null),[error,setError]=useState<string|null>(null),[loading,setLoading]=useState(false);
  const [query,setQuery]=useState('');
  const [tab,setTab]=useState(analysisMode?'analysis':'layers');
  const [advanced,setAdvanced]=useState(analysisMode);
  useEffect(()=>{if(request&&request.tab!=='layers'&&request.tab!=='sites')setAdvanced(true);},[request]);
  useEffect(()=>{if(analysisMode)setTab('analysis');},[analysisMode]);
  useEffect(()=>{if(request)setTab(request.tab);},[request]);
  useEffect(()=>{const abort=new AbortController();
    fetchScientific<AtlasDataset[]>('/atlas/datasets',abort.signal).then(setCatalog).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
    fetchScientific<AtlasLayer[]>('/atlas/layers',abort.signal).then(setLayers).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
    fetchScientific<DiscoveryProvider[]>('/atlas/providers',abort.signal).then(setProviders).catch(()=>{if(!abort.signal.aborted)setProviderError('Discovery provider registry unavailable. Reopen the atlas to retry.');});
    return ()=>abort.abort();},[]);
  useEffect(()=>{if(!location)return;const abort=new AbortController();setLoading(true);setPoint(null);setError(null);
    fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${location.latitude_deg}&longitude=${location.longitude_deg}&dataset=${dataset==='auto'?'best':dataset}`,abort.signal)
      .then(point=>{if(!abort.signal.aborted){setPoint(point);setLoading(false);}})
      .catch(error=>{if(!abort.signal.aborted){setError(error.message);setLoading(false);}});return ()=>abort.abort();},[location,dataset]);
  const source=catalog.find(value=>value.id===point?.dataset_id);
  const selectedDataset=dataset==='auto'?(catalog.find(value=>value.id==='gld100'&&value.numerical_queries)?.id??'lola-global'):dataset;
  const availableLayers=layers.filter(value=>value.dataset_id===selectedDataset||Boolean(catalog.find(source=>source.id===value.dataset_id&&source.category!=='terrain')));
  const layer=availableLayers.find(value=>value.id===view.layer);
  useEffect(()=>{if(layer&&(view.tileUrl!==layer.url_template||view.preparation!==(layer.preparation_status??'ready')))onView({...view,tileUrl:layer.url_template,preparation:layer.preparation_status??'ready'});},[layer?.url_template,layer?.preparation_status,view.tileUrl,view.preparation]);
  const environmental=['temperature','illumination'].includes(view.layer);
  const quantity=view.layer==='temperature'?point?.temperature:point?.solar_visibility;
  return <aside className="atlas-panel" aria-label="Lunar atlas"><header><h2>{tab==='sites'?'Settlement suitability':'Scientific overlays'}</h2><button onClick={onClose} aria-label="Close atlas">×</button></header>
    <div className="atlas-disclosure"><button aria-expanded={advanced} onClick={()=>{setAdvanced(!advanced);setTab('layers');}}>Advanced</button>
    {advanced&&<nav className="atlas-tabs" aria-label="Atlas tools">{[['layers','Layers'],['regions','Regions'],['analysis','Analysis'],['catalog','Catalog']].map(([value,label])=><button key={value} aria-pressed={tab===value} onClick={()=>setTab(value)}>{label}</button>)}</nav>}</div>
    <div className="atlas-content">
    {tab==='sites'?<><button onClick={()=>setTab('layers')}>Back to overlays</button><SettlementPanel state={settlement} location={location} onSelect={candidate=>onSelect(candidate,1.08)} onMission={onMission}/></>:<><p className="atlas-description">Color the Moon with real scientific data.</p>
    {tab==='regions'&&<AtlasRegions location={location} sector={sector} onSector={onSector} onSelect={onSelect}/>}
    <div hidden={tab==='regions'||tab==='catalog'||tab==='sites'}>
    <label hidden={!advanced}>Terrain dataset<select aria-label="Atlas terrain dataset" value={dataset} onChange={e=>onView({...view,dataset:e.target.value})}>
      <option value="auto">Best prepared global terrain</option>{catalog.filter(value=>value.category==='terrain'&&value.pixels_per_degree&&value.numerical_queries).map(value=><option key={value.id} value={value.id}>{value.name}</option>)}
    </select></label>
    {tab==='analysis'&&<AtlasAnalysis location={location} dataset={dataset} state={analysis} onState={onAnalysis}/>}
    <div hidden={tab!=='layers'}>
    <section className="atlas-layer-tools" aria-label="Scientific surface layers">
      <label>Scientific overlay<select aria-label="Scientific overlay" value={view.layer} onChange={e=>{const next=availableLayers.find(value=>value.id===e.target.value);onView({...view,layer:e.target.value,tileUrl:next?.url_template,preparation:next?.preparation_status??'ready'});}}><option value="none">Imagery only</option>
        {availableLayers.map(value=><option value={value.id} key={value.id}>{value.name}{value.preparation_status==='not_prepared'?' — not prepared locally':''}</option>)}</select></label>
      {layer&&<><label>Layer opacity {Math.round(view.opacity*100)}%<input aria-label="Scientific layer opacity" type="range" min={0} max={1} step={.05} value={view.opacity} onChange={e=>onView({...view,opacity:Number(e.target.value)})} /></label>
        <AtlasLegend layer={layer}/>
        <p role={overlayStatus.includes('unavailable')?'alert':'status'} data-testid="atlas-overlay-status">{overlayStatus}</p>
        {overlayStatus.includes('unavailable')&&<button onClick={()=>onView({...view,reload:(view.reload??0)+1})}>Retry scientific layer</button>}
        {environmental&&layer.preparation_status!=='not_prepared'&&<div className="overlay-coverage"><p>{quantity?.status==='unavailable'?'Selected location is outside prepared geographic coverage.':quantity?.status==='nodata'?'Selected location has missing source data.': 'Prepared coverage is a roughly 96 km square around the south pole.'} Transparent areas have no supporting measurements.</p>
          <button onClick={()=>onSelect({latitude_deg:-90,longitude_deg:0},1.08)}>View prepared south-pole coverage</button></div>}
        <div hidden={!advanced}><label><input type="checkbox" checked={view.compare} onChange={e=>onView({...view,compare:e.target.checked})}/>Compare imagery and science</label>
        {view.compare&&<label>Reveal position<input aria-label="Comparison reveal" type="range" min={.05} max={.95} step={.01} value={view.reveal} onChange={e=>onView({...view,reveal:Number(e.target.value)})}/></label>}</div>
      </>}
    </section>
    {location&&<button className="primary-button" onClick={()=>setTab('sites')}>Find settlement sites</button>}
    {!location&&<p>Select the lunar surface or a destination to inspect its native data.</p>}
    {loading&&<p role="status">Loading native terrain…</p>}{error&&<p role="alert">{error}</p>}
    {point&&<section aria-label="Atlas terrain inspection"><p className="region-coordinate">{point.latitude_deg.toFixed(5)}° latitude / {point.longitude_deg.toFixed(5)}° E</p>
      <p className="point-resolution">{point.dataset_id==='lola-south'?'LOLA polar terrain':point.dataset_id==='gld100'?'Global GLD100 terrain':'Global LOLA terrain'} / {point.elevation.spacing_north_m.toFixed(0)} m native spacing</p>
      {point.dataset_id!==selectedDataset&&['elevation','slope'].includes(view.layer)&&<p className="point-resolution">Point measurements use finer local terrain. The color legend identifies the global visualization source.</p>}
      <dl><dt>Elevation</dt><dd data-testid="atlas-elevation">{point.elevation.value===null?'Missing data':`${point.elevation.value.toLocaleString('en-US')} m`}</dd>
      <dt hidden={!advanced&&view.layer!=='illumination'&&point.solar_visibility?.status!=='ok'}>Average solar visibility</dt><dd hidden={!advanced&&view.layer!=='illumination'&&point.solar_visibility?.status!=='ok'} data-testid="atlas-sunlight">{point.solar_visibility?.status==='ok'?`${(point.solar_visibility.value!*100).toFixed(1)}%`:'Unavailable here'}</dd>
      <dt hidden={!advanced&&view.layer!=='temperature'&&point.temperature?.status!=='ok'}>Summer temperature / local midnight bin</dt><dd hidden={!advanced&&view.layer!=='temperature'&&point.temperature?.status!=='ok'} data-testid="atlas-temperature">{point.temperature?.status==='ok'?`${point.temperature.value!.toFixed(1)} K`:'Unavailable here'}</dd>
      <dt hidden={!advanced}>Source</dt><dd hidden={!advanced}>{point.elevation.source_id} {point.elevation.version}</dd><dt hidden={!advanced}>Native spacing at sampled latitude</dt><dd hidden={!advanced}>{point.elevation.spacing_north_m.toFixed(1)} m north / {point.elevation.spacing_east_m.toFixed(1)} m east</dd>
      <dt hidden={!advanced}>Sampling</dt><dd hidden={!advanced}>{point.elevation.method}</dd><dt>Derived slope</dt><dd data-testid="atlas-slope">{point.slope.value===null?'Missing stencil':`${point.slope.value.toFixed(3)}°`}</dd>
      <dt hidden={!advanced}>Slope support</dt><dd hidden={!advanced}>{point.slope.support_north_m.toFixed(1)} m north / {point.slope.support_east_m.toFixed(1)} m east</dd><dt hidden={!advanced}>Terrain provenance</dt><dd hidden={!advanced}>{point.terrain_source}</dd></dl>
      {source&&<details><summary>Measurement metadata</summary><p>{source.citation}</p><p>{point.frame_note}</p>{source.limitations.map(note=><p key={note}>{note}</p>)}{point.temperature&&<p>{point.temperature.source_id} {point.temperature.version}: {point.temperature.method}. Surface brightness temperature is not habitat temperature.</p>}{point.solar_visibility&&<p>{point.solar_visibility.source_id} {point.solar_visibility.version}: {point.solar_visibility.method}. This is not current sunlight.</p>}<a href={source.source_url} target="_blank" rel="noreferrer">Original dataset documentation</a></details>}
      <div hidden={view.layer!=='geology'&&!advanced} className="geologic-inspection" aria-label="Geological interpretation"><h3>Geological interpretation</h3>
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
        {['pds_equirectangular','range_zip_geology','diviner_polar_table'].includes(value.adapter)&&<DatasetAcquisition dataset={value.id}/>}
        {providers.filter(provider=>provider.dataset_id===value.id).map(provider=><DatasetDiscovery key={provider.id} provider={provider}/>)}
      </details>)}
    </section></>}
    </div>
  </aside>;
}
