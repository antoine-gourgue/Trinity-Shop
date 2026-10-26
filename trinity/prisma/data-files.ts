import { readFileSync } from "node:fs";
import { z } from "zod";

// Fichiers de data/ lus par les scripts. Un fichier au mauvais format arrête le script avant
// toute écriture ; passthrough() conserve les champs non décrits, que les scripts réécrivent tels quels.

export function readJsonFile<Output>(file: string, schema: z.ZodType<Output, z.ZodTypeDef, unknown>): Output {
  const data: unknown = JSON.parse(readFileSync(file, "utf8"));
  return schema.parse(data);
}

// Produit tel qu'Open Food Facts le décrit (data/national-brands.json)
const offProduct = {
  name: z.string(),
  barCode: z.string(),
  image_url: z.string(),
  categories: z.array(z.string()),
  nutriscore: z.string(),
  brands: z.array(z.string()),
};

// data/complete_products.json : catalogue du seed, avec les prix calculés
export const catalogSchema = z.array(
  z
    .object({
      ...offProduct,
      price: z.number(),
      regularPrice: z.number().nullable(),
      quantity: z.string().nullable(),
      description: z.string().optional(),
      hidden: z.boolean().optional(),
    })
    .passthrough()
);
export type CatalogEntry = z.infer<typeof catalogSchema>[number];

// data/national-brands.json : produits de marques nationales à importer
export const nationalProductsSchema = z.array(
  z.object({ ...offProduct, quantity: z.string(), description: z.string() }).passthrough()
);
export type NationalProduct = z.infer<typeof nationalProductsSchema>[number];

// data/off-enrichment.json : contenance et photo, par code-barres
export const enrichmentSchema = z.record(
  z.object({ quantity: z.string().nullable().optional(), image: z.string().nullable().optional() }).passthrough()
);

// data/hidden-products.json : codes-barres des produits masqués
export const barcodeListSchema = z.array(z.string());

// data/photo-replacements.json : photos officielles qui remplacent les anciennes
export const photoReplacementsSchema = z.array(z.object({ barCode: z.string(), image_url: z.string() }));

// prisma/backups/national-brands-imported.json : produits créés par l'import, pour pouvoir l'annuler
export const importedProductsSchema = z.array(z.object({ id: z.string(), barCode: z.string() }));
