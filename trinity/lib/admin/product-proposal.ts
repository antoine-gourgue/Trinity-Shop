import { nutriScore } from "@prisma/client";
import { computePrice } from "@/lib/pricing";
import { slugify } from "@/lib/rayons";
import { isOpenFoodFactsImage, type CategoryTaxonomy, type OpenFoodFactsProduct } from "@/lib/open-food-facts";
import {
  brandDisplayNames,
  brandList,
  cleanProductName,
  eggQuantity,
  pickBrand,
  siteCategoryMatcher,
} from "@/lib/open-food-facts-mapping";

// Fiche pré-remplie d'après Open Food Facts, que l'administrateur vérifie avant de créer le produit
export interface ProductProposal {
  barCode: string;
  name: string;
  brand: string;
  netContent: string | null;
  description: string;
  nutriScore: nutriScore | null;
  // Photo de face Open Food Facts, ou chaîne vide si la fiche n'en a pas
  picture: string;
  categories: string[];
  // Prix de rayon suggéré, en millièmes d'euro
  price: number;
  hidden: boolean;
}

// Ce que le site connaît déjà, pour rattacher la fiche au catalogue
export interface CatalogContext {
  taxonomy: CategoryTaxonomy;
  categoryNames: string[];
  brandNames: string[];
  // Nombre de produits par catégorie : le prix suit le sous-rayon le plus spécifique
  categoryCounts: Map<string, number>;
}

const GRADES: Record<string, nutriScore> = {
  a: nutriScore.A,
  b: nutriScore.B,
  c: nutriScore.C,
  d: nutriScore.D,
  e: nutriScore.E,
};

// Mêmes limites que la validation du formulaire produit
const MAX_NET_CONTENT = 60;
const MAX_DESCRIPTION = 2000;

// Marque du catalogue : une marque déjà en base sous une autre graphie est reprise telle quelle
// (« u-saveurs » pour « U Saveurs »), pour ne pas créer de doublon
function catalogBrand(picked: string | null, brandNames: string[]) {
  if (!picked) return "";
  const slug = slugify(picked);
  return brandNames.find((name) => slugify(name) === slug) ?? brandDisplayNames([picked]).get(slug) ?? picked;
}

export function buildProductProposal(
  barCode: string,
  product: OpenFoodFactsProduct,
  { taxonomy, categoryNames, brandNames, categoryCounts }: CatalogContext
): ProductProposal {
  const offName = (product.product_name_fr || product.product_name || "").trim();
  const generic = (product.generic_name_fr || product.generic_name || "").trim() || undefined;
  const brands = brandList(product.brands);
  const brand = catalogBrand(pickBrand(brands, offName), brandNames);

  const name = cleanProductName(offName, [brand, ...brands].filter(Boolean), generic);
  const netContent = eggQuantity(offName, product.quantity, product.categories_tags) ?? (product.quantity?.trim() || null);

  const siteCategory = siteCategoryMatcher(taxonomy, categoryNames);
  const categories = [
    ...new Set((product.categories_tags ?? []).map(siteCategory).filter((category): category is string => !!category)),
  ];

  // computePrice met une partie du catalogue en promotion : la proposition garde le prix de rayon,
  // les promotions restent une décision de l'administrateur
  const { price, regularPrice } = computePrice(name, barCode, categories, brand, netContent, categoryCounts);
  const picture = product.image_front_url && isOpenFoodFactsImage(product.image_front_url) ? product.image_front_url : "";

  return {
    barCode,
    name,
    brand,
    netContent: netContent?.slice(0, MAX_NET_CONTENT) ?? null,
    description: (generic ?? name).slice(0, MAX_DESCRIPTION),
    nutriScore: GRADES[product.nutriscore_grade ?? ""] ?? null,
    picture,
    categories,
    price: regularPrice ?? price,
    // Comme le reste du catalogue, un produit sans photo reste masqué tant qu'on ne le publie pas
    hidden: !picture,
  };
}
