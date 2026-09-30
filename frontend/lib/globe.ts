// Graphics-axis permutation of a 1737.4 km lunar sphere. No Earth geodesy.
// +X = 0 E equator, +Y = north, -Z = 90 E equator. Units are reference radii.
export function lunarVector(longitude: number, latitude: number, radius = 1): [number, number, number] {
  if (![longitude, latitude, radius].every(Number.isFinite) || latitude < -90 || latitude > 90 || radius <= 0) throw new Error('Invalid lunar coordinate');
  const lon = longitude * Math.PI / 180, lat = latitude * Math.PI / 180;
  return [radius * Math.cos(lat) * Math.cos(lon), radius * Math.sin(lat), -radius * Math.cos(lat) * Math.sin(lon)];
}
export function lunarCoordinate(x: number, y: number, z: number): [number, number] {
  const radius = Math.hypot(x, y, z);
  if (!Number.isFinite(radius) || radius === 0) throw new Error('Invalid lunar vector');
  return [Math.hypot(x, z) < 1e-12 * radius ? 0 : (Math.atan2(-z, x) * 180 / Math.PI + 360) % 360,
    Math.asin(Math.max(-1, Math.min(1, y / radius))) * 180 / Math.PI];
}
export function terrainHeight(values: Int16Array, longitude: number, latitude: number): number | null {
  const row = Math.max(0, Math.min(719, Math.floor((90 - latitude) * 4)));
  const column = Math.floor(((longitude % 360 + 360) % 360) * 4);
  const sample = values[row * 1440 + column];
  return sample === -32768 || sample === undefined ? null : sample * .5;
}
