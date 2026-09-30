"use client";
import {useEffect,useState} from 'react';
import {fetchScientific} from '../../lib/api';
import type {AtlasSector} from '../../types/atlas';
import type {GlobeLocation} from '../../types/globe';

type Favorite={name:string;location:GlobeLocation};
export default function AtlasRegions({location,sector,onSector,onSelect}:{location:GlobeLocation|null;sector:AtlasSector|null;
  onSector:(sector:AtlasSector|null)=>void;onSelect:(location:GlobeLocation,distance?:number)=>void}) {
  const [sectors,setSectors]=useState<AtlasSector[]>([]),[level,setLevel]=useState(0),[face,setFace]=useState(''),[error,setError]=useState<string|null>(null);
  const [favorites,setFavorites]=useState<Favorite[]>([]),[name,setName]=useState('');
  useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem('lunaros-favorites-v1')??'[]');
    if(Array.isArray(saved))setFavorites(saved.filter(item=>typeof item.name==='string'&&Number.isFinite(item.location?.latitude_deg)&&Math.abs(item.location.latitude_deg)<=90&&Number.isFinite(item.location?.longitude_deg)).slice(0,50));
  }catch{setError('Saved favorites could not be read. New favorites can still be saved.');}},[]);
  useEffect(()=>{const abort=new AbortController();setSectors([]);
    fetchScientific<AtlasSector[]>(`/atlas/sectors?level=${level}${face?`&face=${face}`:''}`,abort.signal).then(value=>{if(!abort.signal.aborted)setSectors(value);}).catch(error=>{if(!abort.signal.aborted)setError(error.message);});return ()=>abort.abort();},[level,face]);
  function save(values:Favorite[]) {try{localStorage.setItem('lunaros-favorites-v1',JSON.stringify(values));setFavorites(values);}catch{setError('Browser storage is unavailable; favorites were not saved.');}}
  return <section aria-label="Geographic sectors" className="atlas-regions"><h3>Geographic sectors</h3>
    <p>Cube-sphere navigation covers both poles without latitude-grid singularities. Sectors are separate from named destinations and rendering tiles.</p>
    <div className="button-row"><label>Sector depth<select value={level} onChange={e=>setLevel(Number(e.target.value))}><option value={0}>6 hemispheres</option><option value={1}>24 sectors</option><option value={2}>96 sectors</option></select></label>
      <label>Hemisphere<select value={face} onChange={e=>setFace(e.target.value)}><option value="">All faces</option>{['near','far','east','west','north','south'].map(face=><option key={face}>{face}</option>)}</select></label></div>
    <div className="sector-overview">{sectors.map(item=><button key={item.id} aria-pressed={sector?.id===item.id} onClick={()=>{onSector(item);onSelect(item.center,item.level===0?2.4:1.6);}}>{item.name}<small>{item.center.latitude_deg.toFixed(1)}° / {item.center.longitude_deg.toFixed(1)}° E</small></button>)}</div>
    {sector&&<><p>Selected: {sector.name}. Prepared global terrain covers this sector; finer data availability varies.</p><button onClick={()=>onSector(null)}>Clear sector highlight</button></>}
    <h3>Favorite locations</h3><form onSubmit={e=>{e.preventDefault();if(location&&name.trim()){save([...favorites,{name:name.trim(),location}].slice(-50));setName('');}}}>
      <label>Favorite name<input value={name} maxLength={100} onChange={e=>setName(e.target.value)} required /></label><button disabled={!location}>Save selected location</button></form>
    {favorites.map((favorite,index)=><div key={`${index}-${favorite.name}`} className="button-row"><button onClick={()=>onSelect(favorite.location)}>{favorite.name}</button><button aria-label={`Remove favorite ${favorite.name}`} onClick={()=>save(favorites.filter((_,i)=>i!==index))}>×</button></div>)}
    {error&&<p role="alert">{error}</p>}
  </section>;
}
