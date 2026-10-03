import type {ReactNode} from 'react';
import Icon from './Icon';

/**
 * Right-edge contextual surface. One drawer owns the region at a time; its
 * body is the only scroll container. Desktop floats over the canvas, narrow
 * screens show a bottom task sheet that leaves part of the Moon visible.
 */
export default function Drawer({label,title,eyebrow,closeLabel,onClose,onBack,backLabel='Back',footer,children,className='',hidden=false}:{
  label:string;title:ReactNode;eyebrow?:ReactNode;closeLabel:string;onClose:()=>void;onBack?:()=>void;backLabel?:string;
  footer?:ReactNode;children:ReactNode;className?:string;hidden?:boolean;
}) {
  return <aside className={`context-drawer ${className}`} aria-label={label} hidden={hidden}>
    <header className="drawer-header">
      {onBack&&<button className="drawer-back" onClick={onBack} aria-label={backLabel} title={backLabel}><Icon name="back"/></button>}
      <div className="drawer-heading">{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h2>{title}</h2></div>
      <button className="drawer-close" onClick={onClose} aria-label={closeLabel} title={closeLabel}><Icon name="close"/></button>
    </header>
    <div className="drawer-body">{children}</div>
    {footer&&<footer className="drawer-footer">{footer}</footer>}
  </aside>;
}
