import type {GlobeLocation} from '../types/globe';
import type {AtlasAnalysisState} from '../types/atlas';

export function areaBoundary(location:GlobeLocation,state:AtlasAnalysisState):GlobeLocation[] {
  if(state.kind==='circle') {
    const distance=Number(state.radius)*1000/1737400,lat=location.latitude_deg*Math.PI/180,lon=location.longitude_deg*Math.PI/180;
    if(!Number.isFinite(distance)||distance<=0||distance>600000/1737400)return [];
    return Array.from({length:97},(_,i)=>{const bearing=i*Math.PI*2/96;
      const phi=Math.asin(Math.sin(lat)*Math.cos(distance)+Math.cos(lat)*Math.sin(distance)*Math.cos(bearing));
      const lambda=lon+Math.atan2(Math.sin(bearing)*Math.sin(distance)*Math.cos(lat),Math.cos(distance)-Math.sin(lat)*Math.sin(phi));
      return {latitude_deg:phi*180/Math.PI,longitude_deg:(lambda*180/Math.PI+360)%360};});
  }
  const {south,north,west,east}=Object.fromEntries(Object.entries(state.bounds).map(([key,value])=>[key,Number(value)]));
  if(![south,north,west,east].every(Number.isFinite)||south>=north)return [];
  const end=west+((east-west)%360+360)%360;
  const corners=[[west,south],[end,south],[end,north],[west,north],[west,south]];
  return corners.slice(0,-1).flatMap((a,index)=>Array.from({length:49},(_,i)=>({longitude_deg:((a[0]+(corners[index+1][0]-a[0])*i/48)%360+360)%360,latitude_deg:a[1]+(corners[index+1][1]-a[1])*i/48})));
}
