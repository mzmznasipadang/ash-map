// Sampling grid for the wind overlay.
//
// Leaflet's getBounds() reports raw pane coordinates: with worldCopyJump on,
// longitudes run past ±180 and `west` can end up east of `east` once the view
// crosses the antimeridian. Open-Meteo rejects out-of-range coordinates, which
// silently kills the whole overlay, so normalize before building the grid.

export const wrapLon = (v: number) => ((((v + 180) % 360) + 360) % 360) - 180;
export const clampLat = (v: number) => Math.min(90, Math.max(-90, v));

export function buildGrid(north: number, south: number, east: number, west: number, points: number) {
  const perSide = Math.max(2, Math.round(Math.sqrt(points)));

  const top = clampLat(Math.max(north, south));
  const bottom = clampLat(Math.min(north, south));

  // Walk eastward from `west` across the seam rather than interpolating
  // backwards around the globe. A view wider than the world just gets it all.
  const rawSpan = east - west;
  const start = rawSpan >= 360 ? -180 : wrapLon(west);
  const span = rawSpan >= 360 ? 360 : ((rawSpan % 360) + 360) % 360;

  const lats: number[] = [];
  const lons: number[] = [];
  for (let i = 0; i < perSide; i++) {
    for (let j = 0; j < perSide; j++) {
      const lat = bottom + ((top - bottom) * i) / (perSide - 1);
      const lon = wrapLon(start + (span * j) / (perSide - 1));
      lats.push(Number(lat.toFixed(2)));
      lons.push(Number(lon.toFixed(2)));
    }
  }
  return { lats, lons };
}
