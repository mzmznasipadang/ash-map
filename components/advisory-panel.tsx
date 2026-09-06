"use client";

import { useId } from "react";
import { ChevronDown, FileText, Loader2, MapPin, Rss, Upload, Wind } from "lucide-react";

import type { FrameKey, VaaAdvisory } from "@/lib/vaa";
import { frameDtg } from "@/lib/vaa";
import { FL_BANDS, WIND_BANDS, WIND_LEVELS } from "@/lib/style";
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
}: AdvisoryPanelProps) {
  // This panel is mounted twice — once in the sidebar, once in the slide-over —
  // so fixed ids would collide and every `htmlFor` would resolve to whichever
  // copy is hidden. useId gives each instance its own namespace.
  const uid = useId();
  const id = (name: string) => `${uid}-${name}`;

  return (
    <div className="divide-y px-4 pb-8">
      <Section title="Darwin VAAC feed" icon={<Rss className="size-4 text-muted-foreground" aria-hidden="true" />}>
        <DarwinFeed state={feed} onSelect={onSelectFeedItem} />
      </Section>

      <Section
        title="Load an advisory"
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
              </div>
            </CardHeader>
            <CardContent className="space-y-3 px-4 text-xs">
              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-muted-foreground">
                {advisory.dtg && (
                  <>
                    <dt>Issued</dt>
                    <dd className="font-mono text-foreground">{advisory.dtg}</dd>
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
                    <dd className="text-foreground">{advisory.nextAdvisory}</dd>
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
                        <span>{frameDtg(advisory, f) ?? "—"}</span>
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

      {advisory?.raw && (
        <Section
          title="Raw bulletin"
          defaultOpen={false}
          icon={<FileText className="size-4 text-muted-foreground" aria-hidden="true" />}
        >
          <RawBulletin raw={advisory.raw} />
        </Section>
      )}

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

      <Section title="Legend" icon={<span aria-hidden="true" className="size-4 rounded-sm bg-gradient-to-br from-sky-400 to-purple-600" />}>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Ash polygon — advisory flight level</p>
          <div className="grid grid-cols-2 gap-1.5">
            {FL_BANDS.map((b) => (
              <div key={b.label} className="flex items-center gap-2 text-xs">
                <span
                  aria-hidden="true"
                  className="size-3 shrink-0 rounded-sm border border-black/10"
                  style={{ background: b.color }}
                />
                {b.label}
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
    </div>
  );
}
