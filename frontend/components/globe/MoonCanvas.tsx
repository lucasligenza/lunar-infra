"use client";
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { lunarCoordinate, lunarVector, terrainHeight } from '../../lib/globe';
import { ScientificOverlay } from '../../lib/atlas-render';
import type { AtlasView } from '../../types/atlas';
import type { CameraState, GlobeLocation, GlobeMetadata } from '../../types/globe';
import type { Asset } from '../../types/mission';

type Props = { metadata: GlobeMetadata; location: GlobeLocation | null; flight: { coordinates: GlobeLocation; distance: number; serial: number } | null;
  assets: Asset[]; base: GlobeLocation | null; texture: boolean; grid: boolean; camera: CameraState | null;
  onCamera: (state: CameraState) => void; onSelect: (location: GlobeLocation) => void; onReady: (milliseconds: number) => void;
  atlas?:AtlasView; onAtlasStatus?:(value:string)=>void;boundaries?:GlobeLocation[][] };

export default function MoonCanvas(props: Props) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(props);
  latest.current = props;
  const runtime = useRef<{ camera: THREE.PerspectiveCamera; controls: OrbitControls; mesh: THREE.Mesh<THREE.SphereGeometry, THREE.MeshStandardMaterial>; markers: THREE.Group; grid: THREE.Group; heights: Int16Array | null; invalidate:()=>void; animateTo: (point: GlobeLocation, distance: number) => void } | null>(null);
  const [status, setStatus] = useState('Loading NASA imagery…');
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState(0);
  const overlay=useRef<ScientificOverlay|null>(null);
  const boundaryGroup=useRef<THREE.Group|null>(null);
  useEffect(() => {
    if (!host.current) return;
    const started = performance.now(), container = host.current, controller = new AbortController();
    let disposed = false, frame = 0, draws = 0, dirty = true, imagerySize = 'none', renderer: THREE.WebGLRenderer;
    const textures: THREE.Texture[] = [];
    try { renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }); }
    catch { setError('3D rendering is unavailable. Enable WebGL or use Regional Analysis for the scientific map.'); return; }
    setError(null); setStatus('Loading NASA imagery…');
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x080c11);
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D Moon');
    renderer.domElement.setAttribute('tabindex', '0');
    container.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, .002, 30);
    camera.position.set(3.2, .6, .45);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; controls.dampingFactor = .1; controls.minDistance = 1.08; controls.maxDistance = 6;
    controls.enablePan = true; controls.maxPolarAngle = Math.PI; controls.minPolarAngle = 0;
    controls.listenToKeyEvents(renderer.domElement);
    if (latest.current.camera) { camera.position.fromArray(latest.current.camera.position); camera.up.fromArray(latest.current.camera.up); controls.target.fromArray(latest.current.camera.target); }
    const geometry = new THREE.SphereGeometry(1, 360, 180);
    const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0 });
    const mesh = new THREE.Mesh(geometry, material); scene.add(mesh);
    const scientific=new ScientificOverlay(geometry,()=>{dirty=true;},value=>latest.current.onAtlasStatus?.(value));
    scene.add(scientific.group);overlay.current=scientific;
    if(latest.current.atlas)scientific.configure(latest.current.atlas);
    // Fixed inspection lighting, NOT a solar model or current lunar illumination.
    scene.add(new THREE.AmbientLight(0xffffff, 1.2));
    const key = new THREE.DirectionalLight(0xffffff, 2); key.position.set(3, 2, 4); scene.add(key);
    const markers = new THREE.Group(), grid = new THREE.Group(); scene.add(markers, grid);
    const boundaries=new THREE.Group();scene.add(boundaries);boundaryGroup.current=boundaries;
    const gridMaterial = new THREE.LineBasicMaterial({ color: 0x8ecfe4, transparent: true, opacity: .22 });
    for (let latitude = -60; latitude <= 60; latitude += 30) {
      const points = Array.from({ length: 181 }, (_, i) => new THREE.Vector3(...lunarVector(i * 2, latitude, 1.012)));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
    }
    for (let longitude = 0; longitude < 360; longitude += 30) {
      const points = Array.from({ length: 181 }, (_, i) => new THREE.Vector3(...lunarVector(longitude, i - 90, 1.012)));
      grid.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), gridMaterial));
    }
    let flight: { started: number; duration: number; from: THREE.Vector3; to: THREE.Vector3; fromUp: THREE.Vector3; up: THREE.Vector3; fromTarget: THREE.Vector3 } | null = null;
    const snapshot = () => latest.current.onCamera({ position: camera.position.toArray(), target: controls.target.toArray(), up: camera.up.toArray() });
    const animateTo = (point: GlobeLocation, distance: number) => {
      const direction = new THREE.Vector3(...lunarVector(point.longitude_deg, point.latitude_deg));
      // Pole views use a stable meridian; equatorial views keep north upward.
      const up = Math.abs(point.latitude_deg) > 85 ? new THREE.Vector3(0,0,point.latitude_deg > 0 ? -1 : 1) : new THREE.Vector3(0,1,0);
      const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 900;
      flight = { started: performance.now(), duration, from: camera.position.clone(), to: direction.multiplyScalar(distance), fromUp: camera.up.clone(), up, fromTarget: controls.target.clone() };
    };
    runtime.current = { camera, controls, mesh, markers, grid, heights: null, invalidate:()=>{dirty=true;}, animateTo };
    if (!latest.current.camera && latest.current.flight) animateTo(latest.current.flight.coordinates, latest.current.flight.distance);
    const cancelFlight = () => { flight = null; };
    controls.addEventListener('start', cancelFlight); controls.addEventListener('end', snapshot); controls.addEventListener('change',()=>{dirty=true;});
    const resize = () => { const width = container.clientWidth, height = container.clientHeight; if (!width || !height) return;
      renderer.setSize(width, height); camera.aspect = width / height;
      camera.fov = camera.aspect < 1 ? 2 * Math.atan(Math.tan(21 * Math.PI/180)/camera.aspect) * 180/Math.PI : 42;
      camera.updateProjectionMatrix(); dirty=true; };
    const observer = new ResizeObserver(resize); observer.observe(container); resize();
    let down: [number, number] | null = null;
    const pointerDown = (event: PointerEvent) => { down = [event.clientX, event.clientY]; };
    const select = (event: PointerEvent) => {
      if (!down || Math.hypot(event.clientX-down[0],event.clientY-down[1]) > 5) return;
      down = null;
      const bounds = renderer.domElement.getBoundingClientRect();
      const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2((event.clientX-bounds.left)/bounds.width*2-1, -(event.clientY-bounds.top)/bounds.height*2+1), camera);
      const hit = ray.intersectObject(mesh)[0];
      if (hit) { const [lon, lat] = lunarCoordinate(...hit.point.toArray()); latest.current.onSelect({ longitude_deg: lon, latitude_deg: lat, longitude_defined: Math.abs(lat) !== 90 }); }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(), camera);
        const hit = ray.intersectObject(mesh)[0];
        if (hit) { const [lon,lat] = lunarCoordinate(...hit.point.toArray()); latest.current.onSelect({ longitude_deg: lon, latitude_deg: lat }); }
      }
    };
    renderer.domElement.addEventListener('pointerdown',pointerDown); renderer.domElement.addEventListener('pointerup',select); renderer.domElement.addEventListener('keydown',keyboard);
    const loadTexture = (url: string) => new Promise<THREE.Texture>((resolve,reject) => new THREE.TextureLoader().load(`/api${url}`, resolve, undefined, reject));
    const applyTexture = (texture: THREE.Texture) => { if (disposed) { texture.dispose(); return; } textures.push(texture);
      texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy()); material.map = texture; material.needsUpdate = true; dirty=true; };
    void loadTexture(props.metadata.texture_urls[0]).then(texture => {
      if (disposed) { texture.dispose(); return; } imagerySize = '1k'; applyTexture(texture); setStatus('1k imagery ready · loading terrain'); latest.current.onReady(performance.now()-started);
      return loadTexture(props.metadata.texture_urls[1]).then(texture => { imagerySize = '4k'; applyTexture(texture); if (!disposed) setStatus(runtime.current?.heights ? '4k imagery / LOLA terrain ready' : '4k imagery / terrain loading'); })
        .catch(() => { if (!disposed) setStatus('1k imagery ready; finer imagery unavailable'); });
    }).catch(() => { if (!disposed) setError('NASA imagery could not load. Check prepared global data and retry.'); });
    void fetch(`/api${props.metadata.terrain_url}`,{ signal:controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Terrain request failed');
      const buffer = await response.arrayBuffer(); if (buffer.byteLength !== 2073600) throw new Error('Terrain dimensions invalid');
      // DataView makes little-endian decoding independent of host endianness.
      const values = new Int16Array(1440*720), view = new DataView(buffer);
      for(let i=0;i<values.length;i++) values[i] = view.getInt16(i*2,true);
      if (disposed || !runtime.current) return;
      runtime.current.heights = values;
      const positions = geometry.attributes.position;
      for(let i=0;i<positions.count;i++) { const [lon,lat] = lunarCoordinate(positions.getX(i),positions.getY(i),positions.getZ(i));
        const height = terrainHeight(values,lon,lat); const radius = 1 + (height ?? 0)/props.metadata.reference_radius_m;
        const vector = lunarVector(lon,lat,radius); positions.setXYZ(i,...vector); }
      positions.needsUpdate = true; geometry.computeVertexNormals(); geometry.computeBoundingSphere(); dirty=true;
      container.dataset.terrain = JSON.stringify([positions.getX(1000),positions.getY(1000),positions.getZ(1000),positions.getX(25000),positions.getY(25000),positions.getZ(25000)]);
      scientific.rebuild();
      setStatus(material.map ? `${imagerySize} imagery / LOLA terrain ready` : 'LOLA terrain ready · imagery loading');
    }).catch(() => { if (!disposed) setError('Global terrain unavailable. The reference sphere is visual only; retry to load verified LOLA terrain.'); });
    const render = () => {
      if (flight) {
        const t = flight.duration ? Math.min(1,(performance.now()-flight.started)/flight.duration) : 1;
        const eased = t*t*(3-2*t);
        // Arc interpolation avoids passing through the planet on far-side flights.
        const from = flight.from.clone().normalize(), to = flight.to.clone().normalize();
        const rotation = new THREE.Quaternion().setFromUnitVectors(from,to);
        const direction = from.applyQuaternion(new THREE.Quaternion().slerp(rotation,eased));
        camera.position.copy(direction.multiplyScalar(THREE.MathUtils.lerp(flight.from.length(),flight.to.length(),eased)));
        camera.up.copy(flight.fromUp).applyQuaternion(new THREE.Quaternion().slerp(new THREE.Quaternion().setFromUnitVectors(flight.fromUp,flight.up),eased)); controls.target.copy(flight.fromTarget).multiplyScalar(1-eased); dirty=true;
        if(t===1) { flight = null; snapshot(); }
      }
      // Bound panning to the planet; distance limits remain relative to its center.
      if (controls.target.length() > .35) controls.target.setLength(.35);
      controls.update();
      scientific.update(camera);
      if (camera.position.length() < 1.08) {camera.position.setLength(1.08);dirty=true;}
      if (camera.position.length() > 6) {camera.position.setLength(6);dirty=true;}
      if(grid.visible!==latest.current.grid) {grid.visible=latest.current.grid;dirty=true;}
      const color = latest.current.texture ? 0xffffff : 0xa9b2ba;
      if(material.color.getHex()!==color) {material.color.set(color);dirty=true;}
      if(material.map && !latest.current.texture) { material.map = null; material.needsUpdate = true; dirty=true; }
      else if(!material.map && latest.current.texture && textures.length) { material.map = textures.at(-1)!; material.needsUpdate = true; dirty=true; }
      for(const object of markers.children) {
        const distance = camera.position.distanceTo(object.position);
        const scale = distance * Math.tan(camera.fov * Math.PI/360) * 2 / Math.max(1,container.clientHeight) * object.userData.pixelRadius;
        if(Math.abs(object.scale.x-scale)>1e-8) {object.scale.setScalar(scale);dirty=true;}
      }
      if(dirty) {
        const compare=latest.current.atlas?.compare && latest.current.atlas.layer!=='none';
        if(compare) {
          const width=container.clientWidth,height=container.clientHeight,split=width*latest.current.atlas!.reveal;
          renderer.setScissorTest(true);renderer.setScissor(0,0,split,height);scientific.group.visible=false;renderer.render(scene,camera);
          renderer.setScissor(split,0,width-split,height);scientific.group.visible=true;renderer.render(scene,camera);renderer.setScissorTest(false);
        } else renderer.render(scene,camera);
        dirty=false;
        container.dataset.overlayTiles=String(scientific.group.children.length);
        container.dataset.draws = String(++draws);
        container.dataset.camera = camera.position.toArray().join(',');
        container.dataset.renderCalls = String(renderer.info.render.calls);
        container.dataset.markers = JSON.stringify(markers.children.map(object=>({position:object.position.toArray(),scale:object.scale.x,pixels:object.userData.pixelRadius})));
      }
      frame = requestAnimationFrame(render);
    }; render();
    return () => { snapshot(); disposed = true; controller.abort(); cancelAnimationFrame(frame); observer.disconnect(); controls.dispose();scientific.dispose();overlay.current=null;
      renderer.domElement.removeEventListener('pointerdown',pointerDown); renderer.domElement.removeEventListener('pointerup',select); renderer.domElement.removeEventListener('keydown',keyboard);
      scene.traverse(object => { if(object instanceof THREE.Mesh || object instanceof THREE.Line) { object.geometry.dispose(); const mats = Array.isArray(object.material) ? object.material : [object.material]; mats.forEach(m=>m.dispose()); } });
      textures.forEach(texture=>texture.dispose()); renderer.dispose(); renderer.forceContextLoss(); container.replaceChildren(); runtime.current = null;boundaryGroup.current=null; };
  }, [props.metadata, retry]);
  useEffect(()=>{if(props.atlas)overlay.current?.configure(props.atlas);},[props.atlas]);
  useEffect(()=>{
    const group=boundaryGroup.current;if(!group)return;
    for(const child of [...group.children]){group.remove(child);if(child instanceof THREE.Line){child.geometry.dispose();(child.material as THREE.Material).dispose();}}
    for(const boundary of props.boundaries??[]) {
      const points=boundary.map(point=>new THREE.Vector3(...lunarVector(point.longitude_deg,point.latitude_deg,1.008)));
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points),new THREE.LineBasicMaterial({color:0xe7b879,transparent:true,opacity:.85})));
    }runtime.current?.invalidate();if(host.current)host.current.dataset.sectorBoundaries=String(group.children.length);
  },[props.boundaries,props.metadata,status]);
  useEffect(() => { if(props.flight) runtime.current?.animateTo(props.flight.coordinates,props.flight.distance); },[props.flight]);
  useEffect(() => {
    const state = runtime.current; if(!state) return;
    for(const child of [...state.markers.children]) { state.markers.remove(child); if(child instanceof THREE.Mesh) { child.geometry.dispose(); (child.material as THREE.Material).dispose(); } }
    const marker = (location: GlobeLocation,color:number,size:number) => {
      const object = new THREE.Mesh(new THREE.SphereGeometry(1,16,12),new THREE.MeshBasicMaterial({color}));
      object.userData.pixelRadius = size === .007 ? 6 : size === .004 ? 4 : 3;
      object.scale.setScalar(.001);
      const height = state.heights ? terrainHeight(state.heights,location.longitude_deg,location.latitude_deg) : 0;
      object.position.set(...lunarVector(location.longitude_deg,location.latitude_deg,1 + (height ?? 0)/props.metadata.reference_radius_m + .0003)); state.markers.add(object);
    };
    if(props.location) marker(props.location,0x8ecfe4,.007);
    if(props.base) marker(props.base,0xe7b879,.004);
    for(const asset of props.assets) marker(asset.location,asset.operational ? 0x9ed1ad : 0x8795a1,.002);
    state.invalidate();
  },[props.location,props.assets,props.base,props.metadata,status]);
  return <div className="moon-stage">
    <div ref={host} className="moon-canvas" data-testid="moon-canvas" />
    {props.atlas?.compare&&props.atlas.layer!=='none'&&<div className="atlas-reveal" style={{left:`${props.atlas.reveal*100}%`}} aria-hidden="true"><span>Imagery / science</span></div>}
    <div className="globe-render-status" role="status" data-testid="globe-status">{status}</div>
    {error && <div className="globe-render-error" role="alert"><p>{error}</p><button onClick={()=>setRetry(v=>v+1)}>Retry globe</button></div>}
    <div className="camera-controls" aria-label="Globe camera controls">
      <button title="Zoom toward the surface" aria-label="Zoom globe in" onClick={()=>{ if(runtime.current) runtime.current.camera.position.multiplyScalar(.8); }}>+</button>
      <button title="Zoom out" aria-label="Zoom globe out" onClick={()=>{ if(runtime.current) runtime.current.camera.position.multiplyScalar(1.25); }}>−</button>
      <button title="Return to near-side orbit" onClick={()=>runtime.current?.animateTo({latitude_deg:12,longitude_deg:0},3.4)}>Reset globe</button>
    </div>
  </div>;
}
