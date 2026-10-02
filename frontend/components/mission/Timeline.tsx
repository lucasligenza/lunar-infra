"use client";

import { useEffect, useRef, useState } from "react";
import SimulationBar from "./SimulationBar";
import SimulationDrawer from "./SimulationDrawer";
import type { SimulationRun } from "../../types/simulation";
import type {Asset} from '../../types/mission';

export default function Timeline({ run, index, onIndex, active = true, onExpandedChange,asset }: { run: SimulationRun; index: number; onIndex: (index: number) => void; active?: boolean; onExpandedChange?: (expanded: boolean) => void;asset?:Asset }) {
  const [expanded, setExpanded] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(()=>{if(!active) setPlaying(false);},[active]);
  const [speed, setSpeed] = useState(1);
  const [windowSize, setWindowSize] = useState(0);
  const container=useRef<HTMLElement>(null);
  function changeExpanded(open:boolean) {setExpanded(open);onExpandedChange?.(open);if(!open)container.current?.querySelector<HTMLButtonElement>('[aria-controls="mission-timeline-details"]')?.focus();}
  useEffect(()=>{if(!active||!expanded)return;const close=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!document.querySelector('dialog[open]'))changeExpanded(false);};window.addEventListener('keydown',close);return()=>window.removeEventListener('keydown',close);},[active,expanded,onExpandedChange]);
  const position = useRef(index); position.current = index;
  const rows = run.result.intervals;
  const current = rows[Math.min(index, rows.length - 1)];
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(() => {
      const next = Math.min(rows.length - 1, position.current + speed);
      onIndex(next); if (next === rows.length - 1) setPlaying(false);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [playing, speed, rows.length, onIndex]);
  function select(value: number) { setPlaying(false); onIndex(value); }
  return <section ref={container} id="mission-timeline" className={expanded ? "mission-timeline expanded" : "mission-timeline"} aria-label="Mission timeline">
    <SimulationBar asset={asset} current={current} index={index} count={rows.length} playing={playing} expanded={expanded} speed={speed} inputKind={run.result.input_kind}
      onToggle={()=>changeExpanded(!expanded)} onPlay={()=>{if(index===rows.length-1)onIndex(0);setPlaying(value=>!value);}}
      onSpeed={setSpeed} onSelect={select}/>
    {expanded&&<SimulationDrawer run={run} index={index} windowSize={windowSize} onWindow={setWindowSize} onSelect={select}/>}
  </section>;
}
