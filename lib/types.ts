export type WindVector = {
  lat: number;
  lon: number;
  speedKmh: number;
  directionDeg: number; // meteorological convention: direction the wind is FROM
};
