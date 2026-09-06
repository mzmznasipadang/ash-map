"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Polygon, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import gsap from "gsap";
import { useTheme } from "next-themes";
import { Pause, Play, SkipBack } from "lucide-react";

import { availableFrames, frameDtg, framePolygons, type FrameKey, type VaaAdvisory } from "@/lib/vaa";
import { buildTrack, lerpRing, MORPH_VERTICES } from "@/lib/morph";
import type { LatLon } from "@/lib/coords";
import { flightLevelColor, windColor } from "@/lib/style";
import type { WindVector } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

type Bounds = { north: number; south: number; east: number; west: number };

// Seconds of playback per hop between advisory frames.
const SECONDS_PER_FRAME = 1.8;

// Under prefers-reduced-motion the timeline still works — it just steps between
// frames instead of tweening across them. The feature stays, the motion goes.
function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const BASEMAPS = {
  light:
    "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}",
  dark: "https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
};

function volcanoIcon() {
  return L.divIcon({
    className: "",
    // 24x24 is the WCAG 2.2 target-size floor, and the emoji is decorative:
    // the marker's own title carries the name.
    html: `<div aria-hidden="true" style="display:grid;place-items:center;width:24px;height:24px;font-size:20px;line-height:1;filter:drop-shadow(0 0 2px #000)">🌋</div>`,
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

// MapContainer's `center` is init-only, so recentering has to go through the
// map instance. Reporting bounds on mount too, not just on moveend, is what
// gets the wind overlay its first fetch before the user touches the map.
function MapSync({
  lat,
  lon,
  onBoundsChange,
}: {
  lat?: number;
  lon?: number;
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

  useEffect(() => {
    emit(map);
  }, [map, emit]);

  useEffect(() => {
    if (lat != null && lon != null) map.setView([lat, lon], map.getZoom());
  }, [map, lat, lon]);

  return null;
}

type Track = {
  flightLevel: string;
  movement?: string;
  /** One ring per frame, all the same length and rotationally aligned. */
  rings: LatLon[][];
};

/**
 * Group the advisory's polygons into one track per flight-level band, so the
 * FL500 cloud morphs into the next frame's FL500 cloud rather than into
 * whichever polygon happens to share its array index.
 */
function buildTracks(advisory: VaaAdvisory | null, frames: FrameKey[]): Track[] {
  if (!advisory || frames.length === 0) return [];

  const perFrame = frames.map((f) => framePolygons(advisory, f));
  const levels = [...new Set(perFrame.flat().map((p) => p.flightLevel))];

  return levels.map((flightLevel) => {
    const matches = perFrame.map((polys) => polys.find((p) => p.flightLevel === flightLevel) ?? null);
    return {
      flightLevel,
      movement: matches.find((m) => m?.movement)?.movement,
      rings: buildTrack(
        matches.map((m) => m?.vertices ?? null),
        MORPH_VERTICES
      ),
    };
  });
}

export default function AshMap({
  advisory,
  windVectors,
  showWind,
  onBoundsChange,
}: {
  advisory: VaaAdvisory | null;
  windVectors: WindVector[];
  showWind: boolean;
  onBoundsChange: (b: Bounds) => void;
}) {
  const { resolvedTheme } = useTheme();
  const center: [number, number] = advisory?.position ?? [0, 120];

  const frames = useMemo(() => (advisory ? availableFrames(advisory) : []), [advisory]);
  const tracks = useMemo(() => buildTracks(advisory, frames), [advisory, frames]);
  const canAnimate = frames.length > 1 && tracks.length > 0;

  const layerRefs = useRef<(L.Polygon | null)[]>([]);
  const timeline = useRef<gsap.core.Timeline | null>(null);
  const scrubber = useRef<HTMLInputElement | null>(null);
  const readout = useRef<HTMLSpanElement | null>(null);
  const [playing, setPlaying] = useState(false);

  // A new advisory builds a fresh paused timeline, so the transport has to fall
  // back to "stopped". Adjusting it here rather than in the effect below keeps
  // it out of a second render pass.
  const trackKey = `${advisory?.advisoryNr ?? "none"}:${frames.join(",")}`;
  const [renderedKey, setRenderedKey] = useState(trackKey);
  if (trackKey !== renderedKey) {
    setRenderedKey(trackKey);
    setPlaying(false);
  }

  const frameLabel = useCallback(
    (t: number) => {
      if (frames.length === 0) return "";
      const i = Math.min(frames.length - 1, Math.round(t));
      const dtg = advisory ? frameDtg(advisory, frames[i]) : undefined;
      return dtg ? `${frames[i]} · ${dtg}` : frames[i];
    },
    [advisory, frames]
  );

  // Push the interpolated shapes straight at Leaflet. Routing this through
  // React state would re-render the whole map subtree 60 times a second.
  const draw = useCallback(
    (t: number) => {
      const seg = Math.min(Math.floor(t), Math.max(0, frames.length - 2));
      const local = t - seg;
      tracks.forEach((track, i) => {
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
    [frames.length, tracks, frameLabel]
  );

  useEffect(() => {
    if (!canAnimate) {
      timeline.current?.kill();
      timeline.current = null;
      return;
    }

    const state = { t: 0 };
    const hops = frames.length - 1;
    const reduced = prefersReducedMotion();
    const tl = gsap.timeline({
      paused: true,
      defaults: { ease: "none" },
      onUpdate: () => draw(state.t),
      onComplete: () => setPlaying(false),
    });
    if (reduced) {
      // One instant step per frame, held long enough to read.
      for (let i = 1; i <= hops; i++) tl.set(state, { t: i }, (i - 1) * 1.2);
      tl.to(state, { t: hops, duration: 0.01 }, hops * 1.2);
    } else {
      tl.to(state, { t: hops, duration: hops * SECONDS_PER_FRAME });
    }

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

  const scrub = (value: number) => {
    const tl = timeline.current;
    if (!tl) return;
    tl.pause();
    setPlaying(false);
    tl.progress(frames.length > 1 ? value / (frames.length - 1) : 0);
  };

  return (
    <div className="relative h-full w-full">
      <MapContainer
        center={center}
        zoom={5}
        style={{ height: "100%", width: "100%" }}
        worldCopyJump
        aria-label="Volcanic ash advisory map"
      >
        {/* CARTO now watermarks unauthenticated tiles ("API KEY REQUIRED") straight
            into the PNG, so the basemap is Esri's keyless gray canvas — also a more
            neutral ground for reading ash polygons against. */}
        <TileLayer
          key={resolvedTheme === "dark" ? "dark" : "light"}
          attribution='Tiles &copy; <a href="https://www.esri.com/">Esri</a>'
          url={resolvedTheme === "dark" ? BASEMAPS.dark : BASEMAPS.light}
          maxZoom={16}
        />
        <MapSync lat={advisory?.position?.[0]} lon={advisory?.position?.[1]} onBoundsChange={onBoundsChange} />

        {tracks.map((track, i) => (
          <Polygon
            key={`${advisory?.advisoryNr ?? "none"}-${track.flightLevel}`}
            ref={(layer) => {
              layerRefs.current[i] = layer;
            }}
            positions={track.rings[0] ?? []}
            pathOptions={{
              color: flightLevelColor(track.flightLevel),
              fillColor: flightLevelColor(track.flightLevel),
              weight: 2,
              fillOpacity: 0.35,
            }}
          >
            <Popup>
              <b>{track.flightLevel}</b>
              {track.movement && (
                <>
                  <br />
                  {track.movement}
                </>
              )}
            </Popup>
          </Polygon>
        ))}

        {advisory?.position && (
          <Marker
            position={advisory.position}
            icon={volcanoIcon()}
            title={`${advisory.volcano ?? "Volcano"} — advisory details`}
            alt={`${advisory.volcano ?? "Volcano"} — advisory details`}
          >
            <Popup>
              <div style={{ minWidth: 220 }}>
                <b>{advisory.volcano}</b> ({advisory.vaac} VAAC)
                <br />
                Advisory {advisory.advisoryNr}
                <br />
                DTG: {advisory.dtg}
                {advisory.eruptionDetails && (
                  <>
                    <br />
                    {advisory.eruptionDetails}
                  </>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* The wind field is 64 arrows. Left interactive, Leaflet gives each one a
            tabindex and a role=button named "↑", which buries every real control
            behind ~65 tab stops and fails target size at 18px. It is a data
            layer, so it is drawn non-interactive; speed is read from the legend
            (and the sidebar carries the numbers a screen reader needs). */}
        {showWind &&
          windVectors.map((v, i) => (
            <Marker key={i} position={[v.lat, v.lon]} icon={windIcon(v)} interactive={false} keyboard={false} />
          ))}
      </MapContainer>

      {canAnimate && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[400] p-3 sm:p-4">
          <div className="pointer-events-auto mx-auto flex max-w-2xl items-center gap-3 rounded-xl border bg-background/85 p-2 shadow-lg backdrop-blur-md">
            <Button size="icon" onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
              {playing ? <Pause className="size-4" aria-hidden="true" /> : <Play className="size-4" aria-hidden="true" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={restart} aria-label="Back to observation">
              <SkipBack className="size-4" aria-hidden="true" />
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
