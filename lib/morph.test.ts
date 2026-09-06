// Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";

import type { LatLon } from "./coords.ts";
import { resampleRing, alignRing, lerpRing, buildTrack } from "./morph.ts";

const square: LatLon[] = [
  [0, 0],
  [0, 10],
  [10, 10],
  [10, 0],
  [0, 0], // VAA rings repeat the first vertex
];

test("resampleRing hits the requested count and stays on the outline", () => {
  const r = resampleRing(square, 16);
  assert.equal(r.length, 16);
  // Every sample must sit on an edge of the square (lat or lon pinned to 0/10).
  for (const [lat, lon] of r) {
    const onEdge =
      Math.abs(lat) < 1e-6 || Math.abs(lat - 10) < 1e-6 || Math.abs(lon) < 1e-6 || Math.abs(lon - 10) < 1e-6;
    assert.ok(onEdge, `sample off outline: ${lat},${lon}`);
  }
  // Even arc-length spacing: perimeter 40 over 16 samples = 2.5 apart.
  const step = Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]);
  assert.ok(Math.abs(step - 2.5) < 1e-6, `spacing was ${step}`);
});

test("resampleRing survives degenerate input", () => {
  assert.deepEqual(resampleRing([], 8), []);
  assert.equal(resampleRing([[5, 5]], 4).length, 4);
  // Zero-length ring (all vertices identical) must not divide by zero.
  const flat = resampleRing(
    [
      [1, 1],
      [1, 1],
      [1, 1],
    ],
    5
  );
  assert.equal(flat.length, 5);
  assert.ok(flat.every(([lat, lon]) => lat === 1 && lon === 1));
});

test("alignRing undoes a rotation instead of letting the shape twist", () => {
  const a = resampleRing(square, 12);
  const rotated = [...a.slice(5), ...a.slice(0, 5)];
  assert.deepEqual(alignRing(rotated, a), a);

  // Cost of the aligned pairing must beat the unaligned one.
  const cost = (x: LatLon[], y: LatLon[]) =>
    x.reduce((s, p, i) => s + Math.hypot(p[0] - y[i][0], p[1] - y[i][1]), 0);
  assert.ok(cost(alignRing(rotated, a), a) < cost(rotated, a));
});

test("lerpRing walks from a to b", () => {
  const a: LatLon[] = [[0, 0]];
  const b: LatLon[] = [[10, 20]];
  assert.deepEqual(lerpRing(a, b, 0), [[0, 0]]);
  assert.deepEqual(lerpRing(a, b, 1), [[10, 20]]);
  assert.deepEqual(lerpRing(a, b, 0.5), [[5, 10]]);
  // Mismatched lengths snap rather than throw.
  assert.deepEqual(lerpRing(a, [...b, [1, 1]], 0.1), a);
});

test("buildTrack equalizes vertex counts and holds shape through gaps", () => {
  const triangle: LatLon[] = [
    [0, 0],
    [0, 6],
    [6, 0],
  ];
  const track = buildTrack([square, null, triangle], 24);
  assert.equal(track.length, 3);
  assert.ok(track.every((r) => r.length === 24));
  // Frame 1 has no polygon, so it holds frame 0's shape exactly.
  assert.deepEqual(track[1], track[0]);
  // Frame 2 is a different shape, so it must not.
  assert.notDeepEqual(track[2], track[1]);
});

test("buildTrack with no rings at all yields empty frames, not a crash", () => {
  const track = buildTrack([null, null], 8);
  assert.equal(track.length, 2);
  assert.ok(track.every((r) => r.length === 0));
});
