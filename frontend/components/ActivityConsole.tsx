"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { activityStore } from '../lib/activity';

export default function ActivityConsole({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const entries = useSyncExternalStore(activityStore.subscribe, activityStore.snapshot, activityStore.serverSnapshot);
  const [expanded, setExpanded] = useState(false), [details, setDetails] = useState(false);
  const list = useRef<HTMLOListElement>(null);
  useEffect(() => { if (expanded && list.current) list.current.scrollTop = list.current.scrollHeight; }, [entries, expanded]);
  if (!visible) return null;
  const latest = entries.at(-1);
  return <section className={`activity-console${expanded ? ' expanded' : ''}`} aria-label="System activity">
    <header><button aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? 'Minimize activity' : 'Open activity'}<span aria-hidden="true">&gt;_</span></button>
      <span className={latest?.kind === 'WARN' ? 'warning' : ''}>{latest ? `[${latest.kind}] ${latest.message}` : 'No activity recorded'}</span>
      <small>{entries.length} / 100</small>
      {expanded && <><label><input type="checkbox" checked={details} onChange={event => setDetails(event.target.checked)} />Request details</label><button onClick={activityStore.clear}>Clear activity</button></>}
      <button onClick={onDismiss}>Dismiss activity</button>
    </header>
    {expanded && <ol ref={list} aria-label="Recorded application events">{entries.map(entry => <li key={entry.id} className={entry.kind === 'WARN' ? 'warning' : ''}>
      <time dateTime={entry.time}>{entry.time.slice(11, 19)} UTC</time><strong>[{entry.kind}]</strong><span>{entry.message}{details && entry.detail && <small>{entry.detail}</small>}</span>
    </li>)}{!entries.length && <li>No events yet. Navigate or request scientific data to begin.</li>}</ol>}
  </section>;
}
