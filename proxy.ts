// Per-IP rate limit on the API routes.
//
// The routes are the expensive surface: /api/darwin opens an FTP session to
// BOM, /api/wind and /api/advisory make outbound fetches, and /api/notams
// spends a metered 1,000-request monthly quota. The per-ICAO and per-bulletin
// caches do not protect any of that from a caller who varies the parameters,
// which is exactly what a scraper does.
//
// The decisions live in lib/rate-limit.ts, tested there. This file is the I/O:
// which store to count in, and what to send back when the count is over.

import { NextResponse, type NextRequest } from "next/server";
import { allowed, bucketKey, budget, clientIp, retryAfterSeconds, WINDOW_SECONDS } from "@/lib/rate-limit";

export const config = { matcher: "/api/:path*" };

function redisConfig(): { url: string; token: string } | null {
  // Both naming schemes, because the deprecated Vercel KV integration injected
  // KV_REST_API_* and the current Upstash one injects UPSTASH_REDIS_REST_*.
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

// The fallback store. Per-instance, so on serverless it only catches a flood
// that lands on one instance — enough for local and preview, not a substitute
// for Redis in production.
const memory = new Map<string, number>();

function countInMemory(key: string): number {
  // Keys carry their window, so a stale one is simply never read again. This
  // clear is the only reaping there is, which is why the cap exists.
  if (memory.size > 10_000) memory.clear();
  const next = (memory.get(key) ?? 0) + 1;
  memory.set(key, next);
  return next;
}

/**
 * INCR the window's counter and give it a TTL on first write. Returns null when
 * the store is unreachable — the caller then allows the request, because a
 * limiter that fails closed turns a Redis blip into an outage.
 */
async function countInRedis(key: string): Promise<number | null> {
  const config = redisConfig();
  if (!config) return null;
  try {
    const res = await fetch(`${config.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      // EXPIRE ... NX sets the TTL only when the key has none, so the window
      // starts at the first request rather than being pushed back by each one.
      body: JSON.stringify([
        ["INCR", key],
        ["EXPIRE", key, WINDOW_SECONDS, "NX"],
      ]),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const [incr] = (await res.json()) as { result?: number }[];
    return typeof incr?.result === "number" ? incr.result : null;
  } catch {
    return null;
  }
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const now = Date.now();
  const key = bucketKey(clientIp(req.headers), pathname, now);

  const count = (await countInRedis(key)) ?? countInMemory(key);
  if (allowed(count, pathname)) return NextResponse.next();

  const retryAfter = retryAfterSeconds(now);
  return NextResponse.json(
    { error: "Too many requests. This endpoint is rate limited per IP." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "RateLimit-Limit": String(budget(pathname)),
        "RateLimit-Remaining": "0",
        "RateLimit-Reset": String(retryAfter),
      },
    }
  );
}
