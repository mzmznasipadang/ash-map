"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";

import {
  LOCALES,
  translate,
  translateCount,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";
import { Button } from "@/components/ui/button";

type Ctx = {
  locale: Locale;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
  /** Plural-aware, for the counted strings. */
  tc: (base: Parameters<typeof translateCount>[1], count: number) => string;
};

const I18nContext = createContext<Ctx>({
  locale: "en",
  t: (k) => translate("en", k),
  tc: (b, c) => translateCount("en", b, c),
});

/**
 * The locale comes from the route (/en, /id), so a URL is shareable and each
 * language has an address of its own for hreflang. That also removes the old
 * conflict where a stored preference could disagree with what the URL said.
 */
export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  // The root layout renders one <html>, so it cannot vary lang per route.
  // Correct it here; the app needs JavaScript to draw anything anyway.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<Ctx>(
    () => ({
      locale,
      t: (key, params) => translate(locale, key, params),
      tc: (base, count) => translateCount(locale, base, count),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}

/**
 * A link, not a state toggle: each language is a real URL, so switching should
 * change the address and be shareable and indexable.
 */
export function LocaleToggle({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const pathname = usePathname();
  const next = locale === "en" ? "id" : "en";
  const href = pathname?.replace(/^\/(en|id)\b/, `/${next}`) ?? `/${next}`;

  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      className={`h-8 gap-1.5 px-2 text-xs font-medium ${className ?? ""}`}
    >
      <Link href={href} hrefLang={next} aria-label={`${t("lang.label")}: ${LOCALES.find((l) => l.code === next)?.native}`}>
        <Languages className="size-4" aria-hidden="true" />
        {locale.toUpperCase()}
      </Link>
    </Button>
  );
}
