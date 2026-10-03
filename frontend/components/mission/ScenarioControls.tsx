"use client";
import {useState} from 'react';
import type {useScenario} from '../../lib/useScenario';
import type {Location} from '../../types/mission';

/**
 * Missions drawer content. `createOnly` shows only the new-mission form at the
 * selected site; otherwise the open mission can be renamed and saved missions
 * opened, duplicated or deleted. The new-mission name draft is separate from
 * the open mission's name so creation never enables a rename.
 */
export default function ScenarioControls({scenario,scenarioName,setScenarioName,working,validLocation,globalMissionView,scenarioInView,assetDirty,missionDirty,discardAll,openScenario,screened,onCreated,createOnly,onCreateMode,canSave,onSave}: {
  scenario:ReturnType<typeof useScenario>;scenarioName:string;setScenarioName:(name:string)=>void;working:boolean;validLocation:Location|null;
  globalMissionView:boolean;scenarioInView:boolean;assetDirty:boolean;missionDirty:boolean;discardAll:()=>boolean;openScenario:(id:string)=>Promise<void>;
  screened:boolean;onCreated:()=>void;createOnly:boolean;onCreateMode:(create:boolean)=>void;canSave:boolean;onSave:()=>void;
}) {
  const [newName,setNewName]=useState('Lunar outpost');
  if(createOnly||!scenario.active)return <section className="scenario-controls" aria-label="Mission scenarios">
    {validLocation?<div className="mission-site-handoff" data-testid="mission-site-handoff"><p>Create a new mission at <strong>{validLocation.latitude_deg.toFixed(5)}° / {validLocation.longitude_deg.toFixed(5)}° E</strong>.</p>
      <p>{screened?'Selected screening candidate. Preliminary evidence does not certify human or construction safety.':'Terrain availability does not establish site safety.'} Simulation requires hypothetical temporal input until validated time-resolved sunlight is available.</p></div>:
      <p>Select a valid terrain location first.</p>}
    <label>Scenario name<input maxLength={100} value={newName} onChange={event => setNewName(event.target.value)} /></label>
    {scenario.active&&<p>Creates a separate mission. Your open mission remains saved at its existing site.</p>}
    <button className="primary-button" disabled={working || !validLocation || !newName.trim()} onClick={() => {
      if (validLocation && (!(assetDirty || missionDirty) || window.confirm("Discard unsaved asset and simulation input changes?"))) void scenario.create(newName, { latitude_deg: validLocation.latitude_deg, longitude_deg: validLocation.longitude_deg },globalMissionView?'global-atlas':'south-pole').then(created=>{if(created)onCreated();});
    }}>Create scenario at selected site</button>
    {scenario.active&&<button onClick={()=>onCreateMode(false)}>Back to saved missions</button>}
    <SavedMissions scenario={scenario} working={working} openScenario={openScenario} discardAll={discardAll} manage={false}/>
  </section>;
  return <section className="scenario-controls" aria-label="Mission scenarios">
    <label>Scenario name<input maxLength={100} value={scenarioName} onChange={event => setScenarioName(event.target.value)} /></label>
    {canSave&&<button className="primary-button" disabled={working} onClick={onSave}>Save name</button>}
    {!scenarioInView&&<p>The active scenario belongs to the polar domain. Create a global scenario here or reopen a saved scenario before placing infrastructure.</p>}
    <button disabled={working} onClick={()=>onCreateMode(true)}>New mission at selected site</button>
    <SavedMissions scenario={scenario} working={working} openScenario={openScenario} discardAll={discardAll} manage/>
  </section>;
}

function SavedMissions({scenario,working,openScenario,discardAll,manage}:{scenario:ReturnType<typeof useScenario>;working:boolean;openScenario:(id:string)=>Promise<void>;discardAll:()=>boolean;manage:boolean}) {
  return <div className="saved-missions"><h3>Saved missions</h3>
    <div className="scenario-list">{scenario.scenarios.map(value => <button key={value.id} disabled={working} aria-label={`Open scenario: ${value.name}`}
      aria-pressed={value.id === scenario.active?.id} onClick={() => void openScenario(value.id)}>{value.name}<small>{value.assets.length} assets / {new Date(value.modified_at).toLocaleDateString()}</small></button>)}</div>
    <div className="button-row"><button disabled={working} onClick={() => void scenario.refresh()}>Refresh scenarios</button>
      {manage&&scenario.active && <button disabled={working} onClick={() => { if (discardAll()) void scenario.duplicate(); }}>Duplicate scenario</button>}
      {manage&&scenario.active && <button className="danger-button" disabled={working} onClick={() => {
        if (window.confirm(`Delete scenario “${scenario.active?.name}”? This cannot be undone.`)) void scenario.remove();
      }}>Delete scenario</button>}</div>
  </div>;
}
