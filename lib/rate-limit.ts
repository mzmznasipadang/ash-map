// The decisions behind the API rate limit, separated from the I/O in proxy.ts
// so they can be tested without a Redis or a request.
//
// ponytail: a fixed window counted with INCR, not a sliding log. Two Redis
// commands in one round trip, no new dependency, and the imprecision at a
// window boundary (up to 2x the budget across two adjacent windows) does not
// matter for a limit whose job is to stop a flood rather than meter a plan.

export const WINDOW_SECONDS = 60;

/**
 * The NOTAM route spends a metered 1,000-request monthly quota, so it gets a
 * tighter budget than the keyless upstreams.
 *
 * The floor is set by /api/notams/closures, which fans out to as many as 12
 * per-ICAO requests through this same limiter — the budget has to clear a full
 * fan-out plus the caller's ordinary traffic, or the app rate-limits itself.
 */
export function budget(pathname: string): number {
  return isNotams(pathname) ? 40 : 120;
}

function isNotams(pathname: string): boolean {
  return pathname === "/api/notams" || pathname.startsWith("/api/notams/");
}

/**
 * The counter key. The window number is part of it, so an expired counter is
 * simply a key nobody reads again — no sweep and no reset job. The two classes
 * count separately, or a burst of wind requests would spend the NOTAM budget.
 */
export function bucketKey(ip: string, pathname: string, now: number): string {
  const window = Math.floor(now / (WINDOW_SECONDS * 1000));
  return `rl:${ip}:${isNotams(pathname) ? "notams" : "api"}:${window}`;
}

/** Whether the request that produced this count is allowed through. */
export function allowed(count: number, pathname: string): boolean {
  return count <= budget(pathname);
}

/** Seconds until the current window rolls, for Retry-After. */
export function retryAfterSeconds(now: number): number {
  const elapsed = Math.floor((now % (WINDOW_SECONDS * 1000)) / 1000);
  // Never 0: a Retry-After of zero invites an immediate retry that is still
  // inside the window, which is a busy loop rather than a backoff.
  return Math.max(1, WINDOW_SECONDS - elapsed);
}

/**
 * The caller's address, from the proxy headers. "unknown" collapses every
 * unidentifiable caller into one bucket, which is the safe direction: a
 * request that hides its origin shares a budget rather than escaping the limit.
 */
export function clientIp(headers: { get(name: string): string | null }): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    // Left-most is the original client; the rest are the proxies it passed.
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
