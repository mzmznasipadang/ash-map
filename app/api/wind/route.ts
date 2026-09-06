import { NextRequest, NextResponse } from "next/server";
import type { WindVector } from "@/lib/types";
import { buildGrid } from "@/lib/grid";

// Wind field for the ash overlay, from Open-Meteo's free GFS-based forecast API
// (no API key required). We ask for wind_speed/wind_direction at a chosen
// pressure level across a grid of points inside the map's current bounds.
// https://open-meteo.com/en/docs/gfs-api

const MAX_GRID_POINTS = 64; // keep requests small and the map readable

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const north = Number(sp.get("north"));
  const south = Number(sp.get("south"));
  const east = Number(sp.get("east"));
  const west = Number(sp.get("west"));
  const level = sp.get("level") || "500"; // hPa

  if ([north, south, east, west].some((v) => Number.isNaN(v))) {
    return NextResponse.json({ error: "Missing/invalid north,south,east,west params" }, { status: 400 });
  }

  const { lats, lons } = buildGrid(north, south, east, west, MAX_GRID_POINTS);

  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", lats.join(","));
  url.searchParams.set("longitude", lons.join(","));
  url.searchParams.set("hourly", `wind_speed_${level}hPa,wind_direction_${level}hPa`);
  url.searchParams.set("forecast_days", "1");
  url.searchParams.set("timezone", "UTC");

  let data: unknown;
  try {
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: `Open-Meteo returned ${res.status}` }, { status: 502 });
    }
    data = await res.json();
  } catch (err) {
    return NextResponse.json({ error: `Fetch failed: ${(err as Error).message}` }, { status: 502 });
  }

  // Open-Meteo returns an array of per-location results when multiple
  // comma-separated coordinates are requested.
  const locations = Array.isArray(data) ? data : [data];

  const speedKey = `wind_speed_${level}hPa`;
  const dirKey = `wind_direction_${level}hPa`;
  const nowIso = new Date().toISOString().slice(0, 13); // "YYYY-MM-DDTHH"

  type OpenMeteoLocation = { hourly?: { time?: string[] } & Record<string, (number | null)[] | string[]> };

  const vectors: WindVector[] = (locations as OpenMeteoLocation[]).map((loc, i) => {
    const times = loc?.hourly?.time ?? [];
    let idx = times.findIndex((t) => t.startsWith(nowIso));
    if (idx === -1) idx = 0;
    const speed = Number(loc?.hourly?.[speedKey]?.[idx] ?? 0);
    const dir = Number(loc?.hourly?.[dirKey]?.[idx] ?? 0);
    return { lat: lats[i], lon: lons[i], speedKmh: speed, directionDeg: dir };
  });

  return NextResponse.json({ level, vectors });
}
