"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import MissionHeader, { ACTIVITIES } from "./MissionHeader";
import CommandPalette, { type Command } from './CommandPalette';
import ActivityConsole from './ActivityConsole';
import { recordActivity } from '../lib/activity';
import SiteInspector from "./panels/SiteInspector";
import { fetchScientific } from "../lib/api";
import { useScenario } from "../lib/useScenario";
import { useSimulation } from "../lib/useSimulation";
import MissionInputs from "./panels/MissionInputs";
import Telemetry from "./panels/Telemetry";
import Timeline from "./mission/Timeline";
import AssetInspector from "./panels/AssetInspector";
import { ASSET_NAMES, ASSET_SYMBOLS, type AssetKind } from "../types/mission";
import type { Dataset, LayerId, Region, Site } from "../types/scientific";
import type { Mode, GlobeLocation, CameraState, GlobeInspection, Destination } from '../types/globe';
import { toPolar } from '../lib/lunar';
import type {AtlasView,AtlasSector,AtlasAnalysisState,AtlasPoint} from '../types/atlas';
import MissionMoon from './globe/MissionMoon';
import AtlasSiteInspector from './panels/AtlasSiteInspector';
const GlobalExplorer = dynamic(()=>import('./globe/GlobalExplorer'), { ssr:false });

// OpenLayers owns browser DOM and canvas; load it only on the client.
// https://nextjs.org/docs/app/guides/lazy-loading#skipping-ssr
const TerrainMap = dynamic(() => import("./map/TerrainMap"), { ssr: false,
  loading: () => <div className="map-message" role="status">Starting map…</div> });

function errorText(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") return "The request timed out. Check the backend and retry.";
  return error instanceof Error ? error.message : "Scientific data could not be loaded. Retry after checking the backend.";
}

export default function Explorer() {
  const [paletteOpen,setPaletteOpen]=useState(false),[consoleVisible,setConsoleVisible]=useState(true);
  const [destinations,setDestinations]=useState<Destination[]>([]);
  const [atlasRequest,setAtlasRequest]=useState<{tab:string;serial:number}|null>(null);
  const [navigationRequest,setNavigationRequest]=useState<{coordinates:GlobeLocation;distance:number;serial:number}|null>(null);
  const commandSerial=useRef(0);
  useEffect(()=>{const abort=new AbortController();fetchScientific<Destination[]>('/destinations',abort.signal).then(setDestinations).catch(()=>{});return()=>abort.abort();},[]);
  useEffect(()=>{const keyboard=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==='k'&&!event.repeat){
    event.preventDefault();if(document.querySelector('dialog[open]:not(.command-palette)'))return;setPaletteOpen(value=>!value);
  }};window.addEventListener('keydown',keyboard);return()=>window.removeEventListener('keydown',keyboard);},[]);
  const [mode,setMode] = useState<Mode>('global');
  const [location,setLocation] = useState<GlobeLocation|null>(null);
  const [camera,setCamera] = useState<CameraState|null>(null);
  const [coverage,setCoverage] = useState<GlobeInspection|null>(null);
  const [globalPlanning,setGlobalPlanning]=useState(false),[atlasSite,setAtlasSite]=useState<AtlasPoint|null>(null);
  const [atlasView,setAtlasView]=useState<AtlasView>({dataset:'auto',layer:'none',opacity:.75,compare:false,reveal:.5});
  const [atlasSector,setAtlasSector]=useState<AtlasSector|null>(null),[atlasRegional,setAtlasRegional]=useState(false);
  const [atlasAnalysis,setAtlasAnalysis]=useState<AtlasAnalysisState>({radius:'25',kind:'circle',bounds:{south:'-5',north:'5',west:'350',east:'10'},endpoint:{latitude:'0',longitude:'24'},report:null,profile:null});
  const [inspectorOpen,setInspectorOpen] = useState(true);
  useEffect(()=> { const requested = new URLSearchParams(window.location.search).get('mode');
    if(requested==='regional' || requested==='mission' || requested==='simulation') setMode(requested); },[]);
  const [region, setRegion] = useState<Region | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [layerId, setLayerId] = useState<LayerId>("elevation");
  const [grid, setGrid] = useState(true);
  const [site, setSite] = useState<Site | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [pointer, setPointer] = useState<[number, number] | null>(null);
  const [latitude, setLatitude] = useState("-89.5");
  const [longitude, setLongitude] = useState("0");
  const activeInspection = useRef<AbortController | null>(null);
  const [toolsOpen, setToolsOpen] = useState(true);
  const [mobilePane,setMobilePane]=useState<'map'|'tools'|'inspector'|'timeline'>('map');
  const [narrow,setNarrow]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(max-width: 900px)');const update=()=>setNarrow(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const scenario = useScenario(true);
  const [scenarioName, setScenarioName] = useState("South-pole outpost");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<AssetKind | "move" | null>(null);
  const [assetDirty, setAssetDirty] = useState(false);
  const [missionDirty, setMissionDirty] = useState(false);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const simulation = useSimulation(scenario.active);
  const [intervalIndex, setIntervalIndex] = useState(0);
  useEffect(() => { setIntervalIndex(0); }, [simulation.run?.id]);
  const selectedInterval = simulation.run?.result.intervals[Math.min(intervalIndex, simulation.run.result.intervals.length - 1)];
  const selectedAsset = scenario.active?.assets.find(asset => asset.id === selectedAssetId);
  useEffect(() => { setScenarioName(scenario.active?.name ?? "South-pole outpost"); }, [scenario.active?.id, scenario.active?.name]);
  useEffect(() => { setSelectedAssetId(null); setPlacement(null);
    if (scenario.active) void inspect(scenario.active.site.longitude_deg, scenario.active.site.latitude_deg);
  }, [scenario.active?.id]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setLoadError(null); setRegion(null);
    Promise.all([
      fetchScientific<{ status: string }>("/health", controller.signal),
      fetchScientific<Region[]>("/regions", controller.signal),
      fetchScientific<Dataset[]>("/datasets", controller.signal),
    ]).then(([, regions, sources]) => {
      if (controller.signal.aborted) return;
      const prepared = regions.find(value => value.available);
      if (!prepared) throw new Error("No prepared region is available. Run the NASA data pipeline and restart the backend.");
      setRegion(prepared); setDatasets(sources); setLoading(false);
    }).catch(error => {
      if (controller.signal.aborted) return;
      setLoadError(errorText(error)); setLoading(false);
    });
    return () => controller.abort();
  }, [reload]);

  useEffect(() => () => activeInspection.current?.abort(), []);

  async function inspect(lon: number, lat: number,domain=globalPlanning||scenario.active?.region_id==='global-atlas'?'atlas':'polar') {
    activeInspection.current?.abort();
    const controller = new AbortController();
    activeInspection.current = controller;
    setInspecting(true); setInspectError(null); setSite(null);setAtlasSite(null);
    try {
      if(domain==='atlas') {
        const result=await fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${lat}&longitude=${lon}`,controller.signal);
        if(!controller.signal.aborted){setAtlasSite(result);setInspecting(false);setLocation({latitude_deg:result.latitude_deg,longitude_deg:result.longitude_deg});setCoverage(null);setLatitude(result.latitude_deg.toFixed(5));setLongitude(result.longitude_deg.toFixed(5));}return;
      }
      const result = await fetchScientific<Site>(`/sites/inspect?latitude=${lat}&longitude=${lon}`, controller.signal);
      if (!controller.signal.aborted) {
        setSite(result); setInspecting(false);
        setLocation({latitude_deg:result.coordinates.latitude_deg,longitude_deg:result.coordinates.longitude_deg});
        setCoverage(null);
        setLatitude(result.coordinates.latitude_deg.toFixed(5));
        setLongitude(result.coordinates.longitude_deg.toFixed(5));
      }
    } catch (error) {
      if (!controller.signal.aborted) { setInspectError(errorText(error)); setInspecting(false); }
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void inspect(Number(longitude), Number(latitude));
    setMobilePane('inspector');
  }

  async function mapSelect(lon: number, lat: number) {
    if (scenario.busy || simulation.busy) return;
    if (placement === "move" && selectedAsset) {
      const updated = await scenario.editAsset(selectedAsset.id, { location: { latitude_deg: lat, longitude_deg: lon } });
      if (updated) setPlacement(null);
    } else if (placement && placement !== "move") {
      const updated = await scenario.place(placement, { latitude_deg: lat, longitude_deg: lon });
      if (updated) { setSelectedAssetId(updated.assets.at(-1)!.id); setPlacement(null);setMobilePane('inspector'); }
    } else if (discardAsset()) { setSelectedAssetId(null); void inspect(lon, lat); }
  }

  const working = scenario.busy || simulation.busy;
  function discardAsset() { return !assetDirty || window.confirm("Discard unsaved asset changes?"); }
  function discardAll() { return !(assetDirty || missionDirty || (scenario.active && scenarioName !== scenario.active.name)) || window.confirm("Discard unsaved scenario changes and reopen?"); }
  function selectAsset(id: string) { if (id === selectedAssetId || discardAsset()) { setSelectedAssetId(id); setPlacement(null);setMobilePane('inspector'); } }
  async function openScenario(id: string) {
    if (!discardAll()) return;
    const opened = await scenario.open(id);
    if (opened) { setScenarioName(opened.name); setEditorEpoch(value => value + 1);setGlobalPlanning(opened.region_id==='global-atlas'); }
  }

  const layer = region?.layers.find(value => value.id === layerId);
  const legendValue = (value: number) => layer?.unit === "fraction" ? `${(value * 100).toFixed(0)}%` :
    `${value.toLocaleString("en-US")}${layer?.unit === "deg" ? "°" : " m"}`;

  function switchMode(next:Mode) { if(next!==mode)recordActivity('MAP',`Activity changed: ${ACTIVITIES.find(activity=>activity.mode===next)?.label}`);setAtlasRequest(null);setNavigationRequest(null);setMode(next); setPlacement(null);setMobilePane('map');
    const url = new URL(window.location.href); url.searchParams.set('mode',next); window.history.replaceState(null,'',url);
    if(next==='mission'||next==='simulation') {
      const global=Boolean(!region||outsideFootprint||scenario.active?.region_id==='global-atlas');setGlobalPlanning(global);
      if(location)void inspect(location.longitude_deg,location.latitude_deg,global?'atlas':'polar');
    }else if(next==='regional' && location && !outsideFootprint) void inspect(location.longitude_deg,location.latitude_deg,'polar');
  }
  function selectGlobal(point:GlobeLocation) { recordActivity('MAP','Location selected',`${point.latitude_deg.toFixed(5)} / ${point.longitude_deg.toFixed(5)} east-positive degrees`); activeInspection.current?.abort(); setLocation(point); setSite(null);setAtlasSite(null); setCoverage(null); }
  const projectedLocation = location && region && location.latitude_deg<=0 ? toPolar(location.longitude_deg,location.latitude_deg,region.reference_radius_m) : null;
  const outsideFootprint = location && region && (location.latitude_deg>0 || (projectedLocation &&
    (projectedLocation[0]<region.bounds_m[0] || projectedLocation[0]>=region.bounds_m[2] || projectedLocation[1]<=region.bounds_m[1] || projectedLocation[1]>region.bounds_m[3])));
  const atlasRegionalView=mode==='regional'&&Boolean(atlasRegional||outsideFootprint||(location&&!region&&!loading));
  const missionContext=mode==='mission'||mode==='simulation';
  const globalMissionView=missionContext&&globalPlanning;
  const scenarioInView=!globalMissionView||scenario.active?.region_id==='global-atlas';
  const validLocation=globalMissionView?(atlasSite?.elevation.status==='ok'?{latitude_deg:atlasSite.latitude_deg,longitude_deg:atlasSite.longitude_deg}:null):site?.coordinates;
  const unsupportedSelection = missionContext && !globalMissionView && Boolean(outsideFootprint || (coverage && !coverage.local_analysis));
  function openAtlas(tab:string) { switchMode('global');setAtlasRequest({tab,serial:++commandSerial.current}); }
  function showLayer(layer:string) { setAtlasView({...atlasView,layer});openAtlas('layers'); }
  const runDisabled=!scenario.active?'Open a saved scenario first':working?'A request is in progress':assetDirty||missionDirty||scenarioName!==scenario.active.name?'Save name, asset and simulation input drafts first':!scenario.active.mission.illumination_factors?'Set an explicit hypothetical illumination profile in Simulate':undefined;
  const commands:Command[]=[
    ...ACTIVITIES.map(activity=>({id:activity.mode,label:`Open ${activity.label}`,group:'Activities',disabled:working?'A request is in progress':undefined,run:()=>switchMode(activity.mode)})),
    ...destinations.map(destination=>({id:destination.id,label:`Go to ${destination.name}`,group:'Lunar destinations',disabled:working?'A request is in progress':undefined,run:()=>{switchMode('global');selectGlobal(destination.coordinates);setNavigationRequest({coordinates:destination.coordinates,distance:destination.camera_distance_radii,serial:++commandSerial.current});}})),
    {id:'elevation',label:'Show elevation layer',group:'Scientific layers',run:()=>showLayer('elevation')},
    {id:'slope',label:'Show slope layer',group:'Scientific layers',run:()=>showLayer('slope')},
    {id:'catalog',label:'Open dataset catalog',group:'Scientific sources',run:()=>openAtlas('catalog')},
    {id:'run',label:'Run current simulation',group:'Saved mission',disabled:runDisabled,run:async()=>{if(scenario.active&&!runDisabled){switchMode('simulation');await simulation.simulate(scenario.active);}}},
    {id:'activity',label:'Open activity console',group:'System',run:()=>setConsoleVisible(true)},
  ];
  return <main data-workspace-panel={mobilePane} className={`explorer mode-${mode}${atlasRegionalView?' atlas-workspace':''}${inspectorOpen?'':' inspector-collapsed'}`}>
    <MissionHeader mode={mode} context={scenario.active?.name ?? (location ? `${location.latitude_deg.toFixed(3)}° / ${location.longitude_deg.toFixed(3)}° E` : 'No location selected')}
      ready={Boolean(region)} busy={working} onMode={switchMode} onCommands={()=>setPaletteOpen(true)} onActivity={()=>setConsoleVisible(true)}
      status={scenario.active ? scenario.busy ? 'Saving…' : assetDirty ? 'Unsaved asset changes' : missionDirty ? 'Unsaved simulation inputs' : scenarioName !== scenario.active.name ? 'Unsaved name' : `Saved / revision ${scenario.active.revision}` : region ? 'Data ready' : loading ? 'Connecting' : 'Data unavailable'}
      onSave={scenario.active?()=>void scenario.patch({name:scenarioName}):undefined} canSave={Boolean(scenario.active&&scenarioName!==scenario.active.name&&scenarioName.trim())}/>
    {(mode==='global'||atlasRegionalView) && <GlobalExplorer location={location} camera={camera} onCamera={setCamera} onSelect={selectGlobal} onCoverage={setCoverage} onMode={switchMode} assets={scenario.active?.assets ?? []} base={scenario.active?.site ?? null}
      atlasView={atlasView} onAtlasView={setAtlasView} sector={atlasSector} onSector={setAtlasSector} analysis={atlasAnalysis} onAnalysis={setAtlasAnalysis} analysisMode={atlasRegionalView}
      atlasRequest={atlasRequest} navigationRequest={navigationRequest} onLocal={atlasRegionalView&&!outsideFootprint?()=>setAtlasRegional(false):undefined}/>}
    {unsupportedSelection && <section className="unsupported-region" aria-label="Local coverage unavailable"><h2>Local analysis unavailable here</h2><p>The selected location remains {location?.latitude_deg.toFixed(5)}° latitude / {location?.longitude_deg.toFixed(5)}° E. {coverage?.local_status==='unavailable'?'Prepared polar datasets are not loaded. Run the polar pipeline and restart the API.':coverage?.local_status==='nodata'?'The selected terrain cell has missing elevation. Choose a location with valid data.':'Prepared 240 m terrain and infrastructure placement cover the south-pole footprint only.'}</p>
      <button onClick={()=>switchMode('global')}>Return to selected global location</button>
      <button onClick={()=>{setCoverage(null); void inspect(0,-89.5);}}>Explore the prepared south pole</button></section>}
    <div className="local-shell" hidden={mode==='global' || atlasRegionalView || unsupportedSelection}>
    <nav className="mobile-navigation" aria-label="Workspace navigation">{(['map','tools','inspector'] as const).map(pane=><a key={pane} href={pane==='map'?'#terrain-workspace':pane==='tools'?'#exploration-tools':'#context-inspector'} aria-current={mobilePane===pane?'page':undefined} onClick={e=>{e.preventDefault();setMobilePane(pane);if(pane==='inspector')setInspectorOpen(true);}}>{pane==='map'?'Map':pane==='tools'?'Tools':'Inspector'}</a>)}{simulation.run&&mode==='simulation' && <a href="#mission-timeline" aria-current={mobilePane==='timeline'?'page':undefined} onClick={e=>{e.preventDefault();setMobilePane('timeline');}}>Timeline</a>}</nav>
    <div className={toolsOpen ? "workspace" : "workspace tools-collapsed"}>
      <aside id="exploration-tools" className="tool-rail" aria-label="Exploration tools">
        <div className="tool-rail-title"><h2>Workspace</h2><button aria-label={toolsOpen ? "Collapse tools" : "Expand tools"} onClick={() => setToolsOpen(value => !value)}>{toolsOpen ? "‹" : "›"}</button></div>
        {toolsOpen && <div className="map-controls-stack">
          <details open className="tool-section scenario-controls"><summary>Mission scenarios</summary>
            <label>Scenario name<input maxLength={100} value={scenarioName} onChange={event => setScenarioName(event.target.value)} /></label>
            <button className="primary-button" disabled={working || !validLocation || !scenarioName.trim()} onClick={() => {
              if (validLocation && (!(assetDirty || missionDirty) || window.confirm("Discard unsaved asset and simulation input changes?"))) void scenario.create(scenarioName, { latitude_deg: validLocation.latitude_deg, longitude_deg: validLocation.longitude_deg },globalMissionView?'global-atlas':'south-pole');
            }}>Create scenario at selected site</button>
            {!validLocation && <p>Select a valid terrain location first.</p>}
            {scenario.active&&!scenarioInView&&<p>The active scenario belongs to the polar domain. Create a global scenario here or reopen a saved scenario before placing infrastructure.</p>}
            <div className="button-row"><button disabled={working} onClick={() => void scenario.refresh()}>Refresh scenarios</button>
              {scenario.active && <button disabled={working} onClick={() => { if (discardAll()) void scenario.duplicate(); }}>Duplicate scenario</button>}</div>
            <div className="scenario-list">{scenario.scenarios.map(value => <button key={value.id} disabled={working} aria-label={`Open scenario: ${value.name}`}
              aria-pressed={value.id === scenario.active?.id} onClick={() => void openScenario(value.id)}>{value.name}<small>{value.assets.length} assets / {new Date(value.modified_at).toLocaleDateString()}</small></button>)}</div>
            {scenario.active && <button className="danger-button" disabled={working} onClick={() => {
              if (window.confirm(`Delete scenario “${scenario.active?.name}”? This cannot be undone.`)) void scenario.remove();
            }}>Delete scenario</button>}
          </details>
          {scenario.active && scenarioInView && <div hidden={mode!=='simulation'}><MissionInputs key={`${scenario.active.id}:${editorEpoch}:${JSON.stringify(scenario.active.mission)}`} scenario={scenario.active}
            busy={scenario.busy || simulation.busy || assetDirty} onDirty={setMissionDirty}
            onSave={mission => scenario.patch({ mission })} onRun={simulation.simulate} /></div>}
          {scenario.active && scenarioInView && <div hidden={mode!=='mission'}><details open className="tool-section asset-catalog"><summary>Infrastructure catalog</summary>
            <p>Hypothetical assets. Click a tool, then place it on valid terrain.</p>
            {(Object.keys(ASSET_NAMES) as AssetKind[]).map(kind => <button key={kind} disabled={working} aria-pressed={placement === kind}
              onClick={() => { if (discardAsset()) { setSelectedAssetId(null); setPlacement(kind);setMobilePane('map'); } }}><span className="asset-badge" aria-hidden="true">{ASSET_SYMBOLS[kind]}</span>Place {ASSET_NAMES[kind].toLowerCase()}</button>)}
            <div className="asset-list">{scenario.active.assets.map(asset => <button key={asset.id} aria-pressed={asset.id === selectedAssetId}
              disabled={working} onClick={() => selectAsset(asset.id)} aria-label={`Select asset: ${asset.name}`}><span>{ASSET_SYMBOLS[asset.kind]}</span>{asset.name}</button>)}</div>
            <button disabled={working || !validLocation} onClick={() => { if (validLocation) void scenario.patch({ site: { latitude_deg: validLocation.latitude_deg, longitude_deg: validLocation.longitude_deg } }); }}>Use selected location as base site</button>
          </details></div>}
          {region&&layer&&!globalMissionView&&<details open className="tool-section"><summary>Map layers</summary>
          <section className="layer-panel" aria-label="Scientific layers"><h3>Scientific layers</h3>
            <div role="radiogroup" aria-label="Active scientific layer">{region.layers.map(value => <label className={value.id === layerId ? "layer-choice selected" : "layer-choice"} key={value.id}>
              <input type="radio" name="layer" value={value.id} checked={value.id === layerId} onChange={() => setLayerId(value.id)} />
              <span className={`layer-symbol ${value.id}`} aria-hidden="true" />
              <span>{value.name}<small>{value.id === "elevation" ? "NASA LOLA" : value.id === "slope" ? "Derived terrain" : "Modeled sunlight frequency"}</small></span>
            </label>)}</div>
            <label className="grid-toggle"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />Lunar coordinate grid</label>
          </section>
          </details>}
          <details open className="tool-section"><summary>Location selection</summary>
          <section className="coordinate-panel"><h3>Inspect by coordinates</h3><form onSubmit={submit}>
            <label>Latitude (°)<input type="number" required min="-90" max={globalMissionView?90:0} step="any" value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
            <label>Longitude (° E)<input type="number" required min="-180" max="360" step="any" value={longitude} onChange={event => setLongitude(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={inspecting}>Inspect location</button>
          </form><p>Planetocentric · east-positive</p></section>
          </details>
          {region&&layer&&!globalMissionView&&<section className="map-legend" aria-label="Scientific legend"><div><strong>{layer.name}</strong><span>{layer.unit === "fraction" ? "Modeled" : layer.unit === "deg" ? "Derived" : "LOLA"}</span></div>
            <div className="legend-ramp" style={{ background: `linear-gradient(90deg, ${layer.colors.join(", ")})` }} />
            <div className="legend-values"><span>{legendValue(layer.minimum)}</span><span>{legendValue(layer.maximum)}</span></div>
            <p>{layer.description}</p><small>Colors clipped to legend range; transparent cells indicate missing data.</small>
          </section>}
          {globalMissionView&&<section className="global-mission-controls"><label>Global mission surface<select aria-label="Global mission surface" value={atlasView.layer} onChange={e=>setAtlasView({...atlasView,layer:e.target.value,compare:false})}><option value="none">NASA imagery</option><option value="elevation">Elevation coloring</option><option value="slope">Slope coloring</option><option value="geology">USGS geology (when prepared)</option></select></label>
            <p>Terrain/source measurements appear in the inspector. Color legends and complete provenance are in Lunar atlas. Coarse data does not establish site safety.</p></section>}
          <details className="tool-section input-limit"><summary>Temporal data availability</summary><p>NASA solar visibility is a long-term average. Validated time-dependent illumination is not integrated; real-data mission playback is unavailable.</p></details>
        </div>}
      </aside>
      <section id="terrain-workspace" className="map-workspace" aria-label="Terrain exploration">
        <div className="workspace-toolbar">
        {mode==='regional'&&<button className="primary-button" onClick={()=>switchMode('mission')}>Create mission here</button>}
        {mode==='mission'&&<button className="primary-button" onClick={()=>switchMode('simulation')}>Configure simulation</button>}
        {mode==='simulation'&&<button onClick={()=>switchMode('mission')}>Return to mission design</button>}
        <span>{globalMissionView?'Global mission terrain':'Lunar south-pole terrain'}</span><button className="inspector-toggle" aria-expanded={narrow?mobilePane==='inspector':inspectorOpen} onClick={()=>{if(narrow){setMobilePane('inspector');setInspectorOpen(true);}else setInspectorOpen(value=>!value);}}>{narrow?'Open inspector':inspectorOpen?'Hide inspector':'Show inspector'}</button>
        {mode==='regional'&&<button className="atlas-local-toggle" onClick={()=>{if(!location)setLocation({latitude_deg:-89.5,longitude_deg:0});setAtlasRegional(true);}}>3D atlas analysis</button>}
        </div><div className="terrain-viewport">
        {globalMissionView?<MissionMoon location={location} assets={scenarioInView?scenario.active?.assets??[]:[]} base={scenarioInView?scenario.active?.site??null:null}
          scenarioId={scenarioInView?scenario.active?.id??null:null} selectedAssetId={selectedAssetId} placing={Boolean(placement)} camera={camera} onCamera={setCamera}
          onSelect={(lon,lat)=>void mapSelect(lon,lat)} onAssetSelect={id=>{if(!working)selectAsset(id);}} view={atlasView} onView={setAtlasView}/>:
          region && layer && <TerrainMap region={region} layer={layer} site={site} grid={grid}
          onSelect={(lon, lat) => void mapSelect(lon, lat)} onPointer={setPointer}
          assets={scenario.active?.assets} baseSite={scenario.active?.site} selectedAssetId={selectedAssetId}
          onAssetSelect={id => { if (!working) selectAsset(id); }} placementActive={Boolean(placement)} />}
        {scenario.error && <div className="mission-error" role="alert">{scenario.error}</div>}
        {simulation.error && <div className="mission-error" role="alert">{simulation.error}</div>}
        {simulation.notice && <div className="simulation-notice" role="status">{simulation.notice}</div>}
        {placement && <div className="placement-prompt" role="status">{placement === "move" ? "Click terrain to move the selected asset" : `Click terrain to place ${ASSET_NAMES[placement].toLowerCase()}`}
          <button onClick={() => setPlacement(null)}>Cancel placement</button></div>}
        {loading&&!globalMissionView && <div className="startup-message" role="status"><span className="loading-ring" /><h2>Loading the lunar south pole</h2>
          <p>Connecting to verified terrain and illumination datasets.</p></div>}
        {loadError&&!globalMissionView && <div className="startup-message" role="alert"><h2>Scientific data unavailable</h2><p>{loadError}</p>
          <button className="primary-button" onClick={() => setReload(value => value + 1)}>Retry connection</button>
          <p className="quiet">Start the backend and prepare the NASA datasets using the README instructions.</p></div>}
        {region && layer && !globalMissionView && <>
          <div className="map-heading"><h2>Lunar south pole</h2><p>{((region.bounds_m[2] - region.bounds_m[0]) / 1000).toFixed(0)} km region / {region.resolution_m} m terrain grid</p></div>
          <div className="map-instruction">Drag to pan · scroll to zoom · click to inspect</div>
        </>}
        <footer className="map-footer"><span>{globalMissionView?'Hypothetical infrastructure / native lunar terrain':pointer ? `${Math.abs(pointer[1]).toFixed(4)}° S / ${pointer[0].toFixed(4)}° E` : "Move across the map to read coordinates"}</span>
          <span>{globalMissionView?'Lunar reference sphere / source frames qualified':'Moon ME/PA DE421 · polar stereographic'}</span></footer>
        </div>
      </section>
      <div id="context-inspector" className="context-rail">
      {selectedInterval && <div hidden={mode!=='simulation'||!scenarioInView}><Telemetry interval={selectedInterval} asset={selectedAsset} /></div>}
      <div hidden={mode!=='mission' || !selectedAsset||!scenarioInView}>{selectedAsset && <AssetInspector key={`${selectedAsset.id}:${editorEpoch}:${JSON.stringify(selectedAsset)}`} asset={selectedAsset} busy={working}
        globalDomain={globalMissionView}
        onDirty={setAssetDirty}
        onSave={changes => void scenario.editAsset(selectedAsset.id, changes)} onMove={() => {setPlacement("move");setMobilePane('map');}}
        onRemove={() => { if (window.confirm(`Remove “${selectedAsset.name}”?`)) void scenario.removeAsset(selectedAsset.id); }}
        onInspect={() => { if (discardAsset()) { setSelectedAssetId(null); void inspect(selectedAsset.location.longitude_deg, selectedAsset.location.latitude_deg); } }} />}</div>
      <div hidden={mode==='mission' && Boolean(selectedAsset)&&scenarioInView}>{globalMissionView?<AtlasSiteInspector point={atlasSite} loading={inspecting} error={inspectError}/>:<SiteInspector site={site} loading={inspecting} error={inspectError} datasets={datasets} />}</div>
      </div>
    </div>
    {mode==='simulation'&&!scenario.active&&<div className="simulation-empty" role="status"><h2>No mission open</h2><p>Create a scenario in Design or open a saved scenario from Tools. Simulation inputs and calculated results will appear here.</p></div>}
    {simulation.run && scenarioInView && <div hidden={mode!=='simulation'} className="timeline-slot"><Timeline key={simulation.run.id} run={simulation.run} index={intervalIndex} onIndex={setIntervalIndex} active={mode==='simulation'} /></div>}
    </div>
    <ActivityConsole visible={consoleVisible} onDismiss={()=>setConsoleVisible(false)}/>
    <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} commands={commands}/>
  </main>;
}
