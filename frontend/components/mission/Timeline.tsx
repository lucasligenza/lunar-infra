"use client";

import { useEffect, useRef, useState } from "react";
import type { Interval, SimulationRun } from "../../types/simulation";

function Chart({ title, rows, values, unit, color, selected, onSelect, battery = false }: {
  title: string; rows: Interval[]; values: number[]; unit: string; color: string; selected: number; onSelect: (index: number) => void; battery?: boolean;
}) {
  const maximum = battery ? 100 : Math.max(1, ...values);
  const x = (index: number) => 35 + index / Math.max(1, rows.length - 1) * 425;
  const y = (value: number) => 83 - value / maximum * 65;
  const points = values.map((value, index) => index && !battery ? `H${x(index).toFixed(2)} V${y(value).toFixed(2)}` : `${index ? "L" : "M"}${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(" ");
  const position = rows.findIndex(row => row.index === selected);
  const pick = (fraction: number) => onSelect(rows[Math.round(Math.max(0, Math.min(1, fraction)) * (rows.length - 1))].index);
  return <div className="timeline-chart"><div><h3>{title}</h3><span>{unit}</span></div>
    <svg viewBox="0 0 480 108" role="button" tabIndex={0} aria-label={`${title} chart: click or use arrow keys to inspect`}
      onClick={event => { const box = event.currentTarget.getBoundingClientRect(); pick(((event.clientX - box.left) / box.width * 480 - 35) / 425); }}
      onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); onSelect(Math.max(rows[0].index, Math.min(rows.at(-1)!.index, selected + (event.key === "ArrowRight" ? 1 : -1)))); } }}>
      <line x1="35" x2="460" y1="83" y2="83" stroke="var(--border)" /><line x1="35" x2="460" y1="18" y2="18" stroke="var(--border)" strokeDasharray="3 5" />
      <text x="1" y="24">{maximum.toFixed(0)}</text><text x="15" y="85">0</text>
      {rows.map((row, index) => row.unserved_kw > 0 && <rect key={row.index} x={x(index)} y="18" width={425 / Math.max(1, rows.length)} height="65" fill="var(--failure)" opacity=".12" />)}
      <path d={points} fill="none" stroke={color} strokeWidth="2" />
      {position >= 0 && <><line x1={x(position)} x2={x(position)} y1="12" y2="88" stroke="var(--ink)" strokeDasharray="3 3" /><circle cx={x(position)} cy={y(values[position])} r="3" fill={color} /></>}
      <text x="35" y="104">{new Date(battery ? rows[0].end : rows[0].start).toISOString().slice(5, 16).replace("T", " ")}</text>
      <text x="460" y="104" textAnchor="end">{new Date(battery ? rows.at(-1)!.end : rows.at(-1)!.start).toISOString().slice(5, 16).replace("T", " ")} UTC</text>
    </svg>
  </div>;
}

export default function Timeline({ run, index, onIndex, active = true }: { run: SimulationRun; index: number; onIndex: (index: number) => void; active?: boolean }) {
  const [expanded, setExpanded] = useState(true);
  const [playing, setPlaying] = useState(false);
  useEffect(()=>{if(!active) setPlaying(false);},[active]);
  const [speed, setSpeed] = useState(1);
  const [windowSize, setWindowSize] = useState(0);
  const position = useRef(index); position.current = index;
  const rows = run.result.intervals;
  const current = rows[Math.min(index, rows.length - 1)];
  const start = windowSize ? Math.max(0, Math.min(rows.length - windowSize, index - Math.floor(windowSize / 2))) : 0;
  const visible = windowSize ? rows.slice(start, start + windowSize) : rows;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const next = Math.min(rows.length - 1, position.current + speed);
      onIndex(next); if (next === rows.length - 1) setPlaying(false);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, speed, rows.length, onIndex]);
  function select(value: number) { setPlaying(false); onIndex(value); }
  const events = run.result.events.filter(event => event.interval_index >= visible[0].index && event.interval_index <= visible.at(-1)!.index).slice(0, 100);
  const summary = run.result.summary;
  return <section id="mission-timeline" className={expanded ? "mission-timeline expanded" : "mission-timeline"} aria-label="Mission timeline">
    <div className="timeline-toolbar"><button className="timeline-toggle" onClick={() => setExpanded(value => !value)} aria-label={expanded ? "Collapse timeline" : "Expand timeline"}>{expanded ? "⌄" : "⌃"} Mission timeline</button>
      <span className="input-source-tag">{run.result.input_kind === "synthetic" ? "Synthetic demonstration" : "Hypothetical custom input"}</span>
      <button onClick={() => { if (index === rows.length - 1) onIndex(0); setPlaying(value => !value); }}>{playing ? "Pause playback" : "Play mission"}</button>
      <label>Playback speed<select aria-label="Playback speed" value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={1}>1 interval / second</option><option value={4}>4 intervals / second</option><option value={16}>16 intervals / second</option></select></label>
      <span className="timeline-time" data-testid="timeline-time">{current.start.replace("T", " ").replace("Z", " UTC")}</span>
    </div>
    {expanded && <>
      <div className="timeline-scrub"><input type="range" aria-label="Mission interval" min={0} max={rows.length - 1} step={1} value={index} onChange={event => select(Number(event.target.value))} />
        <span>Interval {index + 1} / {rows.length}</span><label>Chart window<select aria-label="Chart window" value={windowSize} onChange={event => setWindowSize(Number(event.target.value))}><option value={0}>Entire mission</option><option value={12}>12 intervals</option><option value={48}>48 intervals</option></select></label></div>
      <div className="timeline-charts"><Chart title="Electrical generation" rows={visible} values={visible.map(row => row.generation_kw)} unit="kW" color="var(--accent)" selected={index} onSelect={select} />
        <Chart title="Electrical demand" rows={visible} values={visible.map(row => row.demand_kw)} unit="kW" color="var(--warning)" selected={index} onSelect={select} />
        {current.soc_end === null ? <div className="timeline-chart no-storage"><h3>Battery state of charge</h3><p>No batteries installed</p></div> :
          <Chart title="Battery SOC at interval end" rows={visible} values={visible.map(row => row.soc_end! * 100)} unit="%" color="var(--nominal)" selected={index} onSelect={select} battery />}</div>
      <div className="timeline-summary"><span>Unserved: <strong className={summary.unserved_kwh > 0 ? "failure" : "nominal"}>{summary.unserved_kwh.toFixed(2)} kWh</strong></span>
        <span>Curtailed: {summary.curtailed_kwh.toFixed(2)} kWh</span><span>Losses: {summary.battery_losses_kwh.toFixed(2)} kWh</span>
        <span>Balance residual: {summary.energy_balance_error_kwh.toExponential(2)} kWh</span>
        {summary.first_power_shortage && <button className="event-shortage" onClick={() => { const event = run.result.events.find(value => value.kind === "power_shortage"); if (event) select(Math.min(rows.length - 1, event.interval_index)); }}>First shortage: {summary.first_power_shortage.replace("T", " ").replace("Z", " UTC")}</button>}
      </div>
      <details className="mission-events"><summary>Mission events ({run.result.events.length}) / input provenance</summary>
        <div className="event-list">{events.map((event, eventIndex) => <button key={`${event.time}:${eventIndex}`} className={event.kind === "power_shortage" ? "event-shortage" : ""}
          onClick={() => select(Math.min(rows.length - 1, event.interval_index))}>{event.time.replace("T", " ").replace("Z", " UTC")} · {event.message}</button>)}</div>
        <p>Showing up to 100 events in the chart window. Event times can fall inside an interval; displayed telemetry is averaged over that interval.</p>
        <p>{run.result.input_label}</p><p>Model {run.result.model_version} / scenario revision {run.scenario_snapshot.revision}</p>
        <p>Input SHA-256: {run.input_sha256}</p><p>Result SHA-256: {run.result_sha256}</p>
        {run.result.assumptions.map(assumption => <p key={assumption}>{assumption}</p>)}
      </details>
    </>}
  </section>;
}
