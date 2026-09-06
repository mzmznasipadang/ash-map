"use client";

// Attribution is a licence obligation here, not decoration. BOM's bulletins
// carry a Commonwealth of Australia copyright notice, and Open-Meteo's free
// tier is CC BY 4.0, which requires credit.

const SOURCES = [
  {
    name: "Darwin VAAC advisories",
    holder: "Bureau of Meteorology (Commonwealth of Australia)",
    href: "http://www.bom.gov.au/aviation/volcanic-ash/",
    note: "VAA text bulletins, via the Bureau's public FTP",
  },
  {
    name: "Washington VAAC advisories",
    holder: "NOAA / NWS Satellite Analysis Branch",
    href: "https://www.ospo.noaa.gov/products/atmosphere/vaac/",
    note: "Used by the fetch-from-URL path",
  },
  {
    name: "Wind field",
    holder: "Open-Meteo",
    href: "https://open-meteo.com/",
    note: "GFS-based forecast API, CC BY 4.0",
  },
  {
    name: "Basemap",
    holder: "Esri",
    href: "https://www.esri.com/",
    note: "World Light/Dark Gray Canvas",
  },
];

export function Credits() {
  return (
    <div className="space-y-3 text-xs">
      <p className="text-muted-foreground">
        Built by{" "}
        <a
          href="https://github.com/mzmznasipadang"
          className="rounded-sm font-medium text-foreground underline underline-offset-2 focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Victor Chandra
        </a>
        .{" "}
        <a
          href="https://github.com/mzmznasipadang/ash-map"
          className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          Source on GitHub
        </a>
        .
      </p>

      <dl className="space-y-2">
        {SOURCES.map((s) => (
          <div key={s.name}>
            <dt className="font-medium">{s.name}</dt>
            <dd className="text-muted-foreground">
              &copy;{" "}
              <a
                href={s.href}
                className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
              >
                {s.holder}
              </a>
              {s.note ? ` — ${s.note}` : ""}
            </dd>
          </div>
        ))}
      </dl>

      <p className="leading-relaxed text-muted-foreground">
        Advisory data is reproduced as published. This is not an official
        aviation product: for flight planning, use the advisories and NOTAMs
        issued by the responsible VAAC and your national AIS.
      </p>
    </div>
  );
}
