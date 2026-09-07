// Normalizing SkyLink's NOTAM responses.
//
// Kept apart from the route so the field mapping, classification and ordering
// are testable without a network or a key — which matters here, because the
// mapping was written against the documented response and then corrected
// against a real one.

export type SkyLinkChannel = "direct" | "rapidapi";

export type RawNotam = Record<string, unknown>;

export type Notam = {
  id: string;
  /** Full ICAO-format text. */
  raw: string;
  /** Item E, the human-readable part. */
  body: string;
  type: string | null;
  scope: string | null;
  qCode: string | null;
  effective: string | null;
  expiration: string | null;
  /** The published end time is an estimate (item C carried EST). */
  expirationEstimated: boolean;
  /** Permanent: no end time exists. */
  permanent: boolean;
  lowerLimit: string | null;
  upperLimit: string | null;
  /** Mentions volcanic activity or ash. */
  ashRelated: boolean;
  /** Says the aerodrome or a runway is closed — the operationally decisive bit. */
  closure: boolean;
};

/**
 * A Polar licence key is a UUID; a RapidAPI key is a long key with no dashes.
 * The two channels serve the same data at different base URLs with different
 * auth headers, so sending one channel's key to the other yields a 403 that
 * reads like a bug in the caller.
 */
export function inferChannel(key: string): SkyLinkChannel {
  return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(key.trim())
    ? "direct"
    : "rapidapi";
}

export function endpointFor(channel: SkyLinkChannel, icao: string): { url: string; headers: Record<string, string> } {
  const query = "?exclude_qcode=QK"; // monthly checklist NOTAMs, never useful here
  return channel === "direct"
    ? { url: `https://data.skylinkapi.com/v3.1/notams/${icao}${query}`, headers: {} }
    : {
        url: `https://skylink-api.p.rapidapi.com/v3/notams/${icao}${query}`,
        headers: { "x-rapidapi-host": "skylink-api.p.rapidapi.com" },
      };
}

export function authHeader(channel: SkyLinkChannel, key: string): Record<string, string> {
  return channel === "direct" ? { "x-api-key": key } : { "x-rapidapi-key": key };
}

const ASH_RE = /VOLCAN|VOLCANIC ASH|\bASH\b|ASHTAM|ERUPT|\bVA\b/i;
const CLOSURE_RE = /\bAD\s+CLSD\b|\bAERODROME\s+CLOSED\b|\bRWY\s+[\w/]+\s+CLSD\b|\bCLSD\b/i;

/**
 * NOTAM times are YYYYMMDDHHmm in UTC, and item C may carry a qualifier:
 *
 *   202609071100EST   an ESTIMATED end — a real time, but the NOTAM may be
 *                     replaced or extended before it arrives
 *   PERM              permanent; there is no end time
 *
 * The qualifier is part of the value, so an anchored digits-only pattern
 * rejects the whole thing and reports "no end time" for a NOTAM that has one.
 */
export function parseNotamTime(value: unknown): {
  iso: string | null;
  estimated: boolean;
  permanent: boolean;
} {
  const s = String(value ?? "").trim().toUpperCase();
  if (s === "PERM") return { iso: null, estimated: false, permanent: true };

  const m = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})\s*(EST|EST\.|APRX)?$/.exec(s);
  if (!m) return { iso: null, estimated: false, permanent: false };

  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // Reject rolled-over values rather than reporting a wrong instant.
  if (date.getUTCMonth() !== mo - 1 || date.getUTCDate() !== d) {
    return { iso: null, estimated: false, permanent: false };
  }
  return { iso: date.toISOString(), estimated: Boolean(m[6]), permanent: false };
}

/** Just the instant, for callers that do not care about the qualifier. */
export function notamTimeToIso(value: unknown): string | null {
  return parseNotamTime(value).iso;
}

export function normalizeNotam(n: RawNotam): Notam {
  const raw = String(n.raw ?? "");
  const body = String(n.body ?? "");
  const haystack = `${raw} ${body}`;
  const ashRelated = ASH_RE.test(haystack);
  const expiry = parseNotamTime(n.expiration);
  return {
    id: String(n.notam_id ?? n.notam_id_domestic ?? ""),
    raw,
    body,
    type: (n.type as string) ?? null,
    scope: (n.scope as string) ?? null,
    qCode: (n.q_code as string) ?? null,
    effective: notamTimeToIso(n.effective),
    expiration: expiry.iso,
    expirationEstimated: expiry.estimated,
    permanent: expiry.permanent,
    lowerLimit: (n.lower_limit as string) ?? null,
    upperLimit: (n.upper_limit as string) ?? null,
    ashRelated,
    // Only call it a closure when ash is the stated reason or the scope is the
    // aerodrome; "CLSD" alone also appears in taxiway and lighting notices.
    closure: CLOSURE_RE.test(haystack) && (ashRelated || n.scope === "AERODROME"),
  };
}

/** Ash first, then closures, then aerodrome-scope, then newest. */
export function rankNotams(notams: Notam[]): Notam[] {
  return [...notams].sort(
    (a, b) =>
      Number(b.ashRelated) - Number(a.ashRelated) ||
      Number(b.closure) - Number(a.closure) ||
      Number(b.scope === "AERODROME") - Number(a.scope === "AERODROME") ||
      (b.effective ?? "").localeCompare(a.effective ?? "")
  );
}

/** SkyLink returns { notams: [...] }; tolerate a bare array or { data }. */
export function extractList(payload: unknown): RawNotam[] {
  if (Array.isArray(payload)) return payload as RawNotam[];
  const obj = payload as { notams?: unknown; data?: unknown };
  for (const candidate of [obj?.notams, obj?.data]) {
    if (Array.isArray(candidate)) return candidate as RawNotam[];
  }
  return [];
}
