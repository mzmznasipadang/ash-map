// Per-locale route metadata.
//
// Real hreflang needs a distinct URL per language, which is why /en and /id
// exist as routes rather than a client-side switch on one address. Each
// declares itself canonical and points at the other, plus x-default for a
// crawler with no language preference.

import type { Metadata } from "next";
import { OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "./site.ts";
import type { Locale } from "./i18n.ts";
import { legalDoc, type LegalKind } from "./legal.ts";

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
      images: [OG_IMAGE],
    },
    twitter: { card: "summary_large_image", title: copy.title, description: copy.description, images: [OG_IMAGE] },
  };
}

/**
 * The legal pages. Same hreflang shape as the map routes — each canonical at
 * its own address, pointing at its translation — so the four URLs are two
 * documents in two languages rather than four unrelated pages.
 *
 * The title is not `absolute` here: these should read "Privacy · AshMap" via
 * the root layout's template, because unlike the map they are a page *of* a
 * site rather than the site itself.
 */
export function legalMetadata(locale: Locale, kind: LegalKind): Metadata {
  const doc = legalDoc(locale, kind);
  return {
    title: doc.title,
    description: doc.description,
    alternates: {
      canonical: `/${locale}/${kind}`,
      languages: {
        en: `/en/${kind}`,
        id: `/id/${kind}`,
        "x-default": `/en/${kind}`,
      },
    },
    openGraph: {
      type: "article",
      url: `/${locale}/${kind}`,
      siteName: SITE_NAME,
      title: `${doc.title} · ${SITE_NAME}`,
      description: doc.description,
      locale: locale === "id" ? "id_ID" : "en_US",
      alternateLocale: locale === "id" ? "en_US" : "id_ID",
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: `${doc.title} · ${SITE_NAME}`,
      description: doc.description,
      images: [OG_IMAGE],
    },
  };
}
