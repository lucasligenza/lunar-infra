"use client";
import {useEffect,useState} from 'react';
import {fetchScientific} from './api';
import type {AtlasDataset,AtlasLayer,DiscoveryProvider} from '../types/atlas';

/**
 * Registered atlas metadata. A lost read-only connection gets one retry;
 * persistent failures stay visible independently of point sampling and can be
 * retried explicitly. Layer availability always comes from the backend registry.
 */
export function useAtlasCatalog() {
  const [catalog,setCatalog]=useState<AtlasDataset[]>([]),[layers,setLayers]=useState<AtlasLayer[]>([]);
  const [providers,setProviders]=useState<DiscoveryProvider[]>([]),[providerError,setProviderError]=useState<string|null>(null);
  const [error,setError]=useState<string|null>(null),[reload,setReload]=useState(0);
  useEffect(()=>{const abort=new AbortController();setError(null);setProviderError(null);
    async function metadata<T>(path:string):Promise<T> {
      try{return await fetchScientific<T>(path,abort.signal);}
      catch(failure){if(abort.signal.aborted)throw failure;return fetchScientific<T>(path,abort.signal);}
    }
    metadata<AtlasDataset[]>('/atlas/datasets').then(value=>{if(!abort.signal.aborted)setCatalog(value);}).catch(failure=>{if(!abort.signal.aborted)setError(failure.message);});
    metadata<AtlasLayer[]>('/atlas/layers').then(value=>{if(!abort.signal.aborted)setLayers(value);}).catch(failure=>{if(!abort.signal.aborted)setError(failure.message);});
    fetchScientific<DiscoveryProvider[]>('/atlas/providers',abort.signal).then(setProviders).catch(()=>{if(!abort.signal.aborted)setProviderError('Discovery provider registry unavailable. Reopen analysis tools to retry.');});
    return ()=>abort.abort();},[reload]);
  return {catalog,layers,providers,providerError,error,retry:()=>setReload(value=>value+1)};
}
export type AtlasCatalog=ReturnType<typeof useAtlasCatalog>;

/** Terrain grid used for global coloring when the view requests `auto`. */
export function terrainDataset(catalog:AtlasDataset[],layers:AtlasLayer[],dataset:string) {
  if(dataset!=='auto')return dataset;
  return catalog.find(value=>value.id==='gld100'&&value.numerical_queries)?.id??(layers.some(value=>value.dataset_id==='gld100')?'gld100':'lola-global');
}

/** One row per quantity: terrain layers from the chosen grid plus registered non-terrain layers. */
export function overlayLayers(catalog:AtlasDataset[],layers:AtlasLayer[],dataset:string) {
  const terrain=terrainDataset(catalog,layers,dataset);
  return layers.filter(value=>value.dataset_id===terrain||['geology','temperature','illumination'].includes(value.id));
}
