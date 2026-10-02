"use client";
import { useEffect, useState } from 'react';
import Dialog from './ui/Dialog';
const STEPS = [
  ['Navigate the Moon', 'Explore starts with the 3D Moon. Drag to orbit, scroll to approach, or choose a named destination. Reset globe returns to near-side orbit.'],
  ['Select a location', 'Click the surface or enter lunar coordinates. The location panel identifies the actual available data. Your selection stays with you across activities.'],
  ['Choose scientific layers', 'Open Overlays to color the Moon with elevation, slope, geology, or available polar sunlight and temperature. Select a location, then Find settlement sites to compare nearby candidates. Advanced opens the full catalog and analysis tools.'],
  ['Analyze the terrain', 'Choose Analyze this region from the location panel. The prepared south pole has a 240 m 2D map; other locations use the global atlas. Analysis provides native measurements, area statistics and elevation profiles where data supports them.'],
  ['Build a mission', 'Choose Create mission here, select valid terrain and name your mission. Use + Add Asset, pick equipment and click the surface to place it. Selection opens the inspector; Advanced settings holds detailed engineering inputs.'],
  ['Simulate and inspect', 'Choose Simulate, open Set up simulation or Mission details → Simulation inputs, set UTC times and an explicit hypothetical sunlight profile, then Run simulation. Play or scrub the compact bar; View details opens charts and mission energy totals. NASA average visibility is not time-resolved sunlight.'],
] as const;

export default function HelpPanel({ open, initial, onClose, motion, onMotion, consoleVisible, onConsole, onTips }: {
  open: boolean; initial: 'help' | 'tour'; onClose: () => void; motion: 'system' | 'reduce';
  onMotion: (value: 'system' | 'reduce') => void; consoleVisible: boolean; onConsole: (visible: boolean) => void; onTips: () => void;
}) {
  const [tab, setTab] = useState<'help' | 'tour' | 'settings'>('help'), [step, setStep] = useState(0);
  useEffect(() => { if (open) { setTab(initial); setStep(0); } }, [open, initial]);
  return <Dialog open={open} onClose={onClose} label="LunarOS help and settings" className="help-panel">
    <header><h2>{tab === 'tour' ? 'From orbit to a mission' : tab === 'settings' ? 'Interface settings' : 'LunarOS help'}</h2><button onClick={onClose}>Close help</button></header>
    <nav aria-label="Help sections"><button aria-pressed={tab === 'help'} onClick={() => setTab('help')}>Help</button><button aria-pressed={tab === 'tour'} onClick={() => { setTab('tour'); setStep(0); }}>Walkthrough</button><button aria-pressed={tab === 'settings'} onClick={() => setTab('settings')}>Settings</button></nav>
    <div className="help-content">
      {tab === 'help' && <><p>Explore the Moon, Analyze scientific layers, Build infrastructure and Simulate power. These activities preserve your selected location and saved mission.</p>
        <dl><dt>Ctrl / Cmd K</dt><dd>Search application commands</dd><dt>Escape</dt><dd>Close a dialog and return focus</dd><dt>Globe keyboard</dt><dd>Focus the Moon: arrows pan and Enter selects the screen center. Use the labeled camera buttons to zoom.</dd></dl>
        <p>“Derived” means computed from supporting terrain. “Modeled” visibility is a long-term average. “Hypothetical” simulation input is an explicit engineering assumption, not a NASA observation.</p>
        <button className="primary-button" onClick={() => { setTab('tour'); setStep(0); }}>Start walkthrough</button>
      </>}
      {tab === 'tour' && <><span className="tour-progress">Step {step + 1} / {STEPS.length}</span><h3>{STEPS[step][0]}</h3><p>{STEPS[step][1]}</p>
        <div className="button-row"><button disabled={step === 0} onClick={() => setStep(value => value - 1)}>Previous step</button>
          {step < STEPS.length - 1 ? <button className="primary-button" onClick={() => setStep(value => value + 1)}>Next step</button> : <button className="primary-button" onClick={onClose}>Finish walkthrough</button>}
          <button onClick={onClose}>Dismiss walkthrough</button></div>
      </>}
      {tab === 'settings' && <><label>Camera motion<select aria-label="Camera motion" value={motion} onChange={event => onMotion(event.target.value as 'system' | 'reduce')}><option value="system">Respect system preference</option><option value="reduce">Reduce motion</option></select></label>
        <p>Reduced motion uses immediate camera transitions and removes cosmetic animation. Scientific values and simulation time steps are unchanged.</p>
        <label className="checkbox-label"><input type="checkbox" checked={consoleVisible} onChange={event => onConsole(event.target.checked)} />Show activity console</label>
        <button onClick={onTips}>Open walkthrough</button>
      </>}
    </div>
  </Dialog>;
}
