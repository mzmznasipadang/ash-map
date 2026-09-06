import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";

// iOS home-screen icons must be raster; SVG favicons are ignored there. This
// renders the same mark to PNG at build time, so there is no second asset to
// keep in sync. The inset accounts for iOS rounding the corners.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <img
        src={logoDataUri({ inset: 18 })}
        width={size.width}
        height={size.height}
        alt="Volcanic Ash & Wind Map"
      />
    ),
    size
  );
}
