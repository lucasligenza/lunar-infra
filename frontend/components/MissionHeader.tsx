import type { Mode } from '../types/globe';

export const ACTIVITIES = [
  { mode: 'global', label: 'Explore', number: '01' },
  { mode: 'regional', label: 'Analyze', number: '02' },
  { mode: 'mission', label: 'Design', number: '03' },
  { mode: 'simulation', label: 'Simulate', number: '04' },
] as const;

export default function MissionHeader({ mode, context, status, ready, busy, onMode, onSave, canSave }: {
  mode: Mode; context: string; status: string; ready: boolean; busy: boolean;
  onMode: (mode: Mode) => void; onSave?: () => void; canSave: boolean;
}) {
  return <header className="app-header mission-header">
    <div className="brand"><span className="brand-orbit" aria-hidden="true" /><h1>Lunar<span>OS</span></h1></div>
    <nav className="mode-navigation" aria-label="Primary navigation">
      {ACTIVITIES.map(activity => <button key={activity.mode} disabled={busy} aria-pressed={mode === activity.mode}
        onClick={() => onMode(activity.mode)}><span aria-hidden="true">{activity.number}</span>{activity.label}</button>)}
    </nav>
    <div className="mission-context" title={context}>{context}</div>
    <div className="header-status"><span className={ready ? 'status-dot ready' : 'status-dot'} aria-hidden="true" />
      <span role="status">{status}</span>
      {onSave && <button className="primary-button" disabled={busy || !canSave} onClick={onSave}>Save scenario</button>}
    </div>
  </header>;
}
