"use client";
import type {GeologyQuantity} from '../../types/atlas';

export default function GeologyReading({geology,loading=false,error=null}:{
  geology:GeologyQuantity|null;loading?:boolean;error?:string|null;
}) {
  const unit=geology?.status==='ok'?geology.category:null;
  return <section className="geology-reading" aria-label="Geology at this location" aria-live="polite" aria-busy={loading}>
    <h3>This color represents</h3>
    {loading?<p role="status">Reading the mapped geological unit…</p>:error?<p role="alert">Geology lookup failed. Click the surface again to retry.</p>:unit?<>
      <div className="geology-reading-unit"><i aria-hidden="true" data-testid="selected-geology-color" style={{backgroundColor:unit.color}}/>
        <strong data-testid="selected-geology-unit">{unit.code} / {unit.name}</strong></div>
      <p data-testid="selected-geology-interpretation">{unit.interpretation}</p>
      <small>Mapped geological unit · USGS</small>
      <details><summary>Source details</summary><p>{unit.description}</p>
        {unit.source_note&&<p>{unit.source_note}</p>}
        <p>{geology!.source_id} / {geology!.version}</p>
        <p>Source map 1:{geology!.map_scale.toLocaleString('en-US')}; categorical grid {geology!.pixels_per_degree} pixels per degree.</p>
        <p>{geology!.method}</p><p>{geology!.frame_note}</p>
        <p>The swatch is the original legend color; opacity and lighting affect its appearance on the Moon. The unit is sampled from source classifications, not screen colors.</p>
        <p>Map-scale interpretation does not establish an extractable resource or construction-scale contact.</p>
      </details>
    </>:<p>{geology?'No mapped geological unit at this location. Transparent areas have no supporting classification.':'Geology is not prepared locally. No color interpretation is available.'}</p>}
  </section>;
}
