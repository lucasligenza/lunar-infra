"use client";
import {useEffect,useRef,useState} from 'react';
import type {DiscoveryProvider,DiscoverySnapshot} from '../../types/atlas';

function publicLink(url:string|null) {if(!url)return undefined;try {return new URL(url).protocol==='https:'?url:undefined;}catch{return undefined;}}
function fileSize(bytes:number|null){return bytes===null?'Size unknown':bytes<1e6?`${bytes.toLocaleString()} bytes`:`${(bytes/1e6).toFixed(2)} MB`;}

export default function DatasetDiscovery({provider}:{provider:DiscoveryProvider}) {
  const [snapshot,setSnapshot]=useState<DiscoverySnapshot|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const request=useRef<AbortController|null>(null);
  useEffect(()=>()=>request.current?.abort(),[]);
  async function browse(refresh=false) {
    request.current?.abort();const abort=new AbortController();request.current=abort;setLoading(true);setError(null);
    try {
      const response=await fetch(`/api/atlas/discovery/${provider.id}?limit=20&refresh=${refresh}`,{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(15000)]),cache:'no-store'});
      const result=await response.json();if(!response.ok)throw new Error(result.detail??'PDS collection discovery failed. Retry metadata.');
      if(!abort.signal.aborted){setSnapshot(result);setLoading(false);}
    }catch(error){if(!abort.signal.aborted){setLoading(false);setError(error instanceof Error?error.message:'Source metadata unavailable. Retry discovery.');}}
  }
  return <section className="dataset-discovery" aria-label={`${provider.name} discovery`}>
    <p>{provider.note}</p><button disabled={loading} onClick={()=>void browse()}>Browse PDS products</button>
    {snapshot&&<button disabled={loading} onClick={()=>void browse(true)}>Refresh PDS metadata</button>}
    {loading&&<p role="status">Reading bounded PDS metadata; no numeric product is being downloaded…</p>}
    {error&&<p role="alert">{error}</p>}
    {snapshot&&<><p>{snapshot.products.length} of {snapshot.total_products} indexed products. Snapshot {new Date(snapshot.fetched_at).toISOString().replace('T',' ').replace('Z',' UTC')}.</p>
      <p>{snapshot.note}</p><details><summary>Metadata fingerprint</summary><p className="metadata-fingerprint">{snapshot.metadata_sha256}</p><a href={publicLink(snapshot.source_url)} target="_blank" rel="noreferrer">Original PDS API response</a></details>
      {snapshot.products.map(product=><details key={product.identifier}><summary>{product.title}</summary><p className="metadata-fingerprint">{product.identifier}</p>
        <p>{product.product_class} / version {product.version??'unspecified'}</p><p>Observations: {product.period.start??'unspecified'} through {product.period.stop??'unspecified'}.</p>
        <p>Indexed bounds: {product.indexed_coverage.south??'?'}° to {product.indexed_coverage.north??'?'}° latitude / {product.indexed_coverage.west??'?'}° to {product.indexed_coverage.east??'?'}° longitude.</p>
        <p>{product.indexed_coverage.note}</p><a href={publicLink(product.label_url)} target="_blank" rel="noreferrer">Original scientific label</a>
        <ul>{product.files.map(file=><li key={file.url}><a href={publicLink(file.url)} target="_blank" rel="noreferrer">{file.url.split('/').at(-1)}</a><span>{fileSize(file.bytes)} / {file.media_type??'format unspecified'}</span><small>Source MD5 {file.md5??'unspecified'}; not yet locally validated.</small></li>)}</ul>
        <p>Numerical queries and overlays unavailable. Opening a source file link may download the full product; review its size first.</p>
      </details>)}</>}
  </section>;
}
