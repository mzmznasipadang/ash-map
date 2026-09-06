// Parses ICAO Volcanic Ash Advisory coordinate tokens like "N1428 W09052"
// into [lat, lon] decimal degrees.

export type LatLon = [number, number];

const COORD_RE = /([NS])\s?(\d{2})(\d{2})\s+([EW])\s?(\d{3})(\d{2})/;

export function parseCoord(token: string): LatLon | null {
  const m = COORD_RE.exec(token.trim());
  if (!m) return null;
  const [, ns, latDeg, latMin, ew, lonDeg, lonMin] = m;
  let lat = Number(latDeg) + Number(latMin) / 60;
  let lon = Number(lonDeg) + Number(lonMin) / 60;
  if (ns === "S") lat = -lat;
  if (ew === "W") lon = -lon;
  return [lat, lon];
}
