// The privacy policy and terms, rendered from lib/legal.ts.
//
// A server component on purpose: this is static prose with no state, so it can
// be sent as real HTML rather than as an app shell a crawler has to execute.
// That is the opposite of the map, and it is why these two pages are the only
// indexable text on the site besides the noscript block.

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { legalDoc, type LegalKind } from "@/lib/legal";
import { translate, type Locale } from "@/lib/i18n";
import { SITE_NAME } from "@/lib/site";
import { ReopenConsent } from "@/components/consent";

export function LegalPage({ locale, kind }: { locale: Locale; kind: LegalKind }) {
  const doc = legalDoc(locale, kind);
  const other: LegalKind = kind === "privacy" ? "terms" : "privacy";
  const otherLocale: Locale = locale === "en" ? "id" : "en";
  const t = (key: Parameters<typeof translate>[1], params?: Record<string, string>) =>
    translate(locale, key, params);

  const link =
    "rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none";

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-6 sm:py-12">
      <nav className="mb-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link href={`/${locale}`} className="inline-flex items-center gap-1.5 font-medium hover:underline">
          <ArrowLeft className="size-4" aria-hidden="true" />
          {t("legal.back")}
        </Link>
        <Link href={`/${locale}/${other}`} className={`${link} text-muted-foreground`}>
          {t(other === "privacy" ? "legal.privacy" : "legal.terms")}
        </Link>
        <Link
          href={`/${otherLocale}/${kind}`}
          hrefLang={otherLocale}
          className={`${link} text-muted-foreground`}
        >
          {otherLocale.toUpperCase()}
        </Link>
      </nav>

      <header className="mb-8 border-b pb-6">
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{SITE_NAME}</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">{doc.title}</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{doc.intro}</p>
        <p className="mt-4 text-xs text-muted-foreground">
          {t("legal.updated", { date: doc.updated })}
        </p>
      </header>

      <div className="space-y-8">
        {doc.sections.map((section) => (
          <section key={section.heading}>
            <h2 className="text-base font-semibold sm:text-lg">{section.heading}</h2>
            {section.body.map((paragraph, i) => (
              // The bulleted paragraphs carry their own newlines, which is
              // enough structure for a document this short and avoids a
              // markdown parser for six lists.
              <p
                key={i}
                className="mt-3 text-sm leading-relaxed whitespace-pre-line text-muted-foreground"
              >
                {paragraph}
              </p>
            ))}
            {section.links && (
              <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {section.links.map((l) => (
                  <li key={l.href}>
                    <a href={l.href} rel="noopener noreferrer" className={`${link} text-muted-foreground`}>
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t pt-6 text-xs text-muted-foreground">
        <Link href={`/${locale}`} className={link}>
          {t("legal.back")}
        </Link>
        <Link href={`/${locale}/privacy`} className={link}>
          {t("legal.privacy")}
        </Link>
        <Link href={`/${locale}/terms`} className={link}>
          {t("legal.terms")}
        </Link>
        <ReopenConsent className={link}>{t("consent.reopen")}</ReopenConsent>
      </footer>
    </div>
  );
}
