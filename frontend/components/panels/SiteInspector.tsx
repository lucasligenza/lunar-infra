import type { Dataset, Measurement, Site } from "../../types/scientific";

function Quantity({ name, measurement, testId }: { name: string; measurement: Measurement; testId: string }) {
  const value = measurement.value;
  const formatted = value === null ? "Unavailable" : (measurement.unit === "fraction" ? value * 100 : value)
    .toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const unit = measurement.unit === "fraction" ? "%" : measurement.unit === "deg" ? "°" : "m";
  const kind = measurement.quantity_kind === "measured_gridded" ? "Gridded altimetry" :
    measurement.quantity_kind === "derived" ? "Derived" : "Modeled";
  return <section className="quantity">
    <div className="quantity-heading"><h3>{name}</h3><span className="quantity-kind">{kind}</span></div>
    <p className="quantity-value"><strong data-testid={testId}>{formatted}</strong>{value !== null && <span>{unit}</span>}</p>
    <p className="quantity-note">{value === null ? `Missing data (${measurement.status})` : measurement.notes}</p>
    <p className="source-id">{measurement.source_id}</p>
    <details className="method"><summary>Sampling method</summary><p>{measurement.method}</p>
      <p>Ground spacing: {measurement.resolution_m.toFixed(1)} m. Support: {measurement.support_m.toFixed(1)} m.</p>
    </details>
  </section>;
}

export default function SiteInspector({ site, loading, error, datasets }: {
  site: Site | null; loading: boolean; error: string | null; datasets: Dataset[];
}) {
  return <aside className="inspector" aria-label="Site inspector">
    <div className="inspector-title"><span className="selection-symbol" aria-hidden="true">⌖</span><div><h2>Site inspector</h2><p>Scientific measurements</p></div></div>
    <div className="inspector-content" aria-live="polite" aria-busy={loading}>
      {loading && <div className="empty-inspector"><span className="loading-ring" /><h3>Inspecting terrain</h3><p>Reading the registered NASA raster.</p></div>}
      {error && <div className="inspection-error" role="alert"><h3>Location unavailable</h3><p>{error}</p></div>}
      {!site && !loading && !error && <div className="empty-inspector"><div className="empty-crosshair" aria-hidden="true">⌖</div>
        <h3>Select a location</h3><p>Click the terrain map or enter lunar coordinates to inspect a real raster cell.</p>
        <p className="quiet">Elevation, local slope and modeled solar visibility will appear here.</p></div>}
      {site && <>
        <div className="selected-coordinate"><span>Selected location</span><p data-testid="selected-coordinate">
          {Math.abs(site.coordinates.latitude_deg).toFixed(5)}° S / {site.coordinates.longitude_defined ? `${site.coordinates.longitude_deg.toFixed(5)}° E` : "Pole (longitude undefined)"}</p>
          <small>Cell {site.sample.row}, {site.sample.column} · containing-pixel sampling</small>
        </div>
        <Quantity name="Elevation" measurement={site.elevation} testId="elevation-value" />
        <Quantity name="Local slope" measurement={site.slope} testId="slope-value" />
        <Quantity name="Solar visibility" measurement={site.solar_visibility} testId="illumination-value" />
        <details className="sample-details"><summary>Sampled cell center</summary>
          <p>{Math.abs(site.sample.center.latitude_deg).toFixed(5)}° S / {site.sample.center.longitude_deg.toFixed(5)}° E</p>
          <p>{site.sample.center.x_m.toFixed(0)} m east / {site.sample.center.y_m.toFixed(0)} m north in lunar polar projection.</p>
        </details>
      </>}
      <section className="data-sources"><h3>Data provenance</h3>
        {datasets.map(dataset => <details key={dataset.product_id}><summary>{dataset.product_id}<span>{dataset.version}</span></summary>
          <dl><dt>Dataset</dt><dd>{dataset.dataset_id}</dd><dt>Source grid</dt><dd>{dataset.source_resolution_m} m / pixel</dd>
            <dt>Prepared grid</dt><dd>{dataset.prepared_resolution_m} m / pixel</dd><dt>Frame</dt><dd>{dataset.frame}</dd>
            <dt>Observations</dt><dd>{dataset.observation_start?.slice(0, 10)} to {dataset.observation_stop?.slice(0, 10)}</dd></dl>
          {dataset.quantity_kind === "modeled" && <p>Modeled over ~{dataset.model_duration_years} years at {dataset.model_timestep_hours} h steps.
            Exact calendar interval is unspecified; observation dates describe the underlying terrain.</p>}
          <p>{dataset.processing}</p>
          {Object.entries(dataset.files).map(([name, file]) => <div className="source-file" key={name}>
            <a href={file.url} target="_blank" rel="noreferrer">NASA source: {name}</a>
            <span title={file.sha256}>SHA-256: {file.sha256.slice(0, 16)}…</span></div>)}
        </details>)}
        <p className="science-limit">240 m terrain resolves regional landforms. It cannot assess landing hazards or engineering suitability.</p>
      </section>
    </div>
  </aside>;
}
