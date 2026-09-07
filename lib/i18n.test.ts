// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  detectLocale,
  EN_MESSAGES,
  ID_MESSAGES,
  isLocale,
  translate,
  translateCount,
  type MessageKey,
} from "./i18n.ts";

test("both catalogues carry the same keys", () => {
  // A missing key falls back to English, which reads as untranslated rather
  // than broken — but it should not happen silently, so it is checked here.
  const enKeys = Object.keys(EN_MESSAGES).sort();
  const idKeys = Object.keys(ID_MESSAGES).sort();
  assert.deepEqual(idKeys, enKeys, "the catalogues have drifted apart");
});

test("no string is left untranslated by copy-paste", () => {
  // Some strings legitimately match: "Zulu (UTC)", "Indonesia", "NOTAM".
  const allowed = new Set<MessageKey>([
    "app.title", // a brand name, not a translatable string
    // Indonesian has no plural categories, so both forms are the same string.
    "feed.newCount.one",
    "feed.newCount.other",
    "feed.frames.one",
    "feed.frames.other",
    "airports.closures.one",
    "airports.closures.other",
    "time.zulu",
    "feed.areaIndonesia",
    "onboarding.notamTitle",
    "legend.title",
  ]);
  const identical = (Object.keys(EN_MESSAGES) as MessageKey[]).filter(
    (k) => !allowed.has(k) && EN_MESSAGES[k] === ID_MESSAGES[k]
  );
  assert.deepEqual(identical, [], `identical in both locales: ${identical.join(", ")}`);
});

test("placeholders are substituted", () => {
  assert.equal(translate("en", "airports.affectedNow", { count: 3 }), "3 affected now");
  assert.equal(translate("id", "airports.affectedNow", { count: 3 }), "3 terdampak sekarang");
  assert.equal(translate("en", "alerts.closed", { icao: "WIII" }), "WIII closed");
});

test("an unknown placeholder is left visible rather than blanked", () => {
  // A silently empty sentence is worse than an obvious gap.
  assert.match(translate("en", "airports.affectedNow", {}), /\{count\}/);
});

test("every placeholder in an English string exists in the Indonesian one", () => {
  const holders = (s: string) => (s.match(/\{(\w+)\}/g) ?? []).sort();
  for (const key of Object.keys(EN_MESSAGES) as MessageKey[]) {
    assert.deepEqual(
      holders(ID_MESSAGES[key]),
      holders(EN_MESSAGES[key]),
      `placeholders differ for ${key}`
    );
  }
});

test("detectLocale reads the browser's languages", () => {
  assert.equal(detectLocale(["id-ID", "en-US"]), "id");
  assert.equal(detectLocale(["en-GB"]), "en");
  assert.equal(detectLocale(["in"]), "id", "legacy code for Indonesian");
  assert.equal(detectLocale(["fr-FR", "id"]), "id", "skips locales we do not have");
  assert.equal(detectLocale([]), "en");
  assert.equal(detectLocale(["fr"]), "en");
});

test("isLocale guards stored values", () => {
  assert.equal(isLocale("id"), true);
  assert.equal(isLocale("en"), true);
  assert.equal(isLocale("jv"), false);
  assert.equal(isLocale(null), false);
});

test("counted strings pluralize in English and stay flat in Indonesian", () => {
  // "4 frame(s)" shipped once; this is what stops it happening again.
  assert.equal(translateCount("en", "feed.frames", 1), "1 frame");
  assert.equal(translateCount("en", "feed.frames", 4), "4 frames");
  assert.equal(translateCount("en", "airports.closures", 1), "1 closure");
  assert.equal(translateCount("en", "airports.closures", 3), "3 closures");
  assert.match(translateCount("en", "feed.newCount", 1), /^1 new bulletin since/);
  assert.match(translateCount("en", "feed.newCount", 2), /^2 new bulletins since/);

  // Indonesian has no plural categories; both forms are deliberately equal.
  assert.equal(translateCount("id", "feed.frames", 1), "1 bingkai");
  assert.equal(translateCount("id", "feed.frames", 4), "4 bingkai");
  assert.equal(translateCount("id", "airports.closures", 5), "5 penutupan");
});

test("no counted string still carries a (s) placeholder", () => {
  const sloppy = (Object.keys(EN_MESSAGES) as MessageKey[]).filter((k) => EN_MESSAGES[k].includes("(s)"));
  assert.deepEqual(sloppy, [], `lazy pluralization left in: ${sloppy.join(", ")}`);
});
