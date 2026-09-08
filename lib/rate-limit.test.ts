import assert from "node:assert/strict";
import { test } from "node:test";
import { allowed, bucketKey, budget, clientIp, retryAfterSeconds, WINDOW_SECONDS } from "./rate-limit.ts";

const headers = (map: Record<string, string>) => ({ get: (n: string) => map[n] ?? null });

test("the metered NOTAM route gets a tighter budget than the keyless ones", () => {
  assert.ok(budget("/api/notams/WIII") < budget("/api/wind"));
  assert.equal(budget("/api/notams/closures"), budget("/api/notams/WIII"));
});

test("the NOTAM budget clears a full 12-airport fan-out with room to spare", () => {
  // /api/notams/closures fetches up to 12 per-ICAO routes through this limiter.
  // If the budget did not clear that, the app would rate-limit itself on the
  // first map that has a dozen affected airports.
  assert.ok(budget("/api/notams/closures") > 12 * 2);
});

test("a path that merely starts with the same letters is not the NOTAM route", () => {
  assert.equal(budget("/api/notams-export"), budget("/api/wind"));
});

test("the two route classes count in separate buckets", () => {
  const now = Date.now();
  assert.notEqual(bucketKey("1.2.3.4", "/api/notams/WIII", now), bucketKey("1.2.3.4", "/api/wind", now));
});

test("two callers never share a bucket", () => {
  const now = Date.now();
  assert.notEqual(bucketKey("1.2.3.4", "/api/wind", now), bucketKey("5.6.7.8", "/api/wind", now));
});

test("the bucket rolls once a window has passed and not before", () => {
  const now = 1_000_000_000_000;
  const key = bucketKey("1.2.3.4", "/api/wind", now);
  assert.equal(bucketKey("1.2.3.4", "/api/wind", now + 1_000), key);
  assert.notEqual(bucketKey("1.2.3.4", "/api/wind", now + WINDOW_SECONDS * 1000), key);
});

test("the request that hits the budget exactly is allowed, the next one is not", () => {
  const limit = budget("/api/wind");
  assert.equal(allowed(limit, "/api/wind"), true);
  assert.equal(allowed(limit + 1, "/api/wind"), false);
});

test("Retry-After is never zero, which would invite an immediate retry", () => {
  // Sample the whole window, including the instant it rolls over.
  for (let second = 0; second < WINDOW_SECONDS; second++) {
    const value = retryAfterSeconds(second * 1000);
    assert.ok(value >= 1 && value <= WINDOW_SECONDS, `second ${second} gave ${value}`);
  }
});

test("the client is the left-most forwarded address, not the proxy chain", () => {
  assert.equal(clientIp(headers({ "x-forwarded-for": "203.0.113.9, 70.41.3.18, 150.172.238.178" })), "203.0.113.9");
});

test("x-real-ip is the fallback, and an unidentifiable caller shares one bucket", () => {
  assert.equal(clientIp(headers({ "x-real-ip": "203.0.113.9" })), "203.0.113.9");
  assert.equal(clientIp(headers({})), "unknown");
  // An empty or whitespace-only header must not become its own free-for-all key.
  assert.equal(clientIp(headers({ "x-forwarded-for": "  ", "x-real-ip": " " })), "unknown");
});
