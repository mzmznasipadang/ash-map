import { NextRequest, NextResponse } from "next/server";

// Closure flags for several aerodromes at once, so the map can mark them
// without one request per pin. Reuses the per-ICAO route (and therefore its
// cache and channel handling) rather than a second copy of that logic.
//
// ponytail: sequential fetches, capped at 12 ICAOs. Only the airports already
// under ash are ever asked about, which is a handful; parallelise if that
// stops being true.

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX = 12;

export async function GET(req: NextRequest) {
  const codes = (req.nextUrl.searchParams.get("icao") ?? "")
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter((c) => /^[A-Z]{4}$/.test(c))
    .slice(0, MAX);

  if (codes.length === 0) return NextResponse.json({ closed: {}, configured: Boolean(process.env.SKYLINK_API_KEY) });
  if (!process.env.SKYLINK_API_KEY) return NextResponse.json({ closed: {}, configured: false });

  const origin = req.nextUrl.origin;
  const closed: Record<
    string,
    {
      closure: boolean;
      ash: boolean;
      reason: string | null;
      expiration: string | null;
      expirationEstimated: boolean;
      permanent: boolean;
    }
  > = {};

  for (const icao of codes) {
    try {
      const res = await fetch(`${origin}/api/notams/${icao}`, { cache: "no-store" });
      if (!res.ok) continue;
      const data = (await res.json()) as {
        notams?: {
          body: string;
          closure: boolean;
          ashRelated: boolean;
          expiration: string | null;
          expirationEstimated?: boolean;
          permanent?: boolean;
        }[];
      };
      const hit = data.notams?.find((n) => n.closure);
      if (hit) {
        closed[icao] = {
          closure: true,
          ash: hit.ashRelated,
          reason: hit.body || null,
          // null means the NOTAM carries no end time: until further notice.
          expiration: hit.expiration ?? null,
          expirationEstimated: Boolean(hit.expirationEstimated),
          permanent: Boolean(hit.permanent),
        };
      }
    } catch {
      // A missing flag just means the pin stays unmarked.
    }
  }

  return NextResponse.json({ closed, configured: true });
}
