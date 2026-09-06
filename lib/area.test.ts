// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { INDONESIA, inBBox, matchesArea } from "./area.ts";
import { parseVaaText } from "./vaa.ts";

const advisory = (fields: string) => parseVaaText(fields);

test("inBBox covers the archipelago and excludes its neighbours", () => {
  assert.ok(inBBox([-6.1, 105.4], INDONESIA), "Krakatau");
  assert.ok(inBBox([-8.5, 116.5], INDONESIA), "Rinjani");
  assert.ok(inBBox([1.5, 127.9], INDONESIA), "Dukono, north Maluku");
  assert.ok(!inBBox([-15.38, 167.83], INDONESIA), "Ambae, Vanuatu");
  assert.ok(!inBBox([-4.27, 152.2], INDONESIA), "Rabaul, PNG");
  assert.ok(!inBBox([35.36, 138.73], INDONESIA), "Fuji, Japan");
});

test("matchesArea uses the volcano position, not the AREA free text", () => {
  const krakatau = advisory("VOLCANO: KRAKATAU 262000\nPSN: S0606 E10525\nAREA: INDONESIA");
  const ambae = advisory("VOLCANO: AMBAE 257030\nPSN: S1523 E16750\nAREA: VANUATU");
  assert.equal(matchesArea(krakatau, "indonesia"), true);
  assert.equal(matchesArea(ambae, "indonesia"), false);

  // Position wins: a bulletin filed under a neighbour but sited in Indonesia.
  const mislabelled = advisory("VOLCANO: DUKONO 268010\nPSN: N0141 E12753\nAREA: PAPUA NEW GUINEA");
  assert.equal(matchesArea(mislabelled, "indonesia"), true);
});

test("matchesArea falls back to the AREA name when PSN is unparseable", () => {
  const noPsn = advisory("VOLCANO: SEMERU 263300\nAREA: INDONESIA");
  assert.equal(noPsn.position, undefined);
  assert.equal(matchesArea(noPsn, "indonesia"), true);
  assert.equal(matchesArea(advisory("AREA: VANUATU"), "indonesia"), false);
});

test("an unknown area name hides nothing", () => {
  // Better to show everything than to silently return an empty feed.
  const ambae = advisory("PSN: S1523 E16750\nAREA: VANUATU");
  assert.equal(matchesArea(ambae, "atlantis"), true);
});
