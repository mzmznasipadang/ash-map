"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { findAlert, type VolcanoAlert } from "@/lib/pvmbg";
import { Badge } from "@/components/ui/badge";

// PVMBG's four levels, in the order an operator escalates through them.
// Level IV means evacuation is under way, so it must not look like a hint.
const LEVEL_STYLE: Record<number, string> = {
  1: "border-transparent bg-muted text-muted-foreground",
  2: "border-transparent bg-amber-500/15 text-amber-700 dark:text-amber-400",
  3: "border-transparent bg-orange-600/20 text-orange-700 dark:text-orange-400",
  4: "border-transparent bg-destructive text-white",
};

const ROMAN = ["", "I", "II", "III", "IV"];

export function AlertLevelBadge({ alert, className }: { alert?: VolcanoAlert; className?: string }) {
  if (!alert) return null;
  return (
    <Badge
      className={`${LEVEL_STYLE[alert.level]} ${className ?? ""}`}
      title={`PVMBG alert level ${alert.level} (${alert.levelName}) — ${alert.name}, ${alert.province}`}
    >
      Level {ROMAN[alert.level]} · {alert.levelName}
    </Badge>
  );
}

const POLL_MS = 30 * 60 * 1000;

/** Alert levels for every Indonesian volcano, refreshed twice an hour. */
export function useAlertLevels() {
  const [alerts, setAlerts] = useState<VolcanoAlert[]>([]);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/pvmbg");
      const data = await res.json();
      setAlerts(data.alerts ?? []);
      setStale(Boolean(data.stale));
      setError(data.error ?? null);
      setFetchedAt(data.fetchedAt ?? null);
    } catch (e) {
      // The badges just do not appear — but the health panel should say why.
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") load();
    };
    tick();
    timer.current = setInterval(tick, POLL_MS);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [load]);

  const forVolcano = useCallback((name?: string) => findAlert(name, alerts), [alerts]);

  return { alerts, stale, error, fetchedAt, forVolcano };
}
