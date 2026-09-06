import { ImageResponse } from "next/og";
import { BRAND_NAVY, logoDataUri } from "@/lib/logo";

// Link previews (WhatsApp, Slack, iMessage, Twitter) read og:image. Without one
// they fall back to whatever icon they can scrape, which is why the preview
// showed a generic placeholder rather than the app.
export const alt = "Volcanic Ash & Wind Map — live ICAO volcanic ash advisories plotted by flight level";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: BRAND_NAVY,
          padding: 72,
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <img src={logoDataUri()} width={104} height={104} alt="" style={{ borderRadius: 20 }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 62, fontWeight: 700, letterSpacing: -1.5 }}>Volcanic Ash &amp; Wind Map</div>
            <div style={{ fontSize: 27, color: "#9fb4d8", marginTop: 6 }}>
              Real ICAO advisories, live wind, animated forecast drift
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          {[
            ["#4aa3e8", "≤ FL150"],
            ["#f5a623", "FL151–300"],
            ["#e0433d", "FL301–450"],
            ["#9b30d9", "> FL450"],
          ].map(([color, label]) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: 999,
                padding: "12px 22px",
                fontSize: 26,
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: 6, background: color, display: "flex" }} />
              {label}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 24 }}>
          <div style={{ color: "#9fb4d8", display: "flex" }}>
            Darwin VAAC via Bureau of Meteorology · Wind by Open-Meteo
          </div>
          <div style={{ color: "#dfe8f6", display: "flex" }}>ash-map-blush.vercel.app</div>
        </div>
      </div>
    ),
    size
  );
}
