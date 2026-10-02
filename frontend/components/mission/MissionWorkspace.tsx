"use client";
import type {ReactNode} from 'react';

export type WorkspacePane='map'|'tools'|'inspector'|'timeline';

// Visual ownership only. Scenario, map, scientific and playback state stay in
// Explorer's existing hooks so closing a panel never discards an input draft.
export default function MissionWorkspace({toolsOpen,toolsSection,inspectorOpen,pane,onPane,onCloseTools,onCloseInspector,tools,toolbar,viewport,inspector,hasTimeline}: {
  toolsSection:string;
  toolsOpen:boolean;inspectorOpen:boolean;pane:WorkspacePane;onPane:(pane:WorkspacePane)=>void;
  onCloseTools:()=>void;onCloseInspector:()=>void;tools:ReactNode;toolbar:ReactNode;viewport:ReactNode;inspector:ReactNode;hasTimeline:boolean;
}) {
  return <>
    <nav className="mobile-navigation" aria-label="Workspace navigation">{(['map','tools','inspector',...(hasTimeline?['timeline']:[])] as WorkspacePane[]).map(value=><a key={value}
      href={value==='map'?'#terrain-workspace':value==='tools'?'#exploration-tools':value==='inspector'?'#context-inspector':'#mission-timeline'}
      aria-current={pane===value?'page':undefined} onClick={event=>{event.preventDefault();onPane(value);}}>{value==='map'?'Map':value==='tools'?'Tools':value==='inspector'?'Inspector':'Timeline'}</a>)}</nav>
    <div className="workspace mission-workspace" data-tools-open={toolsOpen} data-tools-section={toolsSection} data-inspector-open={inspectorOpen}>
      <aside id="exploration-tools" className="tool-rail" aria-label="Exploration tools" hidden={!toolsOpen}>
        <div className="tool-rail-title"><h2>{toolsSection==='assets'?'Add asset':toolsSection==='missions'?'Missions':toolsSection==='simulation'?'Simulation inputs':'Advanced tools'}</h2><button aria-label="Collapse tools" onClick={onCloseTools}>Close</button></div>
        <div className="map-controls-stack">{tools}</div>
      </aside>
      <section id="terrain-workspace" className="map-workspace" aria-label="Terrain exploration">
        <div className="workspace-toolbar">{toolbar}</div><div className="terrain-viewport">{viewport}</div>
      </section>
      <div id="context-inspector" className="context-rail" hidden={!inspectorOpen}>
        <div className="context-panel-heading"><span>Inspector</span><button onClick={onCloseInspector} aria-label="Close inspector">Close</button></div>
        <div className="context-panel-content">{inspector}</div>
      </div>
    </div>
  </>;
}
