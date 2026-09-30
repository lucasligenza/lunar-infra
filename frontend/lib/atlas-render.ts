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

type Tile={key:string;z:number;x:number;y:number;mesh:THREE.Mesh;bitmap:ImageBitmap};
export class ScientificOverlay {
  group=new THREE.Group();
  private tiles=new Map<string,Tile>();private wanted=new Set<string>();private queue:{key:string;z:number;x:number;y:number}[]=[];
  private pending=new Map<string,number>();
  private controller=new AbortController();private active=0;private view:AtlasView|null=null;private cameraKey='';private disposed=false;private revision=0;
  constructor(private base:THREE.SphereGeometry,private invalidate:()=>void,private status:(value:string)=>void) {}
  configure(view:AtlasView) {
    if(this.view?.dataset!==view.dataset||this.view?.layer!==view.layer) {
      this.controller.abort();this.controller=new AbortController();this.revision++;this.pending.clear();this.queue=[];this.wanted.clear();this.cameraKey='';
      for(const tile of this.tiles.values())this.disposeTile(tile);this.tiles.clear();
    }
    this.view=view;this.group.visible=view.layer!=='none';
    for(const tile of this.tiles.values())(tile.mesh.material as THREE.MeshBasicMaterial).opacity=view.opacity;
    this.invalidate();
  }
  update(camera:THREE.PerspectiveCamera) {
    if(!this.view||this.view.layer==='none'||this.disposed)return;
    const key=[...camera.position.toArray(),...camera.quaternion.toArray(),camera.aspect].map(v=>v.toFixed(3)).join(',');
    if(key===this.cameraKey)return;this.cameraKey=key;camera.updateMatrixWorld();
    const z=Math.min(5,Math.max(1,Math.floor(Math.log2(2.6/Math.max(.06,camera.position.length()-1)))));
    const candidates:{key:string;z:number;x:number;y:number;score:number}[]=[];
    if(z>0)for(let y=0;y<2**z;y++)for(let x=0;x<2**(z+1);x++) {
      const b=geographicTile(z,x,y),center=new THREE.Vector3(...lunarVector((b.west+b.east)/2,(b.south+b.north)/2));
      const normal=center.clone();const screen=center.project(camera);
      const padding=1+4/2**z;
      const limbPadding=Math.sin(Math.min(Math.PI/2,Math.PI/2**(z+1)*Math.SQRT2));
      if(normal.dot(camera.position.clone().normalize())>-limbPadding&&Math.abs(screen.x)<padding&&Math.abs(screen.y)<padding&&screen.z<1)
        candidates.push({key:`${z}/${x}/${y}`,z,x,y,score:screen.x**2+screen.y**2});
    }
    const roots=[{key:'0/0/0',z:0,x:0,y:0},{key:'0/1/0',z:0,x:1,y:0}];
    const chosen=[...roots,...candidates.sort((a,b)=>a.score-b.score).slice(0,24)];this.wanted=new Set(chosen.map(tile=>tile.key));
    this.queue=chosen.filter(tile=>!this.tiles.has(tile.key)&&!this.pending.has(tile.key));
    // Keep roots as a complete fallback. Switch levels together, so opacity is
    // applied once rather than accumulating parent and child colors.
    this.visibility();this.pump();
  }
  private visibility() {
    const details=[...this.wanted].filter(key=>!key.startsWith('0/'));
    const complete=details.length>0&&details.every(key=>this.tiles.has(key));
    for(const tile of this.tiles.values())tile.mesh.visible=this.wanted.has(tile.key)&&(complete?tile.z>0:tile.z===0);
    const loading=[...this.wanted].filter(key=>!this.tiles.has(key)).length;
    this.status(loading?`Loading scientific tiles (${loading})`:`Scientific overlay ready / level ${complete?this.tiles.get(details[0])!.z:0}`);
    this.invalidate();
  }
  private pump() {
    if(this.disposed)return;
    while(this.active<4&&this.queue.length) {
      const tile=this.queue.shift()!;if(this.tiles.has(tile.key)||this.pending.has(tile.key))continue;
      const revision=this.revision,view=this.view!,signal=this.controller.signal;this.active++;
      this.pending.set(tile.key,revision);
      void fetch(`/api/atlas/tiles/${view.layer==='geology'?'usgs-geology':view.dataset}/${view.layer}/${tile.key}.png`,{signal}).then(async response=>{
        if(!response.ok)throw new Error('Scientific tile unavailable');
        const bitmap=await createImageBitmap(await response.blob(),{imageOrientation:'flipY'});
        if(this.disposed||revision!==this.revision||!this.wanted.has(tile.key)) {bitmap.close();return;}
        const texture=new THREE.Texture(bitmap);texture.colorSpace=THREE.SRGBColorSpace;texture.needsUpdate=true;texture.flipY=false;
        if(view.layer==='geology'){texture.minFilter=THREE.NearestFilter;texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;}
        const material=new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:this.view!.opacity,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
        const mesh=new THREE.Mesh(tileGeometry(this.base,tile.z,tile.x,tile.y),material);mesh.renderOrder=5;this.group.add(mesh);
        this.tiles.set(tile.key,{...tile,mesh,bitmap});this.visibility();
        if(this.tiles.size>32)for(const item of this.tiles.values())if(!this.wanted.has(item.key)){this.disposeTile(item);this.tiles.delete(item.key);if(this.tiles.size<=32)break;}
      }).catch(()=>{if(!signal.aborted&&!this.disposed)this.status('Scientific tiles unavailable; retry by reselecting the layer. Native queries remain separate.');})
        .finally(()=>{this.active--;if(this.pending.get(tile.key)===revision)this.pending.delete(tile.key);this.pump();});
    }
  }
  rebuild() {for(const tile of this.tiles.values()){tile.mesh.geometry.dispose();tile.mesh.geometry=tileGeometry(this.base,tile.z,tile.x,tile.y);}this.invalidate();}
  private disposeTile(tile:Tile) {this.group.remove(tile.mesh);tile.mesh.geometry.dispose();const material=tile.mesh.material as THREE.MeshBasicMaterial;material.map?.dispose();material.dispose();tile.bitmap.close();}
  dispose() {this.disposed=true;this.controller.abort();for(const tile of this.tiles.values())this.disposeTile(tile);this.tiles.clear();}
}
