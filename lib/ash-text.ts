// The ash sentence, built in the reader's language.
//
// assessAsh() returns a pre-rendered English `summary` for API consumers. That
// string cannot be translated after the fact, so the interface builds its own
// from the same structured fields. Keeping this a pure function of the
// assessment plus a lookup means the wording is testable in both languages
// without rendering a component.

import { flightLevelToFeet, flightLevelToMetres, type AshAssessment, type Drift } from "./eruption.ts";
import type { MessageKey } from "./i18n.ts";

export type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

const DIR_KEYS: Record<string, MessageKey> = {
  N: "dir.N",
  NE: "dir.NE",
  E: "dir.E",
  SE: "dir.SE",
  S: "dir.S",
  SW: "dir.SW",
  W: "dir.W",
  NW: "dir.NW",
};

export function driftLabel(drift: Drift, t: Translate): string {
  // An unrecognized compass point (Darwin writes "NNE" occasionally) falls back
  // to the token itself rather than disappearing.
  const dir = DIR_KEYS[drift.dir] ? t(DIR_KEYS[drift.dir]) : drift.dir;
  return t("ash.drift", { dir, knots: drift.knots });
}

export function altitudeLabel(fl: number, t: Translate): string {
  if (fl <= 0) return t("ash.altitudeUnknown");
  return t("ash.altitude", {
    fl,
    feet: flightLevelToFeet(fl).toLocaleString("en-US"),
    metres: flightLevelToMetres(fl).toLocaleString("en-US"),
  });
}

/** The whole sentence: status, every band, and each band's own drift. */
export function ashSentence(assessment: AshAssessment, t: Translate): string {
  const { status, bands } = assessment;

  if (status === "ash-ended") return t("ash.ended");
  if (status === "unknown" || bands.length === 0) return t("ash.none");

  const parts = bands.map((b) => {
    const height = altitudeLabel(b.ceiling, t);
    return b.drift ? t("ash.drifting", { height, drift: driftLabel(b.drift, t) }) : height;
  });

  const key =
    status === "ash-observed" ? "ash.observed" : status === "ash-estimated" ? "ash.estimated" : "ash.forecast";
  return t(key, { bands: parts.join(t("ash.bandJoin")) });
}
