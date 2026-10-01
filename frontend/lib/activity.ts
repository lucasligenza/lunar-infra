export type ActivityKind = 'DATA' | 'MAP' | 'MISSION' | 'SIM' | 'WARN';
export interface Activity { id: number; time: string; kind: ActivityKind; message: string; detail?: string }
const empty: Activity[] = [];
let entries: Activity[] = empty;
let serial = 0;
const listeners = new Set<() => void>();
export function recordActivity(kind: ActivityKind, message: string, detail?: string) {
  if (typeof window === 'undefined') return;
  entries = [...entries, { id: ++serial, time: new Date().toISOString(), kind, message, detail: detail?.slice(0, 500) }].slice(-100);
  listeners.forEach(listener => listener());
}
export const activityStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
  snapshot: () => entries,
  serverSnapshot: () => empty,
  clear() { entries = empty; listeners.forEach(listener => listener()); },
};
