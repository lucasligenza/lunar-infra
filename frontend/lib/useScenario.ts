"use client";

import { useCallback, useEffect, useState } from "react";
import { missionRequest } from "./missions";
import type { AssetKind, Location, Scenario } from "../types/mission";

export function useScenario(available: boolean) {
  const [active, setActive] = useState<Scenario | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const accept = useCallback((scenario: Scenario) => {
    setActive(scenario);
    setScenarios(items => [scenario, ...items.filter(value => value.id !== scenario.id)]);
    return scenario;
  }, []);
  const execute = useCallback(async <T,>(operation: () => Promise<T>): Promise<T | undefined> => {
    setBusy(true); setError(null);
    try { return await operation(); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "The mission action failed."); }
    finally { setBusy(false); }
  }, []);
  const refresh = useCallback(() => execute(async () => setScenarios(await missionRequest<Scenario[]>("/scenarios"))), [execute]);
  useEffect(() => { if (available) void refresh(); }, [available, refresh]);
  const open = (id: string) => execute(async () => accept(await missionRequest<Scenario>(`/scenarios/${id}`)));
  const create = (name: string, site: Location,region_id='south-pole') => execute(async () => accept(await missionRequest<Scenario>("/scenarios", "POST", { name, site,region_id })));
  const patch = (changes: Partial<Pick<Scenario, "name" | "site" | "mission">>) => execute(async () => {
    if (!active) throw new Error("Open a scenario first.");
    return accept(await missionRequest<Scenario>(`/scenarios/${active.id}`, "PATCH", { revision: active.revision, ...changes }));
  });
  const duplicate = () => execute(async () => {
    if (!active) return;
    return accept(await missionRequest<Scenario>(`/scenarios/${active.id}/duplicate`, "POST", { revision: active.revision }));
  });
  const remove = () => execute(async () => {
    if (!active) return;
    await missionRequest(`/scenarios/${active.id}?revision=${active.revision}`, "DELETE");
    setScenarios(values => values.filter(value => value.id !== active.id)); setActive(null);
  });
  const place = (kind: AssetKind, location: Location) => execute(async () => {
    if (!active) throw new Error("Create a scenario first.");
    return accept(await missionRequest<Scenario>(`/scenarios/${active.id}/assets`, "POST", {
      revision: active.revision, asset: { kind, name: `${kind.replaceAll("_", " ")} ${active.assets.length + 1}`, location },
    }));
  });
  const editAsset = (id: string, changes: object) => execute(async () => {
    if (!active) return;
    return accept(await missionRequest<Scenario>(`/scenarios/${active.id}/assets/${id}`, "PATCH", { revision: active.revision, changes }));
  });
  const removeAsset = (id: string) => execute(async () => {
    if (!active) return;
    return accept(await missionRequest<Scenario>(`/scenarios/${active.id}/assets/${id}?revision=${active.revision}`, "DELETE"));
  });
  return { active, scenarios, busy, error, open, create, patch, duplicate, remove, place, editAsset, removeAsset, refresh };
}
