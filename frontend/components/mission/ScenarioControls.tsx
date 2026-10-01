"use client";
import {useState} from 'react';
import type {useScenario} from '../../lib/useScenario';
import type {Location} from '../../types/mission';

export default function ScenarioControls({scenario,scenarioName,setScenarioName,working,validLocation,globalMissionView,scenarioInView,assetDirty,missionDirty,discardAll,openScenario,screened,onCreated,createOnly}: {
  scenario:ReturnType<typeof useScenario>;scenarioName:string;setScenarioName:(name:string)=>void;working:boolean;validLocation:Location|null;
  globalMissionView:boolean;scenarioInView:boolean;assetDirty:boolean;missionDirty:boolean;discardAll:()=>boolean;openScenario:(id:string)=>Promise<void>;
  screened:boolean;onCreated:()=>void;createOnly:boolean;
}) {
  const [newName,setNewName]=useState('Lunar outpost');
  const name=createOnly?newName:scenarioName;
  return (
          <details open className="tool-section scenario-controls"><summary>Mission scenarios</summary>
            {validLocation&&<div className="mission-site-handoff" data-testid="mission-site-handoff"><p>Create a new mission at <strong>{validLocation.latitude_deg.toFixed(5)}° / {validLocation.longitude_deg.toFixed(5)}° E</strong>.</p>
              <p>{screened?'Selected screening candidate. Preliminary evidence does not certify human or construction safety.':'Terrain availability does not establish site safety.'} Simulation requires hypothetical temporal input until validated time-resolved sunlight is available.</p></div>}
            <label>Scenario name<input maxLength={100} value={name} onChange={event => createOnly?setNewName(event.target.value):setScenarioName(event.target.value)} /></label>
            {createOnly&&scenario.active&&<p>Creates a separate mission. Your open mission remains saved at its existing site.</p>}
            <button className="primary-button" disabled={working || !validLocation || !name.trim()} onClick={() => {
              if (validLocation && (!(assetDirty || missionDirty) || window.confirm("Discard unsaved asset and simulation input changes?"))) void scenario.create(name, { latitude_deg: validLocation.latitude_deg, longitude_deg: validLocation.longitude_deg },globalMissionView?'global-atlas':'south-pole').then(created=>{if(created)onCreated();});
            }}>Create scenario at selected site</button>
            {!validLocation && <p>Select a valid terrain location first.</p>}
            {scenario.active&&!scenarioInView&&<p>The active scenario belongs to the polar domain. Create a global scenario here or reopen a saved scenario before placing infrastructure.</p>}
            <div className="button-row"><button disabled={working} onClick={() => void scenario.refresh()}>Refresh scenarios</button>
              {scenario.active && <button disabled={working} onClick={() => { if (discardAll()) void scenario.duplicate(); }}>Duplicate scenario</button>}</div>
            <div className="scenario-list">{scenario.scenarios.map(value => <button key={value.id} disabled={working} aria-label={`Open scenario: ${value.name}`}
              aria-pressed={value.id === scenario.active?.id} onClick={() => void openScenario(value.id)}>{value.name}<small>{value.assets.length} assets / {new Date(value.modified_at).toLocaleDateString()}</small></button>)}</div>
            {scenario.active && <button className="danger-button" disabled={working} onClick={() => {
              if (window.confirm(`Delete scenario “${scenario.active?.name}”? This cannot be undone.`)) void scenario.remove();
            }}>Delete scenario</button>}
          </details>
  );
}
