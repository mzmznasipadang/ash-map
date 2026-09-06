import { NextRequest, NextResponse } from "next/server";
import { fetchLatestBulletins, fetchLiveBulletins, getLastFetchStats } from "@/lib/darwin";
import { matchesArea } from "@/lib/area";
import { assessAsh, type AshAssessment } from "@/lib/eruption";
import { availableFrames, frameGeoJSON, parseVaaText, type FrameKey } from "@/lib/vaa";

// Polls BOM's anonymous FTP for the newest Darwin VAAC text bulletins and
// returns them already parsed, so the client can put one on the map without a
// second round trip.
//
// Note for deployment: this opens an outbound FTP connection. That works on a
// normal server or container; many serverless platforms block non-HTTP egress,
// in which case this route needs a runtime with plain socket access.

export const dynamic = "force-dynamic";

const CACHE_MS = 5 * 60 * 1000; // BOM issues at most hourly per volcano
const MAX_LIMIT = 10;
// How far back to read looking for bulletins that actually carry ash. Most
// bulletins are stand-downs, so without this the feed fills with "no cloud"
// entries while a live eruption sits further down the directory.
const SCAN_DEPTH = 40;

export type FeedAdvisory = {
  file: string;
  issued: string;
  advisory: ReturnType<typeof parseVaaText>;
  frames: FrameKey[];
  ash: AshAssessment;
  geojson: Record<string, ReturnType<typeof frameGeoJSON>>;
};

type Payload = {
  fetchedAt: string;
  source: string;
  /** How many bulletins were returned before any area filter. */
  total: number;
  /** Transfer accounting, so the polling cost is visible rather than assumed. */
  fetch: { scanned: number; downloaded: number; fromCache: number };
  advisories: FeedAdvisory[];
};

let cache: { at: number; limit: number; withAsh: boolean; live: boolean; payload: Payload } | null = null;
let inFlight: Promise<Payload> | null = null;

async function build(limit: number, withAsh: boolean, live: boolean): Promise<Payload> {
  // Live: one slot per volcano currently under advisory, in /anon/gen/fwo.
  // Archive: the dated vaac/<year>/ tree, which lags real time by days and is
  // only useful for history.
  const bulletins = live
    ? (await fetchLiveBulletins()).filter((b) => !withAsh || availableFrames(parseVaaText(b.text)).length > 0)
    : await fetchLatestBulletins(limit, undefined, {
        scanDepth: withAsh ? SCAN_DEPTH : limit,
        keep: withAsh ? (b) => availableFrames(parseVaaText(b.text)).length > 0 : undefined,
      });
  return {
    fetchedAt: new Date().toISOString(),
    source: live ? "ftp://ftp.bom.gov.au/anon/gen/fwo/" : "ftp://ftp.bom.gov.au/anon/gen/vaac/",
    total: bulletins.length,
    fetch: getLastFetchStats(),
    advisories: bulletins.map((b) => {
      const advisory = parseVaaText(b.text);
      const frames = availableFrames(advisory);
      return {
        file: b.file,
        issued: b.issued,
        advisory,
        frames,
        ash: assessAsh(advisory),
        geojson: Object.fromEntries(frames.map((f) => [f, frameGeoJSON(advisory, f)])),
      };
    }),
  };
}

// Filtering happens after the fetch so the cache stays area-agnostic: one FTP
// session serves every caller regardless of which area they asked for.
function applyArea(payload: Payload, area: string | null): Payload {
  if (!area) return payload;
  return {
    ...payload,
    advisories: payload.advisories.filter((a) => matchesArea(a.advisory, area)),
  };
}

/**
 * Keep only the newest advisory per volcano.
 *
 * A busy volcano is re-advised every few hours, so an ungrouped feed is four
 * Krakatau entries from four consecutive hours. On a map that draws every
 * entry, those stack into unreadable overlapping polygons — and "every volcano
 * currently advised" is the question the map is answering.
 */
function latestPerVolcano(payload: Payload): Payload {
  const seen = new Set<string>();
  return {
    ...payload,
    advisories: payload.advisories.filter((a) => {
      // Advisories are already newest-first. Fall back to the file name so an
      // unnamed volcano is never collapsed into another one.
      const key = a.advisory.volcanoNumber ?? a.advisory.volcano ?? a.file;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }),
  };
}

function shape(payload: Payload, area: string | null, group: boolean): Payload {
  const filtered = applyArea(payload, area);
  return group ? latestPerVolcano(filtered) : filtered;
}

export async function GET(req: NextRequest) {
  const requested = Number(req.nextUrl.searchParams.get("limit") ?? 5);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requested) ? requested : 5));
  const force = req.nextUrl.searchParams.get("refresh") === "1";
  const area = req.nextUrl.searchParams.get("area");
  // Default to advisories that have something to plot; ?withAsh=0 shows all.
  const withAsh = req.nextUrl.searchParams.get("withAsh") !== "0";
  // One entry per volcano by default; ?group=0 returns the full history.
  const group = req.nextUrl.searchParams.get("group") !== "0";
  // Live slots by default; ?live=0 reads the dated archive instead.
  const live = req.nextUrl.searchParams.get("live") !== "0";

  if (
    !force &&
    cache &&
    cache.limit >= limit &&
    cache.withAsh === withAsh &&
    cache.live === live &&
    Date.now() - cache.at < CACHE_MS
  ) {
    return NextResponse.json({ ...shape(cache.payload, area, group), cached: true });
  }

  // Collapse concurrent requests onto one FTP session; several clients polling
  // at once must not open several connections to BOM.
  inFlight ??= build(limit, withAsh, live)
    .then((payload) => {
      cache = { at: Date.now(), limit, withAsh, live, payload };
      return payload;
    })
    .finally(() => {
      inFlight = null;
    });

  try {
    const payload = await inFlight;
    return NextResponse.json({ ...shape(payload, area, group), cached: false });
  } catch (err) {
    // Serve stale data rather than nothing if BOM is unreachable.
    if (cache) {
      return NextResponse.json({
        ...shape(cache.payload, area, group),
        cached: true,
        stale: true,
        error: (err as Error).message,
      });
    }
    return NextResponse.json({ error: `Darwin feed unavailable: ${(err as Error).message}` }, { status: 502 });
  }
}
