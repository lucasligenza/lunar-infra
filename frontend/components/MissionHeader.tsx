import type { Mode } from '../types/globe';
import Icon from './ui/Icon';

export const ACTIVITIES = [
  { mode: 'global', label: 'Explore', number: '01' },
  { mode: 'regional', label: 'Analyze', number: '02' },
  { mode: 'mission', label: 'Build', number: '03' },
  { mode: 'simulation', label: 'Simulate', number: '04' },
] as const;

export default function MissionHeader({ mode, context, status, ready, busy, onMode, onSave, canSave, onCommands, onActivity, onHelp }: {
  mode: Mode; context: string; status: string; ready: boolean; busy: boolean;
  onMode: (mode: Mode) => void; onSave?: () => void; canSave: boolean;
  onCommands: () => void; onActivity: () => void;
  onHelp: () => void;
}) {
  return <header className="app-header mission-header">
    <div className="brand"><span className="brand-orbit" aria-hidden="true" /><h1>Lunar<span>OS</span></h1><span className="brand-caption">MISSION CONTROL</span></div>
    <nav className="mode-navigation" aria-label="Primary navigation">
      {ACTIVITIES.map(activity=><button key={activity.mode} disabled={busy} aria-pressed={mode===activity.mode} onClick={()=>onMode(activity.mode)}><Icon name={activity.mode==='global'?'explore':activity.mode==='regional'?'layers':activity.mode==='mission'?'build':'simulate'}/>{activity.label}</button>)}
    </nav>
    <div className="mission-context" title={context}>{context}</div>
    <div className="header-status"><span className={ready ? 'status-dot ready' : 'status-dot'} aria-hidden="true" />
      <span role="status" title={status}>{status}</span>
      {onSave && <button className="save-name" hidden={!canSave} disabled={busy || !canSave} onClick={onSave}>Save scenario</button>}
    </div>
    <details className="header-utilities utility-menu"><summary><Icon name="settings"/>Help & tools</summary><div>
      <button onClick={onCommands} title="Open commands (Ctrl / Cmd K)">Commands</button><button onClick={onActivity}>Activity</button><button onClick={onHelp}>Help</button>
    </div></details>
  </header>;
}
