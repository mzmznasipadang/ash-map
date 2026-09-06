import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BRAND_NAVY } from "@/lib/logo";

// globals.css maps Tailwind's font-sans / font-mono onto these variables, so
// they have to be defined here or `font-sans` resolves to nothing and the
// browser falls back to its default serif.
const sans = Geist({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

const TITLE = "Volcanic Ash & Wind Map";
const DESCRIPTION =
  "Live ICAO volcanic ash advisories from the Darwin VAAC, plotted by flight level with live wind and animated forecast drift.";

export const metadata: Metadata = {
  // Required for OG/Twitter image URLs to resolve absolutely, which is what
  // link-preview crawlers need.
  metadataBase: new URL("https://ash-map-blush.vercel.app"),
  title: { default: TITLE, template: `%s · ${TITLE}` },
  description: DESCRIPTION,
  applicationName: TITLE,
  authors: [{ name: "Victor Chandra", url: "https://github.com/mzmznasipadang" }],
  creator: "Victor Chandra",
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
  robots: { index: true, follow: true },
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
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
