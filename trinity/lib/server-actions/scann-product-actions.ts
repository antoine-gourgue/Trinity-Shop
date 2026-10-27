"use server";

import prisma from "@/lib/prisma";
import { isBarcode } from "@/lib/barcode";
import { fetchOpenFoodFactsProduct, type OpenFoodFactsProduct } from "@/lib/open-food-facts";

export type ScanResult =
  // Produit du catalogue : le scanner ouvre sa fiche
  | { kind: "catalog"; productId: string }
  // Produit que le drive ne vend pas, décrit par Open Food Facts ou une de ses bases sœurs
  | { kind: "external"; product: OpenFoodFactsProduct }
  | { kind: "unknown" }
  // Code lu qui n'est pas un code-barres de produit (QR code, code tronqué)
  | { kind: "invalid" };

// Produit scanné. Pas de redirect() ici : appelée depuis le navigateur, l'action le transmettait
// comme une exception, que le scanner affichait en erreur avant d'ouvrir la fiche. Le scanner
// navigue lui-même vers la fiche d'un produit du catalogue.
export async function findScannedProduct(barcode: string): Promise<ScanResult> {
  if (!isBarcode(barcode)) return { kind: "invalid" };

  const product = await prisma.product.findUnique({ where: { barCode: BigInt(barcode) }, select: { id: true } });
  if (product) return { kind: "catalog", productId: product.id };

  // Produit que le drive ne vend pas : Open Food Facts, puis ses bases sœurs (hygiène, entretien)
  for (const base of ["food", "beauty", "products"] as const) {
    try {
      const external = await fetchOpenFoodFactsProduct(barcode, undefined, base);
      if (external) return { kind: "external", product: external };
    } catch (error) {
      console.error(`Erreur lors de la récupération depuis ${base} :`, error);
    }
  }
  return { kind: "unknown" };
}
