import type {AtlasPoint} from '../../types/atlas';
import EnvironmentValue from './EnvironmentValue';
import GeologyReading from './GeologyReading';

export default function AtlasSiteInspector({point,loading,error,activeLayer}:{point:AtlasPoint|null;loading:boolean;error:string|null;activeLayer?:string}) {
  return <aside className="inspector" aria-label="Global site inspector"><div className="inspector-title"><h2>Global site inspector</h2></div><div className="inspector-content">
    {loading&&<p role="status">Reading native lunar terrain…</p>}{error&&<p role="alert">{error}</p>}
    {!point&&!loading&&!error&&<p>Select valid global terrain to place hypothetical infrastructure.</p>}
    {point&&<><div className="selected-coordinate"><p data-testid="global-mission-coordinate">{point.latitude_deg.toFixed(5)}° / {point.longitude_deg.toFixed(5)}° E</p></div>
      {activeLayer==='geology'&&<GeologyReading geology={point.geology}/>}
      {(['elevation','slope'] as const).map(kind=><section className="quantity" key={kind}><h3>{kind==='elevation'?'Elevation':'Derived terrain slope'}</h3><p className="quantity-value"><strong data-testid={`global-mission-${kind}`}>{point[kind].value===null?'Missing data':point[kind].value.toFixed(kind==='slope'?3:1)}</strong><span>{point[kind].unit}</span></p><details className="method"><summary>Source details</summary><p className="source-id">{point[kind].source_id} {point[kind].version}</p><p>{point[kind].method}</p><p>Support: {point[kind].support_north_m.toFixed(1)} m north / {point[kind].support_east_m.toFixed(1)} m east.</p></details></section>)}
      {activeLayer&&["temperature","illumination"].includes(activeLayer)&&<EnvironmentValue layer={activeLayer} latitude={point.latitude_deg} longitude={point.longitude_deg} sourcePoint={point}/> }
      <details className="site-provenance"><summary>Technical details</summary><p className="quantity-note">Coarse terrain cannot establish construction or landing safety. Asset specifications and mission light profiles are hypothetical.</p><p className="quantity-note">Validated time-dependent illumination is unavailable; no location-accurate solar conditions are inferred.</p><p className="quantity-note">{point.frame_note}</p></details></>}
  </div></aside>;
}
