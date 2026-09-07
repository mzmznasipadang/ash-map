// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  authHeader,
  endpointFor,
  extractList,
  inferChannel,
  normalizeNotam,
  notamTimeToIso,
  rankNotams,
} from "./notams.ts";

test("the channel is inferred from the key's shape", () => {
  // SkyLink's own checkout (Polar) issues a UUID licence key; RapidAPI issues a
  // long dashless key. Sending one to the other's host returns a 403 that reads
  // like a caller bug, so this distinction is load-bearing.
  assert.equal(inferChannel("d7f3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4a5b"), "direct");
  assert.equal(inferChannel("D7F3A1B2-4C5D-6E7F-8A9B-0C1D2E3F4A5B"), "direct");
  assert.equal(inferChannel("  d7f3a1b2-4c5d-6e7f-8a9b-0c1d2e3f4a5b  "), "direct");
  assert.equal(inferChannel("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5"), "rapidapi");
  assert.equal(inferChannel("not-a-uuid"), "rapidapi");
});

test("each channel gets its own base URL and auth header", () => {
  const direct = endpointFor("direct", "WIII");
  assert.match(direct.url, /^https:\/\/data\.skylinkapi\.com\/v3\.1\/notams\/WIII/);
  assert.deepEqual(authHeader("direct", "k"), { "x-api-key": "k" });

  const rapid = endpointFor("rapidapi", "WIII");
  assert.match(rapid.url, /^https:\/\/skylink-api\.p\.rapidapi\.com\/v3\/notams\/WIII/);
  assert.equal(rapid.headers["x-rapidapi-host"], "skylink-api.p.rapidapi.com");
  assert.deepEqual(authHeader("rapidapi", "k"), { "x-rapidapi-key": "k" });

  // Monthly checklist NOTAMs are dropped server-side on both.
  assert.match(direct.url, /exclude_qcode=QK/);
  assert.match(rapid.url, /exclude_qcode=QK/);
});

test("NOTAM times are YYYYMMDDHHmm in UTC, not ISO", () => {
  assert.equal(notamTimeToIso("202609070128"), "2026-09-07T01:28:00.000Z");
  assert.equal(notamTimeToIso("202603241038"), "2026-03-24T10:38:00.000Z");
  assert.equal(notamTimeToIso(null), null);
  assert.equal(notamTimeToIso("PERM"), null, "permanent NOTAMs carry no end time");
  assert.equal(notamTimeToIso("2026090701"), null, "too short to be unambiguous");
  assert.equal(notamTimeToIso("202613010000"), null, "month 13 must not roll over");
});

// The real WIII response, field for field.
const ASH_NOTAM = {
  raw: "A3373/26 NOTAMN\nA) WIII B) 2609070128\nE) AD CLSD DUE TO KRAKATAU VOLCANIC ASH",
  notam_id: "A3373/2026",
  notam_id_domestic: "09/3373",
  type: "N",
  location: "WIII",
  effective: "202609070128",
  expiration: null,
  body: "AD CLSD DUE TO KRAKATAU VOLCANIC ASH",
  scope: "AERODROME",
  q_code: "QFALC",
  lower_limit: null,
  upper_limit: null,
};

test("normalizeNotam maps the provider's real field names", () => {
  const n = normalizeNotam(ASH_NOTAM);
  // These were guessed wrong first time: the provider uses raw/notam_id/
  // expiration/body, not text/id/expires.
  assert.equal(n.id, "A3373/2026");
  assert.equal(n.body, "AD CLSD DUE TO KRAKATAU VOLCANIC ASH");
  assert.equal(n.scope, "AERODROME");
  assert.equal(n.effective, "2026-09-07T01:28:00.000Z");
  assert.equal(n.expiration, null, "no end time means until further notice");
  assert.equal(n.ashRelated, true);
  assert.equal(n.closure, true);
});

test("a closure unrelated to ash is a closure but not ash-related", () => {
  const n = normalizeNotam({
    raw: "A3199/26 NOTAMN",
    notam_id: "A3199/2026",
    body: "RWY 07R/25L CLSD DUE TO RUBBER DEPOSITE REMOVAL",
    scope: "AERODROME",
    effective: "202609011700",
    expiration: "202609302230",
  });
  assert.equal(n.ashRelated, false);
  assert.equal(n.closure, true);
  assert.equal(n.expiration, "2026-09-30T22:30:00.000Z");
});

test("'CLSD' in an en-route notice is not treated as an aerodrome closure", () => {
  // Without the scope guard, taxiway and airspace notices read as closures.
  const n = normalizeNotam({
    raw: "W1234/26",
    notam_id: "W1234/2026",
    body: "TWY B CLSD",
    scope: "FIR",
    effective: "202609011700",
  });
  assert.equal(n.closure, false);
  assert.equal(n.ashRelated, false);
});

test("ash notices rank above closures, aerodrome scope and recency", () => {
  const ranked = rankNotams(
    [
      { body: "TWY A CLSD", scope: "FIR", effective: "202609070000", notam_id: "c" },
      { body: "AD CLSD DUE TO KRAKATAU VOLCANIC ASH", scope: "AERODROME", effective: "202601010000", notam_id: "ash" },
      { body: "RWY 07R CLSD", scope: "AERODROME", effective: "202609060000", notam_id: "clsd" },
    ].map(normalizeNotam)
  );
  assert.deepEqual(ranked.map((n) => n.id), ["ash", "clsd", "c"], "an old ash notice still outranks a fresh taxiway one");
});

test("extractList tolerates the shapes the provider might return", () => {
  assert.equal(extractList({ notams: [ASH_NOTAM] }).length, 1);
  assert.equal(extractList([ASH_NOTAM]).length, 1);
  assert.equal(extractList({ data: [ASH_NOTAM] }).length, 1);
  assert.deepEqual(extractList({}), []);
  assert.deepEqual(extractList(null), []);
});
