import type { MetadataRoute } from "next";
import { BRAND_NAVY } from "@/lib/logo";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/site";

// Installable on a phone, which is where "monitor volcanic ash" actually gets
// read. No offline caching: every view depends on a live upstream, and a stale
// ash map is worse than no map.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    orientation: "any",
    background_color: BRAND_NAVY,
    theme_color: BRAND_NAVY,
    categories: ["weather", "travel", "utilities"],
    icons: [
      { src: "/icon.svg", type: "image/svg+xml", sizes: "any", purpose: "any" },
      { src: "/apple-icon", type: "image/png", sizes: "180x180", purpose: "maskable" },
    ],
  };
}
