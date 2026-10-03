// Three.js builders for markers and analysis geometry drawn on the 3D Moon.
// Positions use the shared lunar graphics frame (lib/globe.ts); geometry is a
// visualization of stored values and never a source of measurements.
import * as THREE from 'three';
import {lunarVector,terrainHeight} from './globe';
import {drawMarker,markerKey,type MarkerStyle} from './asset-icons';
import type {GlobeLocation} from '../types/globe';
import type {NeighborhoodReport} from '../types/suitability';

const RADIUS_M=1737400;

/** Height of the displayed 1° LOLA mesh at a point (bilinear over its vertices), in reference radii. */
export function surfaceRadius(heights:Int16Array|null,longitude:number,latitude:number,offset_m=0) {
  if(!heights)return 1+offset_m/RADIUS_M;
  const lon0=Math.floor(longitude),lat0=Math.floor(latitude),fx=longitude-lon0,fy=latitude-lat0;
  const sample=(lon:number,lat:number)=>terrainHeight(heights,((lon%360)+360)%360,Math.max(-90,Math.min(90,lat)))??0;
  const height=(1-fx)*(1-fy)*sample(lon0,lat0)+fx*(1-fy)*sample(lon0+1,lat0)+(1-fx)*fy*sample(lon0,lat0+1)+fx*fy*sample(lon0+1,lat0+1);
  return 1+(height+offset_m)/RADIUS_M;
}
export function surfacePoint(heights:Int16Array|null,point:{latitude_deg:number;longitude_deg:number},offset_m=0) {
  return new THREE.Vector3(...lunarVector(point.longitude_deg,point.latitude_deg,surfaceRadius(heights,point.longitude_deg,point.latitude_deg,offset_m)));
}

/** Cached canvas textures for vector asset badges, keyed by kind and visual state. */
export class MarkerTextures {
  private cache=new Map<string,THREE.CanvasTexture>();
  get(style:MarkerStyle) {
    const key=markerKey(style);let texture=this.cache.get(key);
    if(!texture){const canvas=document.createElement('canvas');canvas.width=canvas.height=128;drawMarker(canvas.getContext('2d')!,128,style);
      texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;this.cache.set(key,texture);}
    return texture;
  }
  dispose(){for(const texture of this.cache.values())texture.dispose();this.cache.clear();}
}

/** Great-circle polyline between two points, draped slightly above the display mesh. */
export function greatCircle(a:GlobeLocation,b:GlobeLocation,steps=48):GlobeLocation[] {
  const u=new THREE.Vector3(...lunarVector(a.longitude_deg,a.latitude_deg)),v=new THREE.Vector3(...lunarVector(b.longitude_deg,b.latitude_deg));
  const angle=u.angleTo(v);
  return Array.from({length:steps+1},(_,i)=>{const t=i/steps;
    const p=angle<1e-12?u.clone():u.clone().multiplyScalar(Math.sin((1-t)*angle)/Math.sin(angle)).add(v.clone().multiplyScalar(Math.sin(t*angle)/Math.sin(angle)));
    const latitude=Math.asin(Math.max(-1,Math.min(1,p.y/p.length())))*180/Math.PI,longitude=((Math.atan2(-p.z,p.x)*180/Math.PI)+360)%360;
    return {latitude_deg:latitude,longitude_deg:longitude};});
}

export function surfaceLine(points:GlobeLocation[],heights:Int16Array|null,color:number,opacity:number,dashed=false,offset_m=600) {
  const geometry=new THREE.BufferGeometry().setFromPoints(points.map(point=>surfacePoint(heights,point,offset_m)));
  const material=dashed?new THREE.LineDashedMaterial({color,transparent:true,opacity,dashSize:.0012,gapSize:.0008,depthTest:false}):
    new THREE.LineBasicMaterial({color,transparent:true,opacity,depthTest:false});
  const line=new THREE.Line(geometry,material);if(dashed)line.computeLineDistances();line.renderOrder=8;return line;
}

const CELL_COLORS={pass:new THREE.Color('#53b987'),fail:new THREE.Color('#c97a72'),missing:new THREE.Color('#7d8794')};

/**
 * The candidate's actual native analysis cells: translucent fills (low slope /
 * steeper / missing), cell outlines and the neighborhood boundary. One fill
 * triangle pair per returned cell; no subdivision finer than the source grid.
 */
export function neighborhoodGrid(report:NeighborhoodReport,heights:Int16Array|null) {
  const group=new THREE.Group();group.renderOrder=7;
  const positions:number[]=[],colors:number[]=[],edges:number[]=[];
  const cellOfFace:number[]=[];
  report.cells.forEach((cell,index)=>{
    const corners=cell.polygon.map(([lon,lat])=>surfacePoint(heights,{longitude_deg:lon,latitude_deg:lat},400));
    const color=cell.low_slope===true?CELL_COLORS.pass:cell.low_slope===false?CELL_COLORS.fail:CELL_COLORS.missing;
    for(const [a,b,c] of [[0,1,2],[0,2,3]]){for(const corner of [corners[a],corners[b],corners[c]]){positions.push(corner.x,corner.y,corner.z);colors.push(color.r,color.g,color.b);}cellOfFace.push(index);}
    for(let i=0;i<4;i++){const a=corners[i],b=corners[(i+1)%4];edges.push(a.x,a.y,a.z,b.x,b.y,b.z);}
  });
  const fillGeometry=new THREE.BufferGeometry();fillGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));fillGeometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const fill=new THREE.Mesh(fillGeometry,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.34,depthTest:false,depthWrite:false,side:THREE.DoubleSide}));
  fill.userData.cellOfFace=cellOfFace;fill.renderOrder=7;
  const edgeGeometry=new THREE.BufferGeometry();edgeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(edges,3));
  const outline=new THREE.LineSegments(edgeGeometry,new THREE.LineBasicMaterial({color:0xe8eef5,transparent:true,opacity:.28,depthTest:false}));outline.renderOrder=8;
  const center={latitude_deg:report.center[1],longitude_deg:report.center[0]};
  group.add(fill,outline);
  group.userData.center=surfacePoint(heights,center).normalize();
  return {group,fill};
}

export function disposeObject(object:THREE.Object3D) {
  object.traverse(child=>{
    if(child instanceof THREE.Mesh||child instanceof THREE.Line){child.geometry.dispose();const materials=Array.isArray(child.material)?child.material:[child.material];materials.forEach(material=>material.dispose());}
    else if(child instanceof THREE.Sprite)child.material.dispose();
  });
}
