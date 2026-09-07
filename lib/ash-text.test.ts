// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { altitudeLabel, ashSentence, driftLabel } from "./ash-text.ts";
import { assessAsh } from "./eruption.ts";
import { translate, type Locale } from "./i18n.ts";
import { parseVaaText } from "./vaa.ts";

const T = (locale: Locale) => (key: Parameters<typeof translate>[1], params?: Record<string, string | number>) =>
  translate(locale, key, params);

const RING = "S0400 E08700 - S1200 E08100 - S1500 E09600 - S0400 E08700";

test("a compass point is translated, and an odd one survives", () => {
  assert.equal(driftLabel({ dir: "SW", knots: 10 }, T("en")), "southwest at 10 kt");
  assert.equal(driftLabel({ dir: "SW", knots: 10 }, T("id")), "barat daya dengan 10 kt");
  // Darwin occasionally writes three-letter points; better the raw token than
  // a blank.
  assert.equal(driftLabel({ dir: "NNE", knots: 5 }, T("en")), "NNE at 5 kt");
});

test("altitude carries feet and metres in both languages", () => {
  assert.equal(altitudeLabel(500, T("en")), "FL500 (50,000 ft / 15,200 m)");
  assert.equal(altitudeLabel(500, T("id")), "FL500 (50,000 kaki / 15,200 m)");
  assert.equal(altitudeLabel(0, T("en")), "an unreported height");
  assert.equal(altitudeLabel(0, T("id")), "ketinggian tidak dilaporkan");
});

test("the two-band sentence keeps each band's own drift, in both languages", () => {
  const a = assessAsh(
    parseVaaText(`VOLCANO: KRAKATAU 262000
OBS VA DTG: 06/1410Z
OBS VA CLD: SFC/FL150 ${RING} MOV SE 05KT SFC/FL500 ${RING} MOV SW 10KT`)
  );

  const en = ashSentence(a, T("en"));
  assert.match(en, /^Ash observed to FL500 \(50,000 ft \/ 15,200 m\) drifting southwest at 10 kt/);
  assert.match(en, /FL150 \(15,000 ft \/ 4,600 m\) drifting southeast at 5 kt/);

  const id = ashSentence(a, T("id"));
  assert.match(id, /^Abu teramati hingga FL500/);
  assert.match(id, /barat daya dengan 10 kt/);
  assert.match(id, /tenggara dengan 5 kt/);
  // The regression this guards: FL500's height must never take FL150's heading.
  assert.ok(!/FL500[^;]*tenggara/.test(id), `wrong heading on FL500: ${id}`);
});

test("estimated, forecast-only and ended each read differently", () => {
  const estimated = assessAsh(
    parseVaaText(`VOLCANO: DUKONO 268010
EST VA DTG: 06/1240Z
EST VA CLD: SFC/FL070 ${RING} MOV N 05KT`)
  );
  assert.match(ashSentence(estimated, T("en")), /^Ash estimated to FL70/);
  assert.match(ashSentence(estimated, T("id")), /^Abu diperkirakan hingga FL70/);

  const forecast = assessAsh(
    parseVaaText(`VOLCANO: X 000000
OBS VA CLD: NOT IDENTIFIABLE
FCST VA CLD +6 HR: 06/2010Z SFC/FL200 ${RING} MOV W 5KT`)
  );
  assert.match(ashSentence(forecast, T("en")), /^Forecast ash to FL200/);
  assert.match(ashSentence(forecast, T("id")), /^Prakiraan abu hingga FL200/);

  const ended = assessAsh(
    parseVaaText(`VOLCANO: X 000000
OBS VA CLD:
RMK: VA NO LONGER EXPECTED`)
  );
  assert.match(ashSentence(ended, T("id")), /tidak teridentifikasi/);

  const none = assessAsh(parseVaaText("VOLCANO: X 000000\nOBS VA CLD: NOT PROVIDED"));
  assert.match(ashSentence(none, T("id")), /tidak memuat poligon/);
});

test("the localized sentence matches the API's English summary", () => {
  // The API keeps a pre-rendered English string for its consumers; the two must
  // not drift apart in wording.
  const a = assessAsh(
    parseVaaText(`VOLCANO: SEMERU 263300
OBS VA DTG: 06/1200Z
OBS VA CLD: SFC/FL150 ${RING} MOV SE 05KT`)
  );
  assert.equal(ashSentence(a, T("en")), a.summary);
});
