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

/**
 * Full square mark. `inset` shrinks the artwork (iOS crops icon corners).
 * `transparent` drops the navy plate, for placing the mark on another
 * background — the gap between the two peaks is cut in the background colour,
 * so it has to be redrawn in whatever sits behind.
 */
export function logoSvg({
  inset = 0,
  transparent = false,
  gap = BRAND_NAVY,
}: { inset?: number; transparent?: boolean; gap?: string } = {}): string {
  const scale = (500 - inset * 2) / 500;
  const plate = transparent ? "" : `<rect width="500" height="500" fill="${BRAND_NAVY}"/>`;
  const art = gap === BRAND_NAVY ? LOGO_PATHS : LOGO_PATHS.replaceAll(BRAND_NAVY, gap);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 500" width="500" height="500">
  ${plate}
  <g transform="translate(${inset} ${inset}) scale(${scale})">${art}</g>
</svg>`;
}

export function logoDataUri(opts?: { inset?: number; transparent?: boolean; gap?: string }): string {
  return `data:image/svg+xml;base64,${Buffer.from(logoSvg(opts)).toString("base64")}`;
}
