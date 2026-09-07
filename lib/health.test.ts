// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { assessSources, needsAttention, worstState, type HealthSignals } from "./health.ts";

const NOW = Date.parse("2026-09-07T12:00:00Z");
const at = (minutesAgo: number) => new Date(NOW - minutesAgo * 60_000).toISOString();

const healthy: HealthSignals = {
  darwin: { fetchedAt: at(5), scanned: 8, total: 5 },
  pvmbg: { fetchedAt: at(10), count: 69 },
  wind: { fetchedAt: at(3), vectors: 64, enabled: true },
  notams: { configured: true, checked: true },
  now: NOW,
};

const state = (s: HealthSignals, id: string) => assessSources(s).find((h) => h.id === id)!;

test("a healthy set reports ok across the board", () => {
  assert.deepEqual(
    assessSources(healthy).map((h) => h.state),
    ["ok", "ok", "ok", "ok"]
  );
  assert.equal(worstState(assessSources(healthy)), "ok");
  assert.equal(needsAttention("ok"), false);
});

test("an empty product listing is suspect, not ok", () => {
  // The failure that once showed one volcano when five were advised: the
  // request succeeded, it just listed nothing.
  const s = state({ ...healthy, darwin: { fetchedAt: at(5), scanned: 0, total: 0 } }, "darwin");
  assert.equal(s.state, "suspect");
  assert.match(s.detail!, /no product slots/);
});

test("a genuinely quiet feed is ok, not suspect", () => {
  // Darwin does publish nothing when no volcano in its area is active. That
  // must not be confused with a broken listing.
  const s = state({ ...healthy, darwin: { fetchedAt: at(5), scanned: 8, total: 0 } }, "darwin");
  assert.equal(s.state, "ok");
  assert.match(s.detail!, /no advisories current/);
});

test("an empty PVMBG parse is suspect, because Indonesia is never empty", () => {
  const s = state({ ...healthy, pvmbg: { fetchedAt: at(10), count: 0 } }, "pvmbg");
  assert.equal(s.state, "suspect");
  assert.match(s.detail!, /no alert levels/);
});

test("served-from-cache-after-a-failure reads as stale, not ok", () => {
  const s = state({ ...healthy, pvmbg: { fetchedAt: at(200), count: 69, stale: true, error: "502" } }, "pvmbg");
  assert.equal(s.state, "stale");
  assert.equal(s.detail, "502");
});

test("age alone makes a source stale", () => {
  assert.equal(state({ ...healthy, darwin: { fetchedAt: at(120), scanned: 8, total: 5 } }, "darwin").state, "stale");
  assert.equal(state({ ...healthy, darwin: { fetchedAt: at(80), scanned: 8, total: 5 } }, "darwin").state, "ok");
});

test("a source not yet checked is unknown rather than broken", () => {
  assert.equal(state({ ...healthy, pvmbg: {} }, "pvmbg").state, "unknown");
  assert.equal(state({ ...healthy, notams: { configured: true, checked: false } }, "notams").state, "unknown");
});

test("optional and off are distinguished from broken", () => {
  assert.equal(state({ ...healthy, notams: { configured: false } }, "notams").state, "unconfigured");
  assert.equal(state({ ...healthy, wind: { enabled: false } }, "wind").state, "unconfigured");
  assert.equal(needsAttention("unconfigured"), false);
});

test("an explicit error is a failure", () => {
  const s = state({ ...healthy, darwin: { fetchedAt: at(5), error: "FTP timeout", scanned: 8 } }, "darwin");
  assert.equal(s.state, "failed");
  assert.equal(s.detail, "FTP timeout");
  assert.equal(needsAttention("failed"), true);
});

test("suspect outranks failed for the single indicator", () => {
  // A failure is already visible where the data was needed; a plausible-looking
  // empty result is the one nobody notices.
  const mixed = assessSources({
    ...healthy,
    darwin: { fetchedAt: at(5), error: "FTP timeout", scanned: 8 },
    pvmbg: { fetchedAt: at(10), count: 0 },
  });
  assert.equal(worstState(mixed), "suspect");
});

test("age is reported so the panel can say how old the data is", () => {
  const s = state({ ...healthy, darwin: { fetchedAt: at(30), scanned: 8, total: 5 } }, "darwin");
  assert.ok(s.ageMs! >= 29 * 60_000 && s.ageMs! <= 31 * 60_000, `ageMs was ${s.ageMs}`);
});
