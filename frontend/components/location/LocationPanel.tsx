"use client";
import type {ReactNode} from 'react';
import type {AtlasPoint,AtlasQuantity} from '../../types/atlas';
import type {GlobeInspection} from '../../types/globe';
import type {Asset} from '../../types/mission';
import type {Dataset} from '../../types/scientific';
import {surfaceDistanceKm} from '../../lib/lunar';
import {ASSET_LABEL} from '../mission/InfrastructureCatalog';
import Icon from '../ui/Icon';

type Availability={label:string;state:'ok'|'outside'|'nodata'|'missing'};
/** Unavailable states are words, never numbers: outside coverage ≠ nodata ≠ not prepared. */
export function availability(quantity:AtlasQuantity|null|undefined):Availability {
  // The API omits (null) a quantity whose dataset is not loaded locally.
  if(quantity==null)return {label:'Not prepared',state:'missing'};
  if(quantity.status==='unavailable')return {label:'Unavailable here',state:'outside'};
  if(quantity.status==='nodata'||quantity.value===null)return {label:'Missing source data',state:'nodata'};
  return {label:'',state:'ok'};
}
const meters=(value:number)=>`${value.toLocaleString('en-US')} m`;
const spacing=(value:number)=>value>=1000?`${(value/1000).toFixed(2)} km`:`${Math.round(value)} m`;
const TERRAIN_NAME:Record<string,string>={'lola-south':'LOLA polar','gld100':'GLD100 global','lola-global':'LOLA global'};

function Row({label,testId,value,unavailable,note}:{label:string;testId?:string;value?:string;unavailable?:Availability;note?:string}) {
  const missing=unavailable&&unavailable.state!=='ok';
  return <div className="location-row" data-state={missing?unavailable.state:'ok'}><dt>{label}</dt>
    <dd><strong data-testid={testId}>{missing?unavailable.label:value}</strong>{note&&!missing&&<small>{note}</small>}</dd></div>;
}

export type NearbyAsset={asset:Asset;distance_km:number};
export function nearbyAssets(assets:Asset[],point:{latitude_deg:number;longitude_deg:number},limit_km=50):NearbyAsset[] {
  return assets.map(asset=>({asset,distance_km:surfaceDistanceKm(point,asset.location)})).filter(item=>item.distance_km<=limit_km).sort((a,b)=>a.distance_km-b.distance_km);
}

/**
 * Every prepared value at the selected point, using one `/atlas/inspect`
 * response (finest prepared terrain plus registered environmental rasters).
 * Overview first; technical sampling and provenance are disclosed.
 */
export default function LocationPanel({point,loading,error,coverage,mission,focus,actions,polarDatasets,children}:{
  point:AtlasPoint|null;loading:boolean;error:string|null;coverage?:GlobeInspection|null;
  mission?:{name:string;assets:Asset[]}|null;focus?:ReactNode;actions?:ReactNode;polarDatasets?:Dataset[];children?:ReactNode;
}) {
  if(loading&&!point)return <div className="location-panel" aria-busy="true">{focus}<p role="status" className="location-loading"><span className="loading-ring"/>Reading prepared lunar data…</p></div>;
  if(error&&!point)return <div className="location-panel">{focus}<div className="inspection-error" role="alert"><h3>Location unavailable</h3><p>{error}</p></div>{actions}{children}</div>;
  if(!point)return <div className="location-panel"><div className="empty-inspector"><h3>Select a location</h3><p>Click the surface or enter lunar coordinates. Every prepared measurement at that point appears here.</p></div>{children}</div>;
  const sun=availability(point.solar_visibility),heat=availability(point.temperature);
  const geology=point.geology===null?{label:'Not prepared',state:'missing' as const}:point.geology.status!=='ok'||!point.geology.category?{label:'No mapped unit',state:'nodata' as const}:{label:'',state:'ok' as const};
  const nearby=mission?nearbyAssets(mission.assets,point):[];
  const coverageRows:[string,boolean,string][]=[
    ['Terrain',point.elevation.status==='ok',`${TERRAIN_NAME[point.dataset_id]??point.dataset_id} · ${spacing(point.elevation.spacing_north_m)}`],
    ['Solar visibility',sun.state==='ok',sun.state==='ok'?'Prepared south-pole model':sun.label],
    ['Temperature',heat.state==='ok',heat.state==='ok'?'Prepared south-pole bin':heat.label],
    ['Geology',geology.state==='ok',geology.state==='ok'?'USGS 1:5M map':geology.label],
  ];
  if(coverage)coverageRows.push(['240 m local analysis',coverage.local_analysis,coverage.local_analysis?'South-pole grid':'Outside the prepared crop']);
  return <div className="location-panel" aria-live="polite" aria-busy={loading}>
    <p className="location-coordinate" data-testid="selected-coordinate">{Math.abs(point.latitude_deg).toFixed(5)}° {point.latitude_deg<0?'S':'N'} / {point.longitude_defined?`${point.longitude_deg.toFixed(5)}° E`:'longitude undefined'}</p>
    {actions}
    {focus}
    <section className="location-group" aria-label="Terrain"><h3>Terrain</h3><dl>
      <Row label="Elevation" testId="atlas-elevation" value={point.elevation.value===null?undefined:meters(point.elevation.value)} unavailable={availability(point.elevation)} note="Relative to the 1,737.4 km sphere"/>
      <Row label="Slope" testId="atlas-slope" value={point.slope.value===null?undefined:`${point.slope.value.toFixed(2)}°`} unavailable={point.slope.value===null?{label:'Missing stencil',state:'nodata'}:undefined} note={`Derived over ${spacing(point.slope.support_north_m)}`}/>
      <Row label="Native resolution" value={`${spacing(point.elevation.spacing_north_m)} · ${TERRAIN_NAME[point.dataset_id]??point.dataset_id}`}/>
    </dl></section>
    <section className="location-group" aria-label="Environment"><h3>Environment</h3><dl>
      <Row label="Average solar visibility" testId="atlas-sunlight" value={point.solar_visibility?.value!=null?`${(point.solar_visibility.value*100).toFixed(1)}%`:undefined} unavailable={sun} note="Modeled ~18.6-year average · not current sunlight"/>
      <Row label="Surface brightness temperature" testId="atlas-temperature" value={point.temperature?.value!=null?`${point.temperature.value.toFixed(1)} K`:undefined} unavailable={heat} note="Diviner summer 00:00–00:15 local-time bin · not habitat temperature"/>
    </dl></section>
    <section className="location-group" aria-label="Geology"><h3>Geology</h3>
      {geology.state==='ok'&&point.geology?.category?<div className="location-geology"><i aria-hidden="true" style={{background:point.geology.category.color}}/><div><strong data-testid="atlas-geology">{point.geology.category.code} / {point.geology.category.name}</strong><p>{point.geology.category.interpretation}</p></div></div>:
        <p className="location-missing" data-testid="atlas-geology">{geology.label}</p>}
    </section>
    <section className="location-group" aria-label="Data coverage"><h3>Data coverage</h3><ul className="coverage-list">
      {coverageRows.map(([name,ok,detail])=><li key={name} data-available={ok}><Icon name={ok?'target':'close'}/><span>{name}</span><small>{detail}</small></li>)}
    </ul></section>
    {mission&&<section className="location-group" aria-label="Mission context"><h3>Mission context</h3>
      {nearby.length?<><p>{mission.name}: {nearby.length} asset{nearby.length>1?'s':''} within 50 km.</p><ul className="nearby-assets">{nearby.slice(0,5).map(({asset,distance_km})=><li key={asset.id}><Icon name={asset.kind}/><span>{asset.name}</span><small>{ASSET_LABEL[asset.kind]} · {distance_km<1?`${(distance_km*1000).toFixed(0)} m`:`${distance_km.toFixed(1)} km`}</small></li>)}</ul></>:
        <p>No {mission.name} assets within 50 km.</p>}
    </section>}
    {children}
    <details className="location-details"><summary>Technical details</summary><dl className="technical-list">
      <dt>Sampled cell center</dt><dd>{point.pixel_center[1].toFixed(5)}° / {point.pixel_center[0].toFixed(5)}° E (row {point.sample_row}, column {point.sample_column})</dd>
      <dt>Elevation spacing</dt><dd>{point.elevation.spacing_north_m.toFixed(1)} m north / {point.elevation.spacing_east_m.toFixed(1)} m east</dd>
      <dt>Elevation sampling</dt><dd>{point.elevation.method}</dd>
      <dt>Slope support</dt><dd>{point.slope.support_north_m.toFixed(1)} m north / {point.slope.support_east_m.toFixed(1)} m east · {point.slope.method}</dd>
      {point.solar_visibility&&<><dt>Solar visibility sampling</dt><dd>{point.solar_visibility.method}</dd></>}
      {point.temperature&&<><dt>Temperature sampling</dt><dd>{point.temperature.method}</dd></>}
      {point.geology&&<><dt>Geology sampling</dt><dd>{point.geology.method} · map 1:{point.geology.map_scale.toLocaleString('en-US')}, {point.geology.pixels_per_degree} px/°</dd></>}
      <dt>Terrain provenance</dt><dd>{point.terrain_source}</dd>
    </dl></details>
    <details className="location-details site-provenance"><summary>Sources & provenance</summary>
      <ul className="source-list">
        <li><strong>{point.elevation.source_id}</strong> {point.elevation.version} · elevation (gridded altimetry), slope (derived)</li>
        {point.solar_visibility&&<li><strong>{point.solar_visibility.source_id}</strong> {point.solar_visibility.version} · modeled average solar visibility</li>}
        {point.temperature&&<li><strong>{point.temperature.source_id}</strong> {point.temperature.version} · bolometric brightness temperature</li>}
        {point.geology&&<li><strong>{point.geology.source_id}</strong> {point.geology.version} · interpreted geological units</li>}
      </ul>
      <p>{point.frame_note}</p>
      {point.geology&&<p>{point.geology.frame_note}</p>}
      <p>Planetocentric latitude, east-positive longitude. Overlay colors are visualization only; these values come from the native numeric grids. Coarse terrain cannot establish landing or construction safety.</p>
      {polarDatasets&&point.dataset_id==='lola-south'&&<section className="data-sources"><h3>Polar source files</h3>{polarDatasets.map(dataset=><details key={dataset.product_id}><summary>{dataset.product_id}<span>{dataset.version}</span></summary>
        <p>{dataset.processing}</p>
        {Object.entries(dataset.files).map(([name,file])=><div className="source-file" key={name}><a href={file.url} target="_blank" rel="noreferrer">NASA source: {name}</a><span title={file.sha256}>SHA-256: {file.sha256.slice(0,16)}…</span></div>)}
      </details>)}</section>}
    </details>
  </div>;
}
