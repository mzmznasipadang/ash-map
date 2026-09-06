import { NextRequest, NextResponse } from "next/server";
import { fetchLatestBulletins } from "@/lib/darwin";
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

type Payload = {
  fetchedAt: string;
  source: string;
  advisories: {
    file: string;
    issued: string;
    advisory: ReturnType<typeof parseVaaText>;
    frames: FrameKey[];
    geojson: Record<string, ReturnType<typeof frameGeoJSON>>;
  }[];
};

let cache: { at: number; limit: number; payload: Payload } | null = null;
let inFlight: Promise<Payload> | null = null;

async function build(limit: number): Promise<Payload> {
  const bulletins = await fetchLatestBulletins(limit);
  return {
    fetchedAt: new Date().toISOString(),
    source: "ftp://ftp.bom.gov.au/anon/gen/vaac/",
    advisories: bulletins.map((b) => {
      const advisory = parseVaaText(b.text);
      const frames = availableFrames(advisory);
      return {
        file: b.file,
        issued: b.issued,
        advisory,
        frames,
        geojson: Object.fromEntries(frames.map((f) => [f, frameGeoJSON(advisory, f)])),
      };
    }),
  };
}

export async function GET(req: NextRequest) {
  const requested = Number(req.nextUrl.searchParams.get("limit") ?? 5);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number.isFinite(requested) ? requested : 5));
  const force = req.nextUrl.searchParams.get("refresh") === "1";

  if (!force && cache && cache.limit >= limit && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ ...cache.payload, cached: true });
  }

  // Collapse concurrent requests onto one FTP session; several clients polling
  // at once must not open several connections to BOM.
  inFlight ??= build(limit)
    .then((payload) => {
      cache = { at: Date.now(), limit, payload };
      return payload;
    })
    .finally(() => {
      inFlight = null;
    });

  try {
    const payload = await inFlight;
    return NextResponse.json({ ...payload, cached: false });
  } catch (err) {
    // Serve stale data rather than nothing if BOM is unreachable.
    if (cache) {
      return NextResponse.json({ ...cache.payload, cached: true, stale: true, error: (err as Error).message });
    }
    return NextResponse.json({ error: `Darwin feed unavailable: ${(err as Error).message}` }, { status: 502 });
  }
}
