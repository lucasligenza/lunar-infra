"use client";

import { useEffect, useRef, useState } from "react";
import { missionRequest } from "./missions";
import type { Scenario } from "../types/mission";
import type { SimulationRun } from "../types/simulation";

export function useSimulation(scenario: Scenario | null) {
  const [run, setRun] = useState<SimulationRun | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const key = scenario ? `${scenario.id}:${scenario.revision}` : "";
  const latestKey = useRef(key); latestKey.current = key;
  const pendingKey = useRef<string | null>(null);
  useEffect(() => {
    setRun(null); setError(null); setNotice(null);
    if (!scenario || pendingKey.current === key) return;
    let cancelled = false;
    missionRequest<{ id: string; scenario_revision: number }[]>(`/scenarios/${scenario.id}/simulations`).then(async summaries => {
      if (cancelled || latestKey.current !== key) return;
      const current = summaries.find(value => value.scenario_revision === scenario.revision);
      if (!current) { if (summaries.length) setNotice("Saved results are from an older revision. Run again for the current configuration."); return; }
      const saved = await missionRequest<SimulationRun>(`/simulations/${current.id}`);
      if (!cancelled && latestKey.current === key) setRun(saved);
    }).catch(failure => { if (!cancelled) setError(failure.message); });
    return () => { cancelled = true; };
  }, [key]);
  async function simulate(saved: Scenario) {
    const requestKey = `${saved.id}:${saved.revision}`;
    pendingKey.current = requestKey; setBusy(true); setRun(null); setError(null); setNotice(null);
    try {
      const result = await missionRequest<SimulationRun>(`/scenarios/${saved.id}/simulations`, "POST", { revision: saved.revision });
      if (latestKey.current === requestKey) setRun(result);
    } catch (failure) { if (latestKey.current === requestKey) setError(failure instanceof Error ? failure.message : "Simulation failed."); }
    finally { pendingKey.current = null; setBusy(false); }
  }
  return { run: run?.scenario_snapshot.id === scenario?.id && run?.scenario_snapshot.revision === scenario?.revision ? run : null, busy, error, notice, simulate };
}
