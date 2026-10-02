import {useEffect,useRef,type ReactNode} from 'react';

export default function ContextInspector({open,onClose,children}:{open:boolean;onClose:()=>void;children:ReactNode}) {
  const close=useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(open)close.current?.focus();},[open]);
  return <div id="context-inspector" className="context-rail" hidden={!open}>
    <div className="context-panel-heading"><span>Details</span><button ref={close} onClick={onClose} aria-label="Close inspector">Close</button></div>
    <div className="context-panel-content">{children}</div>
  </div>;
}
