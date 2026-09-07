// Airports in and around Indonesia, for testing which ones sit under an
// ash cloud.
//
// Generated from the OurAirports dataset (public domain,
// https://ourairports.com/data/), filtered to scheduled-service large and
// medium airports in Indonesia, plus the neighbouring hubs that Indonesian
// ash actually drifts over. Coordinates are the published aerodrome
// reference points.

export type Airport = {
  icao: string;
  iata: string;
  name: string;
  city: string;
  /** ISO country code. */
  cc: string;
  lat: number;
  lon: number;
  /** large_airport in the source data — used to rank what to show first. */
  major: boolean;
};

export const AIRPORTS: Airport[] = [
  { icao: "AYPY", iata: "POM", name: "Port Moresby Jacksons", city: "Port Moresby", cc: "PG", lat: -9.4434, lon: 147.22, major: true },
  { icao: "RPLL", iata: "MNL", name: "Ninoy Aquino", city: "Manila (Pasay)", cc: "PH", lat: 14.5086, lon: 121.02, major: true },
  { icao: "WAAA", iata: "UPG", name: "Sultan Hasanuddin", city: "Makassar", cc: "ID", lat: -5.0755, lon: 119.5537, major: true },
  { icao: "WADD", iata: "DPS", name: "Denpasar I Gusti Ngurah Rai", city: "Kuta, Badung", cc: "ID", lat: -8.7484, lon: 115.1671, major: true },
  { icao: "WADL", iata: "LOP", name: "Lombok", city: "Mataram (Pujut, Lombok Tengah)", cc: "ID", lat: -8.76, lon: 116.2782, major: true },
  { icao: "WAHI", iata: "YIA", name: "Yogyakarta", city: "Yogyakarta", cc: "ID", lat: -7.9053, lon: 110.0573, major: true },
  { icao: "WAHQ", iata: "SOC", name: "Adisoemarmo", city: "Surakarta", cc: "ID", lat: -7.516, lon: 110.7575, major: true },
  { icao: "WAHS", iata: "SRG", name: "Jenderal Ahmad Yani", city: "Semarang", cc: "ID", lat: -6.9707, lon: 110.3732, major: true },
  { icao: "WAJJ", iata: "DJJ", name: "Dortheys Hiyo Eluay", city: "Sentani", cc: "ID", lat: -2.5796, lon: 140.5199, major: true },
  { icao: "WALL", iata: "BPN", name: "Sultan Aji Muhammad Sulaiman Sepinggan", city: "Balikpapan", cc: "ID", lat: -1.2683, lon: 116.8945, major: true },
  { icao: "WAMM", iata: "MDC", name: "Sam Ratulangi", city: "Manado", cc: "ID", lat: 1.5486, lon: 124.9262, major: true },
  { icao: "WAOO", iata: "BDJ", name: "Syamsudin Noor", city: "Banjarbaru", cc: "ID", lat: -3.4401, lon: 114.7612, major: true },
  { icao: "WAPP", iata: "AMQ", name: "Pattimura", city: "Ambon", cc: "ID", lat: -3.7103, lon: 128.089, major: true },
  { icao: "WARR", iata: "SUB", name: "Juanda", city: "Surabaya", cc: "ID", lat: -7.3798, lon: 112.787, major: true },
  { icao: "WBGG", iata: "KCH", name: "Kuching", city: "Kuching", cc: "MY", lat: 1.4874, lon: 110.3529, major: true },
  { icao: "WBSB", iata: "BWN", name: "Brunei", city: "Bandar Seri Begawan", cc: "BN", lat: 4.9442, lon: 114.928, major: true },
  { icao: "WIDD", iata: "BTH", name: "Hang Nadim", city: "Batam", cc: "ID", lat: 1.121, lon: 104.119, major: true },
  { icao: "WIEE", iata: "PDG", name: "Minangkabau", city: "Padang (Katapiang)", cc: "ID", lat: -0.786, lon: 100.2804, major: true },
  { icao: "WIHH", iata: "HLP", name: "Halim Perdanakusuma", city: "Jakarta", cc: "ID", lat: -6.267, lon: 106.8903, major: true },
  { icao: "WIII", iata: "CGK", name: "Soekarno-Hatta", city: "Jakarta", cc: "ID", lat: -6.1256, lon: 106.656, major: true },
  { icao: "WIMM", iata: "KNO", name: "Kualanamu", city: "Beringin", cc: "ID", lat: 3.6378, lon: 98.8706, major: true },
  { icao: "WIOO", iata: "PNK", name: "Supadio", city: "Pontianak", cc: "ID", lat: -0.1523, lon: 109.4045, major: true },
  { icao: "WITT", iata: "BTJ", name: "Sultan Iskandar Muda", city: "Banda Aceh", cc: "ID", lat: 5.5251, lon: 95.42, major: true },
  { icao: "WMKK", iata: "KUL", name: "Kuala Lumpur", city: "Sepang", cc: "MY", lat: 2.7456, lon: 101.71, major: true },
  { icao: "WMKP", iata: "PEN", name: "Penang", city: "Penang", cc: "MY", lat: 5.2963, lon: 100.2762, major: true },
  { icao: "WPDL", iata: "DIL", name: "Presidente Nicolau Lobato", city: "Dili", cc: "TL", lat: -8.5466, lon: 125.5245, major: true },
  { icao: "WSSS", iata: "SIN", name: "Singapore Changi", city: "Singapore", cc: "SG", lat: 1.3502, lon: 103.994, major: true },
  { icao: "YBRM", iata: "BME", name: "Broome", city: "Broome", cc: "AU", lat: -17.9492, lon: 122.2283, major: true },
  { icao: "YPDN", iata: "DRW", name: "Darwin / RAAF Darwin", city: "Darwin", cc: "AU", lat: -12.415, lon: 130.8818, major: true },
  { icao: "WABB", iata: "BIK", name: "Frans Kaisiepo", city: "Biak", cc: "ID", lat: -1.19, lon: 136.108, major: false },
  { icao: "WADB", iata: "BMU", name: "Sultan Muhammad Salahuddin", city: "Bima", cc: "ID", lat: -8.5372, lon: 118.685, major: false },
  { icao: "WAEE", iata: "TTE", name: "Sultan Babullah", city: "Ternate", cc: "ID", lat: 0.831, lon: 127.3816, major: false },
  { icao: "WAFB", iata: "TRT", name: "Toraja", city: "Toraja", cc: "ID", lat: -3.1844, lon: 119.9191, major: false },
  { icao: "WAFF", iata: "PLW", name: "Mutiara - SIS Al-Jufrie", city: "Palu", cc: "ID", lat: -0.9165, lon: 119.9086, major: false },
  { icao: "WAGG", iata: "PKY", name: "Tjilik Riwut", city: "Palangkaraya", cc: "ID", lat: -2.2271, lon: 113.9434, major: false },
  { icao: "WAHH", iata: "JOG", name: "Adisutjipto", city: "Yogyakarta", cc: "ID", lat: -7.7882, lon: 110.432, major: false },
  { icao: "WAHL", iata: "CXP", name: "Tunggul Wulung", city: "Cilacap", cc: "ID", lat: -7.6451, lon: 109.034, major: false },
  { icao: "WAJO", iata: "OKL", name: "Oksibil", city: "Oksibil", cc: "ID", lat: -4.9071, lon: 140.6277, major: false },
  { icao: "WAKK", iata: "MKQ", name: "Mopah", city: "Merauke", cc: "ID", lat: -8.5239, lon: 140.4197, major: false },
  { icao: "WAKT", iata: "TMH", name: "Tanah Merah", city: "Tanah Merah", cc: "ID", lat: -6.0967, lon: 140.3035, major: false },
  { icao: "WALS", iata: "AAP", name: "Aji Pangeran Tumenggung Pranoto", city: "Samarinda", cc: "ID", lat: -0.3745, lon: 117.2501, major: false },
  { icao: "WAMH", iata: "NAH", name: "Naha", city: "Tabukan Utara, Sangihe Islands", cc: "ID", lat: 3.6848, lon: 125.5272, major: false },
  { icao: "WAON", iata: "TJG", name: "Warukin", city: "Tanta-Tabalong", cc: "ID", lat: -2.2166, lon: 115.436, major: false },
  { icao: "WAPF", iata: "LUV", name: "Karel Sadsuitubun", city: "Langgur", cc: "ID", lat: -5.7603, lon: 132.7594, major: false },
  { icao: "WAPN", iata: "NAM", name: "Namniwel", city: "Namniwel", cc: "ID", lat: -3.1432, lon: 126.9765, major: false },
  { icao: "WAQQ", iata: "TRK", name: "Juwata / Suharnoko Harbani AFB", city: "Tarakan", cc: "ID", lat: 3.3251, lon: 117.5642, major: false },
  { icao: "WAQT", iata: "BEJ", name: "Kalimarau", city: "Tanjung Redeb - Borneo Island", cc: "ID", lat: 2.1478, lon: 117.4307, major: false },
  { icao: "WARA", iata: "MLG", name: "Abdul Rachman Saleh", city: "Malang", cc: "ID", lat: -7.9291, lon: 112.7142, major: false },
  { icao: "WARD", iata: "DHX", name: "Dhoho", city: "Kediri", cc: "ID", lat: -7.7495, lon: 111.9468, major: false },
  { icao: "WASF", iata: "FKQ", name: "Fakfak", city: "Fakfak", cc: "ID", lat: -2.9205, lon: 132.267, major: false },
  { icao: "WASK", iata: "KNG", name: "Utarom", city: "Kaimana", cc: "ID", lat: -3.6446, lon: 133.6951, major: false },
  { icao: "WASS", iata: "SOQ", name: "Domine Eduard Osok", city: "Sorong", cc: "ID", lat: -0.894, lon: 131.287, major: false },
  { icao: "WATT", iata: "KOE", name: "El Tari", city: "Kupang", cc: "ID", lat: -10.1716, lon: 123.671, major: false },
  { icao: "WAUU", iata: "MKW", name: "Rendani", city: "Manokwari", cc: "ID", lat: -0.8918, lon: 134.049, major: false },
  { icao: "WAVV", iata: "WMX", name: "Wamena", city: "Wamena", cc: "ID", lat: -4.0973, lon: 138.9524, major: false },
  { icao: "WAWD", iata: "WNI", name: "Matahora", city: "Wangi-wangi Island", cc: "ID", lat: -5.2921, lon: 123.6362, major: false },
  { icao: "WAWP", iata: "KXB", name: "Sangia Nibandera", city: "Kolaka", cc: "ID", lat: -4.3382, lon: 121.524, major: false },
  { icao: "WAYB", iata: "UGU", name: "Bilorai", city: "Bilogai", cc: "ID", lat: -3.7395, lon: 137.0312, major: false },
  { icao: "WAYY", iata: "TIM", name: "Mozes Kilangin", city: "Timika", cc: "ID", lat: -4.5298, lon: 136.8874, major: false },
  { icao: "WIBB", iata: "PKU", name: "Sultan Syarif Kasim II / Roesmin Nurjadin AFB", city: "Pekanbaru", cc: "ID", lat: 0.4586, lon: 101.4443, major: false },
  { icao: "WIBD", iata: "DUM", name: "Pinang Kampai", city: "Dumai", cc: "ID", lat: 1.609, lon: 101.4335, major: false },
  { icao: "WICA", iata: "KJT", name: "Kertajati", city: "Kertajati", cc: "ID", lat: -6.6474, lon: 108.1656, major: false },
  { icao: "WICC", iata: "BDO", name: "Husein Sastranegara", city: "Bandung", cc: "ID", lat: -6.9006, lon: 107.576, major: false },
  { icao: "WIDN", iata: "TNJ", name: "Raja Haji Fisabilillah", city: "Tanjung Pinang-Bintan Island", cc: "ID", lat: 0.924, lon: 104.5334, major: false },
  { icao: "WIDO", iata: "NTX", name: "Ranai", city: "Ranai-Natuna Besar Island", cc: "ID", lat: 3.9087, lon: 108.388, major: false },
  { icao: "WIGG", iata: "BKS", name: "Fatmawati Soekarno", city: "Bengkulu", cc: "ID", lat: -3.8637, lon: 102.339, major: false },
  { icao: "WIKK", iata: "PGK", name: "Depati Amir", city: "Pangkal Pinang", cc: "ID", lat: -2.1622, lon: 106.139, major: false },
  { icao: "WILL", iata: "TKG", name: "Radin Inten II", city: "Bandar Lampung", cc: "ID", lat: -5.2468, lon: 105.1825, major: false },
  { icao: "WIMB", iata: "GNS", name: "Binaka", city: "Gunungsitoli", cc: "ID", lat: 1.1663, lon: 97.7052, major: false },
  { icao: "WIMS", iata: "FLZ", name: "Dr. Ferdinand Lumban Tobing", city: "Sibolga (Pinangsori)", cc: "ID", lat: 1.5571, lon: 98.8871, major: false },
  { icao: "WIMU", iata: "LSR", name: "Alas Leuser", city: "Kutacane", cc: "ID", lat: 3.3915, lon: 97.8637, major: false },
  { icao: "WIOG", iata: "NPO", name: "Nanga Pinoh", city: "Nanga Pinoh-Borneo Island", cc: "ID", lat: -0.3486, lon: 111.7462, major: false },
  { icao: "WIOK", iata: "KTG", name: "Rahadi Osman", city: "Ketapang", cc: "ID", lat: -1.8172, lon: 109.9635, major: false },
  { icao: "WIOP", iata: "PSU", name: "Pangsuma", city: "Putussibau-Borneo Island", cc: "ID", lat: 0.8346, lon: 112.9402, major: false },
  { icao: "WIOS", iata: "SQG", name: "Tebelian", city: "Sintang", cc: "ID", lat: -0.0452, lon: 111.458, major: false },
  { icao: "WIPP", iata: "PLM", name: "Sultan Mahmud Badaruddin II", city: "Palembang", cc: "ID", lat: -2.8977, lon: 104.6981, major: false },
  { icao: "WIPQ", iata: "PDO", name: "Pendopo", city: "Talang Gudang-Sumatra Island", cc: "ID", lat: -3.2861, lon: 103.88, major: false },
  { icao: "WITC", iata: "MEQ", name: "Cut Nyak Dhien", city: "Kuala Pesisir", cc: "ID", lat: 4.041, lon: 96.2533, major: false },
  { icao: "WITK", iata: "TXE", name: "Rembele", city: "Takengon", cc: "ID", lat: 4.7211, lon: 96.8519, major: false },
];

export function findAirport(code: string): Airport | undefined {
  const c = code.trim().toUpperCase();
  return AIRPORTS.find((a) => a.icao === c || a.iata === c);
}
