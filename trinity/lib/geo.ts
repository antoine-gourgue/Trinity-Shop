// Calculs utilisés par le choix du magasin, côté navigateur comme côté serveur

export interface Coordinates {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_KM = 6371;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

// Distance à vol d'oiseau entre deux points, en kilomètres (formule de haversine)
export function distanceKm(from: Coordinates, to: Coordinates) {
  const dLat = radians(to.latitude - from.latitude);
  const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

// « 850 m », « 12 km »
export function formatDistance(km: number) {
  return km < 1 ? `${Math.round(km * 100) * 10} m` : `${Math.round(km)} km`;
}

// Texte comparable sans accents ni majuscules : « Évry » se trouve en tapant « evry »
export function searchable(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
