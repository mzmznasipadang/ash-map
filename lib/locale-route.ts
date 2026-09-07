// Per-locale route metadata.
//
// Real hreflang needs a distinct URL per language, which is why /en and /id
// exist as routes rather than a client-side switch on one address. Each
// declares itself canonical and points at the other, plus x-default for a
// crawler with no language preference.

import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "./site.ts";
import type { Locale } from "./i18n.ts";

const COPY: Record<Locale, { title: string; description: string }> = {
  en: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: SITE_DESCRIPTION,
  },
  id: {
    title: `${SITE_NAME} — Pantau abu vulkanik di Indonesia`,
    description:
      "Pantau abu vulkanik di Indonesia: adviso VAAC Darwin terkini yang dipetakan menurut flight level, dengan angin terkini, animasi pergerakan prakiraan, tingkat aktivitas gunung api PVMBG, dan bandara yang terdampak abu.",
  },
};

export function localeMetadata(locale: Locale): Metadata {
  const copy = COPY[locale];
  return {
    // `absolute` so the root layout's "%s · AshMap" template does not append
    // the brand to a title that already opens with it.
    title: { absolute: copy.title },
    description: copy.description,
    alternates: {
      canonical: `/${locale}`,
      languages: {
        en: "/en",
        id: "/id",
        // Served to a crawler with no matching preference.
        "x-default": "/en",
      },
    },
    openGraph: {
      type: "website",
      url: `/${locale}`,
      siteName: SITE_NAME,
      title: copy.title,
      description: copy.description,
      locale: locale === "id" ? "id_ID" : "en_US",
      alternateLocale: locale === "id" ? "en_US" : "id_ID",
    },
    twitter: { card: "summary_large_image", title: copy.title, description: copy.description },
  };
}
