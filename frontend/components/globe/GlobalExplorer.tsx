"use client";
import { useEffect, useRef, useState,useMemo } from 'react';
import dynamic from 'next/dynamic';
import { fetchScientific } from '../../lib/api';
import type {SettlementState} from '../../lib/useSettlement';
import AtlasPanel from './AtlasPanel';
import type { AtlasView,AtlasSector,AtlasAnalysisState,AtlasPoint } from '../../types/atlas';
import type { Asset } from '../../types/mission';
import type { CameraState, Destination, GlobeInspection, GlobeLocation, GlobeMetadata, Mode } from '../../types/globe';
import {areaBoundary} from '../../lib/atlas-area';
import {polarBoundary} from '../../lib/lunar';
import type {Region} from '../../types/scientific';
import Icon from '../ui/Icon';
import {LAYER_PRESENTATION} from '../ui/LayerPicker';
import GeologyReading from '../panels/GeologyReading';
const MoonCanvas = dynamic(()=>import('./MoonCanvas'), { ssr:false, loading:()=> <div className="globe-loading" role="status">Starting the lunar renderer…</div> });

export default function GlobalExplorer({ location, assets, base, camera, onCamera, onSelect, onCoverage, onMode,atlasView,onAtlasView,sector,onSector,analysis,onAnalysis,analysisMode=false,onLocal,atlasRequest,navigationRequest,settlement,preparedRegion }: {
  preparedRegion?:Region|null;
  location: GlobeLocation | null; assets: Asset[]; base: GlobeLocation | null; camera: CameraState | null;
  onCamera:(state:CameraState)=>void; onSelect:(location:GlobeLocation)=>void; onCoverage:(coverage:GlobeInspection)=>void; onMode:(mode:Mode)=>void;
  atlasView:AtlasView;onAtlasView:(view:AtlasView)=>void;sector:AtlasSector|null;onSector:(sector:AtlasSector|null)=>void;
  analysis:AtlasAnalysisState;onAnalysis:(state:AtlasAnalysisState)=>void;analysisMode?:boolean;onLocal?:()=>void;
  settlement:SettlementState;
  atlasRequest?:{tab:string;serial:number}|null;navigationRequest?:{coordinates:GlobeLocation;distance:number;serial:number}|null;
}) {
  const [metadata,setMetadata] = useState<GlobeMetadata|null>(null), [destinations,setDestinations] = useState<Destination[]>([]);
  const [error,setError] = useState<string|null>(null), [reload,setReload] = useState(0);
  const [destinationError,setDestinationError] = useState<string|null>(null), [destinationsLoading,setDestinationsLoading] = useState(true);
  const [query,setQuery] = useState(''), [searchOpen,setSearchOpen] = useState(false), [layersOpen,setLayersOpen] = useState(false);
  const [texture,setTexture] = useState(true), [grid,setGrid] = useState(false);
  const [selected,setSelected] = useState<Destination|null>(null), [inspection,setInspection] = useState<GlobeInspection|null>(null), [inspecting,setInspecting] = useState(false);
  const [inspectionError,setInspectionError] = useState<string|null>(null), [drawerOpen,setDrawerOpen] = useState(true);
  const [terrain,setTerrain]=useState<AtlasPoint|null>(null);
  const [flight,setFlight] = useState<{coordinates:GlobeLocation;distance:number;serial:number}|null>(null);
  const [ready,setReady] = useState<number|null>(null), [lat,setLat] = useState('0'), [lon,setLon] = useState('0');
  const serial = useRef(0);
  const [atlasOpen,setAtlasOpen]=useState(false);
  const [panelRequest,setPanelRequest]=useState<{tab:string;serial:number}|null>(null);
  useEffect(()=>{if(atlasRequest)setPanelRequest(atlasRequest);},[atlasRequest]);
  useEffect(()=>{if(atlasRequest){setAtlasOpen(true);setLayersOpen(false);setDrawerOpen(false);setSearchOpen(false);}},[atlasRequest]);
  useEffect(()=>{if(navigationRequest){setFlight(navigationRequest);setDrawerOpen(true);setAtlasOpen(false);setLayersOpen(false);setSearchOpen(false);}},[navigationRequest]);
  useEffect(()=>{const narrow=window.matchMedia('(max-width: 900px)');const closeSearch=()=>{if(narrow.matches)setSearchOpen(false);};narrow.addEventListener('change',closeSearch);return()=>narrow.removeEventListener('change',closeSearch);},[]);
  const [atlasStatus,setAtlasStatus]=useState('Scientific overlay hidden');
  const boundaries=useMemo(()=>[...(preparedRegion&&["temperature","illumination"].includes(atlasView.layer)?[polarBoundary(preparedRegion)]:[]),...(sector?[sector.boundary]:[]),...(location&&analysisMode?[areaBoundary(location,analysis)]:[]),...(analysis.profile?[analysis.profile.samples]:[]),...(settlement.report?.candidates.map(point=>areaBoundary(point,{...analysis,radius:String(point.radius_km),kind:'circle'}))??[])],[sector,location,analysisMode,analysis,settlement.report,preparedRegion,atlasView.layer]);
  useEffect(()=>{if(analysisMode){setPanelRequest({tab:'analysis',serial:++serial.current});setAtlasOpen(true);setDrawerOpen(false);setSearchOpen(false);}},[analysisMode]);
  useEffect(()=>{
    const abort = new AbortController(); setError(null);setDestinationError(null);setDestinationsLoading(true);
    fetchScientific<GlobeMetadata>('/globe',abort.signal)
      .then(data=>{ if(!abort.signal.aborted) setMetadata(data); })
      .catch(error=>{ if(!abort.signal.aborted) setError(error.message); });
    fetchScientific<Destination[]>('/destinations',abort.signal)
      .then(places=>{if(!abort.signal.aborted) {setDestinations(places);setDestinationsLoading(false);}})
      .catch(()=>{if(!abort.signal.aborted) {setDestinationError('Destination catalog unavailable. Use coordinates or select the globe.');setDestinationsLoading(false);}});
    return ()=>abort.abort();
  },[reload]);
  useEffect(()=>{
    if(!location) return;
    const abort = new AbortController();setInspecting(true);setInspection(null);setTerrain(null);setInspectionError(null);
    setLat(location.latitude_deg.toFixed(5));setLon(location.longitude_deg.toFixed(5));
    fetchScientific<GlobeInspection>(`/globe/inspect/location?latitude=${location.latitude_deg}&longitude=${location.longitude_deg}`,abort.signal)
      .then(result=>{if(!abort.signal.aborted) {setInspection(result);setInspecting(false);onCoverage(result);}})
      .catch(error=>{if(!abort.signal.aborted) {setInspectionError(error.message);setInspecting(false);}});
    fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${location.latitude_deg}&longitude=${location.longitude_deg}&dataset=${atlasView.dataset==='auto'?'best':atlasView.dataset}`,abort.signal)
      .then(point=>{if(!abort.signal.aborted)setTerrain(point);})
      .catch(error=>{if(!abort.signal.aborted)setInspectionError(error.message);});
    return ()=>abort.abort();
  },[location,atlasView.dataset]);
  const destination = selected ?? destinations.find(place=>place.coordinates.latitude_deg===location?.latitude_deg && place.coordinates.longitude_deg===location?.longitude_deg) ?? null;
  function choose(point:GlobeLocation, destination:Destination|null=null) {
    onSelect({latitude_deg:point.latitude_deg,longitude_deg:point.longitude_deg});setSelected(destination);setDrawerOpen(true);setLayersOpen(false);
    setSearchOpen(false);
    setFlight({coordinates:point,distance:destination?.camera_distance_radii ?? 1.6,serial:++serial.current});
  }
  const results = destinations.filter(place=>`${place.name} ${place.id}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="global-explorer" aria-label="Global lunar explorer">
    <div className="globe-toolbar">
    <div className="destination-search">
      <label htmlFor="destination-query">Find a lunar destination</label>
      <div className="search-input-row"><Icon name="search"/><input id="destination-query" type="search" placeholder="Search the Moon" value={query} onFocus={()=>{setSearchOpen(true);if(window.innerWidth<900){setAtlasOpen(false);setLayersOpen(false);setDrawerOpen(false);}}} onChange={event=>{setQuery(event.target.value);setSearchOpen(true);}} />
        <button onClick={()=>setSearchOpen(value=>!value)} aria-expanded={searchOpen} aria-label={searchOpen?'Close destinations':'Open destinations'}><Icon name={searchOpen?'close':'down'}/></button></div>
      {searchOpen && <div className="destination-results" aria-label="Lunar destinations">{results.map(place=><button key={place.id} onClick={()=>choose(place.coordinates,place)} aria-pressed={selected?.id===place.id}>
        <span>{place.name}</span><small>{Math.abs(place.coordinates.latitude_deg).toFixed(2)}° {place.coordinates.latitude_deg<0?'S':'N'} / {place.coordinates.longitude_defined===false?'pole':`${place.coordinates.longitude_deg.toFixed(2)}° E`}</small><Icon name="chevron"/></button>)}
        {destinationsLoading ? <p role="status">Loading destinations…</p> : destinationError ? <p role="alert">{destinationError}</p> : !results.length && <p>No matching destination. Try a crater name or coordinates.</p>}
      </div>}
    </div>
    <nav className="global-layer-controls" aria-label="Global view tools">
      <button className="overlay-trigger" aria-expanded={atlasOpen} onClick={()=>{setAtlasOpen(value=>!value);setDrawerOpen(false);setLayersOpen(false);setPanelRequest({tab:'layers',serial:++serial.current});}}><Icon name="layers"/>Overlays</button>
      <button aria-expanded={layersOpen} onClick={()=>{setLayersOpen(value=>!value);setAtlasOpen(false);setDrawerOpen(false);setSearchOpen(false);}}><Icon name="settings"/>Advanced</button>
      {onLocal&&<button onClick={onLocal}>2D polar analysis</button>}

    </nav>
      {location && !atlasOpen && !layersOpen && <button className="region-drawer-toggle" onClick={()=>setDrawerOpen(value=>!value)} aria-expanded={drawerOpen}>{drawerOpen?'Close region details':'Open region details'}</button>}
    </div>
    <div className="globe-layout">
      <div className="globe-viewport">
    {metadata?.available ? <MoonCanvas metadata={metadata} location={location} flight={flight} assets={assets} base={base}
      texture={texture} grid={grid} camera={camera} onCamera={onCamera} onReady={setReady} atlas={atlasView} onAtlasStatus={setAtlasStatus}
      boundaries={boundaries}
      onSelect={point=>{onSelect(point);setSelected(null);setDrawerOpen(true);setLayersOpen(false);}} /> :
      <div className="globe-loading" role={error || metadata ? 'alert':'status'}><h2>{error || metadata ? 'Global data unavailable':'Preparing the lunar view'}</h2>
        <p>{error ?? (metadata ? 'Prepare the global NASA data and restart the API. The regional scientific map remains available.' : 'Loading verified global data metadata…')}</p>
        {(error || metadata) && <button onClick={()=>setReload(value=>value+1)}>Retry global data</button>}</div>}
    {!location && <div className="global-introduction"><span className="eyebrow">YOUR NEXT FRONTIER</span><h2>Explore the Moon.</h2><p>Find a place. Understand the terrain.<br/>Design what comes next.</p><div className="destination-shortcuts" aria-label="Featured destinations">{destinations.filter(place=>['shackleton','apollo-11','tycho'].includes(place.id)).map(place=><button key={place.id} aria-label={`Visit ${place.name}`} onClick={()=>choose(place.coordinates,place)}>{place.id==='apollo-11'?'Apollo 11':place.name}<Icon name="chevron"/></button>)}</div><span className="navigation-hint">Drag to orbit · scroll to approach · click to select</span></div>}
    {atlasView.layer!=='none'&&!atlasOpen&&<button className="atlas-active" onClick={()=>{setAtlasOpen(true);setDrawerOpen(false);}}><Icon name="layers"/>{LAYER_PRESENTATION[atlasView.layer]?.label??atlasView.layer}</button>}
      </div>
      {layersOpen && <aside className="globe-dock display-settings" aria-label="Globe display settings"><header><h2>Advanced map controls</h2><button onClick={()=>setLayersOpen(false)}>Close display settings</button></header>
        <details className="global-coordinates"><summary>Go to coordinates</summary><form onSubmit={event=>{event.preventDefault();choose({latitude_deg:Number(lat),longitude_deg:(Number(lon)+360)%360});}}>
          <label>Globe latitude (°)<input required type="number" step="any" min={-90} max={90} value={lat} onChange={e=>setLat(e.target.value)} /></label>
          <label>Globe longitude (° E)<input required type="number" step="any" min={-180} max={360} value={lon} onChange={e=>setLon(e.target.value)} /></label><button type="submit">Fly to coordinates</button></form></details>
        <label><input type="checkbox" checked={texture} onChange={e=>setTexture(e.target.checked)} />NASA color visualization</label>
        <label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)} />Lunar graticule</label><p>True-scale LOLA relief. Display lighting is fixed, not modeled sunlight.</p>
        <p>Imagery up to 4096 × 2048; terrain source 0.25°; display mesh 1°. Local analysis: 240 m where prepared.</p>
        {ready!==null && <small data-testid="globe-ready-time">First imagery ready in {(ready/1000).toFixed(2)} s on this browser.</small>}</aside>}    {atlasOpen&&<AtlasPanel location={location} onClose={()=>{setAtlasOpen(false);setDrawerOpen(true);}} view={atlasView} onView={onAtlasView} overlayStatus={atlasStatus}
      sector={sector} onSector={onSector} onSelect={(point,distance)=>{choose(point);if(distance)setFlight({coordinates:point,distance,serial:++serial.current});}}
      analysis={analysis} onAnalysis={onAnalysis} analysisMode={analysisMode} request={panelRequest} settlement={settlement} onMission={()=>onMode('mission')}/>}
    {location && !atlasOpen && !layersOpen && <>

      {drawerOpen && <aside className="region-drawer globe-dock" aria-label="Selected lunar region">
        <span className="eyebrow">SELECTED REGION</span><div className="drawer-title"><h2>{destination?.name ?? 'Selected location'}</h2></div>
        <p className="region-coordinate" data-testid="global-coordinate">{Math.abs(location.latitude_deg).toFixed(5)}° {location.latitude_deg<0?'S':'N'} / {Math.abs(location.latitude_deg)===90?'longitude undefined':`${location.longitude_deg.toFixed(5)}° E`}</p>
        {destination && <p>{destination.description}</p>}
        {inspecting && <p role="status">Checking scientific coverage…</p>}
        {inspectionError && <p role="alert">{inspectionError}</p>}
        {atlasView.layer==='geology'&&<GeologyReading geology={terrain?.geology??null} loading={!terrain&&!inspectionError} error={terrain?null:inspectionError}/>}
        {terrain&&<dl className="region-measurements"><div><dt>Elevation</dt><dd data-testid="global-elevation">{terrain.elevation.value===null?'Unavailable':`${terrain.elevation.value.toLocaleString('en-US')} m`}</dd></div><div><dt>Derived slope</dt><dd>{terrain.slope.value===null?'Missing stencil':`${terrain.slope.value.toFixed(2)}°`}</dd></div></dl>}
        {inspection && <>
          <div className="region-actions"><button className="primary-button" onClick={()=>{setAtlasOpen(true);setDrawerOpen(false);}}><Icon name="layers"/>View scientific overlays<Icon name="chevron"/></button>
          <button onClick={()=>{setAtlasOpen(true);setDrawerOpen(false);setPanelRequest({tab:'sites',serial:++serial.current});}}><Icon name="target"/>Find settlement sites<Icon name="chevron"/></button>
          <button disabled={inspection.elevation.status!=='ok'} onClick={()=>onMode('mission')}><Icon name="build"/>Create mission here<Icon name="chevron"/></button></div>
          </>}
        <details><summary>Advanced</summary><button onClick={()=>onMode('regional')}>Analyze this region</button><p>Global imagery is a visualization product, not a measurement. Local and global elevation have different sampling footprints.</p>
          {terrain&&<p>{terrain.elevation.source_id} {terrain.elevation.version} / {terrain.elevation.spacing_north_m.toFixed(1)} m native spacing. {terrain.elevation.method}.</p>}
          {inspection&&<dl><dt>Local analysis</dt><dd data-testid="local-coverage">{inspection.local_analysis?'240 m south-pole grid':inspection.local_status.replaceAll('_',' ')}</dd></dl>}
          {metadata?.source_urls.map(url=><a key={url} href={url} target="_blank" rel="noreferrer">{url.includes('svs')?'NASA visualization source':'NASA LOLA archive'}</a>)}
          {destination && <><a href={destination.source_url} target="_blank" rel="noreferrer">Destination coordinate source</a><p>{destination.coordinate_note}</p></>}
        </details>
      </aside>}
    </>}
    </div>
    <footer className="globe-attribution"><a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">NASA’s Scientific Visualization Studio</a><span>LOLA geometry / ME-PA DE421</span></footer>
  </section>;
}
