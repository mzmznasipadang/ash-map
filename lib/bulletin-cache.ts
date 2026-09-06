// Persistent cache for downloaded bulletins.
//
// The cost lever: a published bulletin never changes. `IDY41315.202608271445.txt`
// is byte-identical forever, so it only ever needs downloading once. A poll
// therefore costs one directory listing plus the handful of files that are
// genuinely new — not a re-download of the whole scan window.
//
// The disk layer is best-effort. It lives in the OS temp dir, so it survives a
// server restart but is not required; on a read-only or serverless filesystem
// every operation degrades to the in-memory map.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DIR = join(tmpdir(), "ash-map-bulletins");
const MAX_ENTRIES = 500;

const memory = new Map<string, string>();
let diskReady: boolean | null = null;

function ensureDir(): boolean {
  if (diskReady !== null) return diskReady;
  try {
    mkdirSync(DIR, { recursive: true });
    diskReady = true;
  } catch {
    diskReady = false;
  }
  return diskReady;
}

/**
 * Cache keys are product ids, sometimes suffixed with a modified time for
 * mutable slots. Never trust one as a path: flatten anything unusual and
 * reject traversal outright.
 */
function safeName(key: string): string | null {
  if (key.includes("..") || key.includes("/") || key.includes("\\")) return null;
  const flat = key.replace(/[^A-Za-z0-9._-]/g, "_");
  return flat.length > 0 && flat.length < 200 ? flat : null;
}

export function get(file: string): string | undefined {
  const hit = memory.get(file);
  if (hit !== undefined) return hit;

  const name = safeName(file);
  if (!name || !ensureDir()) return undefined;
  try {
    const text = readFileSync(join(DIR, name), "utf8");
    memory.set(file, text);
    return text;
  } catch {
    return undefined;
  }
}

export function set(file: string, text: string): void {
  if (memory.size >= MAX_ENTRIES) {
    // Oldest insertion first; Map preserves insertion order.
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(file, text);

  const name = safeName(file);
  if (!name || !ensureDir()) return;
  try {
    writeFileSync(join(DIR, name), text, "utf8");
  } catch {
    // memory-only is fine
  }
}

export function has(file: string): boolean {
  return get(file) !== undefined;
}

export function stats() {
  return { entries: memory.size, dir: diskReady ? DIR : null };
}
