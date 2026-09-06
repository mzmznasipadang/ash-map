"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { Mountain, PanelLeft } from "lucide-react";

import type { FrameKey, VaaAdvisory } from "@/lib/vaa";
import type { WindVector } from "@/lib/types";
import { WIND_LEVELS } from "@/lib/style";
import { AdvisoryPanel } from "@/components/advisory-panel";
import { useDarwinFeed, type FeedItem } from "@/components/darwin-feed";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const AshMap = dynamic(() => import("@/components/AshMap"), { ssr: false });

// A few real, currently-public Washington VAAC advisories you can load with
// one click. VAACs rotate through active volcanoes constantly, so this list
// will go stale — paste a fresh link from
// https://www.ospo.noaa.gov/products/atmosphere/vaac/messages.html any time.
const SAMPLE_ADVISORIES = [
  {
    label: "Fuego (Guatemala) — Washington VAAC",
    url: "https://www.ospo.noaa.gov/VAAC/ARCH26/FUEG/2026I051442.html",
  },
];

// A Darwin-format advisory with two frames, so the timeline has something to
// animate. Darwin's own bulletins are open at
// ftp://ftp.bom.gov.au/anon/gen/vaac/<year>/IDY41315.<timestamp>.txt (no auth),
// and the parser handles that format too — see lib/vaa.test.ts. The web page at
// bom.gov.au/aviation/volcanic-ash/ renders its list client-side, so the FTP
// text products are the reliable machine-readable route.
const KRAKATAU_SAMPLE = `VOLCANIC ASH ADVISORY
DTG: 20260906/0630Z
VAAC: DARWIN
VOLCANO: KRAKATAU 262000
PSN: S0606 E10525
AREA: INDONESIA
SOURCE ELEV: 155M AMSL
ADVISORY NR: 2026/186
INFO SOURCE: HIMAWARI-9 CVGHM
ERUPTION DETAILS: VA TO FL500 MOV SW, VA TO FL120 MOV W
OBS VA DTG: 06/0610Z
OBS VA CLD: SFC/FL500 S0400 E08700 - S1200 E08100 - S1500 E09600 - S0900 E10200 - S0400 E08700 MOV SW 10KT SFC/FL120 S0500 E10000 - S0500 E11400 - S0800 E11400 - S0800 E10000 - S0500 E10000 MOV W 5KT
FCST VA CLD +6HR: 06/1210Z SFC/FL500 S0800 E07200 - S1900 E08400 - S2100 E09900 - S1000 E10300 - S0800 E07200 MOV SW 10KT SFC/FL120 S0500 E09600 - S0500 E11400 - S0800 E11400 - S0800 E09600 - S0500 E09600 MOV W 5KT
RMK: HIGH LEVEL VA TO FL500 IS NOW DETACHED FROM THE VOLCANO AND MOVING SW. CONTINUOUS VA EMISSION TO FL120 MOV W, WITH REMNANTS OF VA FROM EARLIER ERUPTION DRIFTING E.
NXT ADVISORY: NO LATER THAN 20260906/0930Z`;

type Bounds = { north: number; south: number; east: number; west: number };

export default function Home() {
  const [urlInput, setUrlInput] = useState(SAMPLE_ADVISORIES[0].url);
  const [textInput, setTextInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const [advisory, setAdvisory] = useState<VaaAdvisory | null>(null);
  const [frames, setFrames] = useState<FrameKey[]>([]);

  // One poller for the page; the panel below is rendered twice.
  const feed = useDarwinFeed();

  const [showWind, setShowWind] = useState(true);
  const [windLevel, setWindLevel] = useState(WIND_LEVELS[2].hpa);
  const [windVectors, setWindVectors] = useState<WindVector[]>([]);

  // The wind overlay is refreshed by the three things that actually invalidate
  // it — the map moved, the level changed, the layer was toggled — instead of an
  // effect watching derived state. Bounds and settings live in refs so the
  // bounds callback handed to the map keeps a stable identity.
  const bounds = useRef<Bounds | null>(null);
  const windSettings = useRef({ level: WIND_LEVELS[2].hpa, enabled: true });

  const applyResult = (result: { advisory: VaaAdvisory; frames: FrameKey[] }) => {
    setAdvisory(result.advisory);
    setFrames(result.frames);
    setSheetOpen(false);
  };

  const loadFromUrl = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/advisory?url=${encodeURIComponent(urlInput)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load advisory");
      applyResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const parseText = async (text: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/advisory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to parse advisory");
      applyResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshWind = useCallback(async () => {
    const b = bounds.current;
    const { level, enabled } = windSettings.current;
    if (!b || !enabled) {
      setWindVectors([]);
      return;
    }
    try {
      const res = await fetch(
        `/api/wind?north=${b.north}&south=${b.south}&east=${b.east}&west=${b.west}&level=${level}`
      );
      const data = await res.json();
      if (res.ok) setWindVectors(data.vectors);
    } catch {
      // wind is a "nice to have" overlay; a failed fetch just means no arrows this refresh
    }
  }, []);

  const handleBounds = useCallback(
    (b: Bounds) => {
      bounds.current = b;
      // Panning emits moveend repeatedly; without this each one is a 64-point
      // upstream request.
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
      refreshTimer.current = setTimeout(refreshWind, 300);
    },
    [refreshWind]
  );

  const handleWindLevel = (level: string) => {
    setWindLevel(level);
    windSettings.current.level = level;
    refreshWind();
  };

  const handleShowWind = (enabled: boolean) => {
    setShowWind(enabled);
    windSettings.current.enabled = enabled;
    refreshWind();
  };

  const panel = (
    <AdvisoryPanel
      samples={SAMPLE_ADVISORIES}
      urlInput={urlInput}
      onUrlInput={setUrlInput}
      onLoadUrl={loadFromUrl}
      textInput={textInput}
      onTextInput={setTextInput}
      onParseText={parseText}
      onLoadSample={() => {
        setTextInput(KRAKATAU_SAMPLE);
        parseText(KRAKATAU_SAMPLE);
      }}
      loading={loading}
      error={error}
      advisory={advisory}
      frames={frames}
      showWind={showWind}
      onShowWind={handleShowWind}
      windLevel={windLevel}
      onWindLevel={handleWindLevel}
      feed={feed}
      onSelectFeedItem={(item: FeedItem) => {
        // The feed route already parsed it; no second round trip.
        setAdvisory(item.advisory);
        setFrames(item.frames);
        setTextInput(item.advisory.raw);
        setError(null);
        setSheetOpen(false);
      }}
    />
  );

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-3 sm:px-4">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open advisory panel">
              <PanelLeft className="size-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-[min(22rem,90vw)] p-0">
            <SheetHeader className="border-b px-4">
              <SheetTitle>Advisory</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(100svh-4rem)]">{panel}</ScrollArea>
          </SheetContent>
        </Sheet>

        <Mountain className="size-5 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold">Volcanic Ash &amp; Wind Map</h1>
          <p className="hidden truncate text-xs text-muted-foreground sm:block">
            Real ICAO advisory polygons, live wind, animated forecast drift
          </p>
        </div>
        <ThemeToggle />
      </header>

      <div className="flex min-h-0 flex-1">
        <aside aria-label="Advisory controls" className="hidden w-80 shrink-0 border-r lg:block">
          <ScrollArea className="h-full">{panel}</ScrollArea>
        </aside>

        <main className="relative min-h-0 flex-1">
          <AshMap
            advisory={advisory}
            windVectors={windVectors}
            showWind={showWind}
            onBoundsChange={handleBounds}
          />
        </main>
      </div>
    </div>
  );
}
