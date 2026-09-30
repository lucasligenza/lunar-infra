"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
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
import type { Mode, GlobeLocation, CameraState } from '../types/globe';
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
  const [mode,setMode] = useState<Mode>('global');
  const [location,setLocation] = useState<GlobeLocation|null>(null);
  const [camera,setCamera] = useState<CameraState|null>(null);
  const [inspectorOpen,setInspectorOpen] = useState(true);
  useEffect(()=> { const requested = new URLSearchParams(window.location.search).get('mode');
    if(requested==='regional' || requested==='mission') setMode(requested); },[]);
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
  const scenario = useScenario(Boolean(region));
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

  async function inspect(lon: number, lat: number) {
    activeInspection.current?.abort();
    const controller = new AbortController();
    activeInspection.current = controller;
    setInspecting(true); setInspectError(null); setSite(null);
    try {
      const result = await fetchScientific<Site>(`/sites/inspect?latitude=${lat}&longitude=${lon}`, controller.signal);
      if (!controller.signal.aborted) {
        setSite(result); setInspecting(false);
        setLocation({latitude_deg:result.coordinates.latitude_deg,longitude_deg:result.coordinates.longitude_deg});
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
  }

  async function mapSelect(lon: number, lat: number) {
    if (scenario.busy || simulation.busy) return;
    if (placement === "move" && selectedAsset) {
      const updated = await scenario.editAsset(selectedAsset.id, { location: { latitude_deg: lat, longitude_deg: lon } });
      if (updated) setPlacement(null);
    } else if (placement && placement !== "move") {
      const updated = await scenario.place(placement, { latitude_deg: lat, longitude_deg: lon });
      if (updated) { setSelectedAssetId(updated.assets.at(-1)!.id); setPlacement(null); }
    } else if (discardAsset()) { setSelectedAssetId(null); void inspect(lon, lat); }
  }

  const working = scenario.busy || simulation.busy;
  function discardAsset() { return !assetDirty || window.confirm("Discard unsaved asset changes?"); }
  function discardAll() { return !(assetDirty || missionDirty || (scenario.active && scenarioName !== scenario.active.name)) || window.confirm("Discard unsaved scenario changes and reopen?"); }
  function selectAsset(id: string) { if (id === selectedAssetId || discardAsset()) { setSelectedAssetId(id); setPlacement(null); } }
  async function openScenario(id: string) {
    if (!discardAll()) return;
    const opened = await scenario.open(id);
    if (opened) { setScenarioName(opened.name); setEditorEpoch(value => value + 1); }
  }

  const layer = region?.layers.find(value => value.id === layerId);
  const legendValue = (value: number) => layer?.unit === "fraction" ? `${(value * 100).toFixed(0)}%` :
    `${value.toLocaleString("en-US")}${layer?.unit === "deg" ? "°" : " m"}`;

  function switchMode(next:Mode) { setMode(next); setPlacement(null);
    const url = new URL(window.location.href); url.searchParams.set('mode',next); window.history.replaceState(null,'',url);
    if(next!=='global' && location) void inspect(location.longitude_deg,location.latitude_deg);
  }
  function selectGlobal(point:GlobeLocation) { setLocation(point); setSite(null); }
  return <main className={`explorer mode-${mode}${inspectorOpen?'':' inspector-collapsed'}`}>
    <header className="app-header"><div className="brand"><span className="brand-orbit" aria-hidden="true" /><h1>Lunar<span>OS</span></h1>
      <span className="header-divider" /><p>{scenario.active?.name ?? 'Lunar exploration'}<small>{mode==='global'?'Global NASA visualization':mode==='regional'?'Scientific regional analysis':'Hypothetical mission design'}</small></p></div>
      <nav className="mode-navigation" aria-label="Viewing mode">{([['global','Global Explorer'],['regional','Regional Analysis'],['mission','Mission Designer']] as const).map(([value,label])=><button key={value} aria-pressed={mode===value} onClick={()=>switchMode(value)}>{label}</button>)}</nav>
      <div className="header-status"><span className={region ? "status-dot ready" : "status-dot"} />
        {scenario.active ? scenario.busy ? "Saving…" : assetDirty ? "Unsaved asset changes" : missionDirty ? "Unsaved simulation inputs" : scenarioName !== scenario.active.name ? "Unsaved name" : `Saved / revision ${scenario.active.revision}` : region ? "Verified NASA data" : loading ? "Connecting to scientific API" : "Data unavailable"}
        {scenario.active && <button className="primary-button" disabled={working || scenarioName === scenario.active.name || !scenarioName.trim()} onClick={() => void scenario.patch({ name: scenarioName })}>Save scenario</button>}
        <span className="phase-label">South pole / ME-PA DE421</span></div>
    </header>
    {mode==='global' && <GlobalExplorer location={location} camera={camera} onCamera={setCamera} onSelect={selectGlobal} onMode={switchMode} assets={scenario.active?.assets ?? []} base={scenario.active?.site ?? null} />}
    <div className="local-shell" hidden={mode==='global'}>
    <nav className="mobile-navigation" aria-label="Workspace navigation"><a href="#terrain-workspace">Map</a><a href="#exploration-tools">Tools</a><a href="#context-inspector">Inspector</a>{simulation.run && <a href="#mission-timeline">Timeline</a>}</nav>
    <div className={toolsOpen ? "workspace" : "workspace tools-collapsed"}>
      <aside id="exploration-tools" className="tool-rail" aria-label="Exploration tools">
        <div className="tool-rail-title"><h2>Workspace</h2><button aria-label={toolsOpen ? "Collapse tools" : "Expand tools"} onClick={() => setToolsOpen(value => !value)}>{toolsOpen ? "‹" : "›"}</button></div>
        {toolsOpen && region && layer && <div className="map-controls-stack">
          <details open className="tool-section scenario-controls"><summary>Mission scenarios</summary>
            <label>Scenario name<input maxLength={100} value={scenarioName} onChange={event => setScenarioName(event.target.value)} /></label>
            <button className="primary-button" disabled={working || !site || !scenarioName.trim()} onClick={() => {
              if (site && (!(assetDirty || missionDirty) || window.confirm("Discard unsaved asset and simulation input changes?"))) void scenario.create(scenarioName, { latitude_deg: site.coordinates.latitude_deg, longitude_deg: site.coordinates.longitude_deg });
            }}>Create scenario at selected site</button>
            {!site && <p>Select a valid terrain location first.</p>}
            <div className="button-row"><button disabled={working} onClick={() => void scenario.refresh()}>Refresh scenarios</button>
              {scenario.active && <button disabled={working} onClick={() => { if (discardAll()) void scenario.duplicate(); }}>Duplicate scenario</button>}</div>
            <div className="scenario-list">{scenario.scenarios.map(value => <button key={value.id} disabled={working} aria-label={`Open scenario: ${value.name}`}
              aria-pressed={value.id === scenario.active?.id} onClick={() => void openScenario(value.id)}>{value.name}<small>{value.assets.length} assets / {new Date(value.modified_at).toLocaleDateString()}</small></button>)}</div>
            {scenario.active && <button className="danger-button" disabled={working} onClick={() => {
              if (window.confirm(`Delete scenario “${scenario.active?.name}”? This cannot be undone.`)) void scenario.remove();
            }}>Delete scenario</button>}
          </details>
          {scenario.active && <MissionInputs key={`${scenario.active.id}:${editorEpoch}:${JSON.stringify(scenario.active.mission)}`} scenario={scenario.active}
            busy={scenario.busy || simulation.busy || assetDirty} onDirty={setMissionDirty}
            onSave={mission => scenario.patch({ mission })} onRun={simulation.simulate} />}
          {scenario.active && <details open className="tool-section asset-catalog"><summary>Infrastructure catalog</summary>
            <p>Hypothetical assets. Click a tool, then place it on valid terrain.</p>
            {(Object.keys(ASSET_NAMES) as AssetKind[]).map(kind => <button key={kind} disabled={working} aria-pressed={placement === kind}
              onClick={() => { if (discardAsset()) { setSelectedAssetId(null); setPlacement(kind); } }}><span className="asset-badge" aria-hidden="true">{ASSET_SYMBOLS[kind]}</span>Place {ASSET_NAMES[kind].toLowerCase()}</button>)}
            <div className="asset-list">{scenario.active.assets.map(asset => <button key={asset.id} aria-pressed={asset.id === selectedAssetId}
              disabled={working} onClick={() => selectAsset(asset.id)} aria-label={`Select asset: ${asset.name}`}><span>{ASSET_SYMBOLS[asset.kind]}</span>{asset.name}</button>)}</div>
            <button disabled={working || !site} onClick={() => { if (site) void scenario.patch({ site: { latitude_deg: site.coordinates.latitude_deg, longitude_deg: site.coordinates.longitude_deg } }); }}>Use selected location as base site</button>
          </details>}
          <details open className="tool-section"><summary>Map layers</summary>
          <section className="layer-panel" aria-label="Scientific layers"><h3>Scientific layers</h3>
            <div role="radiogroup" aria-label="Active scientific layer">{region.layers.map(value => <label className={value.id === layerId ? "layer-choice selected" : "layer-choice"} key={value.id}>
              <input type="radio" name="layer" value={value.id} checked={value.id === layerId} onChange={() => setLayerId(value.id)} />
              <span className={`layer-symbol ${value.id}`} aria-hidden="true" />
              <span>{value.name}<small>{value.id === "elevation" ? "NASA LOLA" : value.id === "slope" ? "Derived terrain" : "Modeled sunlight frequency"}</small></span>
            </label>)}</div>
            <label className="grid-toggle"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />Lunar coordinate grid</label>
          </section>
          </details>
          <details open className="tool-section"><summary>Location selection</summary>
          <section className="coordinate-panel"><h3>Inspect by coordinates</h3><form onSubmit={submit}>
            <label>Latitude (°)<input type="number" required min="-90" max="0" step="any" value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
            <label>Longitude (° E)<input type="number" required min="-180" max="360" step="any" value={longitude} onChange={event => setLongitude(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={inspecting}>Inspect location</button>
          </form><p>Planetocentric · east-positive</p></section>
          </details>
          <section className="map-legend" aria-label="Scientific legend"><div><strong>{layer.name}</strong><span>{layer.unit === "fraction" ? "Modeled" : layer.unit === "deg" ? "Derived" : "LOLA"}</span></div>
            <div className="legend-ramp" style={{ background: `linear-gradient(90deg, ${layer.colors.join(", ")})` }} />
            <div className="legend-values"><span>{legendValue(layer.minimum)}</span><span>{legendValue(layer.maximum)}</span></div>
            <p>{layer.description}</p><small>Colors clipped to legend range; transparent cells indicate missing data.</small>
          </section>
          <details className="tool-section input-limit"><summary>Temporal data availability</summary><p>NASA solar visibility is a long-term average. Validated time-dependent illumination is not integrated; real-data mission playback is unavailable.</p></details>
        </div>}
      </aside>
      <section id="terrain-workspace" className="map-workspace" aria-label="Terrain exploration">
        <button className="inspector-toggle" aria-expanded={inspectorOpen} onClick={()=>setInspectorOpen(value=>!value)}>{inspectorOpen?'Hide inspector':'Show inspector'}</button>
        {region && layer && <TerrainMap region={region} layer={layer} site={site} grid={grid}
          onSelect={(lon, lat) => void mapSelect(lon, lat)} onPointer={setPointer}
          assets={scenario.active?.assets} baseSite={scenario.active?.site} selectedAssetId={selectedAssetId}
          onAssetSelect={id => { if (!working) selectAsset(id); }} placementActive={Boolean(placement)} />}
        {scenario.error && <div className="mission-error" role="alert">{scenario.error}</div>}
        {simulation.error && <div className="mission-error" role="alert">{simulation.error}</div>}
        {simulation.notice && <div className="simulation-notice" role="status">{simulation.notice}</div>}
        {placement && <div className="placement-prompt" role="status">{placement === "move" ? "Click terrain to move the selected asset" : `Click terrain to place ${ASSET_NAMES[placement].toLowerCase()}`}
          <button onClick={() => setPlacement(null)}>Cancel placement</button></div>}
        {loading && <div className="startup-message" role="status"><span className="loading-ring" /><h2>Loading the lunar south pole</h2>
          <p>Connecting to verified terrain and illumination datasets.</p></div>}
        {loadError && <div className="startup-message" role="alert"><h2>Scientific data unavailable</h2><p>{loadError}</p>
          <button className="primary-button" onClick={() => setReload(value => value + 1)}>Retry connection</button>
          <p className="quiet">Start the backend and prepare the NASA datasets using the README instructions.</p></div>}
        {region && layer && <>
          <div className="map-heading"><h2>Lunar south pole</h2><p>{((region.bounds_m[2] - region.bounds_m[0]) / 1000).toFixed(0)} km region / {region.resolution_m} m terrain grid</p></div>
          <div className="map-instruction">Drag to pan · scroll to zoom · click to inspect</div>
        </>}
        <footer className="map-footer"><span>{pointer ? `${Math.abs(pointer[1]).toFixed(4)}° S / ${pointer[0].toFixed(4)}° E` : "Move across the map to read coordinates"}</span>
          <span>Moon ME/PA DE421 · polar stereographic</span></footer>
      </section>
      <div id="context-inspector" className="context-rail">
      {selectedInterval && <Telemetry interval={selectedInterval} asset={selectedAsset} />}
      {selectedAsset ? <AssetInspector key={`${selectedAsset.id}:${editorEpoch}:${JSON.stringify(selectedAsset)}`} asset={selectedAsset} busy={working}
        onDirty={setAssetDirty}
        onSave={changes => void scenario.editAsset(selectedAsset.id, changes)} onMove={() => setPlacement("move")}
        onRemove={() => { if (window.confirm(`Remove “${selectedAsset.name}”?`)) void scenario.removeAsset(selectedAsset.id); }}
        onInspect={() => { if (discardAsset()) { setSelectedAssetId(null); void inspect(selectedAsset.location.longitude_deg, selectedAsset.location.latitude_deg); } }} /> :
        <SiteInspector site={site} loading={inspecting} error={inspectError} datasets={datasets} />}
      </div>
    </div>
    {simulation.run && <Timeline key={simulation.run.id} run={simulation.run} index={intervalIndex} onIndex={setIntervalIndex} />}
    </div>
  </main>;
}
