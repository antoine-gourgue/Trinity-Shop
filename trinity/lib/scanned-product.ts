import { OPEN_FACTS, isOpenFactsImage, type CategoryTaxonomy, type OpenFactsBase, type OpenFoodFactsProduct } from "@/lib/open-food-facts";
import { brandList, cleanProductName, decodeHtmlEntities, pickBrand, siteCategoryMatcher } from "@/lib/open-food-facts-mapping";
import { formatAllergens, nutritionRows } from "@/lib/product-info";
import { slugify } from "@/lib/rayons";

// Fiche d'un produit scanné que le drive ne vend pas, prête à afficher : libellé nettoyé comme ceux
// du catalogue, photo d'un hôte autorisé, et rien de ce qu'Open Food Facts ne renseigne pas
export interface ScannedProduct {
  barCode: string;
  name: string;
  brand: string | null;
  quantity: string | null;
  // Photo de face, ou null si la fiche n'en a pas (ou d'un hôte que next/image refuserait)
  picture: string | null;
  // Note A à E, ou null : pas de Nutri-Score sur l'hygiène et l'entretien
  nutriScore: string | null;
  description: string | null;
  // Ingrédients, ou composition d'un produit non alimentaire ; allergènes entre « _ » (_lait_)
  ingredients: string | null;
  allergens: string[];
  origins: string | null;
  nutrition: { label: string; value: string }[];
  nonFood: boolean;
  // Base qui décrit le produit, citée sous les informations
  source: string;
}

const text = (...values: (string | undefined)[]) => {
  const value = values.find((candidate) => candidate?.trim());
  return value ? decodeHtmlEntities(value.trim()) : null;
};

// Contenance sans le « e » métrologique (℮) que certains contributeurs ajoutent : « 370 g e » → « 370 g »
function cleanQuantity(quantity: string | null) {
  return quantity?.replace(/(\d\s*(?:g|kg|mg|ml|cl|l))\s*(?:℮|e)$/i, "$1") ?? null;
}

export function toScannedProduct(barCode: string, product: OpenFoodFactsProduct, base: OpenFactsBase): ScannedProduct {
  const nonFood = base !== "food";
  const brands = brandList(product.brands);
  const rawName = text(product.product_name_fr, product.product_name);
  const description = text(product.generic_name_fr, product.generic_name);
  const brand = pickBrand(brands, rawName ?? undefined);
  const grade = product.nutriscore_grade?.toUpperCase() ?? "";

  return {
    barCode,
    name: rawName ? cleanProductName(rawName, brands, description ?? undefined) : (description ?? "Produit sans nom"),
    brand: brand ? decodeHtmlEntities(brand) : null,
    quantity: cleanQuantity(text(product.quantity)),
    picture: product.image_front_url && isOpenFactsImage(product.image_front_url) ? product.image_front_url : null,
    nutriScore: !nonFood && /^[A-E]$/.test(grade) ? grade : null,
    description,
    ingredients: text(product.ingredients_text_fr, product.ingredients_text),
    allergens: nonFood ? [] : formatAllergens(product.allergens_tags),
    origins: text(product.origins),
    nutrition: nonFood ? [] : nutritionRows(product.nutriments),
    nonFood,
    source: OPEN_FACTS[base].name,
  };
}

// Catégories du catalogue qui correspondent aux étiquettes d'Open Food Facts : par leur nom français
// dans la taxonomie, ou par l'étiquette elle-même (« en:deodorants » → « Déodorants »), les bases
// hygiène et entretien n'étant pas dans la taxonomie alimentaire
export function catalogCategoriesFor(tags: string[], taxonomy: CategoryTaxonomy, siteCategories: string[]) {
  const byTaxonomy = siteCategoryMatcher(taxonomy, siteCategories);
  const bySlug = new Map(siteCategories.map((name) => [slugify(name), name]));
  const names = tags.map((tag) => byTaxonomy(tag) ?? bySlug.get(tag.replace(/^[a-z]{2}:/, "")));
  return [...new Set(names.filter((name): name is string => !!name))];
}
