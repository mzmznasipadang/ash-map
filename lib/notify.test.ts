// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import { diffForNotification, type NotifiableState } from "./notify.ts";

const state = (files: string[], closed: string[] = []): NotifiableState => ({
  advisories: files.map((f) => ({ file: f, volcano: f.split(":")[0], summary: "Ash to FL100" })),
  closures: Object.fromEntries(closed.map((c) => [c, { reason: "AD CLSD DUE TO VOLCANIC ASH" }])),
});

test("the first load announces nothing", () => {
  // Everything is new on open; notifying about all of it is noise, not news.
  assert.deepEqual(diffForNotification(null, state(["KRAKATAU:1", "SEMERU:1"], ["WIII"])), []);
});

test("a new advisory file is announced once", () => {
  const out = diffForNotification(state(["KRAKATAU:1"]), state(["KRAKATAU:1", "SEMERU:1"]));
  assert.equal(out.length, 1);
  assert.match(out[0].title, /New advisory: SEMERU/);
  assert.equal(out[0].tag, "advisory:SEMERU");
});

test("a re-issued advisory for the same volcano reuses its tag", () => {
  // So an hourly re-advisory replaces its own notification rather than
  // stacking six of them.
  const a = diffForNotification(state(["KRAKATAU:1"]), state(["KRAKATAU:1", "KRAKATAU:2"]));
  assert.equal(a.length, 1);
  assert.equal(a[0].tag, "advisory:KRAKATAU");
});

test("nothing new means nothing announced", () => {
  assert.deepEqual(diffForNotification(state(["KRAKATAU:1"]), state(["KRAKATAU:1"])), []);
});

test("a newly closed aerodrome is announced, an already-closed one is not", () => {
  const first = diffForNotification(state(["KRAKATAU:1"]), state(["KRAKATAU:1"], ["WIII"]));
  assert.equal(first.length, 1);
  assert.match(first[0].title, /WIII closed/);
  assert.match(first[0].body, /VOLCANIC ASH/);

  const again = diffForNotification(state(["KRAKATAU:1"], ["WIII"]), state(["KRAKATAU:1"], ["WIII"]));
  assert.deepEqual(again, [], "already announced");
});

test("an advisory and a closure together produce two notifications", () => {
  const out = diffForNotification(state(["KRAKATAU:1"]), state(["KRAKATAU:1", "IBU:1"], ["WIII"]));
  assert.equal(out.length, 2);
  assert.deepEqual(out.map((o) => o.tag).sort(), ["advisory:IBU", "closure:WIII"]);
});
