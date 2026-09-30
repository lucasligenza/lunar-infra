export async function fetchScientific<T>(path: string, signal?: AbortSignal): Promise<T> {
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
  return response.json() as Promise<T>;
}

export async function calculateScientific<T>(path:string,body:unknown,signal?:AbortSignal):Promise<T> {
  const response=await fetch(`/api${path}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
    signal:signal?AbortSignal.any([signal,AbortSignal.timeout(30000)]):AbortSignal.timeout(30000)});
  const result=await response.json();
  if(!response.ok)throw new Error(typeof result.detail==='string'?result.detail:'Check the analysis coordinates, extent and available dataset.');
  return result as T;
}
