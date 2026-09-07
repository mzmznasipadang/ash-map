"use client";

import { Activity, AlertTriangle, CircleSlash, Clock, HelpCircle, ShieldCheck, XCircle } from "lucide-react";

import { needsAttention, worstState, type SourceHealth, type SourceState } from "@/lib/health";
import { useI18n } from "@/components/i18n";
import { Badge } from "@/components/ui/badge";

const SOURCE_KEY = {
  darwin: "health.source.darwin",
  pvmbg: "health.source.pvmbg",
  wind: "health.source.wind",
  notams: "health.source.notams",
} as const;

const STATE_KEY = {
  ok: "health.state.ok",
  suspect: "health.state.suspect",
  failed: "health.state.failed",
  stale: "health.state.stale",
  unknown: "health.state.unknown",
  unconfigured: "health.state.unconfigured",
} as const;

function StateIcon({ state }: { state: SourceState }) {
  const cls = "size-3.5 shrink-0";
  switch (state) {
    // "Answered with nothing" is the one worth a warning triangle: a failure
    // is already visible wherever the data was needed.
    case "suspect":
      return <AlertTriangle className={`${cls} text-amber-600 dark:text-amber-400`} aria-hidden="true" />;
    case "failed":
      return <XCircle className={`${cls} text-destructive`} aria-hidden="true" />;
    case "stale":
      return <Clock className={`${cls} text-amber-600 dark:text-amber-400`} aria-hidden="true" />;
    case "unknown":
      return <HelpCircle className={`${cls} text-muted-foreground`} aria-hidden="true" />;
    case "unconfigured":
      return <CircleSlash className={`${cls} text-muted-foreground`} aria-hidden="true" />;
    default:
      return <ShieldCheck className={`${cls} text-emerald-600 dark:text-emerald-400`} aria-hidden="true" />;
  }
}

function useAgeLabel() {
  const { t } = useI18n();
  return (ms?: number) => {
    if (ms === undefined) return null;
    const mins = Math.round(ms / 60_000);
    if (mins < 2) return t("health.ageNow");
    const age = mins < 60 ? `${mins} min` : mins < 60 * 48 ? `${Math.round(mins / 60)} h` : `${Math.round(mins / 1440)} d`;
    return t("health.age", { age });
  };
}

export function SourcesHealth({ health }: { health: SourceHealth[] }) {
  const { t, tc } = useI18n();
  const ageLabel = useAgeLabel();
  const attention = health.filter((h) => needsAttention(h.state));

  return (
    <div className="space-y-3 text-xs">
      <p className="leading-relaxed text-muted-foreground">{t("health.blurb")}</p>

      <Badge variant={attention.length === 0 ? "secondary" : "destructive"}>
        {attention.length === 0 ? t("health.allOk") : tc("health.attention", attention.length)}
      </Badge>

      <ul className="space-y-2">
        {health.map((h) => {
          const age = ageLabel(h.ageMs);
          return (
            <li key={h.id} className="flex items-start gap-2">
              <span className="mt-0.5">
                <StateIcon state={h.state} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t(SOURCE_KEY[h.id])}</span>
                <span className="block text-muted-foreground">
                  {t(STATE_KEY[h.state])}
                  {h.detail ? ` — ${h.detail}` : ""}
                  {age ? ` · ${age}` : ""}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One dot in the header, so a degraded source is visible without opening anything. */
export function HealthIndicator({ health }: { health: SourceHealth[] }) {
  const { t } = useI18n();
  const state = worstState(health);
  if (!needsAttention(state)) return null;

  const color = state === "failed" ? "bg-destructive" : "bg-amber-500";
  return (
    <span
      title={t("health.indicator", { state: t(STATE_KEY[state]) })}
      className="flex items-center gap-1.5 rounded-full border px-2 py-1"
    >
      <Activity className="size-3.5 text-muted-foreground" aria-hidden="true" />
      <span className={`size-2 rounded-full ${color}`} aria-hidden="true" />
      <span className="sr-only">{t("health.indicator", { state: t(STATE_KEY[state]) })}</span>
    </span>
  );
}
