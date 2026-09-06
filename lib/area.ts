// Geographic filters for the VAAC feeds.
//
// Darwin's area of responsibility covers Indonesia, Papua New Guinea, East
// Timor, parts of the Philippines and the south Pacific, so most Darwin bulletins
// are NOT about Indonesia. Filtering matters.

import type { LatLon } from "./coords.ts";
import type { VaaAdvisory } from "./vaa.ts";

export type BBox = { south: number; west: number; north: number; east: number };

/** Indonesia's archipelago, generously bounded (Sumatra to Papua). */
export const INDONESIA: BBox = { south: -11.5, west: 94.5, north: 6.5, east: 141.5 };

export const AREAS: Record<string, { bbox: BBox; names: string[] }> = {
  indonesia: { bbox: INDONESIA, names: ["INDONESIA"] },
};

export function inBBox([lat, lon]: LatLon, b: BBox): boolean {
  return lat >= b.south && lat <= b.north && lon >= b.west && lon <= b.east;
}

/**
 * True when the advisory concerns the named area.
 *
 * The volcano position is authoritative: the AREA field is free text and a
 * bulletin can name a neighbouring country while the ash sits over Indonesia.
 * The name is only a fallback for bulletins with no parseable PSN.
 */
export function matchesArea(advisory: VaaAdvisory, area: string): boolean {
  const spec = AREAS[area.toLowerCase()];
  if (!spec) return true; // unknown filter name: do not silently hide everything
  if (advisory.position) return inBBox(advisory.position, spec.bbox);
  return spec.names.some((n) => (advisory.area ?? "").toUpperCase().includes(n));
}
