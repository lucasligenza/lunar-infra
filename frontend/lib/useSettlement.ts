"use client";
import {useEffect,useRef,useState} from 'react';
import {calculateScientific} from './api';
import type {GlobeLocation} from '../types/globe';
import type {SettlementSettings,SuitabilityReport} from '../types/suitability';

export function useSettlement() {
  const [settings,setSettings]=useState<SettlementSettings>({radius:'25',neighborhood:'5',slope:'5',dataset:'auto'});
  const [report,setReport]=useState<SuitabilityReport|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState<string|null>(null);
  const controller=useRef<AbortController|null>(null);
  useEffect(()=>()=>controller.current?.abort(),[]);
  async function search(location:GlobeLocation) {
    controller.current?.abort();const abort=new AbortController();controller.current=abort;
    setLoading(true);setError(null);setReport(null);
    try {
      const result=await calculateScientific<SuitabilityReport>('/atlas/suitability',{
        area:{kind:'circle',latitude_deg:location.latitude_deg,longitude_deg:location.longitude_deg,radius_km:Number(settings.radius)},dataset:settings.dataset,
        candidate_radius_km:Number(settings.neighborhood),max_slope_deg:Number(settings.slope)},abort.signal);
      if(!abort.signal.aborted)setReport(result);
    }catch(error){if(!abort.signal.aborted)setError(error instanceof Error?error.message:'Site screening failed. Retry.');}
    finally{if(!abort.signal.aborted)setLoading(false);}
  }
  return {settings,setSettings,report,loading,error,search};
}
export type SettlementState=ReturnType<typeof useSettlement>;
