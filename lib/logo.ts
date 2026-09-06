// The app mark, in one place. Both the generated PNG icons and any inline use
// read from here so they cannot drift apart.

export const BRAND_NAVY = "#012060";

/** The mark's artwork, without the background plate. */
export const LOGO_PATHS = `
  <path d="M180 212 254 318 98 318Z" fill="#fff" stroke="#fff" stroke-width="28" stroke-linejoin="round"/>
  <path d="M295 180 408 318 182 318Z" fill="none" stroke="${BRAND_NAVY}" stroke-width="34" stroke-linejoin="round"/>
  <path d="M295 180 408 318 182 318Z" fill="#fff" stroke="#fff" stroke-width="28" stroke-linejoin="round"/>
  <g fill="none" stroke="${BRAND_NAVY}" stroke-width="15" stroke-linecap="round">
    <path d="M232 250c14-11 28-11 42 0s28 11 42 0 28-11 42 0"/>
    <path d="M132 280c11-9 22-9 33 0s22 9 33 0"/>
  </g>
`;

/** Full square mark, background included. `inset` shrinks the artwork (iOS crops corners). */
export function logoSvg({ inset = 0 }: { inset?: number } = {}): string {
  const scale = (500 - inset * 2) / 500;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  <rect width="500" height="500" fill="${BRAND_NAVY}"/>
  <g transform="translate(${inset} ${inset}) scale(${scale})">${LOGO_PATHS}</g>
</svg>`;
}

export function logoDataUri(opts?: { inset?: number }): string {
  return `data:image/svg+xml;base64,${Buffer.from(logoSvg(opts)).toString("base64")}`;
}
