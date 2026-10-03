import {useId} from 'react';

/** Native radio group styled as a segmented control; arrow keys move the choice. */
export default function Segmented<T extends string|number>({label,value,options,onChange,disabled=false,className=''}:{
  label:string;value:T;options:{value:T;label:string;title?:string}[];onChange:(value:T)=>void;disabled?:boolean;className?:string;
}) {
  const name=useId();
  return <div className={`segmented ${className}`} role="radiogroup" aria-label={label} aria-disabled={disabled||undefined}>
    {options.map(option=><label key={String(option.value)} title={option.title}>
      <input type="radio" name={name} checked={option.value===value} disabled={disabled} onChange={()=>onChange(option.value)}/>
      <span>{option.label}</span>
    </label>)}
  </div>;
}
