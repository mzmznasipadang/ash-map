// Parser for the standard ICAO/IAVW Volcanic Ash Advisory (VAA) text message.
// Every VAAC (Washington, Darwin, Tokyo, London, Toulouse, ...) issues advisories
// in this same field-based format, so one parser covers all of them.
//
// Example input (Washington VAAC, real advisory):
//
// DTG: 20260905/1442Z
// VAAC: WASHINGTON
// VOLCANO: FUEGO 342090
// PSN: N1428 W09052
// AREA: GUATEMALA
// SUMMIT ELEV: 12346 FT
// ADVISORY NR: 2026/1034
// INFO SOURCE: GOES-19. WEBCAM. NWP MODELS.
// ERUPTION DETAILS: FQT VA EM
// OBS VA DTG: 05/1420Z
// OBS VA CLD: SFC/FL140 N1440 W09123 - N1435 W09122 - ... MOV W 10KT
// FCST VA CLD +6HR: 05/2030Z SFC/FL140 N1429 W09053 - ...
// FCST VA CLD +12HR: 06/0230Z SFC/FL140 N1431 W09118 - ...
// FCST VA CLD +18HR: 06/0830Z SFC/FL140 N1431 W09118 - ...
// RMK: VA EM OBS IN WEBCAM ...
// NXT ADVISORY: WILL BE ISSUED BY 20260905/2045Z

import { parseCoord, type LatLon } from "./coords.ts";
import { flightLevelCeiling } from "./style.ts";

export type AshPolygon = {
  flightLevel: string; // e.g. "SFC/FL140"
  vertices: LatLon[];
  movement?: string; // e.g. "MOV W 10KT"
};

export type CloudFrame = {
  dtg?: string;
  polygons: AshPolygon[];
  /**
   * True when this came from EST VA CLD rather than OBS VA CLD: the cloud is
   * modelled from the last confirmed observation, not currently visible on
   * satellite. Worth surfacing — it is a real difference in confidence.
   */
  estimated?: boolean;
};

export type VaaAdvisory = {
  raw: string;
  dtg?: string;
  vaac?: string;
  volcano?: string;
  volcanoNumber?: string;
  position?: LatLon;
  area?: string;
  elevation?: string;
  advisoryNr?: string;
  infoSource?: string;
  eruptionDetails?: string;
  remark?: string;
  nextAdvisory?: string;
  observation: CloudFrame;
  forecasts: { hour: 6 | 12 | 18 | 24; dtg?: string; polygons: AshPolygon[] }[];
};

const FIELD_LABELS = [
  "DTG",
  "VAAC",
  "VOLCANO",
  "PSN",
  "AREA",
  "SUMMIT ELEV",
  "SOURCE ELEV",
  "ADVISORY NR",
  "INFO SOURCE",
  "ERUPTION DETAILS",
  // "EST VA ..." must be listed: when satellite cannot confirm a cloud, Darwin
  // issues EST (estimated) instead of OBS. Worse, "EST VA DTG" *contains*
  // "DTG", so without its own label the scanner matches the bare DTG field and
  // overwrites the advisory's issue time with the estimated cloud's text.
  "EST VA DTG",
  "EST VA CLD",
  "OBS VA DTG",
  "OBS VA CLD",
  // Darwin issues "FCST VA CLD +6 HR:", Washington "FCST VA CLD +6HR:" — the
  // space is optional in the wild, so it has to be optional here.
  "FCST VA CLD \\+6\\s?HR",
  "FCST VA CLD \\+12\\s?HR",
  "FCST VA CLD \\+18\\s?HR",
  "FCST VA CLD \\+24\\s?HR",
  "RMK",
  "NXT ADVISORY",
];

// A WMO bulletin ends at "="; distributors append their own boilerplate after
// that (BOM appends a copyright notice). Without trimming it, the final field
// absorbs the entire footer.
function stripBoilerplate(text: string): string {
  const footer = text.search(/^[^\S\n]*(Copyright|Disclaimer)\b/im);
  return footer === -1 ? text : text.slice(0, footer);
}

function extractFields(text: string): Record<string, string> {
  const labelPattern = FIELD_LABELS.join("|");
  const re = new RegExp(`(${labelPattern}):\\s*`, "g");
  const fields: Record<string, string> = {};
  const matches = [...text.matchAll(re)];
  for (let i = 0; i < matches.length; i++) {
    const label = matches[i][1].replace(/\\\+/g, "+").replace(/\+(\d+)\s+HR/, "+$1HR");
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : text.length;
    fields[label] = text
      .slice(start, end)
      .replace(/\s+/g, " ")
      .replace(/=\s*$/, "") // bulletin terminator, not part of the value
      .trim();
  }
  return fields;
}

const NO_ASH_RE = /NO VA EXP|NOT AVBL|NOT AVAILABLE|NOT PROVIDED|NOT IDENTIFIABLE|NO VA CLD|^N\/A$/i;
const FL_TOKEN_RE = /(SFC|FL\d{3})\/(FL\d{3})/g;
const MOV_RE = /MOV\s+[A-Z]+(?:\/[A-Z]+)?\s+\d+\s?KT/;

export function parseCloudField(value: string | undefined): CloudFrame {
  if (!value) return { polygons: [] };

  // Read the frame time before bailing out: "27/2053Z NOT PROVIDED" still tells
  // you which frame it is, and the timeline needs that label.
  const dtgMatch = /^(\d{2}\/\d{4}Z)\s*/.exec(value.trim());
  const dtg = dtgMatch?.[1];
  if (NO_ASH_RE.test(value)) return { dtg, polygons: [] };

  const rest = dtg ? value.trim().slice(dtgMatch[0].length) : value.trim();

  const starts: number[] = [];
  let m: RegExpExecArray | null;
  FL_TOKEN_RE.lastIndex = 0;
  while ((m = FL_TOKEN_RE.exec(rest))) starts.push(m.index);

  const polygons: AshPolygon[] = [];
  for (let i = 0; i < starts.length; i++) {
    const chunk = rest.slice(starts[i], starts[i + 1] ?? rest.length).trim();
    const flMatch = /^(SFC|FL\d{3})\/(FL\d{3})/.exec(chunk);
    const flightLevel = flMatch ? flMatch[0] : "UNKNOWN";
    const afterFl = chunk.slice(flMatch ? flMatch[0].length : 0);
    const movMatch = MOV_RE.exec(afterFl);
    const movement = movMatch?.[0];
    const coordsPart = movMatch ? afterFl.slice(0, movMatch.index) : afterFl;

    const vertices = coordsPart
      .split("-")
      .map((t) => parseCoord(t))
      .filter((v): v is LatLon => v !== null);

    if (vertices.length >= 3) polygons.push({ flightLevel, vertices, movement });
  }

  return { dtg, polygons };
}

export function parseVaaText(raw: string): VaaAdvisory {
  const fields = extractFields(stripBoilerplate(raw));

  const position = fields["PSN"] ? parseCoord(fields["PSN"]) ?? undefined : undefined;

  const volcanoField = fields["VOLCANO"] || "";
  const volMatch = /^(.*?)\s+(\d{4,6})$/.exec(volcanoField.trim());
  const volcano = (volMatch ? volMatch[1] : volcanoField).trim() || undefined;
  const volcanoNumber = volMatch?.[2];

  // Prefer an observed cloud; fall back to an estimated one.
  const observedField = fields["OBS VA CLD"];
  const estimatedField = fields["EST VA CLD"];
  const useEstimated = !observedField?.trim() && !!estimatedField?.trim();

  const observation = parseCloudField(useEstimated ? estimatedField : observedField);
  if (useEstimated) observation.estimated = true;
  if (!observation.dtg) {
    observation.dtg = useEstimated ? fields["EST VA DTG"] : fields["OBS VA DTG"];
  }

  const forecasts = ([6, 12, 18, 24] as const)
    .map((hour) => {
      const key = `FCST VA CLD +${hour}HR`;
      if (!(key in fields)) return null;
      const frame = parseCloudField(fields[key]);
      return { hour, dtg: frame.dtg, polygons: frame.polygons };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null);

  return {
    raw,
    dtg: fields["DTG"],
    vaac: fields["VAAC"],
    volcano,
    volcanoNumber,
    position,
    area: fields["AREA"],
    elevation: fields["SUMMIT ELEV"] || fields["SOURCE ELEV"],
    advisoryNr: fields["ADVISORY NR"],
    infoSource: fields["INFO SOURCE"],
    eruptionDetails: fields["ERUPTION DETAILS"],
    remark: fields["RMK"],
    nextAdvisory: fields["NXT ADVISORY"],
    observation,
    forecasts,
  };
}

export type FrameKey = "OBS" | "+6HR" | "+12HR" | "+18HR" | "+24HR";

export function availableFrames(advisory: VaaAdvisory): FrameKey[] {
  const frames: FrameKey[] = [];
  if (advisory.observation.polygons.length) frames.push("OBS");
  for (const f of advisory.forecasts) {
    if (f.polygons.length) frames.push(`+${f.hour}HR` as FrameKey);
  }
  return frames;
}

export function framePolygons(advisory: VaaAdvisory, frame: FrameKey): AshPolygon[] {
  if (frame === "OBS") return advisory.observation.polygons;
  const hour = Number(frame.replace(/\D/g, "")) as 6 | 12 | 18 | 24;
  return advisory.forecasts.find((f) => f.hour === hour)?.polygons ?? [];
}

export function frameDtg(advisory: VaaAdvisory, frame: FrameKey): string | undefined {
  if (frame === "OBS") return advisory.observation.dtg;
  const hour = Number(frame.replace(/\D/g, "")) as 6 | 12 | 18 | 24;
  return advisory.forecasts.find((f) => f.hour === hour)?.dtg;
}

export function frameGeoJSON(advisory: VaaAdvisory, frame: FrameKey) {
  const polygons = framePolygons(advisory, frame);

  return {
    type: "FeatureCollection" as const,
    features: polygons.map((p) => ({
      type: "Feature" as const,
      properties: {
        flightLevel: p.flightLevel,
        movement: p.movement ?? null,
        frame,
      },
      geometry: {
        type: "Polygon" as const,
        coordinates: [p.vertices.map(([lat, lon]) => [lon, lat])],
      },
    })),
  };
}

/**
 * Every frame of an advisory as ONE FeatureCollection, with the advisory's
 * identity copied onto each feature.
 *
 * frameGeoJSON is shaped for the map, which already knows which advisory it is
 * showing. A file handed to QGIS or ArcGIS has no such context, so each feature
 * has to carry the volcano, the VAAC, the issue time and the frame itself.
 */
export function advisoryGeoJSON(advisory: VaaAdvisory) {
  const frames = availableFrames(advisory);

  return {
    type: "FeatureCollection" as const,
    features: frames.flatMap((frame) =>
      framePolygons(advisory, frame).map((p) => ({
        type: "Feature" as const,
        properties: {
          volcano: advisory.volcano ?? null,
          volcanoNumber: advisory.volcanoNumber ?? null,
          vaac: advisory.vaac ?? null,
          area: advisory.area ?? null,
          advisoryNr: advisory.advisoryNr ?? null,
          dtg: advisory.dtg ?? null,
          frame,
          frameDtg: frameDtg(advisory, frame) ?? null,
          flightLevel: p.flightLevel,
          flightLevelCeiling: flightLevelCeiling(p.flightLevel),
          movement: p.movement ?? null,
        },
        geometry: {
          type: "Polygon" as const,
          coordinates: [p.vertices.map(([lat, lon]) => [lon, lat])],
        },
      }))
    ),
  };
}
