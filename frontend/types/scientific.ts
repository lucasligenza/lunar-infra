export type LayerId = "elevation" | "slope" | "illumination";
export type Coordinates = {
  longitude_deg: number; latitude_deg: number; x_m: number; y_m: number;
  longitude_defined: boolean; frame: string;
};
export type Measurement = {
  value: number | null; unit: "m" | "deg" | "fraction";
  status: "ok" | "nodata" | "unavailable";
  quantity_kind: "measured_gridded" | "derived" | "modeled";
  source_id: string; method: string; resolution_m: number; support_m: number; notes: string;
};
export type Site = {
  region_id: string; coordinates: Coordinates;
  sample: { row: number; column: number; center: Coordinates };
  elevation: Measurement; slope: Measurement; solar_visibility: Measurement;
};
export type Layer = {
  id: LayerId; name: string; image_url: string; unit: "m" | "deg" | "fraction";
  minimum: number; maximum: number; colors: string[]; description: string;
};
export type Region = {
  id: string; name: string; available: boolean; bounds_m: number[]; shape: number[];
  resolution_m: number; crs_proj: string; reference_radius_m: number; layers: Layer[];
};
export type Dataset = {
  product_id: string; version: string; dataset_id: string; available: boolean;
  quantity_kind: "measured_gridded" | "modeled"; unit: string;
  source_resolution_m: number; prepared_resolution_m: number; frame: string; crs_wkt: string | null;
  observation_start: string | null; observation_stop: string | null; created: string | null;
  model_duration_years: number | null; model_timestep_hours: number | null;
  model_calendar_start: string | null; model_calendar_stop: string | null; processing: string;
  files: Record<string, { url: string; bytes: number; sha256: string }>;
};
