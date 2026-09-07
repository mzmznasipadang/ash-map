// Visual encoding shared by the map and the legend.

export function flightLevelCeiling(flightLevel: string): number {
  // "SFC/FL140" -> 140, "FL120/FL500" -> 500
  const nums = flightLevel.match(/FL(\d+)/g)?.map((s) => Number(s.slice(2))) ?? [];
  return nums.length ? Math.max(...nums) : 0;
}

export const FL_BANDS = [
  // `metres` is the band's ceiling in metres, for readers who do not think in
  // flight levels. FL is hundreds of feet: FL150 = 15,000 ft = 4,600 m.
  { max: 150, color: "#4aa3e8", label: "≤ FL150", metres: "≤ 4,600 m" },
  { max: 300, color: "#f5a623", label: "FL151–300", metres: "4,600–9,100 m" },
  { max: 450, color: "#e0433d", label: "FL301–450", metres: "9,100–13,700 m" },
  { max: Infinity, color: "#9b30d9", label: "> FL450", metres: "above 13,700 m" },
];

export function flightLevelColor(flightLevel: string): string {
  const ceiling = flightLevelCeiling(flightLevel);
  return FL_BANDS.find((b) => ceiling <= b.max)?.color ?? FL_BANDS[FL_BANDS.length - 1].color;
}

export const WIND_LEVELS = [
  { hpa: "850", label: "850 hPa (~FL050)" },
  { hpa: "700", label: "700 hPa (~FL100)" },
  { hpa: "500", label: "500 hPa (~FL180)" },
  { hpa: "300", label: "300 hPa (~FL300)" },
  { hpa: "200", label: "200 hPa (~FL390)" },
  { hpa: "100", label: "100 hPa (~FL530)" },
];

export const WIND_BANDS = [
  { max: 20, color: "#4aa3e8", label: "< 20 km/h" },
  { max: 50, color: "#f5a623", label: "20\u201349" },
  { max: 90, color: "#e0433d", label: "50\u201389" },
  { max: Infinity, color: "#9b30d9", label: "\u2265 90" },
];

export function windColor(speedKmh: number): string {
  return WIND_BANDS.find((b) => speedKmh < b.max)?.color ?? WIND_BANDS[WIND_BANDS.length - 1].color;
}
