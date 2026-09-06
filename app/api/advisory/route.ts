import { NextRequest, NextResponse } from "next/server";
import { parseVaaText, availableFrames, frameGeoJSON, type VaaAdvisory } from "@/lib/vaa";

// Only allow fetching advisory text from the official VAAC hosts.
// This is a server-side fetch proxy (avoids browser CORS issues), so we
// don't want it turned into an open fetch-any-url proxy.
const ALLOWED_HOSTS = [
  "ospo.noaa.gov",
  "www.ospo.noaa.gov",
  "weather.gov",
  "www.weather.gov",
  "bom.gov.au",
  "www.bom.gov.au",
  "data.jma.go.jp",
  "ds.data.jma.go.jp",
  "meteo.fr",
  "vaac.meteo.fr",
  "weather.gc.ca",
];

function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"');
}

function buildResponse(advisory: VaaAdvisory) {
  const frames = availableFrames(advisory);
  const geojson = Object.fromEntries(frames.map((f) => [f, frameGeoJSON(advisory, f)]));
  return { advisory, frames, geojson };
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json({ error: "Missing ?url= parameter" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    return NextResponse.json(
      { error: `Host not allowed: ${parsed.hostname}. Use an official VAAC URL, or POST raw advisory text instead.` },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(parsed.toString(), {
      headers: { "User-Agent": "Mozilla/5.0 (ash-map prototype)" },
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({ error: `Upstream returned ${res.status}` }, { status: 502 });
    }
    const html = await res.text();
    const text = htmlToText(html);
    const advisory = parseVaaText(text);
    return NextResponse.json(buildResponse(advisory));
  } catch (err) {
    return NextResponse.json({ error: `Fetch failed: ${(err as Error).message}` }, { status: 502 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const text = body?.text;
  if (!text || typeof text !== "string") {
    return NextResponse.json({ error: "Expected JSON body { text: string }" }, { status: 400 });
  }
  const advisory = parseVaaText(text);
  return NextResponse.json(buildResponse(advisory));
}
