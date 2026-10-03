"use client";
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import Icon from '../ui/Icon';

export const TUTORIAL_KEY='lunaros.simulation-tutorial.v1';
export const SIMULATION_STEPS=[
  {target:'loads',title:'Your habitat consumes power',text:'Every interval, the habitat, communications and rover draw electrical power from one shared bus. Their demand is shown in kW, averaged over the interval.'},
  {target:'solar',title:'Solar arrays generate power',text:'Generation = rated power × derating × the input factor for that interval. That factor comes from a hypothetical input profile, because validated time-resolved lunar sunlight is not integrated yet. It is not a prediction of real sunlight.'},
  {target:'battery',title:'Excess power charges batteries',text:'When generation exceeds demand, batteries charge up to their charge-rate limit and capacity. Anything left over is curtailed.'},
  {target:'battery',title:'Batteries support the habitat',text:'When generation drops below demand, batteries discharge, but never below their reserve state of charge.'},
  {target:'status',title:'When a shortage happens',text:'If generation plus available battery discharge cannot meet demand, the remaining kW is unserved: a power shortage. Status turns red and the shortage is marked on the timeline.'},
  {target:'timeline',title:'Scrub or play the timeline',text:'Drag the slider or press Play to watch the system change. Every value comes from the saved Python simulation; scrubbing backward shows exactly the same earlier state.'},
] as const;

/** Optional coach marks attached to the actual simulation controls. */
export default function SimulationTutorial({open,onClose}:{open:boolean;onClose:()=>void}) {
  const [step,setStep]=useState(0),[position,setPosition]=useState<{left:number;top:number}|null>(null);
  const card=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(open)setStep(0);},[open]);
  useLayoutEffect(()=>{
    if(!open)return;
    const target=document.querySelector<HTMLElement>(`[data-tour="${SIMULATION_STEPS[step].target}"]`);
    target?.classList.add('tour-target');
    const place=()=>{
      const box=target?.getBoundingClientRect(),width=card.current?.offsetWidth??320,height=card.current?.offsetHeight??180;
      if(!box||!box.width){setPosition({left:Math.max(12,window.innerWidth/2-width/2),top:Math.max(12,window.innerHeight/2-height/2)});return;}
      const left=Math.min(window.innerWidth-width-12,Math.max(12,box.left+box.width/2-width/2));
      const above=box.top-height-14,below=box.bottom+14;
      setPosition({left,top:above>=12?above:Math.min(window.innerHeight-height-12,below)});
    };
    place();window.addEventListener('resize',place);
    return ()=>{target?.classList.remove('tour-target');window.removeEventListener('resize',place);};
  },[open,step]);
  useEffect(()=>{if(!open)return;const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.stopPropagation();onClose();}};
    window.addEventListener('keydown',escape,true);return()=>window.removeEventListener('keydown',escape,true);},[open,onClose]);
  if(!open)return null;
  const current=SIMULATION_STEPS[step],last=step===SIMULATION_STEPS.length-1;
  return <div ref={card} className="simulation-tutorial" role="dialog" aria-label="Simulation tutorial" aria-describedby="tutorial-text" style={position??{visibility:'hidden'}}>
    <header><span className="eyebrow">HOW IT WORKS · {step+1} / {SIMULATION_STEPS.length}</span><button onClick={onClose} aria-label="Dismiss tutorial"><Icon name="close"/></button></header>
    <h3>{current.title}</h3><p id="tutorial-text">{current.text}</p>
    <div className="button-row"><button disabled={step===0} onClick={()=>setStep(value=>value-1)}>Back</button>
      {last?<button className="primary-button" onClick={onClose}>Finish</button>:<button className="primary-button" onClick={()=>setStep(value=>value+1)}>Next</button>}</div>
  </div>;
}
