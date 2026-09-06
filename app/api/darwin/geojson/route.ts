import { NextRequest, NextResponse } from "next/server";
import { fetchLiveBulletins } from "@/lib/darwin";
import { matchesArea } from "@/lib/area";
import { assessAsh } from "@/lib/eruption";
import { advisoryGeoJSON, availableFrames, parseVaaText } from "@/lib/vaa";

// GIS export. One FeatureCollection covering every advisory on the feed, with
// each feature carrying its own volcano / VAAC / frame / flight level, so the
// file stands alone in QGIS or ArcGIS.
//
//   QGIS: Layer > Add Layer > Add Vector Layer > Protocol: HTTP
//   http://localhost:3000/api/darwin/geojson?area=indonesia
//
// Add &download=1 to get it as a file attachment instead.

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const area = sp.get("area");
  try {
    // The live slots are what is under advisory right now; the dated archive
    // lags by days. Skip bulletins with nothing to plot — an export of empty
    // FeatureCollections is a useless file.
    const bulletins = (await fetchLiveBulletins()).filter(
      (b) => availableFrames(parseVaaText(b.text)).length > 0
    );

    const features = bulletins.flatMap((b) => {
      const advisory = parseVaaText(b.text);
      if (area && !matchesArea(advisory, area)) return [];
      const ash = assessAsh(advisory);
      return advisoryGeoJSON(advisory).features.map((f) => ({
        ...f,
        properties: { ...f.properties, sourceFile: b.file, ashStatus: ash.status },
      }));
    });

    const body = {
      type: "FeatureCollection" as const,
      // CRS84 (lon, lat) is the GeoJSON default; stated so GIS tools don't guess.
      features,
      metadata: {
        source: "ftp://ftp.bom.gov.au/anon/gen/vaac/",
        vaac: "DARWIN",
        area: area ?? "all",
        bulletinsScanned: bulletins.length,
        generatedAt: new Date().toISOString(),
      },
    };

    const headers: Record<string, string> = { "Content-Type": "application/geo+json" };
    if (sp.get("download") === "1") {
      const stamp = new Date().toISOString().slice(0, 16).replace(/[-:]/g, "");
      headers["Content-Disposition"] = `attachment; filename="darwin-vaa-${area ?? "all"}-${stamp}.geojson"`;
    }

    return new NextResponse(JSON.stringify(body), { headers });
  } catch (err) {
    return NextResponse.json({ error: `GeoJSON export failed: ${(err as Error).message}` }, { status: 502 });
  }
}
