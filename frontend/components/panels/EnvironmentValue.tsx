"use client";
import {useEffect,useState} from 'react';
import {fetchScientific} from '../../lib/api';
import type {AtlasPoint} from '../../types/atlas';

export default function EnvironmentValue({layer,latitude,longitude,sourcePoint}:{layer:string;latitude:number;longitude:number;sourcePoint?:AtlasPoint}) {
  const [point,setPoint]=useState<AtlasPoint|null>(null),[error,setError]=useState<string|null>(null);
  useEffect(()=>{if(sourcePoint){setPoint(sourcePoint);return;}const abort=new AbortController();setPoint(null);setError(null);
    fetchScientific<AtlasPoint>(`/atlas/inspect?latitude=${latitude}&longitude=${longitude}`,abort.signal).then(point=>{if(!abort.signal.aborted)setPoint(point);}).catch(error=>{if(!abort.signal.aborted)setError(error.message);});return()=>abort.abort();},[latitude,longitude,sourcePoint]);
  const value=layer==='temperature'?point?.temperature:point?.solar_visibility;
  return <section className="quantity"><h3>{layer==='temperature'?'Summer brightness temperature':'Average solar visibility'}</h3>
    <p className="quantity-value" data-testid="active-environment-value">{error?'Unavailable':!point?'Loading…':value?.value==null?(value?.status==='nodata'?'Missing source data':'Unavailable here'):`${(value.unit==='fraction'?value.value*100:value.value).toFixed(1)} ${value.unit==='fraction'?'%':value.unit}`}</p>
    {error&&<p role="alert">{error}</p>}
    <details className="method"><summary>Source details</summary><p>{value?.source_id} {value?.version}</p><p>{value?.method}</p><p>{layer==='temperature'?'Historical summer / 00:00–00:15 local-time bin; not current conditions.':'Modeled long-term average; no actual time-resolved sunlight is inferred.'}</p></details>
  </section>;
}
