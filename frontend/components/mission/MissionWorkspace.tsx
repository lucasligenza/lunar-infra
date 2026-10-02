"use client";
import {useEffect,type ReactNode} from 'react';
import ContextInspector from './ContextInspector';

// Visual ownership only. Scenario, map, scientific and playback state stay in
// Explorer's existing hooks so closing a panel never discards an input draft.
export default function MissionWorkspace({toolsOpen,toolsSection,inspectorOpen,onCloseTools,onCloseInspector,tools,toolbar,viewport,inspector}: {
  toolsSection:string;
  toolsOpen:boolean;inspectorOpen:boolean;
  onCloseTools:()=>void;onCloseInspector:()=>void;tools:ReactNode;toolbar:ReactNode;viewport:ReactNode;inspector:ReactNode;
}) {
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]')){if(toolsOpen)onCloseTools();else if(inspectorOpen)onCloseInspector();}};
    window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[toolsOpen,inspectorOpen,onCloseTools,onCloseInspector]);
  return <>
    <div className="workspace mission-workspace" data-tools-open={toolsOpen} data-tools-section={toolsSection} data-inspector-open={inspectorOpen}>
      <aside id="exploration-tools" className="tool-rail" aria-label="Exploration tools" hidden={!toolsOpen}>
        <div className="tool-rail-title"><h2>{toolsSection==='assets'?'Add asset':toolsSection==='missions'?'Missions':toolsSection==='simulation'?'Simulation inputs':toolsSection==='overlays'?'Overlays':'Advanced tools'}</h2><button aria-label="Collapse tools" onClick={onCloseTools}>Close</button></div>
        <div className="map-controls-stack">{tools}</div>
      </aside>
      <section id="terrain-workspace" className="map-workspace" aria-label="Terrain exploration">
        <div className="workspace-toolbar">{toolbar}</div><div className="terrain-viewport">{viewport}</div>
      </section>
      <ContextInspector open={inspectorOpen} onClose={onCloseInspector}>{inspector}</ContextInspector>
    </div>
  </>;
}
