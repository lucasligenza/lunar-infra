import type { Location } from './mission';
export type Mode = 'global' | 'regional' | 'mission';
export type GlobeLocation = Location & { longitude_defined?: boolean; frame?: string };
export interface Destination { id: string; name: string; coordinates: GlobeLocation; camera_distance_radii: number; description: string; source_url: string; coordinate_note: string }
export interface GlobeMetadata { available: boolean; reference_radius_m: number; terrain_columns: number; terrain_rows: number; terrain_url: string; texture_urls: string[]; terrain_product: string; terrain_angular_resolution_deg: number; imagery_product: string; imagery_note: string; attribution: string; source_urls: string[]; artifacts: Record<string, { bytes: number; sha256: string }> }
export interface GlobeInspection { coordinates: GlobeLocation; elevation: { value: number | null; status: string; unit: string; source_id: string; version: string; angular_resolution_deg: number }; local_analysis: boolean; planning: boolean; local_region_id: string | null; local_status: string; temporal_illumination: false }
export interface CameraState { position: [number, number, number]; target: [number, number, number]; up: [number, number, number] }
