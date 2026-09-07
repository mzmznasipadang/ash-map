"use client";

import { useState } from "react";
import { ChevronRight, FileWarning, Loader2, PlaneLanding } from "lucide-react";

import type { AirportImpact } from "@/lib/impact";
import type { FrameKey } from "@/lib/vaa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { relativeToNow } from "@/lib/dtg";

type Impact = AirportImpact & { volcanoes?: string[] };

const FRAME_ORDER: FrameKey[] = ["OBS", "+6HR", "+12HR", "+18HR", "+24HR"];

/** Bands per frame, so a row reads "OBS: SFC/FL150, FL150/FL500". */
function byFrame(impact: Impact) {
  const map = new Map<FrameKey, Set<string>>();
  for (const h of impact.hits) {
    const set = map.get(h.frame) ?? new Set<string>();
    set.add(h.flightLevel);
    map.set(h.frame, set);
  }
  return FRAME_ORDER.filter((f) => map.has(f)).map((f) => ({ frame: f, levels: [...map.get(f)!] }));
}

type NotamItem = {
  id: string;
  body: string;
  scope: string | null;
  effective: string | null;
  expiration: string | null;
  expirationEstimated?: boolean;
  permanent?: boolean;
  ashRelated: boolean;
  closure: boolean;
};

type NotamState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "unconfigured"; message: string }
  | { status: "error"; message: string; hint?: string }
  | { status: "ok"; count: number; ashRelated: number; closures: number; notams: NotamItem[] };

function NotamPanel({ icao }: { icao: string }) {
  const [state, setState] = useState<NotamState>({ status: "idle" });

  const load = async () => {
    setState({ status: "loading" });
    try {
      const res = await fetch(`/api/notams/${icao}`);
      const data = await res.json();
      if (data.configured === false) {
        setState({ status: "unconfigured", message: data.message });
      } else if (!res.ok) {
        setState({ status: "error", message: data.error ?? `Lookup failed (${res.status})`, hint: data.hint });
      } else {
        setState({
          status: "ok",
          count: data.count,
          ashRelated: data.ashRelated,
          closures: data.closures ?? 0,
          notams: data.notams ?? [],
        });
      }
    } catch (e) {
      setState({ status: "error", message: (e as Error).message });
    }
  };

  if (state.status === "idle") {
    return (
      <Button variant="outline" size="sm" onClick={load} className="h-7 w-full gap-1.5 text-xs">
        <FileWarning className="size-3.5" aria-hidden="true" />
        Check published NOTAMs
      </Button>
    );
  }

  if (state.status === "loading") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" aria-live="polite">
        <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
        Reading NOTAMs for {icao}…
      </p>
    );
  }

  if (state.status === "unconfigured") {
    return <p className="text-xs leading-relaxed text-muted-foreground">{state.message}</p>;
  }

  if (state.status === "error") {
    return (
      <div className="space-y-1.5" role="alert">
        <p className="text-xs text-destructive">{state.message}</p>
        {state.hint && <p className="text-xs leading-relaxed text-muted-foreground">{state.hint}</p>}
        <Button variant="ghost" size="sm" onClick={load} className="h-6 text-xs">
          Retry
        </Button>
      </div>
    );
  }

  if (state.count === 0) {
    return <p className="text-xs text-muted-foreground">No active NOTAMs returned for {icao}.</p>;
  }

  // Ash notices and closures are the reason to look; the rest is counted, not
  // listed. A busy hub returns ninety-odd NOTAMs, almost all en-route.
  const notable = state.notams.filter((n) => n.ashRelated || n.closure);
  const shown = notable.length > 0 ? notable.slice(0, 4) : state.notams.slice(0, 2);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant="outline" className="text-[10px]">
          {state.count} active
        </Badge>
        {state.ashRelated > 0 && (
          <Badge variant="destructive" className="text-[10px]">
            {state.ashRelated} volcanic ash
          </Badge>
        )}
        {state.closures > 0 && (
          <Badge variant="secondary" className="text-[10px]">
            {state.closures} closure{state.closures === 1 ? "" : "s"}
          </Badge>
        )}
      </div>

      <ul className="space-y-1.5">
        {shown.map((n, i) => (
          <li
            key={n.id || i}
            className={`space-y-1 rounded-md px-2 py-1.5 ${
              n.ashRelated ? "bg-destructive/10" : n.closure ? "bg-muted" : "bg-muted/50"
            }`}
          >
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="font-mono text-[10px] text-muted-foreground">{n.id}</span>
              {n.ashRelated && (
                <Badge variant="destructive" className="text-[10px]">
                  Volcanic ash
                </Badge>
              )}
              {n.closure && !n.ashRelated && (
                <Badge variant="secondary" className="text-[10px]">
                  Closure
                </Badge>
              )}
            </p>
            <p className="text-[11px] leading-relaxed text-foreground">{n.body || "(no item E text)"}</p>
            {n.effective && (
              <p className="font-mono text-[10px] text-muted-foreground">
                {new Date(n.effective).toISOString().slice(0, 16).replace("T", " ")}Z &rarr;{" "}
                {n.expiration
                  ? `${new Date(n.expiration).toISOString().slice(0, 16).replace("T", " ")}Z (ends ${relativeToNow(
                      new Date(n.expiration)
                    )}${n.expirationEstimated ? ", estimated" : ""})`
                  : n.permanent
                    ? "permanent"
                    : "until further notice"}
              </p>
            )}
          </li>
        ))}
      </ul>

      {notable.length > shown.length && (
        <p className="text-xs text-muted-foreground">
          {notable.length - shown.length} more ash or closure notice
          {notable.length - shown.length === 1 ? "" : "s"} not shown.
        </p>
      )}
      <p className="text-[10px] text-muted-foreground">Source: SkyLink NOTAM API (FAA SWIM FNS)</p>
    </div>
  );
}

function ImpactRow({ impact }: { impact: Impact }) {
  const [open, setOpen] = useState(false);
  const { airport, now, anySurface, maxCeiling, firstFrame } = impact;

  return (
    <li className="rounded-md border">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <span className="flex items-center gap-2">
            <span className="font-mono text-sm font-semibold">{airport.iata}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{airport.name}</span>
            {/* Surface-based ash is the operational emergency; ash only aloft is
                a routing problem. The badge says which, in words. */}
            <Badge
              variant={anySurface ? "destructive" : "secondary"}
              className="shrink-0 text-[10px] whitespace-nowrap"
            >
              {anySurface ? "To surface" : "Aloft only"}
            </Badge>
          </span>
          <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-xs text-muted-foreground">
            <span className={now ? "font-medium text-foreground" : ""}>{now ? "now" : firstFrame}</span>
            <span aria-hidden="true">·</span>
            <span>to FL{maxCeiling}</span>
            <span aria-hidden="true">·</span>
            <span>{airport.icao}</span>
          </span>
        </span>
        <ChevronRight
          className={`mt-0.5 size-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div className="space-y-1.5 border-t px-3 py-2 text-xs">
          <p className="text-muted-foreground">
            {airport.city}
            {impact.volcanoes?.length ? ` · from ${impact.volcanoes.join(", ")}` : ""}
          </p>
          <dl className="space-y-1">
            {byFrame(impact).map(({ frame, levels }) => (
              <div key={frame} className="flex gap-2 font-mono">
                <dt className="w-14 shrink-0 text-foreground">{frame}</dt>
                <dd className="text-muted-foreground">{levels.join(", ")}</dd>
              </div>
            ))}
          </dl>
          <Separator />
          {/* Geometry says the airport is under a cloud; only the aerodrome's
              own authority says whether it is restricted. */}
          <NotamPanel icao={airport.icao} />
        </div>
      )}
    </li>
  );
}

export function AirportImpactList({ impacts }: { impacts: Impact[] }) {
  const [showAll, setShowAll] = useState(false);

  if (impacts.length === 0) {
    return (
      <p className="text-xs leading-relaxed text-muted-foreground">
        No airport in the dataset falls inside a plotted ash polygon, on any frame of the advisories currently on the
        map. That is the common case: most clouds drift over water.
      </p>
    );
  }

  const nowCount = impacts.filter((i) => i.now).length;
  const surfaceCount = impacts.filter((i) => i.anySurface).length;
  const shown = showAll ? impacts : impacts.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <Badge variant={nowCount ? "destructive" : "secondary"}>
          {nowCount} affected now
        </Badge>
        <Badge variant="outline">{impacts.length - nowCount} forecast</Badge>
        {surfaceCount > 0 && <Badge variant="outline">{surfaceCount} to surface</Badge>}
      </div>

      <ul className="space-y-1.5">
        {shown.map((impact) => (
          <ImpactRow key={impact.airport.icao} impact={impact} />
        ))}
      </ul>

      {impacts.length > shown.length && (
        <Button variant="ghost" size="sm" onClick={() => setShowAll(true)} className="h-7 w-full text-xs">
          Show {impacts.length - shown.length} more
        </Button>
      )}

      <Separator />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Geometry only: an airport is listed when it falls inside an advisory polygon. Whether an aerodrome is actually
        closed is decided by its authority and published as a NOTAM or ASHTAM, which this does not read.
      </p>
    </div>
  );
}

export function AirportImpactIcon() {
  return <PlaneLanding className="size-4 text-muted-foreground" aria-hidden="true" />;
}
