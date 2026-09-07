import { NextRequest, NextResponse } from "next/server";
import { findAirport } from "@/lib/airports";
import {
  authHeader,
  endpointFor,
  extractList,
  inferChannel,
  normalizeNotam,
  rankNotams,
  type SkyLinkChannel,
} from "@/lib/notams";

// Published NOTAMs for one aerodrome, via the SkyLink NOTAM API (FAA SWIM FNS).
//
// Deliberately separate from the ash geometry. Whether an airport sits inside
// an advisory polygon is computed locally from published coordinates and always
// works. Whether that airport is actually restricted is a decision made by its
// authority and published through AIS — and that is what this reads. The two
// corroborate each other: an aerodrome the geometry puts under a surface-based
// cloud is the one whose NOTAMs are worth reading.
//
// Optional: without SKYLINK_API_KEY the route reports itself unconfigured and
// nothing else in the app changes. The key is read server-side only.

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const CACHE_MS = 10 * 60 * 1000;
// The free tier is 1,000 requests a month. A per-ICAO cache is what keeps a
// panel listing seven affected airports from spending seven of them a click.
const cache = new Map<string, { at: number; body: unknown }>();

export async function GET(req: NextRequest, ctx: { params: Promise<{ icao: string }> }) {
  const { icao: rawIcao } = await ctx.params;
  const icao = rawIcao.trim().toUpperCase();

  if (!/^[A-Z]{4}$/.test(icao)) {
    return NextResponse.json({ error: "Expected a 4-letter ICAO code" }, { status: 400 });
  }

  const key = process.env.SKYLINK_API_KEY;
  if (!key) {
    return NextResponse.json({
      configured: false,
      icao,
      message:
        "NOTAM lookup is not configured. Set SKYLINK_API_KEY to a SkyLink licence key (or a RapidAPI key) to enable it.",
    });
  }

  // SkyLink sells through two channels that share data but not base URLs or
  // auth headers, so the key decides which one to call. Override with
  // SKYLINK_API_CHANNEL if a key ever stops looking like its channel.
  const channel: SkyLinkChannel =
    process.env.SKYLINK_API_CHANNEL === "direct" || process.env.SKYLINK_API_CHANNEL === "rapidapi"
      ? process.env.SKYLINK_API_CHANNEL
      : inferChannel(key);

  const cacheKey = `${channel}:${icao}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ configured: true, cached: true, ...(hit.body as object) });
  }

  const { url, headers } = endpointFor(channel, icao);

  try {
    const res = await fetch(url, { headers: { ...headers, ...authHeader(channel, key) }, cache: "no-store" });

    if (!res.ok) {
      // The provider's own message is the useful part. A bare "returned 403"
      // sends the reader looking for a bug here, when RapidAPI means something
      // specific: a valid key that is not subscribed to this API.
      const providerMessage = await res
        .clone()
        .json()
        .then((b) => (b as { message?: string })?.message)
        .catch(() => undefined);

      const hint =
        res.status === 403
          ? channel === "rapidapi"
            ? "The key was read as a RapidAPI key, but that account is not subscribed to the SkyLink API. If the key came from SkyLink's own checkout it is a licence key: set SKYLINK_API_CHANNEL=direct."
            : "This endpoint is not included in the plan attached to that licence key."
          : res.status === 401
            ? "SKYLINK_API_KEY was rejected. Check it against the key in the SkyLink or RapidAPI dashboard."
            : res.status === 429
              ? "The monthly request quota is spent. It resets on the plan's renewal date."
              : undefined;

      return NextResponse.json(
        { configured: true, channel, icao, error: providerMessage ?? `NOTAM provider returned ${res.status}`, status: res.status, hint },
        { status: res.status === 429 ? 429 : 502 }
      );
    }

    const notams = rankNotams(extractList(await res.json()).map(normalizeNotam));

    const body = {
      icao,
      channel,
      airport: findAirport(icao)?.name ?? null,
      count: notams.length,
      ashRelated: notams.filter((n) => n.ashRelated).length,
      closures: notams.filter((n) => n.closure).length,
      notams,
      source: "SkyLink NOTAM API (FAA SWIM FNS)",
      fetchedAt: new Date().toISOString(),
    };
    cache.set(cacheKey, { at: Date.now(), body });
    return NextResponse.json({ configured: true, cached: false, ...body });
  } catch (err) {
    return NextResponse.json(
      { configured: true, channel, icao, error: `NOTAM lookup failed: ${(err as Error).message}` },
      { status: 502 }
    );
  }
}
