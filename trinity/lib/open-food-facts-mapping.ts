// Passage d'une fiche Open Food Facts au catalogue du site : catégories, marque, libellé et
// contenance. Partagé par prisma/fetch-national-brands.ts et par la création de produit du
// back-office, pour que les produits créés à la main ressemblent aux produits importés.

import { slugify } from "./rayons";
import type { CategoryTaxonomy } from "./open-food-facts";

// ——— Catégories ———

// Catégories du catalogue dont le nom français a changé dans la taxonomie : on donne
// directement l'étiquette indexée par le moteur de recherche
export const SEARCH_TAGS: Record<string, string> = {
  "Fruits et produits dérivés": "en:fruits-based-foods",
  Apéritif: "en:appetizers",
};
const TAG_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(SEARCH_TAGS).map(([name, tag]) => [tag, name])
);

// Noms comparés sans tenir compte de la casse
export const normalizeCategoryName = (value: string) => value.normalize("NFC").trim().toLowerCase();

// Nom et synonymes français d'une étiquette de la taxonomie
export function frenchCategoryNames(taxonomy: CategoryTaxonomy, tag: string) {
  const entry = taxonomy[tag];
  return [entry?.name?.fr, ...(entry?.synonyms?.fr ?? [])].filter((name): name is string => !!name);
}

// Catégorie du site correspondant à une étiquette Open Food Facts (« en:sweet-spreads »
// → « Produits à tartiner sucrés »), d'après ses noms français ; undefined si aucune
export function siteCategoryMatcher(taxonomy: CategoryTaxonomy, siteCategories: Iterable<string>) {
  const siteName = new Map([...siteCategories].map((name) => [normalizeCategoryName(name), name]));
  return (tag: string) =>
    TAG_NAMES[tag] ??
    frenchCategoryNames(taxonomy, tag)
      .map((name) => siteName.get(normalizeCategoryName(name)))
      .find(Boolean);
}

// ——— Marques ———

// Groupes industriels : on leur préfère la marque du produit (Nestlé → Nesquik)
const GROUPS = new Set([
  "unilever", "unilever-norge", "pepsico", "nestle", "danone", "ferrero", "ferrero-scandinavia-ab",
  "lactalis", "ebro-foods", "lea-nature", "mondelez", "groupe-bel", "bel",
]);
// Marques reconnues dans le nom quand seul le groupe est renseigné
const NAME_BRANDS: [string, string][] = [
  ["ben & jerry", "Ben & Jerry's"], ["b-ready", "Nutella"], ["maggi", "Maggi"], ["7up", "7UP"], ["pepsi", "Pepsi"],
  ["lipton", "Lipton"], ["lay's", "Lay's"], ["doritos", "Doritos"], ["tropicana", "Tropicana"], ["magnum", "Magnum"],
  ["carte d'or", "Carte d'Or"], ["cornetto", "Cornetto"], ["kinder", "Kinder"], ["nesquik", "Nesquik"],
  ["ricoré", "Ricoré"], ["nescafé", "Nescafé"],
];
// Graphie retenue pour chaque marque (clé : slug), y compris pour regrouper les variantes
const BRAND_LABELS: Record<string, string> = {
  "7up": "7UP",
  "seven-up": "7UP",
  "barilla-norge": "Barilla",
  "barilla-norge-as": "Barilla",
  "carte-d-or": "Carte d'Or",
  "cesar-moroni": "César Moroni",
  "cesar-moront": "César Moroni",
  "chaussee-aux-moines": "Chaussée aux Moines",
  "cite-marine": "Cité Marine",
  "d-aucy": "d'aucy",
  daucy: "d'aucy",
  "diet-pepsi": "Pepsi",
  "elle-et-vire": "Elle & Vire",
  "elle-et-vire-teneur": "Elle & Vire",
  "elle-vire": "Elle & Vire",
  euro: "Kinder",
  "ferrero-scandinavia-ab": "Ferrero",
  ferrerokinder: "Kinder",
  ferreronutella: "Nutella",
  "jardi-bio": "Jardin Bio",
  "jardin-bio": "Jardin Bio",
  "jardin-bio-etic": "Jardin Bio",
  "jardin-bio-logique": "Jardin Bio",
  "l-atelier-pere-dodu": "Père Dodu",
  "la-belle-iloise": "La Belle-Iloise",
  "la-boulangere-bio": "La Boulangère",
  "la-vache-qui-rit": "La Vache qui rit",
  "lay-s": "Lay's",
  "lay-s-lays": "Lay's",
  lays: "Lay's",
  "le-chocolat": "Nestlé",
  "lipton-ice-tea": "Lipton",
  "lustucru-selection": "Lustucru",
  mailleunilever: "Maille",
  "mc-cain": "McCain",
  mccain: "McCain",
  nakd: "Nakd",
  nescafe: "Nescafé",
  nestle: "Nestlé",
  "nestle-dessert": "Nestlé Dessert",
  "nutella-b-ready": "Nutella",
  "pasquierbrioche-pasquier": "Pasquier",
  "pepsi-zero": "Pepsi",
  "pom-potes": "Pom'Potes",
  "pom-potes-ssa": "Pom'Potes",
  president: "Président",
  "pure-leaf": "Pure Leaf",
  "quaker-oats": "Quaker",
  ricore: "Ricoré",
  "val-d-eurre": "Val d'Eurre",
  veloute: "Velouté",
  "veloute-fruix": "Velouté",
};

// Marques d'une fiche, dans l'ordre d'Open Food Facts (« Nutella, Ferrero » ou liste)
export function brandList(brands?: string[] | string) {
  const raw = Array.isArray(brands) ? brands : (brands ?? "").split(",");
  return raw.map((brand) => brand.trim()).filter(Boolean);
}

// Marque retenue pour le catalogue : la première, sauf si c'est un groupe industriel
export function pickBrand(brands: string[], productName?: string) {
  const [first, second] = brands;
  if (!first) return null;
  if (!GROUPS.has(slugify(first))) return first;
  if (second && !slugify(second).startsWith(slugify(first)) && slugify(second) !== "bio") return second;
  const name = (productName ?? "").toLowerCase();
  return NAME_BRANDS.find(([needle]) => name.includes(needle))?.[1] ?? first;
}

const isUpperWord = (word: string) => /\p{Lu}/u.test(word) && word === word.toUpperCase();
const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
const fold = (value: string) => slugify(value).replace(/-/g, " ");

// Une seule graphie par marque (« materne », « MATERNE » et « Materne » → « Materne »), par slug
export function brandDisplayNames(brands: string[]) {
  const variants = new Map<string, Map<string, number>>();
  for (const brand of brands) {
    const slug = slugify(brand);
    const counts = variants.get(slug) ?? new Map<string, number>();
    counts.set(brand, (counts.get(brand) ?? 0) + 1);
    variants.set(slug, counts);
  }
  const names = new Map<string, string>();
  for (const [slug, counts] of variants) {
    const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([brand]) => brand);
    const mixed = ranked.find((brand) => brand !== brand.toUpperCase() && brand !== brand.toLowerCase());
    names.set(slug, BRAND_LABELS[slug] ?? mixed ?? ranked[0].split(" ").map(capitalize).join(" "));
  }
  return names;
}

// ——— Libellé et contenance ———

// Contenance en fin de libellé (« 500 g », « 4x125g », « 450G/ »)
const TRAILING_QUANTITY = /[\s,-]*(\d+\s*[x×]\s*)?\d+([.,]\d+)?\s*(g|gr|kg|ml|cl|l)\b[./]?$/i;
// Abréviations et restes de libellés tronqués (« Boîte de », « le paquet de », « vrac », « eu »)
const TRAILING_NOISE = /[\s,–-]+(le paquet de|flacon de|bo[iî]te de|de|pet|eu|imp|frnl|vrac)$/i;
// Mentions rangées parmi les marques sur Open Food Facts, à ne pas retirer du libellé
const NOT_BRANDS = ["bio", "nature", "organic"];

function endsWithBrand(value: string, brand: string) {
  const words = value.split(" ");
  const brandWords = brand.split(/\s+/).length;
  return words.length > brandWords + 1 && fold(words.slice(-brandWords).join(" ")) === fold(brand);
}

// Libellé lisible : sans la marque autour, sans contenance, sans MAJUSCULES criardes ni symboles ;
// la dénomination générique remplace un libellé réduit à un mot ou à la marque
export function cleanProductName(name: string, brandNames: string[], generic?: string) {
  const brands = brandNames.filter((brand) => !NOT_BRANDS.includes(slugify(brand)));
  let value = name
    .replace(/[​-‍﻿®™©⁰¹²³⁴⁵⁶⁷⁸⁹]/g, "")
    .replace(/bio\*/gi, (match) => match.slice(0, -1))
    .replace(/’/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^\d+([.,]\d+)?\s*(g|kg|ml|cl|l)\s+/i, "");

  // Contenance, marque et restes en fin de libellé, jusqu'à stabilité
  for (let previous = ""; previous !== value; ) {
    previous = value;
    value = value.replace(TRAILING_QUANTITY, "").replace(TRAILING_NOISE, "").trim();
    const brand = brands.find((b) => endsWithBrand(value, b));
    if (brand) value = value.split(" ").slice(0, -brand.split(/\s+/).length).join(" ").replace(/[\s,–-]+$/, "");
  }

  for (const brand of brands) {
    const words = value.split(" ");
    const brandWords = brand.split(/\s+/).length;
    if (fold(words.slice(0, brandWords).join(" ")) !== fold(brand)) continue;
    const rest = words.slice(brandWords).join(" ").replace(/^[-–:,\s]+/, "");
    if (rest.split(" ").length >= 2 && rest.length >= 10) value = rest;
  }

  value = value
    .split(" ")
    .map((word) => (isUpperWord(word) && word.replace(/[^\p{L}]/gu, "").length >= 4 ? capitalize(word) : word))
    .join(" ");

  const single = value.split(" ").length < 2 || brands.some((brand) => fold(brand) === fold(value));
  if (single && generic && generic.length <= 70) value = generic.replace(/\.$/, "");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// Nombre d'œufs lu dans le libellé (« 6 œufs bio ») ou dans une contenance nue (« 12 »),
// pour que le prix soit calculé à la pièce
export function eggQuantity(name?: string, quantity?: string, categoryTags?: string[]) {
  if (!categoryTags?.includes("en:eggs")) return null;
  const count =
    name?.match(/(\d+)\s*(?:gros |moyens |petits )?(?:oeufs|œufs)/i)?.[1] ??
    quantity?.trim().match(/^(\d+)(?:\s*(?:oeufs|œufs|unités?))?$/i)?.[1];
  return count ? `${count} œufs` : null;
}
