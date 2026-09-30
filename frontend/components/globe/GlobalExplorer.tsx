"use client";
import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchScientific } from '../../lib/api';
import AtlasPanel from './AtlasPanel';
import type { Asset } from '../../types/mission';
import type { CameraState, Destination, GlobeInspection, GlobeLocation, GlobeMetadata, Mode } from '../../types/globe';
const MoonCanvas = dynamic(()=>import('./MoonCanvas'), { ssr:false, loading:()=> <div className="globe-loading" role="status">Starting the lunar renderer…</div> });

export default function GlobalExplorer({ location, assets, base, camera, onCamera, onSelect, onCoverage, onMode }: {
  location: GlobeLocation | null; assets: Asset[]; base: GlobeLocation | null; camera: CameraState | null;
  onCamera:(state:CameraState)=>void; onSelect:(location:GlobeLocation)=>void; onCoverage:(coverage:GlobeInspection)=>void; onMode:(mode:Mode)=>void;
}) {
  const [metadata,setMetadata] = useState<GlobeMetadata|null>(null), [destinations,setDestinations] = useState<Destination[]>([]);
  const [error,setError] = useState<string|null>(null), [reload,setReload] = useState(0);
  const [destinationError,setDestinationError] = useState<string|null>(null), [destinationsLoading,setDestinationsLoading] = useState(true);
  const [query,setQuery] = useState(''), [searchOpen,setSearchOpen] = useState(()=>window.innerWidth>=800), [layersOpen,setLayersOpen] = useState(false);
  const [texture,setTexture] = useState(true), [grid,setGrid] = useState(false);
  const [selected,setSelected] = useState<Destination|null>(null), [inspection,setInspection] = useState<GlobeInspection|null>(null), [inspecting,setInspecting] = useState(false);
  const [inspectionError,setInspectionError] = useState<string|null>(null), [drawerOpen,setDrawerOpen] = useState(true);
  const [flight,setFlight] = useState<{coordinates:GlobeLocation;distance:number;serial:number}|null>(null);
  const [ready,setReady] = useState<number|null>(null), [lat,setLat] = useState('0'), [lon,setLon] = useState('0');
  const serial = useRef(0);
  const [atlasOpen,setAtlasOpen]=useState(false);
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
    const abort = new AbortController();setInspecting(true);setInspection(null);setInspectionError(null);
    setLat(location.latitude_deg.toFixed(5));setLon(location.longitude_deg.toFixed(5));
    fetchScientific<GlobeInspection>(`/globe/inspect/location?latitude=${location.latitude_deg}&longitude=${location.longitude_deg}`,abort.signal)
      .then(result=>{if(!abort.signal.aborted) {setInspection(result);setInspecting(false);onCoverage(result);}})
      .catch(error=>{if(!abort.signal.aborted) {setInspectionError(error.message);setInspecting(false);}});
    return ()=>abort.abort();
  },[location]);
  const destination = selected ?? destinations.find(place=>place.coordinates.latitude_deg===location?.latitude_deg && place.coordinates.longitude_deg===location?.longitude_deg) ?? null;
  function choose(point:GlobeLocation, destination:Destination|null=null) {
    onSelect(point);setSelected(destination);setDrawerOpen(true);
    if(window.innerWidth<800) setSearchOpen(false);
    setFlight({coordinates:point,distance:destination?.camera_distance_radii ?? 1.6,serial:++serial.current});
  }
  const results = destinations.filter(place=>`${place.name} ${place.id}`.toLowerCase().includes(query.toLowerCase()));
  return <section className="global-explorer" aria-label="Global lunar explorer">
    {metadata?.available ? <MoonCanvas metadata={metadata} location={location} flight={flight} assets={assets} base={base}
      texture={texture} grid={grid} camera={camera} onCamera={onCamera} onReady={setReady}
      onSelect={point=>{onSelect(point);setSelected(null);setDrawerOpen(true);}} /> :
      <div className="globe-loading" role={error || metadata ? 'alert':'status'}><h2>{error || metadata ? 'Global data unavailable':'Preparing the lunar view'}</h2>
        <p>{error ?? (metadata ? 'Prepare the global NASA data and restart the API. The regional scientific map remains available.' : 'Loading verified global data metadata…')}</p>
        {(error || metadata) && <button onClick={()=>setReload(value=>value+1)}>Retry global data</button>}</div>}
    <div className="destination-search">
      <label htmlFor="destination-query">Find a lunar destination</label>
      <div className="search-input-row"><input id="destination-query" type="search" placeholder="Crater, pole or landing region" value={query} onFocus={()=>setSearchOpen(true)} onChange={event=>{setQuery(event.target.value);setSearchOpen(true);}} />
        <button onClick={()=>setSearchOpen(value=>!value)} aria-expanded={searchOpen} aria-label={searchOpen?'Close destinations':'Open destinations'}>{searchOpen?'−':'+'}</button></div>
      {searchOpen && <div className="destination-results" aria-label="Lunar destinations">{results.map(place=><button key={place.id} onClick={()=>choose(place.coordinates,place)} aria-pressed={selected?.id===place.id}>
        <span>{place.name}</span><small>{Math.abs(place.coordinates.latitude_deg).toFixed(2)}° {place.coordinates.latitude_deg<0?'S':'N'} / {place.coordinates.longitude_defined===false?'pole':`${place.coordinates.longitude_deg.toFixed(2)}° E`}</small></button>)}
        {destinationsLoading ? <p role="status">Loading destinations…</p> : destinationError ? <p role="alert">{destinationError}</p> : !results.length && <p>No matching destination. Try a crater name or coordinates.</p>}
      </div>}
      <details className="global-coordinates"><summary>Go to coordinates</summary><form onSubmit={event=>{event.preventDefault();choose({latitude_deg:Number(lat),longitude_deg:(Number(lon)+360)%360});}}>
        <label>Globe latitude (°)<input required type="number" step="any" min={-90} max={90} value={lat} onChange={e=>setLat(e.target.value)} /></label>
        <label>Globe longitude (° E)<input required type="number" step="any" min={-180} max={360} value={lon} onChange={e=>setLon(e.target.value)} /></label><button type="submit">Fly to coordinates</button></form></details>
    </div>
    {!location && <div className="global-introduction"><h2>Explore the Moon</h2><p>One world. Two hemispheres.<br/>A path from discovery to mission design.</p><span>Drag to orbit · scroll to approach · click to select</span></div>}
    <div className="global-layer-controls"><button aria-expanded={layersOpen} onClick={()=>{setLayersOpen(value=>!value);if(window.innerWidth<800) setDrawerOpen(false);}}>Globe layers</button>
      <button aria-expanded={atlasOpen} onClick={()=>{setAtlasOpen(value=>!value);setDrawerOpen(false);setLayersOpen(false);}}>Lunar atlas</button>
      {layersOpen && <div className="floating-instrument"><label><input type="checkbox" checked={texture} onChange={e=>setTexture(e.target.checked)} />NASA color visualization</label>
        <label><input type="checkbox" checked={grid} onChange={e=>setGrid(e.target.checked)} />Lunar graticule</label><p>True-scale LOLA relief. Display lighting is fixed, not modeled sunlight.</p>
        <p>Imagery up to 4096 × 2048; terrain source 0.25°; display mesh 1°. Local analysis: 240 m where prepared.</p>
        {ready!==null && <small data-testid="globe-ready-time">First imagery ready in {(ready/1000).toFixed(2)} s on this browser.</small>}</div>}
    </div>
    {atlasOpen&&<AtlasPanel location={location} onClose={()=>setAtlasOpen(false)} />}
    {location && !atlasOpen && <>
      <button className="region-drawer-toggle" onClick={()=>setDrawerOpen(value=>!value)} aria-expanded={drawerOpen}>{drawerOpen?'Close region details':'Open region details'}</button>
      {drawerOpen && <aside className="region-drawer" aria-label="Selected lunar region">
        <div className="drawer-title"><span className="selection-dot"/><h2>{destination?.name ?? 'Selected location'}</h2></div>
        <p className="region-coordinate" data-testid="global-coordinate">{Math.abs(location.latitude_deg).toFixed(5)}° {location.latitude_deg<0?'S':'N'} / {Math.abs(location.latitude_deg)===90?'longitude undefined':`${location.longitude_deg.toFixed(5)}° E`}</p>
        {destination && <p>{destination.description}</p>}
        {inspecting && <p role="status">Checking scientific coverage…</p>}
        {inspectionError && <p role="alert">{inspectionError}</p>}
        {inspection && <><dl><dt>Global elevation</dt><dd data-testid="global-elevation">{inspection.elevation.value===null?'Unavailable':`${inspection.elevation.value.toLocaleString('en-US')} m`}</dd>
          <dt>Source</dt><dd>{inspection.elevation.source_id} {inspection.elevation.version}</dd><dt>Sampling</dt><dd>Containing 0.25° pixel</dd>
          <dt>Local analysis</dt><dd data-testid="local-coverage">{inspection.local_analysis?'240 m south-pole grid':inspection.local_status.replaceAll('_',' ')}</dd></dl>
          <p className="coverage-note">{inspection.local_analysis?'Elevation, derived slope and average solar visibility are available in Regional Analysis.':'Local slope, solar visibility and infrastructure placement are unavailable at this location.'}</p>
          <button className="primary-button" disabled={!inspection.local_analysis} onClick={()=>onMode('regional')}>Analyze this region</button>
          <button disabled={!inspection.planning} onClick={()=>onMode('mission')}>Design a mission here</button>
          <p className="temporal-note">Real-data mission playback unavailable. Temporal profiles are hypothetical.</p></>}
        <details><summary>Scientific sources</summary><p>Global imagery is a visualization product, not a measurement. Local and global elevation have different sampling footprints.</p>
          {metadata?.source_urls.map(url=><a key={url} href={url} target="_blank" rel="noreferrer">{url.includes('svs')?'NASA visualization source':'NASA LOLA archive'}</a>)}
          {destination && <><a href={destination.source_url} target="_blank" rel="noreferrer">Destination coordinate source</a><p>{destination.coordinate_note}</p></>}
        </details>
      </aside>}
    </>}
    <footer className="globe-attribution"><a href="https://svs.gsfc.nasa.gov/4720/" target="_blank" rel="noreferrer">NASA’s Scientific Visualization Studio</a><span>Moon / ME-PA DE421</span></footer>
  </section>;
}
