"use client";

import { useEffect, useMemo, useRef } from "react";
import { useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";

import { WIND_BANDS, windColor } from "@/lib/style";
import type { WindVector } from "@/lib/types";

// One SVG layer for the whole wind field, instead of a divIcon marker per
// vector. Sixty-four markers meant sixty-four absolutely-positioned DOM nodes
// that Leaflet repositions on every pan, and a rotated text glyph that cannot
// be tapered, scaled by speed, or drawn with a head. A single <svg> in its own
// pane draws real arrows, costs one node, and repositions as one transform.

const MIN_LEN = 11;
const MAX_LEN = 30;
const PANE = "ash-wind";

/** Arrow length in px, scaled by speed so the field reads at a glance. */
function arrowLength(speedKmh: number): number {
  const t = Math.min(1, Math.max(0, speedKmh / 110));
  return MIN_LEN + (MAX_LEN - MIN_LEN) * Math.sqrt(t);
}

function arrowPath(x: number, y: number, toDeg: number, len: number): string {
  const rad = ((toDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  // Centre the shaft on the sample point.
  const tailX = x - (dx * len) / 2;
  const tailY = y - (dy * len) / 2;
  const tipX = x + (dx * len) / 2;
  const tipY = y + (dy * len) / 2;

  const head = Math.max(4.5, len * 0.34);
  const spread = 0.42;
  const leftX = tipX - head * Math.cos(rad - spread);
  const leftY = tipY - head * Math.sin(rad - spread);
  const rightX = tipX - head * Math.cos(rad + spread);
  const rightY = tipY - head * Math.sin(rad + spread);

  return [
    `M${tailX.toFixed(1)} ${tailY.toFixed(1)}L${tipX.toFixed(1)} ${tipY.toFixed(1)}`,
    `M${leftX.toFixed(1)} ${leftY.toFixed(1)}L${tipX.toFixed(1)} ${tipY.toFixed(1)}L${rightX.toFixed(1)} ${rightY.toFixed(1)}`,
  ].join("");
}

export function WindLayer({ vectors, visible }: { vectors: WindVector[]; visible: boolean }) {
  const map = useMap();
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Its own pane, below markers and above tiles, so arrows never sit on top of
  // a volcano marker or intercept a click meant for a polygon.
  useEffect(() => {
    if (!map.getPane(PANE)) {
      const pane = map.createPane(PANE);
      // Above the ash polygons (overlayPane, 400) and below the airport pins
      // (500): wind reads as the thing moving the cloud, not under it.
      pane.style.zIndex = "450";
      pane.style.pointerEvents = "none";
    }
    const pane = map.getPane(PANE)!;

    const svg = L.SVG.create("svg") as SVGSVGElement;
    svg.setAttribute("aria-hidden", "true");
    svg.style.position = "absolute";
    svg.style.left = "0";
    svg.style.top = "0";
    svg.style.overflow = "visible";
    pane.appendChild(svg);
    svgRef.current = svg;

    return () => {
      svg.remove();
      svgRef.current = null;
    };
  }, [map]);

  const draw = useMemo(() => {
    return () => {
      const svg = svgRef.current;
      if (!svg) return;
      if (!visible || vectors.length === 0) {
        svg.replaceChildren();
        return;
      }

      const size = map.getSize();
      const origin = map.containerPointToLayerPoint([0, 0]);
      svg.setAttribute("width", String(size.x));
      svg.setAttribute("height", String(size.y));
      svg.setAttribute("viewBox", `0 0 ${size.x} ${size.y}`);
      L.DomUtil.setPosition(svg as unknown as HTMLElement, origin);

      // Group by colour band: one <path> per band instead of one per arrow,
      // which keeps this to a handful of nodes however dense the field gets.
      const byColor = new Map<string, string[]>();
      for (const v of vectors) {
        const p = map.latLngToContainerPoint([v.lat, v.lon]);
        if (p.x < -40 || p.y < -40 || p.x > size.x + 40 || p.y > size.y + 40) continue;
        const toDeg = (v.directionDeg + 180) % 360; // "from" -> "to"
        const color = windColor(v.speedKmh);
        const list = byColor.get(color) ?? [];
        list.push(arrowPath(p.x, p.y, toDeg, arrowLength(v.speedKmh)));
        byColor.set(color, list);
      }

      const paths = [...byColor.entries()].map(([color, ds]) => {
        const path = L.SVG.create("path") as SVGPathElement;
        path.setAttribute("d", ds.join(""));
        path.setAttribute("stroke", color);
        path.setAttribute("stroke-width", "2");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        path.setAttribute("fill", "none");
        path.setAttribute("opacity", "0.9");
        return path;
      });
      svg.replaceChildren(...paths);
    };
  }, [map, vectors, visible]);

  useMapEvents({ move: draw, zoom: draw, resize: draw, zoomend: draw, moveend: draw });

  useEffect(() => {
    draw();
  }, [draw]);

  return null;
}

/** Speed bands, for the legend. Same source as the arrow colours. */
export const WIND_LEGEND = WIND_BANDS;
