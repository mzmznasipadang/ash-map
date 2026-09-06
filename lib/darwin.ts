// Darwin VAAC feed, from the Bureau of Meteorology's anonymous FTP.
//
// BOM publishes Darwin's VAA text bulletins at
//   ftp://ftp.bom.gov.au/anon/gen/vaac/<year>/IDY41315.<YYYYMMDDHHMM>.txt
// with no authentication. There is no HTTPS path for the anon tree (the web
// URLs 404), and the aviation web page renders its advisory list client-side,
// so FTP is the machine-readable route.
//
// IDY41315 is the text advisory; IDY65315 is the same product as a PNG chart.

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

/**
 * Downloads the newest `limit` Darwin text bulletins. Kept separate from the
 * parsing above so the selection logic stays unit-testable without a network.
 */
export async function fetchLatestBulletins(limit = 5, product = DARWIN_TEXT_PRODUCT): Promise<FetchedBulletin[]> {
  const { Client } = await import("basic-ftp");
  const { Writable } = await import("node:stream");
  const client = new Client(20_000);
  const out: FetchedBulletin[] = [];

  try {
    await client.access({ host: FTP_HOST, user: "anonymous", password: "anonymous", secure: false });

    for (const year of yearDirs()) {
      if (out.length >= limit) break;

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

      for (const f of pickLatest(names, limit - out.length, product)) {
        const chunks: Buffer[] = [];
        const sink = new Writable({
          write(chunk, _enc, cb) {
            chunks.push(Buffer.from(chunk));
            cb();
          },
        });
        await client.downloadTo(sink, `${BASE}/${year}/${f.name}`);
        out.push({ file: f.name, issued: f.issued.toISOString(), text: Buffer.concat(chunks).toString("utf8") });
      }
    }
  } finally {
    client.close();
  }

  return out;
}
