export type AtlasDataset = {
  id:string; name:string; category:string; mission:string; instrument:string; organization:string;
  source_url:string; citation:string; version:string; product_id:string;
  period:Record<string,string|number|null>; coverage:{south:number;north:number;west:number;east:number}|null;
  pixels_per_degree:number|null; spacing_m_at_equator:number|null; unit:string; crs:string;
  longitude_convention:string; frame_note:string; data_type:string; cache:string|null;
  acquisition_status:string; numerical_queries:boolean; overlay_available:boolean; download_bytes:number;
  limitations:string[];
};
export type AtlasQuantity = {value:number|null;unit:string;status:string;source_id:string;version:string;
  spacing_north_m:number;spacing_east_m:number;support_north_m:number;support_east_m:number;method:string;quantity_kind:string};
export type AtlasPoint = {latitude_deg:number;longitude_deg:number;longitude_defined:boolean;pixel_center:number[];
  sample_row:number;sample_column:number;dataset_id:string;elevation:AtlasQuantity;slope:AtlasQuantity;
  reference_radius_m:number;frame_note:string;terrain_source:string};
