"use client";

// Analytics consent.
//
// The site sets no cookies, and Vercel's analytics are cookieless — so under
// ePrivacy none of this is strictly required. It is here because a third-party
// script is still a third-party request, and the honest way to offer a choice
// is to let the choice actually decide: declining means the scripts are never
// fetched, rather than fetched and asked politely to behave.
//
// ponytail: the answer lives in localStorage, not a cookie. A cookie would be
// sent on every request for no reason, and would make the banner the only
// cookie on a site whose privacy page says there are none.

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { detectLocale, isLocale, translate, type Locale } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const KEY = "ash-map:analytics";

/**
 * "unknown" is the server's answer and the first client render's answer, so
 * hydration matches and the banner cannot flash for someone who already
 * decided. Everything else is what storage actually says.
 */
type Choice = "yes" | "no" | "unset" | "unknown";

// localStorage has no change event for the tab that wrote it, so subscribers
// are kept here and poked by hand. `storage` covers the other tabs.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function snapshot(): Choice {
  try {
    const value = localStorage.getItem(KEY);
    return value === "yes" || value === "no" ? value : "unset";
  } catch {
    // Storage unavailable (private mode, blocked site data). Treat that as
    // unanswered: the banner reappears, and nothing is ever loaded silently.
    return "unset";
  }
}

function serverSnapshot(): Choice {
  return "unknown";
}

function write(value: "yes" | "no" | null) {
  try {
    if (value === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, value);
  } catch {
    // Unstorable: the choice holds for this page view and is asked again next
    // time, which is the safe direction to fail in.
  }
  for (const notify of listeners) notify();
}

/** Reopens the banner from anywhere on the page. */
export function ReopenConsent({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => write(null)}>
      {children}
    </button>
  );
}

/**
 * The root layout renders one of these for the whole app, so it cannot sit
 * inside the per-route I18nProvider. The locale is in the path for the same
 * reason hreflang works — read it from there.
 */
function useRouteLocale(): Locale {
  const pathname = usePathname();
  const first = pathname?.split("/")[1];
  return isLocale(first) ? first : detectLocale();
}

export function AnalyticsConsent() {
  const locale = useRouteLocale();
  const choice = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const t = (key: Parameters<typeof translate>[1]) => translate(locale, key);

  if (choice === "unknown") return null;

  if (choice !== "unset") {
    return choice === "yes" ? (
      <>
        <Analytics />
        <SpeedInsights />
      </>
    ) : null;
  }

  return (
    <div
      role="dialog"
      aria-label={t("consent.title")}
      // Inset rather than edge-to-edge so it reads as a card on a phone, and
      // the safe-area margin keeps it clear of the iOS home indicator.
      className="fixed inset-x-2 bottom-2 z-1100 mx-auto max-w-md rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-md sm:inset-x-auto sm:right-4 sm:bottom-4"
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
    >
      <p className="text-sm font-medium">{t("consent.title")}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t("consent.body")}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" className="h-8 flex-1 text-xs sm:flex-none" onClick={() => write("yes")}>
          {t("consent.accept")}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 flex-1 text-xs sm:flex-none"
          onClick={() => write("no")}
        >
          {t("consent.decline")}
        </Button>
        <Link
          href={`/${locale}/privacy`}
          className="rounded-sm px-1 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          {t("consent.more")}
        </Link>
      </div>
    </div>
  );
}
