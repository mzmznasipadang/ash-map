"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";

import type { FrameKey, VaaAdvisory } from "@/lib/vaa";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export type FeedItem = { file: string; issued: string; advisory: VaaAdvisory; frames: FrameKey[] };

const POLL_MS = 5 * 60 * 1000; // matches the route's cache window

export type DarwinFeedState = {
  items: FeedItem[] | null;
  error: string | null;
  loading: boolean;
  stale: boolean;
  fetchedAt: string | null;
  reload: (force?: boolean) => void;
};

/**
 * Owns the poll. Call this ONCE per page: the advisory panel is rendered twice
 * (sidebar at lg+, slide-over below it), and a fetch inside the view would mean
 * two pollers hitting BOM's FTP for the same data.
 */
export function useDarwinFeed(): DarwinFeedState {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [stale, setStale] = useState(false);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async (force = false) => {
    // Yield before touching state so this is safe to call from an effect: the
    // first fetch on mount is a subscription to an external system, not a
    // render-phase state update.
    await Promise.resolve();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/darwin?limit=5${force ? "&refresh=1" : ""}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Feed unavailable");
      setItems(data.advisories ?? []);
      setFetchedAt(data.fetchedAt ?? null);
      setStale(Boolean(data.stale));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      // Poll only while the tab is visible — this is someone else's FTP server.
      if (!cancelled && document.visibilityState === "visible") load();
    };
    tick();
    timer.current = setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  return { items, error, loading, stale, fetchedAt, reload: load };
}

export function DarwinFeed({
  state,
  onSelect,
}: {
  state: DarwinFeedState;
  onSelect: (item: FeedItem) => void;
}) {
  const { items, error, loading, stale, fetchedAt, reload: load } = state;

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Newest Darwin VAAC bulletins, straight from BOM&apos;s public FTP. Refreshes every 5 minutes.
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
          No Darwin bulletins on the feed right now. Darwin issues these only while a volcano in its area is active.
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
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.advisory.volcano ?? "Unknown volcano"}
                    </span>
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
                    {item.advisory.dtg ?? item.issued} · #{item.advisory.advisoryNr ?? "—"}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {fetchedAt && (
        <p className="text-xs text-muted-foreground">
          Checked {new Date(fetchedAt).toISOString().slice(11, 16)}Z
        </p>
      )}
    </div>
  );
}
