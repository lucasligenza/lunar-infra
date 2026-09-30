import type {AtlasLayer} from '../../types/atlas';

export default function AtlasLegend({layer}:{layer:AtlasLayer}) {
  return <>{layer.categories?<details className="geology-legend"><summary>{layer.categories.length} geological units / categorical legend</summary><ul>{layer.categories.map(unit=><li key={unit.code}><i style={{background:unit.color}}/><span>{unit.code} / {unit.name}</span></li>)}</ul></details>:
    <div className="atlas-legend" aria-label={`${layer.name} legend`}><div style={{background:`linear-gradient(90deg,${layer.colors.join(',')})`}}/><p><span>{layer.minimum?.toLocaleString()} {layer.unit}</span><span>{layer.maximum?.toLocaleString()} {layer.unit}</span></p></div>}
    <p>{layer.source_id} {layer.version}; native grid {(1/layer.angular_spacing_deg).toFixed(0)} pixels/degree. Transparent cells indicate missing data. Coloring does not change terrain geometry.</p>
  </>;
}
