import { findRayonForCategories } from "./rayons";
import { ANTI_GASPI_WINDOW, bestBeforeFromDay, parisDay } from "./anti-gaspi";

// Durée de conservation des produits, en jours, selon leur rayon : elle donne la date proposée à la
// réception d'un réassort et la fenêtre anti-gaspi d'un lot. Fonctions pures.

export const DEFAULT_SHELF_LIFE = 180;
// Produits non alimentaires (hygiène, entretien) : pas de date limite à surveiller
export const NON_FOOD_SHELF_LIFE = 1095;

const BY_RAYON: Record<string, number> = {
  "fruits-legumes": 7,
  "viandes-poissons": 5,
  "charcuterie-traiteur": 14,
  cremerie: 21,
  surgeles: 270,
  "epicerie-salee": 365,
  "epicerie-sucree": 300,
  boissons: 300,
  boulangerie: 4,
  "hygiene-beaute": NON_FOOD_SHELF_LIFE,
  "entretien-maison": NON_FOOD_SHELF_LIFE,
};

// Sous-rayons qui se conservent autrement que leur rayon (« rayon/sous-rayon »)
const BY_SUBCATEGORY: Record<string, number> = {
  "fruits-legumes/compotes": 120,
  "fruits-legumes/fruits-a-coque": 240,
  "fruits-legumes/legumineuses": 365,
  "viandes-poissons/poissons-fumes": 21,
  "charcuterie-traiteur/jambons": 10,
  "charcuterie-traiteur/saucissons": 60,
  "charcuterie-traiteur/terrines": 21,
  "charcuterie-traiteur/plats-cuisines": 10,
  "charcuterie-traiteur/salades-composees": 6,
  "charcuterie-traiteur/sandwichs": 3,
  "charcuterie-traiteur/pizzas-et-quiches": 10,
  "cremerie/fromages": 30,
  "cremerie/yaourts": 25,
  "cremerie/desserts-lactes": 25,
  "cremerie/laits": 90,
  "cremerie/beurres": 60,
  "cremerie/cremes": 30,
  "cremerie/fromages-blancs": 20,
  "cremerie/oeufs": 28,
  "epicerie-salee/chips": 120,
  "epicerie-salee/sauces": 300,
  "epicerie-sucree/biscuits": 240,
  "boissons/jus-de-fruits": 180,
  "boulangerie/brioches": 15,
  "boulangerie/gateaux": 30,
};

// Produit frais : il passe vite en anti-gaspi et se réapprovisionne souvent
export const FRESH_SHELF_LIFE = 30;

export function shelfLifeDays(categoryNames: string[]) {
  const match = findRayonForCategories(categoryNames);
  if (!match) return DEFAULT_SHELF_LIFE;
  const sub = match.subCategory ? BY_SUBCATEGORY[`${match.rayon.slug}/${match.subCategory.slug}`] : undefined;
  return sub ?? BY_RAYON[match.rayon.slug] ?? DEFAULT_SHELF_LIFE;
}

// Jours avant la date où un lot passe en anti-gaspi : 5 jours au plus, moins pour un produit qui se
// conserve peu (le pain n'est soldé que la veille)
export function markdownWindow(shelfLife: number) {
  return Math.min(ANTI_GASPI_WINDOW, Math.max(1, Math.round(shelfLife / 3)));
}

// Date limite d'un lot reçu aujourd'hui (ou dans `daysLeft` jours à partir d'aujourd'hui)
export function bestBeforeIn(daysLeft: number, now = new Date()) {
  const today = bestBeforeFromDay(parisDay(now));
  return new Date(today.getTime() + daysLeft * 86_400_000);
}

// Valeur entre 0 et 1 tirée d'un texte (FNV-1a) : un même stock donne toujours les mêmes lots
function unit(text: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index++) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0xffffffff;
}

export interface InitialLot {
  quantity: number;
  daysLeft: number;
}

// Lots d'un stock existant, comme dans un vrai rayon : un lot tout juste reçu, un lot plus ancien et,
// pour le frais, un lot proche de sa date (parfois déjà dans la fenêtre anti-gaspi)
export function initialLots(quantity: number, shelfLife: number, key: string): InitialLot[] {
  if (quantity <= 0) return [];
  const draw = (salt: string) => unit(`${key}:${salt}`);
  const fresh = shelfLife <= FRESH_SHELF_LIFE;
  const window = markdownWindow(shelfLife);
  // Reçu il y a 0 à 3 jours
  const newest = Math.max(1, shelfLife - Math.floor(draw("newest") * Math.min(4, Math.ceil(shelfLife / 4))));
  if (quantity < 4) return [{ quantity, daysLeft: newest }];

  // Le lot le plus ancien est en anti-gaspi pour 15 % des produits frais, 3 % des autres, jamais pour
  // le non alimentaire
  const inWindow = shelfLife < NON_FOOD_SHELF_LIFE && draw("window") < (fresh ? 0.15 : 0.03);
  const oldest = inWindow
    ? 1 + Math.floor(draw("oldest") * window)
    : Math.min(newest - 1, Math.max(window + 1, Math.round(shelfLife * (0.15 + 0.15 * draw("oldest")))));

  if (!fresh) {
    const newestShare = Math.round(quantity * (0.6 + 0.15 * draw("share")));
    return [
      { quantity: newestShare, daysLeft: newest },
      { quantity: quantity - newestShare, daysLeft: Math.max(1, oldest) },
    ];
  }

  // 20 % et 30 % pour les lots les plus anciens, le reste pour le lot qui vient d'arriver
  const oldestShare = Math.max(1, Math.round(quantity * 0.2));
  const middleShare = Math.max(1, Math.round(quantity * 0.3));
  const middle = Math.max(oldest + 1, Math.min(newest - 1, Math.round(shelfLife * (0.4 + 0.2 * draw("middle")))));
  return [
    { quantity: quantity - oldestShare - middleShare, daysLeft: newest },
    { quantity: middleShare, daysLeft: Math.max(1, middle) },
    { quantity: oldestShare, daysLeft: Math.max(1, oldest) },
  ];
}
