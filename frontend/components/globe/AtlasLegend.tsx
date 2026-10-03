import type {AtlasLayer} from '../../types/atlas';

export default function AtlasLegend({layer,selectedCode}:{layer:AtlasLayer;selectedCode?:string}) {
  const label=(value:number|null)=>layer.unit==='fraction'?`${Math.round((value??0)*100)}%`:`${value?.toLocaleString()} ${layer.unit}`;
  return <>{layer.categories?<details className="geology-legend"><summary>{layer.categories.length} geological units / categorical legend</summary><ul>{layer.categories.map(unit=><li key={unit.code} aria-current={selectedCode===unit.code?'true':undefined}><i aria-hidden="true" style={{background:unit.color}}/><span>{unit.code} / {unit.name}{selectedCode===unit.code&&<small>Selected location</small>}</span></li>)}</ul></details>:
    <div className="atlas-legend" aria-label={`${layer.name} legend`}><div style={{background:`linear-gradient(90deg,${layer.colors.join(',')})`}}/><p><span>{label(layer.minimum)}</span><span>{label(layer.maximum)}</span></p></div>}
    <details><summary>Layer source</summary><p>Transparent areas have no supporting data.</p><p>{layer.source_id} {layer.version}. {layer.angular_spacing_deg===null?'Local resolution unavailable until preparation.':`Angular spacing equivalent: ${layer.angular_spacing_deg.toFixed(5)} degrees.`} Coloring does not change terrain geometry.</p></details>
  </>;
}
