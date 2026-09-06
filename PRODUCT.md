# Product

## Register

product

## Users

Two audiences share one surface, and the tension between them is the design problem:

- **Operational readers** — flight dispatchers, ops-centre staff, volcanologists, and aviation
  weather watchers who already read ICAO advisories fluently. They arrive with a specific
  advisory in hand (a URL, a pasted bulletin, an alert) and want the polygons on a map,
  by flight level, with the forecast drift visible. They think in DTG, FL500, and MOV SW 10KT.
- **Non-expert readers** — journalists, travellers, people near an erupting volcano, students.
  They arrive without the vocabulary and need the same map to tell them what is in the air,
  how high, and where it is heading, without decoding aviation shorthand first.

Context of use: a desk or a phone, often under time pressure during an eruption, sometimes on
a poor connection. Rarely a leisurely browse.

## Product Purpose

Turn the standardized ICAO Volcanic Ash Advisory text bulletin — the same format every VAAC
issues, from Darwin to Washington to Toulouse — into a map anyone can read, with live wind
and animated forecast drift.

The value is that it works on *real, current, public* data with no API keys and no
institutional access: paste any VAAC's bulletin, or fetch a Washington VAAC URL, and get
flight-level-banded polygons, a wind field from Open-Meteo, and a timeline that plays the
cloud from observation through the forecast frames.

Success: an ops reader gets from a bulletin to a correct map in one action, and a non-expert
reading the same screen can say what is in the air and where it is going without asking.

Explicit non-goal: this does not fabricate ash *concentration* bands (mg/m³). That output
comes from dispersion models (NAME/HYSPLIT) run inside VAACs and is not openly published.
The app plots what is actually published and says so.

## Brand Personality

**Precise, plain-spoken, unexcitable.**

An instrument, not a dashboard and not a news graphic. It reports what the advisory says and
resists dramatizing an eruption. Where aviation shorthand is unavoidable it is shown *and*
translated, so expertise is never the price of admission. Voice is declarative and specific:
"Ash to FL500, drifting southwest at 10 kt", not "Significant volcanic activity detected".

Trust comes from restraint and from admitting limits — the honesty note about concentration
bands is the product's character, not a disclaimer bolted on.

## Anti-references

- **Cable-news hazard graphics.** Red pulsing alert styling, urgency as decoration, drama that
  outpaces the data.
- **Consumer weather apps.** Big friendly gradients, cartoon volcano imagery, animated
  backgrounds, a hero temperature-style metric.
- **Raw institutional output.** A wall of monospaced bulletin text with no visual translation,
  which is what most VAAC pages already are. Being readable is the point of this existing.
- **Generic SaaS analytics chrome.** Stat-tile rows, sparkline cards, and KPI framing wrapped
  around what is fundamentally one map.
- The map must never compete with decoration. If a visual flourish draws the eye away from the
  polygons, it is wrong.

## Design Principles

1. **The map is the product.** Every other element earns its pixels by making the map more
   readable. Chrome recedes; ash and wind do not.
2. **Jargon shown and translated.** Never strip FL500 or DTG (ops readers need the exact
   token), never present them bare either. Both audiences read the same component.
3. **Say what is known and what is not.** Published advisory data is plotted; modelled
   concentration is absent and labelled absent. No fabricated precision, no invented certainty.
4. **One action from bulletin to map.** Paste or pick, then it is on screen and centred.
   No configuration step between the user and the answer.
5. **Legible under pressure, on any screen.** An eruption is not the moment for a layout that
   breaks at 375px or text at 3:1 contrast.

## Accessibility & Inclusion

**Target: WCAG 2.2 Level AA.**

- Body text ≥ 4.5:1, large text ≥ 3:1, UI component boundaries and focus indicators ≥ 3:1,
  in both light and dark themes.
- Fully keyboard operable, including the timeline transport and every panel section. Visible
  focus everywhere; no keyboard traps in the slide-over panel.
- Flight-level and wind-speed bands must not rely on hue alone — they are read by people with
  colour vision deficiency, and the ash bands run blue→orange→red→purple. Pair colour with
  text labels wherever a band is asserted.
- The timeline animation respects `prefers-reduced-motion`: the cloud still moves between
  frames on demand, but nothing autoplays or loops against the user's stated preference.
- Touch targets ≥ 24×24 CSS px minimum (WCAG 2.2 SC 2.5.8), 44×44 preferred, which the
  transport controls and mobile panel trigger must honour.
