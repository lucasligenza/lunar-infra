import {useId} from 'react';
import type {AtlasLayer} from '../../types/atlas';
import Icon,{type IconName} from './Icon';

export const LAYER_PRESENTATION:Record<string,{label:string;icon:IconName;note:string}>={
  none:{label:'Imagery',icon:'explore',note:'NASA surface mosaic'},
  elevation:{label:'Elevation',icon:'elevation',note:'Terrain height'},
  slope:{label:'Slope',icon:'slope',note:'Derived inclination'},
  illumination:{label:'Solar visibility',icon:'sun',note:'Long-term mean · prepared south-pole region only'},
  temperature:{label:'Temperature',icon:'temperature',note:'Historical summer bin · prepared south-pole region only'},
  geology:{label:'Geology',icon:'geology',note:'Mapped surface units'},
};
const ORDER=Object.keys(LAYER_PRESENTATION);

/** Display names map onto registered layers; availability stays authoritative from the backend. */
export default function LayerPicker({layers,value,onChange,label='Scientific overlay'}:{
  layers:AtlasLayer[];value:string;onChange:(id:string)=>void;label?:string;
}) {
  const name=useId();
  const rows=[{id:'none',name:'NASA surface imagery',preparation_status:'ready'},...layers]
    .sort((a,b)=>(ORDER.indexOf(a.id)+1||99)-(ORDER.indexOf(b.id)+1||99));
  return <fieldset className="layer-picker" aria-label={label}><legend>Surface layers</legend>
    {rows.map(layer=>{
      const item=LAYER_PRESENTATION[layer.id]??{label:layer.name,icon:'layers' as const,note:'Registered data layer'};
      const unavailable=layer.preparation_status==='not_prepared';
      const polar=['temperature','illumination'].includes(layer.id);
      return <label className="layer-option" key={layer.id} data-unavailable={unavailable} title={`${layer.name}. ${item.note}`}>
        <input type="radio" name={name} value={layer.id} checked={value===layer.id} aria-label={item.label} onChange={()=>onChange(layer.id)}/>
        <Icon name={item.icon}/><span><strong>{item.label}</strong>{(unavailable||polar)&&<small className="coverage-badge" title={item.note}>{unavailable?'Not prepared':'Polar'}</small>}</span>
      </label>;
    })}
  </fieldset>;
}
