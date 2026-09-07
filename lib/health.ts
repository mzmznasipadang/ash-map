// Whether the data on screen can be trusted.
//
// Every failure this app has had was silent. It polled one product slot and
// showed one volcano when five were advised. It read an archive tree that
// lagged ten days. An "EST" suffix on item C made a real closure end time read
// as "no end time". "EST VA CLD" dropped the current cloud for four of five
// volcanoes. A licence key sent to the wrong channel returned 403. In every
// case the app rendered confidently and nothing said otherwise.
//
// So the state that matters most here is not "failed" — a failure is visible.
// It is SUSPECT: the request succeeded and returned nothing, or nothing
// plausible. That is what looks like working software.
//
// Derived from responses the client already holds, so this costs no extra
// request and cannot itself be the thing that breaks.

export type SourceState = "ok" | "suspect" | "stale" | "failed" | "unconfigured" | "unknown";

export type SourceHealth = {
  id: "darwin" | "pvmbg" | "wind" | "notams";
  state: SourceState;
  /** Why, in one clause. Rendered after a localized source name. */
  detail?: string;
  /** Milliseconds since the last successful response, when known. */
  ageMs?: number;
};

export type HealthSignals = {
  darwin: {
    fetchedAt?: string | null;
    error?: string | null;
    /** Files the FTP listing produced. Zero means the listing itself failed. */
    scanned?: number;
    /** Advisories returned before any area filter. */
    total?: number;
  };
  pvmbg: { fetchedAt?: string | null; error?: string | null; count?: number; stale?: boolean };
  wind: { fetchedAt?: string | null; error?: string | null; vectors?: number; enabled: boolean };
  notams: { configured?: boolean; error?: string | null; checked?: boolean };
  now?: number;
};

const age = (at: string | null | undefined, now: number): number | undefined => {
  if (!at) return undefined;
  const t = Date.parse(at);
  return Number.isNaN(t) ? undefined : Math.max(0, now - t);
};

/** Older than this and the data is worth a second look rather than trust. */
const STALE_AFTER_MS = 90 * 60 * 1000;

export function assessSources(signals: HealthSignals): SourceHealth[] {
  const now = signals.now ?? Date.now();
  const out: SourceHealth[] = [];

  // --- Darwin FTP -----------------------------------------------------------
  {
    const { fetchedAt, error, scanned, total } = signals.darwin;
    const ageMs = age(fetchedAt, now);
    if (error) out.push({ id: "darwin", state: "failed", detail: error, ageMs });
    else if (!fetchedAt) out.push({ id: "darwin", state: "unknown", ageMs });
    else if (scanned === 0)
      // The directory listing returned nothing. A quiet feed still lists its
      // slots, so zero files means the listing broke, not that nothing is
      // erupting — the failure mode that once hid four volcanoes.
      out.push({ id: "darwin", state: "suspect", detail: "no product slots listed", ageMs });
    else if (ageMs !== undefined && ageMs > STALE_AFTER_MS)
      out.push({ id: "darwin", state: "stale", ageMs });
    else out.push({ id: "darwin", state: "ok", detail: total === 0 ? "no advisories current" : undefined, ageMs });
  }

  // --- PVMBG scrape ---------------------------------------------------------
  {
    const { fetchedAt, error, count, stale } = signals.pvmbg;
    const ageMs = age(fetchedAt, now);
    if (error && !stale) out.push({ id: "pvmbg", state: "failed", detail: error, ageMs });
    else if (!fetchedAt) out.push({ id: "pvmbg", state: "unknown", ageMs });
    else if (count === 0)
      // Indonesia always has dozens of volcanoes on the watch list, so an
      // empty parse means the page's markup moved — never that the country is
      // quiet.
      out.push({ id: "pvmbg", state: "suspect", detail: "no alert levels parsed", ageMs });
    else if (stale) out.push({ id: "pvmbg", state: "stale", detail: error ?? undefined, ageMs });
    else if (ageMs !== undefined && ageMs > STALE_AFTER_MS) out.push({ id: "pvmbg", state: "stale", ageMs });
    else out.push({ id: "pvmbg", state: "ok", ageMs });
  }

  // --- Open-Meteo wind ------------------------------------------------------
  {
    const { fetchedAt, error, vectors, enabled } = signals.wind;
    const ageMs = age(fetchedAt, now);
    if (!enabled) out.push({ id: "wind", state: "unconfigured", detail: "layer turned off" });
    else if (error) out.push({ id: "wind", state: "failed", detail: error, ageMs });
    else if (!fetchedAt) out.push({ id: "wind", state: "unknown", ageMs });
    else if (vectors === 0) out.push({ id: "wind", state: "suspect", detail: "no vectors returned", ageMs });
    else out.push({ id: "wind", state: "ok", ageMs });
  }

  // --- SkyLink NOTAMs -------------------------------------------------------
  {
    const { configured, error, checked } = signals.notams;
    if (configured === false) out.push({ id: "notams", state: "unconfigured", detail: "no API key set" });
    else if (error) out.push({ id: "notams", state: "failed", detail: error });
    else if (!checked) out.push({ id: "notams", state: "unknown" });
    else out.push({ id: "notams", state: "ok" });
  }

  return out;
}

const RANK: Record<SourceState, number> = {
  suspect: 0,
  failed: 1,
  stale: 2,
  unknown: 3,
  unconfigured: 4,
  ok: 5,
};

/**
 * The worst state worth showing, for a single indicator. "suspect" outranks
 * "failed" deliberately: a visible failure is already handled by the panel
 * that needed the data, while a plausible-looking empty result is not.
 */
export function worstState(health: SourceHealth[]): SourceState {
  if (health.length === 0) return "unknown";
  return health.reduce((worst, h) => (RANK[h.state] < RANK[worst] ? h.state : worst), "ok" as SourceState);
}

/** Whether the indicator should draw attention at all. */
export function needsAttention(state: SourceState): boolean {
  return state === "suspect" || state === "failed" || state === "stale";
}
