import type { NextConfig } from "next";

// Vercel already terminates TLS and answers http:// with a redirect, but that
// only covers the request it sees. HSTS is what removes the plaintext hop
// entirely: after one https visit the browser refuses to speak http to this
// host at all, so there is no request left for a network to intercept.
//
// ponytail: no Content-Security-Policy. Leaflet injects styles, next-themes
// runs an inline script before paint, and the JSON-LD block is inline too — a
// CSP here would need nonces threaded through all three. Add it when the app
// stops being a single-origin map with no user content.
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Nothing here is meant to be framed, and not being frameable removes
  // clickjacking without any further thought.
  { key: "X-Frame-Options", value: "DENY" },
  // The app asks for notification permission and nothing else. Denying the
  // rest means a compromised dependency cannot quietly ask either.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
