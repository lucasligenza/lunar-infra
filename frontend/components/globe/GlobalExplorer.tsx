"use client";
import { useEffect, useRef, useState,useMemo } from 'react';
import dynamic from 'next/dynamic';
import { calculateScientific, fetchScientific } from '../../lib/api';
import type { NeighborhoodReport } from '../../types/suitability';
import type {SettlementState} from '../../lib/useSettlement';
import {overlayLayers,type AtlasCatalog} from '../../lib/useAtlasCatalog';
import AnalysisTools,{type AnalysisTab} from './AnalysisTools';
import AtlasLegend,{LayerSource} from './AtlasLegend';
import SettlementPanel from './SettlementPanel';
import OverlayMenu,{type Coverage} from '../overlays/OverlayMenu';
import LegendChip from '../overlays/LegendChip';
import type { AtlasView,AtlasSector,AtlasAnalysisState,AtlasPoint } from '../../types/atlas';
import type { Asset } from '../../types/mission';
import type { CameraState, Destination, GlobeInspection, GlobeLocation, GlobeMetadata, Mode } from '../../types/globe';
import {areaBoundary} from '../../lib/atlas-area';
import {polarBoundary} from '../../lib/lunar';
import type {Region} from '../../types/scientific';
import Icon from '../ui/Icon';
import Drawer from '../ui/Drawer';
import Segmented from '../ui/Segmented';
import {LAYER_PRESENTATION} from '../ui/LayerPicker';
import GeologyReading from '../panels/GeologyReading';
import LocationPanel from '../location/LocationPanel';
const MoonCanvas = dynamic(()=>import('./MoonCanvas'), { ssr:false, loading:()=> <div className="globe-loading" role="status">Starting the lunar renderer…</div> });

type Menu='places'|'overlays'|null;
type Panel='location'|'candidates'|'analysis'|null;

export default function GlobalExplorer({ atlas, mission=null, location, assets, base, camera, onCamera, onSelect, onCoverage, onMode,atlasView,onAtlasView,sector,onSector,analysis,onAnalysis,analysisMode=false,onLocal,atlasRequest,navigationRequest,settlement,preparedRegion }: {
  atlas:AtlasCatalog;mission?:{name:string;assets:Asset[]}|null;preparedRegion?:Region|null;
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
  const [query,setQuery] = useState('');
  const [menu,setMenu]=useState<Menu>(null),[panel,setPanel]=useState<Panel>(null),[analysisTab,setAnalysisTab]=useState<AnalysisTab>('analysis');
  const [texture,setTexture] = useState(true), [grid,setGrid] = useState(false);
  const [selected,setSelected] = useState<Destination|null>(null), [inspection,setInspection] = useState<GlobeInspection|null>(null), [inspecting,setInspecting] = useState(false);
  const [inspectionError,setInspectionError] = useState<string|null>(null);
  const [terrain,setTerrain]=useState<AtlasPoint|null>(null);
  const [flight,setFlight] = useState<{coordinates:GlobeLocation;distance:number;serial:number}|null>(null);
  const [ready,setReady] = useState<number|null>(null), [lat,setLat] = useState('0'), [lon,setLon] = useState('0');
  const [atlasStatus,setAtlasStatus]=useState('Scientific overlay hidden');
  const serial = useRef(0);
  // Narrow screens show one task sheet at a time; desktop keeps a menu and a drawer in separate regions.
  const narrow=()=>window.matchMedia('(max-width: 900px)').matches;
  function openMenu(next:Menu,toggle=true){setMenu(value=>toggle&&value===next?null:next);if(next&&narrow())setPanel(null);if(next==='overlays'&&menu!=='overlays')atlas.retry();}
  function openPanel(next:Panel){setPanel(next);if(next&&narrow())setMenu(null);}
  useEffect(()=>{if(!atlasRequest)return;
    if(atlasRequest.tab==='layers')openMenu('overlays',false);
    else if(atlasRequest.tab==='sites')openPanel('candidates');
    else {setAnalysisTab(atlasRequest.tab as AnalysisTab);openPanel('analysis');}
  },[atlasRequest]);
  useEffect(()=>{if(navigationRequest){setFlight(navigationRequest);setMenu(null);setPanel('location');}},[navigationRequest]);
  useEffect(()=>{if(analysisMode){setAnalysisTab('analysis');openPanel('analysis');}},[analysisMode]);
  const layers=overlayLayers(atlas.catalog,atlas.layers,atlasView.dataset);
  const layer=layers.find(value=>value.id===atlasView.layer);
  useEffect(()=>{if(layer&&(atlasView.tileUrl!==layer.url_template||atlasView.preparation!==(layer.preparation_status??'ready')))onAtlasView({...atlasView,tileUrl:layer.url_template,preparation:layer.preparation_status??'ready'});},[layer?.url_template,layer?.preparation_status,atlasView.tileUrl,atlasView.preparation]);
  const environmental=['temperature','illumination'].includes(atlasView.layer);
  // Every outline belongs to an open surface; nothing lingers on the Moon after it closes.
  const boundaries=useMemo(()=>[...(preparedRegion&&environmental?[polarBoundary(preparedRegion)]:[]),
    ...(panel==='analysis'&&sector?[sector.boundary]:[]),
    ...(panel==='analysis'&&location&&analysisTab==='analysis'?[areaBoundary(location,analysis)]:[]),
    ...(panel==='analysis'&&analysis.profile?[analysis.profile.samples]:[])],
    [sector,location,panel,analysisTab,analysis,preparedRegion,environmental]);
  // Candidate rings (score-band colors) and the selected candidate's native analysis
  // cells exist only while the candidate browser is open.
  const selectedCandidate=settlement.report?.candidates.find(candidate=>candidate.latitude_deg===location?.latitude_deg&&candidate.longitude_deg===location?.longitude_deg)??null;
  const [gridVisible,setGridVisible]=useState(true);
  const [neighborhood,setNeighborhood]=useState<{id:string;report:NeighborhoodReport|null;error:string|null}|null>(null);
  useEffect(()=>{
    if(panel!=='candidates'||!selectedCandidate||!gridVisible||!settlement.report){return;}
    if(neighborhood?.id===selectedCandidate.id)return;
    const abort=new AbortController();setNeighborhood({id:selectedCandidate.id,report:null,error:null});
    calculateScientific<NeighborhoodReport>('/atlas/suitability/neighborhood',{latitude_deg:selectedCandidate.latitude_deg,longitude_deg:selectedCandidate.longitude_deg,
      radius_km:selectedCandidate.radius_km,dataset_id:selectedCandidate.dataset_id,max_slope_deg:settlement.report.request.max_slope_deg},abort.signal)
      .then(report=>{if(!abort.signal.aborted)setNeighborhood({id:selectedCandidate.id,report,error:null});})
      .catch(error=>{if(!abort.signal.aborted)setNeighborhood({id:selectedCandidate.id,report:null,error:error instanceof Error?error.message:'Analysis cells unavailable'});});
    return ()=>abort.abort();
  },[panel,selectedCandidate?.id,gridVisible,settlement.report]);
  useEffect(()=>{if(!settlement.report)setNeighborhood(null);},[settlement.report]);
  const candidateRings=useMemo(()=>panel==='candidates'?settlement.report?.candidates.map(candidate=>({id:candidate.id,latitude_deg:candidate.latitude_deg,longitude_deg:candidate.longitude_deg,
    radius_km:candidate.radius_km,band:candidate.score_band,selected:candidate.id===selectedCandidate?.id}))??[]:[],[panel,settlement.report,selectedCandidate?.id]);
  const gridReport=panel==='candidates'&&gridVisible&&neighborhood?.id===selectedCandidate?.id?neighborhood?.report??null:null;
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
  function choose(point:GlobeLocation, destination:Destination|null=null, distance?:number, keep=false) {
    onSelect({latitude_deg:point.latitude_deg,longitude_deg:point.longitude_deg});setSelected(destination);
    setMenu(null);if(!keep)setPanel('location');
    setFlight({coordinates:point,distance:distance ?? destination?.camera_distance_radii ?? 1.6,serial:++serial.current});
  }
  const results = destinations.filter(place=>`${place.name} ${place.id}`.toLowerCase().includes(query.toLowerCase()));
  const surfaces=useRef({menu,panel});surfaces.current={menu,panel};
  useEffect(()=>{const escape=(event:KeyboardEvent)=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;
    if(surfaces.current.menu)setMenu(null);else setPanel(null);};
    window.addEventListener('keydown',escape);return()=>window.removeEventListener('keydown',escape);},[]);
  const quantity=atlasView.layer==='temperature'?terrain?.temperature:terrain?.solar_visibility;
  const coverage:Coverage|null=!environmental?null:layer?.preparation_status==='not_prepared'?'not-prepared':!location?'no-location':inspectionError&&!terrain?'error':!terrain?'checking':
    quantity?.status==='unavailable'||quantity==null?'outside':quantity.status==='nodata'?'nodata':'available';
  const terrainSources=atlas.catalog.filter(value=>value.category==='terrain'&&value.pixels_per_degree&&value.numerical_queries);
  const coordinate=location&&`${Math.abs(location.latitude_deg).toFixed(5)}° ${location.latitude_deg<0?'S':'N'} / ${Math.abs(location.latitude_deg)===90?'longitude undefined':`${location.longitude_deg.toFixed(5)}° E`}`;
  return <section className="global-explorer" aria-label="Global lunar explorer">
    <div className="globe-toolbar">
      <div className="destination-search">
        <button className="places-trigger" onClick={()=>openMenu('places')} aria-expanded={menu==='places'} aria-label={menu==='places'?'Close destinations':'Open destinations'}><Icon name="target"/>Places<Icon name={menu==='places'?'close':'down'}/></button>
        {menu==='places' && <div className="destination-popover surface-menu" role="dialog" aria-label="Places"><label htmlFor="destination-query" className="sr-only">Find a lunar destination</label>
          <div className="search-input-row"><Icon name="search"/><input autoFocus id="destination-query" type="search" placeholder="Search places" value={query} onChange={event=>setQuery(event.target.value)} /></div>
          <div className="destination-results" aria-label="Lunar destinations">{results.map(place=><button key={place.id} onClick={()=>choose(place.coordinates,place)} aria-pressed={selected?.id===place.id}>
            <span>{place.name}</span><small>{Math.abs(place.coordinates.latitude_deg).toFixed(2)}° {place.coordinates.latitude_deg<0?'S':'N'} / {place.coordinates.longitude_defined===false?'pole':`${place.coordinates.longitude_deg.toFixed(2)}° E`}</small><Icon name="chevron"/></button>)}
            {destinationsLoading ? <p role="status">Loading destinations…</p> : destinationError ? <p role="alert">{destinationError}</p> : !results.length && <p>No matching destination. Try a crater name or coordinates.</p>}
          </div>
          <details className="global-coordinates"><summary>Go to coordinates</summary><form onSubmit={event=>{event.preventDefault();choose({latitude_deg:Number(lat),longitude_deg:(Number(lon)+360)%360});}}>
            <label>Globe latitude (°)<input required type="number" step="any" min={-90} max={90} value={lat} onChange={e=>setLat(e.target.value)} /></label>
            <label>Globe longitude (° E)<input required type="number" step="any" min={-180} max={360} value={lon} onChange={e=>setLon(e.target.value)} /></label><button type="submit">Fly to coordinates</button>
            <p>Planetocentric latitude · east-positive longitude</p></form></details>
        </div>}
      </div>
      <nav className="global-layer-controls" aria-label="Global view tools">
        <button className="overlay-trigger" aria-label="Overlays" aria-expanded={menu==='overlays'} onClick={()=>openMenu('overlays')}><Icon name="layers"/>Overlays{atlasView.layer!=='none'&&<span className="active-overlay-name">{LAYER_PRESENTATION[atlasView.layer]?.label??atlasView.layer}</span>}<Icon name={menu==='overlays'?'close':'down'}/></button>
        {onLocal&&<button onClick={onLocal}>2D polar analysis</button>}
      </nav>
    </div>
    <div className="globe-layout">
      <div className="globe-viewport">
    {metadata?.available ? <MoonCanvas metadata={metadata} location={location} flight={flight} assets={assets} base={base}
      texture={texture} grid={grid} camera={camera} onCamera={onCamera} onReady={setReady} atlas={atlasView} onAtlasStatus={setAtlasStatus}
      boundaries={boundaries} candidates={candidateRings} neighborhood={gridReport}
      onSelect={point=>{onSelect(point);setSelected(null);if(narrow())setMenu(null);setPanel(current=>current==='analysis'?'analysis':'location');}} /> :
      <div className="globe-loading" role={error || metadata ? 'alert':'status'}><h2>{error || metadata ? 'Global data unavailable':'Preparing the lunar view'}</h2>
        <p>{error ?? (metadata ? 'Prepare the global NASA data and restart the API. The regional scientific map remains available.' : 'Loading verified global data metadata…')}</p>
        {(error || metadata) && <button onClick={()=>setReload(value=>value+1)}>Retry global data</button>}</div>}
    {!location && <div className="global-introduction"><h2>A world to explore.</h2><span className="navigation-hint">Drag to orbit · scroll to approach · click to inspect</span><div className="destination-shortcuts" aria-label="Featured destinations">{destinations.filter(place=>['shackleton','apollo-11','tycho'].includes(place.id)).map(place=><button key={place.id} aria-label={`Visit ${place.name}`} onClick={()=>choose(place.coordinates,place)}>{place.id==='apollo-11'?'Apollo 11':place.name}<Icon name="chevron"/></button>)}</div></div>}
    {layer&&atlasView.layer!=='none'&&menu!=='overlays'&&<LegendChip layer={layer} status={atlasStatus} onRetry={()=>onAtlasView({...atlasView,reload:(atlasView.reload??0)+1})}/>}
    {location&&<div className="selection-strip" aria-label="Selected location summary"><Icon name="target"/><p className="region-coordinate" data-testid="global-coordinate">{coordinate}</p>
      {panel!=='location'&&<button className="region-drawer-toggle" onClick={()=>openPanel('location')} aria-expanded={false} aria-label="Open region details">Details<Icon name="chevron"/></button>}
    </div>}
      </div>
    {menu==='overlays'&&<OverlayMenu layers={layers} value={atlasView.layer} opacity={atlasView.opacity} onClose={()=>setMenu(null)} error={atlas.error} onRetry={atlas.retry}
      onChange={id=>{const next=layers.find(value=>value.id===id);onAtlasView({...atlasView,layer:id,tileUrl:next?.url_template,preparation:next?.preparation_status??'ready'});}}
      onOpacity={opacity=>onAtlasView({...atlasView,opacity})}
      legend={layer&&<AtlasLegend layer={layer} selectedCode={terrain?.geology?.status==='ok'?terrain.geology.category?.code:undefined}/>}
      status={<><p role={atlasStatus.includes('unavailable')?'alert':'status'} className="overlay-status" data-testid="atlas-overlay-status">{atlasStatus}</p>
        {atlasStatus.includes('unavailable')&&<button onClick={()=>onAtlasView({...atlasView,reload:(atlasView.reload??0)+1})}>Retry scientific layer</button>}</>}
      coverage={coverage} environmentNote="Prepared coverage is a roughly 96 km square around the south pole; gaps stay transparent."
      onCoverage={()=>choose({latitude_deg:-90,longitude_deg:0},null,1.08)}
      sourceDetails={<>
        {layer&&<LayerSource layer={layer}/>}
        <Segmented label="Terrain source" value={atlasView.dataset} disabled={!terrainSources.length} onChange={dataset=>onAtlasView({...atlasView,dataset})}
          options={[{value:'auto',label:'Best available',title:'Finest prepared terrain at each location'},...terrainSources.map(value=>({value:value.id,label:value.id==='gld100'?'GLD100':value.id==='lola-global'?'LOLA 0.25°':value.name,title:value.name}))]}/>
        <p>Point measurements use the finest prepared grid at the selected location: 240 m inside the polar crop, otherwise the chosen global grid.</p>
        <label className="toggle"><input type="checkbox" checked={atlasView.compare} disabled={atlasView.layer==='none'} onChange={e=>onAtlasView({...atlasView,compare:e.target.checked})}/>Compare imagery and science</label>
        {atlasView.compare&&atlasView.layer!=='none'&&<label>Reveal position<input aria-label="Comparison reveal" type="range" min={.05} max={.95} step={.01} value={atlasView.reveal} onChange={e=>onAtlasView({...atlasView,reveal:Number(e.target.value)})}/></label>}
        <label className="toggle"><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)} />Lunar graticule</label>
        <label className="toggle"><input type="checkbox" checked={texture} onChange={e=>setTexture(e.target.checked)} />NASA color visualization</label>
        <p>True-scale LOLA relief; display lighting is fixed, not modeled sunlight. Imagery up to 4096 × 2048; terrain 0.25°; display mesh 1°.</p>
        {ready!==null && <small data-testid="globe-ready-time">First imagery ready in {(ready/1000).toFixed(2)} s on this browser.</small>}
        {metadata?.source_urls.map(url=><a key={url} href={url} target="_blank" rel="noreferrer">{url.includes('svs')?'NASA visualization source':'NASA LOLA archive'}</a>)}
      </>}/>}
    {location&&panel==='location'&&<Drawer label="Selected lunar region" title={destination?.name ?? 'Selected location'} eyebrow="LOCATION" closeLabel="Close region details" onClose={()=>setPanel(null)} className="region-drawer"
      footer={inspection&&<div className="region-actions">
            <button className="primary-button" onClick={()=>openPanel('candidates')}><Icon name="target"/>Find settlement sites<Icon name="chevron"/></button>
            <button disabled={inspection.elevation.status!=='ok'} onClick={()=>onMode('mission')}><Icon name="build"/>Create mission here</button>
            <button onClick={()=>onMode('regional')}><Icon name="simulate"/>Analyze this region</button></div>}>
        <LocationPanel point={terrain} loading={inspecting||(!terrain&&!inspectionError)} error={inspectionError} coverage={inspection} mission={mission}
          focus={atlasView.layer==='geology'&&<GeologyReading geology={terrain?.geology??null} loading={!terrain&&!inspectionError} error={terrain?null:inspectionError}/>}
>
          {destination&&<details className="location-details"><summary>About {destination.name}</summary><p>{destination.description}</p>
            <a href={destination.source_url} target="_blank" rel="noreferrer">Destination coordinate source</a><p>{destination.coordinate_note}</p></details>}
          {inspection&&<p className="sr-only" data-testid="local-coverage">{inspection.local_analysis?'240 m south-pole grid':inspection.local_status.replaceAll('_',' ')}</p>}
        </LocationPanel>
      </Drawer>}
    {panel==='candidates'&&<Drawer label="Settlement sites" title="Settlement sites" eyebrow="SCREENING" closeLabel="Close settlement sites" onClose={()=>setPanel(null)} onBack={location?()=>setPanel('location'):undefined} backLabel="Back to location" className="candidate-drawer">
      <SettlementPanel state={settlement} location={location} selected={selectedCandidate} onSelect={candidate=>choose(candidate,null,Math.max(1.035,1+candidate.radius_km*7/1737.4),true)} onMission={()=>onMode('mission')}
        gridControls={selectedCandidate&&<div className="grid-controls" aria-label="Analysis grid">
          <label className="toggle"><input type="checkbox" checked={gridVisible} onChange={event=>setGridVisible(event.target.checked)}/>Show analysis grid on the Moon</label>
          {gridVisible&&<>
            <div className="grid-legend"><span><i style={{background:'rgba(83,185,135,.6)'}}/>Slope ≤ {settlement.report?.request.max_slope_deg}°</span><span><i style={{background:'rgba(201,122,114,.6)'}}/>Steeper</span><span><i style={{background:'rgba(125,135,148,.6)'}}/>Missing data</span></div>
            <p className="grid-cell-readout" data-testid="grid-status">{neighborhood?.error?`Analysis cells unavailable: ${neighborhood.error}`:!gridReport?'Loading evaluated cells…':
              `${gridReport.cells.length} native cells · ${Math.round(gridReport.spacing_m)} m spacing · ${gridReport.source_id}. Hover a cell for its values.`}</p></>}
        </div>}/>
    </Drawer>}
    {panel==='analysis'&&<AnalysisTools location={location} dataset={atlasView.dataset} tab={analysisTab} onTab={setAnalysisTab} atlas={atlas} onClose={()=>setPanel(null)} onBack={location?()=>setPanel('location'):undefined}
      sector={sector} onSector={onSector} onSelect={(point,distance)=>choose(point,null,distance,true)} analysis={analysis} onAnalysis={onAnalysis}/>}
    </div>
    <footer className="globe-attribution"><a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">NASA’s Scientific Visualization Studio</a><span>LOLA geometry / ME-PA DE421</span></footer>
  </section>;
}
