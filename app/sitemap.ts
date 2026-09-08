import type { MetadataRoute } from "next";
import { LEGAL_KINDS, LEGAL_UPDATED } from "@/lib/legal";
import { LOCALES } from "@/lib/i18n";
import { SITE_URL } from "@/lib/site";

// The indexable pages, each declaring the other language as an alternate. "/"
// is a redirect, so it is not listed: a sitemap should name the pages a crawler
// should index, not the hop that gets there.
//
// The legal pages are here for a reason beyond completeness — they are the only
// server-rendered prose on the site, so they are the only URLs a crawler can
// read without executing the app.
export default function sitemap(): MetadataRoute.Sitemap {
  const codes = LOCALES.map((l) => l.code);
  const alternatesFor = (path: string) =>
    ({ languages: Object.fromEntries(codes.map((c) => [c, `${SITE_URL}/${c}${path}`])) });

  const map = codes.map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified: new Date(),
    changeFrequency: "hourly" as const,
    priority: 1,
    alternates: alternatesFor(""),
  }));

  // Dated from the copy itself rather than "now": these change when the terms
  // change, and claiming otherwise trains a crawler to ignore the field.
  const legal = codes.flatMap((locale) =>
    LEGAL_KINDS.map((kind) => ({
      url: `${SITE_URL}/${locale}/${kind}`,
      lastModified: new Date(LEGAL_UPDATED),
      changeFrequency: "yearly" as const,
      priority: 0.3,
      alternates: alternatesFor(`/${kind}`),
    }))
  );

  return [...map, ...legal];
}
