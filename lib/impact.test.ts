// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import type { LatLon } from "./coords.ts";
import { AIRPORTS, findAirport } from "./airports.ts";
import { assessAcross, assessAirports, describeImpact, pointInRing } from "./impact.ts";
import { parseVaaText } from "./vaa.ts";

const SQUARE: LatLon[] = [
  [0, 100],
  [0, 110],
  [-10, 110],
  [-10, 100],
];

test("pointInRing handles inside, outside and the degenerate case", () => {
  assert.equal(pointInRing([-5, 105], SQUARE), true);
  assert.equal(pointInRing([-5, 120], SQUARE), false);
  assert.equal(pointInRing([5, 105], SQUARE), false);
  assert.equal(pointInRing([-5, 105], SQUARE.slice(0, 2)), false, "not a polygon");
});

test("the boundary is inclusive, and deterministically so", () => {
  const triangle: LatLon[] = [
    [0, 100],
    [-10, 110],
    [-10, 100],
  ];
  // Ray casting alone answers boundary points arbitrarily; an aerodrome on the
  // edge of an ash cloud must not depend on which edge the ray clips.
  assert.equal(pointInRing([-10, 105], triangle), true, "on the base edge");
  assert.equal(pointInRing([0, 100], triangle), true, "exactly on a vertex");
  assert.equal(pointInRing([-5, 105], triangle), true, "on the hypotenuse");

  assert.equal(pointInRing([-5, 103], triangle), true, "clearly inside");
  assert.equal(pointInRing([-5, 90], triangle), false, "clearly outside");
  assert.equal(pointInRing([-11, 105], triangle), false, "just below the base");
});

test("a ring straddling the antimeridian is not treated as wrapping the globe", () => {
  // 175E to 175W. A naive test says anything between -175 and 175 is inside,
  // which would flag half the planet.
  const ring: LatLon[] = [
    [5, 175],
    [5, -175],
    [-5, -175],
    [-5, 175],
  ];
  assert.equal(pointInRing([0, 178], ring), true, "just west of the line");
  assert.equal(pointInRing([0, -178], ring), true, "just east of the line");
  assert.equal(pointInRing([0, 100], ring), false, "Indonesia is not in a Pacific cloud");
  assert.equal(pointInRing([0, 0], ring), false);
});

test("the airport dataset holds real coordinates", () => {
  const dps = findAirport("DPS");
  assert.equal(dps?.icao, "WADD");
  assert.ok(Math.abs(dps!.lat - -8.75) < 0.1, `Bali latitude was ${dps?.lat}`);
  assert.ok(Math.abs(dps!.lon - 115.17) < 0.1);
  assert.equal(findAirport("WADD")?.iata, "DPS", "ICAO lookup");
  assert.equal(findAirport("nope"), undefined);

  // Every entry must be plottable and in the right hemisphere-ish region.
  for (const a of AIRPORTS) {
    assert.ok(a.lat >= -45 && a.lat <= 25, `${a.icao} latitude ${a.lat}`);
    assert.ok(a.lon >= 90 && a.lon <= 155, `${a.icao} longitude ${a.lon}`);
    assert.equal(a.icao.length, 4);
  }
});

// A Krakatau advisory whose FL500 cloud covers western Java and the Sunda
// Strait, and whose FL150 cloud sits over Jakarta.
const KRAKATAU = `DTG: 20260906/1430Z
VAAC: DARWIN
VOLCANO: KRAKATAU 262000
PSN: S0606 E10525
AREA: INDONESIA
OBS VA DTG: 06/1410Z
OBS VA CLD: SFC/FL150 S0500 E10600 - S0500 E10700 - S0700 E10700 - S0700 E10600 MOV SE 05KT FL150/FL500 S0400 E10000 - S0400 E11000 - S1000 E11000 - S1000 E10000 MOV SW 10KT
FCST VA CLD +6 HR: 06/2010Z SFC/FL150 S0800 E11400 - S0800 E11600 - S0950 E11600 - S0950 E11400`;

test("airports under an advisory are found, with the band that covers them", () => {
  const impacts = assessAirports(parseVaaText(KRAKATAU));
  const codes = impacts.map((i) => i.airport.iata);

  // Jakarta (CGK, -6.13/106.65) is inside the surface-based FL150 box.
  assert.ok(codes.includes("CGK"), `Jakarta missing: ${codes.join(",")}`);
  const cgk = impacts.find((i) => i.airport.iata === "CGK")!;
  assert.equal(cgk.now, true);
  assert.equal(cgk.anySurface, true, "SFC/FL150 reaches the runway");
  assert.equal(cgk.maxCeiling, 500, "also inside the FL150/FL500 layer");

  // Denpasar (DPS, -8.75/115.17) is outside the observed boxes but inside the
  // +6HR forecast box, so it is affected later, not now.
  const dps = impacts.find((i) => i.airport.iata === "DPS");
  assert.ok(dps, "Denpasar missing from the forecast box");
  assert.equal(dps!.now, false);
  assert.equal(dps!.firstFrame, "+6HR");

  // Somewhere far outside must not appear at all.
  assert.equal(impacts.find((i) => i.airport.iata === "DJJ"), undefined, "Sentani is 2000 NM away");
});

test("impacts are ordered worst first", () => {
  const impacts = assessAirports(parseVaaText(KRAKATAU));
  // Affected now sorts above affected later.
  const firstLater = impacts.findIndex((i) => !i.now);
  if (firstLater > 0) {
    assert.ok(impacts.slice(0, firstLater).every((i) => i.now), "a later hit sorted above a current one");
  }
});

test("a band that starts above the surface is reported as altitude-only", () => {
  const aloft = parseVaaText(`DTG: 20260906/1430Z
VOLCANO: TEST 000000
OBS VA DTG: 06/1410Z
OBS VA CLD: FL200/FL400 S0500 E10600 - S0500 E10700 - S0700 E10700 - S0700 E10600 MOV SE 05KT`);
  const impacts = assessAirports(aloft);
  assert.ok(impacts.length > 0);
  assert.equal(impacts[0].anySurface, false);
  assert.match(describeImpact(impacts[0]), /at altitude only, to FL400/);
});

test("assessAcross merges one airport hit by two volcanoes", () => {
  const a = parseVaaText(KRAKATAU);
  const b = parseVaaText(`DTG: 20260906/1500Z
VOLCANO: SALAK 263050
OBS VA DTG: 06/1450Z
OBS VA CLD: SFC/FL100 S0500 E10600 - S0500 E10700 - S0700 E10700 - S0700 E10600 MOV E 05KT`);

  const merged = assessAcross([a, b]);
  const cgk = merged.find((i) => i.airport.iata === "CGK")!;
  assert.deepEqual(cgk.volcanoes.sort(), ["KRAKATAU", "SALAK"]);
  assert.equal(merged.filter((i) => i.airport.iata === "CGK").length, 1, "duplicated airport");
});

test("an advisory with no plotted cloud impacts nothing", () => {
  const empty = parseVaaText("VOLCANO: TEST 000000\nOBS VA CLD: NOT PROVIDED");
  assert.deepEqual(assessAirports(empty), []);
  assert.deepEqual(assessAcross([empty]), []);
});
