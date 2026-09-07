// Persistent cache for downloaded bulletins.
//
// The cost lever: a published bulletin never changes. `IDY41315.202608271445.txt`
// is byte-identical forever, so it only ever needs downloading once. A poll
// therefore costs one directory listing plus the handful of files that are
// genuinely new — not a re-download of the whole scan window.
//
// Three layers, each a fallback for the one before:
//
//   memory   per-process, always available, dies with the process
//   Redis    shared and durable, when the env vars are present
//   disk     the OS temp dir, best-effort, survives a restart on a real server
//
// The Redis layer is what makes this work on serverless, where every cold
// start begins with an empty process and an empty filesystem. Without it a
// cold request re-downloads the live slots — cheap (8 small files, ~4s) but
// wasteful, and it is the difference between a warm response and a slow one.
//
// Note: Vercel KV is deprecated; its stores moved to Upstash Redis, which is
// what the Vercel Marketplace now provisions. Both naming schemes are accepted
// because the legacy integration injected KV_REST_API_* and the current one
// injects UPSTASH_REDIS_REST_*.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const DIR = join(tmpdir(), "ash-map-bulletins");
const MAX_ENTRIES = 500;
// Long enough to be effectively permanent for immutable files, short enough
// that a mutable live slot's keyed entries do not accumulate for ever.
const TTL_SECONDS = 60 * 60 * 24 * 30;

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

// --- Redis, when configured -------------------------------------------------

type RedisLike = { get: (k: string) => Promise<unknown>; set: (k: string, v: string, o?: object) => Promise<unknown> };

let redis: RedisLike | null | undefined;

function redisConfig(): { url: string; token: string } | null {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

async function getRedis(): Promise<RedisLike | null> {
  if (redis !== undefined) return redis;
  const config = redisConfig();
  if (!config) {
    redis = null;
    return null;
  }
  try {
    const { Redis } = await import("@upstash/redis");
    redis = new Redis(config) as unknown as RedisLike;
  } catch {
    // Package missing or unusable: the other two layers still work.
    redis = null;
  }
  return redis;
}

export function isDurable(): boolean {
  return redisConfig() !== null;
}

// --- Public interface -------------------------------------------------------

export async function get(file: string): Promise<string | undefined> {
  const hit = memory.get(file);
  if (hit !== undefined) return hit;

  const client = await getRedis();
  if (client) {
    try {
      const value = await client.get(`bulletin:${file}`);
      if (typeof value === "string") {
        remember(file, value);
        return value;
      }
    } catch {
      // Fall through to disk.
    }
  }

  const name = safeName(file);
  if (!name || !ensureDir()) return undefined;
  try {
    const text = readFileSync(join(DIR, name), "utf8");
    remember(file, text);
    return text;
  } catch {
    return undefined;
  }
}

function remember(file: string, text: string): void {
  if (memory.size >= MAX_ENTRIES) {
    // Oldest insertion first; Map preserves insertion order.
    const oldest = memory.keys().next().value;
    if (oldest !== undefined) memory.delete(oldest);
  }
  memory.set(file, text);
}

export async function set(file: string, text: string): Promise<void> {
  remember(file, text);

  const client = await getRedis();
  if (client) {
    try {
      await client.set(`bulletin:${file}`, text, { ex: TTL_SECONDS });
    } catch {
      // Not fatal; the write is still in memory and attempted on disk.
    }
  }

  const name = safeName(file);
  if (!name || !ensureDir()) return;
  try {
    writeFileSync(join(DIR, name), text, "utf8");
  } catch {
    // memory-only is fine
  }
}

export async function has(file: string): Promise<boolean> {
  return (await get(file)) !== undefined;
}

export function stats() {
  return { entries: memory.size, dir: diskReady ? DIR : null, durable: isDurable() };
}
