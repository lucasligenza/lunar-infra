import type {AtlasLayer} from '../../types/atlas';
import {LAYER_PRESENTATION} from '../ui/LayerPicker';

/** Compact always-visible key for the active overlay; the full legend lives in Overlays. */
export default function LegendChip({layer,status,onRetry}:{layer:AtlasLayer;status?:string;onRetry?:()=>void}) {
  const label=(value:number|null)=>layer.unit==='fraction'?`${Math.round((value??0)*100)}%`:`${value?.toLocaleString('en-US')}${layer.unit==='deg'?'°':` ${layer.unit}`}`;
  const failed=status?.includes('unavailable');
  const busy=status&&!failed&&!status.includes('ready')&&!status.includes('hidden');
  return <div className="legend-chip" data-status={status} aria-label={`${LAYER_PRESENTATION[layer.id]?.label??layer.name} legend`}>
    <strong>{LAYER_PRESENTATION[layer.id]?.label??layer.name}</strong>
    {layer.categories?<span className="legend-categories">{layer.categories.length} mapped units · click the surface to identify</span>:
      <span className="legend-ramp-inline"><small>{label(layer.minimum)}</small><i style={{background:`linear-gradient(90deg,${layer.colors.join(',')})`}}/><small>{label(layer.maximum)}</small></span>}
    {busy&&<small className="legend-status" role="status">{status}</small>}
    {failed&&<span className="legend-status" role="alert">Layer unavailable{onRetry&&<button onClick={onRetry}>Retry scientific layer</button>}</span>}
  </div>;
}
