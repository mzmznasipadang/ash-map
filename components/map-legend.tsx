"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

import { FL_BANDS, WIND_BANDS } from "@/lib/style";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

// A legend on the map itself. The sidebar has the same information, but the
// sidebar is closed on a phone and collapsed on a laptop, so the colours on
// screen had nothing explaining them.
//
// Heights are given in metres as well as flight levels: "FL300" is precise and
// meaningless to anyone outside aviation.
export function MapLegend() {
  // 152px is 40% of a phone's width, so it starts collapsed there and open on
  // anything larger. Reading `window` in the initializer is safe: AshMap is
  // imported with ssr:false, so this never renders on the server.
  const [open, setOpen] = useState(() =>
    typeof window === "undefined" ? true : window.matchMedia("(min-width: 640px)").matches
  );

  return (
    <Card className="pointer-events-auto w-[9.5rem] gap-0 overflow-hidden rounded-lg border bg-background/90 py-0 shadow-lg backdrop-blur-md">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="h-7 w-full justify-between rounded-none px-2 text-[11px] font-medium"
      >
        Legend
        {open ? (
          <ChevronUp className="size-3 text-muted-foreground" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-3 text-muted-foreground" aria-hidden="true" />
        )}
      </Button>

      {open && (
        <div className="space-y-2 border-t px-2 pt-1.5 pb-2">
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground">Ash top</p>
            {FL_BANDS.map((b) => (
              <div key={b.label} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-sm border border-black/20"
                  style={{ background: b.color }}
                />
                <span className="min-w-0 leading-tight">
                  <span className="block text-[10px] font-medium tabular-nums">{b.label}</span>
                  <span className="block text-[9px] text-muted-foreground tabular-nums">{b.metres}</span>
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-1 border-t pt-1.5">
            <p className="text-[10px] text-muted-foreground">Wind, downwind</p>
            <div className="grid grid-cols-2 gap-x-1.5 gap-y-0.5">
              {WIND_BANDS.map((b) => (
                <div key={b.label} className="flex items-center gap-1">
                  <span aria-hidden="true" className="shrink-0 text-[11px] leading-none" style={{ color: b.color }}>
                    ↑
                  </span>
                  <span className="text-[9px] tabular-nums">{b.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
