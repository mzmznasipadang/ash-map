"use client";

import { Bell, BellOff, BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { NotifyPermission } from "@/lib/notify";
import { useI18n } from "@/components/i18n";

export function AlertsPanel({
  permission,
  onEnable,
}: {
  permission: NotifyPermission;
  onEnable: () => void;
}) {
  const { t } = useI18n();
  return (
    <div className="space-y-2 text-xs">
      <p className="leading-relaxed text-muted-foreground">
{t("alerts.blurb")}
      </p>

      {permission === "unsupported" && <p className="text-muted-foreground">{t("alerts.unsupported")}</p>}

      {permission === "default" && (
        <Button variant="outline" size="sm" onClick={onEnable} className="h-7 w-full gap-1.5 text-xs">
          <Bell className="size-3.5" aria-hidden="true" />
          {t("alerts.enable")}
        </Button>
      )}

      {permission === "granted" && (
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <BellRing className="size-3.5" aria-hidden="true" />
          {t("alerts.on")}
        </p>
      )}

      {permission === "denied" && (
        <p className="flex items-start gap-1.5 text-muted-foreground">
          <BellOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t("alerts.blocked")}
        </p>
      )}

      {/* A real ceiling, worth stating rather than discovering. */}
      <p className="leading-relaxed text-muted-foreground">
{t("alerts.ceiling")}
      </p>
    </div>
  );
}
