# AshMap

Monitor volcanic ash in Indonesia. A Next.js + Leaflet application that plots
**real** Volcanic Ash Advisory (VAA) polygons and **live** wind vectors on a
map, with the forecast drift animated.

**Live: https://ash-map-blush.vercel.app**

## Deploy

**Vercel** (what this is set up for): import the repo at
[vercel.com/new](https://vercel.com/new). Next.js is detected automatically and
there is nothing required to configure — every data source the app depends on
is keyless.

One **optional** variable enables the NOTAM lookup. See
[.env.example](.env.example); locally:

```bash
cp .env.example .env.local   # then paste the key into SKYLINK_API_KEY
```

On Vercel, add it under Settings → Environment Variables, or:

```bash
vercel env add SKYLINK_API_KEY
```

SkyLink sells the same data through **two channels**, and they are not
interchangeable:

| | Direct | RapidAPI |
|---|---|---|
| Key | UUID licence key (own checkout, billed via Polar) | long dashless marketplace key |
| Base URL | `https://data.skylinkapi.com/v3.1` | `https://skylink-api.p.rapidapi.com` |
| Header | `x-api-key` | `x-rapidapi-key` + host |

The route infers the channel from the key's shape, because sending one
channel's key to the other's host returns `403 {"message":"You are not
subscribed to this API."}` — which reads like a bug here rather than the
credential mismatch it is. `SKYLINK_API_CHANNEL` overrides the inference. On
RapidAPI the account must additionally be *subscribed* to the API; a valid key
alone is not enough.

Without a key, `/api/notams/<icao>` reports itself unconfigured and the airport
panel says so; everything else works unchanged. The key is read server-side
only and never reaches the browser. The free tier is 1,000 requests a month, so
responses are cached per ICAO for 10 minutes.

Two things to know about running the FTP route on serverless:

- **Outbound FTP.** `/api/darwin` opens a plain socket to `ftp.bom.gov.au`
  (passive mode). Vercel's Node runtime allows it, but verify it on the first
  deploy rather than assuming: hit `/api/darwin?area=indonesia` and check the
  `fetch` block in the response is non-zero. If a platform blocks non-HTTP
  egress, that route is the only thing that breaks; the rest of the app works.
- **Cold starts drop the cache**, unless Redis is configured. The bulletin
  cache is three layers: memory, then Redis when its env vars are present, then
  the OS temp dir. On a server the first and third are enough. On serverless
  every cold start begins with an empty process and an empty filesystem, so
  without Redis a cold request re-downloads the live slots — 8 small files and
  about 4 seconds, cheap but wasteful.

  To make it durable, add a Redis store from the Vercel Marketplace
  (Storage → Redis, which provisions Upstash) and redeploy. The integration
  injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`, which is all
  the cache looks for; the legacy `KV_REST_API_*` names are accepted too.

  **Vercel KV itself is deprecated** — its own package says so, and existing
  stores were migrated to Upstash Redis. Do not reach for `@vercel/kv`.

`maxDuration = 30` is declared on both FTP routes because the serverless
default is 10s and a cold fetch is ~4s, which leaves no headroom if BOM is slow.

**GitHub Pages will not work.** It serves static files only, and all four API
routes do server-side network work (FTP, an Open-Meteo proxy, a CORS-avoiding
HTML fetch). A static export would leave a map that cannot load anything.

**A container host** (Fly.io, Railway, Render) is the better technical fit if
this becomes more than a prototype: one long-lived process keeps the cache
warm, there is no function timeout, and the filesystem persists.

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

4. **Darwin VAAC feed** — `/api/darwin` polls BOM's anonymous FTP. No auth, no
   key. There is no HTTPS path for that tree, and the BOM aviation web page
   renders its list client-side, so FTP is the machine-readable route.

   **Two trees, and only one is live.** `/anon/gen/fwo/` holds the current
   products: one slot per volcano under advisory (`IDY41280.txt`,
   `IDY41285.txt`, ...), each containing that volcano's latest bulletin under a
   fixed name. The dated `/anon/gen/vaac/<year>/` tree is an archive and lags
   real time by days. Poll the archive and you get last week's eruption; poll
   one slot and you see one volcano out of five. The route reads every slot
   (`?live=0` for the archive).

   Slot-to-volcano assignment is not fixed, so the only correct approach is to
   read each slot and see what is in it. Slots are mutable — same name, new
   content — so their cache key carries the server modified time.

   Responses are cached 5 minutes server-side, concurrent requests collapse
   onto one FTP session, and a failed fetch serves the last good data rather
   than an error. The directory holds ~8000 entries per year, mostly PNG
   charts, so the listing uses a server-side glob (~1s instead of ~10s).

   **Polling cost.** A published bulletin is immutable, so it is downloaded
   once and cached by filename (memory, plus a best-effort copy in the OS temp
   dir that survives restarts). A poll then costs one directory listing plus
   only the files that are genuinely new. Measured on the same call twice:

   ```
   call 1 (cold): {scanned: 20, downloaded: 20, fromCache: 0}
   call 2 (warm): {scanned: 20, downloaded: 0,  fromCache: 20}
   ```

   Every response carries that `fetch` block, so the cost is visible rather
   than assumed. Other levers already in place: a 5-minute server cache,
   concurrent requests collapsed onto one FTP session, and client polling that
   pauses while the tab is hidden.

   Most bulletins are stand-downs with nothing to plot, so the scan reads up to
   40 files back looking for ones that carry ash, then stops. Advisories are
   deduplicated to the newest per volcano (`?group=0` for the full history).

   *Deployment note*: this opens an outbound FTP connection. Fine on a server
   or container; many serverless platforms block non-HTTP egress. Verified
   working on Vercel.

5. **Every volcano at once** — the feed plots the newest advisory for *every*
   volcano currently under advisory, not one. The map fits the view to all of
   them, the selected one animates, the rest render dashed and low-contrast as
   context. Click any volcano icon (or its polygon) to move the timeline to it,
   or jump straight to its GIS plot.

   Controls in *Layers on the map*: show/hide each volcano, and a flight-level
   floor ("FL300 and above") for when only ash at cruising altitude matters.

6. **Raw bulletin view** — the exact text as issued, with a copy button. The
   parsed view is a convenience; the bulletin is the source of truth.

7. **Wind projection** — `/api/wind` queries
   [Open-Meteo](https://open-meteo.com) (free, no API key) for wind
   speed/direction at a chosen pressure level across a grid covering the
   current map view, and draws it as rotated arrows colored by speed.
   Longitudes are normalized before the upstream call — Leaflet reports
   out-of-range bounds past the antimeridian, which Open-Meteo rejects.

8. **Airports under ash** — the map shows where ash is; this shows what it
   hits. Every airport in and around Indonesia is tested against every frame's
   polygons, and the panel lists them worst-first: affected now before
   forecast, ash reaching the surface before ash only at altitude, then by
   height. Affected airports are ringed on the map, filled when affected now.

   The distinction that matters is `SFC/FL150` versus `FL150/FL500`: the first
   is ash on the runway and in the approach, the second is clear air below and
   a problem at cruise. The band's own flight levels carry it, so they are
   reported rather than flattened into one verdict.

   Two things it is not. It is not a forecast of its own — it is geometry over
   published polygons. And it is not an operational clearance: whether an
   aerodrome is restricted is decided by its authority and published as a NOTAM
   or ASHTAM. `/api/notams/<icao>` reads those, via the SkyLink NOTAM API
   (FAA SWIM FNS), when `SKYLINK_API_KEY` is set — see Deploy. Without a key
   the lookup reports itself unconfigured and nothing else changes.

   Airport coordinates come from [OurAirports](https://ourairports.com/data/)
   (public domain), filtered to scheduled-service airports.

   A note on the boundary: ray casting answers points exactly on a polygon edge
   arbitrarily, depending on which edge the ray clips. For a hazard overlay that
   is not acceptable, so `lib/impact.ts` tests edges explicitly and treats the
   boundary as inclusive — an aerodrome on the rim of a cloud is reported as
   affected. Rings crossing the antimeridian are shifted before testing, or a
   Pacific cloud would flag airports in Indonesia.

9. **Volcano alert levels** — `/api/pvmbg` reads PVMBG (Indonesia's
   volcanology agency) for each volcano's own status: I Normal, II Waspada,
   III Siaga, IV Awas, where Level IV means evacuation is under way.

   This is the third of three sources, and they answer different questions.
   The advisory says whether ash is in the air and how high; a NOTAM says
   whether the aerodrome is restricted; PVMBG says what the mountain is doing.
   A volcano can sit at Siaga with no ash aloft, or drift ash across a country
   while back at Waspada.

   Scraped, because the JSON API needs credentials while the public page does
   not. PVMBG and the VAACs also name the same volcano differently — "Anak
   Krakatau" against `KRAKATAU`, "Ili Lewotolok" against `LEWOTOLOK` — and the
   page carries no shared identifier, so the join is normalized names plus an
   explicit alias list. `LEWOTOBI` and `LEWOTOLOK` share five letters, so the
   fallback match is longest-first and length-guarded; a prefix match would
   put one volcano's alert level on another.

   An empty parse is treated as an error, not as "no volcano is under alert",
   and the last good scrape is served instead.

10. **Alerts** — a desktop notification when Darwin issues a new advisory for a
    volcano on the map, or when an aerodrome under the ash is reported closed.
    The first load announces nothing (everything is new on open, which would be
    noise), and repeats for one volcano share a tag so an hourly re-advisory
    replaces its own notification rather than stacking.

    Ceiling: the Notification API only, no service worker and no push server,
    so the tab has to be open. That matches the feed, which already stops
    polling when the tab is hidden. Web push needs somewhere to run the poller.

11. **Times you can actually read** — advisories are timed in Zulu (UTC), which
   assumes the reader both knows that and can convert it. A "Times & time zone"
   section explains it and switches every timestamp to the reader's own zone;
   hovering a time always shows the other. Zulu stays the default, because it
   is what the bulletin says.

   The short DTG used by every cloud frame (`06/1240Z`) carries a day but no
   month, so `lib/dtg.ts` resolves it against the advisory's own issue time and
   picks the month that lands nearest. A +18HR forecast issued on the 31st
   otherwise resolves into the wrong month, and `Date.UTC` would report the
   rollover as a real date instead of an invalid one.

12. **Playback and refresh rates** — the transport plays at 1x to 12x (GSAP
   `timeScale`, applied mid-playback). Auto-refresh is selectable: off, 15 min,
   30 min or 1 hour, defaulting to 30, since Darwin re-advises a volcano at
   most hourly. A tab that sat hidden past the interval refreshes when it comes
   back, and there is a manual Refresh button.

13. **Heights in metres, not just flight levels** — every altitude reads
    `FL500 (50,000 ft / 15,200 m)`. Flight levels are hundreds of feet and mean
    nothing outside aviation, and Indonesia is metric. A legend fixed to the
    map's right edge carries the same conversion for the colour bands, since
    the sidebar is closed on a phone and collapsed on a laptop. It starts
    collapsed below 640px, where it would otherwise take 40% of the width.

14. **English and Indonesian** — every interface string is translated, with the
    locale taken from the browser and remembered. A plain typed dictionary in
    `lib/i18n.ts`, no i18n library: two locales, Indonesian has no plural
    categories, dates already go through `Intl`, and next-intl would add a
    dependency, middleware and a routing scheme to do less. Tests assert the
    two catalogues hold the same keys, the same placeholders, and no string
    left identical by copy-paste.

    The generated sentences are localized too, which needed the data to stay
    structured: `assessAsh` keeps a pre-rendered English `summary` for API
    consumers, and a band's drift is `{ dir, knots }` rather than "southwest at
    10 kt", so `lib/ash-text.ts` can build the sentence in either language. A
    test asserts the English build still matches the API's own string, so the
    two cannot drift apart in wording.

    The raw VAA bulletin and the NOTAM text are deliberately *not* translated:
    they are source documents an operator may need to quote verbatim.

15. **First-run onboarding** — one dialog, shown once, explaining the thing the
    map cannot: that three independent official sources are on screen, each
    answering a different question, and that they can disagree. It also
    explains what a flight level is, since the colour bands mean nothing
    without that. Carries the language switch, so a first-time Indonesian
    reader can change it before reading anything else.

16. **UI** — shadcn/ui/Tailwind sidebar with collapsible sections, an advisory
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
- **Format differences are real**, and every one of these silently lost data
  before it was handled. All are covered by tests built from real bulletins:
  - Darwin writes `FCST VA CLD +6 HR:` with a space; Washington writes `+6HR:`.
  - BOM appends a copyright block after the bulletin's `=` terminator.
  - Coordinates wrap across lines mid-pair (`S1111\nE10619` is one vertex).
  - `EST VA CLD` (estimated) replaces `OBS VA CLD` when satellite cannot
    confirm the cloud. Four of five live Indonesian volcanoes use it. Worse,
    `EST VA DTG` contains the substring `DTG`, so a parser knowing only the
    bare `DTG` label overwrites the issue time with the estimated cloud's text
    and never plots the cloud. Estimated clouds are flagged, and reported as
    "estimated" rather than "observed" — a real difference in confidence.
  - One advisory carries several flight-level bands moving in *different*
    directions, so drift is tracked per band, never advisory-wide.
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

- `npm test` — 93 checks over the VAA parser, the morph math, the wind grid,
  the Darwin feed's file selection, and DTG parsing across month and year
  boundaries, on `node:test` + `node:assert` with no test framework.
- `npm run build` and `tsc --noEmit` complete cleanly; `eslint .` is clean.
- The parser was run against two real advisory texts: a live Washington VAAC
  (Fuego) advisory and the Krakatau/Darwin advisory from the reference chart.
- `/api/advisory` POST (raw text) returns correct GeoJSON; GET rejects
  non-VAAC hosts via the allowlist.
- `/api/wind` returns live vectors, including for views crossing the
  antimeridian and for flipped/overscrolled bounds.
- `/api/darwin` was exercised against the live BOM server: real KRAKATAU
  (Indonesia) and LANGILA (PNG) advisories, grouped to one layer per volcano,
  with the file cache serving 23 of 23 files on a repeat call.
- In the browser: two volcanoes render as two layers, the view fits both,
  hiding a layer drops it from the map, and an "FL100 and above" floor
  correctly clears two FL40/FL60 clouds.
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

## Credits

Built by **Victor Chandra** ([@mzmznasipadang](https://github.com/mzmznasipadang)).
Source code MIT licensed; see [LICENSE](LICENSE).

The data is not mine and carries its publishers' terms:

| Data | Holder |
|---|---|
| Darwin VAAC advisories | © Commonwealth of Australia, [Bureau of Meteorology](http://www.bom.gov.au/aviation/volcanic-ash/) |
| Washington VAAC advisories | [NOAA / NWS Satellite Analysis Branch](https://www.ospo.noaa.gov/products/atmosphere/vaac/) |
| Volcano alert levels | [PVMBG](https://magma.esdm.go.id/), Badan Geologi, Kementerian ESDM |
| Wind forecast | © [Open-Meteo](https://open-meteo.com/), CC BY 4.0 |
| Basemap tiles | © [Esri](https://www.esri.com/) and its data contributors |

Built with Next.js, Leaflet, GSAP, shadcn/ui and Tailwind.

**Not an official aviation product.** For flight planning, use the advisories
and NOTAMs issued by the responsible VAAC and your national AIS.

## Project structure

```
app/
  page.tsx               app shell + state (map, sidebar, slide-over)
  layout.tsx             theme provider
  icon.svg               favicon (the mark; Next serves it as rel=icon)
  apple-icon.tsx         the same mark rendered to PNG for iOS
  opengraph-image.png    1200x630 link-preview card
  api/advisory/route.ts  fetch-or-parse a VAA text advisory -> GeoJSON
  api/darwin/route.ts    poll BOM's FTP for the newest Darwin bulletins
  api/darwin/geojson/    one FeatureCollection for GIS, area-filterable
  api/notams/[icao]/     published NOTAMs for an aerodrome (needs a key)
  api/pvmbg/route.ts     Indonesian volcano alert levels
  api/wind/route.ts      wind vector grid from Open-Meteo
components/
  AshMap.tsx             Leaflet map, GSAP timeline, transport bar
  advisory-panel.tsx     sidebar sections, advisory card, legend
  darwin-feed.tsx        the FTP feed poller + its list view
  raw-bulletin.tsx       the bulletin as issued, with copy
  credits.tsx            author and data-source attribution
  time-mode.tsx          Zulu/local preference, explainer, <Dtg>
  map-legend.tsx         the colour bands, fixed to the map
  i18n.tsx               locale context, t(), language switch
  onboarding.tsx         first-run explanation of the three sources
  airport-impact.tsx     affected-airport list + NOTAM lookup
  wind-layer.tsx         the wind field as one SVG layer
  theme-provider.tsx     next-themes wiring
  theme-toggle.tsx       light/dark button
  ui/                    shadcn/ui components
lib/
  coords.ts              "N1428 W09052" -> [lat, lon]
  vaa.ts                 VAA text parser + GeoJSON builder
  airports.ts            airports in/around Indonesia (from OurAirports)
  darwin.ts              BOM FTP client + product-file selection
  impact.ts              which airports sit under a cloud, and how high
  notams.ts              SkyLink channel/field normalization
  ash-text.ts            the ash sentence, built per locale
  i18n.ts                EN/ID message catalogue
  notify.ts              what counts as news, for notifications
  pvmbg.ts               alert-level scrape + VAAC name matching
  logo.ts                the app mark, shared by the generated icons
  area.ts                Indonesia bbox + area matching
  bulletin-cache.ts      immutable-file cache (memory + temp dir)
  eruption.ts            per-band ash status, height and drift
  dtg.ts                 ICAO date-time groups, Zulu/local formatting
  morph.ts               ring resampling / alignment / interpolation
  grid.ts                wind sampling grid, longitude normalization
  style.ts               flight-level / wind-speed color scales
  types.ts               shared types
  *.test.ts              node:test checks
```
