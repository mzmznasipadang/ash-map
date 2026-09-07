"use client";

import { Bell, BellOff, BellRing } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { NotifyPermission } from "@/lib/notify";

export function AlertsPanel({
  permission,
  onEnable,
}: {
  permission: NotifyPermission;
  onEnable: () => void;
}) {
  return (
    <div className="space-y-2 text-xs">
      <p className="leading-relaxed text-muted-foreground">
        Notifies you when Darwin issues a new advisory for a volcano on the map, or when an aerodrome under the ash is
        reported closed.
      </p>

      {permission === "unsupported" && <p className="text-muted-foreground">This browser has no notification support.</p>}

      {permission === "default" && (
        <Button variant="outline" size="sm" onClick={onEnable} className="h-7 w-full gap-1.5 text-xs">
          <Bell className="size-3.5" aria-hidden="true" />
          Enable notifications
        </Button>
      )}

      {permission === "granted" && (
        <p className="flex items-center gap-1.5 font-medium text-foreground">
          <BellRing className="size-3.5" aria-hidden="true" />
          Notifications on
        </p>
      )}

      {permission === "denied" && (
        <p className="flex items-start gap-1.5 text-muted-foreground">
          <BellOff className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          Blocked for this site. Re-allow it in the browser&apos;s site settings.
        </p>
      )}

      {/* A real ceiling, worth stating rather than discovering. */}
      <p className="leading-relaxed text-muted-foreground">
        This needs the tab open — there is no background service, so a closed browser gets nothing.
      </p>
    </div>
  );
}
