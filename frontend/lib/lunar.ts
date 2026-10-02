// Spherical south polar stereographic in the same ME/PA DE421 frame as the API.
// https://proj.org/en/stable/operations/projections/stere.html
// Numerical parity with PyProj is checked in the integration tests.
export function toPolar(longitude: number, latitude: number, radius: number): [number, number] {
  const rho = 2 * radius * Math.tan((90 + latitude) * Math.PI / 360);
  const angle = longitude * Math.PI / 180;
  return [rho * Math.sin(angle), rho * Math.cos(angle)];
}

export function toGeographic(x: number, y: number, radius: number): [number, number] {
  const longitude = (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
  return [longitude, -90 + 2 * Math.atan2(Math.hypot(x, y), 2 * radius) * 180 / Math.PI];
}

export function groundScale(x: number, y: number, radius: number): number {
  return 1 + (x * x + y * y) / (4 * radius * radius);
}

// Visual guide for the registered analysis footprint, not a replacement for
// source nodata/coverage queries. Sample projected edges to preserve polar shape.
export function polarBoundary(region:{bounds_m:number[];reference_radius_m:number}) {
  const [west,south,east,north]=region.bounds_m;
  const corners=[[west,south],[east,south],[east,north],[west,north],[west,south]];
  return Array.from({length:65},(_,index)=>{const edge=Math.min(3,Math.floor(index/16)),fraction=(index-edge*16)/16;
    const x=corners[edge][0]+fraction*(corners[edge+1][0]-corners[edge][0]),y=corners[edge][1]+fraction*(corners[edge+1][1]-corners[edge][1]);
    const [longitude_deg,latitude_deg]=toGeographic(x,y,region.reference_radius_m);return {longitude_deg,latitude_deg};});
}
