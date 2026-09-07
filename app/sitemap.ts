import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The two locale routes, each declaring the other as an alternate. "/" is a
// redirect, so it is not listed: a sitemap should name the pages a crawler
// should index, not the hop that gets there.
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  const alternates = { languages: { en: `${SITE_URL}/en`, id: `${SITE_URL}/id` } };

  return (["en", "id"] as const).map((locale) => ({
    url: `${SITE_URL}/${locale}`,
    lastModified,
    changeFrequency: "hourly" as const,
    priority: 1,
    alternates,
  }));
}
