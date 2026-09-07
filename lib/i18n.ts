// English and Indonesian strings.
//
// ponytail: a plain typed dictionary, no i18n library. Two locales, no
// pluralization rules that Indonesian needs (it has none), no locale routing,
// and dates already go through Intl. next-intl would add a dependency,
// middleware and a routing scheme to do less than this file does. Reach for a
// library when a third locale needs real plural categories or translators need
// a file format of their own.
//
// What is NOT translated, deliberately: the raw VAA bulletin and NOTAM text.
// Those are source documents an operator may need to quote verbatim.

export type Locale = "en" | "id";

export const LOCALES: { code: Locale; label: string; native: string }[] = [
  { code: "en", label: "English", native: "English" },
  { code: "id", label: "Indonesian", native: "Bahasa Indonesia" },
];

const en = {
  "app.title": "AshMap",
  "app.tagline": "Real ICAO advisory polygons, live wind, animated forecast drift",

  "map.loading": "Reading the Darwin VAAC feed…",
  "map.unavailable": "Feed unavailable: {error}",
  "map.empty": "No advisory plotted. Pick one from the Darwin feed, or paste a bulletin.",
  "map.openPanel": "Open advisory panel",
  "map.aria": "Volcanic ash advisory map",

  "section.feed": "Darwin VAAC feed",
  "section.airports": "Airports under ash",
  "section.alerts": "Alerts",
  "section.levels": "Volcano alert levels",
  "section.wind": "Wind overlay",
  "section.layers": "Layers on the map",
  "section.time": "Times & time zone",
  "section.legend": "Legend",
  "section.source": "Advisory source",
  "section.about": "About & sources",

  "feed.blurb": "Newest Darwin VAAC bulletins, straight from BOM's public FTP.",
  "feed.every": "Checked every {interval}.",
  "feed.off": "Auto-refresh is off.",
  "feed.refresh": "Refresh",
  "feed.contacting": "Contacting ftp.bom.gov.au…",
  "feed.areaIndonesia": "Indonesia",
  "feed.areaAll": "All of Darwin",
  "feed.noneIndonesia":
    "None of the {total} bulletins on the feed are in Indonesia. Darwin's area also covers Papua New Guinea, East Timor and the south Pacific — switch to “All of Darwin” to see them.",
  "feed.none": "No Darwin bulletins on the feed. Darwin issues these only while a volcano in its area is active.",
  "feed.newCount": "{count} new bulletin(s) since you last looked",
  "feed.markSeen": "Mark seen",
  "feed.autoRefresh": "Auto-refresh",
  "feed.checked": "Checked",
  "feed.download": "Download GeoJSON",
  "feed.frames": "{count} frame(s)",
  "feed.noCloud": "no cloud",
  "feed.stale": "Showing the last successful fetch; BOM did not respond.",

  "airports.none":
    "No airport in the dataset falls inside a plotted ash polygon, on any frame of the advisories currently on the map. That is the common case: most clouds drift over water.",
  "airports.affectedNow": "{count} affected now",
  "airports.forecast": "{count} forecast",
  "airports.toSurface": "{count} to surface",
  "airports.badgeSurface": "To surface",
  "airports.badgeAloft": "Aloft only",
  "airports.now": "now",
  "airports.showMore": "Show {count} more",
  "airports.caveat":
    "Geometry only: an airport is listed when it falls inside an advisory polygon. Whether an aerodrome is actually closed is decided by its authority and published as a NOTAM or ASHTAM.",
  "airports.checkNotams": "Check published NOTAMs",
  "airports.reading": "Reading NOTAMs for {icao}…",
  "airports.noNotams": "No active NOTAMs returned for {icao}.",
  "airports.active": "{count} active",
  "airports.ashNotams": "{count} volcanic ash",
  "airports.closures": "{count} closure(s)",
  "airports.volcanicAsh": "Volcanic ash",
  "airports.closure": "Closure",
  "airports.untilFurther": "until further notice",
  "airports.permanent": "permanent",
  "airports.ends": "ends {when}",
  "airports.estimated": "estimated",
  "airports.retry": "Retry",

  "ash.observed": "Ash observed to {bands}.",
  "ash.estimated": "Ash estimated to {bands}.",
  "ash.forecast": "Forecast ash to {bands}.",
  "ash.ended": "This advisory reports ash is no longer identifiable or expected.",
  "ash.none": "This advisory carries no plotted ash cloud.",
  "ash.drifting": "{height} drifting {drift}",
  "ash.bandJoin": "; and to ",

  "wind.show": "Show vectors",
  "wind.live": "Open-Meteo, live",
  "wind.level": "Pressure level",

  "layers.hideBelow": "Hide ash below",
  "layers.showAll": "Show all levels",
  "layers.andAbove": "FL{fl} and above",
  "layers.cruising": "Cruising traffic sits near FL350, so filtering low ash leaves what matters at altitude.",
  "layers.show": "Show {name} on the map",
  "layers.hide": "Hide {name} on the map",

  "legend.title": "Legend",
  "legend.ashTop": "Ash top",
  "legend.windDownwind": "Wind, downwind",
  "legend.ashBand": "Ash polygon — advisory flight level. FL is hundreds of feet, so FL300 is 30,000 ft.",
  "legend.windBand": "Arrow — wind speed, pointing downwind",

  "time.zulu": "Zulu (UTC)",
  "time.local": "My time",
  "time.explain":
    "Advisories are timed in Zulu — one clock (UTC) used worldwide, so a bulletin means the same instant wherever it is read. A trailing Z marks it.",
  "time.showingLocal": "Times are shown in {zone}.",
  "time.switchHint": "Switch to “My time” for {zone}. Either way, hovering a time shows the other.",

  "alerts.blurb":
    "Notifies you when Darwin issues a new advisory for a volcano on the map, or when an aerodrome under the ash is reported closed.",
  "alerts.enable": "Enable notifications",
  "alerts.on": "Notifications on",
  "alerts.blocked": "Blocked for this site. Re-allow it in the browser's site settings.",
  "alerts.unsupported": "This browser has no notification support.",
  "alerts.ceiling": "This needs the tab open — there is no background service, so a closed browser gets nothing.",
  "alerts.newAdvisory": "New advisory: {volcano}",
  "alerts.closed": "{icao} closed",
  "alerts.closedBody": "Aerodrome closed (NOTAM)",

  "levels.blurb":
    "{count} Indonesian volcanoes are on PVMBG's watch list. Levels run I Normal, II Waspada, III Siaga, IV Awas; Level IV means evacuation is under way. The level shown on an advisory is the volcano's own status, which is separate from whether its ash is currently in the air.",
  "levels.unavailable": "PVMBG alert levels are unavailable right now.",

  "source.url": "Official VAAC URL",
  "source.fetch": "Fetch advisory",
  "source.paste": "Or paste raw VAA text",
  "source.pasteHint": "Works for any VAAC — Darwin, Tokyo, London, Toulouse — the ICAO format is identical.",
  "source.parse": "Parse",
  "source.sample": "Krakatau sample",
  "source.raw": "Raw bulletin",
  "source.rawLines": "{count} lines, as issued",
  "source.copy": "Copy",
  "source.copied": "Copied",

  "card.issued": "Issued",
  "card.area": "Area",
  "card.summit": "Summit",
  "card.next": "Next",
  "card.framesOnTimeline": "Frames on the timeline",
  "card.pressPlay": "Press play on the map to watch the cloud drift between them.",
  "card.remarks": "Remarks",
  "card.unknownVolcano": "Unknown volcano",

  "credits.builtBy": "Built by",
  "credits.source": "Source",
  "credits.notOfficial":
    "Advisory data is reproduced as published. This is not an official aviation product: for flight planning, use the advisories and NOTAMs issued by the responsible VAAC and your national AIS.",

  "onboarding.title": "Three sources, three questions",
  "onboarding.intro":
    "This map reads three independent official sources. Each answers a different question, and they can disagree.",
  "onboarding.vaacTitle": "Darwin VAAC advisory",
  "onboarding.vaacBody": "Is there ash in the air, how high, and drifting where. Updated as the VAAC issues bulletins.",
  "onboarding.pvmbgTitle": "PVMBG alert level",
  "onboarding.pvmbgBody":
    "What the volcano itself is doing: I Normal, II Waspada, III Siaga, IV Awas. Level IV means evacuation is under way.",
  "onboarding.notamTitle": "NOTAM",
  "onboarding.notamBody":
    "Whether an aerodrome is actually restricted. Only its authority can decide that — a polygon on a map cannot.",
  "onboarding.flTitle": "Reading the heights",
  "onboarding.flBody":
    "Ash heights are given as flight levels: FL is hundreds of feet, so FL300 is 30,000 ft or about 9,100 m. Every height on this map also shows feet and metres.",
  "onboarding.disclaimer":
    "Not an official aviation product. For flight planning use the advisories and NOTAMs from the responsible VAAC and your national AIS.",
  "onboarding.start": "Open the map",
  "onboarding.language": "Language",

  "lang.label": "Language",
} as const;

export type MessageKey = keyof typeof en;

const id: Record<MessageKey, string> = {
  "app.title": "AshMap",
  "app.tagline": "Poligon adviso ICAO asli, angin terkini, animasi pergerakan prakiraan",

  "map.loading": "Membaca umpan VAAC Darwin…",
  "map.unavailable": "Umpan tidak tersedia: {error}",
  "map.empty": "Belum ada adviso di peta. Pilih dari umpan Darwin, atau tempel buletin.",
  "map.openPanel": "Buka panel adviso",
  "map.aria": "Peta adviso abu vulkanik",

  "section.feed": "Umpan VAAC Darwin",
  "section.airports": "Bandara di bawah abu",
  "section.alerts": "Notifikasi",
  "section.levels": "Tingkat aktivitas gunung api",
  "section.wind": "Lapisan angin",
  "section.layers": "Lapisan di peta",
  "section.time": "Waktu & zona waktu",
  "section.legend": "Keterangan",
  "section.source": "Sumber adviso",
  "section.about": "Tentang & sumber data",

  "feed.blurb": "Buletin VAAC Darwin terbaru, langsung dari FTP publik BOM.",
  "feed.every": "Diperiksa setiap {interval}.",
  "feed.off": "Penyegaran otomatis nonaktif.",
  "feed.refresh": "Segarkan",
  "feed.contacting": "Menghubungi ftp.bom.gov.au…",
  "feed.areaIndonesia": "Indonesia",
  "feed.areaAll": "Seluruh wilayah Darwin",
  "feed.noneIndonesia":
    "Tidak ada dari {total} buletin di umpan yang berada di Indonesia. Wilayah Darwin juga mencakup Papua Nugini, Timor Leste dan Pasifik selatan — pilih “Seluruh wilayah Darwin” untuk melihatnya.",
  "feed.none": "Tidak ada buletin Darwin di umpan. Darwin hanya menerbitkannya saat ada gunung api aktif di wilayahnya.",
  "feed.newCount": "{count} buletin baru sejak terakhir Anda lihat",
  "feed.markSeen": "Tandai sudah dibaca",
  "feed.autoRefresh": "Penyegaran otomatis",
  "feed.checked": "Diperiksa",
  "feed.download": "Unduh GeoJSON",
  "feed.frames": "{count} bingkai",
  "feed.noCloud": "tanpa awan abu",
  "feed.stale": "Menampilkan hasil pengambilan terakhir; BOM tidak merespons.",

  "airports.none":
    "Tidak ada bandara dalam basis data yang berada di dalam poligon abu, pada bingkai mana pun dari adviso yang sedang ditampilkan. Ini hal yang lazim: sebagian besar awan abu bergerak di atas laut.",
  "airports.affectedNow": "{count} terdampak sekarang",
  "airports.forecast": "{count} prakiraan",
  "airports.toSurface": "{count} hingga permukaan",
  "airports.badgeSurface": "Hingga permukaan",
  "airports.badgeAloft": "Hanya di ketinggian",
  "airports.now": "sekarang",
  "airports.showMore": "Tampilkan {count} lagi",
  "airports.caveat":
    "Hanya geometri: bandara terdaftar bila berada di dalam poligon adviso. Penutupan bandara diputuskan oleh otoritasnya dan diterbitkan sebagai NOTAM atau ASHTAM.",
  "airports.checkNotams": "Periksa NOTAM terbitan",
  "airports.reading": "Membaca NOTAM untuk {icao}…",
  "airports.noNotams": "Tidak ada NOTAM aktif untuk {icao}.",
  "airports.active": "{count} aktif",
  "airports.ashNotams": "{count} abu vulkanik",
  "airports.closures": "{count} penutupan",
  "airports.volcanicAsh": "Abu vulkanik",
  "airports.closure": "Penutupan",
  "airports.untilFurther": "sampai pemberitahuan lebih lanjut",
  "airports.permanent": "permanen",
  "airports.ends": "berakhir {when}",
  "airports.estimated": "perkiraan",
  "airports.retry": "Coba lagi",

  "ash.observed": "Abu teramati hingga {bands}.",
  "ash.estimated": "Abu diperkirakan hingga {bands}.",
  "ash.forecast": "Prakiraan abu hingga {bands}.",
  "ash.ended": "Adviso ini menyatakan abu sudah tidak teridentifikasi atau tidak diperkirakan lagi.",
  "ash.none": "Adviso ini tidak memuat poligon awan abu.",
  "ash.drifting": "{height} bergerak ke {drift}",
  "ash.bandJoin": "; dan hingga ",

  "wind.show": "Tampilkan vektor",
  "wind.live": "Open-Meteo, terkini",
  "wind.level": "Lapisan tekanan",

  "layers.hideBelow": "Sembunyikan abu di bawah",
  "layers.showAll": "Tampilkan semua ketinggian",
  "layers.andAbove": "FL{fl} dan di atasnya",
  "layers.cruising":
    "Lalu lintas jelajah berada di sekitar FL350, sehingga menyaring abu rendah menyisakan yang penting di ketinggian.",
  "layers.show": "Tampilkan {name} di peta",
  "layers.hide": "Sembunyikan {name} di peta",

  "legend.title": "Keterangan",
  "legend.ashTop": "Puncak abu",
  "legend.windDownwind": "Angin, arah tuju",
  "legend.ashBand":
    "Poligon abu — flight level pada adviso. FL adalah ratusan kaki, jadi FL300 berarti 30.000 kaki.",
  "legend.windBand": "Panah — kecepatan angin, menunjuk arah tuju",

  "time.zulu": "Zulu (UTC)",
  "time.local": "Waktu saya",
  "time.explain":
    "Adviso menggunakan waktu Zulu — satu jam acuan (UTC) yang dipakai di seluruh dunia, sehingga sebuah buletin berarti saat yang sama di mana pun dibaca. Akhiran Z menandainya.",
  "time.showingLocal": "Waktu ditampilkan dalam {zone}.",
  "time.switchHint": "Pilih “Waktu saya” untuk {zone}. Menyorot waktu selalu menampilkan yang satunya.",

  "alerts.blurb":
    "Memberi tahu Anda saat Darwin menerbitkan adviso baru untuk gunung api di peta, atau saat bandara di bawah abu dilaporkan ditutup.",
  "alerts.enable": "Aktifkan notifikasi",
  "alerts.on": "Notifikasi aktif",
  "alerts.blocked": "Diblokir untuk situs ini. Izinkan kembali di pengaturan situs peramban.",
  "alerts.unsupported": "Peramban ini tidak mendukung notifikasi.",
  "alerts.ceiling":
    "Ini memerlukan tab tetap terbuka — tidak ada layanan latar belakang, jadi peramban yang tertutup tidak menerima apa pun.",
  "alerts.newAdvisory": "Adviso baru: {volcano}",
  "alerts.closed": "{icao} ditutup",
  "alerts.closedBody": "Bandara ditutup (NOTAM)",

  "levels.blurb":
    "{count} gunung api Indonesia berada dalam daftar pengawasan PVMBG. Tingkatnya I Normal, II Waspada, III Siaga, IV Awas; Level IV berarti evakuasi sedang berlangsung. Tingkat yang tertera pada adviso adalah status gunung apinya sendiri, terpisah dari ada atau tidaknya abu di udara saat ini.",
  "levels.unavailable": "Tingkat aktivitas PVMBG sedang tidak tersedia.",

  "source.url": "URL VAAC resmi",
  "source.fetch": "Ambil adviso",
  "source.paste": "Atau tempel teks VAA mentah",
  "source.pasteHint": "Berlaku untuk semua VAAC — Darwin, Tokyo, London, Toulouse — format ICAO-nya identik.",
  "source.parse": "Baca",
  "source.sample": "Contoh Krakatau",
  "source.raw": "Buletin mentah",
  "source.rawLines": "{count} baris, sesuai terbitan",
  "source.copy": "Salin",
  "source.copied": "Tersalin",

  "card.issued": "Diterbitkan",
  "card.area": "Wilayah",
  "card.summit": "Puncak",
  "card.next": "Berikutnya",
  "card.framesOnTimeline": "Bingkai pada garis waktu",
  "card.pressPlay": "Tekan putar di peta untuk melihat awan abu bergerak di antaranya.",
  "card.remarks": "Catatan",
  "card.unknownVolcano": "Gunung api tidak diketahui",

  "credits.builtBy": "Dibuat oleh",
  "credits.source": "Kode sumber",
  "credits.notOfficial":
    "Data adviso ditampilkan sesuai terbitan. Ini bukan produk penerbangan resmi: untuk perencanaan penerbangan, gunakan adviso dan NOTAM dari VAAC yang berwenang serta AIS nasional Anda.",

  "onboarding.title": "Tiga sumber, tiga pertanyaan",
  "onboarding.intro":
    "Peta ini membaca tiga sumber resmi yang independen. Masing-masing menjawab pertanyaan berbeda, dan bisa saling berbeda.",
  "onboarding.vaacTitle": "Adviso VAAC Darwin",
  "onboarding.vaacBody":
    "Apakah ada abu di udara, seberapa tinggi, dan bergerak ke mana. Diperbarui setiap VAAC menerbitkan buletin.",
  "onboarding.pvmbgTitle": "Tingkat aktivitas PVMBG",
  "onboarding.pvmbgBody":
    "Kondisi gunung apinya sendiri: I Normal, II Waspada, III Siaga, IV Awas. Level IV berarti evakuasi sedang berlangsung.",
  "onboarding.notamTitle": "NOTAM",
  "onboarding.notamBody":
    "Apakah sebuah bandara benar-benar dibatasi. Hanya otoritasnya yang dapat memutuskan itu — poligon di peta tidak bisa.",
  "onboarding.flTitle": "Membaca ketinggian",
  "onboarding.flBody":
    "Ketinggian abu dinyatakan sebagai flight level: FL adalah ratusan kaki, jadi FL300 berarti 30.000 kaki atau sekitar 9.100 m. Setiap ketinggian di peta ini juga menampilkan kaki dan meter.",
  "onboarding.disclaimer":
    "Bukan produk penerbangan resmi. Untuk perencanaan penerbangan gunakan adviso dan NOTAM dari VAAC yang berwenang serta AIS nasional Anda.",
  "onboarding.start": "Buka peta",
  "onboarding.language": "Bahasa",

  "lang.label": "Bahasa",
};

const CATALOG: Record<Locale, Record<MessageKey, string>> = { en, id };

/**
 * Look up a key and substitute {placeholders}. A missing translation falls back
 * to English rather than rendering the key, so a gap reads as untranslated
 * rather than broken.
 */
export function translate(locale: Locale, key: MessageKey, params?: Record<string, string | number>): string {
  const template = CATALOG[locale]?.[key] ?? CATALOG.en[key] ?? key;
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, name: string) =>
    name in params ? String(params[name]) : `{${name}}`
  );
}

export function isLocale(value: unknown): value is Locale {
  return value === "en" || value === "id";
}

/** The browser's preference, defaulting to English. */
export function detectLocale(languages: readonly string[] = []): Locale {
  for (const lang of languages) {
    const base = lang.toLowerCase().split("-")[0];
    if (base === "id" || base === "in") return "id"; // "in" is the legacy code
    if (base === "en") return "en";
  }
  return "en";
}

export { en as EN_MESSAGES, id as ID_MESSAGES };
