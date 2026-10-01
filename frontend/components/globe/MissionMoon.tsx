"use client";
import {useEffect,useState,useRef} from 'react';
import dynamic from 'next/dynamic';
import {fetchScientific} from '../../lib/api';
import type {GlobeLocation,GlobeMetadata,CameraState} from '../../types/globe';
import type {AtlasView,AtlasLayer} from '../../types/atlas';
import type {Asset} from '../../types/mission';
import AtlasLegend from './AtlasLegend';
const MoonCanvas=dynamic(()=>import('./MoonCanvas'),{ssr:false});

export default function MissionMoon({location,assets,base,scenarioId,selectedAssetId,placing,camera,onCamera,onSelect,onAssetSelect,view,onView}:{location:GlobeLocation|null;assets:Asset[];base:GlobeLocation|null;
  scenarioId:string|null;selectedAssetId:string|null;placing:boolean;camera:CameraState|null;onCamera:(state:CameraState)=>void;onSelect:(longitude:number,latitude:number)=>void;onAssetSelect:(id:string)=>void;view:AtlasView;onView:(view:AtlasView)=>void}) {
  const [metadata,setMetadata]=useState<GlobeMetadata|null>(null),[error,setError]=useState<string|null>(null),[reload,setReload]=useState(0);
  const [flight,setFlight]=useState<{coordinates:GlobeLocation;distance:number;serial:number}|null>(null),[overlayStatus,setOverlayStatus]=useState('');
  const serial=useRef(0);
  const [layers,setLayers]=useState<AtlasLayer[]>([]);
  useEffect(()=>{const abort=new AbortController();setError(null);fetchScientific<GlobeMetadata>('/globe',abort.signal).then(value=>{if(!abort.signal.aborted){setMetadata(value);if(!value.available)setError('Prepared global imagery and terrain are unavailable. Run the global pipeline and retry.');}}).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
    fetchScientific<AtlasLayer[]>('/atlas/layers',abort.signal).then(setLayers).catch(()=>{});return ()=>abort.abort();},[reload]);
  useEffect(()=>{const coordinates=base??location;if(coordinates)setFlight({coordinates,distance:1.18,serial:++serial.current});},[scenarioId]);
  const layer=layers.find(layer=>layer.id===view.layer&&(['geology','temperature','illumination'].includes(layer.id)||layer.dataset_id===view.dataset||(view.dataset==='auto'&&layer.dataset_id===(layers.some(value=>value.dataset_id==='gld100')?'gld100':'lola-global'))));
  useEffect(()=>{if(layer&&(view.tileUrl!==layer.url_template||view.preparation!==(layer.preparation_status??'ready')))onView({...view,tileUrl:layer.url_template,preparation:layer.preparation_status??'ready'});},[layer?.url_template,layer?.preparation_status,view.tileUrl,view.preparation]);
  return <div className="mission-moon">{metadata?.available?<MoonCanvas metadata={metadata} location={location} assets={assets} base={base} flight={flight}
    selectedAssetId={selectedAssetId} placementActive={placing} onAssetSelect={onAssetSelect} onSelect={point=>onSelect(point.longitude_deg,point.latitude_deg)}
    texture={true} grid={false} camera={camera} onCamera={onCamera} onReady={()=>{}} atlas={view} onAtlasStatus={setOverlayStatus}/>:
    <div className="globe-loading" role={error?'alert':'status'}>{error??'Loading global mission terrain…'}{error&&<button onClick={()=>setReload(value=>value+1)}>Retry mission terrain</button>}</div>}
    {location&&<button className="mission-fly" onClick={()=>setFlight({coordinates:location,distance:1.18,serial:++serial.current})}>Fly to selected site</button>}
    {view.layer!=='none'&&<details className="mission-layer-status"><summary>{view.layer} / {overlayStatus}</summary>{layer?<AtlasLegend layer={layer}/>:<p>Layer is unavailable. Prepare its registered source or select NASA imagery.</p>}
      {overlayStatus.includes('unavailable')&&<button onClick={()=>onView({...view,reload:(view.reload??0)+1})}>Retry scientific layer</button>}</details>}
  </div>;
}
