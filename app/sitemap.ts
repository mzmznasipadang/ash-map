import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// One page. A sitemap for a single-route app is nearly ceremonial, but it is
// what declares the canonical host and gives the crawler a change frequency
// worth honouring — the underlying advisories change hourly.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "hourly",
      priority: 1,
    },
  ];
}
