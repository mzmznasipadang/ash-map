// Indonesian volcano alert levels, from PVMBG (Pusat Vulkanologi dan Mitigasi
// Bencana Geologi) — the observatory that actually decides a volcano's status.
//
// This is the third of three sources, and they answer different questions:
//   VAAC advisory  is there ash in the air, how high, drifting where
//   NOTAM          is the aerodrome restricted
//   PVMBG          what is the volcano itself doing
//
// Levels are I Normal, II Waspada (advisory), III Siaga (alert), IV Awas
// (warning). Level IV means evacuation is under way.
//
// Scraped, because the JSON API at /api/v1/magma-var requires credentials
// while the public page does not. The markup is a rowspan-grouped table: a
// level cell spans its volcanoes, and each following row names one.

export type AlertLevel = 1 | 2 | 3 | 4;

export type VolcanoAlert = {
  /** As PVMBG writes it, e.g. "Anak Krakatau". */
  name: string;
  province: string;
  level: AlertLevel;
  /** "Normal" | "Waspada" | "Siaga" | "Awas" */
  levelName: string;
};

const LEVEL_NAMES: Record<AlertLevel, string> = { 1: "Normal", 2: "Waspada", 3: "Siaga", 4: "Awas" };

const ROMAN: Record<string, AlertLevel> = { I: 1, II: 2, III: 3, IV: 4 };

const stripTags = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();

/**
 * PVMBG and the VAACs name the same volcano differently: "Anak Krakatau" vs
 * "KRAKATAU", "Ili Lewotolok" vs "LEWOTOLOK". There is no shared identifier on
 * this page — the links carry a report id, not the Smithsonian number — so the
 * join is by normalized name plus an explicit alias list for the cases
 * normalization cannot reach.
 */
export function normalizeVolcanoName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\b(GUNUNG|GN\.?|MOUNT|MT\.?|ANAK|ILI|BUKIT)\b/g, " ")
    .replace(/[^A-Z ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Cases normalization gets wrong in one direction or the other. */
const ALIASES: Record<string, string> = {
  "LEWOTOLO": "LEWOTOLOK",
  "LEWOTOBI LAKI LAKI": "LEWOTOBI",
  "SIRUNG": "SIRUNG",
  "KRAKATAU": "KRAKATAU",
};

function canonical(name: string): string {
  const n = normalizeVolcanoName(name);
  return ALIASES[n] ?? n;
}

export function parseAlertLevels(html: string): VolcanoAlert[] {
  const out: VolcanoAlert[] = [];
  let current: AlertLevel | null = null;

  // Row by row: a row may open a new level group, and names a volcano.
  for (const row of html.split(/<tr[\s>]/i).slice(1)) {
    const levelMatch = /Level\s+(IV|III|II|I)\s*\(/i.exec(row);
    if (levelMatch) {
      const lvl = ROMAN[levelMatch[1].toUpperCase()];
      if (lvl) current = lvl;
    }
    if (!current) continue;

    // The volcano cell is the one holding a "Lihat laporan" link.
    const cellMatch = /<td[^>]*>((?:(?!<\/td>)[\s\S])*?laporan[\s\S]*?)<\/td>/i.exec(row);
    if (!cellMatch) continue;

    // "Anak Krakatau - Lampung  Lihat laporan"
    const text = stripTags(cellMatch[1]).replace(/Lihat laporan.*$/i, "").trim();
    const [rawName, ...rest] = text.split(" - ");
    const name = rawName?.trim();
    if (!name) continue;

    out.push({
      name,
      province: rest.join(" - ").trim(),
      level: current,
      levelName: LEVEL_NAMES[current],
    });
  }

  return out;
}

/** The alert for a VAAC volcano name, or undefined when none matches. */
export function findAlert(vaacName: string | undefined, alerts: VolcanoAlert[]): VolcanoAlert | undefined {
  if (!vaacName) return undefined;
  const want = canonical(vaacName);
  if (!want) return undefined;
  return (
    alerts.find((a) => canonical(a.name) === want) ??
    // Last resort: one name contained in the other, longest first so
    // "LEWOTOBI" does not match "LEWOTOLOK" by a shared prefix.
    [...alerts]
      .sort((a, b) => canonical(b.name).length - canonical(a.name).length)
      .find((a) => {
        const have = canonical(a.name);
        return have.length >= 4 && (have.includes(want) || want.includes(have));
      })
  );
}

/** Highest level first, so the list leads with what matters. */
export function rankAlerts(alerts: VolcanoAlert[]): VolcanoAlert[] {
  return [...alerts].sort((a, b) => b.level - a.level || a.name.localeCompare(b.name));
}
