import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";

// Link previews (WhatsApp, Slack, iMessage, Twitter) read og:image. Without one
// they fall back to whatever icon they can scrape, which is why the preview
// showed a generic placeholder rather than the app.
export const alt = "AshMap — monitor volcanic ash in Indonesia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori has no bold in its default font, so `fontWeight` alone renders "Ash"
// and "Map" identically and the wordmark's weight contrast disappears. It also
// needs TrueType or WOFF — not the WOFF2 that next/font caches — hence the
// checked-in TTFs.
const FONT_DIR = join(process.cwd(), "app", "fonts");

async function fonts() {
  const [regular, bold, mono] = await Promise.all([
    readFile(join(FONT_DIR, "Geist-Regular.ttf")),
    readFile(join(FONT_DIR, "Geist-Bold.ttf")),
    readFile(join(FONT_DIR, "GeistMono-Regular.ttf")),
  ]);
  return [
    { name: "Geist", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Geist", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Geist Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 60,
          paddingLeft: 118,
          paddingRight: 96,
          // Navy through to the dark red of an ash column lit from below.
          backgroundImage:
            "linear-gradient(180deg, #062a6e 0%, #131a45 34%, #1b1230 52%, #350a05 82%, #250400 100%)",
          color: "#fff",
          fontFamily: "Geist",
        }}
      >
        <img src={logoDataUri({ transparent: true, gap: "#160f2c" })} width={300} height={300} alt="" />

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 18 }}>
            <div style={{ display: "flex", fontSize: 112, lineHeight: 1, letterSpacing: -3.5 }}>
              <span style={{ fontWeight: 400 }}>Ash</span>
              <span style={{ fontWeight: 700 }}>Map</span>
            </div>
            <div
              style={{
                display: "flex",
                fontFamily: "Geist Mono",
                fontSize: 26,
                color: "#c2c9db",
                paddingBottom: 14,
              }}
            >
              v1.0 alpha
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 37, marginTop: 14, color: "#eef1f7" }}>
            Monitor volcanic ash in Indonesia
          </div>
        </div>
      </div>
    ),
    { ...size, fonts: await fonts() }
  );
}
