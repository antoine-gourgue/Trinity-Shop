import { z } from "zod";

// Fiche produit de l'API Open Food Facts (v0) : seuls les champs utilisés par le site sont lus.
// Un champ d'un type inattendu est ignoré plutôt que de faire échouer toute la fiche.
const text = z.string().optional().catch(undefined);
const tags = z.array(z.string()).optional().catch(undefined);

const openFoodFactsProductSchema = z.object({
  code: text,
  product_name: text,
  product_name_fr: text,
  generic_name: text,
  generic_name_fr: text,
  brands: text,
  quantity: text,
  image_front_url: text,
  nutriscore_grade: text,
  ingredients_text: text,
  ingredients_text_fr: text,
  origins: text,
  conservation_conditions: text,
  conservation_conditions_fr: text,
  manufacturing_places: text,
  allergens_tags: tags,
  // Étiquettes de la taxonomie, catégories parentes comprises (« en:spreads », « en:sweet-spreads »)
  categories_tags: tags,
  nutriments: z.record(z.unknown()).optional().catch(undefined),
});

export type OpenFoodFactsProduct = z.infer<typeof openFoodFactsProductSchema>;

const openFoodFactsResponseSchema = z.object({
  // 0 : code-barres inconnu d'Open Food Facts
  status: z.number().optional().catch(undefined),
  product: openFoodFactsProductSchema.optional().catch(undefined),
});

// Open Food Facts et ses bases sœurs, au même format : cosmétiques et hygiène, puis autres produits
export const OPEN_FACTS = {
  food: { api: "https://world.openfoodfacts.org", name: "Open Food Facts" },
  beauty: { api: "https://world.openbeautyfacts.org", name: "Open Beauty Facts" },
  products: { api: "https://world.openproductsfacts.org", name: "Open Products Facts" },
} as const;

export type OpenFactsBase = keyof typeof OPEN_FACTS;

// Fiche d'un code-barres, ou null s'il est inconnu ; lève une erreur si l'API ne répond pas
export async function fetchOpenFoodFactsProduct(
  barcode: string,
  init?: RequestInit,
  base: OpenFactsBase = "food"
): Promise<OpenFoodFactsProduct | null> {
  const { api, name } = OPEN_FACTS[base];
  const response = await fetch(`${api}/api/v0/product/${encodeURIComponent(barcode)}.json`, init);
  if (!response.ok) throw new Error(`${name} a répondu ${response.status} ${response.statusText}`);

  const result = openFoodFactsResponseSchema.safeParse(await response.json());
  if (!result.success || result.data.status === 0) return null;
  return result.data.product ?? null;
}

// Taxonomie des catégories, par étiquette : seuls le nom et les synonymes français sont lus,
// et une entrée mal formée est ignorée
const taxonomyEntrySchema = z
  .object({
    name: z.object({ fr: text }).optional().catch(undefined),
    synonyms: z.object({ fr: tags }).optional().catch(undefined),
  })
  .catch({});

export const categoryTaxonomySchema = z.record(taxonomyEntrySchema);

export type CategoryTaxonomy = z.infer<typeof categoryTaxonomySchema>;

// Entrées de la taxonomie pour quelques étiquettes seulement (la taxonomie complète pèse plusieurs Mo)
export async function fetchCategoryTaxonomy(categoryTags: string[], init?: RequestInit): Promise<CategoryTaxonomy> {
  if (!categoryTags.length) return {};
  const url = new URL("https://world.openfoodfacts.org/api/v2/taxonomy");
  url.searchParams.set("tagtype", "categories");
  url.searchParams.set("tags", categoryTags.join(","));
  url.searchParams.set("fields", "name,synonyms");
  url.searchParams.set("lc", "fr");

  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`Open Food Facts a répondu ${response.status} ${response.statusText}`);
  const result = categoryTaxonomySchema.safeParse(await response.json());
  return result.success ? result.data : {};
}

// Hôtes des photos Open Food Facts autorisés par next.config.js (images.remotePatterns)
const IMAGE_HOSTS = new Set(["images.openfoodfacts.org", "static.openfoodfacts.org", "image.openfoodfacts.org"]);

// Et ceux de ses bases sœurs, hygiène et entretien
const SISTER_IMAGE_HOSTS = new Set(["images.openbeautyfacts.org", "images.openproductsfacts.org"]);

function hasImageHost(value: string, hosts: Set<string>) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && hosts.has(url.hostname);
  } catch {
    return false;
  }
}

export function isOpenFoodFactsImage(value: string) {
  return hasImageHost(value, IMAGE_HOSTS);
}

export function isOpenFactsImage(value: string) {
  return hasImageHost(value, IMAGE_HOSTS) || hasImageHost(value, SISTER_IMAGE_HOSTS);
}
