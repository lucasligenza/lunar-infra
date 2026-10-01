import { recordActivity } from './activity';
export async function fetchScientific<T>(path: string, signal?: AbortSignal): Promise<T> {
  try {
  const timeout = AbortSignal.timeout(15000);
  const response = await fetch(`/api${path}`, {
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: "no-store",
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("This location is outside the prepared south-pole region.");
    if (response.status === 422) throw new Error("Enter a valid lunar latitude and east-positive longitude.");
    if (response.status === 503) throw new Error("Scientific data is unavailable. Prepare the NASA datasets and restart the backend.");
    throw new Error("The scientific API could not respond. Check that the backend is running, then retry.");
  }
  const result = await response.json();
  const names:Record<string,string>={ '/health':'Scientific API connected','/regions':'Region catalog loaded','/datasets':'Polar dataset metadata loaded',
    '/globe':'Global terrain metadata loaded','/destinations':'Destination catalog loaded','/atlas/layers':'Scientific layer catalog loaded',
    '/atlas/datasets':'Dataset catalog loaded','/atlas/providers':'Data provider catalog loaded' };
  recordActivity('DATA', names[path] ?? (path.startsWith('/atlas/inspect') || path.startsWith('/sites/inspect') ? 'Terrain measurement received' : path.startsWith('/globe/inspect') ? 'Global coverage received' : 'Scientific metadata loaded'), `GET ${path}`);
  return result as T;
  } catch(error) { if(!signal?.aborted)recordActivity('WARN', 'Scientific request failed', `${path}; ${error instanceof Error ? error.message : 'Request failed'}`); throw error; }
}

export async function calculateScientific<T>(path:string,body:unknown,signal?:AbortSignal):Promise<T> {
  try {
  const response=await fetch(`/api${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
    signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});
  const result=await response.json();
  if(!response.ok)throw new Error(typeof result.detail==='string'?result.detail:'Check the analysis coordinates, extent and available dataset.');
  recordActivity('DATA', 'Scientific operation completed', `POST ${path}`);
  return result as T;
  }catch(error){if(!signal?.aborted)recordActivity('WARN','Scientific operation failed',`${path}; ${error instanceof Error ? error.message : 'Request failed'}`);throw error;}
}
