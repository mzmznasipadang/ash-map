// Reading "is something erupting?" out of a volcanic ash advisory.
//
// Important limit: a VAA reports ash of significance to aviation, not eruption
// status. Ash can be drifting hours after an eruption stopped, and a volcano
// can erupt without producing an advisory. For authoritative Indonesian
// eruption status and alert levels (Normal / Waspada / Siaga / Awas), the
// source is PVMBG / MAGMA Indonesia, not this.
//
// What the advisory does tell you, reliably:
//   - whether ash is observed RIGHT NOW (OBS frame has polygons)
//   - whether it is only forecast
//   - how high it reaches, and which way it is going

import { flightLevelCeiling } from "./style.ts";
import { availableFrames, framePolygons, type VaaAdvisory } from "./vaa.ts";

export type AshStatus =
  | "ash-observed"
  /** Modelled from the last confirmed sighting; not currently visible on satellite. */
  | "ash-estimated"
  | "forecast-only"
  | "ash-ended"
  | "unknown";

export type AshBand = {
  flightLevel: string;
  /** Ceiling as a number, e.g. 500 for "SFC/FL500". */
  ceiling: number;
  /** e.g. "southwest at 10 kt", from this band's own MOV clause. */
  drift?: string;
};

export type AshAssessment = {
  status: AshStatus;
  /** Highest flight level mentioned in any frame, 0 when none. */
  maxFlightLevel: number;
  /**
   * One entry per flight-level band, highest first, each with ITS OWN drift.
   * A single advisory routinely carries two clouds moving in different
   * directions ("VA TO FL500 MOV SW, VA TO FL150 MOV SE"), so a single drift
   * value would attach one band's heading to another band's height.
   */
  bands: AshBand[];
  /** Drift of the highest band, for callers that only have room for one. */
  drift?: string;
  /** Plain language, for readers who do not speak FL500. */
  summary: string;
};

const ENDED_RE = /NO LONGER|NO VA EXP|NOT IDENTIFIABLE|DISSIPAT|VA NOT/i;

const COMPASS: Record<string, string> = {
  N: "north", NE: "northeast", E: "east", SE: "southeast",
  S: "south", SW: "southwest", W: "west", NW: "northwest",
};

export function describeMovement(movement?: string): string | undefined {
  if (!movement) return undefined;
  const m = /MOV\s+([A-Z]{1,2})(?:\/[A-Z]{1,2})?\s+(\d+)\s?KT/.exec(movement);
  if (!m) return undefined;
  return `${COMPASS[m[1]] ?? m[1]} at ${Number(m[2])} kt`;
}

/** Feet, rounded to the nearest hundred, for a flight level. FL500 = 50,000 ft. */
export function flightLevelToFeet(fl: number): number {
  return fl * 100;
}

export function assessAsh(advisory: VaaAdvisory): AshAssessment {
  const observed = framePolygons(advisory, "OBS");
  const frames = availableFrames(advisory);
  const all = frames.flatMap((f) => framePolygons(advisory, f));

  // Collapse every frame's polygons into one entry per band. Movement is only
  // stated on the observed frame, so prefer a MOV clause from whichever frame
  // carries one for that band.
  const byBand = new Map<string, AshBand>();
  for (const p of [...observed, ...all]) {
    const existing = byBand.get(p.flightLevel);
    const drift = describeMovement(p.movement);
    if (!existing) {
      byBand.set(p.flightLevel, { flightLevel: p.flightLevel, ceiling: flightLevelCeiling(p.flightLevel), drift });
    } else if (!existing.drift && drift) {
      existing.drift = drift;
    }
  }

  const bands = [...byBand.values()].sort((a, b) => b.ceiling - a.ceiling);
  const maxFlightLevel = bands[0]?.ceiling ?? 0;
  const drift = bands[0]?.drift;

  let status: AshStatus;
  if (observed.length > 0) status = advisory.observation.estimated ? "ash-estimated" : "ash-observed";
  else if (all.length > 0) status = "forecast-only";
  else if (ENDED_RE.test(`${advisory.remark ?? ""} ${advisory.eruptionDetails ?? ""}`)) status = "ash-ended";
  else status = "unknown";

  const describeBand = (b: AshBand) => {
    const height =
      b.ceiling > 0
        ? `FL${b.ceiling} (about ${flightLevelToFeet(b.ceiling).toLocaleString("en-US")} ft)`
        : "an unreported height";
    return `${height}${b.drift ? ` drifting ${b.drift}` : ""}`;
  };

  const lead =
    status === "ash-observed"
      ? "Ash observed to"
      : status === "ash-estimated"
        ? "Ash estimated to"
        : "Forecast ash to";
  const summary =
    status === "ash-observed" || status === "ash-estimated" || status === "forecast-only"
      ? `${lead} ${bands.map(describeBand).join("; and to ")}.`
      : status === "ash-ended"
        ? "This advisory reports ash is no longer identifiable or expected."
        : "This advisory carries no plotted ash cloud.";

  return { status, maxFlightLevel, bands, drift, summary };
}
