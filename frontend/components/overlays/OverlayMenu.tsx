"use client";
import type {ReactNode} from 'react';
import type {AtlasLayer} from '../../types/atlas';
import LayerPicker,{LAYER_PRESENTATION} from '../ui/LayerPicker';
import Icon from '../ui/Icon';

export type Coverage='available'|'outside'|'nodata'|'checking'|'no-location'|'not-prepared'|'error';
const COVERAGE:Record<Coverage,string>={available:'Available at the selected location.',outside:'Outside the prepared south-pole region.',
  nodata:'Missing source data at the selected location.',checking:'Checking coverage at the selected location…',
  'no-location':'Select a location to check coverage.','not-prepared':'Not prepared locally.',error:'Coverage check unavailable.'};

/**
 * Visualization only: what is drawn on the Moon. Location data, screening,
 * missions and dataset internals live in their own surfaces; the source
 * grid choice sits under Source details.
 */
export default function OverlayMenu({layers,value,onChange,opacity,onOpacity,legend,status,coverage,onCoverage,environmentNote,sourceDetails,onClose,error,onRetry}:{
  layers:AtlasLayer[];value:string;onChange:(id:string)=>void;opacity:number;onOpacity:(value:number)=>void;
  legend?:ReactNode;status?:ReactNode;coverage?:Coverage|null;onCoverage?:()=>void;environmentNote?:string;
  sourceDetails?:ReactNode;onClose:()=>void;error?:string|null;onRetry?:()=>void;
}) {
  const environmental=['temperature','illumination'].includes(value);
  const active=layers.find(layer=>layer.id===value);
  return <aside className="surface-menu overlay-menu" aria-label="Overlays">
    <header className="menu-header"><h2>Overlays</h2><button onClick={onClose} aria-label="Close overlays" title="Close overlays"><Icon name="close"/></button></header>
    <div className="menu-body">
      {error&&<div className="catalog-error" role="alert"><p>Scientific catalog unavailable. {error}</p>{onRetry&&<button onClick={onRetry}>Retry catalog</button>}</div>}
      <LayerPicker layers={layers} value={value} onChange={onChange}/>
      {value!=='none'&&<section className="active-overlay" aria-label={`${LAYER_PRESENTATION[value]?.label??value} overlay`}>
        {active&&<p className="active-layer-caption">{active.name}</p>}
        {active?.preparation_status==='not_prepared'?<p className="overlay-warning">Not prepared locally. Prepare the registered source, or choose another overlay.</p>:<>
          <label className="opacity-control">Opacity<span>{Math.round(opacity*100)}%</span><input aria-label="Scientific layer opacity" type="range" min={0} max={1} step={.05} value={opacity} onChange={event=>onOpacity(Number(event.target.value))}/></label>
          {legend}
        </>}
        {status}
        {environmental&&coverage&&<div className="overlay-coverage"><p role="status">{COVERAGE[coverage]} {environmentNote}</p>
          {onCoverage&&coverage!=='not-prepared'&&<button onClick={onCoverage}>Go to supported region</button>}</div>}
      </section>}
      {sourceDetails&&<details className="source-details"><summary>Source details</summary>{sourceDetails}</details>}
    </div>
  </aside>;
}
