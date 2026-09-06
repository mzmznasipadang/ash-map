// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { formatDtg, formatZulu, parseDtg, parseFullDtg, parseShortDtg, relativeToNow } from "./dtg.ts";

test("parseFullDtg reads YYYYMMDD/HHMMZ as UTC", () => {
  const d = parseFullDtg("20260906/1430Z");
  assert.equal(d?.toISOString(), "2026-09-06T14:30:00.000Z");
  // Tolerate a missing Z; the field is Zulu by definition.
  assert.equal(parseFullDtg("20260906/1430")?.toISOString(), "2026-09-06T14:30:00.000Z");
});

test("parseFullDtg rejects impossible dates instead of rolling them over", () => {
  // Date.UTC would silently turn month 13 into next January.
  assert.equal(parseFullDtg("20261301/0000Z"), null);
  assert.equal(parseFullDtg("20260231/0000Z"), null, "31 February");
  assert.equal(parseFullDtg("not a dtg"), null);
});

test("parseShortDtg resolves the day against the advisory's own issue time", () => {
  const ref = new Date("2026-09-06T14:30:00Z");
  assert.equal(parseShortDtg("06/1240Z", ref)?.toISOString(), "2026-09-06T12:40:00.000Z");
  assert.equal(parseShortDtg("07/0210Z", ref)?.toISOString(), "2026-09-07T02:10:00.000Z");
});

test("a short DTG crossing a month boundary picks the nearer month", () => {
  // Issued 31 Aug, +18HR lands on 1 Sep — not 1 Aug.
  const endOfAugust = new Date("2026-08-31T22:00:00Z");
  assert.equal(parseShortDtg("01/1600Z", endOfAugust)?.toISOString(), "2026-09-01T16:00:00.000Z");

  // And the reverse: issued 1 Sep, an observation from 31 Aug.
  const startOfSeptember = new Date("2026-09-01T02:00:00Z");
  assert.equal(parseShortDtg("31/2300Z", startOfSeptember)?.toISOString(), "2026-08-31T23:00:00.000Z");

  // Year boundary too.
  const newYear = new Date("2027-01-01T01:00:00Z");
  assert.equal(parseShortDtg("31/2330Z", newYear)?.toISOString(), "2026-12-31T23:30:00.000Z");
});

test("parseShortDtg rejects nonsense", () => {
  const ref = new Date("2026-09-06T14:30:00Z");
  assert.equal(parseShortDtg("32/0000Z", ref), null);
  assert.equal(parseShortDtg("06/2500Z", ref), null);
  assert.equal(parseShortDtg("06/1299Z", ref), null);
});

test("parseDtg needs a reference for the short form, and says so by returning null", () => {
  assert.equal(parseDtg("06/1240Z"), null);
  assert.ok(parseDtg("06/1240Z", new Date("2026-09-06T14:30:00Z")));
  assert.ok(parseDtg("20260906/1430Z"));
  assert.equal(parseDtg(undefined), null);
});

test("formatZulu is stable regardless of the machine's time zone", () => {
  assert.equal(formatZulu(new Date("2026-09-06T14:30:00Z")), "6 Sep 14:30Z");
  assert.equal(formatZulu(new Date("2026-09-06T04:05:00Z")), "6 Sep 04:05Z");
});

test("formatDtg falls back to the raw token rather than hiding it", () => {
  // An operational reader can still read the advisory's own text.
  assert.equal(formatDtg("06/1240Z", "zulu"), "06/1240Z", "no reference given");
  assert.equal(formatDtg("garbage", "zulu"), "garbage");
  assert.equal(formatDtg(undefined, "zulu"), "—");
  assert.equal(formatDtg("20260906/1430Z", "zulu"), "6 Sep 14:30Z");
});

test("relativeToNow reads in the right direction", () => {
  const now = new Date("2026-09-06T14:30:00Z");
  assert.equal(relativeToNow(new Date("2026-09-06T13:48:00Z"), now), "42 min ago");
  assert.equal(relativeToNow(new Date("2026-09-06T20:30:00Z"), now), "in 6 h");
  assert.equal(relativeToNow(new Date("2026-09-06T14:30:30Z"), now), "now");
});
