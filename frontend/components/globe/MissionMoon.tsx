"use client";
import {useEffect,useState,useRef,useMemo} from 'react';
import {polarBoundary} from '../../lib/lunar';
import type {Region} from '../../types/scientific';
import dynamic from 'next/dynamic';
import {fetchScientific} from '../../lib/api';
import type {GlobeLocation,GlobeMetadata,CameraState} from '../../types/globe';
import type {AtlasView,AtlasLayer} from '../../types/atlas';
import type {Asset} from '../../types/mission';
import LegendChip from '../overlays/LegendChip';
const MoonCanvas=dynamic(()=>import('./MoonCanvas'),{ssr:false});

export default function MissionMoon({location,assets,base,scenarioId,selectedAssetId,placing,camera,onCamera,onSelect,onAssetSelect,view,onView,navigationRequest,preparedRegion,layer}:{preparedRegion?:Region|null;navigationRequest?:{coordinates:GlobeLocation;distance:number;serial:number}|null;location:GlobeLocation|null;assets:Asset[];base:GlobeLocation|null;
  scenarioId:string|null;selectedAssetId:string|null;placing:boolean;camera:CameraState|null;onCamera:(state:CameraState)=>void;onSelect:(longitude:number,latitude:number)=>void;onAssetSelect:(id:string)=>void;view:AtlasView;onView:(view:AtlasView)=>void;layer?:AtlasLayer}) {
  const [metadata,setMetadata]=useState<GlobeMetadata|null>(null),[error,setError]=useState<string|null>(null),[reload,setReload]=useState(0);
  const [flight,setFlight]=useState<{coordinates:GlobeLocation;distance:number;serial:number}|null>(null),[overlayStatus,setOverlayStatus]=useState('');
  const serial=useRef(0);
  useEffect(()=>{if(navigationRequest)setFlight(navigationRequest);},[navigationRequest]);
  const boundaries=useMemo(()=>preparedRegion&&["temperature","illumination"].includes(view.layer)?[polarBoundary(preparedRegion)]:[],[preparedRegion,view.layer]);
  useEffect(()=>{const abort=new AbortController();setError(null);fetchScientific<GlobeMetadata>('/globe',abort.signal).then(value=>{if(!abort.signal.aborted){setMetadata(value);if(!value.available)setError('Prepared global imagery and terrain are unavailable. Run the global pipeline and retry.');}}).catch(error=>{if(!abort.signal.aborted)setError(error.message);});
    return ()=>abort.abort();},[reload]);
  useEffect(()=>{const coordinates=base??location;if(coordinates)setFlight({coordinates,distance:1.18,serial:++serial.current});},[scenarioId]);
  useEffect(()=>{if(layer&&(view.tileUrl!==layer.url_template||view.preparation!==(layer.preparation_status??'ready')))onView({...view,tileUrl:layer.url_template,preparation:layer.preparation_status??'ready'});},[layer?.url_template,layer?.preparation_status,view.tileUrl,view.preparation]);
  const site=base??location;
  return <div className="mission-moon">{metadata?.available?<MoonCanvas metadata={metadata} location={location} assets={assets} base={base} flight={flight}
    boundaries={boundaries} selectedAssetId={selectedAssetId} placementActive={placing} onAssetSelect={onAssetSelect} onSelect={point=>onSelect(point.longitude_deg,point.latitude_deg)}
    texture={true} grid={false} camera={camera} onCamera={onCamera} onReady={()=>{}} atlas={view} onAtlasStatus={setOverlayStatus}
    controls={site&&<button className="mission-fly" title="Fly to the mission site" onClick={()=>setFlight({coordinates:site,distance:1.18,serial:++serial.current})}>Fly to selected site</button>}/>:
    <div className="globe-loading" role={error?'alert':'status'}>{error??'Loading global mission terrain…'}{error&&<button onClick={()=>setReload(value=>value+1)}>Retry mission terrain</button>}</div>}
    {view.layer!=='none'&&layer&&<LegendChip layer={layer} status={overlayStatus} onRetry={()=>onView({...view,reload:(view.reload??0)+1})}/>}
    {view.layer!=='none'&&!layer&&<div className="legend-chip" role="status">Layer is unavailable. Prepare its registered source or choose Imagery.</div>}
  </div>;
}
