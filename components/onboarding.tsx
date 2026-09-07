"use client";

import { useState } from "react";
import { Bell, Mountain, PlaneLanding, Ruler } from "lucide-react";

import { useI18n } from "@/components/i18n";
import { LOCALES } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const KEY = "ash-map:onboarded";

function alreadySeen(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    // Storage blocked: show it every time rather than never.
    return false;
  }
}

/**
 * Shown once. It explains the one thing the map cannot: that three independent
 * official sources are on screen, answering different questions, and that they
 * can disagree. Also what a flight level is, since the colour bands are
 * meaningless without it.
 */
export function Onboarding() {
  const { t, locale, setLocale } = useI18n();
  // AshMap is ssr:false and this renders beside it, so reading storage in the
  // initializer cannot cause a hydration mismatch.
  const [open, setOpen] = useState(() => (typeof window === "undefined" ? false : !alreadySeen()));

  const dismiss = () => {
    setOpen(false);
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // nothing to do; it will show again
    }
  };

  const rows = [
    { icon: <Mountain className="size-4" aria-hidden="true" />, title: t("onboarding.vaacTitle"), body: t("onboarding.vaacBody") },
    { icon: <Ruler className="size-4" aria-hidden="true" />, title: t("onboarding.pvmbgTitle"), body: t("onboarding.pvmbgBody") },
    { icon: <PlaneLanding className="size-4" aria-hidden="true" />, title: t("onboarding.notamTitle"), body: t("onboarding.notamBody") },
    { icon: <Bell className="size-4" aria-hidden="true" />, title: t("onboarding.flTitle"), body: t("onboarding.flBody") },
  ];

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : dismiss())}>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("onboarding.title")}</DialogTitle>
          <DialogDescription>{t("onboarding.intro")}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap gap-1.5">
          {LOCALES.map((l) => (
            <Button
              key={l.code}
              variant={locale === l.code ? "secondary" : "ghost"}
              size="sm"
              aria-pressed={locale === l.code}
              onClick={() => setLocale(l.code)}
              className="h-7 text-xs"
            >
              {l.native}
            </Button>
          ))}
        </div>

        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.title} className="flex gap-3">
              <span className="mt-0.5 shrink-0 text-muted-foreground">{r.icon}</span>
              <span className="min-w-0">
                <span className="block text-sm font-medium">{r.title}</span>
                <span className="block text-xs leading-relaxed text-muted-foreground">{r.body}</span>
              </span>
            </li>
          ))}
        </ul>

        <p className="rounded-md bg-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          {t("onboarding.disclaimer")}
        </p>

        <Button onClick={dismiss} className="w-full">
          {t("onboarding.start")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
