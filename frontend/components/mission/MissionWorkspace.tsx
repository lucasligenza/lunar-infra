"use client";
import {useEffect,useRef,type ReactNode} from 'react';

export type MissionMenu='overlays'|'palette'|null;
export type MissionDrawer='location'|'asset'|'missions'|'setup'|null;

// Visual ownership only. Scenario, map, scientific and playback state stay in
// Explorer's hooks; every surface stays mounted while hidden so drafts survive.
// One menu (left) and one drawer (right) at most; narrow screens show one.
export default function MissionWorkspace({menu,drawer,onCloseMenu,onCloseDrawer,menus,drawers,toolbar,viewport}: {
  menu:MissionMenu;drawer:MissionDrawer;onCloseMenu:()=>void;onCloseDrawer:()=>void;
  menus:Record<Exclude<MissionMenu,null>,ReactNode>;drawers:ReactNode;toolbar:ReactNode;viewport:ReactNode;
}) {
  const state=useRef({menu,drawer});state.current={menu,drawer};
  useEffect(()=>{const close=(event:KeyboardEvent)=>{if(event.key!=='Escape'||document.querySelector('dialog[open]'))return;
      if(state.current.menu)onCloseMenu();else if(state.current.drawer)onCloseDrawer();};
    window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[onCloseMenu,onCloseDrawer]);
  return <div className="workspace mission-workspace" data-menu={menu??'none'} data-drawer={drawer??'none'}>
    <section id="terrain-workspace" className="map-workspace" aria-label="Terrain exploration">
      <div className="terrain-viewport">{viewport}</div>
      <div className="workspace-toolbar surface-toolbar" role="toolbar" aria-label="Mission tools">{toolbar}</div>
    </section>
    {menu&&<div className="menu-slot">{menus[menu]}</div>}
    <div className="drawer-slot" hidden={!drawer}>{drawers}</div>
  </div>;
}
