// One place for the facts that both metadata and structured data need, so the
// page description, the OG card and the JSON-LD cannot disagree.

export const SITE_URL = "https://ash-map-blush.vercel.app";
export const SITE_NAME = "AshMap";
export const SITE_TAGLINE = "Monitor volcanic ash in Indonesia";
export const SITE_DESCRIPTION =
  "Monitor volcanic ash in Indonesia: live Darwin VAAC advisories plotted by flight level, with live wind, animated forecast drift, PVMBG volcano alert levels and the airports under the ash.";

export const AUTHOR = { name: "Victor Chandra", url: "https://github.com/mzmznasipadang" };
export const REPO_URL = "https://github.com/mzmznasipadang/ash-map";

/** The upstream sources, credited in the UI and declared to crawlers. */
export const DATA_SOURCES = [
  { name: "Darwin VAAC volcanic ash advisories", publisher: "Bureau of Meteorology (Australia)", url: "http://www.bom.gov.au/aviation/volcanic-ash/" },
  { name: "Volcano alert levels", publisher: "PVMBG, Badan Geologi (Kementerian ESDM)", url: "https://magma.esdm.go.id/" },
  { name: "Wind forecast", publisher: "Open-Meteo", url: "https://open-meteo.com/" },
  { name: "Aerodrome NOTAMs", publisher: "SkyLink API (FAA SWIM FNS)", url: "https://skylinkapi.com/" },
];

/**
 * Structured data. This matters more here than on a normal page: the app is a
 * client-rendered map, so the served HTML carries only the shell — a few
 * hundred characters. JSON-LD is read without executing any of it, which makes
 * it the most reliable description of what this thing is.
 */
export function jsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebApplication",
        "@id": `${SITE_URL}/#app`,
        name: SITE_NAME,
        alternateName: "AshMap — Volcanic Ash & Wind Map",
        url: SITE_URL,
        description: SITE_DESCRIPTION,
        applicationCategory: "https://schema.org/BrowserApplication",
        operatingSystem: "Any (web browser)",
        browserRequirements: "Requires JavaScript",
        inLanguage: ["en", "id"],
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        license: "https://opensource.org/licenses/MIT",
        author: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
        codeRepository: REPO_URL,
        featureList: [
          "Live Darwin VAAC volcanic ash advisory polygons by flight level",
          "Animated forecast drift between advisory frames",
          "Live wind field at selectable pressure levels",
          "Airports under the ash, with published NOTAM closures",
          "PVMBG volcano alert levels (Normal, Waspada, Siaga, Awas)",
          "GeoJSON export for GIS",
        ],
      },
      {
        "@type": "Dataset",
        "@id": `${SITE_URL}/#dataset`,
        name: "Darwin VAAC volcanic ash advisories, plotted",
        description:
          "ICAO volcanic ash advisories from the Darwin VAAC, parsed into GeoJSON polygons by flight-level band, with volcano alert levels and affected aerodromes.",
        url: SITE_URL,
        license: "https://opensource.org/licenses/MIT",
        isAccessibleForFree: true,
        keywords: ["volcanic ash", "VAAC", "aviation weather", "Indonesia", "flight level", "NOTAM", "GeoJSON"],
        spatialCoverage: {
          "@type": "Place",
          name: "Indonesia and the Darwin VAAC area of responsibility",
          geo: {
            "@type": "GeoShape",
            // The Indonesia bounding box the app filters on.
            box: "-11.5 94.5 6.5 141.5",
          },
        },
        creator: { "@type": "Person", name: AUTHOR.name, url: AUTHOR.url },
        distribution: [
          {
            "@type": "DataDownload",
            encodingFormat: "application/geo+json",
            contentUrl: `${SITE_URL}/api/darwin/geojson?area=indonesia`,
            name: "Current Indonesian ash polygons as GeoJSON",
          },
        ],
        isBasedOn: DATA_SOURCES.map((s) => ({ "@type": "CreativeWork", name: s.name, url: s.url, publisher: { "@type": "Organization", name: s.publisher } })),
      },
    ],
  };
}
