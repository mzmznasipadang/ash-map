// ICAO date-time groups.
//
// Advisories carry two shapes:
//   "20260906/1430Z"  full   — YYYYMMDD/HHMM, Zulu
//   "06/1240Z"        short  — day-of-month + HHMM, Zulu
//
// The short form is the one used for every cloud frame, and it carries no
// month. A +18HR forecast issued on the 31st lands in the next month, so
// resolving it needs the advisory's own issue time as a reference.
//
// "Zulu" is the NATO phonetic for the UTC+0 zone: aviation uses one clock
// worldwide so an advisory means the same instant everywhere it is read.

export type TimeMode = "zulu" | "local";

const FULL_RE = /^(\d{4})(\d{2})(\d{2})\/(\d{2})(\d{2})Z?$/;
const SHORT_RE = /^(\d{2})\/(\d{2})(\d{2})Z?$/;

export function parseFullDtg(dtg: string): Date | null {
  const m = FULL_RE.exec(dtg.trim());
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const date = new Date(Date.UTC(y, mo - 1, d, h, mi));
  // Reject a rolled-over date (month 13, day 32) rather than reporting it.
  return date.getUTCMonth() === mo - 1 && date.getUTCDate() === d ? date : null;
}

/**
 * Resolve a short DTG against a reference instant, choosing the month that puts
 * it closest to the reference. A frame is always within a day or so of issue.
 */
export function parseShortDtg(dtg: string, reference: Date): Date | null {
  const m = SHORT_RE.exec(dtg.trim());
  if (!m) return null;
  const [, day, h, mi] = m.map(Number) as unknown as number[];
  if (day < 1 || day > 31 || h > 23 || mi > 59) return null;

  const candidates = [-1, 0, 1]
    .map((monthOffset) => {
      const d = new Date(
        Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth() + monthOffset, day, h, mi)
      );
      return d.getUTCDate() === day ? d : null;
    })
    .filter((d): d is Date => d !== null);

  if (candidates.length === 0) return null;
  return candidates.reduce((best, d) =>
    Math.abs(d.getTime() - reference.getTime()) < Math.abs(best.getTime() - reference.getTime()) ? d : best
  );
}

export function parseDtg(dtg: string | undefined | null, reference?: Date | null): Date | null {
  if (!dtg) return null;
  const trimmed = dtg.trim();
  const full = parseFullDtg(trimmed);
  if (full) return full;
  // A short DTG with no reference is unresolvable; say so rather than guess.
  return reference ? parseShortDtg(trimmed, reference) : null;
}

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** e.g. "6 Sep 14:30Z" */
export function formatZulu(d: Date): string {
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`;
}

/** e.g. "6 Sep 21:30 WIB", in the viewer's own zone. */
export function formatLocal(d: Date): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZoneName: "short",
    }).format(d);
  } catch {
    return formatZulu(d);
  }
}

/** The viewer's zone, e.g. "Asia/Jakarta (UTC+7)". */
export function localZoneLabel(): string {
  try {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const offsetMin = -new Date().getTimezoneOffset();
    const sign = offsetMin < 0 ? "-" : "+";
    const abs = Math.abs(offsetMin);
    const hours = Math.floor(abs / 60);
    const mins = abs % 60;
    const offset = `UTC${sign}${hours}${mins ? `:${pad(mins)}` : ""}`;
    return zone ? `${zone} (${offset})` : offset;
  } catch {
    return "UTC";
  }
}

export function formatDtg(
  dtg: string | undefined | null,
  mode: TimeMode,
  reference?: Date | null
): string {
  const d = parseDtg(dtg, reference);
  // Unparseable: show the raw token rather than nothing. It is still the
  // advisory's own text and an operational reader can read it directly.
  if (!d) return dtg?.trim() ?? "—";
  return mode === "local" ? formatLocal(d) : formatZulu(d);
}

/** How far in the past/future, for a freshness cue: "42 min ago", "in 6 h". */
export function relativeToNow(d: Date, now = new Date()): string {
  const mins = Math.round((d.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(mins);
  const unit = abs < 60 ? `${abs} min` : abs < 60 * 48 ? `${Math.round(abs / 60)} h` : `${Math.round(abs / 1440)} d`;
  if (abs < 2) return "now";
  return mins < 0 ? `${unit} ago` : `in ${unit}`;
}
