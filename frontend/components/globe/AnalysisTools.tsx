"use client";
import {useState} from 'react';
import type {AtlasSector,AtlasAnalysisState} from '../../types/atlas';
import type {GlobeLocation} from '../../types/globe';
import type {AtlasCatalog} from '../../lib/useAtlasCatalog';
import AtlasRegions from './AtlasRegions';
import AtlasAnalysis from './AtlasAnalysis';
import DatasetDiscovery from './DatasetDiscovery';
import DatasetAcquisition from './DatasetAcquisition';
import Drawer from '../ui/Drawer';
import Segmented from '../ui/Segmented';

export type AnalysisTab='analysis'|'regions'|'catalog';

/** Regional statistics, profiles, sectors and the dataset catalog: opened explicitly, never by default. */
export default function AnalysisTools({location,dataset,tab,onTab,onClose,onBack,atlas,sector,onSector,onSelect,analysis,onAnalysis}:{
  location:GlobeLocation|null;dataset:string;tab:AnalysisTab;onTab:(tab:AnalysisTab)=>void;onClose:()=>void;onBack?:()=>void;atlas:AtlasCatalog;
  sector:AtlasSector|null;onSector:(sector:AtlasSector|null)=>void;onSelect:(location:GlobeLocation,distance?:number)=>void;
  analysis:AtlasAnalysisState;onAnalysis:(state:AtlasAnalysisState)=>void;
}) {
  const [query,setQuery]=useState('');
  const {catalog,providers,providerError,error,retry}=atlas;
  return <Drawer label="Analysis tools" title="Analysis tools" eyebrow="REGION" closeLabel="Close analysis tools" onClose={onClose} onBack={onBack} backLabel="Back to location">
    <Segmented label="Analysis tool" value={tab} onChange={onTab} options={[{value:'analysis',label:'Analysis'},{value:'regions',label:'Regions'},{value:'catalog',label:'Catalog'}]}/>
    {error&&<div className="catalog-error" role="alert"><p>Scientific catalog unavailable. {error}</p><button onClick={retry}>Retry catalog</button></div>}
    {tab==='analysis'&&<AtlasAnalysis location={location} dataset={dataset} state={analysis} onState={onAnalysis}/>}
    {tab==='regions'&&<AtlasRegions location={location} sector={sector} onSector={onSector} onSelect={onSelect}/>}
    <section className="atlas-catalog" hidden={tab!=='catalog'}><h3>Dataset catalog</h3><label>Search science datasets<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Terrain, geology, thermal…" /></label>
      {providerError&&<p role="alert">{providerError}</p>}
      {catalog.filter(value=>`${value.name} ${value.category} ${value.instrument}`.toLowerCase().includes(query.toLowerCase())).map(value=><details key={value.id}><summary><span>{value.name}</span><small>{value.category} / {value.acquisition_status.replaceAll('_',' ')}</small></summary>
        <p>{value.organization} / {value.version}</p><p>{value.numerical_queries?'Numerical source available':'Numerical queries unavailable'}; {value.overlay_available?'3D overlay available':'3D overlay unavailable'}</p>
        <p>{value.coverage?`${value.coverage.south}° to ${value.coverage.north}° latitude; ${value.coverage.west}° to ${value.coverage.east}° E`:'Specific coverage not yet validated'}</p>
        <p>{value.spacing_m_at_equator?`${value.spacing_m_at_equator.toFixed(1)} m spacing (equatorial for cylindrical data)`:'Resolution requires product selection'}</p>
        <p>Units: {value.unit}. {value.longitude_convention}.</p><p>{value.crs}</p><p>{value.frame_note}</p>
        <p>Source period: {value.period.start??'unspecified'} through {value.period.stop??'unspecified'}.</p>
        <p>{value.citation}</p>{value.limitations.map(note=><p key={note}>{note}</p>)}<a href={value.source_url} target="_blank" rel="noreferrer">Source / discovery</a>
        {['pds_equirectangular','range_zip_geology','diviner_polar_table'].includes(value.adapter)&&<DatasetAcquisition dataset={value.id}/>}
        {providers.filter(provider=>provider.dataset_id===value.id).map(provider=><DatasetDiscovery key={provider.id} provider={provider}/>)}
      </details>)}
    </section>
  </Drawer>;
}
