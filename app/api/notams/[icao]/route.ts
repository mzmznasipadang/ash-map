import { NextRequest, NextResponse } from "next/server";
import { findAirport } from "@/lib/airports";

// Live NOTAMs for one aerodrome, via the SkyLink NOTAM API (FAA SWIM FNS).
//
// This is deliberately separate from the ash geometry. Whether an airport sits
// inside an advisory polygon is computed locally from published coordinates and
// always works. Whether that airport is actually restricted is a decision made
// by its authority and published through AIS — a NOTAM or an ASHTAM — which no
// amount of polygon maths can tell you. This route reads those notices.
//
// It needs a key, so it is optional: without SKYLINK_API_KEY the route reports
// that it is unconfigured and the rest of the app is unaffected. The key is
// read server-side only and never reaches the browser.

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const UPSTREAM = "https://skylink-api.p.rapidapi.com/v3/notams";
const CACHE_MS = 10 * 60 * 1000;
// The free tier is 1,000 requests a month. A per-ICAO cache is what keeps a
// panel that lists seven affected airports from spending seven of them a click.
const cache = new Map<string, { at: number; body: unknown }>();

/** Volcanic-ash notices, so the caller can surface the relevant ones first. */
function isAshRelated(text: string): boolean {
  return /VOLCAN|ASH|ASHTAM|VA CLD|ERUPT/i.test(text);
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ icao: string }> }) {
  const { icao: raw } = await ctx.params;
  const icao = raw.trim().toUpperCase();

  if (!/^[A-Z]{4}$/.test(icao)) {
    return NextResponse.json({ error: "Expected a 4-letter ICAO code" }, { status: 400 });
  }

  const key = process.env.SKYLINK_API_KEY;
  if (!key) {
    return NextResponse.json({
      configured: false,
      icao,
      message:
        "NOTAM lookup is not configured. Set SKYLINK_API_KEY to a RapidAPI key for the SkyLink NOTAM API to enable it.",
    });
  }

  const hit = cache.get(icao);
  if (hit && Date.now() - hit.at < CACHE_MS) {
    return NextResponse.json({ configured: true, cached: true, ...(hit.body as object) });
  }

  try {
    const res = await fetch(`${UPSTREAM}/${icao}`, {
      headers: { "x-rapidapi-key": key, "x-rapidapi-host": "skylink-api.p.rapidapi.com" },
      cache: "no-store",
    });

    if (!res.ok) {
      // The provider's own message is the useful part. A bare "returned 403"
      // sends the reader looking for a bug in this app, when what RapidAPI
      // actually means is that the account holds a valid key but has not
      // subscribed to this particular API — a different fix entirely.
      const providerMessage = await res
        .clone()
        .json()
        .then((b) => (b as { message?: string })?.message)
        .catch(() => undefined);

      const hint =
        res.status === 403
          ? "The key is valid but the RapidAPI account is not subscribed to the SkyLink NOTAM API. Subscribe to its free Basic plan, then retry — a RapidAPI key alone does not grant access to an individual API."
          : res.status === 401
            ? "SKYLINK_API_KEY was rejected. Check it against the key on the RapidAPI dashboard."
            : res.status === 429
              ? "The monthly request quota is spent. It resets on the plan's renewal date."
              : undefined;

      return NextResponse.json(
        {
          configured: true,
          icao,
          error: providerMessage ?? `NOTAM provider returned ${res.status}`,
          status: res.status,
          hint,
        },
        { status: res.status === 429 ? 429 : 502 }
      );
    }

    const data = (await res.json()) as unknown;
    const list = Array.isArray(data)
      ? data
      : ((data as { notams?: unknown[] })?.notams ?? (data as { data?: unknown[] })?.data ?? []);

    const notams = (Array.isArray(list) ? list : []).map((n) => {
      const item = n as Record<string, unknown>;
      const text = String(item.text ?? item.raw ?? item.body ?? "");
      return {
        id: String(item.id ?? item.notamId ?? item.notam_id ?? ""),
        text,
        effective: (item.effective ?? item.effectiveStart ?? null) as string | null,
        expires: (item.expires ?? item.effectiveEnd ?? null) as string | null,
        ashRelated: isAshRelated(text),
      };
    });

    // Ash notices first; that is why this panel exists.
    notams.sort((a, b) => Number(b.ashRelated) - Number(a.ashRelated));

    const body = {
      icao,
      airport: findAirport(icao)?.name ?? null,
      count: notams.length,
      ashRelated: notams.filter((n) => n.ashRelated).length,
      notams,
      source: "SkyLink NOTAM API (FAA SWIM FNS)",
      fetchedAt: new Date().toISOString(),
    };
    cache.set(icao, { at: Date.now(), body });
    return NextResponse.json({ configured: true, cached: false, ...body });
  } catch (err) {
    return NextResponse.json(
      { configured: true, error: `NOTAM lookup failed: ${(err as Error).message}`, icao },
      { status: 502 }
    );
  }
}
