"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import dynamic from "next/dynamic";
import SiteInspector from "./panels/SiteInspector";
import { fetchScientific } from "../lib/api";
import type { Dataset, LayerId, Region, Site } from "../types/scientific";

// OpenLayers owns browser DOM and canvas; load it only on the client.
// https://nextjs.org/docs/app/guides/lazy-loading#skipping-ssr
const TerrainMap = dynamic(() => import("./map/TerrainMap"), { ssr: false,
  loading: () => <div className="map-message" role="status">Starting map…</div> });

function errorText(error: unknown): string {
  if (error instanceof Error && error.name === "TimeoutError") return "The request timed out. Check the backend and retry.";
  return error instanceof Error ? error.message : "Scientific data could not be loaded. Retry after checking the backend.";
}

export default function Explorer() {
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

  const layer = region?.layers.find(value => value.id === layerId);
  const legendValue = (value: number) => layer?.unit === "fraction" ? `${(value * 100).toFixed(0)}%` :
    `${value.toLocaleString("en-US")}${layer?.unit === "deg" ? "°" : " m"}`;

  return <main className="explorer">
    <header className="app-header"><div className="brand"><span className="brand-orbit" aria-hidden="true" /><h1>Lunar<span>OS</span></h1>
      <span className="header-divider" /><p>South-pole data explorer</p></div>
      <div className="header-status"><span className={region ? "status-dot ready" : "status-dot"} />
        {region ? "Verified NASA data" : loading ? "Connecting to scientific API" : "Data unavailable"}<span className="phase-label">Phase 1</span></div>
    </header>
    <div className="workspace">
      <section className="map-workspace" aria-label="Terrain exploration">
        {region && layer && <TerrainMap region={region} layer={layer} site={site} grid={grid}
          onSelect={(lon, lat) => void inspect(lon, lat)} onPointer={setPointer} />}
        {loading && <div className="startup-message" role="status"><span className="loading-ring" /><h2>Loading the lunar south pole</h2>
          <p>Connecting to verified terrain and illumination datasets.</p></div>}
        {loadError && <div className="startup-message" role="alert"><h2>Scientific data unavailable</h2><p>{loadError}</p>
          <button className="primary-button" onClick={() => setReload(value => value + 1)}>Retry connection</button>
          <p className="quiet">Start the backend and prepare the NASA datasets using the README instructions.</p></div>}
        {region && layer && <>
          <div className="map-heading"><h2>Lunar south pole</h2><p>{((region.bounds_m[2] - region.bounds_m[0]) / 1000).toFixed(0)} km region / {region.resolution_m} m terrain grid</p></div>
          <div className="map-controls-stack">
          <section className="layer-panel" aria-label="Scientific layers"><h3>Scientific layers</h3>
            <div role="radiogroup" aria-label="Active scientific layer">{region.layers.map(value => <label className={value.id === layerId ? "layer-choice selected" : "layer-choice"} key={value.id}>
              <input type="radio" name="layer" value={value.id} checked={value.id === layerId} onChange={() => setLayerId(value.id)} />
              <span className={`layer-symbol ${value.id}`} aria-hidden="true" />
              <span>{value.name}<small>{value.id === "elevation" ? "NASA LOLA" : value.id === "slope" ? "Derived terrain" : "Modeled sunlight frequency"}</small></span>
            </label>)}</div>
            <label className="grid-toggle"><input type="checkbox" checked={grid} onChange={event => setGrid(event.target.checked)} />Lunar coordinate grid</label>
          </section>
          <section className="coordinate-panel"><h3>Inspect by coordinates</h3><form onSubmit={submit}>
            <label>Latitude (°)<input type="number" required min="-90" max="0" step="any" value={latitude} onChange={event => setLatitude(event.target.value)} /></label>
            <label>Longitude (° E)<input type="number" required min="-180" max="360" step="any" value={longitude} onChange={event => setLongitude(event.target.value)} /></label>
            <button className="primary-button" type="submit" disabled={inspecting}>Inspect location</button>
          </form><p>Planetocentric · east-positive</p></section>
          <section className="map-legend" aria-label="Scientific legend"><div><strong>{layer.name}</strong><span>{layer.unit === "fraction" ? "Modeled" : layer.unit === "deg" ? "Derived" : "LOLA"}</span></div>
            <div className="legend-ramp" style={{ background: `linear-gradient(90deg, ${layer.colors.join(", ")})` }} />
            <div className="legend-values"><span>{legendValue(layer.minimum)}</span><span>{legendValue(layer.maximum)}</span></div>
            <p>{layer.description}</p><small>Colors clipped to legend range; transparent cells indicate missing data.</small>
          </section>
          </div>
          <div className="map-instruction">Drag to pan · scroll to zoom · click to inspect</div>
        </>}
        <footer className="map-footer"><span>{pointer ? `${Math.abs(pointer[1]).toFixed(4)}° S / ${pointer[0].toFixed(4)}° E` : "Move across the map to read coordinates"}</span>
          <span>Moon ME/PA DE421 · polar stereographic</span></footer>
      </section>
      <SiteInspector site={site} loading={inspecting} error={inspectError} datasets={datasets} />
    </div>
  </main>;
}
