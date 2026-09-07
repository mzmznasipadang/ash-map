"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Clock } from "lucide-react";

import { formatDtg, formatLocal, formatZulu, localZoneLabel, parseDtg, type TimeMode } from "@/lib/dtg";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/components/i18n";

const KEY = "ash-map:time-mode";

type Ctx = { mode: TimeMode; setMode: (m: TimeMode) => void; zone: string };

const TimeModeContext = createContext<Ctx>({ mode: "zulu", setMode: () => {}, zone: "UTC" });

function readStored(): TimeMode {
  try {
    return localStorage.getItem(KEY) === "local" ? "local" : "zulu";
  } catch {
    return "zulu";
  }
}

export function TimeModeProvider({ children }: { children: React.ReactNode }) {
  // Zulu is the default deliberately: it is what the advisory actually says,
  // and an ops reader expects it. Local is opt-in.
  const [mode, setModeState] = useState<TimeMode>("zulu");

  const setMode = useCallback((next: TimeMode) => {
    setModeState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // private window; the preference just will not persist
    }
  }, []);

  // Read the stored preference on first paint without a hydration mismatch:
  // the server always renders Zulu, and this corrects it on the client.
  const [hydrated, setHydrated] = useState(false);
  if (!hydrated && typeof window !== "undefined") {
    setHydrated(true);
    const stored = readStored();
    if (stored !== mode) setModeState(stored);
  }

  const value = useMemo(
    () => ({ mode, setMode, zone: typeof window === "undefined" ? "UTC" : localZoneLabel() }),
    [mode, setMode]
  );

  return <TimeModeContext.Provider value={value}>{children}</TimeModeContext.Provider>;
}

export function useTimeMode() {
  return useContext(TimeModeContext);
}

/**
 * One date-time group, in the reader's chosen mode, with the other mode on
 * hover. `reference` is the advisory's own issue time, needed because a frame
 * DTG carries a day but no month.
 */
export function Dtg({
  value,
  reference,
  className,
}: {
  value?: string | null;
  reference?: string | null;
  className?: string;
}) {
  const { mode } = useTimeMode();
  const ref = reference ? parseDtg(reference) : null;
  const parsed = parseDtg(value, ref);

  const shown = formatDtg(value, mode, ref);
  const other = parsed ? (mode === "zulu" ? formatLocal(parsed) : formatZulu(parsed)) : undefined;

  return (
    <time
      dateTime={parsed?.toISOString()}
      title={other ? `${shown} — ${other}` : undefined}
      className={className}
    >
      {shown}
    </time>
  );
}

export function TimeModeToggle() {
  const { mode, setMode, zone } = useTimeMode();
  const { t } = useI18n();

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        {(
          [
            ["zulu", t("time.zulu")],
            ["local", t("time.local")],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            variant={mode === key ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={mode === key}
            onClick={() => setMode(key)}
            className="h-7 text-xs"
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        {t("time.explain")}{" "}
        {mode === "local" ? t("time.showingLocal", { zone }) : t("time.switchHint", { zone })}
      </p>
    </div>
  );
}

export function TimeModeIcon() {
  return <Clock className="size-4 text-muted-foreground" aria-hidden="true" />;
}
