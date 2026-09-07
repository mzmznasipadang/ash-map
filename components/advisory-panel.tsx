"use client";

import { useId } from "react";
import { Bell, ChevronDown, Eye, EyeOff, Info, Layers, Loader2, MapPin, Mountain, Rss, Upload, Wind } from "lucide-react";

import type { FrameKey, VaaAdvisory } from "@/lib/vaa";
import { frameDtg } from "@/lib/vaa";
import { FL_BANDS, WIND_BANDS, WIND_LEVELS } from "@/lib/style";
import { assessAsh } from "@/lib/eruption";
import type { PlottedAdvisory } from "@/components/AshMap";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { DarwinFeed, type DarwinFeedState, type FeedItem } from "@/components/darwin-feed";
import { RawBulletin } from "@/components/raw-bulletin";
import { Credits } from "@/components/credits";
import { Dtg, TimeModeIcon, TimeModeToggle } from "@/components/time-mode";
import { AirportImpactIcon, AirportImpactList } from "@/components/airport-impact";
import type { AirportImpact } from "@/lib/impact";
import type { VolcanoAlert } from "@/lib/pvmbg";
import { AlertLevelBadge } from "@/components/alert-level";
import { AlertsPanel } from "@/components/alerts-panel";
import type { NotifyPermission } from "@/lib/notify";

function Section({
  title,
  icon,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/section">
      {/* The trigger has to sit inside a real heading: screen reader users
          navigate this panel by heading, and a styled button is not one. */}
      <h2>
        <CollapsibleTrigger className="flex w-full items-center gap-2 py-3 text-sm font-medium hover:text-foreground/80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
          {icon}
          <span className="flex-1 text-left">{title}</span>
          <ChevronDown className="size-4 text-muted-foreground transition-transform group-data-[state=closed]/section:-rotate-90" />
        </CollapsibleTrigger>
      </h2>
      <CollapsibleContent className="space-y-3 pb-4 pt-1">{children}</CollapsibleContent>
    </Collapsible>
  );
}

export type AdvisoryPanelProps = {
  samples: { label: string; url: string }[];
  urlInput: string;
  onUrlInput: (v: string) => void;
  onLoadUrl: () => void;
  textInput: string;
  onTextInput: (v: string) => void;
  onParseText: (text: string) => void;
  onLoadSample: () => void;
  loading: boolean;
  error: string | null;
  advisory: VaaAdvisory | null;
  frames: FrameKey[];
  showWind: boolean;
  onShowWind: (v: boolean) => void;
  windLevel: string;
  onWindLevel: (v: string) => void;
  onSelectFeedItem: (item: FeedItem) => void;
  feed: DarwinFeedState;
  plotted: PlottedAdvisory[];
  selectedId: string | null;
  hidden: Set<string>;
  onToggleLayer: (id: string) => void;
  minFlightLevel: number;
  onMinFlightLevel: (fl: number) => void;
  impacts: (AirportImpact & { volcanoes?: string[] })[];
  alertFor: (name?: string) => VolcanoAlert | undefined;
  alertsList: VolcanoAlert[];
  alertCount: number;
  notifyPermission: NotifyPermission;
  onEnableNotifications: () => void;
};

export function AdvisoryPanel({
  samples,
  urlInput,
  onUrlInput,
  onLoadUrl,
  textInput,
  onTextInput,
  onParseText,
  onLoadSample,
  loading,
  error,
  advisory,
  frames,
  showWind,
  onShowWind,
  windLevel,
  onWindLevel,
  onSelectFeedItem,
  feed,
  plotted,
  selectedId,
  hidden,
  onToggleLayer,
  minFlightLevel,
  onMinFlightLevel,
  impacts,
  alertFor,
  alertsList,
  alertCount,
  notifyPermission,
  onEnableNotifications,
}: AdvisoryPanelProps) {
  // This panel is mounted twice — once in the sidebar, once in the slide-over —
  // so fixed ids would collide and every `htmlFor` would resolve to whichever
  // copy is hidden. useId gives each instance its own namespace.
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  return (
    <div className="divide-y px-4 pb-8">
      <Section title="Darwin VAAC feed" defaultOpen={false} icon={<Rss className="size-4 text-muted-foreground" aria-hidden="true" />}>
        <DarwinFeed state={feed} onSelect={onSelectFeedItem} alerts={alertsList} />
      </Section>
      {advisory && (
        <div className="py-4">
          <Card className="gap-3 py-4">
            <CardHeader className="px-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <h2 className="min-w-0 truncate">{advisory.volcano ?? "Unknown volcano"}</h2>
              </CardTitle>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {advisory.vaac && <Badge variant="secondary">{advisory.vaac} VAAC</Badge>}
                {advisory.advisoryNr && <Badge variant="outline">#{advisory.advisoryNr}</Badge>}
                {/* PVMBG's own status for the volcano, distinct from the ash
                    the advisory describes. */}
                <AlertLevelBadge alert={alertFor(advisory.volcano)} />
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-xs">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
                {advisory.dtg && (
                  <>
                    <dt>Issued</dt>
                    <dd className="font-mono text-foreground">
                      <Dtg value={advisory.dtg} />
                    </dd>
                  </>
                )}
                {advisory.area && (
                  <>
                    <dt>Area</dt>
                    <dd className="text-foreground">{advisory.area}</dd>
                  </>
                )}
                {advisory.elevation && (
                  <>
                    <dt>Summit</dt>
                    <dd className="text-foreground">{advisory.elevation}</dd>
                  </>
                )}
                {advisory.nextAdvisory && (
                  <>
                    <dt>Next</dt>
                    <dd className="text-foreground">
                      {/* The field is prose wrapped around a DTG, e.g. "NO LATER
                          THAN 20260906/1730Z", so reformat just the DTG. */}
                      {advisory.nextAdvisory.replace(/\d{8}\/\d{4}Z?/, "").trim()}{" "}
                      <Dtg
                        className="font-mono"
                        value={advisory.nextAdvisory.match(/\d{8}\/\d{4}Z?/)?.[0]}
                      />
                    </dd>
                  </>
                )}
              </dl>

              {advisory.eruptionDetails && (
                <p className="rounded-md bg-muted px-3 py-2 leading-relaxed">{advisory.eruptionDetails}</p>
              )}

              {frames.length > 0 && (
                <div className="space-y-1.5">
                  <h3 className="font-medium text-foreground">Frames on the timeline</h3>
                  <ul className="space-y-1 text-muted-foreground">
                    {frames.map((f) => (
                      <li key={f} className="flex items-center justify-between gap-2 font-mono">
                        <span className="text-foreground">{f}</span>
                        <Dtg value={frameDtg(advisory, f)} reference={advisory.dtg} />
                      </li>
                    ))}
                  </ul>
                  {frames.length > 1 && (
                    <p className="pt-1 leading-relaxed text-muted-foreground">
                      Press play on the map to watch the cloud drift between them.
                    </p>
                  )}
                </div>
              )}

              {advisory.remark && (
                <details className="group">
                  <summary className="flex min-h-6 cursor-pointer items-center font-medium text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none">
                    Remarks
                  </summary>
                  <p className="pt-1.5 leading-relaxed text-muted-foreground">{advisory.remark}</p>
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      )}
      {plotted.length > 0 && (
      <Section title="Airports under ash" icon={<AirportImpactIcon />}>
          <AirportImpactList impacts={impacts} />
        </Section>
      )}
      <Section
        title="Alerts"
        defaultOpen={false}
        icon={<Bell className="size-4 text-muted-foreground" aria-hidden="true" />}
      >
        <AlertsPanel permission={notifyPermission} onEnable={onEnableNotifications} />
      </Section>

      <Section
        title="Volcano alert levels"
        defaultOpen={false}
        icon={<Mountain className="size-4 text-muted-foreground" aria-hidden="true" />}
      >
        <p className="text-xs leading-relaxed text-muted-foreground">
          {alertCount > 0
            ? `${alertCount} Indonesian volcanoes are on PVMBG's watch list. Levels run I Normal, II Waspada, III Siaga, IV Awas; Level IV means evacuation is under way. The level shown on an advisory is the volcano's own status, which is separate from whether its ash is currently in the air.`
            : "PVMBG alert levels are unavailable right now."}
        </p>
      </Section>

      <Section title="Wind overlay" icon={<Wind className="size-4 text-muted-foreground" aria-hidden="true" />}>
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id("wind-toggle")} className="font-normal">
            Show vectors
            <span className="block text-xs text-muted-foreground">Open-Meteo, live</span>
          </Label>
          <Switch id={id("wind-toggle")} checked={showWind} onCheckedChange={onShowWind} />
        </div>
        <div className="space-y-2">
          <Label htmlFor={id("wind-level")}>Pressure level</Label>
          <Select value={windLevel} onValueChange={onWindLevel} disabled={!showWind}>
            <SelectTrigger id={id("wind-level")} className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WIND_LEVELS.map((l) => (
                <SelectItem key={l.hpa} value={l.hpa}>
                  {l.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Section>
      {plotted.length > 0 && (
      <Section title="Layers on the map" icon={<Layers className="size-4 text-muted-foreground" aria-hidden="true" />}>
          <ul className="space-y-1">
            {plotted.map((item) => {
              const isHidden = hidden.has(item.id);
              const ash = assessAsh(item.advisory);
              return (
                <li key={item.id} className="flex items-center gap-1">
                  <button
                    onClick={() => onSelectFeedItem({ ...item, file: item.id, issued: "", ash })}
                    aria-current={item.id === selectedId}
                    className={`flex min-w-0 flex-1 flex-col items-start rounded-md px-2 py-1.5 text-left text-xs hover:bg-accent focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none ${
                      item.id === selectedId ? "bg-accent font-medium" : ""
                    }`}
                  >
                    <span className="w-full truncate">{item.advisory.volcano ?? "Unknown"}</span>
                    <span className="w-full truncate font-mono text-muted-foreground">
                      FL{ash.maxFlightLevel} · {item.frames.length} frame{item.frames.length === 1 ? "" : "s"}
                    </span>
                  </button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onToggleLayer(item.id)}
                    aria-pressed={!isHidden}
                    aria-label={`${isHidden ? "Show" : "Hide"} ${item.advisory.volcano ?? "this advisory"} on the map`}
                    className="size-7 shrink-0"
                  >
                    {isHidden ? (
                      <EyeOff className="size-3.5 text-muted-foreground" aria-hidden="true" />
                    ) : (
                      <Eye className="size-3.5" aria-hidden="true" />
                    )}
                  </Button>
                </li>
              );
            })}
          </ul>

          <div className="space-y-2 border-t pt-3">
            <Label htmlFor={id("min-fl")}>Hide ash below</Label>
            <Select value={String(minFlightLevel)} onValueChange={(v) => onMinFlightLevel(Number(v))}>
              <SelectTrigger id={id("min-fl")} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[0, 100, 200, 300, 450].map((fl) => (
                  <SelectItem key={fl} value={String(fl)}>
                    {fl === 0 ? "Show all levels" : `FL${fl} and above`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Cruising traffic sits near FL350, so filtering low ash leaves what matters at altitude.
            </p>
          </div>
        </Section>
      )}
      <Section title="Times &amp; time zone" defaultOpen={false} icon={<TimeModeIcon />}>
        <TimeModeToggle />
      </Section>
      <Section title="Legend" icon={<span aria-hidden="true" className="size-4 rounded-sm bg-gradient-to-br from-sky-400 to-purple-600" />}>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Ash polygon — advisory flight level. FL is hundreds of feet, so FL300 is 30,000 ft.
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {FL_BANDS.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-sm border border-black/10"
                  style={{ background: b.color }}
                />
                <span className="min-w-0">
                  {b.label}
                  <span className="block text-[10px] text-muted-foreground tabular-nums">{b.metres}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Arrow — wind speed, pointing downwind</p>
          <div className="grid grid-cols-2 gap-1.5">
            {WIND_BANDS.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-xs">
                <span aria-hidden="true" className="shrink-0 leading-none" style={{ color: b.color }}>
                  ↑
                </span>
                {b.label}
              </div>
            ))}
          </div>
        </div>
      </Section>
      <Section
        title="Advisory source"
        defaultOpen={false}
        icon={<Upload className="size-4 text-muted-foreground" aria-hidden="true" />}
      >
        <div className="space-y-2">
          <Label htmlFor={id("vaac-sample")}>Official VAAC URL</Label>
          <Select value={urlInput} onValueChange={onUrlInput}>
            <SelectTrigger id={id("vaac-sample")} className="w-full">
              <SelectValue placeholder="Pick a source" />
            </SelectTrigger>
            <SelectContent>
              {samples.map((s) => (
                <SelectItem key={s.url} value={s.url}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={urlInput}
            onChange={(e) => onUrlInput(e.target.value)}
            placeholder="https://www.ospo.noaa.gov/VAAC/..."
            className="font-mono text-xs"
          />
          <Button onClick={onLoadUrl} disabled={loading} aria-busy={loading} className="w-full">
            {loading && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            Fetch advisory
          </Button>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor={id("vaa-text")}>Or paste raw VAA text</Label>
          <p className="text-xs text-muted-foreground">
            Works for any VAAC — Darwin, Tokyo, London, Toulouse — the ICAO format is identical.
          </p>
          <Textarea
            id={id("vaa-text")}
            value={textInput}
            onChange={(e) => onTextInput(e.target.value)}
            placeholder="DTG: ... VAAC: ... VOLCANO: ..."
            className="h-28 font-mono text-xs"
          />
          <div className="flex gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => onParseText(textInput)}
              disabled={loading || !textInput.trim()}
            >
              Parse
            </Button>
            <Button variant="outline" className="flex-1" onClick={onLoadSample} disabled={loading}>
              Krakatau sample
            </Button>
          </div>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert" aria-live="assertive">
            {error}
          </p>
        )}

        {advisory?.raw && (
          <div className="space-y-2 border-t pt-3">
            <p className="text-xs font-medium">Raw bulletin</p>
            <RawBulletin raw={advisory.raw} />
          </div>
        )}
      </Section>
      <Section
        title="About &amp; sources"
        defaultOpen={false}
        icon={<Info className="size-4 text-muted-foreground" aria-hidden="true" />}
      >
        <Credits />
      </Section>

      <div className="flex items-baseline justify-between gap-2 pt-4 text-xs">
        <p className="text-muted-foreground">
          Built by{" "}
          <a
            href="https://github.com/mzmznasipadang"
            className="rounded-sm font-medium text-foreground underline underline-offset-2 hover:opacity-80 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            Victor Chandra
          </a>
        </p>
        <a
          href="https://github.com/mzmznasipadang/ash-map"
          className="rounded-sm shrink-0 text-muted-foreground underline underline-offset-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Source
        </a>
      </div>
    </div>
  );
}
