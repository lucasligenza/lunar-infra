import {useId} from 'react';
import type {AtlasLayer} from '../../types/atlas';
import Icon,{type IconName} from './Icon';

export const LAYER_PRESENTATION:Record<string,{label:string;icon:IconName;note:string}>={
  none:{label:'Imagery',icon:'explore',note:'NASA surface mosaic'},
  elevation:{label:'Elevation',icon:'elevation',note:'Terrain height'},
  slope:{label:'Slope',icon:'slope',note:'Derived inclination'},
  geology:{label:'Geology',icon:'geology',note:'Mapped surface units'},
  temperature:{label:'Temperature',icon:'temperature',note:'Historical · polar'},
  illumination:{label:'Solar visibility',icon:'sun',note:'Long-term mean · polar'},
};

export default function LayerPicker({layers,value,onChange,label='Scientific overlay'}:{
  layers:AtlasLayer[];value:string;onChange:(id:string)=>void;label?:string;
}) {
  const name=useId();
  return <fieldset className="layer-picker" aria-label={label}><legend>Surface layers</legend>
    {[{id:'none',name:'NASA surface imagery',preparation_status:'ready'},...layers].map(layer=>{
      const item=LAYER_PRESENTATION[layer.id]??{label:layer.name,icon:'layers' as const,note:'Registered data layer'};
      const unavailable=layer.preparation_status==='not_prepared';
      return <label className="layer-option" key={layer.id} data-unavailable={unavailable} title={layer.name}>
        <input type="radio" name={name} value={layer.id} checked={value===layer.id} aria-label={item.label} onChange={()=>onChange(layer.id)}/>
        <Icon name={item.icon}/><span><strong>{item.label}</strong><small>{unavailable?'Not prepared locally':item.note}</small></span>
      </label>;
    })}
  </fieldset>;
}
