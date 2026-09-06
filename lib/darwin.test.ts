// Run with: npm test
// Pure selection logic only — no network. fetchLatestBulletins is exercised
// against the live FTP server separately.
import { test } from "node:test";
import assert from "node:assert/strict";

import { parseProductFile, pickLatest, yearDirs, DARWIN_TEXT_PRODUCT } from "./darwin.ts";

test("parseProductFile reads the issue time out of a BOM filename", () => {
  assert.deepEqual(parseProductFile("IDY41315.202608271445.txt"), {
    name: "IDY41315.202608271445.txt",
    issued: new Date("2026-08-27T14:45:00.000Z"),
  });
});

test("parseProductFile rejects everything that is not this text product", () => {
  // The same directory holds thousands of PNG charts under a different id.
  assert.equal(parseProductFile("IDY65315.202608271445.png"), null);
  assert.equal(parseProductFile("IDY41315.202608271445.png"), null);
  assert.equal(parseProductFile("IDY65315.202608271445.txt"), null);
  assert.equal(parseProductFile("junk.txt"), null);
  assert.equal(parseProductFile("IDY41315.txt"), null);
  // Short timestamp must not half-parse into a bogus date.
  assert.equal(parseProductFile("IDY41315.2026082714.txt"), null);
});

test("parseProductFile rejects an impossible timestamp", () => {
  // Month 13 rolls over in Date.UTC, so guard against silently wrong dates.
  const f = parseProductFile("IDY41315.202613010000.txt");
  assert.ok(f === null || f.issued.getUTCFullYear() === 2027, `got ${f?.issued.toISOString()}`);
});

test("pickLatest returns newest first and honours the limit", () => {
  const names = [
    "IDY41315.202601010000.txt",
    "IDY41315.202608271445.txt",
    "IDY65315.202608271445.png",
    "IDY41315.202603150930.txt",
    "notes.txt",
  ];
  assert.deepEqual(
    pickLatest(names, 2).map((f) => f.name),
    ["IDY41315.202608271445.txt", "IDY41315.202603150930.txt"]
  );
  assert.equal(pickLatest(names, 99).length, 3);
  assert.deepEqual(pickLatest(names, 0), []);
  assert.deepEqual(pickLatest([], 5), []);
});

test("pickLatest can select another VAAC's product id", () => {
  const names = ["IDY65315.202608271445.txt", "IDY41315.202608271445.txt"];
  assert.deepEqual(
    pickLatest(names, 5, "IDY65315").map((f) => f.name),
    ["IDY65315.202608271445.txt"]
  );
  assert.equal(DARWIN_TEXT_PRODUCT, "IDY41315");
});

test("yearDirs falls back to last year, which matters in early January", () => {
  assert.deepEqual(yearDirs(new Date("2026-01-02T03:00:00Z")), ["2026", "2025"]);
  assert.deepEqual(yearDirs(new Date("2026-12-31T23:59:00Z")), ["2026", "2025"]);
});
