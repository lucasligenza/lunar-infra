import type { Mission, Scenario } from "./mission";
export type BatteryInterval = { energy_start_kwh: number; energy_end_kwh: number; soc_start: number; soc_end: number; charge_kw: number; discharge_kw: number; losses_kwh: number; limits: string[] };
export type Interval = {
  index: number; start: string; end: string; generation_kw: number; demand_kw: number; net_kw: number;
  charge_kw: number; discharge_kw: number; curtailed_kw: number; unserved_kw: number; losses_kwh: number;
  energy_start_kwh: number; energy_end_kwh: number; soc_end: number | null; balance_error_kwh: number;
  asset_generation_kw: Record<string, number>; asset_load_kw: Record<string, number>; batteries: Record<string, BatteryInterval>; constraint_violations: string[];
};
export type MissionEvent = { time: string; interval_index: number; kind: string; asset_id: string | null; message: string };
export type Summary = { generated_kwh: number; demanded_kwh: number; unserved_kwh: number; curtailed_kwh: number; battery_losses_kwh: number;
  initial_energy_kwh: number; final_energy_kwh: number; minimum_soc: number | null; first_power_shortage: string | null; shortage_duration_hours: number; energy_balance_error_kwh: number };
export type SimulationRun = { id: string; created_at: string; schema_version: number; scenario_snapshot: Scenario;
  scientific_provenance: object; input_sha256: string; result_sha256: string;
  result: { model_version: string; mission: Mission; input_kind: string; input_label: string; assumptions: string[]; intervals: Interval[]; events: MissionEvent[]; summary: Summary };
};
