"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import type { FrameKey, VaaAdvisory } from "@/lib/vaa";
import type { AshAssessment } from "@/lib/eruption";
import { Badge } from "@/components/ui/badge";
import { Dtg } from "@/components/time-mode";
import { AlertLevelBadge } from "@/components/alert-level";
import { findAlert, type VolcanoAlert } from "@/lib/pvmbg";
import { Label } from "@/components/ui/label";

/** An ISO instant as a full DTG, so <Dtg> can render it in the chosen mode. */
function toDtg(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}/${p(d.getUTCHours())}${p(d.getUTCMinutes())}Z`;
}
import { Button } from "@/components/ui/button";

export type FeedItem = {
  file: string;
  issued: string;
  advisory: VaaAdvisory;
  frames: FrameKey[];
  ash: AshAssessment;
};

const SEEN_KEY = "ash-map:darwin-last-seen";

/**
 * "Is there an update from Darwin?" is answered by the newest filename, which
 * embeds the issue time. Comparing it to the last one this browser saw is
 * enough; it survives reloads via localStorage, which can throw or come back
 * empty, so every access is guarded.
 */
function readLastSeen(): string | null {
  try {
    return localStorage.getItem(SEEN_KEY);
  } catch {
    return null;
  }
}

function writeLastSeen(file: string) {
  try {
    localStorage.setItem(SEEN_KEY, file);
  } catch {
    // private window or blocked storage: the badge just will not persist
  }
}

// Darwin re-advises a volcano at most hourly, so polling faster than this
// spends someone else's bandwidth for nothing. 30 minutes is the default;
// "Off" is offered because an unattended tab should not poll forever.
export const REFRESH_INTERVALS = [
  { ms: 0, label: "Off" },
  { ms: 15 * 60 * 1000, label: "15 min" },
  { ms: 30 * 60 * 1000, label: "30 min" },
  { ms: 60 * 60 * 1000, label: "1 hour" },
] as const;

const DEFAULT_INTERVAL_MS = 30 * 60 * 1000;
const INTERVAL_KEY = "ash-map:refresh-interval";

function readInterval(): number {
  try {
    const raw = localStorage.getItem(INTERVAL_KEY);
    // Check for absence BEFORE converting: Number(null) is 0, and 0 is a real
    // option here ("Off"), so a missing preference would silently disable
    // auto-refresh instead of using the default.
    if (raw === null) return DEFAULT_INTERVAL_MS;
    const stored = Number(raw);
    return REFRESH_INTERVALS.some((i) => i.ms === stored) ? stored : DEFAULT_INTERVAL_MS;
  } catch {
    return DEFAULT_INTERVAL_MS;
  }
}

export type DarwinFeedState = {
  items: FeedItem[] | null;
  /** Bulletins returned before the area filter, so "0 shown" is explainable. */
  total: number;
  fetchStats: { scanned: number; downloaded: number; fromCache: number } | null;
  error: string | null;
  loading: boolean;
  stale: boolean;
  fetchedAt: string | null;
  /** Files newer than the last one this browser acknowledged. */
  unseen: Set<string>;
  area: string | null;
  setArea: (area: string | null) => void;
  /** Auto-refresh period in ms; 0 means off. */
  intervalMs: number;
  setIntervalMs: (ms: number) => void;
  reload: (force?: boolean) => void;
  acknowledge: () => void;
};

/**
 * Owns the poll. Call this ONCE per page: the advisory panel is rendered twice
 * (sidebar at lg+, slide-over below it), and a fetch inside the view would mean
 * two pollers hitting BOM's FTP for the same data.
 */
export function useDarwinFeed({
  onFirstLoad,
}: {
  /** Called once, with every advisory on the feed, so the map can plot them all. */
  onFirstLoad?: (items: FeedItem[]) => void;
} = {}): DarwinFeedState {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [total, setTotal] = useState(0);
  const [fetchStats, setFetchStats] = useState<{ scanned: number; downloaded: number; fromCache: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [unseen, setUnseen] = useState<Set<string>>(new Set());
  const [area, setAreaState] = useState<string | null>("indonesia");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const areaRef = useRef<string | null>("indonesia");
  const autoPlotted = useRef(false);
  const [intervalMs, setIntervalMsState] = useState<number>(DEFAULT_INTERVAL_MS);
  const lastCheck = useRef(0);

  // Pick up the stored preference during render rather than in an effect: the
  // server has no localStorage, so it always renders the default and this
  // corrects it on the client without a second commit.
  const [readStoredInterval, setReadStoredInterval] = useState(false);
  if (!readStoredInterval && typeof window !== "undefined") {
    setReadStoredInterval(true);
    const stored = readInterval();
    if (stored !== intervalMs) setIntervalMsState(stored);
  }

  const load = useCallback(async (force = false) => {
    // Yield before touching state so this is safe to call from an effect: the
    // first fetch on mount is a subscription to an external system, not a
    // render-phase state update.
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "5" });
      if (areaRef.current) params.set("area", areaRef.current);
      if (force) params.set("refresh", "1");

      lastCheck.current = Date.now();
      const res = await fetch(`/api/darwin?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feed unavailable");

      const list: FeedItem[] = data.advisories ?? [];
      setItems(list);
      setTotal(data.total ?? list.length);
      setFetchStats(data.fetch ?? null);
      setFetchedAt(data.fetchedAt ?? null);
      setStale(Boolean(data.stale));

      // Anything newer than the last acknowledged file is an update.
      const lastSeen = readLastSeen();
      setUnseen(new Set(lastSeen ? list.filter((i) => i.file > lastSeen).map((i) => i.file) : []));

      // Plot every advisory once, so the app opens showing every volcano
      // currently under advisory — but never yank the map away from a
      // selection the reader made themselves.
      if (!autoPlotted.current) {
        const plottable = list.filter((i) => i.frames.length > 0);
        if (plottable.length > 0) {
          autoPlotted.current = true;
          onFirstLoad?.(plottable);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [onFirstLoad]);

  useEffect(() => {
    let cancelled = false;

    const tick = () => {
      // Poll only while the tab is visible — this is someone else's FTP server.
      if (!cancelled && document.visibilityState === "visible") load();
    };

    tick();

    // Coming back to a tab that sat hidden past the interval should show fresh
    // data immediately, not whatever was on screen when it was backgrounded.
    const onVisible = () => {
      if (cancelled || document.visibilityState !== "visible") return;
      if (intervalMs > 0 && Date.now() - lastCheck.current >= intervalMs) load();
    };
    document.addEventListener("visibilitychange", onVisible);

    if (intervalMs > 0) timer.current = setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current) clearInterval(timer.current);
    };
  }, [load, intervalMs]);

  const setIntervalMs = useCallback((ms: number) => {
    setIntervalMsState(ms);
    try {
      localStorage.setItem(INTERVAL_KEY, String(ms));
    } catch {
      // private window; the preference just will not persist
    }
  }, []);

  const setArea = useCallback(
    (next: string | null) => {
      areaRef.current = next;
      setAreaState(next);
      // Changing the area is a request for a different set of volcanoes, so the
      // map has to be re-plotted. The once-only guard exists to stop a routine
      // poll from stealing the reader's selection, not to freeze the filter.
      autoPlotted.current = false;
      load();
    },
    [load]
  );

  const acknowledge = useCallback(() => {
    const newest = items?.[0]?.file;
    if (newest) {
      writeLastSeen(newest);
      setUnseen(new Set());
    }
  }, [items]);

  return {
    items,
    total,
    fetchStats,
    error,
    loading,
    stale,
    fetchedAt,
    unseen,
    area,
    setArea,
    intervalMs,
    setIntervalMs,
    reload: load,
    acknowledge,
  };
}

export function DarwinFeed({
  state,
  onSelect,
  alerts = [],
}: {
  state: DarwinFeedState;
  onSelect: (item: FeedItem) => void;
  alerts?: VolcanoAlert[];
}) {
  const {
    items,
    total,
    error,
    loading,
    stale,
    fetchedAt,
    unseen,
    area,
    setArea,
    intervalMs,
    setIntervalMs,
    reload: load,
    acknowledge,
  } = state;
  const intervalLabel = REFRESH_INTERVALS.find((i) => i.ms === intervalMs)?.label ?? "Off";
  const hidden = total - (items?.length ?? 0);

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Newest Darwin VAAC bulletins, straight from BOM&apos;s public FTP.
          {intervalMs > 0 ? ` Checked every ${intervalLabel}.` : " Auto-refresh is off."}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => load(true)}
          disabled={loading}
          aria-busy={loading}
          className="h-7 shrink-0 gap-1.5 text-xs"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden="true" />
          )}
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-1.5">
        {[
          { key: "indonesia", label: "Indonesia" },
          { key: null, label: "All of Darwin" },
        ].map((opt) => (
          <Button
            key={opt.label}
            variant={area === opt.key ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={area === opt.key}
            onClick={() => setArea(opt.key)}
            className="h-7 text-xs"
          >
            {opt.label}
          </Button>
        ))}
      </div>

      {unseen.size > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-primary/40 bg-primary/5 px-3 py-2">
          <p className="text-xs font-medium" role="status">
            {unseen.size} new bulletin{unseen.size > 1 ? "s" : ""} since you last looked
          </p>
          <Button variant="ghost" size="sm" onClick={acknowledge} className="h-6 shrink-0 text-xs">
            Mark seen
          </Button>
        </div>
      )}

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      {stale && !error && (
        <p className="text-xs text-muted-foreground">Showing the last successful fetch; BOM did not respond.</p>
      )}

      {items === null && loading && <p className="text-xs text-muted-foreground">Contacting ftp.bom.gov.au…</p>}

      {items?.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {hidden > 0 ? (
            <>
              None of the {total} bulletins on the feed are in Indonesia. Darwin&apos;s area also covers Papua New
              Guinea, East Timor and the south Pacific — switch to &ldquo;All of Darwin&rdquo; to see them.
            </>
          ) : (
            <>No Darwin bulletins on the feed. Darwin issues these only while a volcano in its area is active.</>
          )}
        </p>
      )}

      {items && items.length > 0 && (
        <ul className="space-y-1.5">
          {items.map((item) => {
            const drawable = item.frames.length > 0;
            return (
              <li key={item.file}>
                <button
                  onClick={() => onSelect(item)}
                  className="flex w-full flex-col items-start gap-1 rounded-md border px-3 py-2 text-left text-xs hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  <span className="flex w-full items-center gap-2">
                    {unseen.has(item.file) && (
                      <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-label="New since you last looked" />
                    )}
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.advisory.volcano ?? "Unknown volcano"}
                    </span>
                    <AlertLevelBadge
                      alert={findAlert(item.advisory.volcano, alerts)}
                      className="shrink-0 text-[10px]"
                    />
                    {drawable ? (
                      <Badge variant="secondary" className="shrink-0 text-[10px]">
                        {item.frames.length} frame{item.frames.length > 1 ? "s" : ""}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        no cloud
                      </Badge>
                    )}
                  </span>
                  <span className="font-mono text-muted-foreground">
                    <Dtg value={item.advisory.dtg} /> · #{item.advisory.advisoryNr ?? "—"}
                  </span>
                  <span className="text-muted-foreground">{item.ash.summary}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <div className="space-y-2 border-t pt-3">
        <Label htmlFor="refresh-interval" className="text-xs">
          Auto-refresh
        </Label>
        <div className="flex flex-wrap items-center gap-1" id="refresh-interval" role="group">
          {REFRESH_INTERVALS.map((opt) => (
            <Button
              key={opt.ms}
              variant={intervalMs === opt.ms ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={intervalMs === opt.ms}
              onClick={() => setIntervalMs(opt.ms)}
              className="h-7 text-xs"
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {fetchedAt ? (
          <p className="text-xs text-muted-foreground">
            Checked <Dtg value={toDtg(fetchedAt)} />
          </p>
        ) : (
          <span />
        )}
        <a
          href={`/api/darwin/geojson?${new URLSearchParams({ limit: "5", download: "1", ...(area ? { area } : {}) })}`}
          className="rounded-sm text-xs underline underline-offset-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Download GeoJSON
        </a>
      </div>
    </div>
  );
}
