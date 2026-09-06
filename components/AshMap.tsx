"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import gsap from "gsap";
import { useTheme } from "next-themes";
import { Gauge, Pause, Play, SkipBack } from "lucide-react";

import { frameDtg, framePolygons, type FrameKey, type VaaAdvisory } from "@/lib/vaa";
import { buildTrack, lerpRing, MORPH_VERTICES } from "@/lib/morph";
import { assessAsh } from "@/lib/eruption";
import type { LatLon } from "@/lib/coords";
import { flightLevelCeiling, flightLevelColor, windColor } from "@/lib/style";
import type { WindVector } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTimeMode } from "@/components/time-mode";
import { formatDtg, parseDtg } from "@/lib/dtg";

type Bounds = { north: number; south: number; east: number; west: number };

export type PlottedAdvisory = { id: string; advisory: VaaAdvisory; frames: FrameKey[] };

const SECONDS_PER_FRAME = 1.8;

/** Playback rates offered in the transport. */
const SPEEDS = [1, 2, 4, 6, 12] as const;

const BASEMAPS = {
  light:
    "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  dark: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
};

// Under prefers-reduced-motion the timeline steps between frames instead of
// tweening across them. The feature stays, the motion goes.
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function volcanoIcon(selected: boolean) {
  return L.divIcon({
    className: "",
    // 24x24 is the WCAG 2.2 target-size floor; the emoji is decorative and the
    // marker's title carries the name.
    html: `<div aria-hidden="true" style="display:grid;place-items:center;width:24px;height:24px;font-size:${
      selected ? 22 : 17
    }px;line-height:1;filter:drop-shadow(0 0 2px #000)${selected ? "" : ";opacity:.75"}">🌋</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

function windIcon(vec: WindVector) {
  const toDir = (vec.directionDeg + 180) % 360; // "from" -> "to"
  const color = windColor(vec.speedKmh);
  return L.divIcon({
    className: "",
    html: `<div aria-hidden="true" style="transform:rotate(${toDir}deg);color:${color};font-size:18px;line-height:1">&#8593;</div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// MapContainer's `center` is init-only, so moving the view has to go through
// the map instance. Reporting bounds on mount too, not just on moveend, is what
// gets the wind overlay its first fetch before the user touches the map.
function MapSync({
  fit,
  onBoundsChange,
}: {
  fit: LatLon[] | null;
  onBoundsChange: (b: Bounds) => void;
}) {
  const emit = useCallback(
    (m: L.Map) => {
      const b = m.getBounds();
      onBoundsChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
    },
    [onBoundsChange]
  );

  const map = useMapEvents({ moveend: () => emit(map) });
  const fitKey = fit ? fit.map((p) => p.join()).join("|") : "";

  useEffect(() => {
    emit(map);
  }, [map, emit]);

  useEffect(() => {
    if (!fit || fit.length === 0) return;
    // One volcano is a recentre; several is a fit, so every advisory is on screen.
    if (fit.length === 1) map.setView(fit[0], map.getZoom());
    else map.fitBounds(L.latLngBounds(fit.map(([lat, lon]) => L.latLng(lat, lon))), { padding: [60, 60] });
    // fitKey is the stable identity of the point set; `fit` is a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, fitKey]);

  return null;
}

type Track = {
  flightLevel: string;
  ceiling: number;
  movement?: string;
  /** One ring per frame, all the same length and rotationally aligned. */
  rings: LatLon[][];
};

/**
 * Group one advisory's polygons into a track per flight-level band, so the
 * FL500 cloud morphs into the next frame's FL500 cloud rather than into
 * whichever polygon happens to share its array index.
 */
function buildTracks(advisory: VaaAdvisory, frames: FrameKey[]): Track[] {
  if (frames.length === 0) return [];

  const perFrame = frames.map((f) => framePolygons(advisory, f));
  const levels = [...new Set(perFrame.flat().map((p) => p.flightLevel))];

  return levels.map((flightLevel) => {
    const matches = perFrame.map((polys) => polys.find((p) => p.flightLevel === flightLevel) ?? null);
    return {
      flightLevel,
      ceiling: flightLevelCeiling(flightLevel),
      movement: matches.find((m) => m?.movement)?.movement,
      rings: buildTrack(
        matches.map((m) => m?.vertices ?? null),
        MORPH_VERTICES
      ),
    };
  });
}

export default function AshMap({
  advisories,
  selectedId,
  onSelect,
  minFlightLevel = 0,
  windVectors,
  showWind,
  onBoundsChange,
  onExport,
}: {
  advisories: PlottedAdvisory[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  minFlightLevel?: number;
  windVectors: WindVector[];
  showWind: boolean;
  onBoundsChange: (b: Bounds) => void;
  onExport?: (item: PlottedAdvisory) => void;
}) {
  const { resolvedTheme } = useTheme();
  const { mode: timeMode } = useTimeMode();

  const selected = useMemo(
    () => advisories.find((a) => a.id === selectedId) ?? advisories[0] ?? null,
    [advisories, selectedId]
  );
  const EMPTY_FRAMES = useMemo<FrameKey[]>(() => [], []);
  const frames = selected?.frames ?? EMPTY_FRAMES;

  // Every advisory gets its bands; only the selected one is animated.
  const layers = useMemo(
    () =>
      advisories.map((item) => ({
        item,
        tracks: buildTracks(item.advisory, item.frames).filter((t) => t.ceiling >= minFlightLevel),
      })),
    [advisories, minFlightLevel]
  );

  const EMPTY_TRACKS = useMemo<Track[]>(() => [], []);
  const selectedTracks = useMemo(
    () => layers.find((l) => l.item.id === selected?.id)?.tracks ?? EMPTY_TRACKS,
    [layers, selected?.id, EMPTY_TRACKS]
  );
  const canAnimate = frames.length > 1 && selectedTracks.length > 0;

  const speedRef = useRef(1);
  const layerRefs = useRef<(L.Polygon | null)[]>([]);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const scrubber = useRef<HTMLInputElement | null>(null);
  const readout = useRef<HTMLSpanElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<number>(1);

  // A new selection builds a fresh paused timeline, so the transport falls back
  // to "stopped". Adjusting here rather than in the effect avoids a second pass.
  const trackKey = `${selected?.id ?? "none"}:${frames.join(",")}:${minFlightLevel}`;
  const [renderedKey, setRenderedKey] = useState(trackKey);
  if (trackKey !== renderedKey) {
    setRenderedKey(trackKey);
    setPlaying(false);
  }

  const frameLabel = useCallback(
    (t: number) => {
      if (frames.length === 0 || !selected) return "";
      const i = Math.min(frames.length - 1, Math.round(t));
      const dtg = frameDtg(selected.advisory, frames[i]);
      if (!dtg) return frames[i];
      const reference = parseDtg(selected.advisory.dtg);
      return `${frames[i]} · ${formatDtg(dtg, timeMode, reference)}`;
    },
    [selected, frames, timeMode]
  );

  // Push interpolated shapes straight at Leaflet. Routing this through React
  // state would re-render the whole map subtree 60 times a second.
  const draw = useCallback(
    (t: number) => {
      const seg = Math.min(Math.floor(t), Math.max(0, frames.length - 2));
      const local = t - seg;
      selectedTracks.forEach((track, i) => {
        const layer = layerRefs.current[i];
        const from = track.rings[seg];
        if (!layer || !from) return;
        const to = track.rings[seg + 1] ?? from;
        layer.setLatLngs(lerpRing(from, to, local).map(([lat, lon]) => L.latLng(lat, lon)));
      });
      if (scrubber.current && document.activeElement !== scrubber.current) {
        scrubber.current.value = String(t);
      }
      if (readout.current) readout.current.textContent = frameLabel(t);
    },
    [frames.length, selectedTracks, frameLabel]
  );

  useEffect(() => {
    if (!canAnimate) {
      timeline.current?.kill();
      timeline.current = null;
      return;
    }

    const state = { t: 0 };
    const hops = frames.length - 1;
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "none" },
      onUpdate: () => draw(state.t),
      onComplete: () => setPlaying(false),
    });
    if (prefersReducedMotion()) {
      for (let i = 1; i <= hops; i++) tl.set(state, { t: i }, (i - 1) * 1.2);
      tl.to(state, { t: hops, duration: 0.01 }, hops * 1.2);
    } else {
      tl.to(state, { t: hops, duration: hops * SECONDS_PER_FRAME });
    }

    tl.timeScale(speedRef.current);
    timeline.current = tl;
    draw(0);

    return () => {
      tl.kill();
      timeline.current = null;
    };
  }, [canAnimate, frames.length, draw]);

  const toggle = () => {
    const tl = timeline.current;
    if (!tl) return;
    if (tl.progress() >= 1) tl.progress(0);
    if (playing) {
      tl.pause();
      setPlaying(false);
    } else {
      tl.play();
      setPlaying(true);
    }
  };

  const restart = () => {
    timeline.current?.pause().progress(0);
    setPlaying(false);
  };

  const cycleSpeed = () => {
    const next = SPEEDS[(SPEEDS.indexOf(speed as (typeof SPEEDS)[number]) + 1) % SPEEDS.length];
    setSpeed(next);
    speedRef.current = next;
    // timeScale applies live, so this takes effect mid-playback.
    timeline.current?.timeScale(next);
  };

  const scrub = (value: number) => {
    const tl = timeline.current;
    if (!tl) return;
    tl.pause();
    setPlaying(false);
    tl.progress(frames.length > 1 ? value / (frames.length - 1) : 0);
  };

  const fit = useMemo(() => {
    const points = advisories.map((a) => a.advisory.position).filter((p): p is LatLon => !!p);
    return points.length ? points : null;
  }, [advisories]);

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={[-2, 118]}
        zoom={5}
        // Leaflet gives its internal panes z-index 200-700, in the ROOT stacking
        // context. Anything layered over the map with a smaller z-index loses:
        // the mobile slide-over panel (z-50) had the map's opaque tiles painted
        // straight over its body, leaving only the header visible. `isolation`
        // creates a stacking context so those pane z-indexes stay inside the map.
        style={{ height: "100%", width: "100%", isolation: "isolate" }}
        worldCopyJump
        aria-label="Volcanic ash advisory map"
      >
        {/* CARTO now watermarks unauthenticated tiles ("API KEY REQUIRED") straight
            into the PNG, so the basemap is Esri's keyless gray canvas — also a more
            neutral ground for reading ash polygons against. */}
        <TileLayer
          key={resolvedTheme === "dark" ? "dark" : "light"}
          attribution='Built by <a href="https://github.com/mzmznasipadang">Victor Chandra</a> | Tiles &copy; <a href="https://www.esri.com/">Esri</a> | Advisories &copy; <a href="http://www.bom.gov.au/aviation/volcanic-ash/">Bureau of Meteorology</a> | Wind <a href="https://open-meteo.com/">Open-Meteo</a>'
          url={resolvedTheme === "dark" ? BASEMAPS.dark : BASEMAPS.light}
          maxZoom={16}
        />
        <MapSync fit={fit} onBoundsChange={onBoundsChange} />

        {layers.map(({ item, tracks }) => {
          const isSelected = item.id === selected?.id;
          return tracks.map((track, i) => (
            <Polygon
              key={`${item.id}-${track.flightLevel}`}
              // Only the selected advisory is animated, so only it needs refs.
              ref={
                isSelected
                  ? (layer) => {
                      layerRefs.current[i] = layer;
                    }
                  : undefined
              }
              positions={track.rings[0] ?? []}
              eventHandlers={{ click: () => onSelect(item.id) }}
              pathOptions={{
                color: flightLevelColor(track.flightLevel),
                fillColor: flightLevelColor(track.flightLevel),
                // Unselected advisories stay as context, not competition.
                weight: isSelected ? 2 : 1,
                opacity: isSelected ? 1 : 0.55,
                fillOpacity: isSelected ? 0.35 : 0.12,
                dashArray: isSelected ? undefined : "4 3",
              }}
            >
              <Popup>
                <b>{item.advisory.volcano}</b> — {track.flightLevel}
                {track.movement && (
                  <>
                    <br />
                    {track.movement}
                  </>
                )}
              </Popup>
            </Polygon>
          ));
        })}

        {advisories.map((item) =>
          item.advisory.position ? (
            <Marker
              key={`marker-${item.id}`}
              position={item.advisory.position}
              icon={volcanoIcon(item.id === selected?.id)}
              title={`${item.advisory.volcano ?? "Volcano"} — advisory details`}
              alt={`${item.advisory.volcano ?? "Volcano"} — advisory details`}
              eventHandlers={{ click: () => onSelect(item.id) }}
            >
              <Popup>
                <div style={{ minWidth: 210 }}>
                  <b>{item.advisory.volcano}</b> ({item.advisory.vaac} VAAC)
                  <br />
                  Advisory {item.advisory.advisoryNr} · {item.advisory.dtg}
                  <br />
                  {assessAsh(item.advisory).summary}
                  <br />
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    style={{ marginTop: 6, marginRight: 8, textDecoration: "underline", cursor: "pointer" }}
                  >
                    Show timeline
                  </button>
                  {onExport && (
                    <button
                      type="button"
                      onClick={() => onExport(item)}
                      style={{ marginTop: 6, textDecoration: "underline", cursor: "pointer" }}
                    >
                      GeoJSON
                    </button>
                  )}
                </div>
              </Popup>
            </Marker>
          ) : null
        )}

        {/* The wind field is 64 arrows. Left interactive, Leaflet gives each one a
            tabindex and a role=button named "↑", which buries every real control
            behind ~65 tab stops and fails target size at 18px. It is a data
            layer, so it is drawn non-interactive. */}
        {showWind &&
          windVectors.map((v, i) => (
            <Marker key={i} position={[v.lat, v.lon]} icon={windIcon(v)} interactive={false} keyboard={false} />
          ))}
      </MapContainer>

      {/* z-10, not z-400. The map is its own stacking context now, so the
          transport only has to sit above the map — anything higher paints over
          the slide-over panel, which is exactly what z-400 was doing. */}
      {canAnimate && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4">
          <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-3 rounded-xl border bg-background/85 p-2 shadow-lg backdrop-blur-md">
            <Button size="icon" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={restart} aria-label="Back to observation">
              <SkipBack className="size-4" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={cycleSpeed}
              aria-label={`Playback speed ${speed} times. Click to change.`}
              className="h-8 shrink-0 gap-1 px-2 font-mono text-xs tabular-nums"
            >
              <Gauge className="size-3.5" aria-hidden="true" />
              {speed}&times;
            </Button>

            {/* ponytail: native range input, not the shadcn Slider. The timeline
                writes the thumb position every frame via ref; a controlled Radix
                slider would mean 60 React renders a second for the same pixels. */}
            <input
              ref={scrubber}
              type="range"
              min={0}
              max={frames.length - 1}
              step={0.01}
              defaultValue={0}
              onChange={(e) => scrub(Number(e.target.value))}
              aria-label="Advisory forecast time"
              aria-describedby="frame-readout"
              className="scrubber h-6 flex-1 cursor-pointer bg-transparent focus-visible:outline-none"
            />

            <Badge variant="secondary" className="shrink-0 font-mono tabular-nums">
              <span id="frame-readout" ref={readout} aria-live="polite">
                {frameLabel(0)}
              </span>
            </Badge>
          </div>
        </div>
      )}
    </div>
  );
}
