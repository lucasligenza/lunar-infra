"use client";
import { useEffect, useState } from 'react';
import Dialog from './ui/Dialog';
import { recordActivity } from '../lib/activity';
export interface Command { id: string; label: string; group: string; run: () => void | Promise<void>; disabled?: string }

export default function CommandPalette({ open, onClose, commands }: { open: boolean; onClose: () => void; commands: Command[] }) {
  const [query, setQuery] = useState(''), [index, setIndex] = useState(0);
  useEffect(() => { if (open) { setQuery(''); setIndex(0); } }, [open]);
  const results = commands.filter(command => `${command.label} ${command.group}`.toLowerCase().includes(query.toLowerCase()));
  const active = Math.min(index, Math.max(0, results.length - 1));
  useEffect(() => { if (open) document.getElementById(`command-${results[active]?.id}`)?.scrollIntoView({ block: 'nearest' }); }, [open, active, query]);
  function execute(command: Command | undefined) {
    if (!command || command.disabled) return;
    onClose();
    Promise.resolve().then(command.run).catch(error => recordActivity('WARN', 'Command failed', String(error)));
  }
  return <Dialog open={open} onClose={onClose} label="Command palette" className="command-palette">
    <header><h2>Command palette</h2><button onClick={onClose} aria-label="Close command palette">Esc</button></header>
    <label className="command-search"><span aria-hidden="true">&gt;</span><input data-dialog-focus type="search" role="combobox" aria-label="Search commands"
      aria-expanded={true} aria-controls="command-results" aria-activedescendant={results.length ? `command-${results[active].id}` : undefined}
      value={query} placeholder="Navigate, show a layer or run a saved mission" onChange={event => { setQuery(event.target.value); setIndex(0); }}
      onKeyDown={event => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setIndex((active + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % Math.max(1, results.length)); }
        if (event.key === 'Enter') { event.preventDefault(); execute(results[active]); }
      }} /></label>
    <div id="command-results" role="listbox" aria-label="Available commands">{results.map((command, position) =>
      <div id={`command-${command.id}`} key={command.id} role="option" aria-selected={position === active} aria-disabled={Boolean(command.disabled)}
        onMouseMove={() => setIndex(position)} onClick={() => execute(command)}>
        <span>{command.label}<small>{command.disabled ?? command.group}</small></span><kbd>{position === active ? 'Enter' : ''}</kbd>
      </div>)}{!results.length && <p>No matching command. Try “Analyze”, “slope” or “catalog”.</p>}</div>
    <footer><span>↑ ↓ navigate · Enter execute · Esc close</span><span>Ctrl / Cmd K</span></footer>
  </Dialog>;
}
