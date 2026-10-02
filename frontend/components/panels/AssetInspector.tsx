"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ASSET_NAMES, type Asset } from "../../types/mission";
import { parseSeries } from "../../lib/series";

type Parameter = { field: keyof Asset; label: string; max?: number; min?: number };
const demand: Parameter = { field: "demand_kw", label: "Continuous demand (kW)" };
const PARAMETERS: Record<Asset["kind"], Parameter[]> = {
  habitat: [demand], communications: [demand],
  solar_array: [{ field: "rated_power_kw", label: "Rated electrical power (kW)" }, { field: "derating", label: "Derating factor (0–1)", max: 1 }],
  battery: [{ field: "capacity_kwh", label: "Capacity (kWh)", min: 0.001 }, { field: "max_charge_kw", label: "Max charge power (kW)" },
    { field: "max_discharge_kw", label: "Max discharge power (kW)" }, { field: "charge_efficiency", label: "Charge efficiency (0–1)", min: .001, max: 1 },
    { field: "discharge_efficiency", label: "Discharge efficiency (0–1)", min: .001, max: 1 }, { field: "initial_soc", label: "Initial SOC (0–1)", max: 1 },
    { field: "minimum_soc", label: "Reserve SOC (0–1)", max: .999999 }],
  robot: [{ field: "active_demand_kw", label: "Active demand (kW)" }, { field: "idle_demand_kw", label: "Idle demand (kW)" }, { field: "duty_cycle", label: "Duty cycle (0–1)", max: 1 }],
};

export default function AssetInspector({ asset, busy, onSave, onMove, onRemove, onInspect, onDirty, globalDomain=false }: {
  asset: Asset; busy: boolean; onSave: (changes: object) => void; onMove: () => void; onRemove: () => void; onInspect: () => void;
  onDirty: (dirty: boolean) => void; globalDomain?:boolean;
}) {
  const [draft, setDraft] = useState(asset);
  const [profile, setProfile] = useState(asset.load_profile_kw?.join(", ") ?? "");
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(asset) || profile !== (asset.load_profile_kw?.join(", ") ?? "");
  useEffect(() => { onDirty(dirty); }, [dirty, onDirty]);
  useEffect(() => () => onDirty(false), [onDirty]);
  function submit(event: FormEvent) {
    event.preventDefault(); setError(null);
    const { id: _id, kind: _kind, ...changes } = draft;
    if (asset.kind === "habitat") {
      let values: number[] | null;
      try { values = parseSeries(profile); }
      catch (failure) { setError((failure as Error).message); return; }
      if (values?.some(value => !Number.isFinite(value) || value < 0)) { setError("Use nonnegative kW values, one per simulation interval."); return; }
      changes.load_profile_kw = values;
    }
    onSave(changes);
  }
  return <aside className="inspector asset-inspector" aria-label="Asset configuration">
    <div className="inspector-title"><span className="asset-badge">{ASSET_NAMES[asset.kind][0]}</span><div><h2>{asset.name}</h2><p>{ASSET_NAMES[asset.kind]} · hypothetical</p></div></div>
    <div className="inspector-content"><form className="configuration-form" onSubmit={submit}>
      <label>Asset name<input required maxLength={100} value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} /></label>
      <label className="checkbox-label"><input type="checkbox" checked={draft.operational} onChange={event => setDraft({ ...draft, operational: event.target.checked })} />Operational</label>
      {PARAMETERS[asset.kind].filter(parameter=>['demand_kw','rated_power_kw','capacity_kwh','initial_soc','active_demand_kw','idle_demand_kw','duty_cycle'].includes(parameter.field)).map(parameter => <label key={parameter.field}>{parameter.label}<input type="number" required step="any" min={parameter.min ?? 0} max={parameter.max ?? 1e9}
        value={draft[parameter.field] as number} onChange={event => setDraft({ ...draft, [parameter.field]: Number(event.target.value) })} /></label>)}
      <p className="asset-location">{draft.location.latitude_deg.toFixed(5)}° / {draft.location.longitude_deg.toFixed(5)}° E</p>
      <details className="asset-advanced" onInvalid={event=>{event.currentTarget.open=true;}}><summary>Advanced settings</summary>
      {PARAMETERS[asset.kind].filter(parameter=>!['demand_kw','rated_power_kw','capacity_kwh','initial_soc','active_demand_kw','idle_demand_kw','duty_cycle'].includes(parameter.field)).map(parameter=><label key={parameter.field}>{parameter.label}<input type="number" required step="any" min={parameter.min??0} max={parameter.max??1e9} value={draft[parameter.field] as number} onChange={event=>setDraft({...draft,[parameter.field]:Number(event.target.value)})}/></label>)}
      {asset.kind === "habitat" && <label>Optional load profile (kW per interval)<textarea aria-label="Optional load profile (kW per interval)" value={profile} onChange={event => setProfile(event.target.value)} placeholder="Blank uses continuous demand" /></label>}
      <fieldset><legend>{globalDomain?'Location / source lunar frame':'Location / ME-PA DE421'}</legend>
        <label>Asset latitude (°)<input type="number" required step="any" min={-90} max={globalDomain?90:0} value={draft.location.latitude_deg} onChange={event => setDraft({ ...draft, location: { ...draft.location, latitude_deg: Number(event.target.value) } })} /></label>
        <label>Asset longitude (° E)<input type="number" required step="any" min={0} max={359.999999999} value={draft.location.longitude_deg} onChange={event => setDraft({ ...draft, location: { ...draft.location, longitude_deg: Number(event.target.value) } })} /></label>
      </fieldset></details>
      <p className={dirty ? "warning" : "nominal"}>{dirty ? "Unsaved asset changes" : "Asset configuration saved"}</p>
      {error && <p role="alert" className="warning">{error}</p>}
      <button className="primary-button" disabled={busy || !dirty}>Save asset</button>
      <div className="button-row"><button type="button" disabled={busy} onClick={onMove}>Move on map</button><button type="button" onClick={onInspect}>Inspect terrain</button></div>
      <button className="danger-button" type="button" disabled={busy} onClick={onRemove}>Remove asset</button>
      <details className="engineering-notes"><summary>Engineering assumptions</summary><p>Editable assumptions, not NASA hardware specifications. Symbols mark coordinates and do not represent a physical footprint.</p></details>
    </form></div>
  </aside>;
}
