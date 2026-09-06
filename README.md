# Volcanic Ash & Wind Map

A Next.js + Leaflet prototype that plots **real** Volcanic Ash Advisory (VAA)
polygons and **live** wind vectors on a map.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. Needs normal internet access for the live NOAA and
Open-Meteo fetches. No API keys are required anywhere in this app.

```bash
npm test        # parser + morph + wind-grid checks (node:test, no framework)
```

## What it does

1. **Map** — Leaflet via `react-leaflet`, on Esri's keyless light/dark gray
   canvas. (CARTO's keyless tiles are now watermarked "API KEY REQUIRED"
   server-side, baked into the PNG, so they are not usable unauthenticated.)
   The basemap follows the light/dark theme.
2. **Ash polygons, like the Darwin VAAC chart in your screenshot** — every
   VAAC (Darwin, Washington, Tokyo, London, Toulouse, ...) issues advisories
   in the same standardized ICAO text format:

   ```
   DTG: 20260906/0630Z
   VAAC: DARWIN
   VOLCANO: KRAKATAU 262000
   PSN: S0606 E10525
   OBS VA CLD: SFC/FL500 S0400 E08700 - S1200 E08100 - ... MOV SW 10KT
   FCST VA CLD +6HR: 06/1210Z SFC/FL500 ...
   ```

   `lib/vaa.ts` parses this into normalized JSON + GeoJSON polygons. It's one
   parser for every VAAC, since the format is the same everywhere. Click
   "Krakatau sample" in the sidebar to see the reference example rendered.

3. **Animated forecast drift** — the transport bar under the map plays the
   advisory forward: the OBS cloud tweens into +6HR into +12HR, so the drift
   is something you watch rather than something you infer from toggling
   frames. A GSAP timeline drives one scalar, and each tick pushes
   interpolated rings straight into the Leaflet layers (no React re-render
   per frame). Scrub or step with the slider.

   Frames are hand-drawn independently, so they rarely share a vertex count
   and vertex 0 of one frame is not the same corner as vertex 0 of the next —
   `lib/morph.ts` resamples each pair to a common count by arc length and
   rotationally aligns them first, otherwise the cloud turns inside out
   mid-tween. Polygons are matched across frames by flight level, so the
   FL500 cloud morphs into the next FL500 cloud.

4. **Darwin VAAC feed** — `/api/darwin` polls BOM's anonymous FTP
   (`ftp://ftp.bom.gov.au/anon/gen/vaac/<year>/IDY41315.<YYYYMMDDHHMM>.txt`)
   for the newest Darwin text bulletins and returns them parsed. No auth, no
   key. There is no HTTPS path for that tree, and the BOM aviation web page
   renders its list client-side, so FTP is the machine-readable route.

   Responses are cached 5 minutes server-side, concurrent requests collapse
   onto one FTP session, and a failed fetch serves the last good data rather
   than an error. The directory holds ~8000 entries per year, mostly PNG
   charts, so the listing uses a server-side glob (~1s instead of ~10s).

   *Deployment note*: this opens an outbound FTP connection. Fine on a server
   or container; many serverless platforms block non-HTTP egress.

5. **Raw bulletin view** — the exact text as issued, with a copy button. The
   parsed view is a convenience; the bulletin is the source of truth.

6. **Wind projection** — `/api/wind` queries
   [Open-Meteo](https://open-meteo.com) (free, no API key) for wind
   speed/direction at a chosen pressure level across a grid covering the
   current map view, and draws it as rotated arrows colored by speed.
   Longitudes are normalized before the upstream call — Leaflet reports
   out-of-range bounds past the antimeridian, which Open-Meteo rejects.

7. **UI** — shadcn/ui/Tailwind sidebar with collapsible sections, an advisory
   detail card, and a legend; a slide-over panel below `lg`; light/dark theme
   with a toggle in the header.

## Getting real, current advisories

- **"Fetch advisory"** fetches and parses a real advisory page server-side.
  Washington VAAC (NOAA/OSPO) publishes these as plain, unauthenticated
  HTML — grab a current link from
  https://www.ospo.noaa.gov/products/atmosphere/vaac/messages.html and paste
  it in. The one sample URL bundled in the app *will* go stale (VAACs rotate
  through active volcanoes constantly) — always get a fresh link from that
  index page.
- **Darwin VAAC feed** needs no copy-paste at all: BOM publishes Darwin's
  bulletins openly over FTP and the app polls them directly. Darwin issues
  these only while a volcano in its area of responsibility is active, so an
  empty feed is normal, not a fault.
- **"Paste raw VAA text"** parses any raw VAA text you give it — the reliable
  path for Tokyo/London/Toulouse. Copy the advisory text from the VAAC's own
  page, a PDF, or an email alert, and paste it in.
- **Format differences are real.** Darwin writes `FCST VA CLD +6 HR:` with a
  space where Washington writes `+6HR:`, and BOM appends a copyright block
  after the bulletin's `=` terminator. Both are handled; both are covered by
  tests built from a real Darwin bulletin.
- For a full list of active advisories worldwide right now, see
  https://www.volcanodiscovery.com/news/vaac/latest-reports.html or each
  VAAC's own site (Darwin: bom.gov.au/aviation/volcanic-ash/, Tokyo:
  ds.data.jma.go.jp/vaac/, Washington: ospo.noaa.gov/products/atmosphere/vaac/).

## Important honesty note on "ash concentration"

The Met Office-style chart in your first reference image (colored bands for
mg/m³ concentration: Low/Medium/High/Very High) comes from an actual
atmospheric dispersion model (NAME/HYSPLIT) run internally by each VAAC.
That model output isn't published as an open, real-time API for arbitrary
volcanoes/regions, so this prototype doesn't fabricate concentration bands.

What it plots instead — the actual VAA polygons and flight levels VAACs
publish for aviation, colored by flight-level band (matching the visual
language of your second reference image, the Darwin 4-panel OBS/FCST chart)
— is the real, live, publicly available data. If you later get access to a
VAAC's or a research institution's dispersion-model grid output, the same
map/legend pattern (`lib/style.ts`, the `GeoJSON` layer in
`components/AshMap.tsx`) extends directly to concentration bands instead of
flight-level bands.

## What was verified

- `npm test` — 22 checks over the VAA parser, the morph math, the wind grid,
  and the Darwin feed's file selection, on `node:test` + `node:assert` with no
  test framework.
- `npm run build` and `tsc --noEmit` complete cleanly; `eslint .` is clean.
- The parser was run against two real advisory texts: a live Washington VAAC
  (Fuego) advisory and the Krakatau/Darwin advisory from the reference chart.
- `/api/advisory` POST (raw text) returns correct GeoJSON; GET rejects
  non-VAAC hosts via the allowlist.
- `/api/wind` returns live vectors, including for views crossing the
  antimeridian and for flipped/overscrolled bounds.
- `/api/darwin` was exercised against the live BOM server: 5 real AMBAE
  bulletins (advisories 2026/91-95), ~8.6s cold, ~20ms cached.
- In the browser: the map recenters on a loaded advisory, wind arrows appear
  before any interaction, toggling and level changes refetch, the timeline
  morphs OBS to +6HR and stops cleanly, and the basemap follows the theme.

### Accessibility

Target is WCAG 2.2 AA (see PRODUCT.md). Measured, not assumed:

- Zero text-contrast failures in either theme, verified by walking every text
  node and compositing the real background. Note that computed colours come
  back as `lab()` here because the tokens are OKLCH, so a naive channel parse
  reports nonsense; the check normalizes through a canvas first.
- 22 tab stops on a loaded page, 6 of them in the map. The 64 wind arrows are
  drawn non-interactive: left focusable, Leaflet gives each one a tabindex and
  a `role=button` named "↑", which buries every real control behind ~65 tab
  stops and fails target size at 18px.
- Real heading hierarchy (h1 - h2 - h3), named landmarks, no duplicate element
  ids (the panel mounts twice, so its ids are namespaced with `useId`).
- `prefers-reduced-motion` steps the timeline between frames instead of
  tweening, so the feature survives the preference.
- No horizontal scroll or overflow at 375 / 768 / 1280.

## Project structure

```
app/
  page.tsx               app shell + state (map, sidebar, slide-over)
  layout.tsx             theme provider
  api/advisory/route.ts  fetch-or-parse a VAA text advisory -> GeoJSON
  api/darwin/route.ts    poll BOM's FTP for the newest Darwin bulletins
  api/wind/route.ts      wind vector grid from Open-Meteo
components/
  AshMap.tsx             Leaflet map, GSAP timeline, transport bar
  advisory-panel.tsx     sidebar sections, advisory card, legend
  darwin-feed.tsx        the FTP feed poller + its list view
  raw-bulletin.tsx       the bulletin as issued, with copy
  theme-provider.tsx     next-themes wiring
  theme-toggle.tsx       light/dark button
  ui/                    shadcn/ui components
lib/
  coords.ts              "N1428 W09052" -> [lat, lon]
  vaa.ts                 VAA text parser + GeoJSON builder
  darwin.ts              BOM FTP client + product-file selection
  morph.ts               ring resampling / alignment / interpolation
  grid.ts                wind sampling grid, longitude normalization
  style.ts               flight-level / wind-speed color scales
  types.ts               shared types
  *.test.ts              node:test checks
```
