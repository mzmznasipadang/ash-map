// Vertex interpolation for the ash-cloud timeline.
//
// A VAA's OBS and forecast frames are independent hand-drawn polygons: they
// rarely share a vertex count, and even when they do, vertex 0 of one frame is
// not the same corner of the cloud as vertex 0 of the next. Lerping them
// pairwise as-is makes the cloud twist inside out instead of drifting. So each
// pair is resampled to a common vertex count and rotationally aligned first.

import type { LatLon } from "./coords.ts";

const dist = (a: LatLon, b: LatLon) => Math.hypot(a[0] - b[0], a[1] - b[1]);

/** Resample a closed ring to exactly `n` vertices, evenly spaced by arc length. */
export function resampleRing(ring: LatLon[], n: number): LatLon[] {
  if (ring.length === 0 || n < 1) return [];
  if (ring.length === 1) return Array.from({ length: n }, () => ring[0]);

  // Treat the ring as closed; VAA rings usually repeat the first vertex last.
  const closed = dist(ring[0], ring[ring.length - 1]) < 1e-9 ? ring.slice() : [...ring, ring[0]];

  const cum: number[] = [0];
  for (let i = 1; i < closed.length; i++) cum.push(cum[i - 1] + dist(closed[i - 1], closed[i]));
  const total = cum[cum.length - 1];
  if (total < 1e-9) return Array.from({ length: n }, () => closed[0]);

  const out: LatLon[] = [];
  for (let k = 0; k < n; k++) {
    const target = (total * k) / n;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < target) i++;
    const segLen = cum[i] - cum[i - 1];
    const f = segLen < 1e-9 ? 0 : (target - cum[i - 1]) / segLen;
    const a = closed[i - 1];
    const b = closed[i];
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/**
 * Rotate `ring` so its vertices line up with `reference`, minimizing total
 * travel. Both must already have the same length.
 *
 * ponytail: brute-force O(n²) over rotations. n is capped at MORPH_VERTICES
 * (64), so this is ~4k distance checks once per advisory load, not per frame.
 * If vertex counts ever grow, switch to an FFT cross-correlation.
 */
export function alignRing(ring: LatLon[], reference: LatLon[]): LatLon[] {
  const n = ring.length;
  if (n === 0 || n !== reference.length) return ring;

  let best = 0;
  let bestCost = Infinity;
  for (let shift = 0; shift < n; shift++) {
    let cost = 0;
    for (let i = 0; i < n; i++) {
      const d = dist(ring[(i + shift) % n], reference[i]);
      cost += d * d;
      if (cost >= bestCost) break;
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = shift;
    }
  }
  return best === 0 ? ring : [...ring.slice(best), ...ring.slice(0, best)];
}

export function lerpRing(a: LatLon[], b: LatLon[], t: number): LatLon[] {
  if (a.length !== b.length) return t < 0.5 ? a : b;
  return a.map(([lat, lon], i) => [lat + (b[i][0] - lat) * t, lon + (b[i][1] - lon) * t] as LatLon);
}

export const MORPH_VERTICES = 64;

/**
 * Normalize one polygon's rings across every frame into a single track: equal
 * vertex counts, consistently ordered, ready to lerp between neighbours.
 * `frameRings[i]` may be null when that frame omits this flight level — those
 * hold the last known shape rather than vanishing.
 */
export function buildTrack(frameRings: (LatLon[] | null)[], vertices = MORPH_VERTICES): LatLon[][] {
  const filled: LatLon[][] = [];
  for (let i = 0; i < frameRings.length; i++) {
    const ring = frameRings[i] ?? filled[i - 1] ?? frameRings.find((r) => r && r.length > 0) ?? [];
    filled.push(ring as LatLon[]);
  }

  const out: LatLon[][] = [];
  for (let i = 0; i < filled.length; i++) {
    const resampled = resampleRing(filled[i], vertices);
    out.push(i === 0 ? resampled : alignRing(resampled, out[i - 1]));
  }
  return out;
}
