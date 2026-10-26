import { z } from "zod";

// Fiche produit de l'API Open Food Facts (v0) : seuls les champs utilisés par le site sont lus.
// Un champ d'un type inattendu est ignoré plutôt que de faire échouer toute la fiche.
const text = z.string().optional().catch(undefined);

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
  allergens_tags: z.array(z.string()).optional().catch(undefined),
  nutriments: z.record(z.unknown()).optional().catch(undefined),
});

export type OpenFoodFactsProduct = z.infer<typeof openFoodFactsProductSchema>;

const openFoodFactsResponseSchema = z.object({
  // 0 : code-barres inconnu d'Open Food Facts
  status: z.number().optional().catch(undefined),
  product: openFoodFactsProductSchema.optional().catch(undefined),
});

// Fiche d'un code-barres, ou null s'il est inconnu ; lève une erreur si l'API ne répond pas
export async function fetchOpenFoodFactsProduct(barcode: string, init?: RequestInit): Promise<OpenFoodFactsProduct | null> {
  const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`, init);
  if (!response.ok) throw new Error(`Open Food Facts a répondu ${response.status} ${response.statusText}`);

  const result = openFoodFactsResponseSchema.safeParse(await response.json());
  if (!result.success || result.data.status === 0) return null;
  return result.data.product ?? null;
}
