import { NextResponse } from "next/server";
import { parseAlertLevels, rankAlerts, type VolcanoAlert } from "@/lib/pvmbg";

// Volcano alert levels from PVMBG, Indonesia's volcanology agency.
//
// Scraped from the public page because the JSON API needs credentials. The
// site is intermittently unavailable (its own root was returning 502 while
// this page served fine), so a failure serves the last good scrape rather than
// dropping the levels off the map.

export const dynamic = "force-dynamic";
export const maxDuration = 20;

const SOURCE = "https://magma.esdm.go.id/v1/gunung-api/tingkat-aktivitas";
// Alert levels change on the order of days, not minutes.
const CACHE_MS = 30 * 60 * 1000;

let cache: { at: number; alerts: VolcanoAlert[] } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return NextResponse.json({ alerts: cache.alerts, cached: true, source: SOURCE, fetchedAt: new Date(cache.at).toISOString() });
  }

  try {
    const res = await fetch(SOURCE, {
      headers: { "User-Agent": "Mozilla/5.0 (ash-map; volcanic ash advisory map)" },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`PVMBG returned ${res.status}`);

    const alerts = rankAlerts(parseAlertLevels(await res.text()));
    // An empty parse means the markup changed; keep the old data and say so
    // rather than reporting that no volcano is under alert.
    if (alerts.length === 0) throw new Error("No alert levels found — the page markup may have changed");

    cache = { at: Date.now(), alerts };
    return NextResponse.json({ alerts, cached: false, source: SOURCE, fetchedAt: new Date().toISOString() });
  } catch (err) {
    if (cache) {
      return NextResponse.json({
        alerts: cache.alerts,
        cached: true,
        stale: true,
        error: (err as Error).message,
        source: SOURCE,
        fetchedAt: new Date(cache.at).toISOString(),
      });
    }
    return NextResponse.json({ alerts: [], error: `PVMBG unavailable: ${(err as Error).message}`, source: SOURCE }, { status: 502 });
  }
}
