"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

// The exact bulletin as issued. An operational reader trusts the source text
// over any rendering of it, and it is the fastest way to spot a field the
// parser did not pick up.
export function RawBulletin({ raw }: { raw: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard is permission-gated; the text is selectable either way.
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{raw.split("\n").length} lines, as issued</p>
        <Button variant="outline" size="sm" onClick={copy} className="h-7 gap-1.5 text-xs">
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      {/* tabIndex makes the scroll region reachable by keyboard (WCAG 2.1.1). */}
      <pre
        tabIndex={0}
        role="region"
        aria-label="Raw advisory bulletin text"
        className="max-h-64 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
      >
        {raw}
      </pre>
      <p aria-live="polite" className="sr-only">
        {copied ? "Bulletin copied to clipboard" : ""}
      </p>
    </div>
  );
}
