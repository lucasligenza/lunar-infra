"use client";
import type {SettlementState} from '../../lib/useSettlement';
import type {GlobeLocation} from '../../types/globe';
import type {Candidate} from '../../types/suitability';

export default function SettlementPanel({state,location,onSelect,onMission}:{state:SettlementState;location:GlobeLocation|null;onSelect:(point:Candidate)=>void;onMission:()=>void}) {
  const {report,settings,setSettings,loading,error}=state;
  const groups=[...new Set(report?.candidates.map(candidate=>candidate.evidence_group)??[])];
  return <section aria-label="Settlement suitability" className="settlement-panel">
    <h3>Find settlement sites</h3><p>Compare nearby areas for a protected human outpost. Every site needs life support and shielding.</p>
    <form onSubmit={event=>{event.preventDefault();if(location)void state.search(location);}}>
      <details><summary>Screening settings</summary>
        <label>Search radius (km)<input required type="number" min={1} max={600} value={settings.radius} onChange={event=>setSettings({...settings,radius:event.target.value})}/></label>
        <label>Neighborhood radius (km)<input required type="number" min={1} max={50} value={settings.neighborhood} onChange={event=>setSettings({...settings,neighborhood:event.target.value})}/></label>
        <label>Low-slope threshold (degrees)<input required type="number" min={0} max={30} step="any" value={settings.slope} onChange={event=>setSettings({...settings,slope:event.target.value})}/></label>
        <label>Screening terrain<select value={settings.dataset} onChange={event=>setSettings({...settings,dataset:event.target.value})}><option value="auto">Best supporting terrain</option><option value="gld100">Global GLD100</option><option value="lola-global">Coarser LOLA overview</option></select></label>
        <p>The slope threshold is editable screening guidance, not a construction limit.</p>
      </details>
      <button className="primary-button" type="submit" disabled={!location||loading}>{loading?'Finding candidates…':'Find settlement sites'}</button>
    </form>
    {!location&&<p>Select a location on the Moon to begin.</p>}
    {loading&&<p role="status">Evaluating native terrain and available environmental evidence…</p>}
    {error&&<p role="alert">{error}</p>}
    {report&&<><p data-testid="candidate-search-context">Within {report.request.area.radius_km} km of {report.request.area.latitude_deg.toFixed(3)}° / {report.request.area.longitude_deg.toFixed(3)}° E.</p>
      <p>Promising tradeoffs, compared within matching data coverage. No universal habitability score.</p>
      {report.warnings.map(warning=><p className="warning" key={warning}>{warning}</p>)}
      {!report.candidates.length&&<p>No supported candidate neighborhoods. Try a larger area or a different terrain dataset.</p>}
      {groups.map(group=><section key={group} aria-label={group.includes('terrain-only')?'Terrain-only candidates':'Terrain and sunlight candidates'}>
        <h4>{group.includes('terrain-only')?'Terrain-only screening':'Terrain + sunlight'}</h4>
        {report.candidates.filter(candidate=>candidate.evidence_group===group).map(candidate=><article key={candidate.id} className="candidate-result">
          <button onClick={()=>onSelect(candidate)} aria-pressed={location?.latitude_deg===candidate.latitude_deg&&location?.longitude_deg===candidate.longitude_deg} aria-label={`Inspect ${candidate.id}`}>{candidate.tradeoff_front===1?'Promising tradeoff':'Other option'} · {candidate.latitude_deg.toFixed(3)}° / {candidate.longitude_deg.toFixed(3)}° E</button>
          <p>{(candidate.low_slope_fraction*100).toFixed(0)}% low-slope terrain{candidate.solar_visibility!==null?` · ${(candidate.solar_visibility*100).toFixed(0)}% average solar visibility`:''}</p>
          <details><summary>Why this candidate?</summary>{candidate.reasons.map(reason=><p key={reason}>{reason}</p>)}<p>{candidate.source_id} {candidate.version}</p>{candidate.unknowns.map(note=><p key={note}>{note}</p>)}</details>
        </article>)}
      </section>)}
      <details><summary>Method and sources</summary>{report.assumptions.map(note=><p key={note}>{note}</p>)}<p>{report.model_version}; {report.evaluated_centers} sampled centers. Colored outlines locate neighborhoods, not approved settlement boundaries.</p>{report.sources.map(source=><p key={source.id}><a href={source.source_url} target="_blank" rel="noreferrer">{source.name}</a> / {source.version}</p>)}</details>
      <button onClick={onMission} disabled={!report.candidates.some(candidate=>location?.latitude_deg===candidate.latitude_deg&&location?.longitude_deg===candidate.longitude_deg)}>Create mission at selected location</button>
    </>}
  </section>;
}
