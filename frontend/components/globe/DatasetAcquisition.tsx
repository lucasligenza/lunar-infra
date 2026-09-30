"use client";
import {useState} from 'react';

export default function DatasetAcquisition({dataset}:{dataset:string}) {
  const [plan,setPlan]=useState<{download_bytes:number;disk_budget_bytes:number;subset_method:string}|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  async function inspect() {
    setLoading(true);setError(null);
    try {const response=await fetch(`/api/atlas/acquisition/${dataset}`,{signal:AbortSignal.timeout(10000)}),result=await response.json();
      if(!response.ok)throw new Error(result.detail??'Acquisition plan unavailable');setPlan(result);
    }catch(error){setError(error instanceof Error?error.message:'Acquisition plan unavailable');}finally{setLoading(false);}
  }
  return <section className="acquisition-plan"><button disabled={loading} onClick={()=>void inspect()}>Inspect acquisition budget</button>
    {loading&&<p role="status">Checking source and local disk requirements…</p>}{error&&<p role="alert">{error}</p>}
    {plan&&<><p>Download budget {(plan.download_bytes/1e6).toFixed(1)} MB; disk budget {(plan.disk_budget_bytes/1e6).toFixed(1)} MB.</p><p>{plan.subset_method}</p><p>Run the documented preparation command for this dataset; this inspection starts no download.</p></>}
  </section>;
}
