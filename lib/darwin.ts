// Darwin VAAC feed, from the Bureau of Meteorology's anonymous FTP.
//
// BOM publishes Darwin's VAA text bulletins at
//   ftp://ftp.bom.gov.au/anon/gen/vaac/<year>/IDY41315.<YYYYMMDDHHMM>.txt
// with no authentication. There is no HTTPS path for the anon tree (the web
// URLs 404), and the aviation web page renders its advisory list client-side,
// so FTP is the machine-readable route.
//
// IDY41315 is the text advisory; IDY65315 is the same product as a PNG chart.

import * as cache from "./bulletin-cache.ts";

export const DARWIN_TEXT_PRODUCT = "IDY41315";

export type ProductFile = {
  name: string;
  /** Issue time encoded in the filename, as UTC. */
  issued: Date;
};

/**
 * Reads the issue time out of a BOM product filename. Returns null for
 * anything that isn't a text bulletin for this product, which is most of the
 * directory (it also holds thousands of PNG charts).
 */
export function parseProductFile(name: string, product = DARWIN_TEXT_PRODUCT): ProductFile | null {
  const m = new RegExp(`^${product}\\.(\\d{4})(\\d{2})(\\d{2})(\\d{2})(\\d{2})\\.txt$`).exec(name);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number) as unknown as number[];
  const issued = new Date(Date.UTC(y, mo - 1, d, h, mi));
  return Number.isNaN(issued.getTime()) ? null : { name, issued };
}

/** Newest bulletins first. The timestamp is in the filename, so no stat calls. */
export function pickLatest(names: string[], limit: number, product = DARWIN_TEXT_PRODUCT): ProductFile[] {
  return names
    .map((n) => parseProductFile(n, product))
    .filter((f): f is ProductFile => f !== null)
    .sort((a, b) => b.issued.getTime() - a.issued.getTime())
    .slice(0, Math.max(0, limit));
}

/**
 * Directories to search, newest year first. Around New Year the current year's
 * directory can be empty or thin, so the previous one is a necessary fallback.
 */
export function yearDirs(now = new Date()): string[] {
  const y = now.getUTCFullYear();
  return [`${y}`, `${y - 1}`];
}

const FTP_HOST = "ftp.bom.gov.au";
const BASE = "/anon/gen/vaac";

export type FetchedBulletin = { file: string; issued: string; text: string };

export type FetchStats = { scanned: number; downloaded: number; fromCache: number };

/**
 * Downloads the newest Darwin text bulletins, newest first.
 *
 * `keep` decides how many to return and can stop the scan early: most bulletins
 * carry no plotted ash (a stand-down, or a hand-off to another VAAC), so a
 * caller that wants advisories with actual polygons has to read past them.
 * Without that, the feed shows five "no cloud" entries while a live eruption
 * sits ten files further down.
 */
export async function fetchLatestBulletins(
  limit = 5,
  product = DARWIN_TEXT_PRODUCT,
  opts: { scanDepth?: number; keep?: (b: FetchedBulletin) => boolean } = {}
): Promise<FetchedBulletin[]> {
  const scanDepth = Math.max(limit, opts.scanDepth ?? limit);
  const keep = opts.keep ?? (() => true);
  const { Client } = await import("basic-ftp");
  const { Writable } = await import("node:stream");
  const client = new Client(20_000);
  const out: FetchedBulletin[] = [];
  let scanned = 0;
  let downloaded = 0;

  try {
    await client.access({ host: FTP_HOST, user: "anonymous", password: "anonymous", secure: false });

    for (const year of yearDirs()) {
      if (out.length >= limit || scanned >= scanDepth) break;

      // A year directory holds ~8000 entries, mostly PNG charts, and listing it
      // whole takes ~10s. BOM's server supports a glob in LIST, which returns
      // only the text bulletins in ~1s. Fall back to the full listing if a
      // server ever rejects the pattern.
      let names: string[] = [];
      for (const path of [`${BASE}/${year}/${product}.*.txt`, `${BASE}/${year}`]) {
        try {
          names = (await client.list(path)).map((e) => e.name);
        } catch {
          continue;
        }
        if (names.length) break;
      }
      if (!names.length) continue;

      for (const f of pickLatest(names, scanDepth - scanned, product)) {
        if (out.length >= limit) break;
        scanned++;

        // A published bulletin is immutable, so a cache hit skips the transfer
        // entirely. In steady state only the newest file or two are misses.
        let text = cache.get(f.name);
        if (text === undefined) {
          const chunks: Buffer[] = [];
          const sink = new Writable({
            write(chunk, _enc, cb) {
              chunks.push(Buffer.from(chunk));
              cb();
            },
          });
          await client.downloadTo(sink, `${BASE}/${year}/${f.name}`);
          text = Buffer.concat(chunks).toString("utf8");
          cache.set(f.name, text);
          downloaded++;
        }

        const bulletin = { file: f.name, issued: f.issued.toISOString(), text };
        if (keep(bulletin)) out.push(bulletin);
      }
    }
  } finally {
    client.close();
  }

  lastFetchStats = { scanned, downloaded, fromCache: scanned - downloaded };
  return out;
}

let lastFetchStats: FetchStats = { scanned: 0, downloaded: 0, fromCache: 0 };

/** Transfer accounting for the most recent fetch, for the cost readout. */
export function getLastFetchStats(): FetchStats {
  return lastFetchStats;
}

// ---------------------------------------------------------------------------
// Live products
// ---------------------------------------------------------------------------
//
// The vaac/<year>/ archive above lags real time by days, and it carries one
// product id per file. The LIVE products are in /anon/gen/fwo, one slot per
// volcano currently under advisory, each holding the latest bulletin for that
// volcano under a fixed name:
//
//   IDY41280.txt  DUKONO
//   IDY41285.txt  LEWOTOLOK
//   IDY41290.txt  IBU
//   IDY41295.txt  SEMERU
//   IDY41305.txt  KRAKATAU
//
// The slot-to-volcano mapping is not fixed; it is whatever is active. So the
// only correct approach is to read every slot and see what is in it.
//
// Unlike the archive, these files are MUTABLE: same name, new content. The
// cache key therefore carries the server's modified time, so an unchanged slot
// still costs nothing while a re-issued advisory is picked up immediately.

const LIVE_DIR = "/anon/gen/fwo";

/** Darwin aviation text products. Space-weather bulletins share the prefix. */
const LIVE_SLOT_RE = /^IDY41\d{3}\.txt$/;

/** Cheap check that a slot holds a volcanic ash advisory and not another product. */
export function isVaaBulletin(text: string): boolean {
  return /^\s*(?:\S+\s+\S+\s+\d+\s*\n)?\s*(?:VOLCANIC ASH ADVISORY|VA ADVISORY)/im.test(text);
}

export async function fetchLiveBulletins(): Promise<FetchedBulletin[]> {
  const { Client } = await import("basic-ftp");
  const { Writable } = await import("node:stream");
  const client = new Client(20_000);
  const out: FetchedBulletin[] = [];
  let scanned = 0;
  let downloaded = 0;

  try {
    await client.access({ host: FTP_HOST, user: "anonymous", password: "anonymous", secure: false });

    // /anon/gen/fwo holds ~5000 products; listing it whole is most of this
    // request's latency. The server supports a glob in LIST, so ask only for
    // the Darwin text slots and fall back if a server ever rejects the pattern.
    let entries = [] as Awaited<ReturnType<typeof client.list>>;
    for (const path of [`${LIVE_DIR}/IDY41*.txt`, LIVE_DIR]) {
      try {
        entries = (await client.list(path)).filter((e) => LIVE_SLOT_RE.test(e.name));
      } catch {
        continue;
      }
      if (entries.length) break;
    }

    for (const entry of entries) {
      scanned++;
      // Mutable file: the modified time is part of the cache identity.
      const stamp = entry.rawModifiedAt || entry.modifiedAt?.toISOString() || "";
      const key = `live:${entry.name}@${stamp}`;

      let text = cache.get(key);
      if (text === undefined) {
        const chunks: Buffer[] = [];
        const sink = new Writable({
          write(chunk, _enc, cb) {
            chunks.push(Buffer.from(chunk));
            cb();
          },
        });
        await client.downloadTo(sink, `${LIVE_DIR}/${entry.name}`);
        text = Buffer.concat(chunks).toString("utf8");
        cache.set(key, text);
        downloaded++;
      }

      if (!isVaaBulletin(text)) continue;
      out.push({
        file: entry.name,
        issued: entry.modifiedAt?.toISOString() ?? new Date().toISOString(),
        text,
      });
    }
  } finally {
    client.close();
  }

  lastFetchStats = { scanned, downloaded, fromCache: scanned - downloaded };
  return out;
}
