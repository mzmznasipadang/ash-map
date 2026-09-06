// Run with: npm test
// Stdlib only (node:test + node:assert), no test framework.

import { test } from "node:test";
import assert from "node:assert/strict";

import { parseCoord } from "./coords.ts";
import { parseVaaText, parseCloudField, availableFrames, frameGeoJSON } from "./vaa.ts";
import { buildGrid, wrapLon } from "./grid.ts";

// The Darwin advisory from the app's sample: two stacked polygons per frame,
// each with its own flight level and MOV clause.
const KRAKATAU = `VOLCANIC ASH ADVISORY
DTG: 20260906/0630Z
VAAC: DARWIN
VOLCANO: KRAKATAU 262000
PSN: S0606 E10525
AREA: INDONESIA
SOURCE ELEV: 155M AMSL
ADVISORY NR: 2026/186
INFO SOURCE: HIMAWARI-9 CVGHM
ERUPTION DETAILS: VA TO FL500 MOV SW, VA TO FL120 MOV W
OBS VA DTG: 06/0610Z
OBS VA CLD: SFC/FL500 S0400 E08700 - S1200 E08100 - S1500 E09600 - S0900 E10200 - S0400 E08700 MOV SW 10KT SFC/FL120 S0500 E10000 - S0500 E11400 - S0800 E11400 - S0800 E10000 - S0500 E10000 MOV W 5KT
FCST VA CLD +6HR: 06/1210Z SFC/FL500 S0800 E07200 - S1900 E08400 - S2100 E09900 - S1000 E10300 - S0800 E07200 MOV SW 10KT SFC/FL120 S0500 E09600 - S0500 E11400 - S0800 E11400 - S0800 E09600 - S0500 E09600 MOV W 5KT
RMK: HIGH LEVEL VA TO FL500 IS NOW DETACHED FROM THE VOLCANO AND MOVING SW.
NXT ADVISORY: NO LATER THAN 20260906/0930Z`;

test("parseCoord handles all four hemispheres", () => {
  assert.deepEqual(parseCoord("N1428 W09052"), [14 + 28 / 60, -(90 + 52 / 60)]);
  assert.deepEqual(parseCoord("S0606 E10525"), [-(6 + 6 / 60), 105 + 25 / 60]);
  assert.equal(parseCoord("not a coordinate"), null);
});

test("parseVaaText reads the header fields", () => {
  const a = parseVaaText(KRAKATAU);
  assert.equal(a.vaac, "DARWIN");
  assert.equal(a.volcano, "KRAKATAU");
  assert.equal(a.volcanoNumber, "262000");
  assert.equal(a.advisoryNr, "2026/186");
  assert.equal(a.elevation, "155M AMSL"); // falls back to SOURCE ELEV
  assert.deepEqual(a.position, [-(6 + 6 / 60), 105 + 25 / 60]);
  // RMK must stop at NXT ADVISORY, not swallow it.
  assert.ok(a.remark?.endsWith("MOVING SW."));
  assert.equal(a.nextAdvisory, "NO LATER THAN 20260906/0930Z");
});

test("one cloud field splits into one polygon per flight-level band", () => {
  const a = parseVaaText(KRAKATAU);
  assert.equal(a.observation.dtg, "06/0610Z");
  assert.deepEqual(
    a.observation.polygons.map((p) => [p.flightLevel, p.vertices.length, p.movement]),
    [
      ["SFC/FL500", 5, "MOV SW 10KT"],
      ["SFC/FL120", 5, "MOV W 5KT"],
    ]
  );
  // The MOV clause must not leak into the vertex list.
  assert.equal(a.observation.polygons[0].vertices.length, 5);
});

test("forecast frames are keyed by hour and only the present ones appear", () => {
  const a = parseVaaText(KRAKATAU);
  assert.deepEqual(
    a.forecasts.map((f) => [f.hour, f.dtg, f.polygons.length]),
    [[6, "06/1210Z", 2]]
  );
  assert.deepEqual(availableFrames(a), ["OBS", "+6HR"]);
});

test("no-ash and empty fields yield no polygons", () => {
  assert.deepEqual(parseCloudField("NO VA EXP").polygons, []);
  assert.deepEqual(parseCloudField(undefined).polygons, []);
  // Under three usable vertices is not a polygon.
  assert.deepEqual(parseCloudField("SFC/FL140 N1440 W09123 - N1435 W09122").polygons, []);
});

test("frameGeoJSON emits lon,lat closed rings", () => {
  const a = parseVaaText(KRAKATAU);
  const fc = frameGeoJSON(a, "OBS");
  assert.equal(fc.features.length, 2);
  const f = fc.features[0];
  assert.equal(f.properties.flightLevel, "SFC/FL500");
  assert.equal(f.properties.frame, "OBS");
  // GeoJSON is [lon, lat] — the reverse of the parser's internal order.
  assert.deepEqual(f.geometry.coordinates[0][0], [87, -4]);
  assert.equal(frameGeoJSON(a, "+12HR").features.length, 0);
});

test("wind grid stays inside valid lat/lon even across the antimeridian", () => {
  // A view panned past the seam: Leaflet reports lons > 180.
  const { lats, lons } = buildGrid(20, -20, 200, 160, 64);
  assert.equal(lats.length, 64);
  assert.ok(lons.every((v) => v >= -180 && v <= 180), "lon out of range");
  assert.ok(lats.every((v) => v >= -90 && v <= 90), "lat out of range");
  // Must walk east across the seam (160 -> -160), not backwards round the globe.
  assert.equal(lons[0], 160);
  assert.equal(lons[7], -160);

  // Flipped/overscrolled bounds are still valid, not empty or NaN.
  const wide = buildGrid(120, -120, 400, -400, 64);
  assert.ok(wide.lats.every((v) => v >= -90 && v <= 90));
  assert.ok(wide.lons.every((v) => Number.isFinite(v) && v >= -180 && v <= 180));

  assert.equal(wrapLon(190), -170);
  assert.equal(wrapLon(-190), 170);
});

// A real Darwin VAAC bulletin, verbatim from ftp.bom.gov.au/anon/gen/vaac/.
// Darwin differs from Washington in ways that silently broke the parser:
// "+6 HR" carries a space, frames can be "NOT PROVIDED", and BOM appends a
// copyright footer after the bulletin's "=" terminator.
const DARWIN_BOM = `FVAU06 ADRM 271454
VA ADVISORY
DTG: 20260827/1454Z
VAAC: DARWIN
VOLCANO: AMBAE 257030
PSN: S1523 E16750
AREA: VANUATU
SOURCE ELEV: 1496M AMSL
ADVISORY NR: 2026/95
INFO SOURCE: VAAC WELLINGTON
ERUPTION DETAILS: UNKNOWN
OBS VA DTG: 27/1453Z
OBS VA CLD:
FCST VA CLD +6 HR: 27/2053Z NOT PROVIDED
FCST VA CLD +12 HR: 28/0253Z NOT PROVIDED
FCST VA CLD +18 HR: 28/0853Z NOT PROVIDED
RMK: PLEASE SEE FVPS01 NZKL 271413 ISSUED BY VAAC
        WELLINGTON. VA NO LONGER EXPECTED NEAR THE VAAC DARWIN AREA
        OF RESPONSIBILITY
NXT ADVISORY: NO FURTHER ADVISORIES=

Copyright Commonwealth of Australia 2011, Bureau of Meteorology (ABN 92 637 533
532).  Users of these web pages are deemed to have read and accepted the
conditions described in the Copyright, Disclaimer, and Privacy statements
(http://www.bom.gov.au/other/copyright.shtml).`;

test("Darwin's spaced +N HR labels are recognized", () => {
  const a = parseVaaText(DARWIN_BOM);
  assert.equal(a.vaac, "DARWIN");
  assert.equal(a.volcano, "AMBAE");
  assert.equal(a.advisoryNr, "2026/95");
  assert.deepEqual(
    a.forecasts.map((f) => f.hour),
    [6, 12, 18]
  );
  // The frame time survives even though the cloud field says NOT PROVIDED.
  assert.equal(a.forecasts[0].dtg, "27/2053Z");
  assert.deepEqual(a.forecasts[0].polygons, []);
  // Nothing to draw, so nothing lands on the timeline.
  assert.deepEqual(availableFrames(a), []);
});

test("distributor boilerplate after the bulletin terminator is dropped", () => {
  const a = parseVaaText(DARWIN_BOM);
  assert.equal(a.nextAdvisory, "NO FURTHER ADVISORIES");
  assert.ok(!a.nextAdvisory?.includes("Copyright"), "copyright footer leaked into a field");
  assert.ok(a.remark?.endsWith("OF RESPONSIBILITY"), `remark was: ${a.remark}`);
  assert.ok(!a.remark?.includes("Copyright"));
});

test("both label spellings parse to the same frames", () => {
  const spaced = parseVaaText("FCST VA CLD +6 HR: 27/2053Z SFC/FL200 S0400 E08700 - S1200 E08100 - S1500 E09600 - S0400 E08700");
  const tight = parseVaaText("FCST VA CLD +6HR: 27/2053Z SFC/FL200 S0400 E08700 - S1200 E08100 - S1500 E09600 - S0400 E08700");
  assert.equal(spaced.forecasts.length, 1);
  assert.deepEqual(
    spaced.forecasts.map((f) => [f.hour, f.dtg, f.polygons.length]),
    tight.forecasts.map((f) => [f.hour, f.dtg, f.polygons.length])
  );
  assert.equal(spaced.forecasts[0].polygons.length, 1);
});

// A real live Darwin slot (IDY41280.txt). Two traps:
//   1. "EST VA CLD" not "OBS VA CLD" — the cloud is modelled from the last
//      confirmed sighting because satellite cannot see it now.
//   2. "EST VA DTG" contains the substring "DTG", so a parser that only knows
//      the bare DTG label overwrites the advisory's issue time with this
//      field's contents, and never plots the cloud at all.
const DUKONO_ESTIMATED = `FVAU01 ADRM 061300
VA ADVISORY
DTG: 20260906/1300Z
VAAC: DARWIN
VOLCANO: DUKONO 268010
PSN: N0142 E12754
AREA: INDONESIA
SOURCE ELEV: 1229M AMSL
ADVISORY NR: 2026/718
INFO SOURCE: HIMAWARI-9
ERUPTION DETAILS: VA TO FL070 LAST OBS AT 06/0250Z MOV NE
EST VA DTG: 06/1240Z
EST VA CLD: SFC/FL070 N0138 E12748 - N0228 E12732 - N0229
        E12818 - N0138 E12800 MOV N 05KT
FCST VA CLD +6 HR: 06/1840Z SFC/FL070 N0138 E12748 - N0228
        E12732 - N0229 E12818 - N0138 E12800
FCST VA CLD +12 HR: 07/0040Z SFC/FL070 N0138 E12748 - N0228
        E12732 - N0229 E12818 - N0138 E12800
RMK: VA NOT IDENTIFIABLE ON CURRENT SATELLITE IMAGERY. MET
        CLD OBSC AREA.
NXT ADVISORY: NO LATER THAN 20260906/1900Z=`;

test("the advisory DTG is not clobbered by EST VA DTG", () => {
  const a = parseVaaText(DUKONO_ESTIMATED);
  // The regression: this used to become "06/1240Z EST VA CLD: SFC/FL070 ...".
  assert.equal(a.dtg, "20260906/1300Z");
  assert.equal(a.volcano, "DUKONO");
  assert.equal(a.advisoryNr, "2026/718");
});

test("an estimated cloud is parsed and flagged as estimated", () => {
  const a = parseVaaText(DUKONO_ESTIMATED);
  assert.equal(a.observation.estimated, true, "estimated flag not set");
  assert.equal(a.observation.dtg, "06/1240Z");
  assert.equal(a.observation.polygons.length, 1, "the estimated cloud was dropped");
  assert.equal(a.observation.polygons[0].flightLevel, "SFC/FL070");
  assert.equal(a.observation.polygons[0].movement, "MOV N 05KT");
  // It occupies the OBS slot on the timeline, so the current cloud is drawn.
  assert.deepEqual(availableFrames(a), ["OBS", "+6HR", "+12HR"]);
});

test("an observed cloud is not flagged as estimated", () => {
  const a = parseVaaText(`VOLCANO: SEMERU 263300
OBS VA DTG: 06/1200Z
OBS VA CLD: SFC/FL150 S0805 E11250 - S0801 E11254 - S0805 E11321 - S0805 E11250 MOV SE 05KT`);
  assert.equal(a.observation.estimated, undefined);
  assert.equal(a.observation.dtg, "06/1200Z");
  assert.equal(a.observation.polygons.length, 1);
});
