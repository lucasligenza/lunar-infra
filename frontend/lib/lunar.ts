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
