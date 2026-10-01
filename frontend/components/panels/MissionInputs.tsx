"use client";

import { useEffect, useState } from "react";
import type { Mission, Scenario } from "../../types/mission";
import { parseSeries } from "../../lib/series";

export default function MissionInputs({ scenario, busy, blocked, onSave, onRun, onDirty }: {
  scenario: Scenario; busy: boolean; onSave: (mission: Mission) => Promise<Scenario | undefined>;
  onRun: (saved: Scenario) => Promise<void>; onDirty: (dirty: boolean) => void;
  blocked?: string;
}) {
  const original = scenario.mission;
  const [start, setStart] = useState(original.start.slice(0, 19));
  const [end, setEnd] = useState(original.end.slice(0, 19));
  const [step, setStep] = useState(original.timestep_seconds);
  const [factors, setFactors] = useState(original.illumination_factors?.join(", ") ?? "");
  const [kind, setKind] = useState(original.illumination_kind);
  const [label, setLabel] = useState(original.illumination_label);
  const [constant, setConstant] = useState(.7);
  const [error, setError] = useState<string | null>(null);
  const count = Math.round((Date.parse(`${end}Z`) - Date.parse(`${start}Z`)) / (step * 1000));
  const dirty = start !== original.start.slice(0, 19) || end !== original.end.slice(0, 19) || step !== original.timestep_seconds ||
    factors !== (original.illumination_factors?.join(", ") ?? "") || kind !== original.illumination_kind || label !== original.illumination_label;
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  function definition(): Mission | null {
    setError(null);
    const duration = Date.parse(`${end}Z`) - Date.parse(`${start}Z`);
    if (!Number.isFinite(duration) || duration <= 0 || !Number.isInteger(step) || step < 1 || step > 604800 || duration % (step * 1000) || count > 10000 || !label.trim()) {
      setError("Use a positive UTC period with 1–10000 complete, equal intervals."); return null;
    }
    let values: number[] | null;
    try { values = parseSeries(factors); }
    catch (failure) { setError((failure as Error).message); return null; }
    if (values && (values.length !== count || values.some(value => !Number.isFinite(value) || value < 0 || value > 1))) {
      setError(`Provide exactly ${count} finite electrical input factors between 0 and 1.`); return null;
    }
    return { start: `${start}Z`, end: `${end}Z`, timestep_seconds: step, illumination_kind: kind,
      illumination_label: label, illumination_factors: values };
  }
  function preset(stress: boolean) {
    if (!Number.isInteger(count) || count < 1 || count > 10000 || !Number.isFinite(constant) || constant < 0 || constant > 1) {
      setError("Set a valid mission interval count and a constant factor between 0 and 1."); return;
    }
    setFactors(Array.from({ length: count }, (_, index) => stress ? (index >= Math.floor(count / 3) && index < Math.ceil(count * 2 / 3) ? 0 : 1) : constant).join(", "));
    setKind("synthetic"); setLabel(stress ? "Synthetic stress sequence: full / zero / full output in mission thirds; not a lunar sunlight prediction" : `Synthetic constant electrical input factor ${constant}; not measured sunlight`); setError(null);
  }
  async function save(run: boolean) {
    const mission = definition(); if (!mission) return;
    if (run && !mission.illumination_factors) { setError("Choose an explicit synthetic profile or enter a complete series before running."); return; }
    const saved = dirty ? await onSave(mission) : scenario;
    if (saved && run) await onRun(saved);
  }
  return <details open className="tool-section mission-inputs"><summary>Simulation inputs</summary><div className="mission-input-form">
    <p className="warning">Real-data playback unavailable. NASA visibility is an average, not a temporal series.</p>
    <label>Mission start (UTC)<input type="datetime-local" step={1} value={start} onChange={event => setStart(event.target.value.length === 16 ? `${event.target.value}:00` : event.target.value)} /></label>
    <label>Mission end (UTC)<input type="datetime-local" step={1} value={end} onChange={event => setEnd(event.target.value.length === 16 ? `${event.target.value}:00` : event.target.value)} /></label>
    <label>Time step (seconds)<input type="number" min={1} max={604800} step={1} value={step} onChange={event => setStep(Number(event.target.value))} /></label>
    <p>{Number.isFinite(count) ? count : "Invalid"} reporting intervals / interval-average power</p>
    <label>Constant factor (0–1)<input type="number" min={0} max={1} step="any" value={constant} onChange={event => setConstant(Number(event.target.value))} /></label>
    <div className="button-row"><button disabled={busy} onClick={() => preset(false)}>Fill constant profile</button><button disabled={busy} onClick={() => preset(true)}>Apply synthetic stress profile</button></div>
    <label>Electrical input factors (one per interval)<textarea aria-label="Electrical input factors (one per interval)" value={factors} onChange={event => { setFactors(event.target.value); setKind("custom_hypothetical"); setLabel("User-defined hypothetical electrical factors; no validated temporal dataset"); }} /></label>
    <label>Input description<input maxLength={200} value={label} onChange={event => setLabel(event.target.value)} /></label>
    <p className={dirty ? "warning" : "nominal"}>{dirty ? "Unsaved simulation inputs" : "Simulation inputs saved"}</p>
    {error && <p role="alert" className="warning">{error}</p>}
    {blocked && <p className="warning">{blocked}</p>}
    <button className="secondary-button" disabled={busy || Boolean(blocked) || !dirty} onClick={() => void save(false)}>Save simulation inputs</button>
    <button className="primary-button" disabled={busy || Boolean(blocked)} title={blocked} onClick={() => void save(true)}>{busy ? "Working…" : "Run simulation"}</button>
  </div></details>;
}
