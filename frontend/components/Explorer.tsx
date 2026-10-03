"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import MissionHeader, { ACTIVITIES } from "./MissionHeader";
import Icon from './ui/Icon';
import Drawer from './ui/Drawer';
import Segmented from './ui/Segmented';
import CommandPalette, { type Command } from './CommandPalette';
import HelpPanel from './HelpPanel';
import ActivityConsole from './ActivityConsole';
import { recordActivity } from '../lib/activity';
import LocationPanel from "./location/LocationPanel";
import GeologyReading from "./panels/GeologyReading";
import { fetchScientific } from "../lib/api";
import { useScenario } from "../lib/useScenario";
import { useSimulation } from "../lib/useSimulation";
import { useAtlasCatalog, overlayLayers } from '../lib/useAtlasCatalog';
import MissionInputs from "./panels/MissionInputs";
import Telemetry from "./panels/Telemetry";
import Timeline from "./mission/Timeline";
import PowerFlow from "./mission/PowerFlow";
import SimulationTutorial, { TUTORIAL_KEY } from "./mission/SimulationTutorial";
import type { AssetVisual } from "./globe/MoonCanvas";
import MissionWorkspace, { type MissionDrawer, type MissionMenu } from "./mission/MissionWorkspace";
import ScenarioControls from "./mission/ScenarioControls";
import InfrastructureCatalog, { ASSET_LABEL, MissionAssets } from "./mission/InfrastructureCatalog";
import OverlayMenu, { type Coverage } from "./overlays/OverlayMenu";
import { LAYER_PRESENTATION } from './ui/LayerPicker';
import AtlasLegend, { LayerSource } from './globe/AtlasLegend';
import AssetInspector from "./panels/AssetInspector";
import { ASSET_NAMES, type AssetKind } from "../types/mission";
import type { Dataset, LayerId, Region, Site } from "../types/scientific";
import type { Mode, GlobeLocation, CameraState, GlobeInspection, Destination } from '../types/globe';
import { toPolar } from '../lib/lunar';
import type {AtlasView,AtlasSector,AtlasAnalysisState,AtlasPoint} from '../types/atlas';
import {useSettlement} from '../lib/useSettlement';
import MissionMoon from './globe/MissionMoon';
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
  const [paletteOpen,setPaletteOpen]=useState(false),[consoleVisible,setConsoleVisible]=useState(false);
  const [helpOpen,setHelpOpen]=useState(false),[helpInitial,setHelpInitial]=useState<'help'|'tour'>('help');
  const [motion,setMotion]=useState<'system'|'reduce'>('system'),[preferencesReady,setPreferencesReady]=useState(false);
  useEffect(()=>{try{setMotion(localStorage.getItem('lunaros.motion.v1')==='reduce'?'reduce':'system');}catch{}finally{setPreferencesReady(true);}},[]);
  useEffect(()=>{document.documentElement.dataset.motion=motion;if(preferencesReady){try{localStorage.setItem('lunaros.motion.v1',motion);}catch{}}},[motion,preferencesReady]);
  function dismissGuide(){try{localStorage.setItem('lunaros.walkthrough.dismissed.v1','1');}catch{}}
  function openHelp(tour=false){setHelpInitial(tour?'tour':'help');setHelpOpen(true);}
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
  const atlas=useAtlasCatalog();
  useEffect(()=> { const requested = new URLSearchParams(window.location.search).get('mode');
    if(requested==='regional' || requested==='mission' || requested==='simulation') setMode(requested); },[]);
  const [region, setRegion] = useState<Region | null>(null);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const [layerId, setLayerId] = useState<LayerId>("elevation");
  const [grid, setGrid] = useState(true);
  const [missionGlobe,setMissionGlobe]=useState(false);
  const [site, setSite] = useState<Site | null>(null);
  const [inspecting, setInspecting] = useState(false);
  const [inspectError, setInspectError] = useState<string | null>(null);
  const [pointer, setPointer] = useState<[number, number] | null>(null);
  const [latitude, setLatitude] = useState("-89.5");
  const [longitude, setLongitude] = useState("0");
  const activeInspection = useRef<AbortController | null>(null);
  // One left menu and one right drawer; narrow screens show a single task sheet.
  const [menu,setMenu]=useState<MissionMenu>(null),[drawer,setDrawer]=useState<MissionDrawer>(null);
  const [createMission,setCreateMission]=useState(false);
  const [timelineSheet,setTimelineSheet]=useState(false);
  const [narrow,setNarrow]=useState(false);
  useEffect(()=>{const media=window.matchMedia('(max-width: 900px)');const update=()=>setNarrow(media.matches);update();media.addEventListener('change',update);return()=>media.removeEventListener('change',update);},[]);
  const isNarrow=()=>window.matchMedia('(max-width: 900px)').matches;
  function openMenu(next:MissionMenu){setMenu(next);if(next&&isNarrow())setDrawer(null);}
  function openDrawer(next:MissionDrawer){setDrawer(next);if(next&&isNarrow())setMenu(null);}
  const closeMenu=useCallback(()=>setMenu(null),[]),closeDrawer=useCallback(()=>setDrawer(null),[]);
  // Crossing into the phone layout keeps one task sheet.
  useEffect(()=>{if(narrow&&menu&&drawer)setDrawer(null);},[narrow]);
  const settlement=useSettlement();
  const scenario = useScenario(true);
  const [scenarioName, setScenarioName] = useState("South-pole outpost");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [placement, setPlacement] = useState<AssetKind | "move" | "route" | null>(null);
  const [flowExpanded,setFlowExpanded]=useState(true),[tutorialOpen,setTutorialOpen]=useState(false),[tutorialSeen,setTutorialSeen]=useState(true);
  useEffect(()=>{try{setTutorialSeen(localStorage.getItem(TUTORIAL_KEY)==='1');}catch{}},[]);
  useEffect(()=>{if(window.matchMedia('(max-width: 900px)').matches)setFlowExpanded(false);},[]);
  function closeTutorial(){setTutorialOpen(false);setTutorialSeen(true);try{localStorage.setItem(TUTORIAL_KEY,'1');}catch{}}
  const [assetDirty, setAssetDirty] = useState(false);
  const [missionDirty, setMissionDirty] = useState(false);
  const [editorEpoch, setEditorEpoch] = useState(0);
  const simulation = useSimulation(scenario.active);
  const [intervalIndex, setIntervalIndex] = useState(0);
  useEffect(() => { setIntervalIndex(0); }, [simulation.run?.id]);
  useEffect(()=>{if(simulation.run&&mode==='simulation'){setMenu(null);setDrawer(null);}},[simulation.run?.id]);
  const selectedInterval = simulation.run?.result.intervals[Math.min(intervalIndex, simulation.run.result.intervals.length - 1)];
  const selectedAsset = scenario.active?.assets.find(asset => asset.id === selectedAssetId);
  useEffect(() => { setScenarioName(scenario.active?.name ?? "South-pole outpost"); }, [scenario.active?.id, scenario.active?.name]);
  useEffect(() => { setSelectedAssetId(null); setPlacement(null);
    setDrawer(current=>current==='asset'||current==='location'?null:current);
    if (scenario.active) void inspect(scenario.active.site.longitude_deg, scenario.active.site.latitude_deg,undefined,false);
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

  async function inspect(lon: number, lat: number,domain=globalPlanning||scenario.active?.region_id==='global-atlas'?'atlas':'polar',reveal=true) {
    activeInspection.current?.abort();
    const controller = new AbortController();
    activeInspection.current = controller;
    setInspecting(true); setInspectError(null); setSite(null);setAtlasSite(null);
    try {
      if(domain==='atlas') {
        const result=await fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${lat}&longitude=${lon}`,controller.signal);
        if(!controller.signal.aborted){setAtlasSite(result);if(reveal)openDrawer('location');setInspecting(false);setLocation({latitude_deg:result.latitude_deg,longitude_deg:result.longitude_deg});setCoverage(null);setLatitude(result.latitude_deg.toFixed(5));setLongitude(result.longitude_deg.toFixed(5));}return;
      }
      const result = await fetchScientific<Site>(`/sites/inspect?latitude=${lat}&longitude=${lon}`, controller.signal);
      if (!controller.signal.aborted) {
        setSite(result);if(reveal)openDrawer('location'); setInspecting(false);
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
    openDrawer('location');
  }

  async function mapSelect(lon: number, lat: number) {
    if (scenario.busy || simulation.busy) return;
    if (placement === "route" && selectedAsset?.kind === "robot") {
      // The destination is validated against native terrain by the API like every location.
      const route = { departure_hours: 0, speed_kmh: 1, dwell_hours: 0, return_to_start: true, ...(selectedAsset.route ?? {}), destination: { latitude_deg: lat, longitude_deg: lon } };
      const updated = await scenario.editAsset(selectedAsset.id, { route });
      if (updated) { setPlacement(null); openDrawer('asset'); }
    } else if (placement === "move" && selectedAsset) {
      const updated = await scenario.editAsset(selectedAsset.id, { location: { latitude_deg: lat, longitude_deg: lon } });
      if (updated) {setPlacement(null);openDrawer('asset');}
    } else if (placement && placement !== "move" && placement !== "route") {
      const updated = await scenario.place(placement, { latitude_deg: lat, longitude_deg: lon });
      if (updated) { setMenu(null); setSelectedAssetId(updated.assets.at(-1)!.id); setPlacement(null);openDrawer('asset'); }
    } else if (discardAsset()) { setSelectedAssetId(null); void inspect(lon, lat); }
  }

  const working = scenario.busy || simulation.busy;
  function discardAsset() { return !assetDirty || window.confirm("Discard unsaved asset changes?"); }
  function discardAll() { return !(assetDirty || missionDirty || (scenario.active && scenarioName !== scenario.active.name)) || window.confirm("Discard unsaved scenario changes and reopen?"); }
  function selectAsset(id: string) { if (id === selectedAssetId || discardAsset()) { setSelectedAssetId(id);setPlacement(null);if(isNarrow())setMenu(null);openDrawer('asset'); } }
  function openMissions(create=false){setCreateMission(create);openDrawer('missions');}
  async function openScenario(id: string) {
    if (!discardAll()) return;
    const opened = await scenario.open(id);
    if (opened) { setMenu(null);setDrawer(null); setCreateMission(false); setScenarioName(opened.name); setEditorEpoch(value => value + 1);setGlobalPlanning(opened.region_id==='global-atlas'); }
  }

  const layer = region?.layers.find(value => value.id === layerId);
  const legendValue = (value: number) => layer?.unit === "fraction" ? `${(value * 100).toFixed(0)}%` :
    `${value.toLocaleString("en-US")}${layer?.unit === "deg" ? "°" : " m"}`;

  function switchMode(next:Mode) { if(next!==mode)recordActivity('MAP',`Activity changed: ${ACTIVITIES.find(activity=>activity.mode===next)?.label}`);setAtlasRequest(null);setNavigationRequest(null);setMode(next); setPlacement(null);setMenu(null);setTimelineSheet(false);
    if(next==='mission')setDrawer(selectedAssetId?'asset':null);
    if(next==='simulation'||next==='global'||next==='regional')setDrawer(null);
    const url = new URL(window.location.href); url.searchParams.set('mode',next); window.history.replaceState(null,'',url);
    if(next==='mission'||next==='simulation') {
      const global=Boolean(!region||outsideFootprint||scenario.active?.region_id==='global-atlas');setGlobalPlanning(global);
      if(location)void inspect(location.longitude_deg,location.latitude_deg,global?'atlas':'polar',false);
    }else if(next==='regional' && location && !outsideFootprint) void inspect(location.longitude_deg,location.latitude_deg,'polar');
  }
  function startMission() { switchMode('mission');openMissions(true); }
  function selectGlobal(point:GlobeLocation) { recordActivity('MAP','Location selected',`${point.latitude_deg.toFixed(5)} / ${point.longitude_deg.toFixed(5)} east-positive degrees`); activeInspection.current?.abort(); setLocation(point); setSite(null);setAtlasSite(null); setCoverage(null); }
  const projectedLocation = location && region && location.latitude_deg<=0 ? toPolar(location.longitude_deg,location.latitude_deg,region.reference_radius_m) : null;
  const outsideFootprint = location && region && (location.latitude_deg>0 || (projectedLocation &&
    (projectedLocation[0]<region.bounds_m[0] || projectedLocation[0]>=region.bounds_m[2] || projectedLocation[1]<=region.bounds_m[1] || projectedLocation[1]>region.bounds_m[3])));
  const atlasRegionalView=mode==='regional'&&Boolean(atlasRegional||outsideFootprint||(location&&!region&&!loading));
  const missionContext=mode==='mission'||mode==='simulation';
  const destinationName=destinations.find(value=>value.coordinates.latitude_deg===location?.latitude_deg&&value.coordinates.longitude_deg===location?.longitude_deg)?.name;
  const headerContext=missionContext&&scenario.active?scenario.active.name:destinationName??(location?'Selected location':mode==='global'?'Moon':'Lunar south pole');
  const globalMissionView=missionContext&&globalPlanning;
  const scenarioInView=!globalMissionView||scenario.active?.region_id==='global-atlas';
  const validLocation=globalMissionView?(atlasSite?.elevation.status==='ok'?{latitude_deg:atlasSite.latitude_deg,longitude_deg:atlasSite.longitude_deg}:null):site?.coordinates;
  const unsupportedSelection = missionContext && !globalMissionView && Boolean(outsideFootprint || (coverage && !coverage.local_analysis));
  function openAtlas(tab:string) { switchMode('global');setAtlasRequest({tab,serial:++commandSerial.current}); }
  function showLayer(layer:string) { setAtlasView({...atlasView,layer});openAtlas('layers'); }
  const canSave=Boolean(scenario.active&&scenarioName!==scenario.active.name&&scenarioName.trim());
  const runDisabled=!scenario.active?'Open a saved scenario first':working?'A request is in progress':assetDirty||missionDirty||scenarioName!==scenario.active.name?'Save name, asset and simulation input drafts first':!scenario.active.mission.illumination_factors?'Set an explicit hypothetical illumination profile in Simulate':undefined;
  const commands:Command[]=[
    ...ACTIVITIES.map(activity=>({id:activity.mode,label:`Open ${activity.label}`,group:'Activities',disabled:working?'A request is in progress':undefined,run:()=>switchMode(activity.mode)})),
    ...destinations.map(destination=>({id:destination.id,label:`Go to ${destination.name}`,group:'Lunar destinations',disabled:working?'A request is in progress':undefined,run:()=>{switchMode('global');selectGlobal(destination.coordinates);setNavigationRequest({coordinates:destination.coordinates,distance:destination.camera_distance_radii,serial:++commandSerial.current});}})),
    {id:'elevation',label:'Show elevation layer',group:'Scientific layers',run:()=>showLayer('elevation')},
    {id:'slope',label:'Show slope layer',group:'Scientific layers',run:()=>showLayer('slope')},
    {id:'catalog',label:'Open dataset catalog',group:'Scientific sources',run:()=>openAtlas('catalog')},
    {id:'analysis',label:'Open regional analysis',group:'Scientific sources',run:()=>openAtlas('analysis')},
    {id:'run',label:'Run current simulation',group:'Saved mission',disabled:runDisabled,run:async()=>{if(scenario.active&&!runDisabled){switchMode('simulation');await simulation.simulate(scenario.active);}}},
    {id:'help',label:'Open help and settings',group:'System',run:()=>openHelp()},
    {id:'tour',label:'Start walkthrough',group:'Guidance',run:()=>openHelp(true)},
    {id:'activity',label:'Open activity console',group:'System',run:()=>setConsoleVisible(true)},
  ];

  // Restrained surface cues during playback, derived only from the stored interval values.
  const run=simulation.run;
  const assetStates=useMemo<Record<string,AssetVisual>|undefined>(()=>{
    if(mode!=='simulation'||!run||!selectedInterval)return undefined;
    const states:Record<string,AssetVisual>={},short=selectedInterval.unserved_kw>1e-9;
    for(const asset of run.scenario_snapshot.assets){
      if(!asset.operational){states[asset.id]={tone:'idle',dim:true,note:'not operational'};continue;}
      if(asset.kind==='solar_array'){const kw=selectedInterval.asset_generation_kw[asset.id]??0;states[asset.id]=kw>0?{tone:'nominal',note:`generating ${kw.toFixed(2)} kW`}:{tone:'idle',dim:true,note:'no output this interval'};}
      else if(asset.kind==='battery'){const battery=selectedInterval.batteries[asset.id];if(!battery)continue;
        const low=battery.limits.includes('reserve')||battery.soc_end<=(asset.minimum_soc??0)+.02;
        states[asset.id]={tone:low?'warning':'nominal',soc:battery.soc_end,note:`${(battery.soc_end*100).toFixed(1)}% SOC at interval end${battery.charge_kw>0?' · charging':battery.discharge_kw>0?' · discharging':''}`};}
      else {const rover=selectedInterval.rovers?.[asset.id];
        states[asset.id]={tone:short?'failure':'nominal',position:rover?{latitude_deg:rover.latitude_deg,longitude_deg:rover.longitude_deg}:undefined,
          note:[short?'demand not fully served':null,rover&&asset.kind==='robot'?`${rover.state.replace('_',' ')} · ${rover.distance_from_start_km.toFixed(2)} km from start`:null].filter(Boolean).join(' · ')||undefined};}
    }
    return states;
  },[mode,run,selectedInterval]);
  const routes=useMemo(()=>(scenario.active?.assets??[]).filter(asset=>asset.kind==='robot'&&asset.route).map(asset=>({id:asset.id,from:asset.location,to:asset.route!.destination,
    moving:mode==='simulation'?Boolean(selectedInterval?.rovers?.[asset.id]?.moving):false})),[scenario.active?.assets,mode,selectedInterval]);

  // Mission overlays: prepared native polar rasters stay in 2D; other layers use the 3D surface.
  const nativeMap=!globalMissionView&&!missionGlobe;
  const missionLayers=overlayLayers(atlas.catalog,atlas.layers,atlasView.dataset);
  const missionOverlay=nativeMap?layerId:atlasView.layer;
  const missionLayer=missionLayers.find(value=>value.id===missionOverlay);
  // One aggregated point sample (finest prepared terrain + environmental rasters) feeds the location drawer and overlay coverage.
  const [missionPoint,setMissionPoint]=useState<AtlasPoint|null>(null),[missionPointError,setMissionPointError]=useState(false);
  const environmental=['illumination','temperature'].includes(missionOverlay);
  const localShell=missionContext||(mode==='regional'&&!atlasRegionalView);
  useEffect(()=>{setMissionPoint(null);setMissionPointError(false);if(!localShell||!location)return;const abort=new AbortController();
    fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${location.latitude_deg}&longitude=${location.longitude_deg}&dataset=best`,abort.signal).then(point=>{if(!abort.signal.aborted)setMissionPoint(point);}).catch(()=>{if(!abort.signal.aborted)setMissionPointError(true);});return()=>abort.abort();},[localShell,location]);
  const quantity=missionOverlay==='temperature'?missionPoint?.temperature:missionPoint?.solar_visibility;
  const missionCoverage:Coverage|null=!environmental?null:missionLayer?.preparation_status==='not_prepared'?'not-prepared':!location?'no-location':missionPointError?'error':!missionPoint?'checking':
    quantity?.status==='nodata'?'nodata':quantity?.status==='ok'?'available':'outside';
  const terrainSources=atlas.catalog.filter(value=>value.category==='terrain'&&value.pixels_per_degree&&value.numerical_queries);
  const nativeLegend=nativeMap&&layer&&<section className="map-legend" aria-label="Scientific legend"><p className="legend-name">{layer.name}</p><div className="atlas-legend"><div style={{ background: `linear-gradient(90deg, ${layer.colors.join(", ")})` }} /><p><span>{legendValue(layer.minimum)}</span><span>{legendValue(layer.maximum)}</span></p></div></section>;
  const missionOverlayMenu=<OverlayMenu layers={missionLayers} value={missionOverlay} opacity={atlasView.opacity} onClose={closeMenu} error={atlas.error} onRetry={atlas.retry}
    onChange={id=>{const source=missionLayers.find(value=>value.id===id);
      if(nativeMap&&['elevation','slope','illumination'].includes(id)){setLayerId(id as LayerId);setAtlasView({...atlasView,layer:id,tileUrl:source?.url_template,preparation:source?.preparation_status??'ready'});}
      else{setMissionGlobe(true);setAtlasView({...atlasView,layer:id,tileUrl:source?.url_template,preparation:source?.preparation_status??'ready',compare:false});}}}
    onOpacity={opacity=>setAtlasView({...atlasView,opacity})}
    legend={nativeMap?nativeLegend:missionLayer&&<AtlasLegend layer={missionLayer}/>}
    status={<p className="overlay-availability">{nativeMap?`Prepared native ${region?.resolution_m??240} m polar terrain`:missionLayer?'Rendering status is shown on the surface':'Layer metadata unavailable'}</p>}
    coverage={missionCoverage} environmentNote="Limited polar coverage; gaps remain transparent."
    onCoverage={()=>{const coordinates={latitude_deg:-89.67,longitude_deg:129.78};setMenu(null);setDrawer(null);setMissionGlobe(true);setNavigationRequest({coordinates,distance:1.08,serial:++commandSerial.current});void inspect(coordinates.longitude_deg,coordinates.latitude_deg,globalMissionView?'atlas':'polar',false);}}
    sourceDetails={<>
      {nativeMap&&layer?<div className="layer-source"><h3>{layer.name}</h3><p>{layer.description}</p><p>Colors are clipped to the legend range; transparent cells indicate missing data.</p></div>:missionLayer&&<LayerSource layer={missionLayer}/>}
      {environmental&&<p>{missionOverlay==='temperature'?'Historical Diviner summer brightness temperature, 00:00–00:15 local time. Not current surface or habitat temperature.':'Modeled long-term average solar visibility. Not a time-resolved illumination profile for power simulation.'}</p>}
      {!nativeMap&&<Segmented label="Terrain source" value={atlasView.dataset} disabled={!terrainSources.length} onChange={dataset=>setAtlasView({...atlasView,dataset})}
        options={[{value:'auto',label:'Best available'},...terrainSources.map(value=>({value:value.id,label:value.id==='gld100'?'GLD100':value.id==='lola-global'?'LOLA 0.25°':value.name,title:value.name}))]}/>}
      {nativeMap&&<label className="toggle"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />Lunar coordinate grid</label>}
      {region&&!nativeMap&&!globalMissionView&&<button onClick={()=>setMissionGlobe(false)}>Use native 2D terrain</button>}
      <p>Placement always validates against native numeric terrain; colors are visualization only.</p>
    </>}/>;

  const locationTitle=destinationName??'Selected location';
  const coordinateLabel=location&&`${Math.abs(location.latitude_deg).toFixed(5)}° ${location.latitude_deg<0?'S':'N'} / ${location.longitude_deg.toFixed(5)}° E`;
  return <main data-workspace-panel={timelineSheet?'timeline':'map'} className={`explorer mode-${mode}${atlasRegionalView?' atlas-workspace':''}`}>
    <MissionHeader mode={mode} context={headerContext}
      ready={scenario.active ? !working && !assetDirty && !missionDirty && scenarioName === scenario.active.name : Boolean(region)} busy={working} onMode={switchMode} onCommands={()=>setPaletteOpen(true)} onActivity={()=>setConsoleVisible(true)} onHelp={()=>openHelp()}
      status={scenario.active ? scenario.busy ? 'Saving…' : simulation.busy ? 'Running simulation…' : assetDirty ? 'Unsaved asset changes' : missionDirty ? 'Unsaved simulation inputs' : scenarioName !== scenario.active.name ? 'Unsaved name' : 'Saved' : region ? 'Polar data ready' : loading ? 'Loading polar data' : 'Polar data unavailable'}
      onSave={scenario.active?()=>void scenario.patch({name:scenarioName}):undefined} canSave={canSave}/>

    {(mode==='global'||atlasRegionalView) && <GlobalExplorer atlas={atlas} mission={scenario.active?{name:scenario.active.name,assets:scenario.active.assets}:null} preparedRegion={region} location={location} camera={camera} onCamera={setCamera} onSelect={selectGlobal} onCoverage={setCoverage} onMode={next=>next==='mission'?startMission():switchMode(next)} assets={scenario.active?.assets ?? []} base={scenario.active?.site ?? null}
      atlasView={atlasView} onAtlasView={setAtlasView} sector={atlasSector} onSector={setAtlasSector} analysis={atlasAnalysis} onAnalysis={setAtlasAnalysis} analysisMode={atlasRegionalView}
      settlement={settlement} atlasRequest={atlasRequest} navigationRequest={navigationRequest} onLocal={atlasRegionalView&&!outsideFootprint?()=>setAtlasRegional(false):undefined}/>}
    {unsupportedSelection && <section className="unsupported-region" aria-label="Local coverage unavailable"><h2>Local analysis unavailable here</h2><p>The selected location remains {location?.latitude_deg.toFixed(5)}° latitude / {location?.longitude_deg.toFixed(5)}° E. {coverage?.local_status==='unavailable'?'Prepared polar datasets are not loaded. Run the polar pipeline and restart the API.':coverage?.local_status==='nodata'?'The selected terrain cell has missing elevation. Choose a location with valid data.':'Prepared 240 m terrain and infrastructure placement cover the south-pole footprint only.'}</p>
      <button onClick={()=>switchMode('global')}>Return to selected global location</button>
      <button onClick={()=>{setCoverage(null); void inspect(0,-89.5);}}>Explore the prepared south pole</button></section>}
    <div className="local-shell" hidden={mode==='global' || atlasRegionalView || unsupportedSelection}>
    <MissionWorkspace menu={menu} drawer={drawer} onCloseMenu={closeMenu} onCloseDrawer={closeDrawer}
      menus={{overlays:missionOverlayMenu,
        palette:scenario.active&&scenarioInView?<InfrastructureCatalog working={working} placement={placement} onClose={closeMenu}
          onPlace={kind=>{if(discardAsset()){setSelectedAssetId(null);setPlacement(kind);setMenu(null);setDrawer(null);}}}/>:null}}
      drawers={<>
        <Drawer hidden={drawer!=='location'} label="Location" title={locationTitle} eyebrow="LOCATION" closeLabel="Close location" onClose={closeDrawer} className="location-drawer">
          <LocationPanel point={inspectError?null:missionPoint} loading={inspecting||Boolean(location&&!missionPoint&&!missionPointError)} error={inspectError??(missionPointError?'Point data could not be loaded. Retry the selection.':null)}
            mission={scenario.active&&scenarioInView?{name:scenario.active.name,assets:scenario.active.assets}:null} polarDatasets={datasets}
            focus={missionOverlay==='geology'&&<GeologyReading geology={missionPoint?.geology??null} loading={!missionPoint&&!missionPointError}/>}
            actions={mode==='regional'&&location&&<button className="primary-button" onClick={startMission}>Create mission here</button>}/>
          <details className="coordinate-entry"><summary>Go to coordinates</summary><form onSubmit={submit}>
            <label>Latitude (°)<input type="number" required min="-90" max={globalMissionView?90:0} step="any" value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
            <label>Longitude (° E)<input type="number" required min="-180" max="360" step="any" value={longitude} onChange={event => setLongitude(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={inspecting}>Inspect location</button>
            <p>Planetocentric latitude · east-positive longitude</p>
          </form></details>
        </Drawer>
        <Drawer hidden={drawer!=='asset'||!selectedAsset||!scenarioInView} label="Asset" title={selectedAsset?.name??'Asset'} eyebrow={selectedAsset?`${ASSET_LABEL[selectedAsset.kind].toUpperCase()} · HYPOTHETICAL`:undefined} closeLabel="Close asset" onClose={closeDrawer} className="asset-drawer">
          {selectedInterval && <div hidden={mode!=='simulation'}><Telemetry interval={selectedInterval} asset={selectedAsset} /></div>}
          <div hidden={mode==='simulation'&&Boolean(selectedInterval)}>{selectedAsset && <AssetInspector key={`${selectedAsset.id}:${editorEpoch}:${JSON.stringify(selectedAsset)}`} asset={selectedAsset} busy={working}
            globalDomain={globalMissionView}
            onDirty={setAssetDirty}
            onSave={changes => void scenario.editAsset(selectedAsset.id, changes)} onMove={() => {setPlacement("move");setDrawer(null);}}
            onRemove={() => { if (window.confirm(`Remove “${selectedAsset.name}”?`)) void scenario.removeAsset(selectedAsset.id); }}
            onRoute={() => { if (discardAsset()) { setPlacement("route"); setDrawer(null); } }}
            onInspect={() => { if (discardAsset()) { setSelectedAssetId(null); void inspect(selectedAsset.location.longitude_deg, selectedAsset.location.latitude_deg); } }} />}</div>
        </Drawer>
        <Drawer hidden={drawer!=='missions'} label="Missions" title={createMission||!scenario.active?'New mission':'Missions'} eyebrow="MISSION" closeLabel="Close missions" onClose={closeDrawer} className="missions-drawer">
          <ScenarioControls scenario={scenario} scenarioName={scenarioName} setScenarioName={setScenarioName}
            working={working} validLocation={validLocation??null} globalMissionView={globalMissionView} scenarioInView={scenarioInView}
            assetDirty={assetDirty} missionDirty={missionDirty} discardAll={discardAll} openScenario={openScenario}
            screened={settlement.report?.candidates.some(candidate=>candidate.latitude_deg===location?.latitude_deg&&candidate.longitude_deg===location?.longitude_deg)??false}
            createOnly={createMission} onCreateMode={setCreateMission} canSave={canSave} onSave={()=>void scenario.patch({name:scenarioName})}
            onCreated={()=>{if(mode!=='mission')switchMode('mission');setCreateMission(false);setDrawer(null);openMenu('palette');}}/>
          {scenario.active&&scenarioInView&&!createMission&&<MissionAssets scenario={scenario.active} working={working} selectedAssetId={selectedAssetId} validLocation={validLocation??null}
            onSelect={selectAsset} onBase={()=>{if(validLocation)void scenario.patch({site:validLocation});}}/>}
        </Drawer>
        <Drawer hidden={drawer!=='setup'} label="Simulation setup" title="Simulation setup" eyebrow="SIMULATE" closeLabel="Close simulation setup" onClose={closeDrawer} className="setup-drawer">
          {scenario.active && scenarioInView ? <MissionInputs key={`${scenario.active.id}:${editorEpoch}:${JSON.stringify(scenario.active.mission)}`} scenario={scenario.active}
            busy={working} blocked={assetDirty?'Save asset changes in Build before saving or running simulation inputs.':undefined} onDirty={setMissionDirty}
            onSave={mission => scenario.patch({ mission })} onRun={simulation.simulate} />:<p>Open a mission in this region first.</p>}
        </Drawer>
      </>}
      toolbar={<>
        {mode==='mission'&&scenario.active&&scenarioInView&&<button className="primary-button" aria-label="+ Add Asset" aria-expanded={menu==='palette'} disabled={working} onClick={()=>menu==='palette'?closeMenu():openMenu('palette')}><Icon name="plus"/>Add asset</button>}
        {mode==='mission'&&(!scenario.active||!scenarioInView)&&<button className="primary-button" disabled={working||!validLocation} onClick={startMission}>Create mission here</button>}
        {mode==='simulation'&&simulation.run&&<button className={tutorialSeen?'':'tutorial-invite'} onClick={()=>setTutorialOpen(true)} aria-label="How the simulation works"><Icon name="help"/><span className="optional-label">How it works</span></button>}
        {mode==='simulation'&&scenario.active&&<button className={simulation.run?'':'primary-button'} aria-expanded={drawer==='setup'} disabled={working} onClick={()=>drawer==='setup'?closeDrawer():openDrawer('setup')}><Icon name="settings"/>{simulation.run?'Setup':'Set up simulation'}</button>}
        {mode==='regional'&&<button className="primary-button" onClick={startMission}>Create mission here</button>}
        <button aria-label="Overlays" aria-expanded={menu==="overlays"} onClick={()=>menu==="overlays"?closeMenu():openMenu("overlays")}><Icon name="layers"/>Overlays{missionOverlay!=='none'&&<span className="active-overlay-name">{LAYER_PRESENTATION[missionOverlay]?.label??missionOverlay}</span>}</button>
        {missionContext&&<button aria-expanded={drawer==='missions'} disabled={working} onClick={()=>drawer==='missions'?closeDrawer():openMissions(false)}><Icon name="mission"/>Missions</button>}
        {mode==='regional'&&<button className="atlas-local-toggle" onClick={()=>{if(!location)setLocation({latitude_deg:-89.5,longitude_deg:0});setAtlasRegional(true);}}>3D analysis</button>}
        {mode==='mission'&&scenario.active&&scenarioInView&&<span className="workspace-summary" aria-label="Mission infrastructure count">{scenario.active.assets.length} assets</span>}
      </>}
      viewport={<>
        {/* One WebGL globe at a time: the mission globe mounts only while this shell is visible. */}
        {(globalMissionView||missionGlobe)&&localShell?<MissionMoon preparedRegion={region} navigationRequest={navigationRequest} location={location} assets={scenarioInView?scenario.active?.assets??[]:[]} base={scenarioInView?scenario.active?.site??null:null}
          scenarioId={scenarioInView?scenario.active?.id??null:null} selectedAssetId={selectedAssetId} placing={Boolean(placement)} camera={camera} onCamera={setCamera}
          onSelect={(lon,lat)=>void mapSelect(lon,lat)} onAssetSelect={id=>{if(!working)selectAsset(id);}} view={atlasView} onView={setAtlasView} layer={missionLayer}
          assetStates={assetStates} routes={routes}/>:
          !(globalMissionView||missionGlobe)&&region && layer && <TerrainMap opacity={atlasView.opacity} region={region} layer={layer} site={site} grid={grid}
          onSelect={(lon, lat) => void mapSelect(lon, lat)} onPointer={setPointer}
          assets={scenario.active?.assets} baseSite={scenario.active?.site} selectedAssetId={selectedAssetId}
          onAssetSelect={id => { if (!working) selectAsset(id); }} placementActive={Boolean(placement)} assetStates={assetStates} routes={routes} />}
        {mode==='simulation'&&run&&scenarioInView&&<PowerFlow run={run} index={Math.min(intervalIndex,run.result.intervals.length-1)} expanded={flowExpanded} onExpanded={setFlowExpanded} onTutorial={()=>setTutorialOpen(true)}/>}
        {nativeMap&&layer&&region&&menu!=='overlays'&&<div className="legend-chip" aria-label={`${layer.name} legend`}><strong>{layer.name}</strong><span className="legend-ramp-inline"><small>{legendValue(layer.minimum)}</small><i style={{background:`linear-gradient(90deg,${layer.colors.join(',')})`}}/><small>{legendValue(layer.maximum)}</small></span></div>}
        {scenario.error && <div className="mission-error" role="alert">{scenario.error}</div>}
        {simulation.error && <div className="mission-error" role="alert">{simulation.error}</div>}
        {simulation.notice && <div className="simulation-notice" role="status">{simulation.notice}</div>}
        {placement && <div className="placement-prompt" role="status">{placement === "move" ? "Click terrain to move the selected asset" : placement === "route" ? "Click terrain to set the rover destination" : `Click terrain to place ${ASSET_NAMES[placement].toLowerCase()}`}
          <button onClick={() => setPlacement(null)}>Cancel placement</button></div>}
        {!placement&&drawer!=='location'&&!(mode==='simulation'&&simulation.run)&&<div className="selection-strip" aria-label="Selected location summary"><Icon name="target"/><p className="region-coordinate">{coordinateLabel??'Click the surface or enter coordinates'}</p>
          <button className="region-drawer-toggle" onClick={()=>openDrawer('location')} aria-label="Open location details">{location?'Details':'Coordinates'}<Icon name="chevron"/></button></div>}
        {loading&&!globalMissionView && <div className="startup-message" role="status"><span className="loading-ring" /><h2>Loading the lunar south pole</h2>
          <p>Connecting to verified terrain and illumination datasets.</p></div>}
        {loadError&&!globalMissionView && <div className="startup-message" role="alert"><h2>Scientific data unavailable</h2><p>{loadError}</p>
          <button className="primary-button" onClick={() => setReload(value => value + 1)}>Retry connection</button>
          <p className="quiet">Start the backend and prepare the NASA datasets using the README instructions.</p></div>}
        <footer className="map-footer"><span>{globalMissionView?'Hypothetical infrastructure / native lunar terrain':pointer ? `${Math.abs(pointer[1]).toFixed(4)}° S / ${pointer[0].toFixed(4)}° E` : "Move across the map to read coordinates"}</span>
          <span>{globalMissionView?'Lunar reference sphere / source frames qualified':'Moon ME/PA DE421 · polar stereographic'}</span></footer>
      </>}/>
    {mode==='simulation'&&!scenario.active&&<div className="simulation-empty" role="status"><h2>No mission open</h2><p>Create a mission in Build, or open a saved mission from Missions.</p></div>}
    {simulation.run && scenarioInView && <div hidden={mode!=='simulation'} className="timeline-slot"><Timeline key={simulation.run.id} asset={selectedAsset} run={simulation.run} index={intervalIndex} onIndex={setIntervalIndex} active={mode==='simulation'} onExpandedChange={expanded=>{if(narrow)setTimelineSheet(expanded);}} /></div>}
    </div>
    <ActivityConsole visible={consoleVisible} onDismiss={()=>setConsoleVisible(false)}/>
    <HelpPanel open={helpOpen} initial={helpInitial} onClose={()=>{setHelpOpen(false);dismissGuide();}} motion={motion} onMotion={setMotion}
      consoleVisible={consoleVisible} onConsole={setConsoleVisible} onTips={()=>openHelp(true)}/>
    <CommandPalette open={paletteOpen} onClose={()=>setPaletteOpen(false)} commands={commands}/>
    <SimulationTutorial open={tutorialOpen&&mode==='simulation'&&Boolean(run)} onClose={closeTutorial}/>
  </main>;
}
