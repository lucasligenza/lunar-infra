export type Location = { latitude_deg: number; longitude_deg: number };
export type AssetKind = "habitat" | "solar_array" | "battery" | "communications" | "robot";
export type RoverRoute = { destination: Location; departure_hours: number; speed_kmh: number; dwell_hours: number; return_to_start: boolean };
export type Asset = {
  id: string; kind: AssetKind; name: string; location: Location; operational: boolean;
  demand_kw?: number; load_profile_kw?: number[] | null; rated_power_kw?: number; derating?: number;
  capacity_kwh?: number; max_charge_kw?: number; max_discharge_kw?: number;
  charge_efficiency?: number; discharge_efficiency?: number; initial_soc?: number; minimum_soc?: number;
  active_demand_kw?: number; idle_demand_kw?: number; duty_cycle?: number; route?: RoverRoute | null;
};
export type Mission = {
  start: string; end: string; timestep_seconds: number;
  illumination_kind: "synthetic" | "custom_hypothetical"; illumination_label: string;
  illumination_factors: number[] | null;
};
export type Scenario = {
  id: string; name: string; region_id: string; site: Location; mission: Mission; assets: Asset[];
  schema_version: number; model_version: string; dataset_identifiers: Record<string, string>;
  revision: number; modified_at: string;
};
export const ASSET_NAMES: Record<AssetKind, string> = {
  habitat: "Habitat", solar_array: "Solar array", battery: "Battery", communications: "Communications station", robot: "Robotic equipment",
};
