import * as THREE from 'three';
import {lunarVector} from './globe';
import type {AtlasView} from '../types/atlas';

export function geographicTile(z:number,x:number,y:number) {
  const step=180/2**z;return {west:x*step,east:(x+1)*step,north:90-y*step,south:90-(y+1)*step};
}

// Clip original globe triangles in UV space. The overlay uses their exact surface
// positions; scientific colors cannot alter terrain or create a floating sphere.
export function tileGeometry(base:THREE.SphereGeometry,z:number,x:number,y:number) {
  const bounds=geographicTile(z,x,y), u0=((bounds.west+180)%360)/360,u1=u0+(bounds.east-bounds.west)/360;
  const v0=(bounds.south+90)/180,v1=(bounds.north+90)/180;
  const positions=base.attributes.position, uv=base.attributes.uv, indices=base.index!;
  type Vertex=number[];
  const output:number[]=[],tex:number[]=[];
  const clip=(polygon:Vertex[],axis:number,value:number,greater:boolean)=>{
    const result:Vertex[]=[];
    for(let i=0;i<polygon.length;i++) {const a=polygon[i],b=polygon[(i+1)%polygon.length];
      const aInside=greater?a[axis]>=value:a[axis]<=value,bInside=greater?b[axis]>=value:b[axis]<=value;
      if(aInside)result.push(a);
      if(aInside!==bInside) {const t=(value-a[axis])/(b[axis]-a[axis]);result.push(a.map((v,j)=>v+(b[j]-v)*t));}
    }return result;
  };
  const nx=base.parameters.widthSegments,ny=base.parameters.heightSegments;
  for(let row=Math.max(0,Math.floor((1-v1)*ny));row<Math.min(ny,Math.ceil((1-v0)*ny));row++) {
    const count=row===0||row===ny-1?1:2, offset=row===0?0:nx*3+(row-1)*nx*6;
    for(let col=Math.max(0,Math.floor(u0*nx));col<Math.min(nx,Math.ceil(u1*nx));col++)for(let triangle=0;triangle<count;triangle++) {
      let polygon:Vertex[]=Array.from({length:3},(_,i)=>{const index=indices.getX(offset+col*count*3+triangle*3+i);
        return [positions.getX(index),positions.getY(index),positions.getZ(index),uv.getX(index),uv.getY(index)];});
      for(const [axis,value,greater] of [[3,u0,true],[3,u1,false],[4,v0,true],[4,v1,false]] as [number,number,boolean][])polygon=clip(polygon,axis,value,greater);
      for(let i=1;i<polygon.length-1;i++)for(const point of [polygon[0],polygon[i],polygon[i+1]]) {
        output.push(...point.slice(0,3));tex.push((point[3]-u0)/(u1-u0),(point[4]-v0)/(v1-v0));
      }
    }
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(output,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));
  geometry.computeBoundingSphere();return geometry;
}

// At a pole, linearly interpolated mesh UVs stretch a polar raster into spokes.
// Derive geographic UVs per fragment from the unchanged local surface position.
export function scientificMaterial(z:number,x:number,y:number,texture:THREE.Texture,opacity:number) {
  const bounds=geographicTile(z,x,y);
  const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,polygonOffsetUnits:-4});
  material.onBeforeCompile=shader=>{
    shader.uniforms.scientificBounds={value:new THREE.Vector4(bounds.west,bounds.south,bounds.east-bounds.west,bounds.north-bounds.south)};
    shader.vertexShader='varying vec3 scientificPosition;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nscientificPosition = transformed;');
    shader.fragmentShader='varying vec3 scientificPosition;\nuniform vec4 scientificBounds;\n'+shader.fragmentShader.replace('#include <map_fragment>',`
      vec3 direction = normalize(scientificPosition);
      float longitude = mod(degrees(atan(-direction.z, direction.x)) + 360.0, 360.0);
      float latitude = degrees(asin(clamp(direction.y, -1.0, 1.0)));
      vec2 scientificUv = vec2(mod(longitude - scientificBounds.x + 360.0, 360.0) / scientificBounds.z,
                               (latitude - scientificBounds.y) / scientificBounds.w);
      diffuseColor *= texture2D(map, scientificUv);
    `);
  };
  material.customProgramCacheKey=()=> 'lunar-geographic-fragment-v1';
  return material;
}

type Tile={key:string;z:number;x:number;y:number;mesh:THREE.Mesh;bitmap:ImageBitmap;hasData:boolean};
// Test the tile's conservative spherical extent, not just its center. At low
// camera heights the center can be off-screen while the tile covers the viewport.
export function visibleTiles(camera:THREE.PerspectiveCamera,z:number) {
  camera.updateMatrixWorld();
  const frustum=new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
  const direction=camera.position.clone().normalize();
  const candidates:{key:string;z:number;x:number;y:number;score:number}[]=[];
  for(let y=0;y<2**z;y++)for(let x=0;x<2**(z+1);x++) {
    const bounds=geographicTile(z,x,y),center=new THREE.Vector3(...lunarVector((bounds.west+bounds.east)/2,(bounds.south+bounds.north)/2));
    const corners=[bounds.west,bounds.east].flatMap(lon=>[bounds.south,bounds.north].map(lat=>new THREE.Vector3(...lunarVector(lon,lat))));
    const angularRadius=Math.acos(Math.min(...corners.map(point=>center.dot(point))));
    const radius=2*Math.sin(angularRadius/2)+.02;
    const alignment=center.dot(direction);
    if(alignment>-Math.sin(Math.min(Math.PI/2,angularRadius))&&frustum.intersectsSphere(new THREE.Sphere(center,radius)))
      candidates.push({key:`${z}/${x}/${y}`,z,x,y,score:1-alignment});
  }
  return candidates.sort((a,b)=>a.score-b.score);
}
export function viewportTiles(camera:THREE.PerspectiveCamera,budget=24) {
  let z=Math.min(5,Math.max(1,Math.floor(Math.log2(2.6/Math.max(.06,camera.position.length()-1)))));
  let candidates=visibleTiles(camera,z);
  // Coarsen the whole visible level rather than dropping longitude wedges at
  // a pole. Roots + 24 detail tiles stay inside the existing 32-texture budget.
  while(candidates.length>budget&&z>1)candidates=visibleTiles(camera,--z);
  return candidates;
}
export class ScientificOverlay {
  group=new THREE.Group();
  private tiles=new Map<string,Tile>();private wanted=new Set<string>();private queue:{key:string;z:number;x:number;y:number}[]=[];
  private pending=new Map<string,number>();
  private failed=new Set<string>();
  private controller=new AbortController();private active=0;private view:AtlasView|null=null;private cameraKey='';private disposed=false;private revision=0;private presented=false;
  constructor(private base:THREE.SphereGeometry,private invalidate:()=>void,private status:(value:string)=>void) {}
  configure(view:AtlasView) {
    if(view.tileUrl&&!view.tileUrl.includes(`/${view.layer}/`))view={...view,tileUrl:undefined};
    if(this.view?.dataset!==view.dataset||this.view?.layer!==view.layer||this.view?.reload!==view.reload||this.view?.tileUrl!==view.tileUrl||this.view?.preparation!==view.preparation) {
      this.controller.abort();this.controller=new AbortController();this.revision++;this.pending.clear();this.queue=[];this.wanted.clear();this.cameraKey='';
      this.failed.clear();this.presented=false;
      for(const tile of this.tiles.values())this.disposeTile(tile);this.tiles.clear();
    }
    this.view=view;this.group.visible=view.layer!=='none'&&view.preparation!=='not_prepared';
    for(const tile of this.tiles.values())(tile.mesh.material as THREE.MeshBasicMaterial).opacity=view.opacity;
    if(this.wanted.size){this.presented=false;this.visibility();}else this.invalidate();
  }
  update(camera:THREE.PerspectiveCamera) {
    if(!this.view||this.view.layer==='none'||this.disposed)return;
    if(this.view.preparation==='not_prepared'){this.status('Available source; not prepared locally. Prepare the registered dataset and restart the API.');return;}
    // Do not fetch the previous layer's endpoint while metadata is changing.
    if(['temperature','illumination'].includes(this.view.layer)&&(!this.view.tileUrl||!this.view.tileUrl.includes(`/${this.view.layer}/`))){this.status('Loading scientific layer metadata');return;}
    const key=[...camera.position.toArray(),...camera.quaternion.toArray(),camera.aspect].map(v=>v.toFixed(3)).join(',');
    if(key===this.cameraKey)return;this.cameraKey=key;camera.updateMatrixWorld();
    // Polar environmental footprints occupy all longitudes but very few rows.
    // Up to 88 small tiles (~22 MiB RGBA) retain useful detail at the pole.
    const environmental=['temperature','illumination'].includes(this.view.layer);
    const candidates=viewportTiles(camera,environmental?88:24);
    const roots=[{key:'0/0/0',z:0,x:0,y:0},{key:'0/1/0',z:0,x:1,y:0}];
    const chosen=[...roots,...candidates];this.wanted=new Set(chosen.map(tile=>tile.key));
    for(const key of this.failed)if(!this.wanted.has(key))this.failed.delete(key);
    this.queue=chosen.filter(tile=>!this.tiles.has(tile.key)&&!this.pending.has(tile.key));
    // Keep roots as a complete fallback. Switch levels together, so opacity is
    // applied once rather than accumulating parent and child colors.
    this.presented=false;this.visibility();this.pump();
  }
  private visibility() {
    const details=[...this.wanted].filter(key=>!key.startsWith('0/'));
    const complete=details.length>0&&details.every(key=>this.tiles.has(key));
    for(const tile of this.tiles.values())tile.mesh.visible=this.wanted.has(tile.key)&&(complete?tile.z>0:tile.z===0);
    const loading=[...this.wanted].filter(key=>!this.tiles.has(key)).length;
    const data=[...this.tiles.values()].some(tile=>tile.mesh.visible&&tile.hasData);
    this.status([...this.failed].some(key=>this.wanted.has(key))?'Scientific tiles unavailable. Rendering failed; retry the layer. Native queries remain separate.':
      loading?`Loading scientific tiles (${loading})`:this.view?.opacity===0?'Layer hidden at 0% opacity':!data?'No prepared data in this camera coverage. Transparent tiles contain no measurements.':
      !this.presented?'Drawing scientific overlay':`Scientific overlay ready / rendered / level ${complete?this.tiles.get(details[0])!.z:0}`);
    this.invalidate();
  }
  private pump() {
    if(this.disposed)return;
    while(this.active<4&&this.queue.length) {
      const tile=this.queue.shift()!;if(this.tiles.has(tile.key)||this.pending.has(tile.key))continue;
      const revision=this.revision,view=this.view!,signal=this.controller.signal;this.active++;
      this.pending.set(tile.key,revision);
      void fetch(`/api${view.tileUrl?view.tileUrl.replace('{z}',String(tile.z)).replace('{x}',String(tile.x)).replace('{y}',String(tile.y)):`/atlas/tiles/${view.layer==='geology'?'usgs-geology':view.dataset}/${view.layer}/${tile.key}.png`}`,{signal}).then(async response=>{
        if(!response.ok)throw new Error('Scientific tile unavailable');
        const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'flipY'});
        if(this.disposed||revision!==this.revision||!this.wanted.has(tile.key)) {bitmap.close();return;}
        const canvas=new OffscreenCanvas(bitmap.width,bitmap.height),context=canvas.getContext('2d')!;context.drawImage(bitmap,0,0);
        const pixels=context.getImageData(0,0,bitmap.width,bitmap.height).data;
        let hasData=false;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>0){hasData=true;break;}
        const texture=new THREE.Texture(bitmap);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.flipY=false;
        // Longitude derivatives are singular at a pole. Automatic mip selection
        // averages the tiny valid polar rows with transparent hemispheric pixels.
        texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
        if(view.layer==='geology'){texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;}
        const material=scientificMaterial(tile.z,tile.x,tile.y,texture,this.view!.opacity);
        const mesh=new THREE.Mesh(tileGeometry(this.base,tile.z,tile.x,tile.y),material);mesh.renderOrder=5;this.group.add(mesh);
        this.tiles.set(tile.key,{...tile,mesh,bitmap,hasData});this.presented=false;this.failed.delete(tile.key);this.visibility();
        const limit=['temperature','illumination'].includes(view.layer)?96:32;
        if(this.tiles.size>limit)for(const item of this.tiles.values())if(!this.wanted.has(item.key)){this.disposeTile(item);this.tiles.delete(item.key);if(this.tiles.size<=limit)break;}
      }).catch(()=>{if(!signal.aborted&&!this.disposed&&revision===this.revision&&this.wanted.has(tile.key)){this.failed.add(tile.key);this.visibility();}})
        .finally(()=>{this.active--;if(this.pending.get(tile.key)===revision)this.pending.delete(tile.key);this.pump();this.invalidate();});
    }
  }
  rebuild() {for(const tile of this.tiles.values()){tile.mesh.geometry.dispose();tile.mesh.geometry=tileGeometry(this.base,tile.z,tile.x,tile.y);}this.invalidate();}
  rendered() {if(!this.presented){this.presented=true;this.visibility();}}
  resources() {return {retained_tiles:this.tiles.size,visible_tiles:[...this.tiles.values()].filter(tile=>tile.mesh.visible).length,data_tiles:[...this.tiles.values()].filter(tile=>tile.mesh.visible&&tile.hasData).length,active_requests:this.active,queued_requests:this.queue.length};}
  private disposeTile(tile:Tile) {this.group.remove(tile.mesh);tile.mesh.geometry.dispose();const material=tile.mesh.material as THREE.MeshBasicMaterial;material.map?.dispose();material.dispose();tile.bitmap.close();}
  dispose() {this.disposed=true;this.controller.abort();for(const tile of this.tiles.values())this.disposeTile(tile);this.tiles.clear();}
}
