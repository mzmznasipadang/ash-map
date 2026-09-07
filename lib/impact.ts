// Which airports sit under an ash cloud, and at what height.
//
// This is geometry over the published advisory polygons, not a forecast of its
// own: an airport "under" a cloud whose base is SFC has ash on the ground and
// in the approach, while one under a FL150/FL500 layer has clear air below and
// a problem at altitude. The band's own flight levels carry that difference, so
// they are reported rather than flattened into a single verdict.
//
// It is also not a substitute for a NOTAM or ASHTAM. Whether an aerodrome is
// actually closed is a decision made by its authority and published through
// AIS, not something derivable from an advisory polygon.

import type { LatLon } from "./coords.ts";
import { flightLevelCeiling } from "./style.ts";
import { availableFrames, framePolygons, type FrameKey, type VaaAdvisory } from "./vaa.ts";
import { AIRPORTS, type Airport } from "./airports.ts";

/**
 * Ray casting, in the polygon's own lat/lon space.
 *
 * Advisory polygons span a few hundred nautical miles at most, so treating
 * lat/lon as a plane is well within the precision the source data carries
 * (vertices are given to the arc-minute, about 1 NM). The one real hazard is
 * the antimeridian: a ring straddling 180 degrees would be tested as if it
 * wrapped the globe, so those are detected and shifted rather than mis-tested.
 */
/** Roughly 10 m at these latitudes — well below the arc-minute the source gives. */
const EDGE_EPS = 1e-4;

function onSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number): boolean {
  // Cross product near zero means collinear; then check it falls between the ends.
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  const len = Math.hypot(bx - ax, by - ay);
  if (len === 0) return Math.hypot(px - ax, py - ay) <= EDGE_EPS;
  if (Math.abs(cross) / len > EDGE_EPS) return false;
  const dot = (px - ax) * (bx - ax) + (py - ay) * (by - ay);
  return dot >= -EDGE_EPS && dot <= len * len + EDGE_EPS;
}

export function pointInRing([lat, lon]: LatLon, ring: LatLon[]): boolean {
  if (ring.length < 3) return false;

  const spansAntimeridian = ring.some((v, i) => Math.abs(v[1] - ring[(i + 1) % ring.length][1]) > 180);
  const norm = (l: number) => (spansAntimeridian && l < 0 ? l + 360 : l);
  const x = norm(lon);

  // A point exactly on the boundary is ambiguous under ray casting: the answer
  // depends on which edge the ray happens to clip. For a hazard overlay that
  // arbitrariness is not acceptable, so the boundary is explicitly inclusive —
  // an aerodrome on the edge of a cloud is reported as affected.
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    if (onSegment(x, lat, norm(ring[j][1]), ring[j][0], norm(ring[i][1]), ring[i][0])) return true;
  }

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0];
    const xi = norm(ring[i][1]);
    const yj = ring[j][0];
    const xj = norm(ring[j][1]);
    // Half-open edge test, so a vertex shared by two edges is counted once.
    if (yi > lat !== yj > lat && x < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export type BandHit = {
  frame: FrameKey;
  flightLevel: string;
  ceiling: number;
  /** True when the band's base is the surface, i.e. ash down to the runway. */
  surface: boolean;
  movement?: string;
};

export type AirportImpact = {
  airport: Airport;
  hits: BandHit[];
  /** Highest ceiling over any hit. */
  maxCeiling: number;
  /** Any hit whose base is the surface. */
  anySurface: boolean;
  /** Hit on the observed/estimated frame, i.e. affected now rather than later. */
  now: boolean;
  /** Earliest frame with a hit, for ordering. */
  firstFrame: FrameKey;
};

const isSurfaceBased = (flightLevel: string) => /^SFC\//i.test(flightLevel);

/** Every airport under any band of one advisory, worst first. */
export function assessAirports(advisory: VaaAdvisory, airports: Airport[] = AIRPORTS): AirportImpact[] {
  const frames = availableFrames(advisory);
  if (frames.length === 0) return [];

  const perFrame = frames.map((frame) => ({ frame, polygons: framePolygons(advisory, frame) }));

  const impacts: AirportImpact[] = [];
  for (const airport of airports) {
    const point: LatLon = [airport.lat, airport.lon];
    const hits: BandHit[] = [];

    for (const { frame, polygons } of perFrame) {
      for (const p of polygons) {
        if (!pointInRing(point, p.vertices)) continue;
        hits.push({
          frame,
          flightLevel: p.flightLevel,
          ceiling: flightLevelCeiling(p.flightLevel),
          surface: isSurfaceBased(p.flightLevel),
          movement: p.movement,
        });
      }
    }

    if (hits.length === 0) continue;
    impacts.push({
      airport,
      hits,
      maxCeiling: hits.reduce((m, h) => Math.max(m, h.ceiling), 0),
      anySurface: hits.some((h) => h.surface),
      now: hits.some((h) => h.frame === "OBS"),
      firstFrame: hits[0].frame,
    });
  }

  // Affected now beats affected later; then ash on the ground; then height;
  // then a major hub over a regional strip.
  return impacts.sort(
    (a, b) =>
      Number(b.now) - Number(a.now) ||
      Number(b.anySurface) - Number(a.anySurface) ||
      b.maxCeiling - a.maxCeiling ||
      Number(b.airport.major) - Number(a.airport.major) ||
      a.airport.icao.localeCompare(b.airport.icao)
  );
}

/** The same across several advisories, merged so an airport appears once. */
export function assessAcross(
  advisories: VaaAdvisory[],
  airports: Airport[] = AIRPORTS
): (AirportImpact & { volcanoes: string[] })[] {
  const byIcao = new Map<string, AirportImpact & { volcanoes: string[] }>();

  for (const advisory of advisories) {
    const volcano = advisory.volcano ?? "Unknown";
    for (const impact of assessAirports(advisory, airports)) {
      const existing = byIcao.get(impact.airport.icao);
      if (!existing) {
        byIcao.set(impact.airport.icao, { ...impact, volcanoes: [volcano] });
        continue;
      }
      existing.hits.push(...impact.hits);
      existing.maxCeiling = Math.max(existing.maxCeiling, impact.maxCeiling);
      existing.anySurface = existing.anySurface || impact.anySurface;
      existing.now = existing.now || impact.now;
      if (!existing.volcanoes.includes(volcano)) existing.volcanoes.push(volcano);
    }
  }

  return [...byIcao.values()].sort(
    (a, b) =>
      Number(b.now) - Number(a.now) ||
      Number(b.anySurface) - Number(a.anySurface) ||
      b.maxCeiling - a.maxCeiling ||
      Number(b.airport.major) - Number(a.airport.major) ||
      a.airport.icao.localeCompare(b.airport.icao)
  );
}

/** One line a non-expert can act on. */
export function describeImpact(impact: AirportImpact): string {
  const highest = impact.hits.reduce((m, h) => (h.ceiling > m.ceiling ? h : m), impact.hits[0]);
  const when = impact.now ? "now" : `forecast ${impact.firstFrame}`;
  const depth = impact.anySurface ? "surface upward" : "at altitude only";
  return `Ash ${when}, ${depth}, to FL${highest.ceiling}.`;
}
