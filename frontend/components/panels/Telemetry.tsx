import type { Asset } from "../../types/mission";
import type { Interval } from "../../types/simulation";

const number = (value: number) => value.toFixed(2);
const available = (value: number | undefined) => value === undefined ? "Unavailable" : number(value);
export default function Telemetry({ interval, asset }: { interval: Interval; asset?: Asset }) {
  const battery = asset ? interval.batteries[asset.id] : undefined;
  return <section className="telemetry" aria-label="Simulated telemetry">
    <div className="telemetry-heading"><h2>Simulated conditions</h2><span className={interval.constraint_violations.length ? "failure" : "nominal"}>{interval.constraint_violations.length ? "Power shortage" : "Demand served"}</span></div>
    <p>{new Date(interval.start).toISOString().replace(".000Z", " UTC")} to {new Date(interval.end).toISOString().replace(".000Z", " UTC")}</p>
    <dl><dt>Generation</dt><dd><strong data-testid="inspector-telemetry-generation">{number(interval.generation_kw)}</strong> kW</dd>
      <dt>Demand</dt><dd><strong data-testid="inspector-telemetry-demand">{number(interval.demand_kw)}</strong> kW</dd>
      <dt>Battery SOC at interval end</dt><dd data-testid="inspector-telemetry-soc">{interval.soc_end === null ? "No batteries" : `${number(interval.soc_end * 100)}%`}</dd>
      <dt>Stored energy at end</dt><dd>{number(interval.energy_end_kwh)} kWh</dd>
      <dt>Unserved demand</dt><dd className={interval.unserved_kw > 0 ? "failure" : ""} data-testid="inspector-telemetry-unserved">{number(interval.unserved_kw)} kW</dd>
      <dt>Curtailed generation</dt><dd>{number(interval.curtailed_kw)} kW</dd>
      <dt>Battery losses</dt><dd>{number(interval.losses_kwh)} kWh</dd></dl>
    <small>Power is interval-averaged. Aggregate storage includes inactive batteries.</small>
    {asset && <div className="asset-telemetry"><h3>{asset.name}</h3>
      {asset.kind === "solar_array" && <p>Generation: {available(interval.asset_generation_kw[asset.id])} kW</p>}
      {asset.kind !== "solar_array" && asset.kind !== "battery" && <p>Demand: {available(interval.asset_load_kw[asset.id])} kW</p>}
      {battery && <><p>SOC at end: {number(battery.soc_end * 100)}%</p><p>Charge / discharge: {number(battery.charge_kw)} / {number(battery.discharge_kw)} kW</p>
        {battery.limits.length > 0 && <p className="warning">Limits reached: {battery.limits.join(", ")}</p>}</>}
    </div>}
  </section>;
}
