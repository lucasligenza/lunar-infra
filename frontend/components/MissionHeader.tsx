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
    <div className="brand"><span className="brand-orbit" aria-hidden="true" /><h1>Lunar<span>OS</span></h1></div>
    <div className="mission-context" title={context}><span aria-hidden="true">/</span>{context}</div>
    <nav className="mode-navigation" aria-label="Primary navigation">
      {ACTIVITIES.filter(activity=>activity.mode!=='regional').map(activity=><button key={activity.mode} disabled={busy} aria-pressed={mode===activity.mode||(activity.mode==='global'&&mode==='regional')} onClick={()=>onMode(activity.mode)}>{activity.label}</button>)}
    </nav>
    <div className="header-status" hidden={mode==='global'||mode==='regional'}><span className={ready ? 'status-dot ready' : 'status-dot'} aria-hidden="true" />
      <span role="status" title={status}>{status}</span>
      {onSave && <button className="save-name" hidden={!canSave} disabled={busy || !canSave} onClick={onSave}>Save scenario</button>}
    </div>
    <button className="command-trigger" onClick={onCommands} aria-label="Search commands" title="Search commands (Ctrl / Cmd K)"><Icon name="search"/><span>Search</span><kbd>Ctrl K</kbd></button>
    <div className="header-utilities"><button onClick={onActivity} aria-label="Activity" title="Activity console"><Icon name="activity"/></button><button onClick={onHelp} aria-label="Help" title="Help, walkthrough and settings"><Icon name="help"/></button></div>
  </header>;
}
