import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

// The API routes are for this app and for GIS clients, not for crawlers: they
// open FTP sessions and spend a metered NOTAM quota. Disallowing them keeps a
// crawl from costing requests, while the GeoJSON export stays reachable to
// anyone who follows the link from the page.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/darwin", "/api/notams", "/api/pvmbg", "/api/wind", "/api/advisory"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
