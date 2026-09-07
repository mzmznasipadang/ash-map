// Privacy policy and terms, in both locales.
//
// ponytail: plain data, not MDX. Two documents in two languages is a
// dictionary, and this app already translates by dictionary (lib/i18n.ts). A
// content pipeline would add a dependency and a build step to render what a
// map over an array renders.
//
// The privacy copy is an inventory of what the app actually does, so it has to
// be re-read whenever storage, analytics or an upstream changes. The things it
// currently claims, and where they live:
//
//   browser storage   components/time-mode.tsx, components/onboarding.tsx,
//                     components/darwin-feed.tsx, components/consent.tsx,
//                     next-themes
//   analytics         app/layout.tsx (gated on consent)
//   IP in Redis       proxy.ts, for 60 seconds
//   direct requests   the Esri basemap tiles in components/AshMap.tsx

import type { Locale } from "./i18n.ts";
import { AUTHOR, REPO_URL, SITE_NAME } from "./site.ts";

export type LegalKind = "privacy" | "terms";

export type LegalSection = {
  heading: string;
  body: string[];
  links?: { label: string; href: string }[];
};

export type LegalDoc = {
  title: string;
  description: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

/** Shown as "last updated". Bump it when the copy below changes. */
export const LEGAL_UPDATED = "2026-09-07";

const CONTACT_LINKS = [
  { label: "GitHub issues", href: `${REPO_URL}/issues` },
  { label: AUTHOR.name, href: AUTHOR.url },
];

const en: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: "Privacy",
    description: `What ${SITE_NAME} stores, what it sends, and who else your browser talks to while the map is open.`,
    updated: LEGAL_UPDATED,
    intro: `${SITE_NAME} has no accounts, no sign-in and no contact form, so there is nothing here for you to hand over. What follows is the full inventory of what is stored and what is sent anyway, because a map that reads live data always talks to somebody.`,
    sections: [
      {
        heading: "No cookies",
        body: [
          "This site sets no cookies. Nothing is written to identify you across visits or across sites, and nothing here is shared with an advertising network.",
        ],
      },
      {
        heading: "What is kept in your browser",
        body: [
          "A handful of preferences are stored in your browser's local storage. They never leave the device and are readable only by this site:",
          "• the light or dark theme you chose;\n• whether times are shown in UTC (Zulu) or your local zone;\n• whether you have dismissed the introduction;\n• the newest Darwin bulletin you have already seen, so new ones can be counted;\n• your auto-refresh interval;\n• whether you accepted or declined analytics.",
          "Your language is not stored: it is part of the address, which is what makes /en and /id shareable.",
          "Clearing site data in your browser removes all of it, and the app opens at its defaults again.",
        ],
      },
      {
        heading: "What the server sees",
        body: [
          "The site runs on Vercel, which records ordinary web-server logs for every request: IP address, user agent, the path requested and a timestamp. Retention is Vercel's, not ours.",
          "The API routes are rate limited per IP. That counter stores your IP address in a Redis key that expires after 60 seconds. It is used for nothing else and is not read back for any other purpose.",
        ],
        links: [{ label: "Vercel privacy policy", href: "https://vercel.com/legal/privacy-policy" }],
      },
      {
        heading: "Analytics, only if you accept",
        body: [
          "Vercel Analytics and Vercel Speed Insights measure page views and load performance in aggregate. They set no cookies and build no cross-site profile, but they are still a third-party request, so they are not loaded at all until you accept them on the banner. Decline, and the scripts are never fetched.",
          "You can change your mind at any time from the link in the footer of this page.",
        ],
        links: [{ label: "Vercel Analytics privacy", href: "https://vercel.com/docs/analytics/privacy-policy" }],
      },
      {
        heading: "Who your browser contacts directly",
        body: [
          "The basemap under the ash polygons is served by Esri as map tiles, requested by your browser as you pan and zoom. Esri therefore sees your IP address and which tiles you asked for, the same as any embedded map.",
          "Fonts are not one of these: they are downloaded at build time and served from this domain, so no request goes to Google while you use the site.",
        ],
        links: [{ label: "Esri privacy statement", href: "https://www.esri.com/en-us/privacy/overview" }],
      },
      {
        heading: "Who the server contacts for you",
        body: [
          "Advisories, wind, volcano alert levels and NOTAMs are fetched by this site's server, not by your browser. Those upstreams see a request from the server; they do not see your IP address, and nothing about you is forwarded to them.",
        ],
        links: [
          { label: "Bureau of Meteorology (Darwin VAAC)", href: "http://www.bom.gov.au/aviation/volcanic-ash/" },
          { label: "PVMBG, Badan Geologi", href: "https://magma.esdm.go.id/" },
          { label: "Open-Meteo", href: "https://open-meteo.com/" },
          { label: "SkyLink API", href: "https://skylinkapi.com/" },
        ],
      },
      {
        heading: "Notifications",
        body: [
          "If you turn on alerts, the browser asks for permission and the notifications are composed on your device from data already on the page. Nothing is sent to a push service, and no subscription is registered anywhere. Revoke the permission in your browser's site settings to stop them.",
        ],
      },
      {
        heading: "What is not done here",
        body: [
          "No data is sold, rented or shared for advertising. There is no profiling, no cross-site tracking, no fingerprinting, and no attempt to identify who you are.",
        ],
      },
      {
        heading: "Questions",
        body: [
          "The site is open source, so every claim above can be checked against the code rather than taken on trust. Corrections and questions are welcome.",
        ],
        links: [{ label: "Source code", href: REPO_URL }, ...CONTACT_LINKS],
      },
      {
        heading: "Changes",
        body: [
          "If what is collected changes, this page changes with it and the date at the top moves. There is no mailing list to notify, because there are no accounts.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms",
    description: `The terms for using ${SITE_NAME}: what it is, what it is emphatically not, and how the data on it may be used.`,
    updated: LEGAL_UPDATED,
    intro: `${SITE_NAME} is a free, open-source map of volcanic ash advisories. Using it means accepting the terms below. The first one matters more than the rest.`,
    sections: [
      {
        heading: "Not an official aviation product",
        body: [
          "This is not an aeronautical information service and must not be used for flight planning, dispatch, or any operational decision.",
          "The polygons here are a rendering of advisories issued by a Volcanic Ash Advisory Centre. They are redrawn by software that can misparse a bulletin, they may be out of date by the time you read them, and an airport shown under ash is a geometric result — not a closure. Only the responsible aerodrome authority decides that, and it publishes the decision as a NOTAM or ASHTAM.",
          "For anything operational, use the advisories and NOTAMs issued by the responsible VAAC and your national AIS.",
        ],
      },
      {
        heading: "No warranty",
        body: [
          "The site is provided as is, without warranty of any kind. Nothing here is guaranteed to be accurate, complete, current or available. Every upstream source can fail, return nothing, or return something wrong, and the app cannot always tell the difference — which is why the source-health panel exists and why it should be read.",
        ],
      },
      {
        heading: "Limitation of liability",
        body: [
          "To the fullest extent permitted by law, the author is not liable for any loss or damage arising from use of this site or reliance on anything shown on it.",
        ],
      },
      {
        heading: "The data is not ours",
        body: [
          "The advisories, alert levels, wind fields, NOTAMs and basemap tiles belong to the organisations that publish them, and your use of them is subject to their terms — including the Bureau of Meteorology's Commonwealth of Australia copyright and Open-Meteo's CC BY 4.0 attribution requirement. Attribution for every source is listed under “About & sources” in the app.",
          "The NOTAM data is licensed from a commercial provider for use in this app. Do not scrape it from here for redistribution; licence it yourself instead.",
        ],
        links: [
          { label: "Bureau of Meteorology copyright", href: "http://www.bom.gov.au/other/copyright.shtml" },
          { label: "Open-Meteo terms", href: "https://open-meteo.com/en/terms" },
          { label: "Esri terms of use", href: "https://www.esri.com/en-us/legal/terms/full-master-agreement" },
        ],
      },
      {
        heading: "The code is MIT",
        body: [
          "The source code is published under the MIT licence: run it, modify it, deploy your own. That licence covers the code only, never the data it fetches.",
        ],
        links: [{ label: "Source code and licence", href: REPO_URL }],
      },
      {
        heading: "Fair use of the API",
        body: [
          "The API routes are open so that a GIS client can read the same GeoJSON the map draws. They are rate limited per IP, they open an FTP session and spend a metered NOTAM quota, and a crawler is asked not to touch them in robots.txt.",
          "Automated bulk collection, or any use that degrades the service for other people, is not permitted. If you need the data at volume, take the source and run your own instance against the upstreams directly.",
        ],
      },
      {
        heading: "Availability",
        body: [
          "This is a personal project with no service level of any kind. It may be slow, wrong, or gone tomorrow, with no notice and no obligation to keep it running.",
        ],
      },
      {
        heading: "Changes",
        body: [
          "These terms may change. The date at the top says when they last did, and continuing to use the site after that is acceptance of the current version.",
        ],
        links: CONTACT_LINKS,
      },
    ],
  },
};

const id: Record<LegalKind, LegalDoc> = {
  privacy: {
    title: "Privasi",
    description: `Apa yang disimpan ${SITE_NAME}, apa yang dikirim, dan pihak lain mana yang dihubungi peramban Anda selama peta terbuka.`,
    updated: LEGAL_UPDATED,
    intro: `${SITE_NAME} tidak memiliki akun, tidak ada proses masuk, dan tidak ada formulir kontak, jadi tidak ada yang perlu Anda serahkan. Berikut adalah daftar lengkap apa yang tetap disimpan dan dikirim, karena peta yang membaca data langsung selalu berkomunikasi dengan pihak lain.`,
    sections: [
      {
        heading: "Tanpa cookie",
        body: [
          "Situs ini tidak memasang cookie apa pun. Tidak ada yang ditulis untuk mengenali Anda antar kunjungan atau antar situs, dan tidak ada data yang dibagikan ke jaringan periklanan.",
        ],
      },
      {
        heading: "Yang disimpan di peramban Anda",
        body: [
          "Beberapa preferensi disimpan di local storage peramban Anda. Semuanya tidak pernah meninggalkan perangkat dan hanya dapat dibaca oleh situs ini:",
          "• tema terang atau gelap yang Anda pilih;\n• apakah waktu ditampilkan dalam UTC (Zulu) atau zona waktu Anda;\n• apakah Anda sudah menutup halaman perkenalan;\n• buletin Darwin terbaru yang sudah Anda lihat, agar yang baru dapat dihitung;\n• interval penyegaran otomatis;\n• apakah Anda menerima atau menolak analitik.",
          "Bahasa tidak disimpan: bahasa adalah bagian dari alamat, dan itulah yang membuat /en dan /id dapat dibagikan.",
          "Menghapus data situs di peramban akan menghapus semuanya, dan aplikasi kembali ke pengaturan bawaan.",
        ],
      },
      {
        heading: "Yang dilihat server",
        body: [
          "Situs ini berjalan di Vercel, yang mencatat log server web biasa untuk setiap permintaan: alamat IP, user agent, jalur yang diminta, dan waktu. Masa simpannya ditentukan oleh Vercel, bukan oleh kami.",
          "Rute API dibatasi lajunya per IP. Penghitung itu menyimpan alamat IP Anda pada kunci Redis yang kedaluwarsa setelah 60 detik. Data itu tidak dipakai untuk hal lain dan tidak dibaca kembali untuk tujuan apa pun.",
        ],
        links: [{ label: "Kebijakan privasi Vercel", href: "https://vercel.com/legal/privacy-policy" }],
      },
      {
        heading: "Analitik, hanya jika Anda setuju",
        body: [
          "Vercel Analytics dan Vercel Speed Insights mengukur jumlah kunjungan dan performa pemuatan secara agregat. Keduanya tidak memasang cookie dan tidak membangun profil lintas situs, tetapi tetap merupakan permintaan ke pihak ketiga, sehingga tidak dimuat sama sekali sebelum Anda menyetujuinya pada banner. Jika Anda menolak, skripnya tidak pernah diambil.",
          "Anda dapat mengubah pilihan kapan saja melalui tautan di bagian bawah halaman ini.",
        ],
        links: [{ label: "Privasi Vercel Analytics", href: "https://vercel.com/docs/analytics/privacy-policy" }],
      },
      {
        heading: "Pihak yang dihubungi peramban Anda secara langsung",
        body: [
          "Peta dasar di bawah poligon abu disajikan oleh Esri sebagai ubin peta, yang diminta oleh peramban Anda saat menggeser dan memperbesar. Karena itu Esri melihat alamat IP Anda dan ubin mana yang Anda minta, sama seperti peta tersemat mana pun.",
          "Font bukan salah satunya: font diunduh saat build dan disajikan dari domain ini, jadi tidak ada permintaan ke Google selama Anda memakai situs ini.",
        ],
        links: [{ label: "Pernyataan privasi Esri", href: "https://www.esri.com/en-us/privacy/overview" }],
      },
      {
        heading: "Pihak yang dihubungi server untuk Anda",
        body: [
          "Adviso, angin, tingkat aktivitas gunung api, dan NOTAM diambil oleh server situs ini, bukan oleh peramban Anda. Sumber-sumber itu melihat permintaan dari server; mereka tidak melihat alamat IP Anda, dan tidak ada informasi tentang Anda yang diteruskan.",
        ],
        links: [
          { label: "Bureau of Meteorology (VAAC Darwin)", href: "http://www.bom.gov.au/aviation/volcanic-ash/" },
          { label: "PVMBG, Badan Geologi", href: "https://magma.esdm.go.id/" },
          { label: "Open-Meteo", href: "https://open-meteo.com/" },
          { label: "SkyLink API", href: "https://skylinkapi.com/" },
        ],
      },
      {
        heading: "Notifikasi",
        body: [
          "Jika Anda menyalakan peringatan, peramban meminta izin dan notifikasi disusun di perangkat Anda dari data yang sudah ada di halaman. Tidak ada yang dikirim ke layanan push, dan tidak ada langganan yang didaftarkan di mana pun. Cabut izinnya di pengaturan situs peramban Anda untuk menghentikannya.",
        ],
      },
      {
        heading: "Yang tidak dilakukan di sini",
        body: [
          "Tidak ada data yang dijual, disewakan, atau dibagikan untuk periklanan. Tidak ada pembuatan profil, tidak ada pelacakan lintas situs, tidak ada fingerprinting, dan tidak ada upaya mengidentifikasi siapa Anda.",
        ],
      },
      {
        heading: "Pertanyaan",
        body: [
          "Situs ini bersumber terbuka, jadi setiap pernyataan di atas dapat diperiksa langsung pada kodenya, bukan sekadar dipercaya. Koreksi dan pertanyaan dipersilakan.",
        ],
        links: [{ label: "Kode sumber", href: REPO_URL }, ...CONTACT_LINKS],
      },
      {
        heading: "Perubahan",
        body: [
          "Jika yang dikumpulkan berubah, halaman ini ikut berubah dan tanggal di atas diperbarui. Tidak ada milis pemberitahuan, karena tidak ada akun.",
        ],
      },
    ],
  },
  terms: {
    title: "Ketentuan",
    description: `Ketentuan penggunaan ${SITE_NAME}: apa aplikasi ini, apa yang jelas-jelas bukan, dan bagaimana datanya boleh dipakai.`,
    updated: LEGAL_UPDATED,
    intro: `${SITE_NAME} adalah peta adviso abu vulkanik yang gratis dan bersumber terbuka. Menggunakannya berarti menerima ketentuan di bawah ini. Ketentuan pertama jauh lebih penting daripada sisanya.`,
    sections: [
      {
        heading: "Bukan produk penerbangan resmi",
        body: [
          "Ini bukan layanan informasi aeronautika dan tidak boleh dipakai untuk perencanaan penerbangan, dispatch, atau keputusan operasional apa pun.",
          "Poligon di sini adalah penggambaran ulang adviso yang diterbitkan Volcanic Ash Advisory Centre. Poligon itu digambar ulang oleh perangkat lunak yang bisa salah membaca buletin, bisa sudah usang saat Anda membacanya, dan bandara yang tampak berada di bawah abu adalah hasil perhitungan geometri — bukan penutupan. Hanya otoritas bandara terkait yang memutuskan hal itu, dan keputusannya diterbitkan sebagai NOTAM atau ASHTAM.",
          "Untuk keperluan operasional, gunakan adviso dan NOTAM dari VAAC yang berwenang serta AIS nasional Anda.",
        ],
      },
      {
        heading: "Tanpa jaminan",
        body: [
          "Situs ini disediakan apa adanya, tanpa jaminan dalam bentuk apa pun. Tidak ada isinya yang dijamin akurat, lengkap, mutakhir, atau tersedia. Setiap sumber data dapat gagal, mengembalikan data kosong, atau mengembalikan data yang salah, dan aplikasi tidak selalu bisa membedakannya — itulah sebabnya panel kesehatan sumber data ada dan sebaiknya dibaca.",
        ],
      },
      {
        heading: "Batasan tanggung jawab",
        body: [
          "Sejauh diizinkan oleh hukum yang berlaku, penulis tidak bertanggung jawab atas kerugian atau kerusakan apa pun yang timbul dari penggunaan situs ini atau dari ketergantungan pada apa pun yang ditampilkannya.",
        ],
      },
      {
        heading: "Datanya bukan milik kami",
        body: [
          "Adviso, tingkat aktivitas, medan angin, NOTAM, dan ubin peta dasar adalah milik organisasi yang menerbitkannya, dan penggunaan Anda tunduk pada ketentuan mereka — termasuk hak cipta Commonwealth of Australia milik Bureau of Meteorology dan kewajiban atribusi CC BY 4.0 dari Open-Meteo. Atribusi setiap sumber tercantum di “Tentang & sumber” dalam aplikasi.",
          "Data NOTAM dilisensikan dari penyedia komersial untuk dipakai di aplikasi ini. Jangan mengambilnya dari sini untuk didistribusikan ulang; lisensikan sendiri.",
        ],
        links: [
          { label: "Hak cipta Bureau of Meteorology", href: "http://www.bom.gov.au/other/copyright.shtml" },
          { label: "Ketentuan Open-Meteo", href: "https://open-meteo.com/en/terms" },
          { label: "Ketentuan penggunaan Esri", href: "https://www.esri.com/en-us/legal/terms/full-master-agreement" },
        ],
      },
      {
        heading: "Kodenya berlisensi MIT",
        body: [
          "Kode sumbernya diterbitkan di bawah lisensi MIT: jalankan, ubah, pasang instans Anda sendiri. Lisensi itu hanya mencakup kode, tidak pernah data yang diambilnya.",
        ],
        links: [{ label: "Kode sumber dan lisensi", href: REPO_URL }],
      },
      {
        heading: "Penggunaan API yang wajar",
        body: [
          "Rute API dibuka agar klien GIS dapat membaca GeoJSON yang sama dengan yang digambar peta. Rute itu dibatasi lajunya per IP, membuka sesi FTP dan memakai kuota NOTAM berbayar, dan perayap diminta untuk tidak menyentuhnya melalui robots.txt.",
          "Pengumpulan massal secara otomatis, atau penggunaan apa pun yang menurunkan layanan bagi orang lain, tidak diizinkan. Jika Anda membutuhkan data dalam jumlah besar, ambil kode sumbernya dan jalankan instans sendiri langsung ke sumber aslinya.",
        ],
      },
      {
        heading: "Ketersediaan",
        body: [
          "Ini proyek pribadi tanpa tingkat layanan dalam bentuk apa pun. Situs ini bisa lambat, keliru, atau hilang besok, tanpa pemberitahuan dan tanpa kewajiban untuk terus menjalankannya.",
        ],
      },
      {
        heading: "Perubahan",
        body: [
          "Ketentuan ini dapat berubah. Tanggal di atas menunjukkan kapan terakhir diubah, dan melanjutkan penggunaan situs setelah tanggal itu berarti menerima versi yang berlaku.",
        ],
        links: CONTACT_LINKS,
      },
    ],
  },
};

const CATALOG: Record<Locale, Record<LegalKind, LegalDoc>> = { en, id };

export function legalDoc(locale: Locale, kind: LegalKind): LegalDoc {
  return CATALOG[locale][kind];
}

/** Both documents, both locales — the routes and the sitemap read from this. */
export const LEGAL_KINDS: LegalKind[] = ["privacy", "terms"];
