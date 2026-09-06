// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { assessAsh, describeMovement, flightLevelToFeet } from "./eruption.ts";
import { advisoryGeoJSON, availableFrames, framePolygons, parseVaaText } from "./vaa.ts";

const RING = "S0400 E08700 - S1200 E08100 - S1500 E09600 - S0400 E08700";

test("describeMovement turns the MOV clause into words", () => {
  assert.equal(describeMovement("MOV SW 10KT"), "southwest at 10 kt");
  assert.equal(describeMovement("MOV N 5 KT"), "north at 5 kt");
  assert.equal(describeMovement(undefined), undefined);
  assert.equal(describeMovement("MOV UNKNOWN"), undefined);
});

test("flightLevelToFeet converts flight levels", () => {
  assert.equal(flightLevelToFeet(500), 50000);
  assert.equal(flightLevelToFeet(120), 12000);
});

test("ash observed now is distinguished from forecast only", () => {
  const observed = parseVaaText(`VOLCANO: KRAKATAU 262000
OBS VA CLD: SFC/FL500 ${RING} MOV SW 10KT`);
  const a = assessAsh(observed);
  assert.equal(a.status, "ash-observed");
  assert.equal(a.maxFlightLevel, 500);
  assert.equal(a.drift, "southwest at 10 kt");
  assert.match(a.summary, /Ash observed to FL500 \(about 50,000 ft\) drifting southwest at 10 kt/);

  const forecast = parseVaaText(`VOLCANO: KRAKATAU 262000
OBS VA CLD: NOT IDENTIFIABLE
FCST VA CLD +6 HR: 06/1210Z SFC/FL200 ${RING} MOV W 5KT`);
  const f = assessAsh(forecast);
  assert.equal(f.status, "forecast-only");
  assert.equal(f.maxFlightLevel, 200);
  assert.match(f.summary, /^Forecast ash to FL200/);
});

test("a stand-down advisory reads as ended, not as unknown", () => {
  const ended = assessAsh(
    parseVaaText(`VOLCANO: AMBAE 257030
OBS VA CLD:
FCST VA CLD +6 HR: 27/2053Z NOT PROVIDED
RMK: VA NO LONGER EXPECTED NEAR THE VAAC DARWIN AREA OF RESPONSIBILITY`)
  );
  assert.equal(ended.status, "ash-ended");
  assert.equal(ended.maxFlightLevel, 0);
  assert.match(ended.summary, /no longer identifiable or expected/);
});

test("advisoryGeoJSON features stand alone without the app's context", () => {
  const a = parseVaaText(`DTG: 20260906/0630Z
VAAC: DARWIN
VOLCANO: KRAKATAU 262000
PSN: S0606 E10525
AREA: INDONESIA
ADVISORY NR: 2026/186
OBS VA DTG: 06/0610Z
OBS VA CLD: SFC/FL500 ${RING} MOV SW 10KT
FCST VA CLD +6 HR: 06/1210Z SFC/FL200 ${RING} MOV W 5KT`);

  const fc = advisoryGeoJSON(a);
  assert.equal(fc.type, "FeatureCollection");
  assert.equal(fc.features.length, 2, "one feature per frame");

  const p = fc.features[0].properties;
  assert.equal(p.volcano, "KRAKATAU");
  assert.equal(p.volcanoNumber, "262000");
  assert.equal(p.vaac, "DARWIN");
  assert.equal(p.advisoryNr, "2026/186");
  assert.equal(p.frame, "OBS");
  assert.equal(p.frameDtg, "06/0610Z");
  assert.equal(p.flightLevelCeiling, 500);
  assert.equal(p.movement, "MOV SW 10KT");

  // GeoJSON is lon,lat and rings must close.
  const ring = fc.features[0].geometry.coordinates[0];
  assert.deepEqual(ring[0], [87, -4]);
  assert.deepEqual(ring[0], ring[ring.length - 1], "ring not closed");

  assert.equal(fc.features[1].properties.frame, "+6HR");
  assert.equal(fc.features[1].properties.flightLevelCeiling, 200);
});

// A real two-band Darwin advisory. Both clouds are live at once and they move
// in DIFFERENT directions, which is exactly where a single drift value lies.
// It also wraps coordinates across lines mid-pair ("S1111\nE10619") and omits
// the MOV clause on the forecast frames.
const KRAKATAU_TWO_BAND = `FVAU04 ADRM 061430
VA ADVISORY
DTG: 20260906/1430Z
VAAC: DARWIN
VOLCANO: KRAKATAU 262000
PSN: S0606 E10525
AREA: INDONESIA
SOURCE ELEV: 155M AMSL
ADVISORY NR: 2026/189
INFO SOURCE: HIMAWARI-9 CVGHM
ERUPTION DETAILS: VA TO FL500 MOV SW, VA TO FL150 MOV SE
OBS VA DTG: 06/1410Z
OBS VA CLD: SFC/FL150 S0320 E10503 - S0613 E10927 - S1111
E10619 - S0551 E09823 - S0304 E09801 MOV SE 05KT SFC/FL500
S1114 E09750 - S1957 E09708 - S1742 E08358 - S1017 E07920 -
S0402 E08447 - S0419 E08950 MOV SW 10KT
FCST VA CLD +6 HR: 06/2010Z SFC/FL150 S0318 E10509 - S0614
E10932 - S1108 E10632 - S0559 E09821 - S0301 E09747
SFC/FL500 S1118 E09755 - S2028 E09703 - S1824 E08354 - S1023
E07841 - S0424 E08331 - S0429 E09003
FCST VA CLD +12 HR: 07/0210Z SFC/FL150 S0243 E10449 - S0618
E10927 - S1110 E10636 - S0559 E09827 - S0304 E09755
SFC/FL500 S1132 E09751 - S2045 E09656 - S1843 E08354 - S1019
E07756 - S0443 E08228 - S0443 E08936
FCST VA CLD +18 HR: 07/0810Z SFC/FL150 S0218 E10434 - S0614
E10923 - S1059 E10638 - S0555 E09823 - S0300 E09757
SFC/FL500 S1130 E09751 - S2055 E09654 - S1857 E08323 - S1025
E07720 - S0500 E08150 - S0446 E08940
RMK: HIGH LEVEL VA TO FL500 IS DETACHED FROM THE VOLCANO AND
MOVING SW. CONTINUOUS VA EMISSION TO FL150 MOV SE, WITH
REMNANTS OF VA FROM EARLIER ERUPTION STILL PRESENT.
NXT ADVISORY: NO LATER THAN 20260906/1730Z=`;

test("a coordinate wrapped across a line break is still one vertex", () => {
  const a = parseVaaText(KRAKATAU_TWO_BAND);
  const fl150 = parseVaaText(KRAKATAU_TWO_BAND).observation.polygons[0];
  assert.equal(fl150.flightLevel, "SFC/FL150");
  assert.equal(fl150.vertices.length, 5, "the wrapped pair split into two vertices");
  // "S1111\nE10619" is S11 11' / E106 19'.
  const [lat, lon] = fl150.vertices[2];
  assert.ok(Math.abs(lat - -(11 + 11 / 60)) < 1e-9, `lat was ${lat}`);
  assert.ok(Math.abs(lon - (106 + 19 / 60)) < 1e-9, `lon was ${lon}`);
  assert.deepEqual(a.position, [-(6 + 6 / 60), 105 + 25 / 60]);
});

test("each flight-level band keeps its own drift", () => {
  const a = assessAsh(parseVaaText(KRAKATAU_TWO_BAND));
  assert.equal(a.status, "ash-observed");
  assert.equal(a.maxFlightLevel, 500);

  assert.deepEqual(
    a.bands.map((b) => [b.flightLevel, b.ceiling, b.drift]),
    [
      ["SFC/FL500", 500, "southwest at 10 kt"],
      ["SFC/FL150", 150, "southeast at 5 kt"],
    ],
    "bands must be highest-first with their own headings"
  );

  // The regression: FL500's height must never be paired with FL150's heading.
  assert.match(a.summary, /FL500 \(about 50,000 ft\) drifting southwest at 10 kt/);
  assert.match(a.summary, /FL150 \(about 15,000 ft\) drifting southeast at 5 kt/);
  assert.ok(!/FL500[^;]*southeast/.test(a.summary), `FL500 got the wrong heading: ${a.summary}`);
});

test("both bands are present in every frame, and export as separate features", () => {
  const a = parseVaaText(KRAKATAU_TWO_BAND);
  assert.deepEqual(availableFrames(a), ["OBS", "+6HR", "+12HR", "+18HR"]);
  for (const f of availableFrames(a)) {
    assert.equal(framePolygons(a, f).length, 2, `${f} lost a band`);
  }
  // 4 frames x 2 bands
  assert.equal(advisoryGeoJSON(a).features.length, 8);
});

test("estimated ash is reported as estimated, not observed", () => {
  const a = assessAsh(
    parseVaaText(`VOLCANO: DUKONO 268010
EST VA DTG: 06/1240Z
EST VA CLD: SFC/FL070 N0138 E12748 - N0228 E12732 - N0229 E12818 - N0138 E12748 MOV N 05KT
RMK: VA NOT IDENTIFIABLE ON CURRENT SATELLITE IMAGERY.`)
  );
  // "NOT IDENTIFIABLE" in the remark must not win over a real estimated cloud.
  assert.equal(a.status, "ash-estimated");
  assert.equal(a.maxFlightLevel, 70);
  assert.match(a.summary, /^Ash estimated to FL70 \(about 7,000 ft\) drifting north at 5 kt\.$/);
});
