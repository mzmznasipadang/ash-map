// Desktop notifications for new advisories and new aerodrome closures.
//
// ponytail: the Notification API only, no service worker and no push server.
// That means the page has to be open to notify — which matches how the feed
// already works, since polling stops when the tab is hidden. A closed laptop
// gets nothing. Add web push (and somewhere to run the poller) when that
// stops being acceptable.

export type NotifyPermission = "unsupported" | "default" | "granted" | "denied";

export function permission(): NotifyPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission as NotifyPermission;
}

export async function requestPermission(): Promise<NotifyPermission> {
  if (permission() === "unsupported") return "unsupported";
  try {
    return (await Notification.requestPermission()) as NotifyPermission;
  } catch {
    return "denied";
  }
}

/**
 * Fire one notification. `tag` collapses repeats, so a volcano re-advised
 * every hour replaces its own notification instead of stacking six of them.
 */
export function notify(title: string, body: string, tag: string): void {
  if (permission() !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/icon.svg", badge: "/icon.svg" });
  } catch {
    // Some browsers refuse construction outside a service worker; nothing to
    // recover, the in-app banner still shows.
  }
}

export type NotifiableState = {
  /** Advisory file names currently on the feed. */
  advisories: { file: string; volcano: string; summary: string }[];
  /** ICAO -> closure reason, for aerodromes reported shut. */
  closures: Record<string, { reason: string | null }>;
};

/**
 * What changed since the last look. Pure so the decision of *what* is worth
 * announcing is testable without a browser or a permission prompt.
 */
export function diffForNotification(
  prev: NotifiableState | null,
  next: NotifiableState
): { title: string; body: string; tag: string }[] {
  // Nothing to announce on the first load: everything is new by definition,
  // and a burst of notifications on open is noise, not news.
  if (!prev) return [];

  const out: { title: string; body: string; tag: string }[] = [];

  const seenFiles = new Set(prev.advisories.map((a) => a.file));
  for (const a of next.advisories) {
    if (seenFiles.has(a.file)) continue;
    out.push({ title: `New advisory: ${a.volcano}`, body: a.summary, tag: `advisory:${a.volcano}` });
  }

  for (const [icao, info] of Object.entries(next.closures)) {
    if (icao in prev.closures) continue;
    out.push({
      title: `${icao} closed`,
      body: info.reason ?? "Aerodrome closed (NOTAM)",
      tag: `closure:${icao}`,
    });
  }

  return out;
}
