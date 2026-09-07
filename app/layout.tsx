import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND_NAVY } from "@/lib/logo";
import { AUTHOR, jsonLd, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

// globals.css maps Tailwind's font-sans / font-mono onto these variables, so
// they have to be defined here or `font-sans` resolves to nothing and the
// browser falls back to its default serif.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const TITLE = SITE_NAME;
const DESCRIPTION = SITE_DESCRIPTION;

export const metadata: Metadata = {
  // Required for OG/Twitter image URLs to resolve absolutely, which is what
  // link-preview crawlers need.
  metadataBase: new URL(SITE_URL),
  title: { default: `${TITLE} — ${SITE_TAGLINE}`, template: `%s · ${TITLE}` },
  // One route, so the canonical is simply the root — but stating it stops a
  // query string (?area=, a share link) being indexed as a separate page.
  alternates: { canonical: "/" },
  description: DESCRIPTION,
  applicationName: TITLE,
  authors: [AUTHOR],
  creator: AUTHOR.name,
  publisher: AUTHOR.name,
  keywords: [
    "volcanic ash",
    "VAAC",
    "Darwin VAAC",
    "volcanic ash advisory",
    "VAA",
    "aviation weather",
    "Indonesia volcanoes",
    "flight level",
    "ash cloud",
    "GeoJSON",
    "abu vulkanik",
    "gunung api Indonesia",
    "PVMBG",
    "tingkat aktivitas gunung api",
    "NOTAM bandara",
  ],
  category: "weather",
  openGraph: {
    type: "website",
    url: "/",
    siteName: TITLE,
    title: TITLE,
    description: DESCRIPTION,
    locale: "en",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
  },
  appleWebApp: { capable: true, title: TITLE, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: BRAND_NAVY },
  ],
  colorScheme: "light dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`h-full antialiased ${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="h-full overflow-hidden bg-background font-sans text-foreground">
        {/* Read without executing anything, which matters here: the served
            HTML is only the app shell, so this is the most reliable
            description a crawler gets. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd()) }}
        />
        <noscript>
          <div style={{ padding: "1.5rem", maxWidth: "42rem", fontSize: "0.95rem", lineHeight: 1.6 }}>
            <h1>{SITE_NAME}</h1>
            <p>{SITE_DESCRIPTION}</p>
            <p>
              The map needs JavaScript to draw advisory polygons and fetch live data. The current Indonesian ash
              polygons are also available as GeoJSON at{" "}
              <a href="/api/darwin/geojson?area=indonesia">/api/darwin/geojson?area=indonesia</a>, which needs none.
            </p>
            <p>
              Not an official aviation product. For flight planning use the advisories and NOTAMs issued by the
              responsible VAAC and your national AIS.
            </p>
          </div>
        </noscript>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
