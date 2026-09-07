// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { findAlert, normalizeVolcanoName, parseAlertLevels, rankAlerts } from "./pvmbg.ts";

// The real markup's shape: a level cell spanning its volcanoes by rowspan,
// then one row per volcano carrying a "Lihat laporan" link.
const HTML = `
<table>
  <tr>
    <td rowspan="2"><a class="tx-inverse">Level III (Siaga)</a><span>Peningkatan aktivitas</span></td>
    <td rowspan="2">2</td>
  </tr>
  <tr><td>Anak Krakatau - Lampung <a href="/v1/gunung-api/laporan/325211"><i class="fa"></i>Lihat laporan</a><br></td></tr>
  <tr><td>Semeru - Jawa Timur <a href="/v1/gunung-api/laporan/325212"><i class="fa"></i>Lihat laporan</a><br></td></tr>
  <tr>
    <td rowspan="2"><a class="tx-inverse">Level II (Waspada)</a><span>Peningkatan</span></td>
    <td rowspan="2">2</td>
  </tr>
  <tr><td>Ili Lewotolok - Nusa Tenggara Timur <a href="/v1/gunung-api/laporan/325213">Lihat laporan</a></td></tr>
  <tr><td>Dukono - Maluku Utara <a href="/v1/gunung-api/laporan/325214">Lihat laporan</a></td></tr>
</table>`;

test("the rowspan-grouped table yields one entry per volcano", () => {
  const alerts = parseAlertLevels(HTML);
  assert.equal(alerts.length, 4);
  assert.deepEqual(
    alerts.map((a) => [a.name, a.province, a.level, a.levelName]),
    [
      ["Anak Krakatau", "Lampung", 3, "Siaga"],
      ["Semeru", "Jawa Timur", 3, "Siaga"],
      ["Ili Lewotolok", "Nusa Tenggara Timur", 2, "Waspada"],
      ["Dukono", "Maluku Utara", 2, "Waspada"],
    ]
  );
});

test("the level cell itself is not mistaken for a volcano", () => {
  // It has no "Lihat laporan" link, which is what distinguishes the two.
  assert.ok(!parseAlertLevels(HTML).some((a) => /Level/i.test(a.name)));
});

test("normalization bridges PVMBG's names and the VAACs'", () => {
  // PVMBG writes the Indonesian name; a VAA writes the Smithsonian one, and
  // the page carries no shared identifier to join on.
  assert.equal(normalizeVolcanoName("Anak Krakatau"), "KRAKATAU");
  assert.equal(normalizeVolcanoName("Ili Lewotolok"), "LEWOTOLOK");
  assert.equal(normalizeVolcanoName("Gunung Merapi"), "MERAPI");
  assert.equal(normalizeVolcanoName("Lewotobi Laki-laki"), "LEWOTOBI LAKI LAKI");
});

test("findAlert matches the VAAC name to the observatory's", () => {
  const alerts = parseAlertLevels(HTML);
  assert.equal(findAlert("KRAKATAU", alerts)?.levelName, "Siaga");
  assert.equal(findAlert("LEWOTOLOK", alerts)?.levelName, "Waspada");
  assert.equal(findAlert("DUKONO", alerts)?.level, 2);
  assert.equal(findAlert("SEMERU", alerts)?.level, 3);
  assert.equal(findAlert("FUEGO", alerts), undefined, "a Guatemalan volcano is not on an Indonesian list");
  assert.equal(findAlert(undefined, alerts), undefined);
});

test("a shared prefix does not create a false match", () => {
  // LEWOTOBI and LEWOTOLOK share five letters; matching on prefix would pair
  // an erupting volcano with the wrong alert level.
  const alerts = parseAlertLevels(`<table>
    <tr><td rowspan="1"><a>Level IV (Awas)</a></td><td rowspan="1">1</td></tr>
    <tr><td>Lewotobi Laki-laki - NTT <a href="/laporan/1">Lihat laporan</a></td></tr>
  </table>`);
  assert.equal(findAlert("LEWOTOLOK", alerts), undefined, "matched the wrong volcano");
  assert.equal(findAlert("LEWOTOBI", alerts)?.level, 4);
});

test("rankAlerts leads with the highest level", () => {
  const ranked = rankAlerts(parseAlertLevels(HTML));
  assert.deepEqual(ranked.map((a) => a.level), [3, 3, 2, 2]);
});

test("markup that yields nothing is reported as nothing, not as safe", () => {
  // The route treats an empty parse as an error and keeps its last good data;
  // silently returning [] would read as "no volcano is under alert".
  assert.deepEqual(parseAlertLevels("<table><tr><td>nothing here</td></tr></table>"), []);
});
