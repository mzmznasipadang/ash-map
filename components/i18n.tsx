"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Languages } from "lucide-react";

import { detectLocale, isLocale, LOCALES, translate, type Locale, type MessageKey } from "@/lib/i18n";
import { Button } from "@/components/ui/button";

const KEY = "ash-map:locale";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<Ctx>({ locale: "en", setLocale: () => {}, t: (k) => translate("en", k) });

function stored(): Locale | null {
  try {
    const v = localStorage.getItem(KEY);
    return isLocale(v) ? v : null;
  } catch {
    return null;
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  // The server has no navigator and no localStorage, so it renders English and
  // the client corrects it on first paint. Adjusting during render rather than
  // in an effect keeps that to one pass.
  const [locale, setLocaleState] = useState<Locale>("en");
  const [resolved, setResolved] = useState(false);
  if (!resolved && typeof window !== "undefined") {
    setResolved(true);
    const next = stored() ?? detectLocale(navigator.languages ?? [navigator.language]);
    if (next !== locale) setLocaleState(next);
  }

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      // private window; the choice just will not persist
    }
    if (typeof document !== "undefined") document.documentElement.lang = next;
  }, []);

  const value = useMemo<Ctx>(
    () => ({ locale, setLocale, t: (key, params) => translate(locale, key, params) }),
    [locale, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/** Compact two-way switch; there are only two locales. */
export function LocaleToggle({ className }: { className?: string }) {
  const { locale, setLocale, t } = useI18n();
  const next = locale === "en" ? "id" : "en";

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setLocale(next)}
      aria-label={`${t("lang.label")}: ${LOCALES.find((l) => l.code === next)?.native}`}
      className={`h-8 gap-1.5 px-2 text-xs font-medium ${className ?? ""}`}
    >
      <Languages className="size-4" aria-hidden="true" />
      {locale.toUpperCase()}
    </Button>
  );
}
